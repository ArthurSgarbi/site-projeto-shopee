import path from 'node:path';
import {
  applyMigrations,
  assertPortAvailable,
  getLocalPort,
  readLocalBindings,
  runLocalCommand,
} from './local-config.mjs';

const projectDir = path.resolve(import.meta.dirname, '..');

try {
  const port = getLocalPort(process.argv.slice(2));
  await assertPortAvailable(port);
  process.env.SYNC_MOBILE_PORT = String(port);

  const bindings = readLocalBindings(projectDir);
  for (const [key, value] of Object.entries(bindings)) {
    process.env[key] ??= value;
  }
  process.env.TURSO_DATABASE_URL ??= 'file:.data/sync-mobile.db';
  const emailKey = process.env.RESEND_API_KEY;
  if (!emailKey?.trim()) {
    console.warn(
      'E-mail ainda não configurado: preencha RESEND_API_KEY em .dev.vars ou .env.local. O site abrirá, mas o login exige o código por e-mail.',
    );
  } else if (
    !emailKey.trim().startsWith('re_') ||
    /^re_x+$/i.test(emailKey.trim())
  ) {
    console.warn(
      'RESEND_API_KEY precisa ser uma chave real da Resend. Chaves do Gemini/Google e valores de exemplo não servem para enviar e-mail.',
    );
  }

  console.log('1/3 Preparando o banco local…');
  await applyMigrations(projectDir);
  console.log('2/3 Verificando a aplicação…');
  console.log(`3/3 SYNC Mobile disponível em http://127.0.0.1:${port}`);
  await runLocalCommand(projectDir, 'node_modules/next/dist/bin/next', [
    'dev',
    '--hostname',
    '127.0.0.1',
    '--port',
    String(port),
  ]);
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Não foi possível iniciar o site.',
  );
  process.exitCode = 1;
}
