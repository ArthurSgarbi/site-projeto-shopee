import assert from 'node:assert/strict';
import test from 'node:test';
import {
  loadProducts,
  persistProduct,
  productRequest,
} from '../lib/product-storage.ts';

await test('estoque vazio é respeitado sem inserir exemplos', async (t) => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    requests.push({ url, init });
    return Response.json([]);
  });
  assert.deepEqual(await loadProducts(), []);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, '/api/products');
  assert.equal(requests[0].init.method, undefined);
});

await test('falha do banco não simula salvamento bem-sucedido', async (t) => {
  t.mock.method(globalThis, 'fetch', async () =>
    Response.json({ error: 'Indisponível' }, { status: 503 }),
  );
  await assert.rejects(
    () => persistProduct({ name: 'Não salvo' }, 'POST'),
    /Indisponível/,
  );
  await assert.rejects(() => loadProducts(), /Indisponível/);
});

await test('erro de rede não gera confirmação local', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => {
    throw new TypeError('Offline');
  });
  await assert.rejects(
    () => persistProduct({ name: 'Não salvo' }, 'PUT'),
    /Offline/,
  );
});

await test('exclusão só resolve quando o servidor confirma', async (t) => {
  t.mock.method(
    globalThis,
    'fetch',
    async () => new Response(null, { status: 204 }),
  );
  assert.equal(await productRequest({ method: 'DELETE' }, '?id=1'), undefined);
});
