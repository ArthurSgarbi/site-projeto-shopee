import type { Product } from './types';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function formatMoney(cents: number) {
  return currency.format(cents / 100);
}

export function stockState(product: Product) {
  if (product.stock === 0) return 'Esgotado';
  if (product.stock <= product.minStock) return 'Estoque baixo';
  return 'Saudável';
}

export function calculateTotals(products: Product[]) {
  let invested = 0;
  let revenue = 0;
  let soldCost = 0;
  let fees = 0;
  let adSpend = 0;
  let adRevenue = 0;
  let incomingCost = 0;
  let stockUnits = 0;
  let orders = 0;
  let delivered = 0;

  for (const product of products) {
    invested += product.stock * product.costCents;
    revenue += product.weeklyDelivered * product.saleCents;
    soldCost += product.weeklyDelivered * product.costCents;
    fees += product.weeklyExpensesCents;
    adSpend += product.weeklyAdSpendCents ?? 0;
    adRevenue += product.weeklyAdRevenueCents ?? 0;
    incomingCost += product.incoming * product.costCents;
    stockUnits += product.stock;
    orders += product.weeklyOrders;
    delivered += product.weeklyDelivered;
  }

  return {
    invested,
    revenue,
    expenses: soldCost + fees + adSpend,
    profit: revenue - soldCost - fees - adSpend,
    adSpend,
    adRevenue,
    incomingCost,
    stockUnits,
    orders,
    delivered,
  };
}
