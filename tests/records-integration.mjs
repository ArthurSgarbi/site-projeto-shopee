import assert from 'node:assert/strict';
import { insertAuthenticatedSession } from './auth-fixtures.mjs';

export async function verifyRecords(runtime, db) {
  for (const endpoint of ['orders', 'deliveries', 'preferences']) {
    for (const method of endpoint === 'preferences'
      ? ['GET', 'PUT']
      : ['GET', 'POST', 'PUT', 'DELETE']) {
      const response = await runtime.dispatchFetch(
        `http://localhost/api/${endpoint}`,
        { method },
      );
      assert.equal(response.status, 401, `${endpoint} ${method} exige sessão`);
      await response.text();
    }
  }
  const token = await insertAuthenticatedSession(db);
  const headers = {
    Cookie: `sync_mobile_session=${token}`,
    'Content-Type': 'application/json',
    Origin: 'http://localhost',
  };
  async function call(
    endpoint,
    method = 'GET',
    body,
    expected = 200,
    extra = {},
  ) {
    const response = await runtime.dispatchFetch(
      `http://localhost/api/${endpoint}`,
      {
        method,
        headers: { ...headers, ...extra },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    const data = response.status === 204 ? null : await response.json();
    assert.equal(
      response.status,
      expected,
      `${method} ${endpoint}: ${JSON.stringify(data)}`,
    );
    assert.match(response.headers.get('Cache-Control') ?? '', /no-store/);
    return data;
  }
  for (const endpoint of ['orders', 'deliveries', 'preferences'])
    await call(endpoint, 'PUT', {}, 403, {
      Origin: 'https://untrusted.example',
    });
  assert.deepEqual(await call('orders'), []);
  assert.deepEqual(await call('deliveries'), []);
  const order = {
    orderNumber: '#TEST-001',
    customer: 'Cliente',
    date: '2026-09-04',
    totalCents: 4990,
    items: 1,
    status: 'Pendente',
  };
  await call('orders', 'POST', { ...order, date: '2026-02-30' }, 400);
  await call('orders', 'POST', { ...order, status: ['Pago'] }, 400);
  const saved = await call('orders', 'POST', order, 201);
  await call('orders', 'POST', order, 409);
  const delivery = {
    orderId: order.orderNumber,
    trackingCode: 'TRACK-123',
    carrier: 'Correios',
    destination: 'Rua Teste, 10, SP',
    estimate: '2026-09-09',
    status: 'Preparando',
  };
  await call(
    'deliveries',
    'POST',
    { ...delivery, orderId: '#INEXISTENTE' },
    400,
  );
  const shipment = await call('deliveries', 'POST', delivery, 201);
  await call('deliveries', 'POST', delivery, 409);
  await call(`orders?id=${saved.id}`, 'DELETE', undefined, 409);
  const renamed = {
    ...saved,
    orderNumber: '#TEST-EDITADO',
    customer: 'Cliente atualizado',
    status: 'Pago',
    totalCents: 5990,
    items: 3,
    date: '2026-09-03',
    deliveryGenerated: true,
    hasDelivery: true,
  };
  assert.deepEqual(await call('orders', 'PUT', renamed), renamed);
  assert.equal(
    (await call('deliveries'))[0].orderId,
    renamed.orderNumber,
    'referência acompanha mudança de código',
  );
  const revised = {
    ...shipment,
    orderId: renamed.orderNumber,
    trackingCode: 'TRACK-ALTERADO',
    carrier: 'Loggi',
    status: 'A caminho',
    shippedAt: '2026-09-03',
    customer: renamed.customer,
    items: renamed.items,
    orderStatus: 'Pago',
    destination: 'Outro endereço',
    estimate: '2026-09-10',
  };
  assert.deepEqual(await call('deliveries', 'PUT', revised), revised);
  // Mais de uma entrega pode aguardar um código de rastreio.
  const pending1 = await call(
    'deliveries',
    'POST',
    { ...revised, trackingCode: '' },
    201,
  );
  const pending2 = await call(
    'deliveries',
    'POST',
    { ...revised, trackingCode: undefined },
    201,
  );
  assert.equal(pending1.trackingCode, '');
  for (const id of [shipment.id, pending1.id, pending2.id])
    await call(`deliveries?id=${id}`, 'DELETE', undefined, 204);
  assert.equal(
    (await call('orders')).length,
    1,
    'excluir entrega preserva pedido',
  );
  await call(`orders?id=${saved.id}`, 'DELETE', undefined, 204);
  await call(`orders?id=${saved.id}`, 'DELETE', undefined, 404);
  await call('orders', 'PUT', renamed, 404);
  await call('deliveries', 'PUT', { ...revised, id: 99999 }, 404);
  await call('orders?id=0', 'DELETE', undefined, 400);
  const defaults = (await call('preferences')).sidebarOrder;
  const custom = [...defaults].reverse();
  await call('preferences', 'PUT', { sidebarOrder: custom });
  assert.deepEqual((await call('preferences')).sidebarOrder, custom);
  await call('preferences', 'PUT', { sidebarOrder: ['orders', 'orders'] }, 400);
  assert.deepEqual((await call('preferences')).sidebarOrder, custom);
  // Preferências pertencem ao administrador autenticado, não ao ID enviado no corpo.
  const second = await db
    .prepare(
      "INSERT INTO admins (email, password_hash, role, created_at) VALUES ('another@example.com', 'test-only', 'owner', ?) RETURNING id",
    )
    .bind(Date.now())
    .first();
  const token2 = await insertAuthenticatedSession(db, second.id);
  const otherHeaders = { Cookie: `sync_mobile_session=${token2}` };
  assert.deepEqual(
    (await call('preferences', 'GET', undefined, 200, otherHeaders))
      .sidebarOrder,
    defaults,
  );
  await call(
    'preferences',
    'PUT',
    { sidebarOrder: defaults, adminId: 1 },
    200,
    otherHeaders,
  );
  assert.deepEqual((await call('preferences')).sidebarOrder, custom);
  assert.deepEqual(await call('orders'), []);
  assert.deepEqual(await call('deliveries'), []);
  console.log(
    'Pedidos, entregas e sidebar aprovados: CRUD, autenticação, validação, vínculo protegido e preferências isoladas por conta.',
  );
}
