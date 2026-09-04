import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

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
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .$defaultFn(() => new Date()),
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
