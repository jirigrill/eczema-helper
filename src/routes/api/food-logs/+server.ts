import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { PostgresRepository } from '$lib/adapters/postgres';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal } from '$lib/utils/error';
import type {
  ApiError,
  ApiSuccess,
  GetFoodLogsData,
  CreateFoodLogRequest,
  CreateFoodLogData,
} from '$lib/types/api';

const repository = new PostgresRepository();

const VALID_ACTIONS = ['eliminated', 'reintroduced'] as const;

function isValidAction(action: unknown): action is 'eliminated' | 'reintroduced' {
  return typeof action === 'string' && VALID_ACTIONS.includes(action as typeof VALID_ACTIONS[number]);
}

function isValidDateString(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function parseCreateFoodLogRequest(body: unknown): CreateFoodLogRequest | null {
  if (!body || typeof body !== 'object') return null;

  const { childId, categoryId, subItemId, date, action, notes } = body as Record<string, unknown>;

  if (typeof childId !== 'string' || typeof categoryId !== 'string') return null;
  if (!isValidDateString(date)) return null;
  if (!isValidAction(action)) return null;

  return {
    childId,
    categoryId,
    subItemId: typeof subItemId === 'string' ? subItemId : undefined,
    date,
    action,
    notes: typeof notes === 'string' ? notes : undefined,
  };
}

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json(
      { ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError,
      { status: 401 }
    );
  }

  const childId = url.searchParams.get('childId');
  const startDate = url.searchParams.get('startDate');
  const endDate = url.searchParams.get('endDate');

  if (!childId) {
    return json(
      { ok: false, error: 'Chybí childId', code: 'VALIDATION_ERROR' } satisfies ApiError,
      { status: 400 }
    );
  }

  if (!startDate || !endDate) {
    return json(
      { ok: false, error: 'Chybí startDate nebo endDate', code: 'VALIDATION_ERROR' } satisfies ApiError,
      { status: 400 }
    );
  }

  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return json(
      { ok: false, error: 'Neplatný formát data (očekáváno YYYY-MM-DD)', code: 'VALIDATION_ERROR' } satisfies ApiError,
      { status: 400 }
    );
  }

  try {
    // Verify child ownership
    const isOwner = await repository.isChildOwner(locals.user.id, childId);
    if (!isOwner) {
      return json(
        { ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError,
        { status: 403 }
      );
    }

    const logs = await repository.getFoodLogs(childId, { from: startDate, to: endDate });

    return json({ ok: true, data: logs } satisfies ApiSuccess<GetFoodLogsData>);
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id },
      'GET /api/food-logs error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json(
      { ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError,
      { status: 401 }
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const createRequest = parseCreateFoodLogRequest(body);

    if (!createRequest) {
      return json(
        { ok: false, error: 'Neplatný požadavek', code: 'VALIDATION_ERROR' } satisfies ApiError,
        { status: 400 }
      );
    }

    // Verify child ownership
    const isOwner = await repository.isChildOwner(locals.user.id, createRequest.childId);
    if (!isOwner) {
      return json(
        { ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError,
        { status: 403 }
      );
    }

    const log = await repository.createFoodLog({
      childId: createRequest.childId,
      categoryId: createRequest.categoryId,
      subItemId: createRequest.subItemId,
      date: createRequest.date,
      action: createRequest.action,
      notes: createRequest.notes,
      createdBy: locals.user.id,
      updatedAt: new Date().toISOString(),
    });

    return json(
      { ok: true, data: log } satisfies ApiSuccess<CreateFoodLogData>,
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id },
      'POST /api/food-logs error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};
