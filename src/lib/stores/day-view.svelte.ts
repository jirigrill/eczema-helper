import { fromStore } from 'svelte/store';

import { resolveDay } from '$lib/domain/day-view';
import type { FeedingStage, Meal, SkinObservation, SkinPhoto } from '$lib/domain/models';
import { earliestLoggedStore } from '$lib/stores/earliest-logged';
import { createMealSession } from '$lib/stores/meal-session';
import { settingsStore } from '$lib/stores/settings.svelte';
import { createSkinObservationSession } from '$lib/stores/skin-observation-session';
import { createSkinPhotoSession } from '$lib/stores/skin-photo-session';

export type DayView = {
  readonly redirectTo: string | null;
  readonly selectedDate: string;
  readonly meals: Meal[];
  readonly observations: SkinObservation[];
  readonly photos: SkinPhoto[];
  /**
   * Earliest day (ISO) with anything logged across meals and skin, or null when
   * nothing is logged. Live-subscribed (§3a) so the day strip grows the instant
   * an earlier day is logged.
   */
  readonly earliestLogged: string | null;
  /** Live feeding stage (`#567`); `null` until the settings liveQuery emits. */
  readonly feedingStage: FeedingStage | null;
  readonly mealSession: ReturnType<typeof createMealSession>;
  readonly observationSession: ReturnType<typeof createSkinObservationSession>;
  readonly photoSession: ReturnType<typeof createSkinPhotoSession>;
};

export function createDayView(getParam: () => string, today: string): DayView {
  const earliestLogged = fromStore(earliestLoggedStore);

  // The live settings master switch is the sole source of feedingStage (#567).
  // `settingsStore.status === 'seeded'` is also the app's seeded signal (PRD
  // #623, §3): it gates resolveDay below (the day route holds on today until
  // the mother is set up; the root layout owns the redirect to first run).
  const feedingStage = $derived(settingsStore.feedingStage);

  const resolved = $derived(resolveDay(getParam(), settingsStore.status === 'seeded', today));
  const selectedDate = $derived(resolved.selectedDate);
  const redirectTo = $derived(resolved.redirectTo);

  const mealSession = $derived(createMealSession(selectedDate));
  const observationSession = $derived(createSkinObservationSession(selectedDate));
  const photoSession = $derived(createSkinPhotoSession(selectedDate));

  const meals = $derived(fromStore(mealSession).current);
  const observations = $derived(fromStore(observationSession).current);
  const photos = $derived(fromStore(photoSession).current);

  const earliestLoggedValue = $derived(earliestLogged.current);

  return {
    get redirectTo() {
      return redirectTo;
    },
    get selectedDate() {
      return selectedDate;
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
    get earliestLogged() {
      return earliestLoggedValue;
    },
    get feedingStage() {
      return feedingStage;
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
