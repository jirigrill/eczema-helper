import { describe, it, expect } from 'vitest';
import { generateSchedule, insertRestDays, addTrainingPhase, appendReTestPhases, removeReTestPhase } from './schedule-builder';
import { getPermanentEliminations } from '$lib/domain/models';
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

  it('does not include tolerance-building or rest phases', () => {
    const schedule = generateSchedule(minimalAnswers());
    const types = schedule.phases.map(p => p.type);
    expect(types).not.toContain('tolerance-building');
    expect(types).not.toContain('rest');
  });

  it('populates permanentMother from answers.motherAllergies', () => {
    const schedule = generateSchedule(minimalAnswers({ motherAllergies: ['dairy', 'eggs'] }));
    expect(schedule.permanentMother).toEqual(['dairy', 'eggs']);
  });

  it('populates permanentBaby from answers.babyConfirmedAllergies', () => {
    const schedule = generateSchedule(minimalAnswers({ babyConfirmedAllergies: ['nuts'] }));
    expect(schedule.permanentBaby).toEqual(['nuts']);
  });

  it('does not have a permanentEliminations field', () => {
    const schedule = generateSchedule(minimalAnswers());
    expect(schedule).not.toHaveProperty('permanentEliminations');
  });

  it('defaults programStartDate to today when absent', () => {
    const answers = minimalAnswers({ programStartDate: undefined });
    const schedule = generateSchedule(answers);
    const today = new Date().toISOString().split('T')[0];
    expect(schedule.startDate).toBe(today);
  });
});

describe('getPermanentEliminations', () => {
  it('returns concatenation of permanentMother and permanentBaby', () => {
    const schedule = generateSchedule(minimalAnswers({
      motherAllergies: ['dairy'],
      babyConfirmedAllergies: ['nuts'],
    }));
    expect(getPermanentEliminations(schedule)).toEqual(['dairy', 'nuts']);
  });

  it('returns empty array when both fields are empty', () => {
    const schedule = generateSchedule(minimalAnswers());
    expect(getPermanentEliminations(schedule)).toEqual([]);
  });

  it('deduplicates allergens that appear in both mother and baby lists', () => {
    const schedule = generateSchedule(minimalAnswers({
      motherAllergies: ['dairy'],
      babyConfirmedAllergies: ['dairy'],
    }));
    expect(getPermanentEliminations(schedule)).toEqual(['dairy']);
  });
});

describe('insertRestDays', () => {
  const baseSchedule: GeneratedSchedule = {
    permanentMother: [],
    permanentBaby: [],
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
    permanentMother: [],
    permanentBaby: [],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-05-26',
    phases: [
      phase({ id: 'reintro-dairy',       type: 'reintroduction', startDate: '2026-05-20', endDate: '2026-05-23' }),
      phase({ id: 'rest-after-reintro-dairy', type: 'rest',       startDate: '2026-05-24', endDate: '2026-05-26' }),
    ],
  };

  it('appends a tolerance-building phase after the rest phase when one follows the reintro', () => {
    const result = addTrainingPhase(scheduleWithRest, 'dairy', 'reintro-dairy');
    const tb = result.phases.find(p => p.type === 'tolerance-building')!;
    expect(tb.startDate).toBe('2026-05-27');
    expect(tb.endDate).toBe('');
  });

  it('tolerance-building phase is open-ended (endDate is empty string)', () => {
    const result = addTrainingPhase(scheduleWithRest, 'dairy', 'reintro-dairy');
    const tb = result.phases.find(p => p.type === 'tolerance-building')!;
    expect(tb.endDate).toBe('');
  });

  it('returns the original schedule unchanged when phase id is not found', () => {
    const result = addTrainingPhase(scheduleWithRest, 'dairy', 'nonexistent');
    expect(result).toBe(scheduleWithRest);
  });
});

// ── appendReTestPhases ───────────────────────────────────────

// Base schedule: peanut is a baby allergy, dairy/eggs are protocol allergens.
// No retest phase yet. estimatedEndDate is 2026-06-20; today = 2026-06-21.
const retestBase: GeneratedSchedule = {
  permanentMother: ['fish'],
  permanentBaby: ['peanut'],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-06-20',
  phases: [
    phase({ id: 'reset',       type: 'reset',          startDate: '2026-05-01', endDate: '2026-05-05' }),
    phase({ id: 'elimination', type: 'elimination',    startDate: '2026-05-06', endDate: '2026-05-19', categoryIds: ['dairy', 'eggs'] }),
    phase({ id: 'reintro-dairy', type: 'reintroduction', startDate: '2026-05-20', endDate: '2026-05-23', categoryIds: ['dairy'] }),
    phase({ id: 'reintro-eggs',  type: 'reintroduction', startDate: '2026-05-24', endDate: '2026-05-27', categoryIds: ['eggs'] }),
  ],
};

const TODAY = '2026-06-21';

describe('appendReTestPhases — happy path', () => {
  it('returns ok with a schedule containing the new reintroduction phase', () => {
    const result = appendReTestPhases(retestBase, ['peanut'], TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const retestPhase = result.data.phases.find(p => p.categoryIds.includes('peanut') && p.type === 'reintroduction');
    expect(retestPhase).toBeDefined();
  });

  it('new retest phase starts the day after estimatedEndDate', () => {
    const result = appendReTestPhases(retestBase, ['peanut'], TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const retestPhase = result.data.phases.find(p => p.categoryIds.includes('peanut') && p.type === 'reintroduction')!;
    expect(retestPhase.startDate).toBe('2026-06-21');
  });
});

describe('appendReTestPhases — not-baby-confirmed', () => {
  it('rejects a mother allergen (not retestable)', () => {
    const result = appendReTestPhases(retestBase, ['fish'], TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not-baby-confirmed');
    expect(result.error.invalidIds).toContain('fish');
  });

  it('rejects a protocol-only allergen (not in permanentBaby)', () => {
    const result = appendReTestPhases(retestBase, ['dairy'], TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not-baby-confirmed');
    expect(result.error.invalidIds).toContain('dairy');
  });
});

describe('appendReTestPhases — already-cleared', () => {
  // peanut has been retested and passed → status is 'passed', not 'permanent-baby'
  const scheduleWithPassedRetest: GeneratedSchedule = {
    ...retestBase,
    phases: [
      ...retestBase.phases,
      phase({ id: 'retest-peanut', type: 'reintroduction', startDate: '2026-06-01', endDate: '2026-06-04', categoryIds: ['peanut'] }),
      // no rest after → peanut passed
    ],
  };

  it('rejects peanut when its retest already passed', () => {
    const result = appendReTestPhases(scheduleWithPassedRetest, ['peanut'], TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('already-cleared');
    expect(result.error.invalidIds).toContain('peanut');
  });
});

describe('appendReTestPhases — retest-already-scheduled', () => {
  // peanut has a future reintroduction phase (starts after today)
  const scheduleWithFutureRetest: GeneratedSchedule = {
    ...retestBase,
    phases: [
      ...retestBase.phases,
      phase({ id: 'retest-peanut', type: 'reintroduction', startDate: '2026-06-25', endDate: '2026-06-28', categoryIds: ['peanut'] }),
    ],
  };

  it('rejects when a future retest phase already exists', () => {
    const result = appendReTestPhases(scheduleWithFutureRetest, ['peanut'], TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('retest-already-scheduled');
    expect(result.error.invalidIds).toContain('peanut');
  });

  it('rejects when an in-progress retest phase exists (started before today)', () => {
    const scheduleWithActiveRetest: GeneratedSchedule = {
      ...retestBase,
      phases: [
        ...retestBase.phases,
        phase({ id: 'retest-peanut', type: 'reintroduction', startDate: '2026-06-19', endDate: '2026-06-22', categoryIds: ['peanut'] }),
      ],
    };
    const result = appendReTestPhases(scheduleWithActiveRetest, ['peanut'], TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('retest-already-scheduled');
    expect(result.error.invalidIds).toContain('peanut');
  });
});

// ── removeReTestPhase ────────────────────────────────────────

const scheduleWithPlannedRetest: GeneratedSchedule = {
  ...retestBase,
  estimatedEndDate: '2026-06-28',
  phases: [
    ...retestBase.phases,
    phase({ id: 'retest-peanut-2026-06-21', type: 'reintroduction', startDate: '2026-06-21', endDate: '2026-06-24', categoryIds: ['peanut'] }),
  ],
};

describe('removeReTestPhase — happy path', () => {
  it('removes the retest phase for the given categoryId', () => {
    const result = removeReTestPhase(scheduleWithPlannedRetest, 'peanut', TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stillPresent = result.data.phases.some(
      p => p.categoryIds.includes('peanut') && p.id.startsWith('retest-')
    );
    expect(stillPresent).toBe(false);
  });

  it('leaves estimatedEndDate unchanged (drop-and-leave semantics)', () => {
    const result = removeReTestPhase(scheduleWithPlannedRetest, 'peanut', TODAY);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.estimatedEndDate).toBe(scheduleWithPlannedRetest.estimatedEndDate);
  });
});

describe('removeReTestPhase — not-scheduled', () => {
  // No future retest phase exists for peanut (retestBase has none)
  it('returns not-scheduled when no future retest phase exists for the allergen', () => {
    const result = removeReTestPhase(retestBase, 'peanut', TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not-scheduled');
    expect(result.error.categoryId).toBe('peanut');
  });

  it('returns not-scheduled when the retest phase is already in the past', () => {
    const scheduleWithPastRetest: GeneratedSchedule = {
      ...retestBase,
      phases: [
        ...retestBase.phases,
        phase({ id: 'retest-peanut-2026-06-01', type: 'reintroduction', startDate: '2026-06-01', endDate: '2026-06-04', categoryIds: ['peanut'] }),
      ],
    };
    const result = removeReTestPhase(scheduleWithPastRetest, 'peanut', TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('not-scheduled');
  });
});

describe('removeReTestPhase — protocol-phase', () => {
  // A protocol reintroduction phase exists for dairy — NOT retest- prefixed
  const scheduleWithProtocolReintro: GeneratedSchedule = {
    ...retestBase,
    phases: [
      ...retestBase.phases,
      // dairy is being retested via a manually crafted protocol phase (no retest- prefix)
      phase({ id: 'reintro-dairy-round2', type: 'reintroduction', startDate: '2026-06-25', endDate: '2026-06-28', categoryIds: ['dairy'] }),
    ],
    permanentBaby: ['peanut', 'dairy'],
  };

  it('returns protocol-phase when an active/future reintroduction exists but is not retest- prefixed', () => {
    const result = removeReTestPhase(scheduleWithProtocolReintro, 'dairy', TODAY);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('protocol-phase');
    expect(result.error.categoryId).toBe('dairy');
  });
});
