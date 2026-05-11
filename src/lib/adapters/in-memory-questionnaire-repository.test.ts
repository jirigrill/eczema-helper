import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryQuestionnaireRepository } from './in-memory-questionnaire-repository';
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

describe('InMemoryQuestionnaireRepository', () => {
  let repo: InMemoryQuestionnaireRepository;

  beforeEach(() => {
    repo = new InMemoryQuestionnaireRepository();
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
