import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { deleteSession } from '$lib/server/session';
import { logAudit } from '$lib/server/audit';
import type { LogoutData, ApiSuccess } from '$lib/types/api';

export const POST: RequestHandler = async ({ cookies, locals }) => {
  const sessionId = cookies.get('session_id');

  if (sessionId) {
    await deleteSession(sessionId);
    // Security: Use consistent cookie flags with login (secure based on environment)
    cookies.set('session_id', '', {
      path: '/',
      httpOnly: true,
      secure: !import.meta.env.DEV,
      sameSite: 'lax',
      maxAge: 0,
    });
  }

  if (locals.user) {
    await logAudit('logout', { userId: locals.user.id });
  }

  return json({ ok: true, data: {} } satisfies ApiSuccess<LogoutData>);
};
