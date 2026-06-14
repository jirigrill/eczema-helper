import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';

import { db, SINGLETON_ID } from '$lib/db/atopic-db';
import { buildScheduleContext } from '$lib/domain/schedule-queries';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';
import type { ReadyContext } from '$lib/domain/schedule-queries';
import { todayIso } from '$lib/utils/date';
import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';

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
					void Promise.all([
						db.schedule.get(SINGLETON_ID),
						db.answers.get(SINGLETON_ID),
					]).then(([s, a]) => {
						if (!s || !a) {
							currentStatus = 'empty';
							set({ status: 'empty' });
						}
					});
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
		error: (e: unknown) => set({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
	});

	return () => subscription.unsubscribe();
}

export const scheduleRaw = readable<ScheduleRaw>({ status: 'loading' }, (set) => {
	return createLiveRawSubscription(set);
});

export const scheduleContext = readable<ScheduleContext>({ status: 'loading' }, (set) => {
	const catalog = new BundledCatalogAdapter();
	return createLiveRawSubscription((raw) => {
		if (raw.status !== 'ready') {
			set(raw);
			return;
		}
		set({
			status: 'ready',
			...buildScheduleContext(
				{ schedule: raw.schedule, answers: raw.answers },
				todayIso(),
				catalog,
			),
		});
	});
});
