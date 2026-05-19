import { readable } from 'svelte/store';
import { liveQuery } from 'dexie';

import { db, SINGLETON_ID } from '$lib/db/atopic-db';
import {
	getEliminatedSlugsForDate,
	getReintroductionDayInfo,
	getScheduleProgress,
} from '$lib/domain/schedule-queries';
import type { GeneratedSchedule, QuestionnaireAnswers, ReintroductionDayInfo } from '$lib/domain/models';
import { todayIso } from '$lib/utils/date';

export type ScheduleContext =
	| { status: 'loading' }
	| { status: 'empty' }
	| {
			status: 'ready';
			schedule: GeneratedSchedule;
			answers: QuestionnaireAnswers;
			eliminatedToday: string[];
			reintroInfo: ReintroductionDayInfo | null;
			progress: { currentDay: number; totalDays: number; percentComplete: number };
	  };

export const scheduleContext = readable<ScheduleContext>({ status: 'loading' }, (set) => {
	const subscription = liveQuery(async () => {
		const [scheduleRow, answersRow] = await Promise.all([
			db.schedule.get(SINGLETON_ID),
			db.answers.get(SINGLETON_ID),
		]);
		return { scheduleRow, answersRow };
	}).subscribe({
		next: ({ scheduleRow, answersRow }) => {
			if (!scheduleRow || !answersRow) {
				set({ status: 'empty' });
				return;
			}

			const { id: _sid, ...schedule } = scheduleRow;
			const { id: _aid, ...answers } = answersRow;
			const today = todayIso();

			set({
				status: 'ready',
				schedule: schedule as GeneratedSchedule,
				answers: answers as QuestionnaireAnswers,
				eliminatedToday: getEliminatedSlugsForDate(schedule as GeneratedSchedule, today),
				reintroInfo: getReintroductionDayInfo(schedule as GeneratedSchedule, today),
				progress: getScheduleProgress(schedule as GeneratedSchedule, today),
			});
		},
		error: () => set({ status: 'empty' }),
	});

	return () => subscription.unsubscribe();
});
