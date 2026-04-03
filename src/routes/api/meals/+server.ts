import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

import { PostgresRepository } from '$lib/adapters/postgres';
import { logger } from '$lib/server/logger';
import { formatErrorMinimal } from '$lib/utils/error';
import type {
  ApiError,
  ApiSuccess,
  GetMealsData,
  CreateMealRequest,
  CreateMealData,
  MealData,
} from '$lib/types/api';

const repository = new PostgresRepository();

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

function isValidMealType(type: unknown): type is 'breakfast' | 'lunch' | 'dinner' | 'snack' {
  return typeof type === 'string' && VALID_MEAL_TYPES.includes(type as typeof VALID_MEAL_TYPES[number]);
}

function isValidDateString(date: unknown): date is string {
  if (typeof date !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function parseCreateMealRequest(body: unknown): CreateMealRequest | null {
  if (!body || typeof body !== 'object') return null;

  const { date, mealType, label, items } = body as Record<string, unknown>;

  if (!isValidDateString(date)) return null;
  if (!isValidMealType(mealType)) return null;
  if (!Array.isArray(items) || items.length === 0) return null;

  // Validate each item has either subItemId or customName
  for (const item of items) {
    if (!item || typeof item !== 'object') return null;
    const { subItemId, customName } = item as Record<string, unknown>;
    if (typeof subItemId !== 'string' && typeof customName !== 'string') {
      return null;
    }
  }

  return {
    date,
    mealType,
    label: typeof label === 'string' ? label : undefined,
    items: items.map((item) => {
      const { subItemId, customName, categoryId } = item as Record<string, unknown>;
      return {
        subItemId: typeof subItemId === 'string' ? subItemId : undefined,
        customName: typeof customName === 'string' ? customName : undefined,
        categoryId: typeof categoryId === 'string' ? categoryId : undefined,
      };
    }),
  };
}

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json(
      { ok: false, error: 'Nepřihlášen', code: 'UNAUTHORIZED' } satisfies ApiError,
      { status: 401 }
    );
  }

  const date = url.searchParams.get('date');

  if (!date || !isValidDateString(date)) {
    return json(
      { ok: false, error: 'Chybí nebo neplatné datum', code: 'VALIDATION_ERROR' } satisfies ApiError,
      { status: 400 }
    );
  }

  try {
    const meals = await repository.getMealsForDate(locals.user.id, date);

    // Fetch items for each meal
    const mealsWithItems: MealData[] = await Promise.all(
      meals.map(async (meal) => {
        const mealWithItems = await repository.getMealWithItems(meal.id);
        return {
          ...meal,
          items: mealWithItems?.items ?? [],
        };
      })
    );

    return json({ ok: true, data: mealsWithItems } satisfies ApiSuccess<GetMealsData>);
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id },
      'GET /api/meals error'
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
    const createRequest = parseCreateMealRequest(body);

    if (!createRequest) {
      return json(
        { ok: false, error: 'Neplatný požadavek', code: 'VALIDATION_ERROR' } satisfies ApiError,
        { status: 400 }
      );
    }

    const meal = await repository.createMeal(
      {
        userId: locals.user.id,
        date: createRequest.date,
        mealType: createRequest.mealType,
        label: createRequest.label,
      },
      createRequest.items.map((item) => ({
        mealId: '', // Will be set by repository
        subItemId: item.subItemId,
        customName: item.customName,
        categoryId: item.categoryId,
      }))
    );

    // Fetch the meal with items
    const mealWithItems = await repository.getMealWithItems(meal.id);

    const data: CreateMealData = {
      ...meal,
      items: mealWithItems?.items ?? [],
    };

    return json({ ok: true, data } satisfies ApiSuccess<CreateMealData>, { status: 201 });
  } catch (error) {
    logger.error(
      { err: formatErrorMinimal(error), userId: locals.user.id },
      'POST /api/meals error'
    );
    return json(
      { ok: false, error: 'Interní chyba serveru', code: 'INTERNAL_ERROR' } satisfies ApiError,
      { status: 500 }
    );
  }
};
