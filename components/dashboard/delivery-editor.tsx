'use client';

import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { parseDelivery } from '@/lib/records';
import { shippingToday } from '@/lib/delivery-timing';
import { useRecords } from '@/hooks/use-records';
import type { Delivery, DeliveryDraft, Order } from './types';
import { recordDialogClass, RecordsState, todayDate } from './record-controls';

export function DeliveryEditor({
  delivery,
  busy,
  error,
  onClose,
  onSave,
}: {
  delivery: Delivery | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (values: DeliveryDraft, id?: number) => Promise<boolean>;
}) {
  const orders = useRecords<Order>('/api/orders');
  const [orderId, setOrderId] = useState(delivery?.orderId ?? '');
  const [status, setStatus] = useState<Delivery['status']>(
    delivery?.status ?? 'Não enviado',
  );
  const [shippedAt, setShippedAt] = useState(delivery?.shippedAt ?? '');
  const [deliveredAt, setDeliveredAt] = useState(delivery?.deliveredAt ?? '');
  const legacyWithoutDates = Boolean(
    delivery &&
    delivery.status === status &&
    !delivery.shippedAt &&
    !delivery.deliveredAt &&
    !shippedAt &&
    !deliveredAt,
  );
  const [validation, setValidation] = useState('');
  const unavailable =
    orders.loading || Boolean(orders.loadError) || orders.rows.length === 0;
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || unavailable) return;
    const form = new FormData(event.currentTarget);
    let values: DeliveryDraft;
    try {
      values = parseDelivery(
        {
          trackingCode: form.get('trackingCode'),
          carrier: form.get('carrier'),
          orderId,
          status,
          destination: form.get('destination'),
          estimate: form.get('estimate'),
          shippedAt,
          deliveredAt,
        },
        legacyWithoutDates,
      );
    } catch (error) {
      setValidation(
        error instanceof Error ? error.message : 'Revise os campos.',
      );
      return;
    }
    setValidation('');
    if (await onSave(values, delivery?.id)) onClose();
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy} className={recordDialogClass}>
        <DialogHeader>
          <DialogTitle>
            {delivery ? 'Editar entrega' : 'Nova entrega'}
          </DialogTitle>
          <DialogDescription>
            Vincule o envio a um pedido cadastrado. O acompanhamento é manual:
            não envia solicitações à transportadora.
          </DialogDescription>
        </DialogHeader>
        <RecordsState
          loading={orders.loading}
          error={orders.loadError}
          empty={orders.rows.length === 0}
          onRetry={orders.retry}
        >
          Cadastre primeiro um pedido na aba Pedidos para adicionar sua entrega.
        </RecordsState>
        <form onSubmit={submit} className="space-y-4">
          <fieldset
            disabled={busy || unavailable}
            className="grid gap-4 sm:grid-cols-2"
          >
            <div className="space-y-1 text-sm font-medium sm:col-span-2">
              <label htmlFor="delivery-order">Pedido</label>
              <Select
                value={orderId}
                onValueChange={(value) => {
                  if (value) setOrderId(value);
                }}
                disabled={busy || unavailable}
              >
                <SelectTrigger id="delivery-order" className="w-full">
                  <SelectValue placeholder="Selecione o pedido" />
                </SelectTrigger>
                <SelectContent>
                  {orders.rows.map((order) => (
                    <SelectItem key={order.id} value={order.orderNumber}>
                      {order.orderNumber} — {order.customer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="space-y-1 text-sm font-medium">
              Código de rastreio (opcional)
              <Input
                name="trackingCode"
                defaultValue={delivery?.trackingCode}
                maxLength={100}
                placeholder="Ainda não informado"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Transportadora
              <Input
                name="carrier"
                defaultValue={delivery?.carrier}
                maxLength={100}
                placeholder="Ex.: Shopee Xpress"
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Previsão de entrega
              <Input
                name="estimate"
                type="date"
                defaultValue={delivery?.estimate ?? todayDate()}
                min="1900-01-01"
                max="9999-12-31"
                required
              />
            </label>
            <div className="space-y-1 text-sm font-medium">
              <label htmlFor="delivery-status">Status</label>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (!value) return;
                  const next = value as Delivery['status'];
                  setStatus(next);
                  if (next === 'Não enviado') {
                    setShippedAt('');
                    setDeliveredAt('');
                  }
                  if (next === 'A caminho') {
                    setShippedAt(shippedAt || shippingToday());
                    setDeliveredAt('');
                  }
                  if (next === 'Entregue')
                    setDeliveredAt(deliveredAt || shippingToday());
                }}
                disabled={busy || unavailable}
              >
                <SelectTrigger id="delivery-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Não enviado', 'A caminho', 'Entregue'] as const).map(
                    (value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
            {status !== 'Não enviado' && (
              <label className="space-y-1 text-sm font-medium">
                Data real de envio
                <Input
                  name="shippedAt"
                  type="date"
                  value={shippedAt}
                  onChange={(event) => setShippedAt(event.target.value)}
                  min="1900-01-01"
                  max={shippingToday()}
                  required={!legacyWithoutDates}
                />
              </label>
            )}
            {status === 'Entregue' && (
              <label className="space-y-1 text-sm font-medium">
                Data real de entrega
                <Input
                  name="deliveredAt"
                  type="date"
                  value={deliveredAt}
                  onChange={(event) => setDeliveredAt(event.target.value)}
                  min={shippedAt || '1900-01-01'}
                  max={shippingToday()}
                  required={!legacyWithoutDates}
                />
              </label>
            )}
            {status !== 'Não enviado' && (
              <p className="text-sm text-[#657168] sm:col-span-2">
                A média usa o intervalo entre envio e recebimento, em dias
                corridos. Registros antigos sem essas datas não entram no
                cálculo.
              </p>
            )}
            <label className="space-y-1 text-sm font-medium sm:col-span-2">
              Endereço de destino
              <Textarea
                name="destination"
                defaultValue={delivery?.destination}
                maxLength={500}
                placeholder="Rua, número, bairro, cidade, UF e CEP"
                required
              />
            </label>
          </fieldset>
          {(validation || error) && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">
              {validation || error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy || unavailable || !orderId}
              className="bg-[#ee4d2d] text-white hover:bg-[#d73211]"
            >
              {busy ? 'Salvando…' : 'Salvar entrega'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
