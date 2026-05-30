import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';

import { db, SINGLETON_ID } from '$lib/db/atopic-db';
import {
	getEliminatedSlugsForDate,
	getReintroductionDayInfo,
	getScheduleProgress,
} from '$lib/domain/schedule-queries';
import { getAllergenStatuses } from '$lib/domain/allergen-status';
import type { AllergenId, AllergenStatus, GeneratedSchedule, QuestionnaireAnswers, ReintroductionDayInfo } from '$lib/domain/models';
import { todayIso } from '$lib/utils/date';

export type ScheduleContext =
	| { status: 'loading' }
	| { status: 'empty' }
	| { status: 'error'; message: string }
	| {
			status: 'ready';
			schedule: GeneratedSchedule;
			answers: QuestionnaireAnswers;
			allergenStatuses: AllergenStatus[];
			eliminatedToday: AllergenId[];
			reintroInfo: ReintroductionDayInfo | null;
			progress: { currentDay: number; totalDays: number; percentComplete: number };
	  };

export const scheduleContext = readable<ScheduleContext>({ status: 'loading' }, (set) => {
	let currentStatus: ScheduleContext['status'] = 'loading';

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
					// liveQuery can fire transiently empty when an unrelated table (e.g. photos)
					// is written. Re-query once to confirm the data is truly gone before
					// transitioning away from 'ready' and triggering navigation.
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
			const today = todayIso();
			const typedSchedule = schedule as GeneratedSchedule;

			currentStatus = 'ready';
			set({
				status: 'ready',
				schedule: typedSchedule,
				answers: answers as QuestionnaireAnswers,
				allergenStatuses: getAllergenStatuses(typedSchedule, today),
				eliminatedToday: getEliminatedSlugsForDate(typedSchedule, today),
				reintroInfo: getReintroductionDayInfo(typedSchedule, today),
				progress: getScheduleProgress(typedSchedule, today),
			});
		},
		error: (e: unknown) => set({ status: 'error', message: e instanceof Error ? e.message : String(e) }),
	});

	return () => subscription.unsubscribe();
});
