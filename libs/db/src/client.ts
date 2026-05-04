import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema';


export function createPool(
  connectionString: string,
  overrides: Partial<PoolConfig> = {},
): Pool {
  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 2_000,
    ...overrides,
  });
}


export function createDb(pool: Pool) {
  return drizzle(pool, { schema });
}


export type Db = ReturnType<typeof createDb>;
