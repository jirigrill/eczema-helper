import { db } from '$lib/db/atopic-db';
import { createDateScopedSession } from '$lib/adapters/date-scoped-session';
import type { Meal } from '$lib/domain/models';

export function createMealSession(date: string) {
	return createDateScopedSession<Meal>(db.meals, date);
}
