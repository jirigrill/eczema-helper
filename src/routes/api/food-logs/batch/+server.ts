import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { PostgresRepository } from '$lib/adapters/postgres';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal } from '$lib/utils/error';
import type { ApiError, ApiSuccess, BatchSyncFoodLogsData } from '$lib/types/api';
import type { FoodLog } from '$lib/domain/models';

import { isValidAction } from '$lib/server/validation';

const repository = new PostgresRepository();

function isValidFoodLog(log: unknown): log is FoodLog {
  if (!log || typeof log !== 'object') return false;

  const l = log as Record<string, unknown>;
  return (
    typeof l.id === 'string' &&
    typeof l.childId === 'string' &&
    typeof l.date === 'string' &&
    typeof l.categoryId === 'string' &&
    isValidAction(l.action) &&
    typeof l.createdBy === 'string'
  );
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json(
      { ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError,
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== 'object' || !Array.isArray((body as Record<string, unknown>).logs)) {
      return json(
        { ok: false, error: 'Neplatný požadavek', code: 'VALIDATION_ERROR' } satisfies ApiError,
        { status: 400 }
      );
    }

    const { logs } = body as { logs: unknown[] };

    // Validate all logs
    const validLogs: FoodLog[] = [];
    for (const log of logs) {
      if (!isValidFoodLog(log)) {
        return json(
          { ok: false, error: 'Neplatný záznam v dávce', code: 'VALIDATION_ERROR' } satisfies ApiError,
          { status: 400 }
        );
      }
      validLogs.push(log);
    }

    // Verify ownership for all unique childIds
    const childIds = [...new Set(validLogs.map((l) => l.childId))];
    for (const childId of childIds) {
      const isOwner = await repository.isChildOwner(locals.user.id, childId);
      if (!isOwner) {
        return json(
          { ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError,
          { status: 403 }
        );
      }
    }

    // Upsert all logs
    let syncedCount = 0;
    for (const log of validLogs) {
      await repository.upsertFoodLog({
        ...log,
        syncedAt: new Date().toISOString(),
      });
      syncedCount++;
    }

    return json({
      ok: true,
      data: { syncedCount },
    } satisfies ApiSuccess<BatchSyncFoodLogsData>);
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id },
      'POST /api/food-logs/batch error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};
