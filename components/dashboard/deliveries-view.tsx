import {
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { deliveries } from './data';
import { StatusBadge } from './status-badge';
import { ViewHeading } from './view-heading';

const progressByStatus = { Preparando: 20, 'Em trânsito': 62, Entregue: 100 };

export function DeliveriesView() {
  return (
    <>
      <ViewHeading
        eyebrow="Logística"
        title="Entregas"
        description="Monitore rastreios, transportadoras e prazos até o destino final de cada pedido."
      />
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <DeliverySummary
          icon={TruckIcon}
          label="Em trânsito"
          value={`${deliveries.filter((item) => item.status === 'Em trânsito').length}`}
        />
        <DeliverySummary
          icon={ClockIcon}
          label="Em preparação"
          value={`${deliveries.filter((item) => item.status === 'Preparando').length}`}
        />
        <DeliverySummary
          icon={CheckCircleIcon}
          label="Entregues"
          value={`${deliveries.filter((item) => item.status === 'Entregue').length}`}
        />
      </section>
      <section className="space-y-3">
        {deliveries.map((delivery) => {
          const progress = progressByStatus[delivery.status];
          return (
            <article
              key={delivery.trackingCode}
              className="rounded-2xl border border-[#dfe4da] bg-white p-4 shadow-[0_8px_24px_rgba(39,54,44,.025)] sm:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[1.1fr_.8fr_1fr_1.3fr] lg:items-center">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-[#829087]">
                    Código de rastreio
                  </p>
                  <p className="mt-1 font-mono text-sm font-bold text-[#245c3b]">
                    {delivery.trackingCode}
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
                  <div className="mt-1 flex items-center gap-2">
                    <MapPinIcon className="size-4 text-[#718075]" />
                    <span className="font-medium">{delivery.destination}</span>
                  </div>
                  <p className="mt-1 text-xs text-[#89938c]">
                    Previsão: {delivery.estimate}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#edf0ea]">
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
