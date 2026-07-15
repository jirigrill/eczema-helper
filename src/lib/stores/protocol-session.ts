import { db } from '$lib/db/atopic-db';
import { DexieQuestionnaireRepository } from '$lib/adapters/dexie-questionnaire-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { DexieHarvestCandidateRepository } from '$lib/adapters/dexie-harvest-candidate-repository';
import { DexieEvaluationRepository } from '$lib/adapters/dexie-evaluation-repository';
import {
  generateSchedule,
  appendReTestPhases,
  removeReTestPhase,
  applyReintroductionVerdict,
} from '$lib/domain/schedule-builder';
import { scheduleContext } from '$lib/stores/schedule-context';
import { extractOtherSlugs, mergeCandidate, normalizeKey } from '$lib/domain/harvest-candidate';
import type {
  LadderAllergenId,
  QuestionnaireAnswers,
  ReintroductionEvaluation,
  AllergenOutcome,
} from '$lib/domain/models';
import type { Result } from '$lib/types/result';
import type { RetestRejection } from '$lib/domain/schedule-builder';

const questionnaireRepo = new DexieQuestionnaireRepository(db);
const scheduleRepo = new DexieScheduleRepository(db);
const harvestRepo = new DexieHarvestCandidateRepository(db);
const evaluationRepo = new DexieEvaluationRepository(db);

async function startProtocol(answers: QuestionnaireAnswers): Promise<Result<void, string>> {
  const schedule = generateSchedule(answers);
  const saveAnswers = await questionnaireRepo.save(answers);
  if (!saveAnswers.ok) return saveAnswers;
  const saveSchedule = await scheduleRepo.save(schedule);
  if (!saveSchedule.ok) return saveSchedule;

  const now = new Date().toISOString();
  const names = extractOtherSlugs(answers);
  for (const raw of names) {
    const normalized = normalizeKey(raw);
    if (!normalized) continue;
    const existing = await harvestRepo.readByKey(normalized);
    const prior = existing.ok ? existing.data : null;
    await harvestRepo.upsert(mergeCandidate(prior, raw, normalized, now));
  }

  return { ok: true, data: undefined };
}

async function appendReTests(
  slugs: string[],
  today: string,
): Promise<Result<void, RetestRejection>> {
  const ctx = await _loadReadySchedule();
  if (!ctx.ok) return { ok: false, error: { code: 'not-baby-confirmed', invalidIds: [] } };

  const retestResult = appendReTestPhases(ctx.data, slugs as LadderAllergenId[], today);
  if (!retestResult.ok) return retestResult;

  const saveResult = await scheduleRepo.save(retestResult.data);
  if (!saveResult.ok) return { ok: false, error: { code: 'not-baby-confirmed', invalidIds: [] } };
  return { ok: true, data: undefined };
}

async function removeReTest(allergenId: string, today: string): Promise<Result<void, string>> {
  const ctx = await _loadReadySchedule();
  if (!ctx.ok) return ctx;

  const result = removeReTestPhase(ctx.data, allergenId as LadderAllergenId, today);
  if (!result.ok) return { ok: false, error: result.error.code };

  const saveResult = await scheduleRepo.save(result.data);
  return saveResult;
}

async function reset(): Promise<void> {
  await Promise.all([db.answers.clear(), db.schedule.clear(), db.evaluations.clear()]);
}

async function recordVerdict(evaluation: ReintroductionEvaluation): Promise<Result<void, string>> {
  const saveEval = await evaluationRepo.save(evaluation);
  if (!saveEval.ok) return saveEval;

  if (evaluation.phaseType === 'allergen-test' && evaluation.outcome !== 'tolerated') {
    const ctx = await _loadReadySchedule();
    if (!ctx.ok) return ctx;
    const updated = applyReintroductionVerdict(
      ctx.data,
      evaluation.phaseId,
      evaluation.outcome as AllergenOutcome,
    );
    if (updated !== ctx.data) {
      const saveSchedule = await scheduleRepo.save(updated);
      if (!saveSchedule.ok) return saveSchedule;
    }
  }

  return { ok: true, data: undefined };
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
  recordVerdict,
  reset,
};
