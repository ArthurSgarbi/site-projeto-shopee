import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  platform: text('platform').notNull(),
  budgetCents: integer('budget_cents').notNull(),
  spentCents: integer('spent_cents').notNull().default(0),
  revenueCents: integer('revenue_cents').notNull().default(0),
  clicks: integer('clicks').notNull().default(0),
  conversions: integer('conversions').notNull().default(0),
  theme: text('theme').notNull().default('forest'),
  status: text('status').notNull().default('Ativa'),
  isDemo: integer('is_demo', { mode: 'boolean' }).notNull().default(false),
});

export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  sku: text('sku').notNull().unique(),
  category: text('category').notNull(),
  stock: integer('stock').notNull().default(0),
  minStock: integer('min_stock').notNull().default(0),
  weeklyOrders: integer('weekly_orders').notNull().default(0),
  weeklyDelivered: integer('weekly_delivered').notNull().default(0),
  incoming: integer('incoming').notNull().default(0),
  costCents: integer('cost_cents').notNull().default(0),
  saleCents: integer('sale_cents').notNull().default(0),
  weeklyExpensesCents: integer('weekly_expenses_cents').notNull().default(0),
  weeklyAdSpendCents: integer('weekly_ad_spend_cents').notNull().default(0),
  weeklyAdRevenueCents: integer('weekly_ad_revenue_cents').notNull().default(0),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const admins = sqliteTable('admins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('owner'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const authSessions = sqliteTable('auth_sessions', {
  id: text('id').primaryKey(),
  adminId: integer('admin_id')
    .notNull()
    .references(() => admins.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull().default(0),
  mfaVerified: integer('mfa_verified').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const authChallenges = sqliteTable('auth_challenges', {
  id: text('id').primaryKey(),
  adminId: integer('admin_id')
    .notNull()
    .unique()
    .references(() => admins.id, { onDelete: 'cascade' }),
  browserHash: text('browser_hash').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  resends: integer('resends').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
  lastSentAt: integer('last_sent_at').notNull(),
  consumedAt: integer('consumed_at'),
  sessionHash: text('session_hash'),
});

export const authRateLimits = sqliteTable('auth_rate_limits', {
  key: text('key').primaryKey(),
  hits: integer('hits').notNull(),
  resetAt: integer('reset_at').notNull(),
});

export const loginChallenges = sqliteTable('login_challenges', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  codeHash: text('code_hash').notNull(),
  attempts: integer('attempts').notNull().default(0),
  expiresAt: integer('expires_at').notNull(),
  consumedAt: integer('consumed_at'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const orders = sqliteTable('orders', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  orderNumber: text('order_number').notNull().unique(),
  customer: text('customer').notNull(),
  date: text('date').notNull(),
  totalCents: integer('total_cents').notNull(),
  items: integer('items').notNull(),
  status: text('status').notNull(),
  productName: text('product_name').notNull().default(''),
  destination: text('destination').notNull().default(''),
  carrier: text('carrier').notNull().default(''),
  estimate: text('estimate').notNull().default(''),
  deliveryGenerated: integer('delivery_generated', { mode: 'boolean' })
    .notNull()
    .default(false),
});

export const deliveries = sqliteTable(
  'deliveries',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    trackingCode: text('tracking_code').unique(),
    carrier: text('carrier').notNull(),
    orderId: text('order_id')
      .notNull()
      .references(() => orders.orderNumber, {
        onDelete: 'restrict',
        onUpdate: 'cascade',
      }),
    status: text('status').notNull(),
    destination: text('destination').notNull(),
    estimate: text('estimate').notNull(),
    shippedAt: text('shipped_at').notNull().default(''),
    deliveredAt: text('delivered_at').notNull().default(''),
  },
  (table) => [index('idx_deliveries_order_id').on(table.orderId)],
);

export const adminPreferences = sqliteTable('admin_preferences', {
  adminId: integer('admin_id')
    .primaryKey()
    .references(() => admins.id, { onDelete: 'cascade' }),
  sidebarOrder: text('sidebar_order').notNull(),
});
