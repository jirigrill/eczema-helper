import Dexie, { type EntityTable } from 'dexie';
import type { Meal, QuestionnaireAnswers, GeneratedSchedule, SkinObservation, SkinPhoto, ReintroductionEvaluation } from '$lib/domain/models';
import type { HarvestCandidate } from '$lib/domain/harvest-candidate';

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
  }
}

export const db = new AtopicDb();
