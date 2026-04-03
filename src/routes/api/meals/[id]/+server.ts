import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { PostgresRepository } from '$lib/adapters/postgres';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal } from '$lib/utils/error';
import type {
  ApiError,
  ApiSuccess,
  UpdateMealData,
  DeleteMealData,
  MealData,
} from '$lib/types/api';

const repository = new PostgresRepository();

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function isValidMealType(type: unknown): type is 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  return typeof type === 'string' && VALID_MEAL_TYPES.includes(type as typeof VALID_MEAL_TYPES[number]);
}

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

    const { mealType, label, items } = body as Record<string, unknown>;

    // Verify ownership
    const existingMeal = await repository.getMealById(id);
    if (!existingMeal) {
      return json(
        { ok: false, error: 'Jídlo nenalezeno', code: 'NOT_FOUND' } satisfies ApiError,
        { status: 404 }
      );
    }

    if (existingMeal.userId !== locals.user.id) {
      return json(
        { ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError,
        { status: 403 }
      );
    }

    // Validate mealType if provided
    if (mealType !== undefined && !isValidMealType(mealType)) {
      return json(
        { ok: false, error: 'Neplatný typ jídla', code: 'VALIDATION_ERROR' } satisfies ApiError,
        { status: 400 }
      );
    }

    // Update meal metadata
    const updatedMeal = await repository.updateMeal(id, {
      mealType: isValidMealType(mealType) ? mealType : undefined,
      label: typeof label === 'string' ? label : undefined,
    });

    // Replace items if provided
    if (Array.isArray(items)) {
      // Validate items
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          return json(
            { ok: false, error: 'Neplatná položka jídla', code: 'VALIDATION_ERROR' } satisfies ApiError,
            { status: 400 }
          );
        }
        const { subItemId, customName } = item as Record<string, unknown>;
        if (typeof subItemId !== 'string' && typeof customName !== 'string') {
          return json(
            { ok: false, error: 'Položka musí mít subItemId nebo customName', code: 'VALIDATION_ERROR' } satisfies ApiError,
            { status: 400 }
          );
        }
      }

      await repository.replaceMealItems(
        id,
        items.map((item) => {
          const { subItemId, customName, categoryId } = item as Record<string, unknown>;
          return {
            mealId: id,
            subItemId: typeof subItemId === 'string' ? subItemId : undefined,
            customName: typeof customName === 'string' ? customName : undefined,
            categoryId: typeof categoryId === 'string' ? categoryId : undefined,
          };
        })
      );
    }

    // Fetch updated meal with items
    const mealWithItems = await repository.getMealWithItems(id);

    const data: UpdateMealData = {
      ...updatedMeal,
      items: mealWithItems?.items ?? [],
    };

    return json({ ok: true, data } satisfies ApiSuccess<UpdateMealData>);
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id, mealId: id },
      'PUT /api/meals/[id] error'
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
    // Verify ownership
    const existingMeal = await repository.getMealById(id);
    if (!existingMeal) {
      return json(
        { ok: false, error: 'Jídlo nenalezeno', code: 'NOT_FOUND' } satisfies ApiError,
        { status: 404 }
      );
    }

    if (existingMeal.userId !== locals.user.id) {
      return json(
        { ok: false, error: 'Přístup odepřen', code: 'FORBIDDEN' } satisfies ApiError,
        { status: 403 }
      );
    }

    await repository.deleteMeal(id);

    return json({ ok: true, data: {} } satisfies ApiSuccess<DeleteMealData>, { status: 200 });
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id, mealId: id },
      'DELETE /api/meals/[id] error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};
