import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { deleteSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';

export const POST: RequestHandler = async ({ cookies, locals }) => {
  const sessionId = cookies.get('session_id');

  if (sessionId) {
    await deleteSession(sessionId);
    cookies.set('session_id', '', {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 0,
    });
  }

  if (locals.user) {
    await logAudit('logout', { userId: locals.user.id });
  }

  return json({ ok: true });
};
