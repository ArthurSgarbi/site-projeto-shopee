'use client';

import { useState, type SubmitEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { campaignMetrics } from '@/lib/campaigns';
import type { Campaign } from './types';
import { formatMoney } from './utils';

type Props = {
  campaign: Campaign | null;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (values: Record<string, unknown>, id?: number) => Promise<boolean>;
};

export function CampaignEditor({
  campaign,
  busy,
  error,
  onClose,
  onSave,
}: Props) {
  const [name, setName] = useState(campaign?.name ?? '');
  const [budget, setBudget] = useState(
    campaign ? (campaign.budgetCents / 100).toFixed(2) : '',
  );
  const [status, setStatus] = useState<Campaign['status']>(
    campaign?.status ?? 'Ativa',
  );
  const [platform, setPlatform] = useState<Campaign['platform']>(
    campaign?.platform ?? 'Meta',
  );
  const [validation, setValidation] = useState('');
  const metrics = campaign ? campaignMetrics(campaign) : null;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    const budgetCents = Math.round(Number(budget) * 100);
    if (
      !Number.isSafeInteger(budgetCents) ||
      budgetCents < 1 ||
      budgetCents < (campaign?.spentCents ?? 0)
    ) {
      setValidation(
        'Informe um orçamento positivo, não inferior ao investimento já realizado.',
      );
      return;
    }
    setValidation('');
    const values = {
      name,
      budgetCents,
      status,
      platform,
      spentCents: Math.round(Number(form.get('spent') ?? 0) * 100),
      revenueCents: Math.round(Number(form.get('revenue') ?? 0) * 100),
      clicks: Number(form.get('clicks') ?? 0),
      conversions: Number(form.get('conversions') ?? 0),
    };
    if (await onSave(values, campaign?.id)) onClose();
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!busy}
        className="max-h-[90dvh] overflow-y-auto border border-[#eadeda] bg-[#fff7f5] text-[#2b1916] dark:border-[#54342e] dark:bg-[#241512] dark:text-[#fff1ed] sm:max-w-xl"
      >
        <DialogHeader>
          <DialogTitle>
            {campaign ? 'Otimizar campanha' : 'Nova campanha'}
          </DialogTitle>
          <DialogDescription>
            Controle local do SYNC Mobile. Salvar ou pausar aqui não altera
            anúncios em Google, Meta ou Shopee.
          </DialogDescription>
        </DialogHeader>
        {campaign && metrics && (
          <section
            className="space-y-3 rounded-xl border border-[#eadeda] p-4 dark:border-[#54342e]"
            aria-label="Análise da campanha"
          >
            {campaign.isDemo && (
              <p className="text-sm font-semibold text-[#d94122] dark:text-[#ff8c75]">
                Dados demonstrativos — não são resultados reais.
              </p>
            )}
            <dl className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <dt>ROAS</dt>
                <dd className="font-bold">
                  {metrics.roas === null
                    ? 'Sem dados'
                    : `${metrics.roas.toFixed(2)}x`}
                </dd>
              </div>
              <div>
                <dt>Custo por clique</dt>
                <dd className="font-bold">
                  {metrics.cpc === null
                    ? 'Sem dados'
                    : formatMoney(metrics.cpc)}
                </dd>
              </div>
              <div>
                <dt>Custo por venda</dt>
                <dd className="font-bold">
                  {metrics.cpa === null
                    ? 'Sem dados'
                    : formatMoney(metrics.cpa)}
                </dd>
              </div>
            </dl>
            <p className="text-sm">
              {metrics.remainingCents === 0
                ? 'O orçamento cadastrado foi consumido. Revise o limite ou registre a campanha como pausada.'
                : `Restam ${formatMoney(metrics.remainingCents)} do orçamento cadastrado.`}
            </p>
            {campaign.spentCents > 0 && campaign.conversions === 0 && (
              <p className="text-sm">
                Há investimento sem vendas registradas. Confira os dados de
                conversão antes de aumentar o orçamento.
              </p>
            )}
            <p className="text-sm text-[#765b55] dark:text-[#cfaaa0]">
              ROAS compara receita atribuída com gasto em anúncios; não
              representa lucro. Os ajustes abaixo não modificam os resultados já
              registrados.
            </p>
          </section>
        )}
        <form onSubmit={submit} className="space-y-4">
          <fieldset disabled={busy} className="space-y-4 disabled:opacity-60">
            <label className="grid gap-2 text-sm font-medium">
              Nome da campanha
              <Input
                required
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium">
                Orçamento total (R$)
                <Input
                  required
                  type="number"
                  min={Math.max(0.01, (campaign?.spentCents ?? 0) / 100)}
                  max="1000000000"
                  step="0.01"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                />
              </label>
              <div className="grid gap-2 text-sm font-medium">
                <label id="campaign-status-label">Situação no painel</label>
                <Select
                  disabled={busy}
                  value={status}
                  onValueChange={(value) => {
                    if (value === 'Ativa' || value === 'Pausada')
                      setStatus(value);
                  }}
                >
                  <SelectTrigger
                    aria-labelledby="campaign-status-label"
                    className="w-full"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ativa">Ativa</SelectItem>
                    <SelectItem value="Pausada">Pausada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {!campaign && (
              <>
                <div className="grid gap-2 text-sm font-medium">
                  <label id="campaign-platform-label">Plataforma</label>
                  <Select
                    disabled={busy}
                    value={platform}
                    onValueChange={(value) => {
                      if (value === 'Meta' || value === 'Google')
                        setPlatform(value);
                    }}
                  >
                    <SelectTrigger
                      aria-labelledby="campaign-platform-label"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Meta">Meta</SelectItem>
                      <SelectItem value="Google">Google</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Resultados já registrados (opcional)
                  </summary>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm">
                      Investimento (R$)
                      <Input
                        name="spent"
                        type="number"
                        min="0"
                        max="1000000000"
                        step="0.01"
                        defaultValue="0"
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      Receita atribuída (R$)
                      <Input
                        name="revenue"
                        type="number"
                        min="0"
                        max="1000000000"
                        step="0.01"
                        defaultValue="0"
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      Cliques
                      <Input
                        name="clicks"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue="0"
                      />
                    </label>
                    <label className="grid gap-2 text-sm">
                      Conversões
                      <Input
                        name="conversions"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue="0"
                      />
                    </label>
                  </div>
                </details>
              </>
            )}
          </fieldset>
          {(validation || error) && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-300">
              {validation || error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={busy}
              className="bg-[#ee4d2d] text-white hover:bg-[#d73211]"
            >
              {busy ? 'Salvando…' : 'Salvar no painel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
