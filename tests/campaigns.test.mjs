import assert from 'node:assert/strict';
import test from 'node:test';
import {
  campaignId,
  campaignMetrics,
  parseNewCampaign,
  parseCampaignChanges,
} from '../lib/campaigns.ts';

const sample = {
  id: 1,
  name: 'Teste',
  platform: 'Meta',
  status: 'Ativa',
  budgetCents: 10000,
  spentCents: 2500,
  revenueCents: 10000,
  clicks: 100,
  conversions: 5,
  theme: 'forest',
  isDemo: false,
};
await test('calcula ROAS, CPC, CPA, conversão e saldo', () => {
  assert.deepEqual(campaignMetrics(sample), {
    roas: 4,
    cpc: 25,
    cpa: 500,
    conversionRate: 5,
    budgetUsage: 25,
    remainingCents: 7500,
  });
});
await test('métricas sem denominador são indisponíveis, não infinito', () => {
  assert.deepEqual(
    campaignMetrics({
      ...sample,
      budgetCents: 0,
      spentCents: 0,
      clicks: 0,
      conversions: 0,
    }),
    {
      roas: null,
      cpc: null,
      cpa: null,
      conversionRate: null,
      budgetUsage: 0,
      remainingCents: 0,
    },
  );
});
await test('orçamento excedido não gera saldo negativo nem barra acima de 100%', () => {
  const metrics = campaignMetrics({ ...sample, spentCents: 15000 });
  assert.equal(metrics.remainingCents, 0);
  assert.equal(metrics.budgetUsage, 100);
});
await test('otimização só aceita nome, orçamento e status; não falsifica métricas', () => {
  assert.deepEqual(
    parseCampaignChanges(
      {
        ...sample,
        name: '  Ajustado  ',
        status: 'Pausada',
        revenueCents: 999999,
      },
      2500,
    ),
    { name: 'Ajustado', budgetCents: 10000, status: 'Pausada' },
  );
});
await test('rejeita nome vazio, estado inválido e orçamento menor que gasto', () => {
  for (const changes of [
    { name: ' ' },
    { name: 'x'.repeat(121) },
    { status: 'Qualquer' },
    { budgetCents: 2000 },
    { budgetCents: -1 },
    { budgetCents: 2.5 },
    { budgetCents: '10000' },
    { budgetCents: Infinity },
  ])
    assert.throws(() => parseCampaignChanges({ ...sample, ...changes }, 2500));
});
await test('criação manual não aceita se passar por exemplo e valida métricas', () => {
  assert.equal(parseNewCampaign({ ...sample, isDemo: true }).isDemo, false);
  for (const changes of [
    { platform: 'Invalid' },
    { clicks: -1 },
    { conversions: 1.5 },
    { spentCents: null },
  ])
    assert.throws(() => parseNewCampaign({ ...sample, ...changes }));
  assert.throws(() => parseNewCampaign(null));
});
await test('id inválido não pode selecionar registros', () => {
  for (const value of [0, -1, 1.2, NaN, null, '1'])
    assert.throws(() => campaignId(value));
});
