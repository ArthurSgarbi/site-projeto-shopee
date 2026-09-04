import assert from 'node:assert/strict';
import { averageDeliveryDays } from '../lib/delivery-timing.ts';
import { insertAuthenticatedSession } from './auth-fixtures.mjs';

export async function verifySalesFlow(runtime, db) {
  const token = await insertAuthenticatedSession(db);
  const headers = {
    Cookie: `sync_mobile_session=${token}`,
    'Content-Type': 'application/json',
    Origin: 'http://localhost',
  };
  async function call(endpoint, method = 'GET', body, expected = 200) {
    const response = await runtime.dispatchFetch(
      `http://localhost/api/${endpoint}`,
      {
        method,
        headers,
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    const data = response.status === 204 ? null : await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${endpoint}: ${JSON.stringify(data)}`,
    );
    return data;
  }
  const draft = {
    orderNumber: '#SALE-1',
    customer: 'Cliente de teste',
    date: '2026-08-01',
    totalCents: 4500,
    items: 3,
    status: 'Pago',
    productName: 'Cabo USB-C',
    destination: 'Rua A, 10, São Paulo, SP, 01000-000',
    carrier: '',
    estimate: '2026-08-06',
  };
  const count = async (table) =>
    (await db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).first()).count;
  await call('orders', 'POST', { ...draft, destination: '' }, 400);
  assert.equal(await count('orders'), 0);
  // Falha induzida somente no banco descartável para provar rollback do lote.
  await db
    .prepare(
      "CREATE TRIGGER fail_test_shipment BEFORE INSERT ON deliveries WHEN NEW.order_id = '#ROLLBACK' BEGIN SELECT RAISE(ABORT, 'test rollback'); END",
    )
    .run();
  await call('orders', 'POST', { ...draft, orderNumber: '#ROLLBACK' }, 503);
  assert.equal(await count('orders'), 0, 'falha do envio também desfaz pedido');
  await db.prepare('DROP TRIGGER fail_test_shipment').run();
  const sale = await call('orders', 'POST', draft, 201);
  assert.equal(sale.hasDelivery, true);
  assert.equal(sale.deliveryGenerated, true);
  let shipments = await call('deliveries');
  assert.equal(shipments.length, 1);
  assert.equal(shipments[0].productName, draft.productName);
  assert.equal(shipments[0].customer, draft.customer);
  assert.equal(shipments[0].destination, draft.destination);
  assert.equal(shipments[0].status, 'Não enviado');
  assert.equal(shipments[0].carrier, 'A definir');
  await Promise.all([call('orders', 'PUT', sale), call('orders', 'PUT', sale)]);
  assert.equal(
    await count('deliveries'),
    1,
    'duas confirmações não duplicam envio',
  );
  await call('orders', 'POST', draft, 409);
  assert.equal(await count('deliveries'), 1);
  const moving = await call('deliveries', 'PUT', {
    ...shipments[0],
    status: 'A caminho',
    shippedAt: '2026-08-02',
  });
  await call(
    'deliveries',
    'PUT',
    { ...moving, status: 'Entregue', deliveredAt: '2026-08-01' },
    400,
  );
  const arrived = await call('deliveries', 'PUT', {
    ...moving,
    status: 'Entregue',
    deliveredAt: '2026-08-05',
  });
  assert.deepEqual(
    averageDeliveryDays([arrived], draft.destination, '2026-09-04'),
    { count: 1, days: 3 },
  );
  await call('orders', 'PUT', {
    ...sale,
    customer: 'Cliente alterado',
    date: '2026-08-09',
  });
  assert.equal(
    (await call('deliveries'))[0].status,
    'Entregue',
    'editar venda preserva histórico do envio',
  );
  await call('orders', 'PUT', { ...sale, status: 'Cancelado' });
  assert.equal((await call('deliveries'))[0].orderStatus, 'Cancelado');
  assert.equal(averageDeliveryDays(await call('deliveries')).count, 0);
  await call(`deliveries?id=${arrived.id}`, 'DELETE', undefined, 204);
  await call('orders', 'PUT', sale);
  assert.equal(
    await count('deliveries'),
    0,
    'exclusão consciente não é revertida',
  );

  const pending = await call(
    'orders',
    'POST',
    { ...draft, orderNumber: '#PENDING', status: 'Pendente' },
    201,
  );
  await Promise.all([
    call('orders', 'PUT', { ...pending, status: 'Pago' }),
    call('orders', 'PUT', { ...pending, status: 'Pago' }),
  ]);
  assert.equal(
    await count('deliveries'),
    1,
    'transição simultânea cria um único envio',
  );

  // Legado sem campos novos, como um banco anterior à migração.
  await db
    .prepare(
      "INSERT INTO orders (order_number, customer, date, total_cents, items, status) VALUES ('#LEGACY', 'Legado', '2026-08-01', 1000, 1, 'Pago')",
    )
    .run();
  await db
    .prepare(
      "INSERT INTO deliveries (order_id, carrier, status, destination, estimate) VALUES ('#LEGACY', 'Correios', 'Em trânsito', 'Rua Legada', '2026-08-08')",
    )
    .run();
  let legacy = (await call('deliveries')).find(
    (item) => item.orderId === '#LEGACY',
  );
  assert.equal(legacy.status, 'A caminho');
  assert.equal(legacy.shippedAt, '');
  legacy = await call('deliveries', 'PUT', {
    ...legacy,
    trackingCode: 'LEGACY-TRACK',
  });
  assert.equal(legacy.shippedAt, '', 'não inventa data de envio antiga');
  await call(`deliveries?id=${legacy.id}`, 'DELETE', undefined, 204);
  const legacyOrder = (await call('orders')).find(
    (item) => item.orderNumber === '#LEGACY',
  );
  await call('orders', 'PUT', legacyOrder);
  assert.equal(
    (await call('deliveries')).filter((item) => item.orderId === '#LEGACY')
      .length,
    0,
  );

  const manualOrder = await call(
    'orders',
    'POST',
    { ...draft, orderNumber: '#MANUAL', status: 'Pendente' },
    201,
  );
  const manual = await call(
    'deliveries',
    'POST',
    {
      ...moving,
      id: undefined,
      trackingCode: '',
      orderId: manualOrder.orderNumber,
    },
    201,
  );
  await call('orders', 'PUT', { ...manualOrder, status: 'Pago' });
  assert.equal(
    (await call('deliveries')).filter((item) => item.orderId === '#MANUAL')
      .length,
    1,
  );
  await call(`deliveries?id=${manual.id}`, 'DELETE', undefined, 204);
  await call('orders', 'PUT', { ...manualOrder, status: 'Pago' });
  assert.equal(
    (await call('deliveries')).filter((item) => item.orderId === '#MANUAL')
      .length,
    0,
  );
  // Exclusão direta de legado, sem passar antes por uma edição que marcaria o pedido.
  await db
    .prepare(
      "INSERT INTO orders (order_number, customer, date, total_cents, items, status) VALUES ('#DIRECT-LEGACY', 'Legado direto', '2026-08-01', 1000, 1, 'Pago')",
    )
    .run();
  const direct = await db
    .prepare(
      "INSERT INTO deliveries (order_id, carrier, status, destination, estimate) VALUES ('#DIRECT-LEGACY', 'Correios', 'Preparando', 'Rua Antiga', '2026-08-08') RETURNING id",
    )
    .first();
  await call(`deliveries?id=${direct.id}`, 'DELETE', undefined, 204);
  const directOrder = (await call('orders')).find(
    (item) => item.orderNumber === '#DIRECT-LEGACY',
  );
  assert.equal(directOrder.deliveryGenerated, true);
  await call('orders', 'PUT', directOrder);
  assert.equal(
    (await call('deliveries')).filter(
      (item) => item.orderId === '#DIRECT-LEGACY',
    ).length,
    0,
  );

  // Transferir uma entrega não deve tornar a origem elegível a gerar outra sozinha.
  const transferSource = await call(
    'orders',
    'POST',
    { ...draft, orderNumber: '#TRANSFER-1', status: 'Pendente' },
    201,
  );
  const transferTarget = await call(
    'orders',
    'POST',
    { ...draft, orderNumber: '#TRANSFER-2', status: 'Pendente' },
    201,
  );
  const transfer = await call(
    'deliveries',
    'POST',
    { ...moving, trackingCode: '', orderId: transferSource.orderNumber },
    201,
  );
  await call('deliveries', 'PUT', {
    ...transfer,
    orderId: transferTarget.orderNumber,
  });
  await call('orders', 'PUT', { ...transferSource, status: 'Pago' });
  await call('orders', 'PUT', { ...transferTarget, status: 'Pago' });
  assert.equal(
    (await call('deliveries')).filter((item) => item.orderId === '#TRANSFER-1')
      .length,
    0,
  );
  assert.equal(
    (await call('deliveries')).filter((item) => item.orderId === '#TRANSFER-2')
      .length,
    1,
  );
  shipments = await call('deliveries');
  for (const shipment of shipments)
    await call(`deliveries?id=${shipment.id}`, 'DELETE', undefined, 204);
  for (const order of await call('orders'))
    await call(`orders?id=${order.id}`, 'DELETE', undefined, 204);
  console.log(
    'Fluxo de venda aprovado: envio automático, atomicidade, concorrência, status, média real, compatibilidade legada e exclusões preservadas.',
  );
}
