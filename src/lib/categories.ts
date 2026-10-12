import type { Ionicons } from '@expo/vector-icons';
import type React from 'react';

import { C } from '@/theme/colors';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export type Category = { name: string; icon: IconName; background: string; color: string; keywords: string };

const TEAL = { background: C.tealLight, color: C.teal };
const AMBER = { background: C.amberLight, color: '#D97706' };
const SLATE = { background: '#F1F5F9', color: '#475569' };
const BLUE = { background: C.blueLight, color: '#2563EB' };
const PINK = { background: '#FCE7F3', color: '#DB2777' };
const GREEN = { background: '#ECFDF5', color: '#059669' };
const VIOLET = { background: '#F5F3FF', color: '#7C3AED' };

// As 4 primeiras aparecem no Início (layout do Figma); as demais em "Ver todas" e nos filtros.
export const CATEGORIES: Category[] = [
  { name: 'Casa', icon: 'home-outline', ...TEAL, keywords: 'casa residencial manutenção reparos' },
  { name: 'Auto', icon: 'car-sport-outline', ...AMBER, keywords: 'carro mecânico funilaria auto elétrica' },
  { name: 'Beleza', icon: 'diamond-outline', ...SLATE, keywords: 'cabelo maquiagem manicure estética barbearia' },
  { name: 'Tecnologia', icon: 'laptop-outline', ...BLUE, keywords: 'computador celular rede informática' },
  { name: 'Elétrica', icon: 'flash-outline', ...AMBER, keywords: 'eletricista tomada instalação elétrica' },
  { name: 'Encanamento', icon: 'water-outline', ...BLUE, keywords: 'encanador vazamento desentupimento hidráulica' },
  { name: 'Reformas e Construção', icon: 'hammer-outline', ...SLATE, keywords: 'pedreiro obra reforma gesso drywall azulejista' },
  { name: 'Pintura', icon: 'color-palette-outline', ...PINK, keywords: 'pintor parede textura' },
  { name: 'Limpeza', icon: 'sparkles-outline', ...TEAL, keywords: 'diarista faxina limpeza pós-obra' },
  { name: 'Jardinagem', icon: 'leaf-outline', ...GREEN, keywords: 'jardineiro paisagismo poda grama' },
  { name: 'Mudanças e Fretes', icon: 'cube-outline', ...AMBER, keywords: 'frete carreto mudança transporte' },
  { name: 'Montagem de Móveis', icon: 'construct-outline', ...SLATE, keywords: 'montador móveis marcenaria' },
  { name: 'Ar-condicionado', icon: 'snow-outline', ...BLUE, keywords: 'climatização refrigeração instalação ar' },
  { name: 'Eletrodomésticos', icon: 'tv-outline', ...VIOLET, keywords: 'geladeira máquina de lavar fogão assistência técnica' },
  { name: 'Chaveiro', icon: 'key-outline', ...AMBER, keywords: 'chave fechadura cópia' },
  { name: 'Dedetização', icon: 'bug-outline', ...GREEN, keywords: 'pragas cupim desinsetização' },
  { name: 'Pets', icon: 'paw-outline', ...PINK, keywords: 'banho tosa adestrador passeador veterinário' },
  { name: 'Saúde e Bem-estar', icon: 'fitness-outline', ...GREEN, keywords: 'personal massagem fisioterapia nutricionista' },
  { name: 'Aulas e Cursos', icon: 'school-outline', ...VIOLET, keywords: 'professor reforço idiomas música' },
  { name: 'Eventos', icon: 'balloon-outline', ...PINK, keywords: 'festa buffet decoração garçom DJ' },
  { name: 'Fotografia e Vídeo', icon: 'camera-outline', ...SLATE, keywords: 'fotógrafo filmagem ensaio' },
  { name: 'Design e Marketing', icon: 'brush-outline', ...VIOLET, keywords: 'designer logo redes sociais sites' },
  { name: 'Consultoria', icon: 'briefcase-outline', ...BLUE, keywords: 'contador advogado consultor administrativo' },
  { name: 'Costura e Moda', icon: 'shirt-outline', ...PINK, keywords: 'costureira ajustes roupas' },
  { name: 'Cuidadores', icon: 'heart-outline', ...TEAL, keywords: 'babá cuidador de idosos acompanhante' },
  { name: 'Segurança', icon: 'videocam-outline', ...SLATE, keywords: 'câmeras alarme portão eletrônico' },
  { name: 'Alimentação', icon: 'restaurant-outline', ...AMBER, keywords: 'cozinheira marmita bolos doces' },
];

export const CATEGORY_NAMES = CATEGORIES.map((category) => category.name);

export function findCategory(name: string) {
  return CATEGORIES.find((category) => category.name.toLowerCase() === name.toLowerCase());
}
