import { Miniflare } from 'miniflare';
import fs from 'node:fs';
import path from 'node:path';
import { getLocalPort, readLocalBindings } from './local-config.mjs';

const projectDir = path.resolve(import.meta.dirname, '..');
const serverDir = path.join(projectDir, 'dist', 'server');
const clientDir = path.join(projectDir, 'dist', 'client');

if (!fs.existsSync(serverDir) || !fs.existsSync(clientDir)) {
  throw new Error(
    'Build não encontrado. Execute "npm run build" antes de iniciar o SYNC Mobile.',
  );
}

const localBindings = readLocalBindings(projectDir);

function findJavaScriptFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? findJavaScriptFiles(entryPath)
      : entry.name.endsWith('.js')
        ? [entryPath]
        : [];
  });
}

const entryModule = path.join(serverDir, 'index.js');
const serverModules = [
  entryModule,
  ...findJavaScriptFiles(serverDir).filter(
    (modulePath) => modulePath !== entryModule,
  ),
];

const server = new Miniflare({
  host: '127.0.0.1',
  port: getLocalPort(),
  modulesRoot: projectDir,
  modules: serverModules.map((modulePath) => ({
    type: 'ESModule',
    path: modulePath,
  })),
  compatibilityDate: '2026-05-15',
  compatibilityFlags: ['nodejs_compat'],
  bindings: localBindings,
  d1Databases: { DB: '00000000-0000-4000-8000-000000000000' },
  d1Persist: path.join(projectDir, '.wrangler', 'state', 'v3', 'd1'),
  assets: {
    directory: clientDir,
    binding: 'ASSETS',
    routerConfig: {
      has_user_worker: true,
      invoke_user_worker_ahead_of_assets: false,
    },
  },
});

const url = await server.ready;
console.log(`SYNC Mobile disponível em ${url}`);

let shuttingDown = false;

function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  const forcedExit = setTimeout(() => process.exit(0), 2000);
  void server.dispose().finally(() => {
    clearTimeout(forcedExit);
    process.exit(0);
  });
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
