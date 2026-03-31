import type { Handle, HandleServerError } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

import { validateSessionWithUserAndChildren, extendSession, cleanupExpiredSessions, shouldRunSessionCleanup } from '$lib/server/session';
import { httpLogger, logger } from '$lib/server/logger';
import { validateEnv } from '$lib/server/env';
import { registerShutdownHandlers } from '$lib/server/shutdown';
import { formatError, formatErrorMinimal } from '$lib/utils/error';

// Validate environment on startup
validateEnv();

// Register graceful shutdown handlers
registerShutdownHandlers();

const PROTECTED_PREFIXES = ['/calendar', '/food', '/photos', '/trends', '/settings'];

export const handle: Handle = async ({ event, resolve }) => {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Initialise locals
  event.locals.user = null;
  event.locals.children = [];

  const sessionId = event.cookies.get('session_id');
  let shouldExtendSession = false;

  if (sessionId) {
    try {
      // Single optimized query for session + user + children (was 3 queries)
      const result = await validateSessionWithUserAndChildren(sessionId);
      if (result) {
        event.locals.user = result.user;
        event.locals.children = result.children;
        shouldExtendSession = result.shouldExtend;
      }
    } catch (error) {
      // Database error during session validation - log and continue as unauthenticated
      // This allows the app to degrade gracefully when DB is temporarily unavailable
      httpLogger.error(
        {
          requestId,
          err: formatErrorMinimal(error),
        },
        'Session validation failed due to database error'
      );
    }
  }

  const { pathname } = event.url;

  // Protect app routes
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }
  }

  // Redirect authenticated users away from login/register
  if ((pathname === '/login' || pathname === '/register') && event.locals.user) {
    throw redirect(303, '/calendar');
  }

  const response = await resolve(event);

  // Extend session asynchronously after response (doesn't block response)
  if (shouldExtendSession && sessionId) {
    extendSession(sessionId).catch((err) => {
      httpLogger.warn({ requestId, err: err instanceof Error ? err.message : 'Unknown' }, 'Failed to extend session');
    });
  }

  // Probabilistic session cleanup (1% of requests)
  if (shouldRunSessionCleanup()) {
    cleanupExpiredSessions()
      .then((count) => {
        if (count > 0) {
          httpLogger.info({ requestId, deletedSessions: count }, `Session cleanup: deleted ${count} expired sessions`);
        }
      })
      .catch((err) => {
        httpLogger.warn({ requestId, err: err instanceof Error ? err.message : 'Unknown' }, 'Session cleanup failed');
      });
  }

  // Log request completion (skip health checks to avoid log spam)
  if (!pathname.startsWith('/api/health')) {
    const duration = Date.now() - startTime;
    httpLogger.info(
      {
        requestId,
        method: event.request.method,
        path: pathname,
        status: response.status,
        durationMs: duration,
        userId: event.locals.user?.id,
      },
      `${event.request.method} ${pathname} ${response.status} ${duration}ms`
    );
  }

  return response;
};

/**
 * Global error handler for unexpected errors.
 * Logs the error with context and returns a safe error ID to the client.
 */
export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  const errorId = crypto.randomUUID();

  logger.error(
    {
      errorId,
      err: formatError(error),
      path: event.url.pathname,
      method: event.request.method,
      userId: event.locals.user?.id,
      status,
    },
    `Unhandled error: ${message}`
  );

  // Return safe error information to client
  return {
    message: status === 500 ? 'Interní chyba serveru' : message,
    errorId,
  };
};
