import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { sql } from '$lib/server/db';

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const children = await sql`
    SELECT c.id, c.name, c.birth_date, c.created_at, c.updated_at
    FROM children c
    JOIN user_children uc ON uc.child_id = c.id
    WHERE uc.user_id = ${locals.user.id}
    ORDER BY c.created_at ASC
  `;

  return json(
    children.map((r) => ({
      id: r.id,
      name: r.name,
      birthDate: r.birth_date,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  );
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Neplatný požadavek' }, { status: 400 });
  }

  const { name, birthDate } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0) {
    return json({ error: 'Jméno dítěte je povinné' }, { status: 400 });
  }
  if (typeof birthDate !== 'string' || isNaN(Date.parse(birthDate))) {
    return json({ error: 'Neplatné datum narození' }, { status: 400 });
  }

  const children = await sql`
    INSERT INTO children (name, birth_date)
    VALUES (${name.trim()}, ${birthDate})
    RETURNING id, name, birth_date, created_at, updated_at
  `;
  const child = children[0];

  await sql`
    INSERT INTO user_children (user_id, child_id)
    VALUES (${locals.user.id}, ${child.id})
  `;

  return json(
    {
      id: child.id,
      name: child.name,
      birthDate: child.birth_date,
      createdAt: child.created_at,
      updatedAt: child.updated_at,
    },
    { status: 201 }
  );
};
