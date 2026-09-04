import type { DeliveryDraft, OrderDraft } from '../components/dashboard/types';
import { normalizeDeliveryStatus, shippingToday } from './delivery-timing.ts';

export class RecordInputError extends Error {
  override name = 'RecordInputError';
}

export function recordBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new RecordInputError(
      'Dados inválidos. Preencha o formulário novamente.',
    );
  return value as Record<string, unknown>;
}

export function recordId(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1)
    throw new RecordInputError('Identificador inválido. Atualize a lista.');
  return value;
}

function textField(
  body: Record<string, unknown>,
  key: string,
  label: string,
  max: number,
  optional = false,
) {
  const value = body[key];
  if (optional && (value === undefined || value === null)) return '';
  if (
    typeof value !== 'string' ||
    (!optional && !value.trim()) ||
    value.trim().length > max
  )
    throw new RecordInputError(
      `${label}: informe ${optional ? 'até' : 'de 1 a'} ${max} caracteres.`,
    );
  return value.trim();
}

function dateField(body: Record<string, unknown>, key: string, label: string) {
  const value = textField(body, key, label, 10);
  const date = new Date(`${value}T12:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    value < '1900-01-01' ||
    value > '9999-12-31' ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw new RecordInputError(`${label}: informe uma data válida.`);
  return value;
}

function integerField(
  body: Record<string, unknown>,
  key: string,
  label: string,
  min: number,
  max: number,
) {
  const value = body[key];
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new RecordInputError(
      `${label}: informe um valor válido entre ${min} e ${max}.`,
    );
  return value;
}

export function parseOrder(value: unknown, requireShipping = true): OrderDraft {
  const body = recordBody(value);
  if (
    typeof body.status !== 'string' ||
    !['Pendente', 'Pago', 'Cancelado'].includes(body.status)
  )
    throw new RecordInputError('Selecione um status de pedido válido.');
  const paidNeedsDelivery = body.status === 'Pago' && requireShipping;
  const estimate = textField(
    body,
    'estimate',
    'Previsão de entrega',
    10,
    !paidNeedsDelivery,
  );
  const date = dateField(body, 'date', 'Data do pedido');
  if (estimate) dateField(body, 'estimate', 'Previsão de entrega');
  if (requireShipping && estimate && estimate < date)
    throw new RecordInputError(
      'A previsão de entrega não pode ser anterior à data do pedido.',
    );
  return {
    orderNumber: textField(body, 'orderNumber', 'Número do pedido', 60),
    customer: textField(body, 'customer', 'Cliente', 150),
    date,
    productName: textField(
      body,
      'productName',
      'Produto vendido',
      500,
      !paidNeedsDelivery,
    ),
    destination: textField(
      body,
      'destination',
      'Endereço de destino',
      500,
      !paidNeedsDelivery,
    ),
    carrier: textField(body, 'carrier', 'Transportadora', 100, true),
    estimate,
    totalCents: integerField(
      body,
      'totalCents',
      'Valor em centavos',
      0,
      100_000_000_000,
    ),
    items: integerField(body, 'items', 'Quantidade de itens', 1, 1_000_000),
    status: body.status as OrderDraft['status'],
  };
}

export function parseDelivery(
  value: unknown,
  allowLegacyDates = false,
): DeliveryDraft {
  const body = recordBody(value);
  const status = normalizeDeliveryStatus(body.status);
  if (!status)
    throw new RecordInputError('Selecione um status de entrega válido.');
  const shippedAt = textField(body, 'shippedAt', 'Data de envio', 10, true);
  const deliveredAt = textField(
    body,
    'deliveredAt',
    'Data de entrega',
    10,
    true,
  );
  if (shippedAt) dateField(body, 'shippedAt', 'Data de envio');
  if (deliveredAt) dateField(body, 'deliveredAt', 'Data de entrega');
  const today = shippingToday();
  if (shippedAt > today || deliveredAt > today)
    throw new RecordInputError(
      'Datas reais de envio e entrega não podem estar no futuro.',
    );
  if (deliveredAt && (!shippedAt || deliveredAt < shippedAt))
    throw new RecordInputError(
      'A data de entrega deve ser igual ou posterior à data de envio.',
    );
  if (status === 'Não enviado' && (shippedAt || deliveredAt))
    throw new RecordInputError(
      'Um envio não enviado deve ficar sem datas reais de envio e entrega.',
    );
  if (status === 'A caminho' && deliveredAt)
    throw new RecordInputError(
      'Marque como Entregue para registrar a data de entrega.',
    );
  const legacyWithoutDates = allowLegacyDates && !shippedAt && !deliveredAt;
  if (!legacyWithoutDates && status !== 'Não enviado' && !shippedAt)
    throw new RecordInputError('Informe a data real de envio.');
  if (!legacyWithoutDates && status === 'Entregue' && !deliveredAt)
    throw new RecordInputError('Informe a data real de entrega.');
  return {
    trackingCode: textField(
      body,
      'trackingCode',
      'Código de rastreio',
      100,
      true,
    ),
    carrier: textField(body, 'carrier', 'Transportadora', 100),
    orderId: textField(body, 'orderId', 'Pedido', 60),
    status,
    shippedAt,
    deliveredAt,
    destination: textField(body, 'destination', 'Endereço de destino', 500),
    estimate: dateField(body, 'estimate', 'Previsão de entrega'),
  };
}
