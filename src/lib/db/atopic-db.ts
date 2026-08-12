import Dexie, { type EntityTable } from 'dexie';

import type { Meal, SettingsData, SkinObservation, SkinPhoto } from '$lib/domain/models';

type SettingsRow = SettingsData & { id: string };

// Dormant protocol tables (PRD #623, §2f): declared so their rows survive on
// disk for a future engine revival, but the live app never reads them and the
// domain types that once shaped them are parked. Each row keeps only its key
// path — the concrete shape lives in the `parked/protocol-engine` git tag
// (PRD #623, §4 step 0), the frozen pre-strip snapshot of the engine.
type AnswersRow = { id: string };
type ScheduleRow = { id: string };
type EvaluationRow = { phaseId: string };
type LadderOverrideRow = { allergenId: string };
// Same dormant-table treatment for the harvest-candidate pipeline, removed in
// issue #662 (see docs/parked-features.md). Rows survive on disk; the
// `HarvestCandidate` shape that typed them is gone with the feature.
type HarvestCandidateRow = { normalizedKey: string };

export const SINGLETON_ID = 'singleton';

export class AtopicDb extends Dexie {
  answers!: EntityTable<AnswersRow, 'id'>;
  schedule!: EntityTable<ScheduleRow, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  skin_observations!: EntityTable<SkinObservation, 'id'>;
  photos!: EntityTable<SkinPhoto, 'id'>;
  harvest_candidates!: EntityTable<HarvestCandidateRow, 'normalizedKey'>;
  evaluations!: EntityTable<EvaluationRow, 'phaseId'>;
  ladder_overrides!: EntityTable<LadderOverrideRow, 'allergenId'>;
  settings!: EntityTable<SettingsRow, 'id'>;

  constructor(options?: { indexedDB?: IDBFactory; IDBKeyRange?: typeof IDBKeyRange }) {
    super('atopic-helper', options);
    this.version(1).stores({
      answers: '&id',
      schedule: '&id',
    });
    // v2: GeneratedSchedule schema split (permanentEliminations → permanentMother + permanentBaby)
    // and phase type rename ('training' → 'tolerance-building'). No migration hook — pre-launch.
    this.version(2).stores({
      answers: '&id',
      schedule: '&id',
    });
    // v3: adds meals table. Composite unique key &id (= "${date}:${mealType}") + date index
    // for efficient day queries. No data migration needed — table is new.
    this.version(3).stores({
      answers: '&id',
      schedule: '&id',
      meals: '&id, date',
    });
    // v4: adds skin_observations and photos tables. Both keyed by id with a date index
    // for listByDate queries. Blob storage in photos is native to IndexedDB.
    this.version(4).stores({
      answers: '&id',
      schedule: '&id',
      meals: '&id, date',
      skin_observations: '&id, date',
      photos: '&id, date',
    });
    // v5: adds harvest_candidates table. Primary key = normalizedKey (unique); status index
    // for listByStatus queries. No data migration needed — table is new.
    this.version(5).stores({
      answers: '&id',
      schedule: '&id',
      meals: '&id, date',
      skin_observations: '&id, date',
      photos: '&id, date',
      harvest_candidates: '&normalizedKey, status',
    });
    // v6: adds evaluations table (ADR-0016, parked — see docs/parked-features.md).
    // Primary key &phaseId (one immutable
    // verdict per reintroduction attempt) + date index. No upgrade hook — pre-launch.
    this.version(6).stores({
      answers: '&id',
      schedule: '&id',
      meals: '&id, date',
      skin_observations: '&id, date',
      photos: '&id, date',
      harvest_candidates: '&normalizedKey, status',
      evaluations: '&phaseId, date',
    });
    // v7: SkinObservation drops `status` and gains `regions: SkinRegionRecord[]`
    // (issue #361). Same indexes; the schema bump wipes existing skin_observation
    // rows on upgrade so the old shape never reaches the new readers — pre-launch
    // wipe per ADR-0012/0016.
    this.version(7)
      .stores({
        answers: '&id',
        schedule: '&id',
        meals: '&id, date',
        skin_observations: '&id, date',
        photos: '&id, date',
        harvest_candidates: '&normalizedKey, status',
        evaluations: '&phaseId, date',
      })
      .upgrade(async (tx) => {
        await tx.table('skin_observations').clear();
      });
    // v8: SkinPhoto drops `date`, gains `observationId` (FK) and `region`.
    // Index changes from `&id, date` to `&id, observationId`. Photos table wiped
    // on upgrade — pre-launch policy, same as v7 for skin_observations.
    this.version(8)
      .stores({
        answers: '&id',
        schedule: '&id',
        meals: '&id, date',
        skin_observations: '&id, date',
        photos: '&id, observationId',
        harvest_candidates: '&normalizedKey, status',
        evaluations: '&phaseId, date',
      })
      .upgrade(async (tx) => {
        await tx.table('photos').clear();
      });
    // v9: adds ladder_overrides table (ADR-0023, issue #427). Primary key
    // &allergenId — one override per protocol allergen replaces its default
    // ladder from the catalog. No data migration needed — table is new.
    this.version(9).stores({
      answers: '&id',
      schedule: '&id',
      meals: '&id, date',
      skin_observations: '&id, date',
      photos: '&id, observationId',
      harvest_candidates: '&normalizedKey, status',
      evaluations: '&phaseId, date',
      ladder_overrides: '&allergenId',
    });
    // v10: MealId becomes the 3-part composite `${date}:${mealType}:${actor}`
    // (issue #566, spec #564). The `meals` store schema (`'&id, date'`) is
    // unchanged, but old 2-part-keyed rows are queried by the `date` index and
    // would leak into results and break on the 3-part `parseMealId`, so the
    // table is wiped on upgrade — following the v7/v8 wipe-on-shape-change
    // precedent (no meal data worth preserving, confirmed with user).
    this.version(10)
      .stores({
        answers: '&id',
        schedule: '&id',
        meals: '&id, date',
        skin_observations: '&id, date',
        photos: '&id, observationId',
        harvest_candidates: '&normalizedKey, status',
        evaluations: '&phaseId, date',
        ladder_overrides: '&allergenId',
      })
      .upgrade(async (tx) => {
        await tx.table('meals').clear();
      });
    // v11: adds settings table (issue #567). Singleton &id row holding the live
    // master switch(es) — feedingStage today, room for more. Kept off `schedule`
    // so retest/verdict rebuilds can't overwrite it. No data migration — new table.
    this.version(11).stores({
      answers: '&id',
      schedule: '&id',
      meals: '&id, date',
      skin_observations: '&id, date',
      photos: '&id, observationId',
      harvest_candidates: '&normalizedKey, status',
      evaluations: '&phaseId, date',
      ladder_overrides: '&allergenId',
      settings: '&id',
    });
    // v12: custom food (`other:` food ids) and the harvest-candidate pipeline
    // are removed (issue #662). `FoodId` narrows to catalog ids, so any stored
    // meal item carrying an `other:` id is a shape the live readers can no
    // longer represent. Unlike the v7/v8/v10 wipe-on-shape-change precedent this
    // upgrade deletes only the affected rows: a meal made entirely of catalog
    // foods is still representable and is kept. A *mixed* meal is dropped whole
    // rather than stripped of its custom items — a meal silently missing what
    // she logged is a worse record than no meal at all.
    // `harvest_candidates` keeps its store declaration but drops its `status`
    // index: it joins the dormant tables, so its rows survive unread on disk.
    this.version(12)
      .stores({
        answers: '&id',
        schedule: '&id',
        meals: '&id, date',
        skin_observations: '&id, date',
        photos: '&id, observationId',
        harvest_candidates: '&normalizedKey',
        evaluations: '&phaseId, date',
        ladder_overrides: '&allergenId',
        settings: '&id',
      })
      .upgrade(async (tx) => {
        const meals = tx.table('meals');
        // Read `foodId` off the stored row, not `MealItem` — a persisted `other:`
        // id is precisely what the live type can no longer express.
        const doomed = await meals
          .filter((meal: { items?: { foodId?: string }[] }) =>
            (meal.items ?? []).some((item) => item.foodId?.startsWith('other:') === true),
          )
          .primaryKeys();
        await meals.bulkDelete(doomed);
      });
  }
}

export const db = new AtopicDb();
