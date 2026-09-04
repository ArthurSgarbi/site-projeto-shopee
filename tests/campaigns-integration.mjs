import assert from 'node:assert/strict';
import { insertAuthenticatedSession } from './auth-fixtures.mjs';

export async function verifyCampaigns(runtime, db) {
  for (const method of ['GET', 'POST', 'PUT', 'DELETE']) {
    const response = await runtime.dispatchFetch(
      'http://localhost/api/campaigns?id=1',
      { method },
    );
    assert.equal(response.status, 401, `${method} precisa exigir sessão`);
    await response.text();
  }
  // Sessão apenas no banco descartável, sem credenciais, e-mail ou dados reais.
  const token = await insertAuthenticatedSession(db, 1, 60_000);
  const headers = {
    Cookie: `sync_mobile_session=${token}`,
    'Content-Type': 'application/json',
    Origin: 'http://localhost',
  };
  async function call(method, body, suffix = '', extraHeaders = {}) {
    const response = await runtime.dispatchFetch(
      `http://localhost/api/campaigns${suffix}`,
      {
        method,
        headers: { ...headers, ...extraHeaders },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      },
    );
    const data = response.status === 204 ? null : await response.json();
    return { status: response.status, data };
  }
  assert.deepEqual(
    (await call('GET')).data,
    [],
    'GET não deve semear exemplos',
  );
  const draft = {
    name: 'Campanha de teste',
    platform: 'Meta',
    status: 'Ativa',
    budgetCents: 10000,
    spentCents: 1000,
    revenueCents: 5000,
    clicks: 40,
    conversions: 2,
  };
  assert.equal(
    (await call('POST', draft, '', { Origin: 'https://example.org' })).status,
    403,
  );
  assert.equal((await call('POST', { ...draft, budgetCents: -1 })).status, 400);
  const created = await call('POST', draft);
  assert.equal(created.status, 201);
  const id = created.data[0].id;
  const optimized = await call('PUT', {
    id,
    name: 'Campanha ajustada',
    budgetCents: 12000,
    status: 'Pausada',
    spentCents: 0,
    revenueCents: 999999,
  });
  assert.equal(optimized.status, 200);
  assert.equal(optimized.data.status, 'Pausada');
  assert.equal(optimized.data.spentCents, 1000);
  assert.equal(optimized.data.revenueCents, 5000);
  const reloaded = await call('GET');
  assert.equal(reloaded.data[0].name, 'Campanha ajustada');
  assert.equal(reloaded.data[0].budgetCents, 12000);
  assert.equal(
    (
      await db
        .prepare('SELECT budget_cents FROM campaigns WHERE id = ?')
        .bind(id)
        .first()
    ).budget_cents,
    12000,
  );
  assert.equal(
    (
      await call('PUT', {
        id,
        name: 'Inválido',
        budgetCents: 1,
        status: 'Ativa',
      })
    ).status,
    400,
  );
  assert.equal((await call('DELETE', undefined, '?id=0')).status, 400);
  assert.equal((await call('DELETE', undefined, `?id=${id}`)).status, 204);
  assert.equal((await call('DELETE', undefined, `?id=${id}`)).status, 404);
  assert.equal((await call('PUT', { id, ...draft })).status, 404);
  assert.deepEqual(
    (await call('GET')).data,
    [],
    'Anúncios removidos não podem reaparecer',
  );
  const examples = await call('POST', { loadExamples: true });
  assert.equal(examples.data.length, 3);
  assert.ok(examples.data.every((row) => row.isDemo === true));
  for (const example of examples.data)
    assert.equal(
      (await call('DELETE', undefined, `?id=${example.id}`)).status,
      204,
    );
  assert.deepEqual((await call('GET')).data, []);
  await db.prepare('DELETE FROM auth_sessions').run();
  console.log(
    'Anúncios aprovados: sessão, origem, cadastro, otimização, validação, persistência, remoção e exemplos explícitos.',
  );
}
