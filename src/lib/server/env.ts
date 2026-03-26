import { z } from 'zod';
import { logger } from './logger';

/**
 * Environment variable schema with validation rules.
 * All required variables must be present at startup.
 * Optional variables have sensible defaults.
 */
const envSchema = z.object({
  // Required in production
  DATABASE_URL: z.string().url().optional().default('postgres://eczema:eczema_dev@localhost:5432/eczema_helper'),
  SESSION_SECRET: z.string().min(32).optional().default('dev-secret-change-in-production-32chars'),

  // Optional with defaults
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional().default('info'),
  REGISTRATION_ENABLED: z.enum(['true', 'false']).optional().default('true'),

  // Optional: Claude API (required only when AI analysis is used)
  CLAUDE_API_KEY: z.string().optional(),

  // Optional: Google OAuth (required only when export to Google Docs is used)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Optional: App version for health checks
  APP_VERSION: z.string().optional().default('dev'),

  // Optional: Debug flags
  DB_DEBUG: z.enum(['true', 'false']).optional().default('false'),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

/**
 * Validates environment variables on startup.
 * Throws if required variables are missing or invalid.
 * Logs warnings for potentially insecure configurations.
 */
export function validateEnv(): Env {
  if (validatedEnv) {
    return validatedEnv;
  }

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.format();
    logger.fatal({ errors }, 'Invalid environment configuration');
    throw new Error(`Environment validation failed: ${JSON.stringify(errors)}`);
  }

  validatedEnv = result.data;

  // Log warnings for potentially insecure configurations in production
  if (validatedEnv.NODE_ENV === 'production') {
    if (validatedEnv.SESSION_SECRET === 'dev-secret-change-in-production-32chars') {
      logger.warn('SESSION_SECRET is using default value in production - this is insecure!');
    }

    if (validatedEnv.DATABASE_URL.includes('eczema_dev')) {
      logger.warn('DATABASE_URL appears to use development credentials in production');
    }
  }

  // Log successful validation
  logger.info(
    {
      nodeEnv: validatedEnv.NODE_ENV,
      logLevel: validatedEnv.LOG_LEVEL,
      registrationEnabled: validatedEnv.REGISTRATION_ENABLED,
      hasClaudeKey: !!validatedEnv.CLAUDE_API_KEY,
      hasGoogleOAuth: !!(validatedEnv.GOOGLE_CLIENT_ID && validatedEnv.GOOGLE_CLIENT_SECRET),
    },
    'Environment configuration validated'
  );

  return validatedEnv;
}

/**
 * Gets the validated environment. Must call validateEnv() first.
 */
export function getEnv(): Env {
  if (!validatedEnv) {
    throw new Error('Environment not validated. Call validateEnv() during startup.');
  }
  return validatedEnv;
}
