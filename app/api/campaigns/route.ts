import { getRawDb } from '@/db';
import { getSessionAdmin } from '@/lib/auth';
import {
  CampaignInputError,
  campaignId,
  campaignBody,
  parseCampaignChanges,
  parseNewCampaign,
} from '@/lib/campaigns';
import { campaigns as examples } from '@/components/dashboard/data';
import type { Campaign } from '@/components/dashboard/types';
import {
  assertSafeMutation,
  httpFailure,
  noStoreHeaders,
  readJson,
} from '@/lib/http-security';

const headers = noStoreHeaders;
const fields = `id, name, platform, budget_cents AS budgetCents,
  spent_cents AS spentCents, revenue_cents AS revenueCents, clicks, conversions,
  theme, status, is_demo AS isDemo`;
const jsonError = (error: string, status: number) =>
  Response.json({ error }, { status, headers });
const normalize = (row: Campaign) => ({ ...row, isDemo: Boolean(row.isDemo) });

async function authorize(request: Request) {
  if (!(await getSessionAdmin(request)))
    return jsonError('Sua sessão expirou. Entre novamente.', 401);
  assertSafeMutation(request);
  return null;
}

function failure(error: unknown) {
  const safeFailure = httpFailure(error);
  if (safeFailure) return safeFailure;
  if (error instanceof CampaignInputError || error instanceof SyntaxError)
    return jsonError(
      error instanceof SyntaxError ? 'Dados inválidos.' : error.message,
      400,
    );
  // Não registrar payloads ou credenciais do usuário.
  console.error('[campaigns] Falha no acesso ao banco.');
  return jsonError(
    'Não foi possível salvar ou carregar os anúncios. Verifique o servidor e tente novamente.',
    503,
  );
}

async function list() {
  const { results } = await getRawDb()
    .prepare(`SELECT ${fields} FROM campaigns ORDER BY id DESC`)
    .all<Campaign>();
  return results.map(normalize);
}

export async function GET(request: Request) {
  try {
    const denied = await authorize(request);
    if (denied) return denied;
    return Response.json(await list(), { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const denied = await authorize(request);
    if (denied) return denied;
    const body = campaignBody(await readJson(request));
    // Exemplos só são incluídos quando o usuário solicita, nunca ao recarregar.
    const drafts =
      body?.loadExamples === true ? examples : [parseNewCampaign(body)];
    const statements = drafts.map((item) =>
      getRawDb()
        .prepare(`INSERT INTO campaigns
      (name, platform, budget_cents, spent_cents, revenue_cents, clicks, conversions, theme, status, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(
          item.name,
          item.platform,
          item.budgetCents,
          item.spentCents,
          item.revenueCents,
          item.clicks,
          item.conversions,
          item.theme,
          item.status,
          item.isDemo ? 1 : 0,
        ),
    );
    await getRawDb().batch(statements);
    return Response.json(await list(), { status: 201, headers });
  } catch (error) {
    return failure(error);
  }
}

export async function PUT(request: Request) {
  try {
    const denied = await authorize(request);
    if (denied) return denied;
    const body = campaignBody(await readJson(request));
    const id = campaignId(body?.id);
    const current = await getRawDb()
      .prepare(`SELECT ${fields} FROM campaigns WHERE id = ?`)
      .bind(id)
      .first<Campaign>();
    if (!current)
      return jsonError('Anúncio não encontrado. Atualize a lista.', 404);
    const update = parseCampaignChanges(body, current.spentCents);
    const row = await getRawDb()
      .prepare(`UPDATE campaigns SET name = ?, budget_cents = ?, status = ?
      WHERE id = ? RETURNING ${fields}`)
      .bind(update.name, update.budgetCents, update.status, id)
      .first<Campaign>();
    if (!row)
      return jsonError('Anúncio não encontrado. Atualize a lista.', 404);
    return Response.json(normalize(row), { headers });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const denied = await authorize(request);
    if (denied) return denied;
    const id = campaignId(Number(new URL(request.url).searchParams.get('id')));
    const row = await getRawDb()
      .prepare('DELETE FROM campaigns WHERE id = ? RETURNING id')
      .bind(id)
      .first();
    if (!row)
      return jsonError('Anúncio não encontrado. Atualize a lista.', 404);
    return new Response(null, { status: 204, headers });
  } catch (error) {
    return failure(error);
  }
}
