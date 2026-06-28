import { db } from '$lib/db/atopic-db';
import { createDateScopedSession } from '$lib/adapters/date-scoped-session';
import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { todayIso } from '$lib/utils/date';
import type { Meal, MealType } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

const repo = new DexieMealRepository(db);

export function createMealSession(date: string) {
	const meals = createDateScopedSession(db.meals, date);

	async function save(meal: Meal): Promise<Result<void, string>> {
		return repo.save(meal);
	}

	async function loadBySlot(d: string, mealType: MealType): Promise<Result<Meal | null, string>> {
		return repo.loadBySlot(d, mealType);
	}

	async function remove(d: string, mealType: MealType): Promise<Result<void, string>> {
		return repo.remove(d, mealType);
	}

	return { subscribe: meals.subscribe, save, loadBySlot, remove };
}

export const mealSession = createMealSession(todayIso());
