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
import { parseOrder } from '@/lib/records';
import type { Order, OrderDraft, Product } from './types';
import { recordDialogClass, todayDate } from './record-controls';

export function OrderEditor({
  order,
  busy,
  error,
  onClose,
  onSave,
  products,
  initialProduct,
}: {
  order: Order | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (values: OrderDraft, id?: number) => Promise<boolean>;
  products: Product[];
  initialProduct?: Product | null;
}) {
  const [status, setStatus] = useState<Order['status']>(
    order?.status ?? (initialProduct ? 'Pago' : 'Pendente'),
  );
  const [productName, setProductName] = useState(
    order?.productName ?? initialProduct?.name ?? '',
  );
  const [catalogId, setCatalogId] = useState(
    initialProduct ? String(initialProduct.id) : '',
  );
  const [quantity, setQuantity] = useState(String(order?.items ?? 1));
  const [total, setTotal] = useState(
    order
      ? (order.totalCents / 100).toFixed(2)
      : initialProduct
        ? (initialProduct.saleCents / 100).toFixed(2)
        : '',
  );
  const [orderNumber] = useState(
    () =>
      order?.orderNumber ??
      (initialProduct
        ? `SM-${crypto.randomUUID().slice(0, 8).toUpperCase()}`
        : ''),
  );
  const shippingHandled = Boolean(
    order?.deliveryGenerated || order?.hasDelivery,
  );
  const needsShipping = status === 'Pago' && !shippingHandled;
  const [validation, setValidation] = useState('');
  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    let values: OrderDraft;
    try {
      values = parseOrder(
        {
          orderNumber: form.get('orderNumber'),
          customer: form.get('customer'),
          date: form.get('date'),
          totalCents: Math.round(Number(form.get('total')) * 100),
          items: Number(form.get('items')),
          status,
          productName,
          destination: form.get('destination'),
          carrier: form.get('carrier'),
          estimate: form.get('estimate'),
        },
        !shippingHandled,
      );
    } catch (error) {
      setValidation(
        error instanceof Error ? error.message : 'Revise os campos.',
      );
      return;
    }
    setValidation('');
    if (await onSave(values, order?.id)) onClose();
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
            {order
              ? 'Editar pedido'
              : initialProduct
                ? 'Registrar venda'
                : 'Novo pedido'}
          </DialogTitle>
          <DialogDescription>
            Ao confirmar como Pago, o pedido gera uma entrega Não enviado com o
            destino abaixo. Não altera a Shopee nem dá baixa automática no
            estoque.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm font-medium">
              Número do pedido
              <Input
                name="orderNumber"
                defaultValue={orderNumber}
                maxLength={60}
                placeholder="#SM-1049"
                required
              />
            </label>
            {products.length > 0 && (
              <div className="space-y-1 text-sm font-medium sm:col-span-2">
                <label htmlFor="order-product">
                  Preencher com produto do estoque (opcional)
                </label>
                <Select
                  value={catalogId}
                  onValueChange={(value) => {
                    const product = products.find(
                      (item) => String(item.id) === value,
                    );
                    if (product) {
                      setCatalogId(String(product.id));
                      setProductName(product.name);
                      setTotal(
                        (
                          (product.saleCents * Number(quantity || 1)) /
                          100
                        ).toFixed(2),
                      );
                    }
                  }}
                  disabled={busy}
                >
                  <SelectTrigger id="order-product" className="w-full">
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={String(product.id)}>
                        {product.name} — {product.sku}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <label className="space-y-1 text-sm font-medium sm:col-span-2">
              Produto(s) vendido(s)
              <Input
                name="productName"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                maxLength={500}
                required={needsShipping}
                placeholder="Nome do produto ou descrição dos itens do pedido"
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Cliente
              <Input
                name="customer"
                defaultValue={order?.customer}
                maxLength={150}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Data do pedido
              <Input
                name="date"
                type="date"
                defaultValue={order?.date ?? todayDate()}
                min="1900-01-01"
                max="9999-12-31"
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Quantidade de itens
              <Input
                name="items"
                type="number"
                value={quantity}
                onChange={(event) => {
                  setQuantity(event.target.value);
                  const product = products.find(
                    (item) => String(item.id) === catalogId,
                  );
                  if (product)
                    setTotal(
                      (
                        (product.saleCents * Number(event.target.value)) /
                        100
                      ).toFixed(2),
                    );
                }}
                min={1}
                max={1_000_000}
                step={1}
                required
              />
            </label>
            <label className="space-y-1 text-sm font-medium">
              Valor total (R$)
              <Input
                name="total"
                type="number"
                value={total}
                onChange={(event) => setTotal(event.target.value)}
                min={0}
                max={1_000_000_000}
                step="0.01"
                required
              />
            </label>
            <div className="space-y-1 text-sm font-medium">
              <label htmlFor="order-status">Status</label>
              <Select
                value={status}
                onValueChange={(value) => {
                  if (value) setStatus(value as Order['status']);
                }}
                disabled={busy}
              >
                <SelectTrigger id="order-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(['Pendente', 'Pago', 'Cancelado'] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!shippingHandled ? (
              <>
                <label className="space-y-1 text-sm font-medium sm:col-span-2">
                  Endereço de destino
                  <Textarea
                    name="destination"
                    defaultValue={order?.destination}
                    maxLength={500}
                    required={needsShipping}
                    placeholder="Rua, número, complemento, bairro, cidade, UF e CEP"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Transportadora (opcional)
                  <Input
                    name="carrier"
                    defaultValue={order?.carrier}
                    maxLength={100}
                    placeholder="A definir"
                  />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  Chegada prevista ao destino
                  <Input
                    type="date"
                    name="estimate"
                    defaultValue={order?.estimate}
                    min="1900-01-01"
                    max="9999-12-31"
                    required={needsShipping}
                  />
                </label>
                <p className="text-sm text-[#657168] sm:col-span-2">
                  Informe o prazo combinado com o cliente. Ele é uma previsão,
                  não uma consulta automática à transportadora.
                </p>
              </>
            ) : (
              <>
                <input
                  type="hidden"
                  name="destination"
                  value={order?.destination ?? ''}
                />
                <input
                  type="hidden"
                  name="carrier"
                  value={order?.carrier ?? ''}
                />
                <input
                  type="hidden"
                  name="estimate"
                  value={order?.estimate ?? ''}
                />
                <p className="rounded-xl border border-[#eadeda] p-3 text-sm sm:col-span-2">
                  {order?.hasDelivery
                    ? 'A entrega já está cadastrada. Edite endereço, prazo e status na aba Entregas. Salvar novamente não duplica o envio.'
                    : 'A entrega anterior foi removida. Para recriá-la, use Nova entrega na aba Entregas.'}{' '}
                  Cancelar o pedido não cancela automaticamente o envio.
                </p>
              </>
            )}
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
              disabled={busy}
              className="bg-[#ee4d2d] text-white hover:bg-[#d73211]"
            >
              {busy ? 'Salvando…' : 'Salvar pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
