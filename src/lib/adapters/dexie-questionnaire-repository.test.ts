import { describe, it, expect, beforeEach } from 'vitest';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { DexieQuestionnaireRepository } from './dexie-questionnaire-repository';
import { AtopicDb } from '$lib/db/atopic-db';
import type { QuestionnaireAnswers } from '$lib/domain/models';

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: '2025-06-01',
  completedAt: '2025-06-01T10:00:00.000Z',
  testedAllergens: ['dairy', 'egg'],
};

describe('DexieQuestionnaireRepository', () => {
  let repo: DexieQuestionnaireRepository;

  beforeEach(() => {
    const db = new AtopicDb({ indexedDB, IDBKeyRange });
    repo = new DexieQuestionnaireRepository(db);
  });

  it('returns null when nothing has been saved', async () => {
    expect(await repo.load()).toBeNull();
  });

  it('returns saved answers after save', async () => {
    await repo.save(sampleAnswers);
    expect(await repo.load()).toEqual(sampleAnswers);
  });

  it('overwrites previous answers on second save', async () => {
    await repo.save(sampleAnswers);
    const updated = { ...sampleAnswers, eczemaSeverity: 'severe' as const };
    await repo.save(updated);
    expect(await repo.load()).toEqual(updated);
  });
});
