import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { childService } from '$lib/server/repository';
import { logAudit } from '$lib/server/audit';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal, isValidUuid } from '$lib/utils';
import type { UpdateChildRequest, ChildData, DeleteChildData, ApiError, ApiSuccess } from '$lib/types/api';

/**
 * Parse update child request body (HTTP layer validation only).
 */
function parseUpdateChildRequest(body: unknown): UpdateChildRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const { name, birthDate } = body as Record<string, unknown>;
  const data: UpdateChildRequest = {};

  if (name !== undefined) {
    if (typeof name !== 'string') return null;
    data.name = name;
  }

  if (birthDate !== undefined) {
    if (typeof birthDate !== 'string') return null;
    data.birthDate = birthDate;
  }

  return data;
}

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  // Validate UUID format before database query
  if (!isValidUuid(params.id)) {
    return json({ ok: false, error: 'Neplatné ID', code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => null);
    const updateRequest = parseUpdateChildRequest(body);

    if (!updateRequest) {
      return json({ ok: false, error: 'Neplatný požadavek', code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
    }

    // Delegate to child service for business logic
    const result = await childService.updateChild(locals.user.id, params.id, updateRequest);

    if (!result.ok) {
      switch (result.error.code) {
        case 'FORBIDDEN':
          return json({ ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError, { status: 403 });
        case 'VALIDATION_ERROR':
          return json({ ok: false, error: result.error.message, code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
        default:
          return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
      }
    }

    const child = result.data;

    // Security: Audit child update
    await logAudit('child_updated', {
      userId: locals.user.id,
      details: { childId: params.id, updatedFields: Object.keys(updateRequest) },
    });

    const data: ChildData = {
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    };

    return json({ ok: true, data } satisfies ApiSuccess<ChildData>);
  } catch (error) {
    logger.error({ err: formatErrorMinimal(error), userId: locals.user.id, childId: params.id }, 'PUT /api/children/[id] error');
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  // Validate UUID format before database query
  if (!isValidUuid(params.id)) {
    return json({ ok: false, error: 'Neplatné ID', code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
  }

  try {
    // Delegate to child service for business logic
    const result = await childService.deleteChild(locals.user.id, params.id);

    if (!result.ok) {
      switch (result.error.code) {
        case 'FORBIDDEN':
          return json({ ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError, { status: 403 });
        default:
          return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
      }
    }

    // Security: Audit child deletion
    await logAudit('child_deleted', {
      userId: locals.user.id,
      details: { childId: params.id },
    });

    return json({ ok: true, data: {} } satisfies ApiSuccess<DeleteChildData>);
  } catch (error) {
    logger.error({ err: formatErrorMinimal(error), userId: locals.user.id, childId: params.id }, 'DELETE /api/children/[id] error');
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};
