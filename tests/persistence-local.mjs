import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Miniflare } from 'miniflare';
import { insertAuthenticatedSession } from './auth-fixtures.mjs';

const projectDir = path.resolve(import.meta.dirname, '..');
const serverDir = path.join(projectDir, 'dist/server');
const entry = path.join(serverDir, 'index.js');
const files = fs
  .readdirSync(serverDir, { recursive: true })
  .filter((name) => name.endsWith('.js'))
  .map((name) => path.join(serverDir, name));
// Pasta temporária exclusiva. Não carrega .dev.vars nem o banco do usuário.
const testDirectory = fs.mkdtempSync(
  path.join(os.tmpdir(), 'sync-persistence-'),
);
let token = '';
const headers = {
  Cookie: `sync_mobile_session=${token}`,
  'Content-Type': 'application/json',
  Origin: 'http://localhost',
};
let runtime;

async function start() {
  runtime = new Miniflare({
    host: '127.0.0.1',
    port: 0,
    modulesRoot: projectDir,
    modules: [entry, ...files.filter((file) => file !== entry)].map((file) => ({
      type: 'ESModule',
      path: file,
    })),
    compatibilityDate: '2026-05-15',
    compatibilityFlags: ['nodejs_compat'],
    d1Databases: { DB: 'sync-persistence-test' },
    d1Persist: testDirectory,
  });
  await runtime.ready;
  return runtime.getD1Database('DB');
}

async function call(url, method = 'GET', body, expected = 200) {
  const response = await runtime.dispatchFetch(`http://localhost${url}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  assert.equal(response.status, expected, `${method} ${url}`);
  return expected === 204 ? undefined : response.json();
}

try {
  const db = await start();
  for (const file of fs
    .readdirSync(path.join(projectDir, 'drizzle'))
    .filter((name) => name.endsWith('.sql'))
    .sort()) {
    for (const sql of fs
      .readFileSync(path.join(projectDir, 'drizzle', file), 'utf8')
      .split('--> statement-breakpoint')
      .map((sql) => sql.trim())
      .filter(Boolean))
      await db.prepare(sql).run();
  }
  await db
    .prepare(
      "INSERT INTO admins (email, password_hash, role, created_at) VALUES ('persistence@example.com', 'test-only', 'owner', ?)",
    )
    .bind(Date.now())
    .run();
  token = await insertAuthenticatedSession(db);
  headers.Cookie = `sync_mobile_session=${token}`;
  assert.deepEqual(await call('/api/products'), []);
  const product = await call(
    '/api/products',
    'POST',
    {
      name: 'Produto persistente',
      sku: 'PERSIST-1',
      category: 'Teste',
      stock: 10,
      incoming: 0,
      costCents: 1200,
      saleCents: 2500,
    },
    201,
  );
  const updated = {
    ...product,
    name: 'Produto editado',
    stock: 27,
    incoming: 60,
    weeklyAdSpendCents: 800,
    weeklyExpensesCents: 200,
    weeklyDelivered: 4,
  };
  await call('/api/products', 'PUT', updated);
  // Restaurar um cache antigo não deve sobrescrever o produto atual.
  await call(
    '/api/products?mode=restore',
    'POST',
    [{ ...product, stock: 1 }],
    201,
  );
  const draft = {
    name: 'Anúncio persistente',
    platform: 'Meta',
    status: 'Ativa',
    budgetCents: 10000,
    spentCents: 3000,
    revenueCents: 9000,
  };
  const campaigns = await call('/api/campaigns', 'POST', draft, 201);
  const id = campaigns[0].id;
  await call('/api/campaigns', 'PUT', {
    id,
    name: 'Anúncio ajustado',
    budgetCents: 15000,
    status: 'Pausada',
  });

  const order = await call(
    '/api/orders',
    'POST',
    {
      orderNumber: '#PERSIST-1',
      customer: 'Cliente persistente',
      date: '2026-09-04',
      totalCents: 2590,
      items: 1,
      status: 'Pendente',
      productName: 'Produto persistente',
      destination: 'Rua Teste, 10, SP',
      carrier: 'Correios',
      estimate: '2026-09-09',
    },
    201,
  );
  const updatedOrder = {
    ...order,
    orderNumber: '#PERSIST-EDITADO',
    customer: 'Cliente editado',
    date: '2026-09-03',
    totalCents: 4990,
    items: 2,
    status: 'Pago',
    deliveryGenerated: true,
    hasDelivery: true,
  };
  await call('/api/orders', 'PUT', updatedOrder);
  const shipments = await call('/api/deliveries');
  assert.equal(shipments.length, 1, 'pagamento gera um envio');
  const delivery = shipments[0];
  assert.equal(delivery.status, 'Não enviado');
  const updatedDelivery = {
    ...delivery,
    orderId: updatedOrder.orderNumber,
    trackingCode: 'BR-PERSIST',
    carrier: 'Loggi',
    status: 'Entregue',
    destination: 'Rua Atualizada, 20, RJ',
    estimate: '2026-09-10',
    shippedAt: '2026-09-03',
    deliveredAt: '2026-09-04',
  };
  await call('/api/deliveries', 'PUT', updatedDelivery);
  const sidebarOrder = [
    'settings',
    'ads',
    'deliveries',
    'orders',
    'restocks',
    'products',
    'overview',
  ];
  await call('/api/preferences', 'PUT', { sidebarOrder });

  await runtime.dispose();
  runtime = undefined;
  await start();
  const restored = await call('/api/products');
  assert.equal(restored.length, 1);
  for (const key of [
    'name',
    'stock',
    'incoming',
    'weeklyAdSpendCents',
    'weeklyExpensesCents',
    'weeklyDelivered',
  ])
    assert.equal(restored[0][key], updated[key], key);
  const restoredCampaigns = await call('/api/campaigns');
  assert.equal(restoredCampaigns[0].name, 'Anúncio ajustado');
  assert.equal(restoredCampaigns[0].budgetCents, 15000);
  assert.equal(restoredCampaigns[0].status, 'Pausada');
  assert.deepEqual(await call('/api/orders'), [updatedOrder]);
  assert.deepEqual(await call('/api/deliveries'), [updatedDelivery]);
  assert.deepEqual((await call('/api/preferences')).sidebarOrder, sidebarOrder);
  await call(`/api/deliveries?id=${delivery.id}`, 'DELETE', undefined, 204);
  await call(`/api/orders?id=${order.id}`, 'DELETE', undefined, 204);
  await call(`/api/products?id=${product.id}`, 'DELETE', undefined, 204);
  await call(`/api/campaigns?id=${id}`, 'DELETE', undefined, 204);

  await runtime.dispose();
  runtime = undefined;
  await start();
  assert.deepEqual(await call('/api/products'), []);
  assert.deepEqual(await call('/api/campaigns'), []);
  assert.deepEqual(await call('/api/orders'), []);
  assert.deepEqual(await call('/api/deliveries'), []);
  assert.deepEqual((await call('/api/preferences')).sidebarOrder, sidebarOrder);
  console.log(
    'Persistência aprovada após duas reinicializações: produtos, estoque, despesas, reposições, anúncios, pedidos, entregas, ordem do menu e exclusões. Banco real não acessado.',
  );
} finally {
  await runtime?.dispose();
  // Somente a pasta aleatória criada neste teste pode ser removida.
  const resolved = fs.realpathSync(testDirectory);
  const temporaryRoot = fs.realpathSync(os.tmpdir());
  if (
    path.dirname(resolved) !== temporaryRoot ||
    !path.basename(resolved).startsWith('sync-persistence-')
  )
    console.error('Diretório temporário inesperado; limpeza cancelada.');
  else fs.rmSync(resolved, { recursive: true, force: true });
}
