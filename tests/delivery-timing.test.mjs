import assert from 'node:assert/strict';
import test from 'node:test';
import {
  averageDeliveryDays,
  daysBetween,
  arrivalLabel,
  shippingToday,
  normalizeDeliveryStatus,
} from '../lib/delivery-timing.ts';
import { parseOrder, parseDelivery } from '../lib/records.ts';

const order = {
  orderNumber: '#V-1',
  customer: 'Cliente',
  date: '2026-08-01',
  totalCents: 2000,
  items: 1,
  status: 'Pago',
  productName: 'Cabo USB',
  destination: 'Rua A, 10, SP',
  carrier: '',
  estimate: '2026-08-05',
};
const delivery = {
  id: 1,
  trackingCode: '',
  carrier: 'Correios',
  orderId: '#V-1',
  status: 'Entregue',
  destination: order.destination,
  estimate: order.estimate,
  shippedAt: '2026-08-01',
  deliveredAt: '2026-08-04',
  productName: 'Cabo USB',
  customer: 'Cliente',
  items: 1,
  orderStatus: 'Pago',
};

await test('venda exige produto, destino e previsão; pendente não inventa logística', () => {
  for (const patch of [
    { productName: '' },
    { destination: '' },
    { estimate: '' },
    { estimate: '2026-07-31' },
  ])
    assert.throws(() => parseOrder({ ...order, ...patch }));
  assert.equal(
    parseOrder({
      ...order,
      productName: '',
      destination: '',
      estimate: '',
      status: 'Pendente',
    }).destination,
    '',
  );
  assert.equal(
    parseOrder({ ...order, destination: '', estimate: '' }, false).destination,
    '',
  );
});
await test('etapas novas e legadas usam os mesmos três estados', () => {
  assert.equal(normalizeDeliveryStatus('Preparando'), 'Não enviado');
  assert.equal(normalizeDeliveryStatus('Em trânsito'), 'A caminho');
  assert.equal(normalizeDeliveryStatus(['Entregue']), null);
  assert.equal(
    parseDelivery({
      ...delivery,
      status: 'Preparando',
      shippedAt: '',
      deliveredAt: '',
    }).status,
    'Não enviado',
  );
});
await test('datas reais são coerentes com o status e nunca futuras', () => {
  assert.equal(parseDelivery(delivery).deliveredAt, '2026-08-04');
  for (const patch of [
    { shippedAt: '' },
    { deliveredAt: '' },
    { deliveredAt: '2026-07-31' },
    { deliveredAt: '9999-12-31' },
    { status: 'Não enviado' },
    { status: 'A caminho' },
  ])
    assert.throws(() => parseDelivery({ ...delivery, ...patch }));
  assert.equal(
    parseDelivery({ ...delivery, shippedAt: '', deliveredAt: '' }, true)
      .deliveredAt,
    '',
  );
});
await test('média usa datas reais e exclui envios incompletos, cancelados, futuros ou inválidos', () => {
  const rows = [
    delivery,
    { ...delivery, id: 2, deliveredAt: '2026-08-06' },
    { ...delivery, id: 3, shippedAt: '' },
    { ...delivery, id: 4, orderStatus: 'Cancelado' },
    { ...delivery, id: 5, status: 'A caminho' },
    { ...delivery, id: 6, shippedAt: '2026-08-10' },
    { ...delivery, id: 7, deliveredAt: '9999-12-31' },
  ];
  assert.deepEqual(averageDeliveryDays(rows, undefined, '2026-09-04'), {
    count: 2,
    days: 4,
  });
  assert.deepEqual(averageDeliveryDays([]), { count: 0, days: null });
});
await test('média por destino não mistura endereços e admite entrega no mesmo dia', () => {
  const rows = [
    delivery,
    {
      ...delivery,
      id: 2,
      destination: '  RUA A, 10, SP ',
      deliveredAt: delivery.shippedAt,
    },
    { ...delivery, id: 3, destination: 'Rua B' },
  ];
  assert.deepEqual(averageDeliveryDays(rows, order.destination, '2026-09-04'), {
    count: 2,
    days: 1.5,
  });
  assert.deepEqual(averageDeliveryDays(rows, 'Outro endereço'), {
    count: 0,
    days: null,
  });
});
await test('contagem de dias ignora horário de verão e informa previsão vencida', () => {
  assert.equal(daysBetween('2024-02-28', '2024-03-01'), 2);
  assert.equal(daysBetween('2026-02-30', '2026-03-01'), null);
  assert.equal(shippingToday(new Date('2026-09-04T01:00:00Z')), '2026-09-03');
  assert.match(
    arrivalLabel({ ...delivery, status: 'Não enviado' }, '2026-08-03'),
    /faltam 2 dias/,
  );
  assert.match(
    arrivalLabel({ ...delivery, status: 'A caminho' }, '2026-08-06'),
    /vencida há 1 dia/,
  );
  assert.match(arrivalLabel(delivery), /Chegou em 3 dias/);
});
