import { desc, eq } from 'drizzle-orm';
import { getDb, getRawDb } from '@/db';
import { products } from '@/db/schema';
import { getSessionAdmin } from '@/lib/auth';

const noStoreHeaders = { 'Cache-Control': 'no-store' };

class PayloadError extends Error {}

function jsonError(error: string, status: number) {
  return Response.json({ error }, { status, headers: noStoreHeaders });
}

async function requireAdmin(request: Request) {
  return Boolean(await getSessionAdmin(request));
}

function nonNegativeInteger(source: Record<string, unknown>, key: string) {
  const value = Number(source[key] ?? 0);
  if (!Number.isFinite(value) || !Number.isInteger(value) || value < 0) {
    throw new PayloadError(
      `O campo ${key} deve ser um número inteiro maior ou igual a zero.`,
    );
  }
  return value;
}

function parsePayload(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new PayloadError('Dados inválidos.');
  const source = value as Record<string, unknown>;
  if (typeof source.name !== 'string' || !source.name.trim())
    throw new PayloadError('Nome obrigatório.');
  if (typeof source.sku !== 'string' || !source.sku.trim())
    throw new PayloadError('SKU obrigatório.');

  const id = source.id === undefined ? undefined : Number(source.id);
  if (id !== undefined && (!Number.isInteger(id) || id <= 0))
    throw new PayloadError('Produto inválido.');

  return {
    id,
    name: source.name.trim(),
    sku: source.sku.trim().toUpperCase(),
    category: typeof source.category === 'string' ? source.category.trim() : '',
    stock: nonNegativeInteger(source, 'stock'),
    minStock: nonNegativeInteger(source, 'minStock'),
    weeklyOrders: nonNegativeInteger(source, 'weeklyOrders'),
    weeklyDelivered: nonNegativeInteger(source, 'weeklyDelivered'),
    incoming: nonNegativeInteger(source, 'incoming'),
    costCents: nonNegativeInteger(source, 'costCents'),
    saleCents: nonNegativeInteger(source, 'saleCents'),
    weeklyExpensesCents: nonNegativeInteger(source, 'weeklyExpensesCents'),
    weeklyAdSpendCents: nonNegativeInteger(source, 'weeklyAdSpendCents'),
    weeklyAdRevenueCents: nonNegativeInteger(source, 'weeklyAdRevenueCents'),
  };
}

function databaseFailure(operation: string, error: unknown) {
  const message = error instanceof Error ? error.message : 'erro desconhecido';
  console.error(`[products] Falha ao ${operation}.`, message);
  if (message.includes('UNIQUE constraint failed'))
    return jsonError('Já existe um produto com este SKU.', 409);
  return jsonError('Banco de dados indisponível. Tente novamente.', 503);
}

export async function GET(request: Request) {
  try {
    if (!(await requireAdmin(request)))
      return jsonError('Autenticação necessária.', 401);
    const result = await getDb()
      .select()
      .from(products)
      .orderBy(desc(products.updatedAt));
    return Response.json(result, { headers: noStoreHeaders });
  } catch (error) {
    return databaseFailure('listar produtos', error);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin(request)))
      return jsonError('Autenticação necessária.', 401);
    const body: unknown = await request.json();

    if (Array.isArray(body)) {
      if (!body.length) return Response.json([], { headers: noStoreHeaders });
      const now = Date.now();
      const statements = body.map((item) => {
        const { id: _id, ...value } = parsePayload(item);
        return getRawDb()
          .prepare(`
          INSERT INTO products (
            name, sku, category, stock, min_stock, weekly_orders,
            weekly_delivered, incoming, cost_cents, sale_cents,
            weekly_expenses_cents, weekly_ad_spend_cents,
            weekly_ad_revenue_cents, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(sku) DO UPDATE SET
            name = excluded.name,
            category = excluded.category,
            stock = excluded.stock,
            min_stock = excluded.min_stock,
            weekly_orders = excluded.weekly_orders,
            weekly_delivered = excluded.weekly_delivered,
            incoming = excluded.incoming,
            cost_cents = excluded.cost_cents,
            sale_cents = excluded.sale_cents,
            weekly_expenses_cents = excluded.weekly_expenses_cents,
            weekly_ad_spend_cents = excluded.weekly_ad_spend_cents,
            weekly_ad_revenue_cents = excluded.weekly_ad_revenue_cents,
            updated_at = excluded.updated_at
        `)
          .bind(
            value.name,
            value.sku,
            value.category,
            value.stock,
            value.minStock,
            value.weeklyOrders,
            value.weeklyDelivered,
            value.incoming,
            value.costCents,
            value.saleCents,
            value.weeklyExpensesCents,
            value.weeklyAdSpendCents,
            value.weeklyAdRevenueCents,
            now,
          );
      });
      await getRawDb().batch(statements);
      const result = await getDb()
        .select()
        .from(products)
        .orderBy(desc(products.updatedAt));
      return Response.json(result, { status: 201, headers: noStoreHeaders });
    }

    const { id: _id, ...values } = parsePayload(body);
    const [created] = await getDb()
      .insert(products)
      .values({ ...values, updatedAt: new Date() })
      .returning();
    return Response.json(created, { status: 201, headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof PayloadError) return jsonError(error.message, 400);
    return databaseFailure('salvar produto', error);
  }
}

export async function PUT(request: Request) {
  try {
    if (!(await requireAdmin(request)))
      return jsonError('Autenticação necessária.', 401);
    const payload = parsePayload(await request.json());
    if (!payload.id) throw new PayloadError('Produto não informado.');
    const { id, ...values } = payload;
    const [updated] = await getDb()
      .update(products)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning();
    if (!updated) return jsonError('Produto não encontrado.', 404);
    return Response.json(updated, { headers: noStoreHeaders });
  } catch (error) {
    if (error instanceof PayloadError) return jsonError(error.message, 400);
    return databaseFailure('atualizar produto', error);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await requireAdmin(request)))
      return jsonError('Autenticação necessária.', 401);
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0)
      return jsonError('Produto não informado.', 400);
    const result = await getDb()
      .delete(products)
      .where(eq(products.id, id))
      .returning({ id: products.id });
    if (!result.length) return jsonError('Produto não encontrado.', 404);
    return new Response(null, { status: 204, headers: noStoreHeaders });
  } catch (error) {
    return databaseFailure('excluir produto', error);
  }
}
