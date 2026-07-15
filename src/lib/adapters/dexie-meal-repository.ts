import type { AtopicDb } from '$lib/db/atopic-db';
import type { Meal, MealType } from '$lib/domain/models';
import { mealId } from '$lib/domain/models';
import type { MealRepository } from '$lib/domain/ports/meal-repository';
import type { ScheduleRepository } from '$lib/domain/ports/schedule-repository';
import type { Result } from '$lib/types/result';

import { checkLoggableWindow } from './loggable-window-guard';

export class DexieMealRepository implements MealRepository {
  constructor(
    private readonly db: AtopicDb,
    private readonly scheduleRepo: ScheduleRepository,
  ) {}

  /**
   * Upsert a meal. Rejects with `date-outside-loggable-window` when a schedule
   * exists and the meal's date falls outside the loggable window. Writes made
   * before any schedule has been generated (onboarding) are intentionally
   * unguarded. An edit to an already-persisted slot that carries the same
   * `date` (the only kind possible — `meal.id` is derived from date+mealType,
   * see `mealId`) is exempt even if that date is now outside the window
   * (issue #440); only a genuinely new slot is held to the strict guard. See
   * `checkLoggableWindow` for the guard shape.
   */
  async save(meal: Meal): Promise<Result<void, string>> {
    try {
      const existing = await this.db.meals.get(meal.id);
      const outOfWindow = await checkLoggableWindow(this.scheduleRepo, meal.date, existing?.date);
      if (outOfWindow) return { ok: false, error: outOfWindow };
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
