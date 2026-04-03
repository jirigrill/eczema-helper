import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { PostgresRepository } from '$lib/adapters/postgres';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal } from '$lib/utils/error';
import type { ApiError, ApiSuccess, GetFoodCategoriesData } from '$lib/types/api';

const repository = new PostgresRepository();

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) {
    return json(
      { ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError,
      { status: 401 }
    );
  }

  try {
    const categories = await repository.getFoodCategories();

    return json({ ok: true, data: categories } satisfies ApiSuccess<GetFoodCategoriesData>);
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id },
      'GET /api/food-categories error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};
