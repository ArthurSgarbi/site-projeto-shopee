import type { Delivery, DeliveryStatus } from '../components/dashboard/types';

const DAY_MS = 86_400_000;

export function shippingToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function normalizeDeliveryStatus(value: unknown): DeliveryStatus | null {
  if (value === 'Preparando' || value === 'Não enviado') return 'Não enviado';
  if (value === 'Em trânsito' || value === 'A caminho') return 'A caminho';
  return value === 'Entregue' ? 'Entregue' : null;
}

export function daysBetween(start: string, end: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end))
    return null;
  const first = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  if (
    !Number.isFinite(first.getTime()) ||
    !Number.isFinite(last.getTime()) ||
    first.toISOString().slice(0, 10) !== start ||
    last.toISOString().slice(0, 10) !== end
  )
    return null;
  return (last.getTime() - first.getTime()) / DAY_MS;
}

const normalizeDestination = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');

export function averageDeliveryDays(
  deliveries: Delivery[],
  destination?: string,
  today = shippingToday(),
) {
  const samples = deliveries
    .filter(
      (item) =>
        item.status === 'Entregue' &&
        item.orderStatus !== 'Cancelado' &&
        (!destination ||
          normalizeDestination(item.destination) ===
            normalizeDestination(destination)) &&
        item.deliveredAt <= today,
    )
    .map((item) => daysBetween(item.shippedAt, item.deliveredAt))
    .filter((days): days is number => days !== null && days >= 0);
  return {
    count: samples.length,
    days: samples.length
      ? samples.reduce((sum, days) => sum + days, 0) / samples.length
      : null,
  };
}

export function formatDays(days: number) {
  return `${days.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${days === 1 ? 'dia' : 'dias'} corridos`;
}

export function arrivalLabel(delivery: Delivery, today = shippingToday()) {
  if (delivery.status === 'Entregue') {
    const duration = daysBetween(delivery.shippedAt, delivery.deliveredAt);
    return duration === null
      ? 'Preencha as datas de envio e entrega para calcular a duração.'
      : duration === 0
        ? 'Entregue no mesmo dia do envio.'
        : `Chegou em ${formatDays(duration)} após o envio.`;
  }
  const remaining = daysBetween(today, delivery.estimate);
  if (remaining === null) return 'Previsão não informada.';
  if (remaining < 0)
    return `Previsão vencida há ${formatDays(-remaining)}. Revise o envio.`;
  return remaining === 0
    ? 'Chegada prevista para hoje.'
    : `Previsão: faltam ${formatDays(remaining)} para chegar.`;
}
