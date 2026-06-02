import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';

import { db } from '$lib/db/atopic-db';
import { DexieMealRepository } from '$lib/adapters/dexie-meal-repository';
import { todayIso } from '$lib/utils/date';
import type { Meal, MealType } from '$lib/domain/models';
import type { Result } from '$lib/types/result';

const repo = new DexieMealRepository(db);

export function createMealSession(date: string) {
	const meals = readable<Meal[]>([], (set) => {
		const subscription = liveQuery(() =>
			db.meals.where('date').equals(date).toArray(),
		).subscribe({
			next: (rows) => { set(rows ?? []); },
			error: () => { set([]); },
		});
		return () => subscription.unsubscribe();
	});

	async function save(meal: Meal): Promise<Result<void, string>> {
		return repo.save(meal);
	}

	async function loadBySlot(d: string, mealType: MealType): Promise<Result<Meal | null, string>> {
		return repo.loadBySlot(d, mealType);
	}

	return { subscribe: meals.subscribe, save, loadBySlot };
}

export const mealSession = createMealSession(todayIso());
