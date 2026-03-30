/**
 * Shared test utilities
 */

/**
 * Build DATABASE_URL from individual env vars (same logic as src/lib/server/env.ts)
 */
export function getDatabaseUrl(): string {
  const host = process.env.POSTGRES_HOST ?? 'localhost';
  const port = process.env.POSTGRES_PORT ?? '5432';
  const db = process.env.POSTGRES_DB ?? 'eczema_helper';
  const user = process.env.POSTGRES_USER ?? 'eczema';
  const password = process.env.POSTGRES_PASSWORD ?? 'eczema_dev';

  return `postgres://${user}:${password}@${host}:${port}/${db}`;
}
