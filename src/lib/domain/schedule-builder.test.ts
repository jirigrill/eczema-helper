import { describe, it, expect } from 'vitest';
import { generateSchedule, insertRestDays, addTrainingPhase } from './schedule-builder';
import type { GeneratedSchedule, QuestionnaireAnswers, SchedulePhase } from '$lib/domain/models';

function minimalAnswers(overrides: Partial<QuestionnaireAnswers> = {}): QuestionnaireAnswers {
  return {
    eczemaSeverity: 'moderate',
    motherAllergies: [],
    babyConfirmedAllergies: [],
    testedAllergens: ['dairy', 'eggs'],
    programStartDate: '2026-05-01',
    babyBirthDate: '2026-01-01',
    completedAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  };
}

function phase(overrides: Partial<SchedulePhase> & Pick<SchedulePhase, 'id' | 'type' | 'startDate' | 'endDate'>): SchedulePhase {
  return { label: '', description: '', categoryIds: [], ...overrides };
}

describe('generateSchedule', () => {
  it('produces reset → elimination → reintroduction phases in order', () => {
    const schedule = generateSchedule(minimalAnswers());
    const types = schedule.phases.map(p => p.type);
    expect(types).toEqual(['reset', 'elimination', 'reintroduction', 'reintroduction']);
  });

  it('reset phase is always 5 days', () => {
    const schedule = generateSchedule(minimalAnswers());
    const reset = schedule.phases.find(p => p.type === 'reset')!;
    expect(reset.startDate).toBe('2026-05-01');
    expect(reset.endDate).toBe('2026-05-05');
  });

  it('elimination phase is 14 days for moderate severity', () => {
    const schedule = generateSchedule(minimalAnswers({ eczemaSeverity: 'moderate' }));
    const elim = schedule.phases.find(p => p.type === 'elimination')!;
    expect(elim.startDate).toBe('2026-05-06');
    expect(elim.endDate).toBe('2026-05-19');
  });

  it('elimination phase is 21 days for severe severity', () => {
    const schedule = generateSchedule(minimalAnswers({ eczemaSeverity: 'severe' }));
    const elim = schedule.phases.find(p => p.type === 'elimination')!;
    expect(elim.startDate).toBe('2026-05-06');
    expect(elim.endDate).toBe('2026-05-26');
  });

  it('excludes permanent allergens from the reintroduction queue', () => {
    const schedule = generateSchedule(minimalAnswers({ motherAllergies: ['dairy'] }));
    const reintros = schedule.phases.filter(p => p.type === 'reintroduction');
    const reintroIds = reintros.flatMap(p => p.categoryIds);
    expect(reintroIds).not.toContain('dairy');
    expect(reintroIds).toContain('eggs');
  });

  it('does not include training or rest phases', () => {
    const schedule = generateSchedule(minimalAnswers());
    const types = schedule.phases.map(p => p.type);
    expect(types).not.toContain('training');
    expect(types).not.toContain('rest');
  });

  it('defaults programStartDate to today when absent', () => {
    const answers = minimalAnswers({ programStartDate: undefined });
    const schedule = generateSchedule(answers);
    const today = new Date().toISOString().split('T')[0];
    expect(schedule.startDate).toBe(today);
  });
});

describe('insertRestDays', () => {
  const baseSchedule: GeneratedSchedule = {
    permanentEliminations: [],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-05-30',
    phases: [
      phase({ id: 'reset',         type: 'reset',          startDate: '2026-05-01', endDate: '2026-05-05' }),
      phase({ id: 'elimination',   type: 'elimination',    startDate: '2026-05-06', endDate: '2026-05-19' }),
      phase({ id: 'reintro-dairy', type: 'reintroduction', startDate: '2026-05-20', endDate: '2026-05-23' }),
      phase({ id: 'reintro-eggs',  type: 'reintroduction', startDate: '2026-05-24', endDate: '2026-05-27' }),
    ],
  };

  it('inserts a rest phase immediately after the target phase', () => {
    const result = insertRestDays(baseSchedule, 'reintro-dairy', 3);
    const ids = result.phases.map(p => p.id);
    const restIdx = ids.indexOf('rest-after-reintro-dairy');
    const dairyIdx = ids.indexOf('reintro-dairy');
    expect(restIdx).toBe(dairyIdx + 1);
  });

  it('shifts subsequent non-training phases forward by the number of rest days', () => {
    const result = insertRestDays(baseSchedule, 'reintro-dairy', 3);
    const eggs = result.phases.find(p => p.id === 'reintro-eggs')!;
    expect(eggs.startDate).toBe('2026-05-27');
    expect(eggs.endDate).toBe('2026-05-30');
  });

  it('returns the original schedule unchanged when phase id is not found', () => {
    const result = insertRestDays(baseSchedule, 'nonexistent', 3);
    expect(result).toBe(baseSchedule);
  });
});

describe('addTrainingPhase', () => {
  const scheduleWithRest: GeneratedSchedule = {
    permanentEliminations: [],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-05-26',
    phases: [
      phase({ id: 'reintro-dairy',       type: 'reintroduction', startDate: '2026-05-20', endDate: '2026-05-23' }),
      phase({ id: 'rest-after-reintro-dairy', type: 'rest',       startDate: '2026-05-24', endDate: '2026-05-26' }),
    ],
  };

  it('appends a training phase after the rest phase when one follows the reintro', () => {
    const result = addTrainingPhase(scheduleWithRest, 'dairy', 'reintro-dairy');
    const training = result.phases.find(p => p.type === 'training')!;
    expect(training.startDate).toBe('2026-05-27');
    expect(training.endDate).toBe('');
  });

  it('training phase is open-ended (endDate is empty string)', () => {
    const result = addTrainingPhase(scheduleWithRest, 'dairy', 'reintro-dairy');
    const training = result.phases.find(p => p.type === 'training')!;
    expect(training.endDate).toBe('');
  });

  it('returns the original schedule unchanged when phase id is not found', () => {
    const result = addTrainingPhase(scheduleWithRest, 'dairy', 'nonexistent');
    expect(result).toBe(scheduleWithRest);
  });
});
