import Dexie, { type EntityTable } from 'dexie';
import type { Meal, QuestionnaireAnswers, GeneratedSchedule } from '$lib/domain/models';

type AnswersRow = QuestionnaireAnswers & { id: string };
type ScheduleRow = GeneratedSchedule & { id: string };

export const SINGLETON_ID = 'singleton';

export class AtopicDb extends Dexie {
  answers!: EntityTable<AnswersRow, 'id'>;
  schedule!: EntityTable<ScheduleRow, 'id'>;
  meals!: EntityTable<Meal, 'id'>;

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
  }
}

export const db = new AtopicDb();
