import assert from 'node:assert/strict';
import net from 'node:net';
import path from 'node:path';
import test from 'node:test';
import {
  assertPortAvailable,
  getLocalPort,
  readLocalBindings,
} from '../scripts/local-config.mjs';

await test('porta padrão, variável e opções explícitas', () => {
  assert.equal(getLocalPort([], {}), 3000);
  assert.equal(getLocalPort([], { PORT: '3010' }), 3010);
  assert.equal(
    getLocalPort(['--port', '3011'], { SYNC_MOBILE_PORT: '3010' }),
    3011,
  );
  assert.equal(getLocalPort(['--port=3012'], {}), 3012);
  assert.equal(getLocalPort(['-p', '3013'], {}), 3013);
});

await test('rejeita portas inválidas e opções desconhecidas', () => {
  for (const args of [
    ['--port'],
    ['--port', '0'],
    ['--port', '65536'],
    ['--port', 'abc'],
    ['--unknown'],
  ]) {
    assert.throws(() => getLocalPort(args, {}));
  }
});

await test('configuração ausente não inventa credenciais nem expõe variáveis não permitidas', () => {
  const missingDir = path.join(
    import.meta.dirname,
    'directory-that-does-not-exist',
  );
  assert.deepEqual(readLocalBindings(missingDir, {}), {});
  assert.deepEqual(
    readLocalBindings(missingDir, {
      EMAIL_FROM: 'SYNC <test@example.com>',
      UNRELATED: 'private',
    }),
    {
      EMAIL_FROM: 'SYNC <test@example.com>',
    },
  );
});

await test('porta ocupada retorna orientação sem encerrar o dono da porta', async () => {
  const listener = net.createServer();
  await new Promise((resolve) => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  try {
    await assert.rejects(assertPortAvailable(port), /já está em uso/);
    assert.equal(listener.listening, true);
  } finally {
    await new Promise((resolve) => listener.close(resolve));
  }
});
