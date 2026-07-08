import type { AtopicDb } from '$lib/db/atopic-db';
import type {
  Meal,
  QuestionnaireAnswers,
  GeneratedSchedule,
  SkinObservation,
  SkinPhoto,
  ReintroductionEvaluation,
  Ladder,
} from '$lib/domain/models';
import type { HarvestCandidate } from '$lib/domain/harvest-candidate';

/**
 * Whole-database snapshot payload — the plaintext body of the ADR-0002
 * encrypted export blob. A `version` field pins the snapshot schema so
 * older/newer blobs can be detected on restore; the current version is
 * `1` and matches Dexie `AtopicDb.version(9)` (issue #427).
 *
 * Restore rehydrates every store to the exact rows captured — including
 * per-allergen `ladder_overrides` so a device restore preserves the
 * clinician's individualized plan (ADR-0023).
 */
export type ExportSnapshot = {
  version: 1;
  answers: (QuestionnaireAnswers & { id: string })[];
  schedule: (GeneratedSchedule & { id: string })[];
  meals: Meal[];
  skin_observations: SkinObservation[];
  photos: SkinPhoto[];
  harvest_candidates: HarvestCandidate[];
  evaluations: ReintroductionEvaluation[];
  ladder_overrides: Ladder[];
};

/** Read every store into an in-memory snapshot ready for encryption. */
export async function buildExportSnapshot(db: AtopicDb): Promise<ExportSnapshot> {
  const [
    answers,
    schedule,
    meals,
    skin_observations,
    photos,
    harvest_candidates,
    evaluations,
    ladder_overrides,
  ] = await Promise.all([
    db.answers.toArray(),
    db.schedule.toArray(),
    db.meals.toArray(),
    db.skin_observations.toArray(),
    db.photos.toArray(),
    db.harvest_candidates.toArray(),
    db.evaluations.toArray(),
    db.ladder_overrides.toArray(),
  ]);

  return {
    version: 1,
    answers,
    schedule,
    meals,
    skin_observations,
    photos,
    harvest_candidates,
    evaluations,
    ladder_overrides,
  };
}

/**
 * Rehydrate `db` from a snapshot: clear every store, then bulk-write the
 * snapshot's rows. Restore is destructive by design — the mother
 * explicitly opts in when picking "Obnovit" (restore) from settings.
 */
export async function restoreExportSnapshot(
  db: AtopicDb,
  snapshot: ExportSnapshot
): Promise<void> {
  await Promise.all([
    db.answers.clear(),
    db.schedule.clear(),
    db.meals.clear(),
    db.skin_observations.clear(),
    db.photos.clear(),
    db.harvest_candidates.clear(),
    db.evaluations.clear(),
    db.ladder_overrides.clear(),
  ]);
  await Promise.all([
    db.answers.bulkPut(snapshot.answers),
    db.schedule.bulkPut(snapshot.schedule),
    db.meals.bulkPut(snapshot.meals),
    db.skin_observations.bulkPut(snapshot.skin_observations),
    db.photos.bulkPut(snapshot.photos),
    db.harvest_candidates.bulkPut(snapshot.harvest_candidates),
    db.evaluations.bulkPut(snapshot.evaluations),
    db.ladder_overrides.bulkPut(snapshot.ladder_overrides),
  ]);
}
