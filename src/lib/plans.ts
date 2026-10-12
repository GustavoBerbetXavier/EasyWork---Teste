import type { ProviderPlanId } from './types';

export type PlanTone = 'gray' | 'teal' | 'amber' | 'navy';

export type ProviderPlan = {
  id: Exclude<ProviderPlanId, 'gratuito'>;
  name: string;
  /** Preço mensal em reais. `null` enquanto o valor não foi definido. */
  price: number | null;
  tagline: string;
  features: string[];
  note?: string;
  cta: string;
  tone: PlanTone;
};

export type ProviderPlanDetails = ProviderPlan & { label: string; pricePrefix?: string; description: string; details: string[] };

// Planos do profissional (valores e benefícios definidos pelo dono do app).
export const PROVIDER_PLANS: ProviderPlanDetails[] = [
  {
    id: 'basico',
    name: 'Básico',
    label: 'Essencial',
    price: 14.9,
    tagline: 'PRESENÇA ESSENCIAL',
    description: 'Para quem deseja ter seu perfil disponível para clientes.',
    features: ['Perfil público com informações básicas', 'Até 3 serviços cadastrados'],
    details: [
      'Perfil público com informações básicas.',
      'Nome, profissão, descrição curta e região atendida.',
      'Informações de contato.',
      'Até 3 serviços cadastrados.',
      'Visibilidade padrão nas pesquisas.',
      'Sem galeria de fotos de trabalhos.',
    ],
    cta: 'Conhecer o Básico',
    tone: 'gray',
  },
  {
    id: 'plus',
    name: 'Plus+',
    label: 'Recomendado',
    price: 29.9,
    tagline: 'MAIS VISIBILIDADE + PORTFÓLIO',
    description: 'Para quem quer divulgar melhor seus serviços.',
    features: ['Até 5 fotos e 10 serviços', 'Maior destaque e selo Plus+'],
    details: [
      'Tudo do Básico.',
      'Perfil mais completo.',
      'Até 5 fotos de trabalhos e projetos.',
      'Até 10 serviços cadastrados.',
      'Maior destaque nas pesquisas.',
      'Selo Plus+ no perfil.',
    ],
    cta: 'Ver o plano Plus+',
    tone: 'teal',
  },
  {
    id: 'premium',
    name: 'Premium',
    label: 'Destaque máximo',
    price: 49.9,
    tagline: 'PRIORIDADE DE EXPOSIÇÃO',
    description: 'Para quem deseja se destacar e fortalecer sua presença.',
    features: ['Prioridade nas pesquisas e até 10 fotos', 'Estatísticas de visualizações e contatos'],
    details: [
      'Tudo do Plus+.',
      'Até 10 fotos de trabalhos e projetos.',
      'Perfil com apresentação ampliada.',
      'Prioridade de exibição nas pesquisas.',
      'Mais serviços cadastrados (até 30).',
      'Estatísticas de visualizações e contatos, quando disponíveis.',
    ],
    cta: 'Ver o plano Premium',
    tone: 'amber',
  },
  {
    id: 'empresarial',
    name: 'Empresarial',
    label: 'Para empresas',
    price: 85,
    pricePrefix: 'A partir de ',
    tagline: 'PARA EMPRESAS E EQUIPES',
    description: 'Para empresas que precisam divulgar equipes e vários profissionais.',
    features: ['Perfil institucional e vários profissionais', 'Combine perfis Plus+ e Premium'],
    note: 'Pacotes personalizados para equipes maiores.',
    details: [
      'Perfil institucional.',
      'Cadastro de vários profissionais.',
      'Possibilidade de combinar perfis Plus+ e Premium.',
      'Galeria de projetos da empresa.',
      'Gestão centralizada dos perfis.',
      'Pacotes personalizados para equipes maiores.',
    ],
    cta: 'Conhecer o Empresarial',
    tone: 'navy',
  },
];

/** Limites por plano (iguais aos do banco de dados). */
export const PLAN_LIMITS: Record<ProviderPlanId, { services: number; photos: number; stats: boolean }> = {
  gratuito: { services: 1, photos: 0, stats: false },
  basico: { services: 3, photos: 0, stats: false },
  plus: { services: 10, photos: 5, stats: false },
  premium: { services: 30, photos: 10, stats: true },
  empresarial: { services: 50, photos: 30, stats: true },
};

/** Selo exibido no perfil e nas buscas. */
export function planBadge(id: ProviderPlanId): string | null {
  if (id === 'plus') return 'PLUS+';
  if (id === 'premium') return 'PREMIUM';
  if (id === 'empresarial') return 'EMPRESA';
  return null;
}

export function planName(id: ProviderPlanId) {
  if (id === 'gratuito') return 'Plano gratuito';
  return `Plano ${PROVIDER_PLANS.find((plan) => plan.id === id)?.name ?? id}`;
}

export function formatPrice(price: number | null, prefix = '') {
  if (price === null) return 'VALOR A DEFINIR';
  return `${prefix}R$ ${price.toFixed(2).replace('.', ',')}/mês`;
}

/** Planos que liberam fotos de trabalhos (portfólio). */
export function planAllowsPortfolio(id: ProviderPlanId) {
  return PLAN_LIMITS[id].photos > 0;
}

/** Planos com destaque identificado nas buscas. */
export function planIsHighlighted(id: ProviderPlanId) {
  return id === 'premium' || id === 'empresarial';
}
