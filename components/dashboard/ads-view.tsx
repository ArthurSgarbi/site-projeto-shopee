import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CursorArrowRaysIcon,
  MegaphoneIcon,
  PresentationChartLineIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import { campaigns } from './data';
import { formatMoney } from './utils';
import { ViewHeading } from './view-heading';

export function AdsView({ onAction }: { onAction: (message: string) => void }) {
  const totalSpent = campaigns.reduce(
    (sum, campaign) => sum + campaign.spentCents,
    0,
  );
  const totalRevenue = campaigns.reduce(
    (sum, campaign) => sum + campaign.revenueCents,
    0,
  );
  const roas = totalSpent ? totalRevenue / totalSpent : 0;

  return (
    <>
      <ViewHeading
        eyebrow="Aquisição"
        title="Anúncios"
        description="Compare campanhas ativas, acompanhe o orçamento e identifique onde cada real investido converte melhor."
        action={
          <Button
            onClick={() =>
              onAction('Nova campanha preparada para configuração.')
            }
            className="h-10 rounded-xl bg-[#245c3b] px-4 text-white hover:bg-[#19472c]"
          >
            <MegaphoneIcon />
            Nova campanha
          </Button>
        }
      />
      <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <AdSummary
          icon={MegaphoneIcon}
          label="Campanhas ativas"
          value={`${campaigns.length}`}
        />
        <AdSummary
          icon={ChartBarIcon}
          label="Investimento"
          value={formatMoney(totalSpent)}
        />
        <AdSummary
          icon={ArrowTrendingUpIcon}
          label="Receita atribuída"
          value={formatMoney(totalRevenue)}
        />
        <AdSummary
          icon={PresentationChartLineIcon}
          label="ROAS médio"
          value={`${roas.toFixed(2)}x`}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {campaigns.map((campaign) => {
          const campaignRoas = campaign.spentCents
            ? campaign.revenueCents / campaign.spentCents
            : 0;
          const conversionRate = campaign.clicks
            ? (campaign.conversions / campaign.clicks) * 100
            : 0;
          const budgetUsage = Math.min(
            100,
            (campaign.spentCents / campaign.budgetCents) * 100,
          );
          return (
            <article
              key={campaign.id}
              className="overflow-hidden rounded-2xl border border-[#dfe4da] bg-white shadow-[0_10px_30px_rgba(39,54,44,.035)]"
            >
              <div
                className={`relative h-40 overflow-hidden p-5 text-white ${campaign.theme === 'forest' ? 'bg-gradient-to-br from-[#173f2b] to-[#3d8056]' : campaign.theme === 'gold' ? 'bg-gradient-to-br from-[#765813] to-[#d0a746]' : 'bg-gradient-to-br from-[#284a6e] to-[#5c84a9]'}`}
              >
                <div className="absolute -right-8 -top-8 size-32 rounded-full border-[24px] border-white/10" />
                <div className="absolute -bottom-12 right-16 size-28 rounded-full bg-white/10" />
                <div className="relative z-10 flex h-full flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                      {campaign.platform}
                    </span>
                    <MegaphoneIcon className="size-6" />
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[.14em] text-white/65">
                      Campanha ativa
                    </p>
                    <h3 className="mt-1 max-w-[240px] text-xl font-bold tracking-[-0.03em]">
                      {campaign.name}
                    </h3>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="ROAS" value={`${campaignRoas.toFixed(2)}x`} />
                  <Metric label="Cliques" value={`${campaign.clicks}`} />
                  <Metric
                    label="Conversão"
                    value={`${conversionRate.toFixed(1)}%`}
                  />
                </div>
                <div className="mt-5">
                  <div className="mb-2 flex justify-between text-xs">
                    <span className="text-[#718075]">Orçamento utilizado</span>
                    <span className="font-semibold">
                      {formatMoney(campaign.spentCents)} de{' '}
                      {formatMoney(campaign.budgetCents)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#e9ede6]">
                    <div
                      className="h-full rounded-full bg-[#3e8558]"
                      style={{ width: `${budgetUsage}%` }}
                    />
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#718075]">Conversões</p>
                    <p className="font-bold">{campaign.conversions} vendas</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() =>
                      onAction(
                        `Campanha “${campaign.name}” aberta para otimização.`,
                      )
                    }
                  >
                    <CursorArrowRaysIcon />
                    Otimizar
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </section>
    </>
  );
}

function AdSummary({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MegaphoneIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="rounded-2xl border border-[#dfe4da] bg-white p-4">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl bg-[#e8f3e9] text-[#2e7044]">
          <Icon className="size-5" />
        </div>
        <div>
          <p className="text-xs text-[#718075]">{label}</p>
          <p className="mt-0.5 text-lg font-bold">{value}</p>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f8f9f6] p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[#829087]">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
