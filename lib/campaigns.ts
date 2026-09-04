import type { Campaign } from '../components/dashboard/types';

export class CampaignInputError extends Error {}

export function campaignBody(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CampaignInputError('Dados da campanha inválidos.');
  return value as Record<string, unknown>;
}

function integer(value: unknown, label: string, minimum = 0) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > 100_000_000_000
  )
    throw new CampaignInputError(
      `${label}: informe um número válido, maior ou igual a ${minimum}.`,
    );
  return value;
}

export function campaignId(value: unknown) {
  return integer(value, 'Campanha', 1);
}

export function parseCampaignChanges(
  value: unknown,
  spentCents: number,
): Pick<Campaign, 'name' | 'budgetCents' | 'status'> {
  const source = campaignBody(value);
  if (
    typeof source.name !== 'string' ||
    !source.name.trim() ||
    source.name.trim().length > 120
  )
    throw new CampaignInputError('O nome deve ter entre 1 e 120 caracteres.');
  const budgetCents = integer(source.budgetCents, 'Orçamento', 1);
  if (budgetCents < spentCents)
    throw new CampaignInputError(
      'O orçamento total não pode ser menor que o valor já gasto.',
    );
  if (source.status !== 'Ativa' && source.status !== 'Pausada')
    throw new CampaignInputError('Selecione uma situação válida.');
  return { name: source.name.trim(), budgetCents, status: source.status };
}

export function parseNewCampaign(value: unknown): Omit<Campaign, 'id'> {
  const source = campaignBody(value);
  const spentCents = integer(
    source.spentCents === undefined ? 0 : source.spentCents,
    'Investimento',
  );
  const revenueCents = integer(
    source.revenueCents === undefined ? 0 : source.revenueCents,
    'Receita',
  );
  const clicks = integer(
    source.clicks === undefined ? 0 : source.clicks,
    'Cliques',
  );
  const conversions = integer(
    source.conversions === undefined ? 0 : source.conversions,
    'Conversões',
  );
  if (source.platform !== 'Google' && source.platform !== 'Meta')
    throw new CampaignInputError('Selecione Google ou Meta.');
  return {
    ...parseCampaignChanges(source, spentCents),
    platform: source.platform,
    spentCents,
    revenueCents,
    clicks,
    conversions,
    theme: 'forest',
    isDemo: false,
  };
}

export function campaignMetrics(campaign: Campaign) {
  return {
    roas:
      campaign.spentCents > 0
        ? campaign.revenueCents / campaign.spentCents
        : null,
    cpc: campaign.clicks > 0 ? campaign.spentCents / campaign.clicks : null,
    cpa:
      campaign.conversions > 0
        ? campaign.spentCents / campaign.conversions
        : null,
    conversionRate:
      campaign.clicks > 0
        ? (campaign.conversions / campaign.clicks) * 100
        : null,
    budgetUsage:
      campaign.budgetCents > 0
        ? Math.min(100, (campaign.spentCents / campaign.budgetCents) * 100)
        : 0,
    remainingCents: Math.max(0, campaign.budgetCents - campaign.spentCents),
  };
}
