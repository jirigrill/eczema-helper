import { db } from '$lib/db/atopic-db';
import { DexieQuestionnaireRepository } from '$lib/adapters/dexie-questionnaire-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { generateSchedule, appendReTestPhases, removeReTestPhase } from '$lib/domain/schedule-builder';
import { scheduleContext } from '$lib/stores/schedule-context';
import type { ProtocolAllergenId, QuestionnaireAnswers } from '$lib/domain/models';
import type { Result } from '$lib/types/result';
import type { RetestRejection } from '$lib/domain/schedule-builder';

const questionnaireRepo = new DexieQuestionnaireRepository(db);
const scheduleRepo = new DexieScheduleRepository(db);

async function startProtocol(answers: QuestionnaireAnswers): Promise<Result<void, string>> {
	const schedule = generateSchedule(answers);
	const saveAnswers = await questionnaireRepo.save(answers);
	if (!saveAnswers.ok) return saveAnswers;
	return scheduleRepo.save(schedule);
}

async function appendReTests(
	slugs: string[],
	today: string,
): Promise<Result<void, RetestRejection>> {
	const ctx = await _loadReadySchedule();
	if (!ctx.ok) return { ok: false, error: { code: 'not-baby-confirmed', invalidIds: [] } };

	const retestResult = appendReTestPhases(ctx.data, slugs as ProtocolAllergenId[], today);
	if (!retestResult.ok) return retestResult;

	const saveResult = await scheduleRepo.save(retestResult.data);
	if (!saveResult.ok) return { ok: false, error: { code: 'not-baby-confirmed', invalidIds: [] } };
	return { ok: true, data: undefined };
}

async function removeReTest(
	allergenId: string,
	today: string,
): Promise<Result<void, string>> {
	const ctx = await _loadReadySchedule();
	if (!ctx.ok) return ctx;

	const result = removeReTestPhase(ctx.data, allergenId as ProtocolAllergenId, today);
	if (!result.ok) return { ok: false, error: result.error.code };

	const saveResult = await scheduleRepo.save(result.data);
	return saveResult;
}

async function reset(): Promise<void> {
	await Promise.all([db.answers.clear(), db.schedule.clear()]);
}

async function _loadReadySchedule() {
	const loaded = await scheduleRepo.load();
	if (!loaded.ok) return { ok: false as const, error: loaded.error };
	if (!loaded.data) return { ok: false as const, error: 'no schedule' };
	return { ok: true as const, data: loaded.data };
}

export const protocolSession = {
	subscribe: scheduleContext.subscribe,
	startProtocol,
	appendReTests,
	removeReTest,
	reset,
};
