import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

export function getLocalPort(args = [], environment = process.env) {
  let value = environment.SYNC_MOBILE_PORT ?? environment.PORT ?? '3000';
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--port' || argument === '-p') value = args[++index];
    else if (argument.startsWith('--port=')) value = argument.slice(7);
    else throw new Error(`Opção desconhecida: ${argument}. Use --port 3000.`);
  }
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Porta inválida. Informe um número entre 1 e 65535.');
  }
  return port;
}

export function readLocalBindings(projectDir, environment = process.env) {
  const parsed = ['.dev.vars', '.env.local'].reduce((values, name) => {
    const filePath = path.join(projectDir, name);
    return fs.existsSync(filePath)
      ? { ...values, ...parseEnv(fs.readFileSync(filePath, 'utf8')) }
      : values;
  }, {});
  const bindings = {};
  for (const key of [
    'TURSO_DATABASE_URL',
    'TURSO_AUTH_TOKEN',
    'RESEND_API_KEY',
    'EMAIL_FROM',
    'INITIAL_ADMIN_EMAIL',
    'INITIAL_ADMIN_PASSWORD',
  ]) {
    const value = environment[key] ?? parsed[key];
    if (value !== undefined) bindings[key] = value;
  }
  return bindings;
}

export async function assertPortAvailable(port) {
  // Verifica apenas a porta solicitada, sem encerrar processos de outros projetos.
  for (const host of ['127.0.0.1', '::1']) {
    await new Promise((resolve, reject) => {
      const probe = net.createServer();
      probe.once('error', (error) => {
        if (
          host === '::1' &&
          ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(error.code)
        ) {
          resolve();
        } else if (error.code === 'EADDRINUSE') {
          reject(
            new Error(
              `A porta ${port} já está em uso. Encerre a outra instância com Ctrl+C ou execute npm run dev -- --port ${port + 1}.`,
            ),
          );
        } else {
          reject(error);
        }
      });
      probe.listen({ port, host, exclusive: true }, () => probe.close(resolve));
    });
  }
}

export function runLocalCommand(projectDir, relativeScript, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(projectDir, relativeScript), ...args],
      {
        cwd: projectDir,
        stdio: 'inherit',
        windowsHide: true,
        env: { ...process.env, WRANGLER_WRITE_LOGS: 'false' },
      },
    );
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else if (signal === 'SIGINT' || signal === 'SIGTERM') resolve();
      else
        reject(
          new Error(
            `A preparação parou (${signal ?? code}). Corrija o erro mostrado acima e tente novamente.`,
          ),
        );
    });
  });
}

export function applyMigrations(projectDir) {
  return runLocalCommand(projectDir, 'scripts/migrate-db.mjs', []);
}
