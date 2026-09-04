import { useState } from 'react';
import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import { useRecords } from '@/hooks/use-records';
import { DeliveryEditor } from './delivery-editor';
import {
  DeleteRecordDialog,
  RecordActions,
  RecordsState,
  formatRecordDate,
} from './record-controls';
import type { Delivery, DeliveryDraft } from './types';
import {
  averageDeliveryDays,
  arrivalLabel,
  formatDays,
} from '@/lib/delivery-timing';
import { StatusBadge } from './status-badge';
import { ViewHeading } from './view-heading';

const progressByStatus = { 'Não enviado': 0, 'A caminho': 50, Entregue: 100 };

export function DeliveriesView({
  onAction,
}: {
  onAction: (message: string) => void;
}) {
  const {
    rows: deliveries,
    loading,
    loadError,
    busy,
    error,
    retry,
    clearError,
    save,
    remove,
  } = useRecords<Delivery, DeliveryDraft>('/api/deliveries', onAction);
  const [editor, setEditor] = useState<Delivery | 'new' | null>(null);
  const [removing, setRemoving] = useState<Delivery | null>(null);
  const average = averageDeliveryDays(deliveries);
  return (
    <>
      <ViewHeading
        eyebrow="Logística"
        title="Entregas"
        description="Monitore rastreios, transportadoras e prazos até o destino final de cada pedido."
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
            Nova entrega
          </Button>
        }
      />
      <p className="mb-4 text-sm text-[#657168]">
        Vendas confirmadas criam o envio aqui. Atualize as etapas Não enviado →
        A caminho → Entregue. O rastreamento da transportadora ainda é manual.
      </p>
      <RecordsState
        loading={loading}
        error={loadError}
        empty={deliveries.length === 0}
        onRetry={retry}
      >
        Nenhuma entrega cadastrada. Registre uma venda em Produtos ou confirme
        um pedido como Pago, com destino e previsão preenchidos.
      </RecordsState>
      {!loading && !loadError && deliveries.length > 0 && (
        <>
          <section className="mb-5 grid gap-3 sm:grid-cols-3">
            <DeliverySummary
              icon={TruckIcon}
              label="A caminho"
              value={`${deliveries.filter((item) => item.status === 'A caminho').length}`}
            />
            <DeliverySummary
              icon={ClockIcon}
              label="Não enviado"
              value={`${deliveries.filter((item) => item.status === 'Não enviado').length}`}
            />
            <DeliverySummary
              icon={CheckCircleIcon}
              label="Entregues"
              value={`${deliveries.filter((item) => item.status === 'Entregue').length}`}
            />
          </section>
          <section
            className="mb-5 rounded-2xl border border-[#dfe4da] bg-white p-5"
            aria-label="Tempo médio real de entrega"
          >
            <h3 className="text-sm font-semibold text-[#657168]">
              Tempo médio real para chegar ao destino — geral
            </h3>
            <p className="mt-1 text-2xl font-bold">
              {average.days === null
                ? 'Sem histórico suficiente'
                : formatDays(average.days)}
            </p>
            <p className="mt-2 text-sm text-[#657168]">
              {average.count} entrega(s) concluída(s) com datas válidas.
              Calculado do envio ao recebimento; não é uma promessa de prazo.
              Pedidos cancelados não entram na média.
            </p>
          </section>
          <section className="space-y-3">
            {deliveries.map((delivery) => {
              const progress = progressByStatus[delivery.status];
              return (
                <article
                  key={delivery.id}
                  className="rounded-2xl border border-[#dfe4da] bg-white p-4 shadow-[0_8px_24px_rgba(39,54,44,.025)] sm:p-5"
                >
                  <div className="mb-4 border-b border-[#edf0ea] pb-3">
                    <h3 className="font-semibold">
                      {delivery.productName ||
                        'Produto não informado no pedido'}{' '}
                      <span className="text-sm font-normal text-[#657168]">
                        · {delivery.items} un.
                      </span>
                    </h3>
                    <p className="mt-1 text-sm text-[#657168]">
                      Destinatário: {delivery.customer}
                    </p>
                    {delivery.orderStatus !== 'Pago' && (
                      <p className="mt-2 text-sm font-semibold text-[#a3433a]">
                        Pedido {delivery.orderStatus.toLowerCase()}. Confira
                        antes de enviar; alterar o pedido não cancela o envio
                        automaticamente.
                      </p>
                    )}
                  </div>
                  <div className="grid gap-4 lg:grid-cols-[1.1fr_.8fr_1fr_1.3fr] lg:items-center">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#829087]">
                        Código de rastreio
                      </p>
                      <p className="mt-1 font-mono text-sm font-bold text-[#245c3b]">
                        {delivery.trackingCode || 'Aguardando código'}
                      </p>
                      <p className="mt-1 text-xs text-[#89938c]">
                        Pedido {delivery.orderId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#829087]">
                        Transportadora
                      </p>
                      <p className="mt-1 font-semibold">{delivery.carrier}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-[#829087]">
                        Status
                      </p>
                      <StatusBadge status={delivery.status} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-[#829087]">
                        Destino
                      </p>
                      <div className="mt-1 flex items-start gap-2">
                        <MapPinIcon className="size-4 shrink-0 text-[#718075]" />
                        <span className="break-words whitespace-pre-line font-medium">
                          {delivery.destination}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#89938c]">
                        Previsão: {formatRecordDate(delivery.estimate)}
                      </p>
                    </div>
                  </div>
                  <DeliveryTiming delivery={delivery} deliveries={deliveries} />
                  <div className="mt-4 flex justify-end">
                    <RecordActions
                      label={`entrega do pedido ${delivery.orderId}`}
                      disabled={busy}
                      onEdit={() => {
                        clearError();
                        setEditor(delivery);
                      }}
                      onDelete={() => {
                        clearError();
                        setRemoving(delivery);
                      }}
                    />
                  </div>
                  <div
                    aria-hidden="true"
                    className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf0ea]"
                  >
                    <div
                      className="h-full rounded-full bg-[#3e8558] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
      {editor && (
        <DeliveryEditor
          delivery={editor === 'new' ? null : editor}
          busy={busy}
          error={error}
          onSave={save}
          onClose={() => {
            setEditor(null);
            clearError();
          }}
        />
      )}
      <DeleteRecordDialog
        label={removing ? `entrega do pedido ${removing.orderId}` : null}
        description="Somente o registro de entrega será excluído. O pedido permanece salvo e o envio real não será cancelado."
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

function DeliveryTiming({
  delivery,
  deliveries,
}: {
  delivery: Delivery;
  deliveries: Delivery[];
}) {
  const average = averageDeliveryDays(deliveries, delivery.destination);
  return (
    <div className="mt-4 rounded-xl bg-[#f8f9f6] p-3 text-sm">
      <p className="font-semibold">{arrivalLabel(delivery)}</p>
      <p className="mt-1 text-[#657168]">
        {average.days === null
          ? 'Ainda não há histórico com datas completas para este endereço.'
          : `Média para este mesmo endereço: ${formatDays(average.days)} (${average.count} entrega(s)).`}
      </p>
      {(delivery.shippedAt || delivery.deliveredAt) && (
        <p className="mt-1 text-[#657168]">
          Envio:{' '}
          {delivery.shippedAt
            ? formatRecordDate(delivery.shippedAt)
            : 'Não informado'}{' '}
          · Recebimento:{' '}
          {delivery.deliveredAt
            ? formatRecordDate(delivery.deliveredAt)
            : 'Aguardando'}
        </p>
      )}
    </div>
  );
}

function DeliverySummary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof TruckIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-[#dfe4da] bg-white p-4">
      <div className="grid size-11 place-items-center rounded-xl bg-[#eaf0f7] text-[#315b8a]">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-[#718075]">{label}</p>
        <p className="mt-1 text-xl font-bold">{value} envios</p>
      </div>
    </article>
  );
}
