import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { PostgresRepository } from '$lib/adapters/postgres';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal } from '$lib/utils/error';
import type { ApiError, ApiSuccess, UpdateFoodLogData, DeleteFoodLogData } from '$lib/types/api';

import { isValidAction } from '$lib/server/validation';

const repository = new PostgresRepository();

export const PUT: RequestHandler = async ({ params, request, locals }) => {
  if (!locals.user) {
    return json(
      { ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError,
      { status: 401 }
    );
  }

  const { id } = params;

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object') {
      return json(
        { ok: false, error: 'Neplatný požadavek', code: 'VALIDATION_ERROR' } satisfies ApiError,
        { status: 400 }
      );
    }

    const { action, notes } = body as Record<string, unknown>;

    if (action !== undefined && !isValidAction(action)) {
      return json(
        { ok: false, error: 'Neplatná akce', code: 'VALIDATION_ERROR' } satisfies ApiError,
        { status: 400 }
      );
    }

    // Get the existing log to verify ownership
    const existingLog = await repository.getFoodLogById(id);

    if (!existingLog) {
      return json(
        { ok: false, error: 'Záznam nenalezen', code: 'NOT_FOUND' } satisfies ApiError,
        { status: 404 }
      );
    }

    // Verify child ownership
    const isOwner = await repository.isChildOwner(locals.user.id, existingLog.childId);
    if (!isOwner) {
      return json(
        { ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError,
        { status: 403 }
      );
    }

    const updatedLog = await repository.updateFoodLog(id, {
      action: isValidAction(action) ? action : undefined,
      notes: typeof notes === 'string' ? notes : undefined,
    });

    return json({ ok: true, data: updatedLog } satisfies ApiSuccess<UpdateFoodLogData>);
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id, logId: id },
      'PUT /api/food-logs/[id] error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
  if (!locals.user) {
    return json(
      { ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError,
      { status: 401 }
    );
  }

  const { id } = params;

  try {
    // Get the log to verify ownership
    const existingLog = await repository.getFoodLogById(id);

    if (!existingLog) {
      return json(
        { ok: false, error: 'Záznam nenalezen', code: 'NOT_FOUND' } satisfies ApiError,
        { status: 404 }
      );
    }

    // Verify child ownership
    const isOwner = await repository.isChildOwner(locals.user.id, existingLog.childId);
    if (!isOwner) {
      return json(
        { ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError,
        { status: 403 }
      );
    }

    await repository.deleteFoodLog(id);

    return new Response(null, { status: 204 });
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id, logId: id },
      'DELETE /api/food-logs/[id] error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};
