import postgres from 'postgres';
import { dbLogger } from './logger';
import { getDatabaseUrl } from './env';

const QUERY_TIMEOUT_MS = 5000;
const MAX_CONNECTIONS = 10;
const IDLE_TIMEOUT_SECONDS = 20;
const CONNECT_TIMEOUT_SECONDS = 30;
const MAX_LIFETIME_SECONDS = 1800;

function getConnectionUrl(): string {
  const baseUrl = getDatabaseUrl();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}options=-c%20statement_timeout%3D${QUERY_TIMEOUT_MS}`;
}

export const sql = postgres(getConnectionUrl(), {
  max: MAX_CONNECTIONS,
  idle_timeout: IDLE_TIMEOUT_SECONDS,
  connect_timeout: CONNECT_TIMEOUT_SECONDS,
  max_lifetime: MAX_LIFETIME_SECONDS,
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
    return { latencyMs, poolSize: MAX_CONNECTIONS };
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
