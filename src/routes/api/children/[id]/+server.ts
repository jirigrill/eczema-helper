import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { sql } from '$lib/server/db';

async function assertOwnership(userId: string, childId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM user_children WHERE user_id = ${userId} AND child_id = ${childId}
  `;
  return rows.length > 0;
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const owns = await assertOwnership(locals.user.id, params.id);
  if (!owns) {
    return json({ error: 'Přístup odepřen' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return json({ error: 'Neplatný požadavek' }, { status: 400 });
  }

  const { name, birthDate } = body as Record<string, unknown>;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return json({ error: 'Jméno dítěte nesmí být prázdné' }, { status: 400 });
  }
  if (birthDate !== undefined && (typeof birthDate !== 'string' || isNaN(Date.parse(birthDate)))) {
    return json({ error: 'Neplatné datum narození' }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = (name as string).trim();
  if (birthDate !== undefined) updates.birthDate = birthDate;

  if (Object.keys(updates).length === 0) {
    return json({ error: 'Žádné změny' }, { status: 400 });
  }

  let children;
  if (updates.name !== undefined && updates.birthDate !== undefined) {
    children = await sql`
      UPDATE children SET name = ${updates.name as string}, birth_date = ${updates.birthDate as string}
      WHERE id = ${params.id}
      RETURNING id, name, birth_date, created_at, updated_at
    `;
  } else if (updates.name !== undefined) {
    children = await sql`
      UPDATE children SET name = ${updates.name as string}
      WHERE id = ${params.id}
      RETURNING id, name, birth_date, created_at, updated_at
    `;
  } else {
    children = await sql`
      UPDATE children SET birth_date = ${updates.birthDate as string}
      WHERE id = ${params.id}
      RETURNING id, name, birth_date, created_at, updated_at
    `;
  }

  const child = children[0];
  return json({
    id: child.id,
    name: child.name,
    birthDate: child.birth_date,
    createdAt: child.created_at,
    updatedAt: child.updated_at,
  });
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return json({ error: 'Nepřihlášen' }, { status: 401 });
  }

  const owns = await assertOwnership(locals.user.id, params.id);
  if (!owns) {
    return json({ error: 'Přístup odepřen' }, { status: 403 });
  }

  await sql`DELETE FROM children WHERE id = ${params.id}`;

  return new Response(null, { status: 204 });
};
