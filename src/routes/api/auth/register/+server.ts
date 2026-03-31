import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

import { authService } from '$lib/server/repository';
import { createSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';
import { authLogger } from '$lib/server/logger';
import { SESSION } from '$lib/config/constants';
import { formatErrorMinimal } from '$lib/utils/error';
import type { RegisterRequest, RegisterData, ApiError, ApiSuccess } from '$lib/types/api';

/**
 * Parse and validate registration request body (HTTP layer validation only).
 */
function parseRegisterRequest(body: unknown): RegisterRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const { email, password, name } = body as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string' || typeof name !== 'string') {
    return null;
  }

  return { email, password, name };
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    // Security: Check REGISTRATION_ENABLED flag to lock down registration after initial setup
    if (env.REGISTRATION_ENABLED === 'false') {
      return json({ ok: false, error: 'Registrace je deaktivována', code: 'FORBIDDEN' } satisfies ApiError, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const registerRequest = parseRegisterRequest(body);

    if (!registerRequest) {
      return json({ ok: false, error: 'Neplatný požadavek', code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
    }

    const { email, password, name } = registerRequest;

    // Delegate to auth service for business logic
    const result = await authService.registerUser(email, password, name);

    if (!result.ok) {
      switch (result.error.code) {
        case 'EMAIL_EXISTS':
          return json({ ok: false, error: 'Účet s tímto e-mailem již existuje', code: 'CONFLICT' } satisfies ApiError, { status: 409 });
        case 'VALIDATION_ERROR':
          return json({ ok: false, error: result.error.message, code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
      }
    }

    const user = result.data;

    const sessionId = await createSession(user.id);
    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * SESSION.DURATION_DAYS,
    });

    await logAudit('registration', {
      userId: user.id,
      details: { email: user.email },
      ipAddress: getClientAddress(),
    });

    return json(
      {
        ok: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: 'parent',
        },
      } satisfies ApiSuccess<RegisterData>,
      { status: 201 }
    );
  } catch (error) {
    authLogger.error({ err: formatErrorMinimal(error) }, 'Registration endpoint error');
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};
