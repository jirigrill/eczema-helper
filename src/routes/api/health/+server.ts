import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { checkDbHealth } from '$lib/server/db';
import { logger } from '$lib/server/logger';

type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

type HealthResponse = {
  status: HealthStatus;
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: {
      status: HealthStatus;
      latencyMs?: number;
      error?: string;
    };
  };
};

const startTime = Date.now();

/**
 * Health check endpoint for load balancers and monitoring.
 *
 * Returns:
 * - 200 OK: All systems operational
 * - 503 Service Unavailable: Critical system (database) is down
 *
 * This endpoint is intentionally unauthenticated for use by:
 * - Kubernetes liveness/readiness probes
 * - Docker health checks
 * - Load balancer health checks
 * - Monitoring systems (e.g., Prometheus, Datadog)
 */
export const GET: RequestHandler = async () => {
  const timestamp = new Date().toISOString();
  const uptime = Math.floor((Date.now() - startTime) / 1000);
  const version = process.env.APP_VERSION ?? 'dev';

  let dbStatus: HealthStatus = 'healthy';
  let dbLatencyMs: number | undefined;
  let dbError: string | undefined;

  try {
    const dbHealth = await checkDbHealth();
    dbLatencyMs = dbHealth.latencyMs;

    // Consider DB degraded if latency is high (>500ms)
    if (dbLatencyMs > 500) {
      dbStatus = 'degraded';
      logger.warn({ latencyMs: dbLatencyMs }, 'Database latency is high');
    }
  } catch (error) {
    dbStatus = 'unhealthy';
    dbError = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ err: error }, 'Database health check failed');
  }

  const overallStatus: HealthStatus =
    dbStatus === 'unhealthy' ? 'unhealthy' :
    dbStatus === 'degraded' ? 'degraded' :
    'healthy';

  const response: HealthResponse = {
    status: overallStatus,
    timestamp,
    version,
    uptime,
    checks: {
      database: {
        status: dbStatus,
        ...(dbLatencyMs !== undefined && { latencyMs: dbLatencyMs }),
        ...(dbError && { error: dbError }),
      },
    },
  };

  // Return 503 if unhealthy (for load balancer to route away)
  const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;

  return json(response, { status: httpStatus });
};
