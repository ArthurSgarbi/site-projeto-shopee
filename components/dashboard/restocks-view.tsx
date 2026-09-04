import {
  ArrowPathIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  ShoppingCartIcon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { supplierBySku } from './data';
import type { Product } from './types';
import { formatMoney } from './utils';
import { ViewHeading } from './view-heading';

type RestocksViewProps = {
  products: Product[];
  onRequestPurchase: (product: Product) => void;
};

export function RestocksView({
  products,
  onRequestPurchase,
}: RestocksViewProps) {
  const criticalProducts = products.filter(
    (product) => product.stock <= product.minStock,
  );
  const incomingProducts = products.filter((product) => product.incoming > 0);

  return (
    <>
      <ViewHeading
        eyebrow="Abastecimento"
        title="Reposições"
        description="Priorize itens críticos, consulte fornecedores e transforme alertas em solicitações de compra."
      />
      <section className="mb-5 grid gap-3 sm:grid-cols-3">
        <Summary
          icon={ExclamationTriangleIcon}
          label="Itens críticos"
          value={`${criticalProducts.length}`}
          tone="warning"
        />
        <Summary
          icon={TruckIcon}
          label="Reposições a caminho"
          value={`${incomingProducts.length}`}
          tone="blue"
        />
        <Summary
          icon={ArrowPathIcon}
          label="Unidades encomendadas"
          value={`${incomingProducts.reduce((sum, product) => sum + product.incoming, 0)}`}
          tone="green"
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.45fr_1fr]">
        <section className="overflow-hidden rounded-2xl border border-[#ead7aa] bg-white">
          <div className="border-b border-[#f0e0bd] bg-[#fff8e8] p-5">
            <h3 className="font-bold text-[#5a4518]">
              Alertas de estoque baixo
            </h3>
            <p className="mt-1 text-sm text-[#806c40]">
              Itens que já atingiram o limite mínimo configurado.
            </p>
          </div>
          <div className="divide-y divide-[#edf0ea]">
            {criticalProducts.length ? (
              criticalProducts.map((product) => {
                const suggested = Math.max(
                  product.minStock * 3 - product.stock,
                  20,
                );
                return (
                  <article
                    key={product.id}
                    className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="flex gap-3">
                      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#fff2d2] text-[#936000]">
                        <ExclamationTriangleIcon className="size-5" />
                      </div>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="mt-1 text-xs text-[#7b867f]">
                          {product.sku} · Fornecedor:{' '}
                          {supplierBySku[product.sku] ?? 'Fornecedor principal'}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-[#fff0ee] px-2 py-1 font-semibold text-[#a3433a]">
                            Restam {product.stock} un.
                          </span>
                          <span className="rounded-full bg-[#f0f3ed] px-2 py-1 text-[#657168]">
                            Sugestão: {suggested} un.
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      onClick={() => onRequestPurchase(product)}
                      className="rounded-xl bg-[#245c3b] text-white hover:bg-[#19472c]"
                    >
                      <ShoppingCartIcon />
                      Solicitar compra
                    </Button>
                  </article>
                );
              })
            ) : (
              <div className="p-8 text-center text-sm text-[#718075]">
                Nenhum item em nível crítico.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-[#dfe4da] bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#eaf0f7] text-[#315b8a]">
              <BuildingStorefrontIcon className="size-5" />
            </div>
            <div>
              <h3 className="font-bold">Compras em andamento</h3>
              <p className="text-xs text-[#7b867f]">
                Valor previsto de entrada
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {incomingProducts.map((product) => (
              <article key={product.id} className="rounded-xl bg-[#f8f9f6] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="mt-1 text-xs text-[#7b867f]">
                      {supplierBySku[product.sku] ?? 'Fornecedor principal'}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#eaf0f7] px-2 py-1 text-xs font-bold text-[#315b8a]">
                    +{product.incoming} un.
                  </span>
                </div>
                <p className="mt-3 text-xs text-[#657168]">
                  Custo previsto{' '}
                  <strong className="text-[#263229]">
                    {formatMoney(product.incoming * product.costCents)}
                  </strong>
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function Summary({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TruckIcon;
  label: string;
  value: string;
  tone: 'warning' | 'blue' | 'green';
}) {
  const colors = {
    warning: 'bg-[#fff2d2] text-[#936000]',
    blue: 'bg-[#eaf0f7] text-[#315b8a]',
    green: 'bg-[#e8f3e9] text-[#2e7044]',
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
        <p className="mt-1 text-xl font-bold">{value}</p>
      </div>
    </article>
  );
}
