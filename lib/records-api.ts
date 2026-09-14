import { getRawDb } from '@/db';
import { getSessionAdmin } from '@/lib/auth';
import type { Delivery, Order } from '@/components/dashboard/types';
import { normalizeDeliveryStatus } from '@/lib/delivery-timing';
import {
  assertSafeMutation,
  httpFailure,
  noStoreHeaders,
  readJson,
} from '@/lib/http-security';
import {
  RecordInputError,
  recordBody,
  recordId,
  parseOrder,
  parseDelivery,
} from '@/lib/records';

export const noStore = noStoreHeaders;
export const recordError = (error: string, status: number) =>
  Response.json({ error }, { status, headers: noStore });

export async function authorizeRecords(request: Request) {
  const admin = await getSessionAdmin(request);
  if (!admin) return recordError('Sua sessão expirou. Entre novamente.', 401);
  assertSafeMutation(request);
  return admin;
}

export function recordFailure(error: unknown) {
  const safeFailure = httpFailure(error);
  if (safeFailure) return safeFailure;
  if (error instanceof RecordInputError) return recordError(error.message, 400);
  if (error instanceof SyntaxError) return recordError('Dados inválidos.', 400);
  // Mensagens técnicas servem apenas para classificar a restrição; nunca exponha payloads.
  const message = error instanceof Error ? error.message : '';
  if (message.includes('UNIQUE constraint failed'))
    return recordError(
      'Este número de pedido ou código de rastreio já está cadastrado. Use outro.',
      409,
    );
  if (message.includes('FOREIGN KEY constraint failed'))
    return recordError(
      'Verifique o pedido vinculado. Para excluir um pedido, remova primeiro suas entregas.',
      409,
    );
  console.error('[records] Falha ao acessar os registros.');
  return recordError(
    'Não foi possível salvar ou carregar os dados. Verifique o servidor e tente novamente.',
    503,
  );
}

const orderFields = `id, order_number AS orderNumber, customer, date, total_cents AS totalCents,
  items, status, product_name AS productName, destination, carrier, estimate,
  delivery_generated AS deliveryGenerated,
  EXISTS(SELECT 1 FROM deliveries WHERE order_id = orders.order_number) AS hasDelivery`;
const deliveryFields = `id, COALESCE(tracking_code, '') AS trackingCode, carrier, order_id AS orderId,
  CASE status WHEN 'Preparando' THEN 'Não enviado' WHEN 'Em trânsito' THEN 'A caminho' ELSE status END AS status,
  destination, estimate, shipped_at AS shippedAt, delivered_at AS deliveredAt,
  COALESCE((SELECT product_name FROM orders WHERE order_number = deliveries.order_id), '') AS productName,
  (SELECT customer FROM orders WHERE order_number = deliveries.order_id) AS customer,
  (SELECT items FROM orders WHERE order_number = deliveries.order_id) AS items,
  (SELECT status FROM orders WHERE order_number = deliveries.order_id) AS orderStatus`;

const normalizeOrder = (row: Order) => ({
  ...row,
  deliveryGenerated: Boolean(row.deliveryGenerated),
  hasDelivery: Boolean(row.hasDelivery),
});

async function saveOrder(request: Request) {
  const db = getRawDb();
  const body = recordBody(await readJson(request));
  const id = request.method === 'PUT' ? recordId(body.id) : undefined;
  const current =
    id === undefined
      ? null
      : await db
          .prepare(`SELECT ${orderFields} FROM orders WHERE id = ?`)
          .bind(id)
          .first<Order>();
  if (id !== undefined && !current)
    return recordError('Pedido não encontrado. Atualize a lista.', 404);
  const item = parseOrder(
    body,
    !current?.deliveryGenerated && !current?.hasDelivery,
  );
  const columns = [
    'order_number',
    'customer',
    'date',
    'total_cents',
    'items',
    'status',
    'product_name',
    'destination',
    'carrier',
    'estimate',
  ];
  const values = [
    item.orderNumber,
    item.customer,
    item.date,
    item.totalCents,
    item.items,
    item.status,
    item.productName,
    item.destination,
    item.carrier,
    item.estimate,
  ];
  const write =
    id === undefined
      ? db
          .prepare(
            `INSERT INTO orders (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) RETURNING id`,
          )
          .bind(...values)
      : db
          .prepare(
            `UPDATE orders SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ? RETURNING id`,
          )
          .bind(...values, id);
  // O lote é atômico: a venda só é confirmada se o envio também puder ser gravado.
  // O marcador evita recriar entregas excluídas deliberadamente. NOT EXISTS preserva envios manuais e fracionados.
  const result = await db.batch([
    write,
    db
      .prepare(`INSERT INTO deliveries (order_id, tracking_code, carrier, status, destination, estimate, shipped_at, delivered_at)
      SELECT order_number, NULL, COALESCE(NULLIF(carrier, ''), 'A definir'), 'Não enviado', destination, estimate, '', ''
      FROM orders WHERE order_number = ? AND (? IS NULL OR id = ?) AND status = 'Pago' AND delivery_generated = 0
      AND NOT EXISTS (SELECT 1 FROM deliveries WHERE order_id = orders.order_number)`)
      .bind(item.orderNumber, id ?? null, id ?? null),
    db
      .prepare(`UPDATE orders SET delivery_generated = 1 WHERE order_number = ? AND (? IS NULL OR id = ?) AND status = 'Pago'
      AND EXISTS (SELECT 1 FROM deliveries WHERE order_id = orders.order_number)`)
      .bind(item.orderNumber, id ?? null, id ?? null),
  ]);
  const savedId = (result[0].results[0] as { id: number } | undefined)?.id;
  if (!savedId)
    return recordError('Pedido não encontrado. Atualize a lista.', 404);
  const row = await db
    .prepare(`SELECT ${orderFields} FROM orders WHERE id = ?`)
    .bind(savedId)
    .first<Order>();
  if (!row) return recordError('Pedido não encontrado. Atualize a lista.', 404);
  return Response.json(normalizeOrder(row), {
    status: id === undefined ? 201 : 200,
    headers: noStore,
  });
}

async function saveDelivery(request: Request) {
  const db = getRawDb();
  const body = recordBody(await readJson(request));
  const id = request.method === 'PUT' ? recordId(body.id) : undefined;
  const current =
    id === undefined
      ? null
      : await db
          .prepare(`SELECT ${deliveryFields} FROM deliveries WHERE id = ?`)
          .bind(id)
          .first<Delivery>();
  if (id !== undefined && !current)
    return recordError('Entrega não encontrada. Atualize a lista.', 404);
  const keepLegacyDates = Boolean(
    current &&
    !current.shippedAt &&
    !current.deliveredAt &&
    current.status === normalizeDeliveryStatus(body.status),
  );
  const item = parseDelivery(body, keepLegacyDates);
  if (
    !(await db
      .prepare('SELECT id FROM orders WHERE order_number = ?')
      .bind(item.orderId)
      .first())
  )
    return recordError(
      'Pedido não encontrado. Cadastre ou selecione um pedido existente.',
      400,
    );
  const columns = [
    'tracking_code',
    'carrier',
    'order_id',
    'status',
    'destination',
    'estimate',
    'shipped_at',
    'delivered_at',
  ];
  const values = [
    item.trackingCode || null,
    item.carrier,
    item.orderId,
    item.status,
    item.destination,
    item.estimate,
    item.shippedAt,
    item.deliveredAt,
  ];
  const statement =
    id === undefined
      ? db
          .prepare(
            `INSERT INTO deliveries (${columns.join(', ')}) VALUES (${columns.map(() => '?').join(', ')}) RETURNING id`,
          )
          .bind(...values)
      : db
          .prepare(
            `UPDATE deliveries SET ${columns.map((column) => `${column} = ?`).join(', ')} WHERE id = ? RETURNING id`,
          )
          .bind(...values, id);
  const results = await db.batch([
    db
      .prepare(
        'UPDATE orders SET delivery_generated = 1 WHERE order_number = (SELECT order_id FROM deliveries WHERE id = ?)',
      )
      .bind(id ?? null),
    statement,
    db
      .prepare(
        'UPDATE orders SET delivery_generated = 1 WHERE order_number = ? AND EXISTS (SELECT 1 FROM deliveries WHERE order_id = orders.order_number)',
      )
      .bind(item.orderId),
  ]);
  const written = results[1].results[0] as { id: number } | undefined;
  if (!written)
    return recordError('Entrega não encontrada. Atualize a lista.', 404);
  const row = await db
    .prepare(`SELECT ${deliveryFields} FROM deliveries WHERE id = ?`)
    .bind(written.id)
    .first<Delivery>();
  return Response.json(row, {
    status: id === undefined ? 201 : 200,
    headers: noStore,
  });
}

export async function handleRecords(
  request: Request,
  kind: 'orders' | 'deliveries',
) {
  try {
    const auth = await authorizeRecords(request);
    if (auth instanceof Response) return auth;
    const db = getRawDb();
    if (request.method === 'GET') {
      if (kind === 'orders') {
        const { results } = await db
          .prepare(`SELECT ${orderFields} FROM orders ORDER BY id DESC`)
          .all<Order>();
        return Response.json(results.map(normalizeOrder), { headers: noStore });
      }
      const { results } = await db
        .prepare(`SELECT ${deliveryFields} FROM deliveries ORDER BY id DESC`)
        .all<Delivery>();
      return Response.json(results, { headers: noStore });
    }
    if (request.method === 'DELETE') {
      const id = recordId(Number(new URL(request.url).searchParams.get('id')));
      if (kind === 'orders') {
        const linked = await db
          .prepare(
            'SELECT d.id FROM deliveries d JOIN orders o ON d.order_id = o.order_number WHERE o.id = ? LIMIT 1',
          )
          .bind(id)
          .first();
        if (linked)
          return recordError(
            'Este pedido tem entregas vinculadas. Exclua ou transfira essas entregas antes de excluir o pedido.',
            409,
          );
      }
      const deletion = db
        .prepare(`DELETE FROM ${kind} WHERE id = ? RETURNING id`)
        .bind(id);
      const row =
        kind === 'deliveries'
          ? (
              await db.batch([
                db
                  .prepare(
                    'UPDATE orders SET delivery_generated = 1 WHERE order_number = (SELECT order_id FROM deliveries WHERE id = ?)',
                  )
                  .bind(id),
                deletion,
              ])
            )[1].results[0]
          : await deletion.first();
      return row
        ? new Response(null, { status: 204, headers: noStore })
        : recordError('Registro não encontrado. Atualize a lista.', 404);
    }
    return await (kind === 'orders'
      ? saveOrder(request)
      : saveDelivery(request));
  } catch (error) {
    const safeFailure = httpFailure(error);
    if (safeFailure) return safeFailure;
    return recordFailure(error);
  }
}
