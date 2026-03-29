import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { env } from '$env/dynamic/private';

import { sql } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';
import { createSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';
import { authLogger } from '$lib/server/logger';
import type { RegisterRequest, RegisterData, ApiError, ApiSuccess } from '$lib/types/api';

// Security: Max password length to prevent bcrypt DoS and truncation issues
const MAX_PASSWORD_LENGTH = 72;
// Security: Reasonable max name length to prevent abuse
const MAX_NAME_LENGTH = 100;

/**
 * Validate and extract registration request body.
 */
function parseRegisterRequest(body: unknown): { ok: true; data: RegisterRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Neplatný požadavek' };
  }

  const { email, password, name } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Neplatný e-mail' };
  }

  if (typeof password !== 'string' || password.length < 8 || password.length > MAX_PASSWORD_LENGTH) {
    return { ok: false, error: 'Heslo musí mít 8-72 znaků' };
  }

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > MAX_NAME_LENGTH) {
    return { ok: false, error: 'Jméno je povinné (max. 100 znaků)' };
  }

  return { ok: true, data: { email, password, name: name.trim() } };
}

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  try {
    // Security: Check REGISTRATION_ENABLED flag to lock down registration after initial setup
    if (env.REGISTRATION_ENABLED === 'false') {
      return json({ ok: false, error: 'Registrace je deaktivována', code: 'FORBIDDEN' } satisfies ApiError, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parseResult = parseRegisterRequest(body);

    if (!parseResult.ok) {
      return json({ ok: false, error: parseResult.error, code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
    }

    const { email, password, name } = parseResult.data;

    const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
    if (existing.length > 0) {
      return json({ ok: false, error: 'Účet s tímto e-mailem již existuje', code: 'CONFLICT' } satisfies ApiError, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const users = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email.toLowerCase()}, ${name}, ${passwordHash})
      RETURNING id, email, name, role, created_at
    `;
    const user = users[0];

    const sessionId = await createSession(user.id as string);
    cookies.set('session_id', sessionId, {
      path: '/',
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
    });

    await logAudit('registration', {
      userId: user.id as string,
      details: { email: user.email },
      ipAddress: getClientAddress(),
    });

    return json(
      {
        ok: true,
        data: {
          id: user.id as string,
          email: user.email as string,
          name: user.name as string,
          role: 'parent',
        },
      } satisfies ApiSuccess<RegisterData>,
      { status: 201 }
    );
  } catch (error) {
    authLogger.error(
      { err: error instanceof Error ? { message: error.message, name: error.name } : { message: 'Unknown error' } },
      'Registration endpoint error'
    );
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};
