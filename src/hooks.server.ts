import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';

import { validateAndExtendSession } from '$lib/server/session';
import { sql } from '$lib/server/db';

const PROTECTED_PREFIXES = ['/calendar', '/food', '/photos', '/trends', '/settings'];

export const handle: Handle = async ({ event, resolve }) => {
  // Initialise locals
  event.locals.user = null;
  event.locals.children = [];

  const sessionId = event.cookies.get('session_id');

  if (sessionId) {
    const session = await validateAndExtendSession(sessionId);
    if (session) {
      const users = await sql`
        SELECT id, email, name, role FROM users WHERE id = ${session.userId}
      `;
      if (users.length > 0) {
        event.locals.user = users[0] as { id: string; email: string; name: string; role: string };

        // Pre-load children for the authenticated user
        const children = await sql`
          SELECT c.id, c.name, c.birth_date, c.created_at, c.updated_at
          FROM children c
          JOIN user_children uc ON uc.child_id = c.id
          WHERE uc.user_id = ${session.userId}
          ORDER BY c.created_at ASC
        `;
        event.locals.children = children.map((r) => ({
          id: r.id as string,
          name: r.name as string,
          birthDate: r.birth_date as string,
          createdAt: r.created_at as string,
          updatedAt: r.updated_at as string,
        }));
      }
    }
  }

  const { pathname } = event.url;

  // Protect app routes
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    if (!event.locals.user) {
      throw redirect(303, '/login');
    }
  }

  // Redirect authenticated users away from login/register
  if ((pathname === '/login' || pathname === '/register') && event.locals.user) {
    throw redirect(303, '/calendar');
  }

  return resolve(event);
};
