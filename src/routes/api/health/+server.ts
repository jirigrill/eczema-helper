import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { checkDbHealth } from '$lib/server/db';
import { logger } from '$lib/server/logger';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

/**
 * Minimal health response for load balancers.
 * Intentionally excludes version, uptime, and latency to avoid information leakage.
 */
type HealthResponse = {
  status: HealthStatus;
};

/**
 * Health check endpoint for load balancers and monitoring.
 *
 * Returns:
 * - 200 OK: All systems operational
 * - 503 Service Unavailable: Critical system (database) is down
 *
 * Security: This endpoint is unauthenticated so it intentionally returns
 * minimal information. Detailed metrics should use authenticated endpoints
 * or infrastructure-level monitoring (Prometheus, etc.).
 */
export const GET: RequestHandler = async () => {
  let dbStatus: HealthStatus = 'healthy';

  try {
    const dbHealth = await checkDbHealth();

    // Consider DB degraded if latency is high (>500ms)
    if (dbHealth.latencyMs > 500) {
      dbStatus = 'degraded';
      logger.warn({ latencyMs: dbHealth.latencyMs }, 'Database latency is high');
    }
  } catch (error) {
    dbStatus = 'unhealthy';
    logger.error({ err: error }, 'Database health check failed');
  }

  const response: HealthResponse = {
    status: dbStatus,
  };

  // Return 503 if unhealthy (for load balancer to route away)
  const httpStatus = dbStatus === 'unhealthy' ? 503 : 200;

  return json(response, { status: httpStatus });
};
