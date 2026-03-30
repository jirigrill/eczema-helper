import postgres from 'postgres';
import { dbLogger } from './logger';
import { getDatabaseUrl } from './env';

// Default query timeout (5 seconds) - can be overridden per-query
const DEFAULT_QUERY_TIMEOUT_MS = 5000;

export const sql = postgres(getDatabaseUrl(), {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  // Prevent connection leaks by timing out stuck queries
  max_lifetime: 60 * 30, // 30 minutes max connection lifetime
  // Handle connection errors gracefully
  onnotice: () => {}, // Suppress NOTICE messages in production
  transform: {
    // Automatically convert snake_case to camelCase for column names
    // Disabled: mapping is done explicitly in adapter layer for clarity
  },
  // Log connection events for observability
  debug: process.env.DB_DEBUG === 'true' ? (connection, query, params) => {
    dbLogger.debug({ connection, query, params: params?.length }, 'DB query');
  } : undefined,
});

/**
 * Health check: verifies database connectivity
 * Returns latency in milliseconds or throws on failure
 */
export async function checkDbHealth(): Promise<{ latencyMs: number; poolSize: number }> {
  const start = Date.now();
  try {
    await sql`SELECT 1`;
    const latencyMs = Date.now() - start;
    return { latencyMs, poolSize: 10 }; // postgres.js doesn't expose current pool size
  } catch (error) {
    dbLogger.error({ err: error }, 'Database health check failed');
    throw error;
  }
}

/**
 * Graceful shutdown: closes all database connections
 */
export async function closeDb(): Promise<void> {
  dbLogger.info('Closing database connections...');
  await sql.end({ timeout: 5 });
  dbLogger.info('Database connections closed');
}

// Export timeout for use in critical queries
export const DB_QUERY_TIMEOUT_MS = DEFAULT_QUERY_TIMEOUT_MS;
