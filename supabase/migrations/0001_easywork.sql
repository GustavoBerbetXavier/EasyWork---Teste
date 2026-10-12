-- =====================================================================
-- EASY WORK — esquema do banco (Supabase / PostgreSQL)
-- Como usar: Supabase > SQL Editor > New query > cole este arquivo > Run.
-- Pode ser executado uma única vez em um projeto novo.
-- =====================================================================

-- ---------- Utilitário: updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- =====================================================================
-- PERFIS
-- =====================================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'contratante' check (role in ('contratante', 'profissional')),
  full_name text not null default '',
  username text unique,
  headline text not null default '' check (char_length(headline) <= 160),
  bio text not null default '' check (char_length(bio) <= 1200),
  tag text not null default '',
  city text not null default '',
  specialty text not null default '',
  category text not null default '',
  area text not null default '',
  avatar_url text,
  cover_url text,
  skills text[] not null default '{}',
  experiences jsonb not null default '[]',
  education jsonb not null default '[]',
  projects jsonb not null default '[]',
  objective text not null default '' check (char_length(objective) <= 800),
  is_active boolean not null default true,
  available boolean not null default true,
  -- Campos abaixo só o servidor altera (pagamentos e avaliações)
  plan text not null default 'gratuito' check (plan in ('gratuito', 'basico', 'plus', 'premium', 'empresarial')),
  client_plan_active boolean not null default false,
  rating_avg numeric(2, 1) not null default 0,
  rating_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Dados privados (só o dono vê): nascimento, e-mail de contato e telefone
create table public.profile_private (
  id uuid primary key references public.profiles (id) on delete cascade,
  birth_date date,
  contact_email text not null default '',
  phone text not null default '',
  updated_at timestamptz not null default now()
);

create trigger profile_private_updated_at before update on public.profile_private
  for each row execute function public.set_updated_at();

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'contratante');
  v_name text := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1));
  v_base text := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_]', '', 'g'));
begin
  if v_role not in ('contratante', 'profissional') then
    v_role := 'contratante';
  end if;
  if v_base = '' then
    v_base := 'usuario';
  end if;

  insert into public.profiles (id, role, full_name, username, city)
  values (
    new.id,
    v_role,
    v_name,
    left(v_base, 20) || '_' || substr(replace(new.id::text, '-', ''), 1, 5),
    coalesce(new.raw_user_meta_data ->> 'city', '')
  );

  insert into public.profile_private (id, contact_email, phone)
  values (new.id, coalesce(new.email, ''), coalesce(new.raw_user_meta_data ->> 'phone', ''));

  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.profile_private enable row level security;

create policy "perfis visíveis para usuários logados" on public.profiles
  for select to authenticated using (true);

create policy "usuário edita o próprio perfil" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "dados privados: só o dono lê" on public.profile_private
  for select to authenticated using ((select auth.uid()) = id);

create policy "dados privados: só o dono altera" on public.profile_private
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- O app só pode alterar estas colunas (papel, plano e notas ficam protegidos)
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (
  full_name, username, headline, bio, tag, city, specialty, category, area,
  avatar_url, cover_url, skills, experiences, education, projects, objective,
  is_active, available
) on public.profiles to authenticated;

revoke insert, update, delete on public.profile_private from anon, authenticated;
grant update (birth_date, contact_email, phone) on public.profile_private to authenticated;

-- =====================================================================
-- SERVIÇOS DO PROFISSIONAL
-- =====================================================================
create table public.services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 80),
  category text not null default '',
  subcategory text not null default '',
  description text not null default '' check (char_length(description) <= 500),
  price_label text not null default 'sob consulta',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_provider_idx on public.services (provider_id);

create trigger services_updated_at before update on public.services
  for each row execute function public.set_updated_at();

alter table public.services enable row level security;

create policy "serviços ativos são públicos" on public.services
  for select to authenticated
  using (active or provider_id = (select auth.uid()));

create policy "profissional cadastra os próprios serviços" on public.services
  for insert to authenticated
  with check (
    provider_id = (select auth.uid())
    and (select p.role from public.profiles p where p.id = (select auth.uid())) = 'profissional'
  );

create policy "profissional altera os próprios serviços" on public.services
  for update to authenticated
  using (provider_id = (select auth.uid()))
  with check (provider_id = (select auth.uid()));

create policy "profissional remove os próprios serviços" on public.services
  for delete to authenticated
  using (provider_id = (select auth.uid()));

-- Limites por plano: gratuito 1, Básico 3, Plus+ 10, Premium 30, Empresarial 50 serviços;
-- fotos de trabalhos: Plus+ 5, Premium 10, Empresarial 30.
create or replace function public.plan_limit(p_plan text, p_kind text)
returns integer language sql immutable set search_path = '' as $$
  select case p_kind
    when 'services' then case p_plan when 'basico' then 3 when 'plus' then 10 when 'premium' then 30 when 'empresarial' then 50 else 1 end
    when 'photos' then case p_plan when 'plus' then 5 when 'premium' then 10 when 'empresarial' then 30 else 0 end
    else 0 end;
$$;

create or replace function public.enforce_service_limit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_plan text;
begin
  select plan into v_plan from public.profiles where id = new.provider_id;
  if (select count(*) from public.services where provider_id = new.provider_id) >= public.plan_limit(v_plan, 'services') then
    raise exception 'Limite de serviços do seu plano atingido.';
  end if;
  return new;
end;
$$;

create trigger services_limit before insert on public.services
  for each row execute function public.enforce_service_limit();

-- =====================================================================
-- CONVERSAS E MENSAGENS
-- =====================================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null default '' check (char_length(subject) <= 120),
  last_message text not null default '',
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (client_id, provider_id),
  check (client_id <> provider_id)
);

create index conversations_client_idx on public.conversations (client_id, last_message_at desc);
create index conversations_provider_idx on public.conversations (provider_id, last_message_at desc);

alter table public.conversations enable row level security;

create policy "participantes veem a conversa" on public.conversations
  for select to authenticated
  using ((select auth.uid()) in (client_id, provider_id));

create policy "contratante inicia conversa com profissional" on public.conversations
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and (select p.role from public.profiles p where p.id = (select auth.uid())) = 'contratante'
    and (select p.role from public.profiles p where p.id = provider_id) = 'profissional'
  );

revoke update, delete on public.conversations from anon, authenticated;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 1000),
  image_url text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (char_length(body) >= 1 or image_url is not null)
);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

create policy "participantes leem mensagens" on public.messages
  for select to authenticated
  using (exists (
    select 1 from public.conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.client_id, c.provider_id)
  ));

create policy "participantes enviam mensagens" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.client_id, c.provider_id)
    )
  );

create policy "destinatário marca como lida" on public.messages
  for update to authenticated
  using (
    sender_id <> (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.client_id, c.provider_id)
    )
  );

revoke update, delete on public.messages from anon, authenticated;
grant update (read_at) on public.messages to authenticated;

-- Atualiza a prévia da conversa a cada mensagem
create or replace function public.touch_conversation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.conversations
     set last_message = case when new.body = '' then '📷 Foto' else left(new.body, 140) end,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_touch_conversation after insert on public.messages
  for each row execute function public.touch_conversation();

-- Mensagens em tempo real
alter publication supabase_realtime add table public.messages;

-- Lista de conversas do usuário com o outro participante e o total de não lidas
create or replace function public.my_conversations()
returns table (
  id uuid, subject text, last_message text, last_message_at timestamptz, unread bigint,
  other_id uuid, other_name text, other_role text, other_avatar text, other_city text, other_specialty text
)
language sql stable security invoker set search_path = '' as $$
  select
    c.id, c.subject, c.last_message, c.last_message_at,
    (select count(*) from public.messages m
      where m.conversation_id = c.id and m.sender_id <> (select auth.uid()) and m.read_at is null) as unread,
    p.id, p.full_name, p.role, p.avatar_url, p.city, p.specialty
  from public.conversations c
  join public.profiles p
    on p.id = case when c.client_id = (select auth.uid()) then c.provider_id else c.client_id end
  where (select auth.uid()) in (c.client_id, c.provider_id)
  order by c.last_message_at desc;
$$;

-- =====================================================================
-- AVALIAÇÕES
-- =====================================================================
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  unique (provider_id, client_id)
);

create index reviews_provider_idx on public.reviews (provider_id, created_at desc);

alter table public.reviews enable row level security;

create policy "avaliações são públicas" on public.reviews
  for select to authenticated using (true);

create policy "contratante avalia quem já conversou com ele" on public.reviews
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and exists (
      select 1 from public.conversations c
      where c.client_id = (select auth.uid()) and c.provider_id = reviews.provider_id
    )
  );

create policy "contratante altera a própria avaliação" on public.reviews
  for update to authenticated
  using (client_id = (select auth.uid()))
  with check (client_id = (select auth.uid()));

create policy "contratante remove a própria avaliação" on public.reviews
  for delete to authenticated
  using (client_id = (select auth.uid()));

revoke update on public.reviews from anon, authenticated;
grant update (rating, comment) on public.reviews to authenticated;

-- Mantém nota média e total de avaliações no perfil
create or replace function public.refresh_provider_rating()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_provider uuid := coalesce(new.provider_id, old.provider_id);
begin
  update public.profiles p
     set rating_avg = coalesce((select round(avg(r.rating)::numeric, 1) from public.reviews r where r.provider_id = v_provider), 0),
         rating_count = (select count(*) from public.reviews r where r.provider_id = v_provider)
   where p.id = v_provider;
  return null;
end;
$$;

create trigger reviews_refresh_rating after insert or update or delete on public.reviews
  for each row execute function public.refresh_provider_rating();

-- =====================================================================
-- VISUALIZAÇÕES DE PERFIL (painel do profissional)
-- =====================================================================
create table public.profile_views (
  id bigint generated always as identity primary key,
  provider_id uuid not null references public.profiles (id) on delete cascade,
  viewer_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  check (provider_id <> viewer_id)
);

create index profile_views_provider_idx on public.profile_views (provider_id, created_at desc);

alter table public.profile_views enable row level security;

create policy "registrar visualização" on public.profile_views
  for insert to authenticated with check (viewer_id = (select auth.uid()));

create policy "profissional vê as próprias visualizações" on public.profile_views
  for select to authenticated using (provider_id = (select auth.uid()));

create or replace function public.my_provider_stats()
returns table (views bigint, contacts bigint, rating_avg numeric, rating_count integer)
language sql stable security invoker set search_path = '' as $$
  select
    (select count(*) from public.profile_views v
      where v.provider_id = (select auth.uid()) and v.created_at > now() - interval '30 days'),
    (select count(*) from public.conversations c
      where c.provider_id = (select auth.uid()) and c.created_at > now() - interval '30 days'),
    p.rating_avg,
    p.rating_count
  from public.profiles p
  where p.id = (select auth.uid());
$$;

-- =====================================================================
-- BUSCA DE PROFISSIONAIS (planos maiores aparecem primeiro)
-- =====================================================================
create or replace function public.search_providers(q text default '', cat text default '', city_filter text default '')
returns setof public.profiles
language sql stable security invoker set search_path = '' as $$
  select p.*
  from public.profiles p
  where p.role = 'profissional'
    and p.is_active
    and (coalesce(cat, '') = '' or p.category ilike cat)
    and (coalesce(city_filter, '') = '' or p.city ilike '%' || city_filter || '%')
    and (
      coalesce(q, '') = ''
      or p.full_name ilike '%' || q || '%'
      or p.specialty ilike '%' || q || '%'
      or p.category ilike '%' || q || '%'
      or p.area ilike '%' || q || '%'
      or p.city ilike '%' || q || '%'
      or exists (
        select 1 from public.services s
        where s.provider_id = p.id and s.active
          and (s.title ilike '%' || q || '%' or s.description ilike '%' || q || '%')
      )
    )
  order by
    case p.plan when 'empresarial' then 4 when 'premium' then 4 when 'plus' then 2 when 'basico' then 1 else 0 end desc,
    p.rating_avg desc,
    p.rating_count desc,
    p.created_at
  limit 60;
$$;

-- =====================================================================
-- ASSINATURAS (gravadas só pelo servidor / Mercado Pago)
-- =====================================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan text not null check (plan in ('basico', 'plus', 'premium', 'empresarial', 'contratante_mensal')),
  status text not null default 'pending' check (status in ('pending', 'authorized', 'paused', 'cancelled')),
  provider text not null default 'mercadopago',
  external_id text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subscriptions_user_idx on public.subscriptions (user_id, created_at desc);

create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

create policy "usuário vê as próprias assinaturas" on public.subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

revoke insert, update, delete on public.subscriptions from anon, authenticated;

-- Quando uma assinatura muda, atualiza o plano no perfil
create or replace function public.apply_subscription()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.plan = 'contratante_mensal' then
    update public.profiles set client_plan_active = (new.status = 'authorized') where id = new.user_id;
  elsif new.status = 'authorized' then
    update public.profiles set plan = new.plan where id = new.user_id;
  elsif new.status in ('cancelled', 'paused') then
    update public.profiles p set plan = 'gratuito'
     where p.id = new.user_id and p.plan = new.plan
       and not exists (
         select 1 from public.subscriptions s
         where s.user_id = new.user_id and s.id <> new.id and s.status = 'authorized' and s.plan <> 'contratante_mensal'
       );
  end if;
  return new;
end;
$$;

create trigger subscriptions_apply after insert or update of status on public.subscriptions
  for each row execute function public.apply_subscription();

-- =====================================================================
-- PORTFÓLIO (fotos de trabalhos do profissional — planos Plus+ ou superiores)
-- =====================================================================
create table public.portfolio_photos (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.profiles (id) on delete cascade,
  url text not null,
  caption text not null default '' check (char_length(caption) <= 120),
  created_at timestamptz not null default now()
);

create index portfolio_photos_provider_idx on public.portfolio_photos (provider_id, created_at desc);

alter table public.portfolio_photos enable row level security;

create policy "portfólio é público" on public.portfolio_photos
  for select to authenticated using (true);

create policy "profissional com plano adiciona fotos" on public.portfolio_photos
  for insert to authenticated
  with check (
    provider_id = (select auth.uid())
    and (select count(*) from public.portfolio_photos f where f.provider_id = (select auth.uid()))
        < public.plan_limit((select p.plan from public.profiles p where p.id = (select auth.uid())), 'photos')
  );

create policy "profissional remove as próprias fotos" on public.portfolio_photos
  for delete to authenticated using (provider_id = (select auth.uid()));

revoke update on public.portfolio_photos from anon, authenticated;

-- =====================================================================
-- FOTOS (perfil, capa, portfólio e anexos do chat)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('covers', 'covers', true), ('portfolio', 'portfolio', true), ('chat', 'chat', true)
on conflict (id) do nothing;

create policy "usuário envia fotos na própria pasta" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('avatars', 'covers', 'portfolio', 'chat')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "usuário substitui fotos da própria pasta" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('avatars', 'covers', 'portfolio', 'chat')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "usuário apaga fotos da própria pasta" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('avatars', 'covers', 'portfolio', 'chat')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
