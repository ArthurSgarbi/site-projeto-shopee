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

  const { RESEND_API_KEY: emailKey } = readLocalBindings(projectDir);
  if (!emailKey?.trim()) {
    console.warn(
      'E-mail ainda não configurado: preencha RESEND_API_KEY em .dev.vars. O site abrirá, mas o login exige o código por e-mail.',
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
  console.log(
    '2/3 Compilando a interface. Aguarde a confirmação antes de abrir…',
  );
  await runLocalCommand(projectDir, 'node_modules/vinext/dist/cli.js', [
    'build',
  ]);
  console.log('3/3 Iniciando o SYNC Mobile…');
  await import('./serve-built.mjs');
  console.log(
    'Modo local estável: após editar o código ou .dev.vars, encerre com Ctrl+C e execute npm run dev novamente.',
  );
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Não foi possível iniciar o site.',
  );
  process.exitCode = 1;
}
