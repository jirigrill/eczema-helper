import { derived, readable } from 'svelte/store';

import { liveQuery } from 'dexie';

import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';
import { buildScheduleContext } from '$lib/domain/schedule-queries';
import type { ReadyContext } from '$lib/domain/schedule-queries';
import { settingsContext } from '$lib/stores/settings-context';
import { todayIso } from '$lib/utils/date';

export type ScheduleContext =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | ({ status: 'ready' } & ReadyContext);

export type ScheduleRaw =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'ready'; schedule: GeneratedSchedule; answers: QuestionnaireAnswers };

function createLiveRawSubscription(set: (value: ScheduleRaw) => void): () => void {
  let currentStatus: ScheduleRaw['status'] = 'loading';

  const subscription = liveQuery(async () => {
    const [scheduleRow, answersRow] = await Promise.all([
      db.schedule.get(SINGLETON_ID),
      db.answers.get(SINGLETON_ID),
    ]);
    return { scheduleRow, answersRow };
  }).subscribe({
    next: ({ scheduleRow, answersRow }) => {
      if (!scheduleRow || !answersRow) {
        if (currentStatus === 'ready') {
          void Promise.all([db.schedule.get(SINGLETON_ID), db.answers.get(SINGLETON_ID)]).then(
            ([s, a]) => {
              if (!s || !a) {
                currentStatus = 'empty';
                set({ status: 'empty' });
              }
            },
          );
        } else {
          currentStatus = 'empty';
          set({ status: 'empty' });
        }
        return;
      }

      const { id: _sid, ...schedule } = scheduleRow;
      const { id: _aid, ...answers } = answersRow;

      currentStatus = 'ready';
      set({
        status: 'ready',
        schedule: schedule as GeneratedSchedule,
        answers: answers as QuestionnaireAnswers,
      });
    },
    error: (e: unknown) =>
      set({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
  });

  return () => subscription.unsubscribe();
}

export const scheduleRaw = readable<ScheduleRaw>({ status: 'loading' }, (set) => {
  return createLiveRawSubscription(set);
});

export const scheduleContext = derived<
  [typeof scheduleRaw, typeof settingsContext],
  ScheduleContext
>([scheduleRaw, settingsContext], ([raw, settings], set) => {
  if (raw.status !== 'ready') {
    set(raw);
    return;
  }
  // The live settings master switch is the sole source of feedingStage (#567) —
  // no fallback. Onboarding seeds the settings row in the same transaction as
  // the schedule, so a ready schedule always has a settings row; we only ever
  // wait for its liveQuery to emit. Hold at `loading` until then rather than
  // inventing a value from `answers`.
  if (!settings) {
    set({ status: 'loading' });
    return;
  }
  const catalog = new BundledCatalogAdapter();
  set({
    status: 'ready',
    ...buildScheduleContext(
      { schedule: raw.schedule, answers: raw.answers },
      todayIso(),
      catalog,
      settings.feedingStage,
    ),
  });
});
