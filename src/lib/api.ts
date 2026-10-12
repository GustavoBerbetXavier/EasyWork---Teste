// Camada de dados do app. Com o Supabase configurado usa o banco de verdade;
// sem ele, usa os dados locais de demonstração (src/lib/demo.ts).
import {
  DEMO_USER_ID,
  demoClients,
  demoConversations,
  demoMyPrivate,
  demoMyProfile,
  demoProviders,
  demoRafaelProvider,
  demoReviews,
  demoServices,
} from './demo';
import { supabase } from './supabase';
import type {
  ConversationSummary,
  Message,
  PortfolioPhoto,
  PrivateInfo,
  Profile,
  ProviderStats,
  Review,
  Role,
  Service,
  Subscription,
} from './types';

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------

function fail(error: { message: string } | null | undefined): asserts error is null | undefined {
  if (!error) return;
  const message = error.message || '';
  if (/row-level security|permission denied/i.test(message)) throw new Error('Você não tem permissão para esta ação.');
  if (/network|fetch/i.test(message)) throw new Error('Sem conexão com a internet. Tente novamente.');
  if (/duplicate key.*username/i.test(message)) throw new Error('Este nome de usuário já está em uso.');
  if (/Limite de serviços/i.test(message)) throw new Error('Você atingiu o limite de serviços do seu plano. Conheça os planos para cadastrar mais.');
  throw new Error(message);
}

const PROFILE_EDITABLE: (keyof Profile)[] = [
  'full_name', 'username', 'headline', 'bio', 'tag', 'city', 'specialty', 'category', 'area',
  'avatar_url', 'cover_url', 'skills', 'experiences', 'education', 'projects', 'objective', 'is_active', 'available',
];

function pickEditable(patch: Partial<Profile>) {
  const result: Record<string, unknown> = {};
  for (const key of PROFILE_EDITABLE) if (key in patch) result[key] = patch[key];
  return result;
}

function normalizeProfile(row: Record<string, unknown>): Profile {
  return {
    ...(row as Profile),
    skills: (row.skills as string[]) ?? [],
    experiences: (row.experiences as Profile['experiences']) ?? [],
    education: (row.education as Profile['education']) ?? [],
    projects: (row.projects as Profile['projects']) ?? [],
    rating_avg: Number(row.rating_avg ?? 0),
    rating_count: Number(row.rating_count ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Estado do modo demonstração
// ---------------------------------------------------------------------------

type DemoState = {
  role: Role;
  me: Profile;
  private: PrivateInfo;
  people: Profile[];
  services: Service[];
  conversations: { id: string; otherId: string; subject: string; createdAt: string }[];
  messages: Message[];
  reviews: Review[];
  portfolio: PortfolioPhoto[];
  listeners: Set<() => void>;
};

let demo: DemoState | null = null;

export function startDemoSession(role: Role, name?: string) {
  const seed = demoConversations(role);
  const providers = [...demoProviders, demoRafaelProvider];
  demo = {
    role,
    me: demoMyProfile(role, name),
    private: demoMyPrivate(),
    people: [...providers, ...demoClients],
    services: [
      ...(role === 'profissional' ? demoServices(DEMO_USER_ID) : []),
      ...providers.flatMap((item) => demoServices(item.id)),
    ],
    conversations: seed.conversations,
    messages: seed.messages,
    reviews: [...demoReviews(DEMO_USER_ID), ...providers.flatMap((item) => demoReviews(item.id))],
    portfolio: [],
    listeners: new Set(),
  };
  return demo.me;
}

export function endDemoSession() {
  demo = null;
}

function requireDemo(): DemoState {
  if (!demo) throw new Error('Sessão de demonstração encerrada. Entre novamente.');
  return demo;
}

function emitDemo() {
  demo?.listeners.forEach((listener) => listener());
}

function demoPerson(id: string): Profile {
  const state = requireDemo();
  if (id === DEMO_USER_ID) return state.me;
  const person = state.people.find((item) => item.id === id);
  if (!person) throw new Error('Perfil não encontrado.');
  return person;
}

const wait = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export async function getMyProfile(userId: string): Promise<{ profile: Profile; private: PrivateInfo }> {
  if (!supabase) {
    const state = requireDemo();
    return { profile: state.me, private: state.private };
  }
  const [{ data: profile, error: profileError }, { data: privateInfo, error: privateError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('profile_private').select('birth_date, contact_email, phone').eq('id', userId).maybeSingle(),
  ]);
  fail(profileError);
  fail(privateError);
  return {
    profile: normalizeProfile(profile),
    private: privateInfo ?? { birth_date: null, contact_email: '', phone: '' },
  };
}

export async function updateMyProfile(userId: string, patch: Partial<Profile>, privatePatch?: Partial<PrivateInfo>) {
  if (!supabase) {
    const state = requireDemo();
    await wait();
    state.me = { ...state.me, ...pickEditable(patch) };
    if (privatePatch) state.private = { ...state.private, ...privatePatch };
    return { profile: state.me, private: state.private };
  }
  const editable = pickEditable(patch);
  let profile: Profile | null = null;
  if (Object.keys(editable).length) {
    const { data, error } = await supabase.from('profiles').update(editable).eq('id', userId).select('*').single();
    fail(error);
    profile = normalizeProfile(data);
  }
  let privateInfo: PrivateInfo | null = null;
  if (privatePatch && Object.keys(privatePatch).length) {
    const { data, error } = await supabase
      .from('profile_private')
      .update(privatePatch)
      .eq('id', userId)
      .select('birth_date, contact_email, phone')
      .single();
    fail(error);
    privateInfo = data;
  }
  const current = await getMyProfile(userId);
  return { profile: profile ?? current.profile, private: privateInfo ?? current.private };
}

/** Envia uma foto (perfil, capa ou portfólio) e devolve o endereço público. */
export async function uploadImage(userId: string, bucket: 'avatars' | 'covers' | 'portfolio' | 'chat', uri: string, mimeType?: string | null) {
  if (!supabase) return uri;
  const contentType = mimeType || 'image/jpeg';
  const extension = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  const path = `${userId}/${Date.now()}.${extension}`;
  const file = await fetch(uri).then((response) => response.arrayBuffer());
  const { error } = await supabase.storage.from(bucket).upload(path, file, { contentType, upsert: false });
  fail(error);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Profissionais e serviços
// ---------------------------------------------------------------------------

export async function searchProviders(filters: { q?: string; category?: string; city?: string } = {}): Promise<Profile[]> {
  const q = filters.q?.trim() ?? '';
  const category = filters.category?.trim() ?? '';
  if (!supabase) {
    const state = requireDemo();
    await wait(150);
    const term = q.toLowerCase();
    return state.people
      .filter((item) => item.role === 'profissional' && item.is_active && item.id !== 'rafael')
      .filter((item) => !category || item.category.toLowerCase() === category.toLowerCase())
      .filter((item) => {
        if (!term) return true;
        const services = state.services.filter((service) => service.provider_id === item.id).map((service) => service.title).join(' ');
        return `${item.full_name} ${item.specialty} ${item.area} ${item.category} ${item.city} ${services}`.toLowerCase().includes(term);
      });
  }
  const { data, error } = await supabase.rpc('search_providers', { q, cat: category, city_filter: filters.city?.trim() ?? '' });
  fail(error);
  return ((data as Record<string, unknown>[]) ?? []).map(normalizeProfile);
}

export async function getProvider(id: string): Promise<{ profile: Profile; services: Service[] }> {
  if (!supabase) {
    const state = requireDemo();
    await wait(150);
    return { profile: demoPerson(id), services: state.services.filter((item) => item.provider_id === id && item.active) };
  }
  const [{ data: profile, error }, { data: services, error: servicesError }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).single(),
    supabase.from('services').select('*').eq('provider_id', id).eq('active', true).order('created_at'),
  ]);
  fail(error);
  fail(servicesError);
  return { profile: normalizeProfile(profile), services: services ?? [] };
}

export async function recordProfileView(providerId: string, viewerId: string) {
  if (!supabase || providerId === viewerId) return;
  await supabase.from('profile_views').insert({ provider_id: providerId, viewer_id: viewerId });
}

export async function listMyServices(userId: string): Promise<Service[]> {
  if (!supabase) {
    await wait(150);
    return requireDemo().services.filter((item) => item.provider_id === userId);
  }
  const { data, error } = await supabase.from('services').select('*').eq('provider_id', userId).order('created_at');
  fail(error);
  return data ?? [];
}

export type ServiceInput = Omit<Service, 'id' | 'provider_id'> & { id?: string };

export async function saveService(userId: string, input: ServiceInput): Promise<Service> {
  const payload = {
    title: input.title.trim(),
    category: input.category.trim(),
    subcategory: input.subcategory.trim(),
    description: input.description.trim(),
    price_label: input.price_label.trim() || 'sob consulta',
    active: input.active,
  };
  if (payload.title.length < 2) throw new Error('Dê um nome ao serviço.');
  if (!supabase) {
    const state = requireDemo();
    await wait();
    if (input.id) {
      const updated = { ...state.services.find((item) => item.id === input.id)!, ...payload };
      state.services = state.services.map((item) => (item.id === input.id ? updated : item));
      return updated;
    }
    const created: Service = { id: `s-${Date.now()}`, provider_id: userId, ...payload };
    state.services = [...state.services, created];
    return created;
  }
  if (input.id) {
    const { data, error } = await supabase.from('services').update(payload).eq('id', input.id).select('*').single();
    fail(error);
    return data;
  }
  const { data, error } = await supabase.from('services').insert({ ...payload, provider_id: userId }).select('*').single();
  fail(error);
  return data;
}

export async function deleteService(id: string) {
  if (!supabase) {
    const state = requireDemo();
    await wait();
    state.services = state.services.filter((item) => item.id !== id);
    return;
  }
  const { error } = await supabase.from('services').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------------------
// Portfólio (fotos de trabalhos)
// ---------------------------------------------------------------------------

export async function listPortfolio(providerId: string): Promise<PortfolioPhoto[]> {
  if (!supabase) return requireDemo().portfolio.filter((item) => item.provider_id === providerId);
  const { data, error } = await supabase
    .from('portfolio_photos')
    .select('*')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  fail(error);
  return data ?? [];
}

export async function addPortfolioPhoto(userId: string, uri: string, mimeType?: string | null): Promise<PortfolioPhoto> {
  if (!supabase) {
    const state = requireDemo();
    const photo: PortfolioPhoto = { id: `p-${Date.now()}`, provider_id: userId, url: uri, caption: '', created_at: new Date().toISOString() };
    state.portfolio = [photo, ...state.portfolio];
    return photo;
  }
  const url = await uploadImage(userId, 'portfolio', uri, mimeType);
  const { data, error } = await supabase.from('portfolio_photos').insert({ provider_id: userId, url }).select('*').single();
  if (error && /row-level security/i.test(error.message)) {
    throw new Error('Seu plano não permite mais fotos. Conheça os planos Plus+ e Premium.');
  }
  fail(error);
  return data;
}

export async function deletePortfolioPhoto(id: string) {
  if (!supabase) {
    const state = requireDemo();
    state.portfolio = state.portfolio.filter((item) => item.id !== id);
    return;
  }
  const { error } = await supabase.from('portfolio_photos').delete().eq('id', id);
  fail(error);
}

// ---------------------------------------------------------------------------
// Conversas e mensagens
// ---------------------------------------------------------------------------

function summaryOf(profile: Profile) {
  const { id, full_name, role, avatar_url, city, specialty } = profile;
  return { id, full_name, role, avatar_url, city, specialty };
}

export async function listConversations(userId: string): Promise<ConversationSummary[]> {
  if (!supabase) {
    const state = requireDemo();
    await wait(120);
    return state.conversations
      .map((conversation) => {
        const messages = state.messages.filter((item) => item.conversation_id === conversation.id);
        const last = messages[messages.length - 1];
        return {
          id: conversation.id,
          subject: conversation.subject,
          other: summaryOf(demoPerson(conversation.otherId)),
          last_message: last?.body ?? '',
          last_message_at: last?.created_at ?? conversation.createdAt,
          unread: messages.filter((item) => item.sender_id !== userId && !item.read_at).length,
        };
      })
      .sort((a, b) => b.last_message_at.localeCompare(a.last_message_at));
  }
  const { data, error } = await supabase.rpc('my_conversations');
  fail(error);
  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    id: row.id as string,
    subject: (row.subject as string) ?? '',
    last_message: (row.last_message as string) ?? '',
    last_message_at: row.last_message_at as string,
    unread: Number(row.unread ?? 0),
    other: {
      id: row.other_id as string,
      full_name: row.other_name as string,
      role: row.other_role as Role,
      avatar_url: (row.other_avatar as string) ?? null,
      city: (row.other_city as string) ?? '',
      specialty: (row.other_specialty as string) ?? '',
    },
  }));
}

/** Abre (ou cria) a conversa entre o contratante logado e um profissional. */
export async function startConversation(userId: string, providerId: string, subject: string): Promise<string> {
  if (!supabase) {
    const state = requireDemo();
    const existing = state.conversations.find((item) => item.otherId === providerId);
    if (existing) return existing.id;
    const id = `c-${Date.now()}`;
    state.conversations = [{ id, otherId: providerId, subject, createdAt: new Date().toISOString() }, ...state.conversations];
    return id;
  }
  const { data: existing, error } = await supabase
    .from('conversations')
    .select('id')
    .eq('client_id', userId)
    .eq('provider_id', providerId)
    .maybeSingle();
  fail(error);
  if (existing) return existing.id;
  const { data, error: insertError } = await supabase
    .from('conversations')
    .insert({ client_id: userId, provider_id: providerId, subject })
    .select('id')
    .single();
  fail(insertError);
  return data.id;
}

export async function getConversation(id: string, userId: string): Promise<{ id: string; subject: string; other: Profile }> {
  if (!supabase) {
    const conversation = requireDemo().conversations.find((item) => item.id === id);
    if (!conversation) throw new Error('Conversa não encontrada.');
    return { id, subject: conversation.subject, other: demoPerson(conversation.otherId) };
  }
  const { data, error } = await supabase.from('conversations').select('id, subject, client_id, provider_id').eq('id', id).single();
  fail(error);
  const otherId = data.client_id === userId ? data.provider_id : data.client_id;
  const { data: other, error: otherError } = await supabase.from('profiles').select('*').eq('id', otherId).single();
  fail(otherError);
  return { id: data.id, subject: data.subject, other: normalizeProfile(other) };
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (!supabase) {
    await wait(100);
    return requireDemo().messages.filter((item) => item.conversation_id === conversationId);
  }
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  fail(error);
  return data ?? [];
}

export async function sendMessage(conversationId: string, userId: string, body: string, imageUrl?: string): Promise<Message> {
  const text = body.trim();
  if (!text && !imageUrl) throw new Error('Escreva uma mensagem.');
  if (!supabase) {
    const state = requireDemo();
    const message: Message = {
      id: `m-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: userId,
      body: text,
      image_url: imageUrl ?? null,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    state.messages = [...state.messages, message];
    emitDemo();
    return message;
  }
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: userId, body: text, image_url: imageUrl ?? null })
    .select('*')
    .single();
  fail(error);
  return data;
}

export async function markConversationRead(conversationId: string, userId: string) {
  if (!supabase) {
    const state = requireDemo();
    const now = new Date().toISOString();
    state.messages = state.messages.map((item) =>
      item.conversation_id === conversationId && item.sender_id !== userId && !item.read_at ? { ...item, read_at: now } : item,
    );
    emitDemo();
    return;
  }
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null);
}

/**
 * Avisa quando chega mensagem nova ou quando uma mensagem muda (ex.: foi lida).
 * Devolve a função para parar de ouvir.
 */
export function subscribeToMessages(conversationId: string, onUpsert: (message: Message) => void) {
  if (!supabase) {
    const state = requireDemo();
    const listener = () => {
      demo?.messages.filter((item) => item.conversation_id === conversationId).forEach(onUpsert);
    };
    state.listeners.add(listener);
    return () => {
      state.listeners.delete(listener);
    };
  }
  const client = supabase;
  const channel = client
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        if (payload.new && 'id' in payload.new) onUpsert(payload.new as Message);
      },
    )
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

/** Avisa quando qualquer mensagem das conversas do usuário muda (para atualizar a caixa de entrada). */
export function subscribeToInbox(userId: string, onChange: () => void) {
  if (!supabase) {
    const state = demo;
    if (!state) return () => {};
    state.listeners.add(onChange);
    return () => {
      state.listeners.delete(onChange);
    };
  }
  const client = supabase;
  const channel = client
    .channel(`inbox:${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => onChange())
    .subscribe();
  return () => {
    client.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Painel do profissional e avaliações
// ---------------------------------------------------------------------------

export async function getProviderStats(userId: string): Promise<ProviderStats> {
  if (!supabase) {
    const state = requireDemo();
    await wait(120);
    return { views: 128, contacts: state.conversations.length + 10, rating_avg: state.me.rating_avg, rating_count: state.me.rating_count };
  }
  const { data, error } = await supabase.rpc('my_provider_stats').single();
  fail(error);
  const row = (data ?? {}) as Record<string, unknown>;
  return {
    views: Number(row.views ?? 0),
    contacts: Number(row.contacts ?? 0),
    rating_avg: Number(row.rating_avg ?? 0),
    rating_count: Number(row.rating_count ?? 0),
  };
}

export async function listReviews(providerId: string): Promise<Review[]> {
  if (!supabase) {
    await wait(120);
    return requireDemo().reviews.filter((item) => item.provider_id === providerId);
  }
  const { data, error } = await supabase
    .from('reviews')
    .select('id, provider_id, client_id, rating, comment, created_at, client:profiles!reviews_client_id_fkey(full_name)')
    .eq('provider_id', providerId)
    .order('created_at', { ascending: false });
  fail(error);
  return ((data as Record<string, unknown>[]) ?? []).map((row) => ({
    id: row.id as string,
    provider_id: row.provider_id as string,
    client_id: row.client_id as string,
    rating: Number(row.rating),
    comment: (row.comment as string) ?? '',
    created_at: row.created_at as string,
    client_name: ((row.client as { full_name?: string } | null)?.full_name) ?? 'Contratante',
  }));
}

export async function saveReview(providerId: string, clientId: string, rating: number, comment: string) {
  if (rating < 1 || rating > 5) throw new Error('Escolha de 1 a 5 estrelas.');
  if (!supabase) {
    const state = requireDemo();
    await wait();
    const existing = state.reviews.find((item) => item.provider_id === providerId && item.client_id === clientId);
    const review: Review = {
      id: existing?.id ?? `r-${Date.now()}`,
      provider_id: providerId,
      client_id: clientId,
      client_name: state.me.full_name,
      rating,
      comment: comment.trim(),
      created_at: new Date().toISOString(),
    };
    state.reviews = [review, ...state.reviews.filter((item) => item.id !== review.id)];
    return;
  }
  const { data: existing, error } = await supabase
    .from('reviews')
    .select('id')
    .eq('provider_id', providerId)
    .eq('client_id', clientId)
    .maybeSingle();
  fail(error);
  if (existing) {
    const { error: updateError } = await supabase.from('reviews').update({ rating, comment: comment.trim() }).eq('id', existing.id);
    fail(updateError);
    return;
  }
  const { error: insertError } = await supabase
    .from('reviews')
    .insert({ provider_id: providerId, client_id: clientId, rating, comment: comment.trim() });
  if (insertError && /row-level security/i.test(insertError.message)) {
    throw new Error('Você só pode avaliar profissionais com quem já conversou.');
  }
  fail(insertError);
}

// ---------------------------------------------------------------------------
// Assinaturas e pagamento (Mercado Pago, via função no servidor)
// ---------------------------------------------------------------------------

export async function listSubscriptions(userId: string): Promise<Subscription[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  fail(error);
  return data ?? [];
}

/** Pede ao servidor um link de pagamento do Mercado Pago para o plano escolhido. */
export async function createCheckout(plan: Subscription['plan']): Promise<string> {
  if (!supabase) throw new Error('Os pagamentos funcionam quando o app estiver ligado ao banco de dados (Supabase).');
  const { data, error } = await supabase.functions.invoke('mercadopago-checkout', { body: { action: 'checkout', plan } });
  if (error) throw new Error('Não foi possível abrir o pagamento agora. Tente novamente em instantes.');
  if (!data?.url) throw new Error(data?.error ?? 'Pagamento indisponível no momento.');
  return data.url as string;
}

/** Cancela a assinatura ativa do plano informado (o servidor avisa o Mercado Pago). */
export async function cancelSubscription(plan: Subscription['plan']) {
  if (!supabase) throw new Error('Os pagamentos funcionam quando o app estiver ligado ao banco de dados (Supabase).');
  const { data, error } = await supabase.functions.invoke('mercadopago-checkout', { body: { action: 'cancel', plan } });
  if (error || data?.error) throw new Error(data?.error ?? 'Não foi possível cancelar agora. Tente novamente.');
}
