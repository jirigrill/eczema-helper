import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { sql } from '$lib/server/db';
import { verifyPassword } from '$lib/server/auth';
import { createSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';
import { authLogger } from '$lib/server/logger';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetFailedLogin,
} from '$lib/server/rate-limit';
import type { LoginRequest, LoginResponse, ApiError, RateLimitedError } from '$lib/types/api';

// Security: Max password length to prevent bcrypt DoS
const MAX_PASSWORD_LENGTH = 72;

/**
 * Validate and extract login request body.
 * Returns null if validation fails.
 */
function parseLoginRequest(body: unknown): LoginRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return null;
  }

  return { email, password };
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    const body = await request.json().catch(() => null);
    const loginRequest = parseLoginRequest(body);

    if (!loginRequest) {
      return json({ error: 'E-mail a heslo jsou povinné' } satisfies ApiError, { status: 400 });
    }

    const { email, password } = loginRequest;

    // Security: Prevent bcrypt DoS via extremely long passwords
    if (password.length > MAX_PASSWORD_LENGTH) {
      return json({ error: 'Nesprávné přihlašovací údaje' } satisfies ApiError, { status: 401 });
    }

    // Security: Check rate limit before attempting authentication
    const rateLimitResult = await checkLoginRateLimit(email);
    if (!rateLimitResult.ok) {
      await logAudit('login_failure', {
        details: { email, reason: 'rate_limited' },
        ipAddress: getClientAddress(),
      });
      return json(
        {
          error: 'Příliš mnoho pokusů. Zkuste to znovu za několik minut.',
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        } satisfies RateLimitedError,
        { status: 429 }
      );
    }

    const users = await sql`
      SELECT id, email, name, role, password_hash FROM users WHERE email = ${email.toLowerCase()}
    `;

    if (users.length === 0) {
      // Security: Perform dummy password verification to prevent timing attacks
      // that could reveal whether an email is registered
      await verifyPassword(password, '$2b$12$dummyhashtopreventtimingattacks');
      await logAudit('login_failure', {
        details: { email, reason: 'user_not_found' },
        ipAddress: getClientAddress(),
      });
      // Security: Generic error to prevent user enumeration
      return json({ error: 'Nesprávné přihlašovací údaje' } satisfies ApiError, { status: 401 });
    }

    const user = users[0];
    const valid = await verifyPassword(password, user.password_hash as string);

    if (!valid) {
      // Security: Record failed attempt for rate limiting
      await recordFailedLogin(user.id as string);
      await logAudit('login_failure', {
        userId: user.id as string,
        details: { email, reason: 'invalid_password' },
        ipAddress: getClientAddress(),
      });
      return json({ error: 'Nesprávné přihlašovací údaje' } satisfies ApiError, { status: 401 });
    }

    // Security: Reset failed login counter on successful login
    await resetFailedLogin(user.id as string);

    const sessionId = await createSession(user.id as string);
    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    await logAudit('login_success', {
      userId: user.id as string,
      details: { email },
      ipAddress: getClientAddress(),
    });

    return json({
      id: user.id as string,
      email: user.email as string,
      name: user.name as string,
      role: 'parent',
    } satisfies LoginResponse);
  } catch (error) {
    authLogger.error(
      { err: error instanceof Error ? { message: error.message, name: error.name } : { message: 'Unknown error' } },
      'Login endpoint error'
    );
    return json({ error: 'Interní chyba serveru' } satisfies ApiError, { status: 500 });
  }
};
