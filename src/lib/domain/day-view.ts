import type { ScheduleRaw } from '$lib/stores/schedule-context';
import type { Meal, SkinObservation, SkinPhoto } from '$lib/domain/models';
import { resolveRouteDate } from '$lib/utils/date';

export type DayViewMode = 'editable' | 'preview';

export type DayViewCore = {
	selectedDate: string;
	redirectTo: string | null;
	viewMode: DayViewMode;
};

/**
 * Pure resolve core for the /day route.
 * Derives selectedDate, redirectTo, and viewMode from the URL param + schedule state.
 *
 * viewMode is 'preview' when the selected date is in the future (read-only
 * "Naplánováno" preview, no logging affordances). It is 'editable' for
 * today, past, and not-ready states.
 *
 * No reactive subscriptions — compose this inside a .svelte.ts shell.
 */
export function resolveDay(param: string, raw: ScheduleRaw, today: string): DayViewCore {
	if (raw.status !== 'ready') {
		return { selectedDate: today, redirectTo: null, viewMode: 'editable' };
	}
	const result = resolveRouteDate(param, raw.schedule.startDate, today);
	if (result.type === 'redirect') {
		return { selectedDate: today, redirectTo: result.to, viewMode: 'editable' };
	}
	if (result.type === 'preview') {
		return { selectedDate: result.date, redirectTo: null, viewMode: 'preview' };
	}
	return { selectedDate: result.date, redirectTo: null, viewMode: 'editable' };
}

export type DailyRecords = {
	readonly observations: readonly SkinObservation[];
	readonly photos: readonly SkinPhoto[];
	readonly meals: readonly Meal[];
};

/**
 * Daily Completeness — score 0-3 representing how many of the three core record
 * types (skin observation, skin photo, meal-with-content) are present for a day.
 * Each record type contributes at most one point regardless of how many entries
 * exist. A meal counts only when it has at least one item or non-empty notes —
 * an empty slot does not count.
 */
export function dailyCompleteness(records: DailyRecords): number {
	const hasObservation = records.observations.length > 0 ? 1 : 0;
	const hasPhoto = records.photos.length > 0 ? 1 : 0;
	const hasMealContent = records.meals.some(
		(m) => m.items.length > 0 || (m.notes != null && m.notes.trim().length > 0),
	)
		? 1
		: 0;
	return hasObservation + hasPhoto + hasMealContent;
}
