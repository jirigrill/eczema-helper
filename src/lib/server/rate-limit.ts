import { sql } from './db';

// Security: Rate limiting configuration
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

type RateLimitResult =
  | { ok: true }
  | { ok: false; error: 'locked'; retryAfterSeconds: number };

/**
 * Check if login attempt is allowed for the given email.
 * Security: Prevents brute-force attacks by locking accounts after repeated failures.
 * Gracefully degrades if migration 003 hasn't been run yet.
 */
export async function checkLoginRateLimit(email: string): Promise<RateLimitResult> {
  const normalizedEmail = email.toLowerCase();

  try {
    // Check if there's a user with this email and if they're locked
    const rows = await sql`
      SELECT id, failed_login_attempts, locked_until
      FROM users
      WHERE email = ${normalizedEmail}
    `;

    if (rows.length === 0) {
      // User doesn't exist - allow the attempt (will fail on credentials)
      // Security: Don't reveal whether email exists
      return { ok: true };
    }

    const user = rows[0];
    const lockedUntil = user.locked_until as Date | null;

    if (lockedUntil && lockedUntil > new Date()) {
      const retryAfterSeconds = Math.ceil((lockedUntil.getTime() - Date.now()) / 1000);
      return { ok: false, error: 'locked', retryAfterSeconds };
    }

    return { ok: true };
  } catch {
    // Columns don't exist yet (migration 003 not run) - allow login without rate limiting
    return { ok: true };
  }
}

/**
 * Record a failed login attempt for the given user ID.
 * Security: Implements progressive lockout after MAX_LOGIN_ATTEMPTS failures.
 * Gracefully degrades if migration 003 hasn't been run yet.
 */
export async function recordFailedLogin(userId: string): Promise<void> {
  try {
    // Increment failed attempts and check if we need to lock
    const rows = await sql`
      UPDATE users
      SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
      WHERE id = ${userId}
      RETURNING failed_login_attempts
    `;

    if (rows.length > 0) {
      const attempts = rows[0].failed_login_attempts as number;
      if (attempts >= MAX_LOGIN_ATTEMPTS) {
        const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
        await sql`
          UPDATE users SET locked_until = ${lockUntil} WHERE id = ${userId}
        `;
      }
    }
  } catch {
    // Columns don't exist yet (migration 003 not run) - skip rate limiting
  }
}

/**
 * Reset failed login attempts after successful login.
 * Gracefully degrades if migration 003 hasn't been run yet.
 */
export async function resetFailedLogin(userId: string): Promise<void> {
  try {
    await sql`
      UPDATE users
      SET failed_login_attempts = 0, locked_until = NULL
      WHERE id = ${userId}
    `;
  } catch {
    // Columns don't exist yet (migration 003 not run) - skip
  }
}
