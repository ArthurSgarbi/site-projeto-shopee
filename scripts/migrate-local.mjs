import path from 'node:path';
import { applyMigrations } from './local-config.mjs';

try {
  await applyMigrations(path.resolve(import.meta.dirname, '..'));
} catch (error) {
  console.error(
    error instanceof Error ? error.message : 'Falha ao preparar o banco.',
  );
  process.exitCode = 1;
}
