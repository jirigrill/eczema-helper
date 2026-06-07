import { describe, it, expect } from 'vitest';
import { resolveDay } from './day-view';
import type { ScheduleRaw } from '$lib/stores/schedule-context';
import type { GeneratedSchedule, QuestionnaireAnswers } from '$lib/domain/models';

const protocolStart = '2025-05-01';
const today = '2025-06-10';
const futureDate = '2025-12-31';
const validDate = '2025-06-05';

const sampleSchedule: GeneratedSchedule = {
	permanentMother: [],
	permanentBaby: [],
	startDate: protocolStart,
	estimatedEndDate: futureDate,
	phases: [
		{
			id: 'reset',
			type: 'reset',
			allergenIds: [],
			startDate: protocolStart,
			endDate: today,
		},
	],
};

const sampleAnswers: QuestionnaireAnswers = {
	babyBirthDate: '2025-01-01',
	eczemaSeverity: 'moderate',
	motherAllergies: [],
	babyConfirmedAllergies: [],
	programStartDate: protocolStart,
	completedAt: '2025-05-01T00:00:00.000Z',
	testedAllergens: [],
};

const readyRaw: ScheduleRaw = {
	status: 'ready',
	schedule: sampleSchedule,
	answers: sampleAnswers,
};

describe('resolveDay', () => {
	describe('schedule not ready (loading / empty)', () => {
		it('returns today as selectedDate and no redirect when loading', () => {
			const result = resolveDay('2025-06-05', { status: 'loading' }, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: null });
		});

		it('returns today as selectedDate and no redirect when empty', () => {
			const result = resolveDay('2025-06-05', { status: 'empty' }, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: null });
		});

		it('returns today as selectedDate and no redirect when error', () => {
			const result = resolveDay('not-a-date', { status: 'error', message: 'db error' }, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: null });
		});
	});

	describe('valid in-range param', () => {
		it('returns param as selectedDate with no redirect', () => {
			const result = resolveDay(validDate, readyRaw, today);
			expect(result).toEqual({ selectedDate: validDate, redirectTo: null });
		});

		it('accepts today itself as a valid date', () => {
			const result = resolveDay(today, readyRaw, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: null });
		});

		it('accepts protocolStart as a valid date', () => {
			const result = resolveDay(protocolStart, readyRaw, today);
			expect(result).toEqual({ selectedDate: protocolStart, redirectTo: null });
		});
	});

	describe('invalid / out-of-range param — triggers redirect to today', () => {
		it('redirects to today for a future date', () => {
			const result = resolveDay(futureDate, readyRaw, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: today });
		});

		it('redirects to today for a malformed string', () => {
			const result = resolveDay('not-a-date', readyRaw, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: today });
		});

		it('redirects to today for an empty string', () => {
			const result = resolveDay('', readyRaw, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: today });
		});

		it('redirects to today for a date before protocolStart', () => {
			const result = resolveDay('2025-04-30', readyRaw, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: today });
		});

		it('redirects to today for a partial date string', () => {
			const result = resolveDay('2025-06', readyRaw, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: today });
		});
	});

	describe('pre-start dates (guard against any path landing before protocolStart)', () => {
		it('redirects to today for a date before protocolStart', () => {
			const result = resolveDay('2025-04-25', readyRaw, today);
			expect(result).toEqual({ selectedDate: today, redirectTo: today });
		});

		it('does not redirect when date is within range', () => {
			const result = resolveDay('2025-06-01', readyRaw, today);
			expect(result).toEqual({ selectedDate: '2025-06-01', redirectTo: null });
		});
	});
});
