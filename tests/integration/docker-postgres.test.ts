import { describe, it, expect, afterEach } from 'vitest';
import postgres from 'postgres';
import { getDatabaseUrl } from '../test-utils';

const DATABASE_URL = getDatabaseUrl();

describe('PostgreSQL connection', () => {
  // Track connection per test to ensure proper cleanup
  // Each test creates its own connection to avoid state leakage
  let sql: ReturnType<typeof postgres> | undefined;

  afterEach(async () => {
    // Always close connection after each test to prevent connection leaks
    if (sql) {
      await sql.end();
      sql = undefined;
    }
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
      Array.from({ length: 5 }, () => sql!`SELECT pg_sleep(0.1)`)
    );
    expect(Date.now() - start).toBeLessThan(2000);
  });
});
