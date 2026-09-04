import assert from 'node:assert/strict';
import test from 'node:test';
import {
  parseOrder,
  parseDelivery,
  recordBody,
  recordId,
} from '../lib/records.ts';
import {
  DEFAULT_SIDEBAR_ORDER,
  isSidebarOrder,
  moveSection,
} from '../lib/navigation.ts';
import { recordsRequest } from '../lib/records-client.ts';

const order = {
  orderNumber: '#SM-001',
  customer: 'Maria',
  date: '2026-09-04',
  totalCents: 4290,
  items: 2,
  status: 'Pago',
  productName: 'Cabo USB',
  destination: 'Rua Um, 12, SP',
  carrier: '',
  estimate: '2026-09-08',
};
const delivery = {
  orderId: '#SM-001',
  trackingCode: '',
  carrier: 'Correios',
  destination: 'Rua Um, 12, SP, 01000-000',
  estimate: '2026-09-08',
  status: 'Não enviado',
  shippedAt: '',
  deliveredAt: '',
};

await test('pedido normaliza texto e mantém centavos sem aceitar campos extras', () => {
  assert.deepEqual(
    parseOrder({ ...order, customer: ' Maria ', ignored: true }),
    order,
  );
  assert.equal(parseOrder({ ...order, totalCents: 0 }).totalCents, 0);
});
await test('pedido rejeita status, campos vazios, números e datas inválidas', () => {
  for (const patch of [
    { orderNumber: '' },
    { customer: ' ' },
    { status: 'Enviado' },
    { status: ['Pago'] },
    { items: 0 },
    { items: 1.5 },
    { items: '2' },
    { totalCents: -1 },
    { totalCents: null },
    { totalCents: 4.2 },
    { date: '2026-02-30' },
    { date: '04/09/2026' },
    { date: '2025-02-29' },
  ])
    assert.throws(() => parseOrder({ ...order, ...patch }));
  assert.equal(parseOrder({ ...order, date: '2024-02-29' }).date, '2024-02-29');
});
await test('entrega permite rastreio pendente e valida pedido, destino e previsão', () => {
  assert.deepEqual(parseDelivery(delivery), delivery);
  assert.equal(
    parseDelivery({ ...delivery, trackingCode: undefined }).trackingCode,
    '',
  );
  for (const patch of [
    { orderId: '' },
    { carrier: '' },
    { destination: '' },
    { estimate: '2026-09-31' },
    { status: 'Pago' },
    { status: ['Entregue'] },
  ])
    assert.throws(() => parseDelivery({ ...delivery, ...patch }));
});
await test('identificadores e payloads inválidos são rejeitados', () => {
  for (const value of [null, [], 'abc']) assert.throws(() => recordBody(value));
  for (const value of [null, '1', 0, -2, 1.5])
    assert.throws(() => recordId(value));
  assert.equal(recordId(3), 3);
});
await test('sidebar aceita qualquer permutação completa e rejeita abas ausentes ou repetidas', () => {
  assert.equal(isSidebarOrder([...DEFAULT_SIDEBAR_ORDER].reverse()), true);
  for (const value of [
    null,
    [],
    DEFAULT_SIDEBAR_ORDER.slice(1),
    [...DEFAULT_SIDEBAR_ORDER, 'orders'],
    DEFAULT_SIDEBAR_ORDER.map(() => 'orders'),
    DEFAULT_SIDEBAR_ORDER.map((item) => (item === 'orders' ? 'invalid' : item)),
  ])
    assert.equal(isSidebarOrder(value), false);
});
await test('mover abas preserva identidades, limites e array original', () => {
  const before = [...DEFAULT_SIDEBAR_ORDER];
  const moved = moveSection(before, 'orders', -1);
  assert.equal(moved[1], 'orders');
  assert.deepEqual(before, DEFAULT_SIDEBAR_ORDER);
  assert.deepEqual(moveSection(before, 'overview', -1), before);
  assert.deepEqual(moveSection(before, 'settings', 1), before);
  assert.deepEqual(moveSection(moved, 'orders', 1), before);
});
await test('cliente não confirma um salvamento com falha ou sessão expirada', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Sua sessão expirou.' }, { status: 401 }),
  );
  await assert.rejects(
    recordsRequest('/api/orders', { method: 'POST', body: '{}' }),
    /sessão expirou/,
  );
  mock.mock.mockImplementation(async () => {
    throw new Error('offline');
  });
  await assert.rejects(
    recordsRequest('/api/deliveries', { method: 'PUT', body: '{}' }),
    /servidor não respondeu/,
  );
});
await test('cliente só conclui exclusão após resposta de sucesso', async (t) => {
  const mock = t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Pedido vinculado.' }, { status: 409 }),
  );
  await assert.rejects(
    recordsRequest('/api/orders?id=1', { method: 'DELETE' }),
    /vinculado/,
  );
  mock.mock.mockImplementation(async () => new Response(null, { status: 204 }));
  assert.equal(
    await recordsRequest('/api/orders?id=1', { method: 'DELETE' }),
    undefined,
  );
});
