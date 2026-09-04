import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { Miniflare } from 'miniflare';
import { verifyCampaigns } from './campaigns-integration.mjs';
import { verifyRecords } from './records-integration.mjs';
import { verifySalesFlow } from './sales-flow-integration.mjs';
import { verifySecurity } from './security-integration.mjs';

const projectDir = path.resolve(import.meta.dirname, '..');
const serverDir = path.join(projectDir, 'dist/server');
const entry = path.join(serverDir, 'index.js');
const files = fs
  .readdirSync(serverDir, { recursive: true })
  .filter((file) => file.endsWith('.js'))
  .map((file) => path.join(serverDir, file));
const email = 'local-verification@example.com';
const password = `test-only-${crypto.randomUUID()}`;
const runtime = new Miniflare({
  host: '127.0.0.1',
  port: 0,
  modulesRoot: projectDir,
  modules: [entry, ...files.filter((file) => file !== entry)].map((file) => ({
    type: 'ESModule',
    path: file,
  })),
  compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'],
  // Banco descartável. Nenhum arquivo de credenciais ou banco real é carregado.
  d1Databases: { DB: 'sync-mobile-isolated-test' },
  d1Persist: false,
  bindings: {
    INITIAL_ADMIN_EMAIL: email,
    INITIAL_ADMIN_PASSWORD: password,
    RESEND_API_KEY: 'AIza-exemplo-ficticio-sem-acesso-externo',
  },
  assets: {
    directory: path.join(projectDir, 'dist/client'),
    binding: 'ASSETS',
    routerConfig: {
      has_user_worker: true,
      invoke_user_worker_ahead_of_assets: false,
    },
  },
});

try {
  await runtime.ready;
  const db = await runtime.getD1Database('DB');
  for (const file of fs
    .readdirSync(path.join(projectDir, 'drizzle'))
    .filter((file) => file.endsWith('.sql'))
    .sort()) {
    const sql = fs.readFileSync(path.join(projectDir, 'drizzle', file), 'utf8');
    for (const statement of sql
      .split('--> statement-breakpoint')
      .map((part) => part.trim())
      .filter(Boolean)) {
      await db.prepare(statement).run();
    }
  }

  const root = await runtime.dispatchFetch('http://localhost/');
  assert.equal(root.status, 200);
  const html = await root.text();
  const assets = new Set(
    [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)[^"]*)"/g)].map(
      (match) => match[1],
    ),
  );
  assert.ok(assets.size > 0);
  for (const asset of assets) {
    const response = await runtime.dispatchFetch(
      new URL(asset, 'http://localhost').href,
    );
    assert.equal(response.status, 200, `Recurso indisponível: ${asset}`);
    await response.arrayBuffer();
  }

  const anonymous = await runtime.dispatchFetch(
    'http://localhost/api/auth/session',
  );
  assert.equal(anonymous.status, 401);
  await anonymous.text();
  const login = await runtime.dispatchFetch('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost' },
    body: JSON.stringify({ email, password }),
  });
  const result = await login.json();
  assert.equal(login.status, 503);
  assert.match(
    result.error,
    /Não foi possível enviar/,
    'Login deve falhar de forma genérica, sem expor a configuração.',
  );
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM admins').first()).count,
    1,
  );
  assert.equal(
    (await db.prepare('SELECT COUNT(*) AS count FROM auth_sessions').first())
      .count,
    0,
  );
  assert.equal(
    (await db.prepare('SELECT attempts FROM auth_challenges').first()).attempts,
    5,
    'Falha do provedor deve fechar o desafio sem liberar novas tentativas.',
  );
  console.log(
    `Integração aprovada: página, ${assets.size} recursos, administrador novo e bloqueio de chave de outro provedor. Nenhum e-mail enviado.`,
  );
  await verifySecurity(runtime, db);
  await verifyCampaigns(runtime, db);
  await verifyRecords(runtime, db);
  await verifySalesFlow(runtime, db);
} finally {
  await runtime.dispose();
}
