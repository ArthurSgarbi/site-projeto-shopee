import {
  ArrowTrendingUpIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  MegaphoneIcon,
  ReceiptPercentIcon,
  ShoppingBagIcon,
  Squares2X2Icon,
  TruckIcon,
} from '@heroicons/react/24/outline';
import { MetricCard } from './metric-card';
import type { FinancialTotals, Product } from './types';
import { formatMoney } from './utils';
import { ViewHeading } from './view-heading';

type OverviewViewProps = {
  products: Product[];
  totals: FinancialTotals;
  usingLocalStorage: boolean;
  onOpenProduct: (product: Product) => void;
};

export function OverviewView({
  products,
  totals,
  usingLocalStorage,
  onOpenProduct,
}: OverviewViewProps) {
  const margin = totals.revenue
    ? Math.round((totals.profit / totals.revenue) * 100)
    : 0;
  const roas = totals.adSpend ? totals.adRevenue / totals.adSpend : 0;
  const lowStock = products.filter(
    (product) => product.stock <= product.minStock,
  );
  const deliveryRate = totals.orders
    ? Math.min(100, (totals.delivered / totals.orders) * 100)
    : 0;

  return (
    <>
      <ViewHeading
        eyebrow="Painel executivo"
        title="Resumo da semana"
        description="Acompanhe a saúde financeira, o ritmo dos pedidos e os principais alertas da operação."
        action={
          <div className="flex items-center gap-2 text-sm text-[#657168]">
            <span className="size-2 rounded-full bg-[#4f9d69]" />
            {usingLocalStorage
              ? 'Salvo neste dispositivo'
              : 'Dados sincronizados'}
          </div>
        }
      />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Indicadores financeiros"
      >
        <MetricCard
          icon={CurrencyDollarIcon}
          label="Faturamento"
          value={formatMoney(totals.revenue)}
          detail={`${totals.delivered} entregas concluídas`}
          tone="green"
        />
        <MetricCard
          icon={ReceiptPercentIcon}
          label="Gastos da semana"
          value={formatMoney(totals.expenses)}
          detail="Produtos, taxas e publicidade"
          tone="red"
        />
        <MetricCard
          icon={ArrowTrendingUpIcon}
          label="Lucro estimado"
          value={formatMoney(totals.profit)}
          detail={`${margin}% de margem líquida`}
          tone="amber"
        />
        <MetricCard
          icon={Squares2X2Icon}
          label="Custo em estoque"
          value={formatMoney(totals.invested)}
          detail={`${totals.stockUnits} unidades disponíveis`}
          tone="blue"
        />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <article className="overflow-hidden rounded-2xl border border-[#d8dfd1] bg-white shadow-[0_10px_30px_rgba(39,54,44,.04)]">
          <div className="grid gap-6 p-5 lg:grid-cols-[1fr_1.45fr] lg:p-6">
            <div className="rounded-2xl bg-[#173f2b] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-white/10">
                  <MegaphoneIcon className="size-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[.12em] text-[#b9d2c0]">
                    Shopee Ads
                  </p>
                  <h3 className="text-lg font-bold">Desempenho dos anúncios</h3>
                </div>
              </div>
              <p className="mt-5 text-sm text-white/65">
                Retorno sobre investimento
              </p>
              <div className="mt-1 flex items-end gap-2">
                <strong className="text-4xl tracking-[-0.05em]">
                  {roas.toFixed(2)}x
                </strong>
                <span className="mb-1.5 rounded-full bg-[#d9b45d]/20 px-2 py-1 text-xs font-semibold text-[#f5d98f]">
                  ROAS
                </span>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-white/65">
                Cada R$ 1 investido gerou {formatMoney(Math.round(roas * 100))}{' '}
                em vendas atribuídas.
              </p>
            </div>
            <div className="grid content-center gap-4 sm:grid-cols-2">
              <MiniMetric
                label="Investimento"
                value={formatMoney(totals.adSpend)}
              />
              <MiniMetric
                label="Vendas via Ads"
                value={formatMoney(totals.adRevenue)}
              />
              <div className="sm:col-span-2">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="font-medium text-[#5f6d63]">
                    Eficiência das campanhas
                  </span>
                  <span className="font-semibold text-[#245c3b]">
                    {roas >= 4
                      ? 'Saudável'
                      : roas >= 2
                        ? 'Atenção'
                        : 'Revisar lances'}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#e9ede6]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#d8b45d] to-[#3e8558]"
                    style={{ width: `${Math.min(100, (roas / 6) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-2xl bg-[#244f36] p-5 text-white shadow-[0_14px_36px_rgba(29,68,45,.18)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-white/70">Pedidos da semana</p>
              <p className="mt-1 text-3xl font-bold tracking-[-0.04em]">
                {totals.orders}
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-white/10">
              <ShoppingBagIcon className="size-5" />
            </div>
          </div>
          <div className="mt-8 h-2 overflow-hidden rounded-full bg-white/15">
            <div
              className="h-full rounded-full bg-[#e6bd63]"
              style={{ width: `${deliveryRate}%` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-white/75">
            <span>{totals.delivered} entregues</span>
            <span>
              {Math.max(0, totals.orders - totals.delivered)} pendentes
            </span>
          </div>
        </article>
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <article className="rounded-2xl border border-[#dfe4da] bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#6d7a70]">Reposição a receber</p>
              <p className="mt-1 text-xl font-bold">
                {formatMoney(totals.incomingCost)}
              </p>
            </div>
            <div className="grid size-10 place-items-center rounded-xl bg-[#eaf0f7] text-[#315b8a]">
              <TruckIcon className="size-5" />
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {products
              .filter((product) => product.incoming > 0)
              .slice(0, 4)
              .map((product) => (
                <button
                  key={product.id}
                  onClick={() => onOpenProduct(product)}
                  className="flex items-center gap-3 rounded-xl bg-[#f8f9f6] p-3 text-left transition hover:bg-[#eef2eb]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {product.name}
                  </span>
                  <span className="text-sm font-bold text-[#315b8a]">
                    +{product.incoming}
                  </span>
                </button>
              ))}
          </div>
        </article>
        <article className="rounded-2xl border border-[#ead7aa] bg-[#fff8e8] p-5">
          <div className="flex gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#f6dfab] text-[#875d08]">
              <ExclamationTriangleIcon className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-[#5a4518]">Atenção ao estoque</p>
              <p className="mt-1 text-sm leading-relaxed text-[#806c40]">
                {lowStock.length} produtos atingiram o nível crítico e podem
                gerar perda de vendas.
              </p>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#e5e9e1] bg-[#f8f9f6] p-4">
      <p className="text-xs font-medium text-[#718075]">{label}</p>
      <p className="mt-1 text-xl font-bold tracking-[-0.035em]">{value}</p>
    </div>
  );
}
