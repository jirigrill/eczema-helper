import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { sql } from '$lib/server/db';
import { logAudit } from '$lib/server/audit';
import { logger } from '$lib/server/logger';
import type { CreateChildRequest, ChildData, GetChildrenData, ApiError, ApiSuccess } from '$lib/types/api';

// Security: Reasonable max name length to prevent abuse
const MAX_NAME_LENGTH = 100;

/**
 * Map a database row to a ChildData.
 */
function mapChildRow(r: Record<string, unknown>): ChildData {
  return {
    id: r.id as string,
    name: r.name as string,
    birthDate: r.birth_date as string,
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/**
 * Validate and extract create child request body.
 */
function parseCreateChildRequest(body: unknown): { ok: true; data: CreateChildRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Neplatný požadavek' };
  }

  const { name, birthDate } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > MAX_NAME_LENGTH) {
    return { ok: false, error: 'Jméno dítěte je povinné (max. 100 znaků)' };
  }

  if (typeof birthDate !== 'string' || isNaN(Date.parse(birthDate))) {
    return { ok: false, error: 'Neplatné datum narození' };
  }

  return { ok: true, data: { name: name.trim(), birthDate } };
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  try {
    const children = await sql`
      SELECT c.id, c.name, c.birth_date, c.created_at, c.updated_at
      FROM children c
      JOIN user_children uc ON uc.child_id = c.id
      WHERE uc.user_id = ${locals.user.id}
      ORDER BY c.created_at ASC
    `;

    return json({ ok: true, data: children.map(mapChildRow) } satisfies ApiSuccess<GetChildrenData>);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? { message: error.message, name: error.name } : { message: 'Unknown error' }, userId: locals.user.id },
      'GET /api/children error'
    );
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const parseResult = parseCreateChildRequest(body);

    if (!parseResult.ok) {
      return json({ ok: false, error: parseResult.error, code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
    }

    const { name, birthDate } = parseResult.data;

    const children = await sql`
      INSERT INTO children (name, birth_date)
      VALUES (${name}, ${birthDate})
      RETURNING id, name, birth_date, created_at, updated_at
    `;
    const child = children[0];

    await sql`
      INSERT INTO user_children (user_id, child_id)
      VALUES (${locals.user.id}, ${child.id})
    `;

    // Security: Audit child creation
    await logAudit('child_created', {
      userId: locals.user.id,
      details: { childId: child.id },
    });

    return json({ ok: true, data: mapChildRow(child) } satisfies ApiSuccess<ChildData>, { status: 201 });
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? { message: error.message, name: error.name } : { message: 'Unknown error' }, userId: locals.user.id },
      'POST /api/children error'
    );
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};
