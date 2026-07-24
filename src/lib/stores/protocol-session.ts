import { DexieEvaluationRepository } from '$lib/adapters/dexie-evaluation-repository';
import { DexieHarvestCandidateRepository } from '$lib/adapters/dexie-harvest-candidate-repository';
import { DexieScheduleRepository } from '$lib/adapters/dexie-schedule-repository';
import { DexieSettingsRepository } from '$lib/adapters/dexie-settings-repository';
import { SINGLETON_ID, db } from '$lib/db/atopic-db';
import { extractOtherSlugs, mergeCandidate, normalizeKey } from '$lib/domain/harvest-candidate';
import type { FeedingStage } from '$lib/domain/models';
import type {
  AllergenOutcome,
  LadderAllergenId,
  QuestionnaireAnswers,
  ReintroductionEvaluation,
} from '$lib/domain/models';
import {
  appendReTestPhases,
  applyReintroductionVerdict,
  generateSchedule,
  removeReTestPhase,
} from '$lib/domain/schedule-builder';
import type { RetestRejection } from '$lib/domain/schedule-builder';
import { scheduleContext } from '$lib/stores/schedule-context';
import type { Result } from '$lib/types/result';

const scheduleRepo = new DexieScheduleRepository(db);
const settingsRepo = new DexieSettingsRepository(db);
const harvestRepo = new DexieHarvestCandidateRepository(db);
const evaluationRepo = new DexieEvaluationRepository(db);

async function startProtocol(answers: QuestionnaireAnswers): Promise<Result<void, string>> {
  const schedule = generateSchedule(answers);
  // One onboarding-completion transaction: answers, the derived schedule, and the
  // settings master switch (seeded from answers.feedingStage) commit together or
  // not at all — the settings singleton is never left unseeded behind a schedule
  // (#567). Raw `db.*.put` rather than the repositories: the repo `save()` methods
  // catch and return `Result` instead of throwing, so a failure inside them would
  // not abort the surrounding Dexie transaction. The store layer owns `db`
  // directly (see docs/architecture/ports-and-adapters.md §Stores layer).
  try {
    await db.transaction('rw', db.answers, db.schedule, db.settings, async () => {
      await db.answers.put({ id: SINGLETON_ID, ...answers });
      await db.schedule.put({ id: SINGLETON_ID, ...schedule });
      await db.settings.put({ id: SINGLETON_ID, feedingStage: answers.feedingStage });
    });
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

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
  await Promise.all([
    db.answers.clear(),
    db.schedule.clear(),
    db.evaluations.clear(),
    db.settings.clear(),
  ]);
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

async function setFeedingStage(feedingStage: FeedingStage): Promise<Result<void, string>> {
  // Standalone current-value update — goes through the `SettingsRepository` port,
  // unlike `startProtocol`'s raw `db.settings.put`. The difference is deliberate:
  // the seed there must be atomic with answers+schedule inside one Dexie
  // transaction (repos catch errors into `Result` and can't abort it), whereas
  // this live edit is a single independent write the port is built to own.
  const current = await settingsRepo.load();
  if (!current.ok) return current;
  return settingsRepo.save({ ...current.data, feedingStage });
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
  setFeedingStage,
  reset,
};
