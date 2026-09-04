import { useState } from 'react';
import {
  BanknotesIcon,
  ClockIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRecords } from '@/hooks/use-records';
import { OrderEditor } from './order-editor';
import {
  DeleteRecordDialog,
  RecordActions,
  RecordsState,
  formatRecordDate,
} from './record-controls';
import type { Order, OrderDraft, OrderStatus, Product } from './types';
import { formatMoney } from './utils';
import { StatusBadge } from './status-badge';
import { ViewHeading } from './view-heading';

type OrderFilter = 'Todos' | OrderStatus;

export function OrdersView({
  onAction,
  products,
  initialProduct,
  onSaleClose,
}: {
  onAction: (message: string) => void;
  products: Product[];
  initialProduct: Product | null;
  onSaleClose: () => void;
}) {
  const {
    rows: orders,
    loading,
    loadError,
    busy,
    error,
    retry,
    clearError,
    save,
    remove,
  } = useRecords<Order, OrderDraft>('/api/orders', onAction);
  const [editor, setEditor] = useState<Order | 'new' | null>(
    initialProduct ? 'new' : null,
  );
  const [removing, setRemoving] = useState<Order | null>(null);
  const [filter, setFilter] = useState<OrderFilter>('Todos');
  const filteredOrders =
    filter === 'Todos'
      ? orders
      : orders.filter((order) => order.status === filter);
  const paidTotal = orders
    .filter((order) => order.status === 'Pago')
    .reduce((sum, order) => sum + order.totalCents, 0);

  return (
    <>
      <ViewHeading
        eyebrow="Vendas"
        title="Pedidos"
        description="Acompanhe os pedidos recebidos, pagamentos confirmados e cancelamentos em um único fluxo."
        action={
          <Button
            disabled={loading || Boolean(loadError) || busy}
            className="bg-[#ee4d2d] text-white hover:bg-[#d73211]"
            onClick={() => {
              clearError();
              setEditor('new');
            }}
          >
            <PlusIcon />
            Novo pedido
          </Button>
        }
      />
      <p className="mb-4 text-sm text-[#657168]">
        Pedidos pagos geram entregas automaticamente. Informe os produtos, o
        destino e a previsão ao cadastrar a venda. O estoque continua com
        controle manual.
      </p>
      <RecordsState
        loading={loading}
        error={loadError}
        empty={orders.length === 0}
        onRetry={retry}
      >
        Nenhum pedido cadastrado. Use “Novo pedido” para começar.
      </RecordsState>
      {!loading && !loadError && orders.length > 0 && (
        <>
          <section className="mb-5 grid gap-3 sm:grid-cols-3">
            <Summary
              icon={ShoppingBagIcon}
              label="Pedidos cadastrados"
              value={String(orders.length)}
              tone="green"
            />
            <Summary
              icon={BanknotesIcon}
              label="Pagamentos aprovados"
              value={formatMoney(paidTotal)}
              tone="gold"
            />
            <Summary
              icon={ClockIcon}
              label="Aguardando pagamento"
              value={`${orders.filter((order) => order.status === 'Pendente').length}`}
              tone="blue"
            />
          </section>
          <section className="overflow-hidden rounded-2xl border border-[#dfe4da] bg-white shadow-[0_10px_30px_rgba(39,54,44,.04)]">
            <div className="flex gap-2 overflow-x-auto border-b border-[#e5e9e1] p-4 sm:p-5">
              {(['Todos', 'Pendente', 'Pago', 'Cancelado'] as const).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFilter(item)}
                    aria-pressed={filter === item}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${filter === item ? 'bg-[#244f36] text-white' : 'bg-[#f0f3ed] text-[#5f6c63] hover:bg-[#e4e9e1]'}`}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-[#f8f9f6] hover:bg-[#f8f9f6]">
                  <TableHead className="pl-5">Pedido</TableHead>
                  <TableHead className="min-w-[210px]">Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Itens</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="pr-5">Status</TableHead>
                  <TableHead className="pr-5">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="h-[74px] border-[#edf0ea]"
                  >
                    <TableCell className="pl-5 font-semibold text-[#245c3b]">
                      {order.orderNumber}
                      <p
                        className="mt-1 max-w-52 truncate text-sm font-normal text-[#657168]"
                        title={order.productName}
                      >
                        {order.productName || 'Produto não informado'}
                      </p>
                      {order.status === 'Pago' && !order.hasDelivery && (
                        <p className="mt-1 text-xs text-[#a3433a]">
                          {order.deliveryGenerated
                            ? 'Entrega removida'
                            : 'Complete os dados para gerar a entrega'}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-full bg-[#e7efe7] text-xs font-bold text-[#2e7044]">
                          {order.customer
                            .split(/\s+/)
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((name) => name[0])
                            .join('')
                            .toUpperCase()}
                        </span>
                        <span className="font-medium">{order.customer}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#657168]">
                      {formatRecordDate(order.date)}
                    </TableCell>
                    <TableCell>{order.items}</TableCell>
                    <TableCell className="font-semibold">
                      {formatMoney(order.totalCents)}
                    </TableCell>
                    <TableCell className="pr-5">
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="pr-5">
                      <RecordActions
                        label={`pedido ${order.orderNumber}`}
                        disabled={busy}
                        onEdit={() => {
                          clearError();
                          setEditor(order);
                        }}
                        onDelete={() => {
                          clearError();
                          setRemoving(order);
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {filteredOrders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="p-8 text-center">
                      Nenhum pedido com este status.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </section>
        </>
      )}
      {editor && !loading && !loadError && (
        <OrderEditor
          products={products}
          initialProduct={editor === 'new' ? initialProduct : null}
          order={editor === 'new' ? null : editor}
          busy={busy}
          error={error}
          onSave={async (values, id) => {
            const saved = await save(values, id);
            if (saved && values.status === 'Pago')
              onAction('Venda salva. Confira o envio na aba Entregas.');
            return saved;
          }}
          onClose={() => {
            setEditor(null);
            clearError();
            onSaleClose();
          }}
        />
      )}
      <DeleteRecordDialog
        label={removing ? `pedido ${removing.orderNumber}` : null}
        description="O registro será removido apenas do painel. Pedidos com entregas vinculadas ficam protegidos contra exclusão."
        busy={busy}
        error={error}
        onClose={() => {
          setRemoving(null);
          clearError();
        }}
        onConfirm={async () => {
          if (removing && (await remove(removing.id))) setRemoving(null);
        }}
      />
    </>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof ShoppingBagIcon;
  label: string;
  value: string;
  tone: 'green' | 'gold' | 'blue';
}) {
  const colors = {
    green: 'bg-[#e8f3e9] text-[#2e7044]',
    gold: 'bg-[#fff2d2] text-[#936000]',
    blue: 'bg-[#eaf0f7] text-[#315b8a]',
  };
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[#dfe4da] bg-white p-4">
      <div
        className={`grid size-11 place-items-center rounded-xl ${colors[tone]}`}
      >
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-[#718075]">{label}</p>
        <p className="mt-1 text-xl font-bold tracking-[-0.03em]">{value}</p>
      </div>
    </article>
  );
}
