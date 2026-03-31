/**
 * Application-wide configuration constants.
 *
 * These replace magic numbers scattered across the codebase.
 * All configuration values are defined here for easy discovery and modification.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Authentication & Security
// ─────────────────────────────────────────────────────────────────────────────

export const AUTH = {
  /** bcrypt salt rounds for password hashing (12 is industry standard) */
  BCRYPT_SALT_ROUNDS: 12,

  /** Maximum password length (bcrypt truncates at 72 bytes, prevents DoS) */
  MAX_PASSWORD_LENGTH: 72,

  /** Failed login attempts before account lockout */
  MAX_LOGIN_ATTEMPTS: 5,

  /** Minutes to lock account after max failed attempts */
  LOCKOUT_DURATION_MINUTES: 15,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────────────────────────────────────

export const SESSION = {
  /** Session duration in days (sliding expiry) */
  DURATION_DAYS: 30,

  /** Days remaining before session auto-extension triggers */
  EXTENSION_THRESHOLD_DAYS: 15,

  /** Probability of session cleanup on each request (1% = 0.01) */
  CLEANUP_PROBABILITY: 0.01,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Validation Limits
// ─────────────────────────────────────────────────────────────────────────────

export const VALIDATION = {
  /** Maximum length for child/user names */
  MAX_NAME_LENGTH: 100,

  /** Maximum length for note fields */
  MAX_NOTE_LENGTH: 1000,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Database
// ─────────────────────────────────────────────────────────────────────────────

export const DATABASE = {
  /** Maximum connections in pool */
  MAX_CONNECTIONS: 10,

  /** Idle connection timeout in seconds */
  IDLE_TIMEOUT_SECONDS: 30,

  /** Connection timeout in seconds */
  CONNECT_TIMEOUT_SECONDS: 10,

  /** Maximum connection lifetime in seconds (30 minutes) */
  MAX_LIFETIME_SECONDS: 60 * 30,

  /** Default query timeout in milliseconds */
  QUERY_TIMEOUT_MS: 5000,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// API Error Codes
// ─────────────────────────────────────────────────────────────────────────────

export const API_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  RATE_LIMITED: 'RATE_LIMITED',
  CHILD_LIMIT_REACHED: 'CHILD_LIMIT_REACHED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = typeof API_ERROR_CODES[keyof typeof API_ERROR_CODES];
