import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { authService } from '$lib/server/repository';
import { createSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';
import { authLogger } from '$lib/server/logger';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  resetFailedLogin,
} from '$lib/server/rate-limit';
import { SESSION } from '$lib/config/constants';
import { formatErrorMinimal } from '$lib/utils/error';
import type { LoginRequest, LoginData, ApiError, RateLimitedError, ApiSuccess } from '$lib/types/api';

/**
 * Parse login request body (HTTP layer validation only).
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
      return json({ ok: false, error: 'E-mail a heslo jsou povinné', code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
    }

    const { email, password } = loginRequest;

    // Security: Check rate limit before attempting authentication
    const rateLimitResult = await checkLoginRateLimit(email);
    if (!rateLimitResult.ok) {
      await logAudit('login_failure', {
        details: { email, reason: 'rate_limited' },
        ipAddress: getClientAddress(),
      });
      return json(
        {
          ok: false,
          error: 'Příliš mnoho pokusů. Zkuste to znovu za několik minut.',
          code: 'RATE_LIMITED',
          retryAfterSeconds: rateLimitResult.retryAfterSeconds,
        } satisfies RateLimitedError,
        { status: 429 }
      );
    }

    // Delegate to auth service for credential validation
    const result = await authService.validateCredentials(email, password);

    if (!result.ok) {
      if (result.error.code === 'USER_NOT_FOUND') {
        await logAudit('login_failure', {
          details: { email, reason: 'user_not_found' },
          ipAddress: getClientAddress(),
        });
      } else if (result.error.userId) {
        // Security: Record failed attempt for rate limiting
        // userId is included in error to avoid re-fetching user
        await recordFailedLogin(result.error.userId);
        await logAudit('login_failure', {
          userId: result.error.userId,
          details: { email, reason: 'invalid_password' },
          ipAddress: getClientAddress(),
        });
      }

      return json({ ok: false, error: 'Nesprávné přihlašovací údaje', code: 'INVALID_CREDENTIALS' } satisfies ApiError, { status: 401 });
    }

    const user = result.data;

    // Security: Reset failed login counter on successful login
    await resetFailedLogin(user.id);

    const sessionId = await createSession(user.id);
    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * SESSION.DURATION_DAYS,
    });

    await logAudit('login_success', {
      userId: user.id,
      details: { email },
      ipAddress: getClientAddress(),
    });

    return json({
      ok: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'parent',
      },
    } satisfies ApiSuccess<LoginData>);
  } catch (error) {
    authLogger.error({ err: formatErrorMinimal(error) }, 'Login endpoint error');
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};
