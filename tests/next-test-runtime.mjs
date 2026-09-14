import net from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createClient } from '@libsql/client';

export function fileDatabaseUrl(filePath) {
  return `file:${filePath.replaceAll('\\', '/')}`;
}

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen({ host: '127.0.0.1', port: 0 }, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

function statement(client, sql, args = []) {
  return {
    bind(...nextArgs) {
      return statement(client, sql, nextArgs);
    },
    async first() {
      const result = await client.execute({ sql, args });
      return result.rows[0] ? { ...result.rows[0] } : null;
    },
    async all() {
      const result = await client.execute({ sql, args });
      return { results: result.rows.map((row) => ({ ...row })) };
    },
    async run() {
      const result = await client.execute({ sql, args });
      return {
        results: result.rows.map((row) => ({ ...row })),
        meta: { changes: result.rowsAffected },
      };
    },
  };
}

export function createTestDatabase(databaseUrl) {
  const client = createClient({ url: databaseUrl, intMode: 'number' });
  return {
    client,
    prepare(sql) {
      return statement(client, sql);
    },
  };
}

export async function migrateTestDatabase(projectDir, databaseUrl) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(projectDir, 'scripts', 'migrate-db.mjs')],
      {
        cwd: projectDir,
        windowsHide: true,
        env: {
          ...process.env,
          TURSO_DATABASE_URL: databaseUrl,
          TURSO_AUTH_TOKEN: '',
        },
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    let errors = '';
    child.stderr.on('data', (chunk) => {
      errors += String(chunk);
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(errors || `Migração de teste falhou (${code}).`));
    });
  });
}

export async function startNextTestRuntime(projectDir, databaseUrl, bindings = {}) {
  const port = await getAvailablePort();
  const baseUrl = `http://localhost:${port}`;
  const child = spawn(
    process.execPath,
    [
      path.join(projectDir, 'node_modules', 'next', 'dist', 'bin', 'next'),
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: projectDir,
      windowsHide: true,
      env: {
        ...process.env,
        TURSO_DATABASE_URL: databaseUrl,
        TURSO_AUTH_TOKEN: '',
        ...bindings,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    output += String(chunk);
  });

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null)
      throw new Error(`Servidor de teste encerrou cedo. ${output}`);
    try {
      const response = await fetch(baseUrl, { signal: AbortSignal.timeout(500) });
      await response.arrayBuffer();
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  if (Date.now() >= deadline) {
    child.kill();
    throw new Error(`Servidor de teste não ficou pronto. ${output}`);
  }

  return {
    async dispatchFetch(input, init = {}) {
      const source = new URL(input);
      const headers = new Headers(init.headers);
      if (headers.get('Origin') === 'http://localhost')
        headers.set('Origin', baseUrl);
      return fetch(`${baseUrl}${source.pathname}${source.search}`, {
        ...init,
        headers,
      });
    },
    async dispose() {
      if (child.exitCode !== null) return;
      if (process.platform === 'win32') {
        await new Promise((resolve) => {
          const shutdown = spawn(
            'taskkill.exe',
            ['/PID', String(child.pid), '/T', '/F'],
            { windowsHide: true, stdio: 'ignore' },
          );
          shutdown.once('error', resolve);
          shutdown.once('exit', resolve);
        });
        if (child.exitCode === null) {
          await Promise.race([
            new Promise((resolve) => child.once('exit', resolve)),
            new Promise((resolve) => setTimeout(resolve, 2_000)),
          ]);
        }
        if (child.exitCode === null) child.kill('SIGKILL');
      } else {
        child.kill('SIGTERM');
        await Promise.race([
          new Promise((resolve) => child.once('exit', resolve)),
          new Promise((resolve) => setTimeout(resolve, 2_000)),
        ]);
      }
      child.stdout.destroy();
      child.stderr.destroy();
      await new Promise((resolve) => setTimeout(resolve, 150));
    },
  };
}
