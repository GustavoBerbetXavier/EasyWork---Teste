export type Role = 'contratante' | 'profissional';

export type ProviderPlanId = 'gratuito' | 'basico' | 'plus' | 'premium' | 'empresarial';

export type Experience = { role: string; company: string; period: string; description: string };
export type Education = { course: string; institution: string; period: string; initials: string };
export type Project = { title: string; description: string };

/** Dados públicos do perfil (qualquer usuário logado pode ver). */
export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  username: string;
  headline: string;
  bio: string;
  tag: string;
  city: string;
  specialty: string;
  category: string;
  area: string;
  avatar_url: string | null;
  cover_url: string | null;
  skills: string[];
  experiences: Experience[];
  education: Education[];
  projects: Project[];
  objective: string;
  is_active: boolean;
  available: boolean;
  plan: ProviderPlanId;
  client_plan_active: boolean;
  rating_avg: number;
  rating_count: number;
};

/** Dados privados: só o próprio usuário vê. */
export type PrivateInfo = { birth_date: string | null; contact_email: string; phone: string };

export type Service = {
  id: string;
  provider_id: string;
  title: string;
  category: string;
  subcategory: string;
  description: string;
  price_label: string;
  active: boolean;
};

export type ProfileSummary = Pick<Profile, 'id' | 'full_name' | 'role' | 'avatar_url' | 'city' | 'specialty'>;

export type ConversationSummary = {
  id: string;
  other: ProfileSummary;
  subject: string;
  last_message: string;
  last_message_at: string;
  unread: number;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  read_at: string | null;
};

export type PortfolioPhoto = { id: string; provider_id: string; url: string; caption: string; created_at: string };

export type Review = {
  id: string;
  provider_id: string;
  client_id: string;
  client_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

export type ProviderStats = { views: number; contacts: number; rating_avg: number; rating_count: number };

export type Subscription = {
  plan: ProviderPlanId | 'contratante_mensal';
  status: 'pending' | 'authorized' | 'paused' | 'cancelled';
  current_period_end: string | null;
};
