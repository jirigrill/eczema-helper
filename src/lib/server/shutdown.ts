import { closeDb } from './db';
import { logger } from './logger';

let isShuttingDown = false;

/**
 * Graceful shutdown handler.
 * Closes database connections and other resources before exiting.
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn({ signal }, 'Shutdown already in progress, ignoring signal');
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  try {
    // Close database connections
    await closeDb();

    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, 'Error during graceful shutdown');
    process.exit(1);
  }
}

/**
 * Register shutdown handlers for SIGTERM and SIGINT.
 * Should be called once during application startup.
 */
export function registerShutdownHandlers(): void {
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle uncaught exceptions and unhandled rejections
  process.on('uncaughtException', (error) => {
    logger.fatal({ err: error }, 'Uncaught exception - shutting down');
    shutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection - shutting down');
    shutdown('unhandledRejection');
  });

  logger.info('Shutdown handlers registered');
}
