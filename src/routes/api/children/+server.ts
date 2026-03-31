import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { childService } from '$lib/server/repository';
import { logAudit } from '$lib/server/audit';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal } from '$lib/utils/error';
import type { CreateChildRequest, ChildData, GetChildrenData, ApiError, ApiSuccess } from '$lib/types/api';

/**
 * Parse create child request body (HTTP layer validation only).
 */
function parseCreateChildRequest(body: unknown): CreateChildRequest | null {
  if (!body || typeof body !== 'object') {
    return null;
  }

  const { name, birthDate } = body as Record<string, unknown>;

  if (typeof name !== 'string' || typeof birthDate !== 'string') {
    return null;
  }

  return { name, birthDate };
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  try {
    const result = await childService.getChildrenForUser(locals.user.id);

    if (!result.ok) {
      return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
    }

    const data: GetChildrenData = result.data.map((child) => ({
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    }));

    return json({ ok: true, data } satisfies ApiSuccess<GetChildrenData>);
  } catch (error) {
    logger.error({ err: formatErrorMinimal(error), userId: locals.user.id }, 'GET /api/children error');
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => null);
    const createRequest = parseCreateChildRequest(body);

    if (!createRequest) {
      return json({ ok: false, error: 'Neplatný požadavek', code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
    }

    const { name, birthDate } = createRequest;

    // Delegate to child service for business logic
    const result = await childService.createChild(locals.user.id, name, birthDate);

    if (!result.ok) {
      switch (result.error.code) {
        case 'CHILD_LIMIT_REACHED':
          return json({ ok: false, error: 'Tato aplikace podporuje pouze jedno dítě', code: 'CHILD_LIMIT_REACHED' } satisfies ApiError, { status: 400 });
        case 'VALIDATION_ERROR':
          return json({ ok: false, error: result.error.message, code: 'VALIDATION_ERROR' } satisfies ApiError, { status: 400 });
        default:
          return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
      }
    }

    const child = result.data;

    // Security: Audit child creation
    await logAudit('child_created', {
      userId: locals.user.id,
      details: { childId: child.id },
    });

    const data: ChildData = {
      id: child.id,
      name: child.name,
      birthDate: child.birthDate,
      createdAt: child.createdAt,
      updatedAt: child.updatedAt,
    };

    return json({ ok: true, data } satisfies ApiSuccess<ChildData>, { status: 201 });
  } catch (error) {
    logger.error({ err: formatErrorMinimal(error), userId: locals.user.id }, 'POST /api/children error');
    return json({ ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError, { status: 500 });
  }
};
