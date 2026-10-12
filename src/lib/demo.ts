// Dados locais usados no modo demonstração (quando o Supabase ainda não foi configurado).
// Espelham os textos do layout no Figma. Nada daqui é enviado para a internet.
import type { Message, PrivateInfo, Profile, Review, Role, Service } from './types';

export const DEMO_USER_ID = 'demo-user';

const baseProfile: Omit<Profile, 'id' | 'role' | 'full_name'> = {
  username: '',
  headline: '',
  bio: '',
  tag: '',
  city: 'Campo Mourão, PR',
  specialty: '',
  category: '',
  area: '',
  avatar_url: null,
  cover_url: null,
  skills: [],
  experiences: [],
  education: [],
  projects: [],
  objective: '',
  is_active: true,
  available: true,
  plan: 'gratuito',
  client_plan_active: false,
  rating_avg: 0,
  rating_count: 0,
};

export function demoMyProfile(role: Role, name?: string): Profile {
  return {
    ...baseProfile,
    id: DEMO_USER_ID,
    role,
    full_name: name?.trim() || 'Ana Costa',
    username: 'anacosta',
    headline: 'Líder de produto e inovação digital com foco em experiência do usuário.',
    bio: 'Sou uma profissional apaixonada por transformar desafios em produtos escaláveis. Com mais de 8 anos de experiência em liderança de produto, inovação e UX, ajudo equipes a construir soluções digitais que realmente resolvem problemas reais.',
    tag: 'Auto',
    city: 'São Paulo, SP',
    specialty: role === 'profissional' ? 'Encanamento' : '',
    category: role === 'profissional' ? 'Casa' : '',
    area: role === 'profissional' ? 'Centro' : '',
    skills: ['Product Design', 'UX Research', 'Agile', 'Data Analysis', 'Leadership', 'Figma'],
    experiences: [
      { role: 'Líder de Produto', company: 'EASY WORK', period: '2021 - Atual', description: 'Responsável por definir a estratégia de produto da plataforma, liderar squads de engenharia e design, e garantir a entrega de MVPs com alto impacto comercial.' },
      { role: 'Especialista em UX', company: 'Studio Design', period: '2018 - 2021', description: 'Desenvolvi interfaces para aplicativos móveis e web, conduzi pesquisas de usuário e criei fluxos de onboarding para startups de impacto.' },
    ],
    education: [
      { course: 'Design de Interação', institution: 'Universidade de São Paulo', period: '2014 - 2018', initials: 'USP' },
      { course: 'Product Management', institution: 'MIT Sloan School', period: '2020', initials: 'MIT' },
    ],
    projects: [
      { title: 'Plataforma EASY WORK', description: 'Desenvolvimento da versão 2.0 do marketplace.' },
      { title: 'Design System', description: 'Criação do kit de componentes unificado da empresa.' },
    ],
    objective: 'Busco oportunidades em empresas que valorizam a inovação, a colaboração e o impacto social. Quero liderar equipes que transformam a forma como as pessoas trabalham e interagem com tecnologia.',
    rating_avg: role === 'profissional' ? 4.9 : 0,
    rating_count: role === 'profissional' ? 27 : 0,
  };
}

export function demoMyPrivate(): PrivateInfo {
  return { birth_date: '1992-01-12', contact_email: 'ana@easywork.com', phone: '(11) 99999-0000' };
}

function provider(id: string, full_name: string, specialty: string, area: string, category: string, rating_avg: number, rating_count: number): Profile {
  return {
    ...baseProfile,
    id,
    role: 'profissional',
    full_name,
    username: id,
    headline: `${specialty} em ${area}, Campo Mourão.`,
    bio: 'Atendimento com hora marcada, orçamento sem compromisso e garantia do serviço.',
    specialty,
    area,
    category,
    rating_avg,
    rating_count,
  };
}

export const demoProviders: Profile[] = [
  provider('prof-local', 'Profissional local', 'Encanamento', 'Centro', 'Casa', 4.9, 27),
  provider('assistencia', 'Assistência técnica', 'Computadores e redes', 'Jardim Lar Paraná', 'Tecnologia', 4.8, 19),
  provider('auto-center', 'Auto Center demonstrativo', 'Manutenção automotiva', 'Centro', 'Auto', 4.7, 33),
  provider('beleza', 'Profissional de beleza', 'Cabelo e maquiagem', 'Área central', 'Beleza', 4.9, 41),
];

function client(id: string, full_name: string): Profile {
  return { ...baseProfile, id, role: 'contratante', full_name, username: id };
}

export const demoClients: Profile[] = [
  client('marina', 'Marina Costa'),
  client('rafael-c', 'Rafael Lima'),
  client('atelie', 'Ateliê Casa'),
  client('livia', 'Lívia Nunes'),
];

export const demoRafaelProvider: Profile = provider('rafael', 'Rafael Lima', 'Encanamento', 'Centro', 'Casa', 4.8, 12);

export function demoServices(providerId: string): Service[] {
  return [
    { id: `${providerId}-s1`, provider_id: providerId, title: 'Instalação de torneiras', category: 'Encanamento', subcategory: 'Residencial', description: 'Troca de torneiras, registros e sifões.', price_label: 'sob consulta', active: true },
    { id: `${providerId}-s2`, provider_id: providerId, title: 'Reparo de vazamentos', category: 'Encanamento', subcategory: 'Residencial', description: 'Identificação e reparo de vazamentos.', price_label: 'sob consulta', active: true },
    { id: `${providerId}-s3`, provider_id: providerId, title: 'Desentupimento leve', category: 'Encanamento', subcategory: 'Residencial', description: 'Pias e ralos, mediante avaliação do caso.', price_label: 'sob consulta', active: true },
  ];
}

type DemoConversation = { id: string; otherId: string; subject: string; createdAt: string };

function at(daysAgo: number, hour: number, minute: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function demoConversations(role: Role): { conversations: DemoConversation[]; messages: Message[] } {
  const me = DEMO_USER_ID;
  const msg = (id: string, conversation_id: string, mine: boolean, otherId: string, body: string, created_at: string, read = true): Message => ({
    id, conversation_id, sender_id: mine ? me : otherId, body, image_url: null, created_at, read_at: read || mine ? created_at : null,
  });

  if (role === 'profissional') {
    return {
      conversations: [
        { id: 'c-marina', otherId: 'marina', subject: 'Reparo de torneira · Orçamento', createdAt: at(0, 10, 20) },
        { id: 'c-rafael', otherId: 'rafael-c', subject: 'Orçamento enviado', createdAt: at(1, 9, 0) },
        { id: 'c-atelie', otherId: 'atelie', subject: 'Detalhes do serviço', createdAt: at(5, 15, 0) },
        { id: 'c-livia', otherId: 'livia', subject: 'Serviço concluído', createdAt: at(6, 11, 0) },
      ],
      messages: [
        msg('m1', 'c-marina', true, 'marina', 'Olá, Marina! Vi seu contato pela plataforma. Como posso ajudar?', at(0, 10, 24)),
        msg('m2', 'c-marina', false, 'marina', 'Oi! A torneira da cozinha está vazando. Você atende no Centro?', at(0, 10, 26), false),
        msg('m3', 'c-marina', true, 'marina', 'Atendo essa região, sim. Posso entender melhor o serviço e passar uma estimativa.', at(0, 10, 27)),
        msg('m4', 'c-marina', false, 'marina', 'Você atende no Centro esta semana?', at(0, 10, 28), false),
        msg('m5', 'c-rafael', false, 'rafael-c', 'Enviei a estimativa que você pediu.', at(1, 9, 10)),
        msg('m6', 'c-atelie', false, 'atelie', 'Consegue detalhar o serviço?', at(5, 15, 5)),
        msg('m7', 'c-livia', false, 'livia', 'Obrigada pelo retorno!', at(6, 11, 30)),
      ],
    };
  }

  return {
    conversations: [
      { id: 'c-rafael', otherId: 'rafael', subject: 'Reparo de torneira · Orçamento', createdAt: at(0, 10, 20) },
      { id: 'c-prof', otherId: 'prof-local', subject: 'Reparo de torneira', createdAt: at(1, 9, 0) },
      { id: 'c-assist', otherId: 'assistencia', subject: 'Manutenção do computador', createdAt: at(5, 15, 0) },
      { id: 'c-beleza', otherId: 'beleza', subject: 'Maquiagem para evento', createdAt: at(6, 11, 0) },
    ],
    messages: [
      msg('m1', 'c-rafael', false, 'rafael', 'Olá! Vi seu contato sobre a torneira. Como posso ajudar?', at(0, 10, 24)),
      msg('m2', 'c-rafael', true, 'rafael', 'A torneira da cozinha está vazando. Você atende no Centro?', at(0, 10, 26)),
      msg('m3', 'c-rafael', false, 'rafael', 'Atendo essa região, sim. Posso avaliar o caso e passar uma estimativa.', at(0, 10, 27), false),
      msg('m4', 'c-rafael', false, 'rafael', 'Pode me enviar uma foto do problema?', at(0, 10, 28), false),
      msg('m5', 'c-prof', false, 'prof-local', 'Enviei a estimativa que você pediu.', at(1, 9, 10)),
      msg('m6', 'c-assist', false, 'assistencia', 'Consegue detalhar o problema do computador?', at(5, 15, 5)),
      msg('m7', 'c-beleza', false, 'beleza', 'Obrigada pelo retorno!', at(6, 11, 30)),
    ],
  };
}

export function demoReviews(providerId: string): Review[] {
  return [
    { id: 'r1', provider_id: providerId, client_id: 'marina', client_name: 'Marina Costa', rating: 5, comment: 'Chegou no horário e resolveu o vazamento rapidinho. Recomendo!', created_at: at(3, 18, 0) },
    { id: 'r2', provider_id: providerId, client_id: 'livia', client_name: 'Lívia Nunes', rating: 5, comment: 'Muito educado e caprichoso. Preço justo.', created_at: at(9, 14, 0) },
    { id: 'r3', provider_id: providerId, client_id: 'atelie', client_name: 'Ateliê Casa', rating: 4, comment: 'Bom atendimento, explicou tudo antes de começar.', created_at: at(20, 10, 0) },
  ];
}
