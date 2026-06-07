import type { ScheduleRaw } from '$lib/stores/schedule-context';
import { resolveRouteDate } from '$lib/utils/date';

export type DayViewCore = {
	selectedDate: string;
	redirectTo: string | null;
};

/**
 * Pure resolve core for the /day route.
 * Derives selectedDate and redirectTo from the URL param + schedule state.
 * No reactive subscriptions — compose this inside a .svelte.ts shell.
 */
export function resolveDay(param: string, raw: ScheduleRaw, today: string): DayViewCore {
	if (raw.status !== 'ready') {
		return { selectedDate: today, redirectTo: null };
	}
	const result = resolveRouteDate(param, raw.schedule.startDate, today);
	if (result.type === 'redirect') {
		return { selectedDate: today, redirectTo: result.to };
	}
	return { selectedDate: result.date, redirectTo: null };
}
