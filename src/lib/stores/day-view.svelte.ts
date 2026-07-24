import { fromStore } from 'svelte/store';

import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { resolveDay } from '$lib/domain/day-view';
import type { DayViewMode } from '$lib/domain/day-view';
import type { Meal, SchedulePhase, SkinObservation, SkinPhoto } from '$lib/domain/models';
import { buildScheduleContext, getPhaseForDate } from '$lib/domain/schedule-queries';
import { createMealSession } from '$lib/stores/meal-session';
import { scheduleRaw } from '$lib/stores/schedule-context';
import type { ScheduleContext } from '$lib/stores/schedule-context';
import { settingsContext } from '$lib/stores/settings-context';
import { createSkinObservationSession } from '$lib/stores/skin-observation-session';
import { createSkinPhotoSession } from '$lib/stores/skin-photo-session';

export type DayView = {
  readonly redirectTo: string | null;
  readonly selectedDate: string;
  readonly viewMode: DayViewMode;
  readonly meals: Meal[];
  readonly observations: SkinObservation[];
  readonly photos: SkinPhoto[];
  readonly ctx: ScheduleContext;
  readonly phase: SchedulePhase | null;
  readonly mealSession: ReturnType<typeof createMealSession>;
  readonly observationSession: ReturnType<typeof createSkinObservationSession>;
  readonly photoSession: ReturnType<typeof createSkinPhotoSession>;
};

export function createDayView(getParam: () => string, today: string): DayView {
  const catalog = new BundledCatalogAdapter();
  const rawStore = fromStore(scheduleRaw);
  const settingsStore = fromStore(settingsContext);

  const resolved = $derived(resolveDay(getParam(), rawStore.current, today));
  const selectedDate = $derived(resolved.selectedDate);
  const redirectTo = $derived(resolved.redirectTo);
  const viewMode = $derived(resolved.viewMode);

  const mealSession = $derived(createMealSession(selectedDate));
  const observationSession = $derived(createSkinObservationSession(selectedDate));
  const photoSession = $derived(createSkinPhotoSession(selectedDate));

  const meals = $derived(fromStore(mealSession).current);
  const observations = $derived(fromStore(observationSession).current);
  const photos = $derived(fromStore(photoSession).current);

  const raw = $derived(rawStore.current);
  const feedingStage = $derived(settingsStore.current?.feedingStage ?? null);

  const ctx = $derived(
    raw.status === 'ready' && feedingStage
      ? {
          status: 'ready' as const,
          ...buildScheduleContext(
            { schedule: raw.schedule, answers: raw.answers },
            selectedDate,
            catalog,
            feedingStage,
          ),
        }
      : raw.status === 'ready'
        ? { status: 'loading' as const }
        : raw,
  );

  const phase = $derived(
    ctx.status === 'ready' ? getPhaseForDate(ctx.schedule, selectedDate) : null,
  );

  return {
    get redirectTo() {
      return redirectTo;
    },
    get selectedDate() {
      return selectedDate;
    },
    get viewMode() {
      return viewMode;
    },
    get meals() {
      return meals;
    },
    get observations() {
      return observations;
    },
    get photos() {
      return photos;
    },
    get ctx() {
      return ctx as ScheduleContext;
    },
    get phase() {
      return phase;
    },
    get mealSession() {
      return mealSession;
    },
    get observationSession() {
      return observationSession;
    },
    get photoSession() {
      return photoSession;
    },
  };
}
