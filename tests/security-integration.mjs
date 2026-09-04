import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { digestToken, hashPassword } from '../lib/security-crypto.ts';
import { insertAuthenticatedSession } from './auth-fixtures.mjs';

export async function verifySecurity(runtime, db) {
  const root = await runtime.dispatchFetch('http://localhost/');
  const csp = root.headers.get('content-security-policy') ?? '';
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' 'nonce-[^']+'/);
  assert.equal(root.headers.get('x-content-type-options'), 'nosniff');
  const html = await root.text();
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce);
  for (const tag of html.match(/<script\b[^>]*>/g) ?? []) {
    assert.match(
      tag,
      new RegExp(`nonce=["']${nonce}["']`),
      'todo script inline ou bootstrap precisa do nonce',
    );
  }
  const privateFile = await runtime.dispatchFetch('http://localhost/.dev.vars');
  assert.equal(privateFile.status, 404);
  await privateFile.text();

  await db.prepare('DELETE FROM auth_challenges').run();
  const browser = randomBytes(32).toString('hex');
  const challengeId = randomBytes(32).toString('hex');
  const now = Date.now();
  await db
    .prepare(`INSERT INTO auth_challenges
    (id, admin_id, browser_hash, code_hash, attempts, resends, expires_at, last_sent_at)
    VALUES (?, 1, ?, ?, 0, 0, ?, ?)`)
    .bind(
      challengeId,
      await digestToken(browser),
      await hashPassword('123456'),
      now + 600_000,
      now,
    )
    .run();
  const attempts = await Promise.all(
    Array.from({ length: 8 }, () =>
      runtime.dispatchFetch('http://localhost/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: 'http://localhost',
          Cookie: `sync_mobile_challenge=${browser}`,
        },
        body: JSON.stringify({ challengeId, code: '000000' }),
      }),
    ),
  );
  for (const response of attempts) await response.text();
  assert.equal(
    (
      await db
        .prepare('SELECT attempts FROM auth_challenges WHERE id = ?')
        .bind(challengeId)
        .first()
    ).attempts,
    5,
  );
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').first())
      .count,
    0,
  );

  const token = await insertAuthenticatedSession(db);
  const goodHeaders = {
    Cookie: `sync_mobile_session=${token}`,
    Origin: 'http://localhost',
    'Content-Type': 'application/json',
  };
  const crossSite = await runtime.dispatchFetch(
    'http://localhost/api/products',
    {
      method: 'POST',
      headers: { ...goodHeaders, Origin: 'https://attacker.example' },
      body: '{}',
    },
  );
  assert.equal(crossSite.status, 403);
  await crossSite.text();
  const noOrigin = await runtime.dispatchFetch(
    'http://localhost/api/products',
    {
      method: 'POST',
      headers: {
        Cookie: goodHeaders.Cookie,
        'Content-Type': 'application/json',
      },
      body: '{}',
    },
  );
  assert.equal(noOrigin.status, 403);
  await noOrigin.text();
  const wrongType = await runtime.dispatchFetch(
    'http://localhost/api/products',
    {
      method: 'POST',
      headers: {
        Cookie: goodHeaders.Cookie,
        Origin: 'http://localhost',
        'Content-Type': 'text/plain',
      },
      body: '{}',
    },
  );
  assert.equal(wrongType.status, 415);
  await wrongType.text();
  const tooLarge = await runtime.dispatchFetch(
    'http://localhost/api/products',
    {
      method: 'POST',
      headers: goodHeaders,
      body: JSON.stringify({ name: 'x'.repeat(270_000) }),
    },
  );
  assert.equal(tooLarge.status, 413);
  await tooLarge.text();
  console.log(
    'Segurança aprovada: CSP, arquivos privados, sessão com hash, CSRF, tipo/tamanho de corpo e limite atômico do código.',
  );
}
