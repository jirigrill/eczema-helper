import { describe, it, expect, beforeEach, vi } from 'vitest';
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
  let db: AtopicDb;

  beforeEach(() => {
    db = new AtopicDb({ indexedDB, IDBKeyRange });
    repo = new DexieQuestionnaireRepository(db);
  });

  it('returns Ok(null) when nothing has been saved', async () => {
    expect(await repo.load()).toEqual({ ok: true, data: null });
  });

  it('returns Ok(answers) after save', async () => {
    expect(await repo.save(sampleAnswers)).toMatchObject({ ok: true });
    expect(await repo.load()).toMatchObject({ ok: true, data: sampleAnswers });
  });

  it('overwrites previous answers on second save', async () => {
    await repo.save(sampleAnswers);
    const updated = { ...sampleAnswers, eczemaSeverity: 'severe' as const };
    await repo.save(updated);
    expect(await repo.load()).toMatchObject({ ok: true, data: updated });
  });

  it('returns Err when save throws', async () => {
    vi.spyOn(db.answers, 'put').mockRejectedValueOnce(new Error('DB write error'));
    expect(await repo.save(sampleAnswers)).toEqual({ ok: false, error: 'DB write error' });
  });

  it('returns Err when load throws', async () => {
    vi.spyOn(db.answers, 'get').mockRejectedValueOnce(new Error('DB read error'));
    expect(await repo.load()).toEqual({ ok: false, error: 'DB read error' });
  });
});
