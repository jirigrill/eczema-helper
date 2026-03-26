import { describe, it, expect, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://eczema:eczema_dev@localhost:5432/eczema_helper';

describe('PostgreSQL connection', () => {
  let sql: ReturnType<typeof postgres>;

  afterAll(async () => {
    if (sql) await sql.end();
  });

  it('PostgreSQL container is reachable', async () => {
    sql = postgres(DATABASE_URL, { max: 1 });
    const result = await sql`SELECT 1 AS value`;
    expect(result[0].value).toBe(1);
  });

  it('database accepts table creation and deletion', async () => {
    sql = postgres(DATABASE_URL, { max: 1 });
    await sql`CREATE TABLE IF NOT EXISTS _test_healthcheck (id SERIAL PRIMARY KEY)`;
    await sql`DROP TABLE _test_healthcheck`;
  });

  it('connection pool handles concurrent queries', async () => {
    sql = postgres(DATABASE_URL, { max: 5 });
    const start = Date.now();
    await Promise.all(
      Array.from({ length: 5 }, () => sql`SELECT pg_sleep(0.1)`)
    );
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
