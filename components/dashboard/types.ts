export type SectionKey =
  | 'overview'
  | 'products'
  | 'orders'
  | 'deliveries'
  | 'restocks'
  | 'ads'
  | 'settings';

export type Product = {
  id: number;
  name: string;
  sku: string;
  category: string;
  stock: number;
  minStock: number;
  weeklyOrders: number;
  weeklyDelivered: number;
  incoming: number;
  costCents: number;
  saleCents: number;
  weeklyExpensesCents: number;
  weeklyAdSpendCents: number;
  weeklyAdRevenueCents: number;
};

export type ProductDraft = Omit<Product, 'id'>;

export type OrderStatus = 'Pendente' | 'Pago' | 'Cancelado';

export type Order = {
  id: string;
  customer: string;
  initials: string;
  date: string;
  totalCents: number;
  items: number;
  status: OrderStatus;
};

export type DeliveryStatus = 'Preparando' | 'Em trânsito' | 'Entregue';

export type Delivery = {
  trackingCode: string;
  carrier: string;
  orderId: string;
  status: DeliveryStatus;
  destination: string;
  estimate: string;
};

export type Campaign = {
  id: number;
  name: string;
  platform: 'Google' | 'Meta';
  budgetCents: number;
  spentCents: number;
  revenueCents: number;
  clicks: number;
  conversions: number;
  theme: 'forest' | 'gold' | 'blue';
};

export type FinancialTotals = {
  invested: number;
  revenue: number;
  expenses: number;
  profit: number;
  adSpend: number;
  adRevenue: number;
  incomingCost: number;
  stockUnits: number;
  orders: number;
  delivered: number;
};
