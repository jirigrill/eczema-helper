import type { Meal, MealType } from '$lib/domain/models';
import { mealId } from '$lib/domain/models';
import type { MealRepository } from '$lib/domain/ports/meal-repository';
import type { Result } from '$lib/types/result';
import type { AtopicDb } from '$lib/db/atopic-db';

export class DexieMealRepository implements MealRepository {
  constructor(private readonly db: AtopicDb) {}

  async save(meal: Meal): Promise<Result<void, string>> {
    try {
      await this.db.meals.put(meal);
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async loadBySlot(date: string, mealType: MealType): Promise<Result<Meal | null, string>> {
    try {
      const row = await this.db.meals.get(mealId(date, mealType));
      return { ok: true, data: row ?? null };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async listByDate(date: string): Promise<Result<Meal[], string>> {
    try {
      const rows = await this.db.meals.where('date').equals(date).toArray();
      return { ok: true, data: rows };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async remove(date: string, mealType: MealType): Promise<Result<void, string>> {
    try {
      await this.db.meals.delete(mealId(date, mealType));
      return { ok: true, data: undefined };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }
}
