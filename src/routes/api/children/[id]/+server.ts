import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { sql } from '$lib/server/db';
import { logAudit } from '$lib/server/audit';
import { logger } from '$lib/server/logger';
import type { UpdateChildRequest, ChildData, DeleteChildData, ApiError, ApiSuccess } from '$lib/types/api';

// Security: Reasonable max name length to prevent abuse
const MAX_NAME_LENGTH = 100;

async function assertOwnership(userId: string, childId: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1 FROM user_children WHERE user_id = ${userId} AND child_id = ${childId}
  `;
  return rows.length > 0;
}

/**
 * Format a date value to ISO date string (YYYY-MM-DD).
 * Handles both Date objects and strings from PostgreSQL.
 */
function formatDateToIso(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  // If already a string, extract date portion if it contains 'T'
  const str = String(value);
  return str.includes('T') ? str.split('T')[0] : str;
}

/**
 * Map a database row to a ChildData.
 */
function mapChildRow(r: Record<string, unknown>): ChildData {
  return {
    id: r.id as string,
    name: r.name as string,
    birthDate: formatDateToIso(r.birth_date),
    createdAt: String(r.created_at),
    updatedAt: String(r.updated_at),
  };
}

/**
 * Validate and extract update child request body.
 */
function parseUpdateChildRequest(body: unknown): { ok: true; data: UpdateChildRequest } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Neplatný požadavek' };
  }

  const { name, birthDate } = body as Record<string, unknown>;
  const data: UpdateChildRequest = {};

  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > MAX_NAME_LENGTH) {
      return { ok: false, error: 'Jméno dítěte nesmí být prázdné (max. 100 znaků)' };
    }
    data.name = name.trim();
  }

  if (birthDate !== undefined) {
    if (typeof birthDate !== 'string' || isNaN(Date.parse(birthDate))) {
      return { ok: false, error: 'Neplatné datum narození' };
    }
    data.birthDate = birthDate;
  }

  if (Object.keys(data).length === 0) {
    return { ok: false, error: 'Žádné změny' };
  }

  return { ok: true, data };
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  try {
    const owns = await assertOwnership(locals.user.id, params.id);
    if (!owns) {
      return json({ ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    const parseResult = parseUpdateChildRequest(body);

    if (!parseResult.ok) {
      return json({ ok: false, error: parseResult.error, code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
    }

    const { name, birthDate } = parseResult.data;

    let children;
    if (name !== undefined && birthDate !== undefined) {
      children = await sql`
        UPDATE children SET name = ${name}, birth_date = ${birthDate}
        WHERE id = ${params.id}
        RETURNING id, name, birth_date, created_at, updated_at
      `;
    } else if (name !== undefined) {
      children = await sql`
        UPDATE children SET name = ${name}
        WHERE id = ${params.id}
        RETURNING id, name, birth_date, created_at, updated_at
      `;
    } else {
      children = await sql`
        UPDATE children SET birth_date = ${birthDate as string}
        WHERE id = ${params.id}
        RETURNING id, name, birth_date, created_at, updated_at
      `;
    }

    // Security: Audit child update
    await logAudit('child_updated', {
      userId: locals.user.id,
      details: { childId: params.id, updatedFields: Object.keys(parseResult.data) },
    });

    return json({ ok: true, data: mapChildRow(children[0]) } satisfies ApiSuccess<ChildData>);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? { message: error.message, name: error.name } : { message: 'Unknown error' }, userId: locals.user.id, childId: params.id },
      'PUT /api/children/[id] error'
    );
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  try {
    const owns = await assertOwnership(locals.user.id, params.id);
    if (!owns) {
      return json({ ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError, { status: 403 });
    }

    await sql`DELETE FROM children WHERE id = ${params.id}`;

    // Security: Audit child deletion
    await logAudit('child_deleted', {
      userId: locals.user.id,
      details: { childId: params.id },
    });

    return json({ ok: true, data: {} } satisfies ApiSuccess<DeleteChildData>);
  } catch (error) {
    logger.error(
      { err: error instanceof Error ? { message: error.message, name: error.name } : { message: 'Unknown error' }, userId: locals.user.id, childId: params.id },
      'DELETE /api/children/[id] error'
    );
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};
