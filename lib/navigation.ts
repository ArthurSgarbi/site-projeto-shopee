import type { SectionKey } from '../components/dashboard/types';

export const DEFAULT_SIDEBAR_ORDER: SectionKey[] = [
  'overview',
  'products',
  'orders',
  'deliveries',
  'restocks',
  'ads',
  'settings',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  overview: 'Visão geral',
  products: 'Produtos',
  orders: 'Pedidos',
  deliveries: 'Entregas',
  restocks: 'Reposições',
  ads: 'Anúncios',
  settings: 'Configurações',
};

export function isSidebarOrder(value: unknown): value is SectionKey[] {
  return (
    Array.isArray(value) &&
    value.length === DEFAULT_SIDEBAR_ORDER.length &&
    new Set(value).size === value.length &&
    value.every((item) => DEFAULT_SIDEBAR_ORDER.includes(item))
  );
}

export function moveSection(
  order: SectionKey[],
  section: SectionKey,
  direction: -1 | 1,
): SectionKey[] {
  const index = order.indexOf(section);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return order;
  const next = [...order];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
