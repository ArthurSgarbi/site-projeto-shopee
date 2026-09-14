import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { readLocalBindings } from './local-config.mjs';

const projectDir = path.resolve(import.meta.dirname, '..');
const dataDir = path.join(projectDir, '.data');
const localDatabase = path.join(dataDir, 'sync-mobile.db');
const bindings = readLocalBindings(projectDir);

for (const [key, value] of Object.entries(bindings)) {
  process.env[key] ??= value;
}

let importedLegacyDatabase = false;
if (!process.env.TURSO_DATABASE_URL?.trim()) {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(localDatabase)) {
    const legacyDirectory = path.join(
      projectDir,
      '.wrangler',
      'state',
      'v3',
      'd1',
      'miniflare-D1DatabaseObject',
    );
    const legacyDatabase = fs.existsSync(legacyDirectory)
      ? fs
          .readdirSync(legacyDirectory)
          .filter(
            (name) => name.endsWith('.sqlite') && name !== 'metadata.sqlite',
          )
          .map((name) => path.join(legacyDirectory, name))
          .find((filePath) => fs.statSync(filePath).size > 0)
      : undefined;
    if (legacyDatabase) {
      fs.copyFileSync(legacyDatabase, localDatabase);
      importedLegacyDatabase = true;
      console.log('Dados do banco local anterior foram preservados.');
    }
  }
  process.env.TURSO_DATABASE_URL = 'file:.data/sync-mobile.db';
}

const url = process.env.TURSO_DATABASE_URL.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
if (/^(libsql|https):\/\//.test(url) && !authToken) {
  throw new Error(
    'Defina TURSO_AUTH_TOKEN para aplicar migrações no banco remoto.',
  );
}

const client = createClient({ url, authToken, intMode: 'number' });
const migrationDirectory = path.join(projectDir, 'drizzle');
const migrationFiles = fs
  .readdirSync(migrationDirectory)
  .filter((name) => /^\d+.*\.sql$/.test(name))
  .sort();

try {
  await client.execute('PRAGMA foreign_keys = ON');
  await client.execute(`CREATE TABLE IF NOT EXISTS _sync_migrations (
    name TEXT PRIMARY KEY NOT NULL,
    applied_at INTEGER NOT NULL
  )`);
  const recorded = await client.execute('SELECT name FROM _sync_migrations');
  const applied = new Set(
    recorded.rows.map((row) =>
      typeof row.name === 'string' ? row.name : JSON.stringify(row.name),
    ),
  );

  if (importedLegacyDatabase && applied.size === 0) {
    await client.batch(
      migrationFiles.map((name) => ({
        sql: 'INSERT OR IGNORE INTO _sync_migrations (name, applied_at) VALUES (?, ?)',
        args: [name, Date.now()],
      })),
      'write',
    );
  } else {
    for (const name of migrationFiles) {
      if (applied.has(name)) continue;
      const source = fs.readFileSync(path.join(migrationDirectory, name), 'utf8');
      const statements = source
        .split('--> statement-breakpoint')
        .map((statement) => statement.trim())
        .filter(Boolean);
      await client.batch(
        [
          ...statements.map((sql) => ({ sql, args: [] })),
          {
            sql: 'INSERT INTO _sync_migrations (name, applied_at) VALUES (?, ?)',
            args: [name, Date.now()],
          },
        ],
        'write',
      );
      console.log(`Migração aplicada: ${name}`);
    }
  }
  console.log('Banco de dados pronto.');
} finally {
  client.close();
}
