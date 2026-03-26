import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isDev ? 'debug' : 'info'),
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Redact sensitive fields to prevent accidental exposure
  redact: {
    paths: ['password', 'passwordHash', 'sessionId', 'apiKey', 'token', '*.password', '*.passwordHash'],
    censor: '[REDACTED]',
  },
});

// Create child loggers for different subsystems
export const dbLogger = logger.child({ subsystem: 'database' });
export const authLogger = logger.child({ subsystem: 'auth' });
export const auditLogger = logger.child({ subsystem: 'audit' });
export const httpLogger = logger.child({ subsystem: 'http' });
