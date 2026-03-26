import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { sql } from '$lib/server/db';
import { verifyPassword } from '$lib/server/auth';
import { createSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Neplatný požadavek' }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return json({ error: 'E-mail a heslo jsou povinné' }, { status: 400 });
  }

  const users = await sql`
    SELECT id, email, name, role, password_hash FROM users WHERE email = ${email.toLowerCase()}
  `;

  if (users.length === 0) {
    await logAudit('login_failure', {
      details: { email },
      ipAddress: getClientAddress(),
    });
    return json({ error: 'Nesprávné přihlašovací údaje' }, { status: 401 });
  }

  const user = users[0];
  const valid = await verifyPassword(password, user.password_hash as string);

  if (!valid) {
    await logAudit('login_failure', {
      userId: user.id as string,
      details: { email },
      ipAddress: getClientAddress(),
    });
    return json({ error: 'Nesprávné přihlašovací údaje' }, { status: 401 });
  }

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

  return json({ id: user.id, email: user.email, name: user.name, role: user.role });
};
