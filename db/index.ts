import {
  createClient,
  type Client,
  type InStatement,
  type InValue,
  type ResultSet,
} from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

type QueryResult<T> = {
  results: T[];
  success: true;
  meta: { changes: number; last_row_id?: number };
};

function databaseUrl() {
  return process.env.TURSO_DATABASE_URL?.trim() || 'file:.data/sync-mobile.db';
}

function databaseToken() {
  return process.env.TURSO_AUTH_TOKEN?.trim() || undefined;
}

let client: Client | null = null;

export function getDatabaseClient() {
  if (!client) {
    const url = databaseUrl();
    if (/^(libsql|https):\/\//.test(url) && !databaseToken()) {
      throw new Error(
        'TURSO_AUTH_TOKEN não foi configurado para o banco remoto.',
      );
    }
    client = createClient({ url, authToken: databaseToken(), intMode: 'number' });
  }
  return client;
}

function rows<T>(result: ResultSet) {
  return result.rows.map((row) => ({ ...row }) as T);
}

function normalize<T>(result: ResultSet): QueryResult<T> {
  const lastInsertRowid = result.lastInsertRowid;
  return {
    results: rows<T>(result),
    success: true,
    meta: {
      changes: result.rowsAffected,
      ...(lastInsertRowid === undefined
        ? {}
        : { last_row_id: Number(lastInsertRowid) }),
    },
  };
}

export class PreparedStatement {
  constructor(
    readonly sql: string,
    readonly args: InValue[] = [],
  ) {}

  bind(...args: unknown[]) {
    return new PreparedStatement(this.sql, args as InValue[]);
  }

  toLibsql(): InStatement {
    return { sql: this.sql, args: this.args };
  }

  async first<T>() {
    const result = await getDatabaseClient().execute(this.toLibsql());
    return rows<T>(result)[0] ?? null;
  }

  async all<T>() {
    return normalize<T>(
      await getDatabaseClient().execute(this.toLibsql()),
    );
  }

  async run() {
    return normalize(await getDatabaseClient().execute(this.toLibsql()));
  }
}

const compatibleDatabase = {
  prepare(sql: string) {
    return new PreparedStatement(sql);
  },
  async batch(statements: PreparedStatement[]) {
    const results = await getDatabaseClient().batch(
      statements.map((statement) => statement.toLibsql()),
      'write',
    );
    return results.map((result) => normalize(result));
  },
};

export function getRawDb() {
  if (!databaseUrl()) {
    throw new Error(
      'Configure TURSO_DATABASE_URL antes de usar o banco de dados.',
    );
  }
  return compatibleDatabase;
}

export function getDb() {
  return drizzle(getDatabaseClient(), { schema });
}
