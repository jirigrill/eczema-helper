import Dexie, { type EntityTable } from 'dexie';

import type { HarvestCandidate } from '$lib/domain/harvest-candidate';
import type {
  GeneratedSchedule,
  Ladder,
  Meal,
  QuestionnaireAnswers,
  ReintroductionEvaluation,
  SkinObservation,
  SkinPhoto,
} from '$lib/domain/models';

type AnswersRow = QuestionnaireAnswers & { id: string };
type ScheduleRow = GeneratedSchedule & { id: string };

export const SINGLETON_ID = 'singleton';

export class AtopicDb extends Dexie {
  answers!: EntityTable<AnswersRow, 'id'>;
  schedule!: EntityTable<ScheduleRow, 'id'>;
  meals!: EntityTable<Meal, 'id'>;
  skin_observations!: EntityTable<SkinObservation, 'id'>;
  photos!: EntityTable<SkinPhoto, 'id'>;
  harvest_candidates!: EntityTable<HarvestCandidate, 'normalizedKey'>;
  evaluations!: EntityTable<ReintroductionEvaluation, 'phaseId'>;
  ladder_overrides!: EntityTable<Ladder, 'allergenId'>;

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
    // v6: adds evaluations table (ADR-0016). Primary key &phaseId (one immutable
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
  }
}

export const db = new AtopicDb();
