import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

async function runMigrations(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const pool = new Pool({ connectionString });

  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id          SERIAL      PRIMARY KEY,
        filename    VARCHAR     NOT NULL UNIQUE,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    const { rows } = await pool.query<{ filename: string }>(
      'SELECT filename FROM _migrations ORDER BY filename',
    );
    const applied = new Set(rows.map((r) => r.filename));

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No migration files found — nothing to do');
      return;
    }

    for (const filename of files) {
      if (applied.has(filename)) {
        console.log(`  skip  ${filename}  (already applied)`);
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf-8');
      const client = await pool.connect();

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO _migrations (filename) VALUES ($1)',
          [filename],
        );
        await client.query('COMMIT');
        console.log(`  apply ${filename}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${filename} failed: ${(err as Error).message}`);
      } finally {
        client.release();
      }
    }

    console.log('All migrations applied successfully');
  } finally {
    await pool.end();
  }
}

runMigrations().catch((err) => {
  console.error('Migration runner failed:', err.message);
  process.exit(1);
});
