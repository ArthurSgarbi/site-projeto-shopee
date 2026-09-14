import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { verifyCampaigns } from './campaigns-integration.mjs';
import { verifyRecords } from './records-integration.mjs';
import { verifySalesFlow } from './sales-flow-integration.mjs';
import { verifySecurity } from './security-integration.mjs';
import {
  createTestDatabase,
  fileDatabaseUrl,
  migrateTestDatabase,
  startNextTestRuntime,
} from './next-test-runtime.mjs';

const projectDir = path.resolve(import.meta.dirname, '..');
const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-integration-'));
const databaseUrl = fileDatabaseUrl(path.join(testDirectory, 'test.db'));
const email = 'local-verification@example.com';
const password = `test-only-${crypto.randomUUID()}`;
let runtime;
let db;
let completed = false;

try {
  await migrateTestDatabase(projectDir, databaseUrl);
  db = createTestDatabase(databaseUrl);
  runtime = await startNextTestRuntime(projectDir, databaseUrl, {
    INITIAL_ADMIN_EMAIL: email,
    INITIAL_ADMIN_PASSWORD: password,
    RESEND_API_KEY: 'AIza-exemplo-ficticio-sem-acesso-externo',
  });

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
  completed = true;
} finally {
  await runtime?.dispose();
  db?.client.close();
  try {
    fs.rmSync(testDirectory, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 100,
    });
  } catch (error) {
    console.warn(
      error instanceof Error && 'code' in error && error.code === 'EPERM'
        ? 'O Windows concluirá a limpeza do banco temporário depois.'
        : 'Não foi possível remover o banco temporário do teste.',
    );
  }
}

if (completed) process.exit(0);
