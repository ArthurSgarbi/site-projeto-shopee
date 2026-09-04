'use client';

import { useState } from 'react';
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CursorArrowRaysIcon,
  MegaphoneIcon,
  PresentationChartLineIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCampaigns } from '@/hooks/use-campaigns';
import { campaignMetrics } from '@/lib/campaigns';
import { CampaignEditor } from './campaign-editor';
import type { Campaign } from './types';
import { formatMoney } from './utils';
import { ViewHeading } from './view-heading';

export function AdsView({ onAction }: { onAction: (message: string) => void }) {
  const {
    campaigns,
    loading,
    busy,
    error,
    retry,
    clearError,
    save,
    remove,
    loadExamples,
  } = useCampaigns(onAction);
  const [editor, setEditor] = useState<Campaign | 'new' | null>(null);
  const [removing, setRemoving] = useState<Campaign | null>(null);
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
        description="Acompanhe e ajuste suas campanhas neste painel. Não há conexão automática com as plataformas de anúncios."
        action={
          <Button
            disabled={
              loading || busy || Boolean(error && campaigns.length === 0)
            }
            onClick={() => {
              clearError();
              setEditor('new');
            }}
            className="h-10 rounded-xl bg-[#245c3b] px-4 text-white hover:bg-[#19472c]"
          >
            <MegaphoneIcon />
            Nova campanha
          </Button>
        }
      />
      {error && !editor && !removing && (
        <div
          role="alert"
          className="mb-5 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
        >
          {error}{' '}
          <Button variant="outline" disabled={busy} onClick={retry}>
            Tentar novamente
          </Button>
        </div>
      )}
      {loading ? (
        <p role="status" className="py-10 text-sm">
          Carregando anúncios…
        </p>
      ) : (
        <>
          <section className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <AdSummary
              icon={MegaphoneIcon}
              label="Campanhas ativas"
              value={`${campaigns.filter((campaign) => campaign.status === 'Ativa').length}`}
            />
            <AdSummary
              icon={ChartBarIcon}
              label="Investimento cadastrado"
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
              value={totalSpent ? `${roas.toFixed(2)}x` : 'Sem dados'}
            />
          </section>
          {campaigns.some((campaign) => campaign.isDemo) && (
            <p className="mb-4 text-sm text-[#718075]">
              Os cartões marcados como “Exemplo” usam dados fictícios, incluídos
              nos totais desta aba.
            </p>
          )}
          {!campaigns.length && !error && (
            <div className="rounded-2xl border border-[#dfe4da] bg-white p-8 text-center">
              <p className="font-semibold">Nenhum anúncio cadastrado</p>
              <p className="mt-2 text-sm text-[#718075]">
                Cadastre uma campanha ou carregue os exemplos anteriores para
                testar. Anúncios removidos não voltam ao recarregar.
              </p>
              <Button
                className="mt-4"
                variant="outline"
                disabled={busy}
                onClick={() => void loadExamples()}
              >
                {busy ? 'Carregando…' : 'Carregar exemplos'}
              </Button>
            </div>
          )}

          <section className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {campaigns.map((campaign) => {
              const {
                roas: campaignRoas,
                conversionRate,
                budgetUsage,
              } = campaignMetrics(campaign);
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
                          {campaign.status === 'Ativa'
                            ? 'Campanha ativa'
                            : 'Campanha pausada'}
                          {campaign.isDemo ? ' · Exemplo' : ''}
                        </p>
                        <h3 className="mt-1 max-w-[240px] text-xl font-bold tracking-[-0.03em]">
                          {campaign.name}
                        </h3>
                      </div>
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-3">
                      <Metric
                        label="ROAS"
                        value={
                          campaignRoas === null
                            ? 'Sem dados'
                            : `${campaignRoas.toFixed(2)}x`
                        }
                      />
                      <Metric label="Cliques" value={`${campaign.clicks}`} />
                      <Metric
                        label="Conversão"
                        value={
                          conversionRate === null
                            ? 'Sem dados'
                            : `${conversionRate.toFixed(1)}%`
                        }
                      />
                    </div>
                    <div className="mt-5">
                      <div className="mb-2 flex justify-between text-xs">
                        <span className="text-[#718075]">
                          Orçamento utilizado
                        </span>
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
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs text-[#718075]">Conversões</p>
                        <p className="font-bold">
                          {campaign.conversions} vendas
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          disabled={busy}
                          aria-label={`Otimizar ${campaign.name}`}
                          onClick={() => {
                            clearError();
                            setEditor(campaign);
                          }}
                        >
                          <CursorArrowRaysIcon />
                          Otimizar
                        </Button>
                        <Button
                          variant="outline"
                          disabled={busy}
                          aria-label={`Remover ${campaign.name}`}
                          onClick={() => {
                            clearError();
                            setRemoving(campaign);
                          }}
                          className="text-red-600 dark:text-red-300"
                        >
                          <TrashIcon />
                          Remover
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        </>
      )}
      {editor && (
        <CampaignEditor
          campaign={editor === 'new' ? null : editor}
          busy={busy}
          error={error}
          onSave={save}
          onClose={() => {
            setEditor(null);
            clearError();
          }}
        />
      )}
      <AlertDialog
        open={Boolean(removing)}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setRemoving(null);
            clearError();
          }
        }}
      >
        <AlertDialogContent className="border border-[#eadeda] bg-[#fff7f5] text-[#2b1916] dark:border-[#54342e] dark:bg-[#241512] dark:text-[#fff1ed]">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover anúncio?</AlertDialogTitle>
            <AlertDialogDescription>
              “{removing?.name}” será excluído deste painel, junto com seus
              valores nos totais desta aba. Esta ação não pode ser desfeita e
              não remove nem pausa o anúncio na plataforma original.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={async () => {
                if (removing && (await remove(removing.id))) setRemoving(null);
              }}
            >
              {busy ? 'Removendo…' : 'Confirmar remoção'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
