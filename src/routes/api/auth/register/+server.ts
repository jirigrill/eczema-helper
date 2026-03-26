import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { sql } from '$lib/server/db';
import { hashPassword } from '$lib/server/auth';
import { createSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Neplatný požadavek' }, { status: 400 });
  }

  const { email, password, name } = body as Record<string, unknown>;

  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json({ error: 'Neplatný e-mail' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return json({ error: 'Heslo musí mít alespoň 8 znaků' }, { status: 400 });
  }
  if (typeof name !== 'string' || name.trim().length === 0) {
    return json({ error: 'Jméno je povinné' }, { status: 400 });
  }

  const existing = await sql`SELECT id FROM users WHERE email = ${email.toLowerCase()}`;
  if (existing.length > 0) {
    return json({ error: 'Účet s tímto e-mailem již existuje' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const users = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email.toLowerCase()}, ${name.trim()}, ${passwordHash})
    RETURNING id, email, name, role, created_at
  `;
  const user = users[0];

  const sessionId = await createSession(user.id as string);
  cookies.set('session_id', sessionId, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
  });

  await logAudit('registration', {
    userId: user.id as string,
    details: { email: user.email },
    ipAddress: getClientAddress(),
  });

  return json(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    { status: 201 }
  );
};
