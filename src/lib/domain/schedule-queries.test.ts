import { describe, expect, it } from 'vitest';

import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { ALLERGENS } from '$lib/data/allergen-catalog/allergen-catalog';
import type {
  AllergenId,
  GeneratedSchedule,
  Meal,
  MealItem,
  QuestionnaireAnswers,
  SchedulePhase,
} from '$lib/domain/models';
import { addDays } from '$lib/utils/date';

import { getAllergenStatuses } from './allergen-status';
import {
  type ReadyContext,
  buildScheduleContext,
  conflictingAllergens,
  detectConflicts,
  eliminatedFor,
  getPhaseForDate,
  getProtocolEliminatedForDate,
  getReintroductionDayInfo,
  getScheduleProgress,
  isPhaseEndForEvaluation,
  mealConflicts,
} from './schedule-queries';
import { copyMealInto } from './working-meal';

const catalog = new BundledCatalogAdapter();

function phase(
  overrides: Partial<SchedulePhase> & Pick<SchedulePhase, 'id' | 'type' | 'startDate' | 'endDate'>,
): SchedulePhase {
  return { allergenIds: [], ...overrides };
}

const baseSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({
      id: 'reset',
      type: 'reset',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
    }),
    phase({
      id: 'elimination',
      type: 'elimination',
      startDate: '2026-05-06',
      endDate: '2026-05-26',
      allergenIds: ['dairy', 'eggs'],
    }),
    phase({
      id: 'reintro-dairy',
      type: 'reintroduction',
      startDate: '2026-05-27',
      endDate: '2026-05-30',
      allergenIds: ['dairy'],
    }),
  ],
};

// Two successive reintros without a rest between them → first allergen is "passed"
const scheduleWithPassedAllergen: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({
      id: 'reset',
      type: 'reset',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
    }),
    phase({
      id: 'elimination',
      type: 'elimination',
      startDate: '2026-05-06',
      endDate: '2026-05-26',
      allergenIds: ['dairy', 'eggs', 'wheat'],
    }),
    phase({
      id: 'reintro-dairy',
      type: 'reintroduction',
      startDate: '2026-05-27',
      endDate: '2026-05-30',
      allergenIds: ['dairy'],
    }),
    phase({
      id: 'reintro-eggs',
      type: 'reintroduction',
      startDate: '2026-05-31',
      endDate: '2026-06-03',
      allergenIds: ['eggs'],
    }),
  ],
};

// Reintro followed by a rest phase → allergen is NOT considered passed
const scheduleWithRestPhase: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({
      id: 'reset',
      type: 'reset',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
    }),
    phase({
      id: 'elimination',
      type: 'elimination',
      startDate: '2026-05-06',
      endDate: '2026-05-26',
      allergenIds: ['dairy', 'eggs'],
    }),
    phase({
      id: 'reintro-dairy',
      type: 'reintroduction',
      startDate: '2026-05-27',
      endDate: '2026-05-30',
      allergenIds: ['dairy'],
    }),
    phase({
      id: 'rest-1',
      type: 'rest',
      startDate: '2026-05-31',
      endDate: '2026-06-02',
    }),
  ],
};

// Training phase starts after rest; a subsequent reintro overlaps with it
const scheduleWithTraining: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({
      id: 'reset',
      type: 'reset',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
    }),
    phase({
      id: 'elimination',
      type: 'elimination',
      startDate: '2026-05-06',
      endDate: '2026-05-26',
      allergenIds: ['dairy', 'eggs'],
    }),
    phase({
      id: 'reintro-dairy',
      type: 'reintroduction',
      startDate: '2026-05-27',
      endDate: '2026-05-30',
      allergenIds: ['dairy'],
    }),
    phase({
      id: 'rest-1',
      type: 'rest',
      startDate: '2026-05-31',
      endDate: '2026-06-01',
    }),
    // training starts Jun 2, open-ended (endDate '')
    phase({
      id: 'tolerance-building-dairy',
      type: 'tolerance-building',
      startDate: '2026-06-02',
      endDate: '',
      allergenIds: ['dairy'],
    }),
    // reintro-eggs also starts Jun 2 — overlaps with tolerance-building
    phase({
      id: 'reintro-eggs',
      type: 'reintroduction',
      startDate: '2026-06-02',
      endDate: '2026-06-05',
      allergenIds: ['eggs'],
    }),
  ],
};

describe('getPhaseForDate', () => {
  it('returns reset phase on first day of program', () => {
    const phase = getPhaseForDate(baseSchedule, '2026-05-01');
    expect(phase?.id).toBe('reset');
  });

  it('returns reset phase on last day of reset', () => {
    const phase = getPhaseForDate(baseSchedule, '2026-05-05');
    expect(phase?.id).toBe('reset');
  });

  it('returns elimination phase on first day of elimination', () => {
    const phase = getPhaseForDate(baseSchedule, '2026-05-06');
    expect(phase?.id).toBe('elimination');
  });

  it('returns reintroduction phase during reintro', () => {
    const phase = getPhaseForDate(baseSchedule, '2026-05-28');
    expect(phase?.id).toBe('reintro-dairy');
  });

  it('returns null before program starts', () => {
    const phase = getPhaseForDate(baseSchedule, '2026-04-30');
    expect(phase).toBeNull();
  });

  it('returns null after all phases end', () => {
    const phase = getPhaseForDate(baseSchedule, '2026-05-31');
    expect(phase).toBeNull();
  });
});

describe('getProtocolEliminatedForDate', () => {
  it('returns no protocol eliminations during reset (permanents are not protocol)', () => {
    const schedule: GeneratedSchedule = {
      ...baseSchedule,
      permanentMother: ['soy'],
      permanentBaby: [],
    };
    const slugs = getProtocolEliminatedForDate(schedule, '2026-05-03');
    expect(slugs).toEqual([]);
  });

  it('returns protocol allergens during elimination phase', () => {
    const slugs = getProtocolEliminatedForDate(baseSchedule, '2026-05-10');
    expect(slugs).toContain('dairy');
    expect(slugs).toContain('eggs');
  });

  it('excludes permanent eliminations even when a permanent slug matches a protocol id', () => {
    const schedule: GeneratedSchedule = {
      ...baseSchedule,
      permanentMother: ['dairy'],
      permanentBaby: [],
    };
    const slugs = getProtocolEliminatedForDate(schedule, '2026-05-10');
    // `dairy` is a protocol allergen in the elimination phase → still eliminated
    // via its protocol status, but never surfaced through the permanent set.
    expect(slugs).toContain('dairy');
    expect(slugs).toContain('eggs');
  });

  it('allows the reintroduced allergen during its reintro phase', () => {
    const slugs = getProtocolEliminatedForDate(baseSchedule, '2026-05-28');
    expect(slugs).not.toContain('dairy');
  });

  it('still eliminates other protocol allergens during reintro', () => {
    const slugs = getProtocolEliminatedForDate(baseSchedule, '2026-05-28');
    expect(slugs).toContain('eggs');
  });

  it('returns empty array before program starts', () => {
    const slugs = getProtocolEliminatedForDate(baseSchedule, '2026-04-30');
    expect(slugs).toEqual([]);
  });
});

describe('getProtocolEliminatedForDate — already-passed allergens', () => {
  // dairy reintro is followed directly by eggs reintro (no rest) → dairy is "passed"
  // during reintro-eggs: dairy allowed, eggs allowed (current), wheat eliminated

  it('allows an allergen that was tolerated in a previous reintro', () => {
    const slugs = getProtocolEliminatedForDate(scheduleWithPassedAllergen, '2026-06-01');
    expect(slugs).not.toContain('dairy');
  });

  it('allows the allergen currently being reintroduced', () => {
    const slugs = getProtocolEliminatedForDate(scheduleWithPassedAllergen, '2026-06-01');
    expect(slugs).not.toContain('eggs');
  });

  it('still eliminates allergens not yet reintroduced', () => {
    const slugs = getProtocolEliminatedForDate(scheduleWithPassedAllergen, '2026-06-01');
    expect(slugs).toContain('wheat');
  });
});

describe('getProtocolEliminatedForDate — rest phase', () => {
  // dairy reintro followed by rest → dairy NOT passed (reaction triggered the rest)
  // during rest: all protocol allergens remain eliminated

  it('eliminates the preceding reintro allergen during rest (not passed because rest follows)', () => {
    const slugs = getProtocolEliminatedForDate(scheduleWithRestPhase, '2026-06-01');
    expect(slugs).toContain('dairy');
  });

  it('eliminates all other protocol allergens during rest', () => {
    const slugs = getProtocolEliminatedForDate(scheduleWithRestPhase, '2026-06-01');
    expect(slugs).toContain('eggs');
  });
});

// Regression: reacted allergen must stay eliminated in phases after its rest
// (the old tolerance-building recursion could incorrectly drop it)
const scheduleReactedThenRetest: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({
      id: 'reset',
      type: 'reset',
      startDate: '2026-05-01',
      endDate: '2026-05-05',
    }),
    phase({
      id: 'elimination',
      type: 'elimination',
      startDate: '2026-05-06',
      endDate: '2026-05-26',
      allergenIds: ['dairy', 'eggs'],
    }),
    phase({
      id: 'reintro-dairy',
      type: 'reintroduction',
      startDate: '2026-05-27',
      endDate: '2026-05-30',
      allergenIds: ['dairy'],
    }),
    phase({
      id: 'rest-1',
      type: 'rest',
      startDate: '2026-05-31',
      endDate: '2026-06-02',
    }),
    phase({
      id: 'reintro-eggs',
      type: 'reintroduction',
      startDate: '2026-06-03',
      endDate: '2026-06-06',
      allergenIds: ['eggs'],
    }),
  ],
};

describe('getProtocolEliminatedForDate — reacted allergen stays eliminated', () => {
  // dairy reintro → rest (reacted), then eggs reintro starts
  // dairy status is now 'reacted' → must appear in eliminated slugs during eggs reintro

  it('reacted allergen appears in eliminated slugs during a subsequent reintro phase', () => {
    const slugs = getProtocolEliminatedForDate(scheduleReactedThenRetest, '2026-06-04');
    expect(slugs).toContain('dairy');
  });

  it('the currently-tested allergen is not eliminated during its own reintro', () => {
    const slugs = getProtocolEliminatedForDate(scheduleReactedThenRetest, '2026-06-04');
    expect(slugs).not.toContain('eggs');
  });
});

describe('getPhaseForDate — training phase', () => {
  // training is open-ended (endDate = '') and lower priority than regular phases

  it('returns the concurrent non-training phase when both are active', () => {
    // Jun 2: both training-dairy and reintro-eggs are active
    const result = getPhaseForDate(scheduleWithTraining, '2026-06-02');
    expect(result?.id).toBe('reintro-eggs');
  });

  it('returns the training phase when it is the only active phase', () => {
    // Jun 6: reintro-eggs ended Jun 5; training-dairy is still open-ended
    const result = getPhaseForDate(scheduleWithTraining, '2026-06-06');
    expect(result?.id).toBe('tolerance-building-dairy');
  });

  it('treats open-ended training phase as active on any date after its start', () => {
    const result = getPhaseForDate(scheduleWithTraining, '2026-12-31');
    expect(result?.id).toBe('tolerance-building-dairy');
  });
});

describe('getScheduleProgress', () => {
  // 10-day program: 2026-05-01 → 2026-05-10
  const tenDaySchedule: GeneratedSchedule = {
    permanentMother: [],
    permanentBaby: [],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-05-10',
    phases: [],
  };

  it('clamps to day 1 when called before program start', () => {
    const result = getScheduleProgress(tenDaySchedule, '2026-04-28');
    expect(result.currentDay).toBe(1);
    expect(result.totalDays).toBe(10);
  });

  it('clamps to totalDays when called after program end', () => {
    const result = getScheduleProgress(tenDaySchedule, '2026-05-20');
    expect(result.currentDay).toBe(10);
    expect(result.totalDays).toBe(10);
  });

  it('returns correct mid-program day', () => {
    const result = getScheduleProgress(tenDaySchedule, '2026-05-05');
    expect(result.currentDay).toBe(5);
    expect(result.totalDays).toBe(10);
  });

  it('returns 100 on the last day', () => {
    const result = getScheduleProgress(tenDaySchedule, '2026-05-10');
    expect(result.percentComplete).toBe(100);
  });

  it('rounds percentComplete correctly for fractional values', () => {
    // day 1 of 3: Math.round(1/3 * 100) = Math.round(33.33) = 33
    const threeDay: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate: '2026-05-01',
      estimatedEndDate: '2026-05-03',
      phases: [],
    };
    const result = getScheduleProgress(threeDay, '2026-05-01');
    expect(result.percentComplete).toBe(33);
  });
});

// ── getReintroductionDayInfo ──────────────────────────────────
// dairy protocol = 5 days; evaluation on day 5 only.
// The old REINTRO_4DAY clamped to index 3 (isEvaluationDay: true) for any day ≥ 4,
// so day 4 of dairy would incorrectly return isEvaluationDay: true.

const dairyReintroSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({
      id: 'reintro-dairy',
      type: 'reintroduction',
      startDate: '2026-05-27',
      endDate: '2026-06-01',
      allergenIds: ['dairy'],
    }),
  ],
};

describe('getReintroductionDayInfo', () => {
  it('day 5 of a 6-day dairy reintro is NOT the evaluation day', () => {
    // Tracer bullet: dairy has 6 protocol days — only the last day is evaluation.
    const info = getReintroductionDayInfo(dairyReintroSchedule, '2026-05-31', catalog, 'breastfed'); // day 5
    expect(info).not.toBeNull();
    expect(info!.isEvaluationDay).toBe(false);
  });

  it('day 6 of a 6-day dairy reintro IS the evaluation day', () => {
    const info = getReintroductionDayInfo(dairyReintroSchedule, '2026-06-01', catalog, 'breastfed'); // day 6
    expect(info).not.toBeNull();
    expect(info!.isEvaluationDay).toBe(true);
  });

  it('returns null outside a reintroduction phase', () => {
    const eliminationSchedule: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate: '2026-05-01',
      estimatedEndDate: '2026-07-01',
      phases: [
        phase({
          id: 'elimination',
          type: 'elimination',
          startDate: '2026-05-01',
          endDate: '2026-05-20',
          allergenIds: ['dairy'],
        }),
      ],
    };
    const info = getReintroductionDayInfo(eliminationSchedule, '2026-05-10', catalog, 'breastfed');
    expect(info).toBeNull();
  });

  it('returned struct has no label or guidance fields', () => {
    const info = getReintroductionDayInfo(dairyReintroSchedule, '2026-05-27', catalog, 'breastfed'); // day 1
    expect(info).not.toBeNull();
    expect('label' in info!).toBe(false);
    expect('guidance' in info!).toBe(false);
  });

  it('resolves the rung against the passed feedingStage, not a fixed stage', () => {
    // legumes: breastfed ladder is 3 rungs (checkpoint on day 3); the mixed
    // ladder is 4 rungs (checkpoint on day 4). Day 3 therefore diverges by stage.
    const legumesReintro: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate: '2026-05-01',
      estimatedEndDate: '2026-07-01',
      phases: [
        phase({
          id: 'reintro-legumes',
          type: 'reintroduction',
          startDate: '2026-05-27',
          endDate: '2026-05-30',
          allergenIds: ['legumes'],
        }),
      ],
    };
    const day3 = '2026-05-29';
    expect(
      getReintroductionDayInfo(legumesReintro, day3, catalog, 'breastfed')!.isEvaluationDay,
    ).toBe(true);
    expect(getReintroductionDayInfo(legumesReintro, day3, catalog, 'mixed')!.isEvaluationDay).toBe(
      false,
    );
  });
});

// ── getReintroductionDayInfo — ladder-driven isEvaluationDay coverage ────────
// Derived output at every day-in-phase must equal the ladder's
// `isEvaluationCheckpoint` at the corresponding rung, for every ladder-bearing
// allergen in the catalog.

describe('getReintroductionDayInfo — ladder drives isEvaluationDay', () => {
  type LadderRecord = {
    id: string;
    ladder: { stages: { breastfed?: readonly { isEvaluationCheckpoint: boolean }[] } };
  };
  const ladderAllergens = ALLERGENS.filter(
    (a): a is typeof a & LadderRecord =>
      'ladder' in a &&
      !!(a as { ladder?: { stages?: { breastfed?: unknown } } }).ladder?.stages?.breastfed,
  );

  it('covers every ladder-bearing allergen in the catalog', () => {
    expect(ladderAllergens.length).toBeGreaterThan(0);
  });

  for (const allergen of ladderAllergens) {
    const breastfed = allergen.ladder.stages.breastfed!;
    const totalDays = breastfed.length;
    const startDate = '2026-05-01';
    const endDate = addDays(startDate, totalDays - 1);
    const schedule: GeneratedSchedule = {
      permanentMother: [],
      permanentBaby: [],
      startDate,
      estimatedEndDate: addDays(startDate, totalDays + 30),
      phases: [
        phase({
          id: `reintro-${allergen.id}`,
          type: 'reintroduction',
          startDate,
          endDate,
          allergenIds: [allergen.id as SchedulePhase['allergenIds'][number]],
        }),
      ],
    };

    for (let dayIndex = 0; dayIndex < totalDays; dayIndex++) {
      const date = addDays(startDate, dayIndex);
      const expected = breastfed[dayIndex]!.isEvaluationCheckpoint;
      it(`${allergen.id} day ${dayIndex + 1}/${totalDays} → isEvaluationDay=${expected}`, () => {
        const info = getReintroductionDayInfo(schedule, date, catalog, 'breastfed');
        expect(info).not.toBeNull();
        expect(info!.isEvaluationDay).toBe(expected);
      });
    }
  }
});

// ── buildScheduleContext ──────────────────────────────────────

const sampleAnswers: QuestionnaireAnswers = {
  babyBirthDate: '2025-01-01',
  eczemaSeverity: 'moderate',
  motherAllergies: [],
  babyConfirmedAllergies: [],
  programStartDate: '2026-05-01',
  completedAt: '2026-05-01T10:00:00.000Z',
  testedAllergens: ['dairy', 'eggs'],
  feedingStage: 'breastfed',
};

// reintro schedule: dairy reintro 2026-05-27→05-31
const reintroSchedule: GeneratedSchedule = {
  permanentMother: [],
  permanentBaby: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({
      id: 'elimination',
      type: 'elimination',
      startDate: '2026-05-01',
      endDate: '2026-05-26',
      allergenIds: ['dairy', 'eggs'],
    }),
    phase({
      id: 'reintro-dairy',
      type: 'reintroduction',
      startDate: '2026-05-27',
      endDate: '2026-05-31',
      allergenIds: ['dairy'],
    }),
  ],
};

describe('buildScheduleContext', () => {
  it('passes schedule and answers through by identity', () => {
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      '2026-05-28',
      catalog,
      'breastfed',
    );
    expect(ctx.schedule).toBe(reintroSchedule);
    expect(ctx.answers).toBe(sampleAnswers);
  });

  it('allergenStatuses equals getAllergenStatuses(schedule, today)', () => {
    const today = '2026-05-28';
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
      'breastfed',
    );
    expect(ctx.allergenStatuses).toEqual(getAllergenStatuses(reintroSchedule, today));
  });

  it('protocolEliminated equals getProtocolEliminatedForDate(schedule, today)', () => {
    const today = '2026-05-28';
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
      'breastfed',
    );
    expect(ctx.protocolEliminated).toEqual(getProtocolEliminatedForDate(reintroSchedule, today));
  });

  it('permanentMother / permanentBaby pass the schedule fields through unmerged', () => {
    const schedule: GeneratedSchedule = {
      ...reintroSchedule,
      permanentMother: ['soy'],
      permanentBaby: ['eggs'],
    };
    const ctx = buildScheduleContext(
      { schedule, answers: sampleAnswers },
      '2026-05-28',
      catalog,
      'breastfed',
    );
    expect(ctx.permanentMother).toEqual(['soy']);
    expect(ctx.permanentBaby).toEqual(['eggs']);
  });

  it('exposes no merged eliminatedToday convenience field', () => {
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      '2026-05-28',
      catalog,
      'breastfed',
    );
    expect(ctx).not.toHaveProperty('eliminatedToday');
  });

  it('reintroInfo equals getReintroductionDayInfo(schedule, today)', () => {
    const today = '2026-05-28';
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
      'breastfed',
    );
    expect(ctx.reintroInfo).toEqual(
      getReintroductionDayInfo(reintroSchedule, today, catalog, 'breastfed'),
    );
  });

  it('progress equals getScheduleProgress(schedule, today)', () => {
    const today = '2026-05-28';
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      today,
      catalog,
      'breastfed',
    );
    expect(ctx.progress).toEqual(getScheduleProgress(reintroSchedule, today));
  });

  it('single-today coherence: tested allergen appears in reintroInfo but not protocolEliminated', () => {
    // 2026-05-28 is day 2 of dairy reintroduction — dairy is being tested, so not forbidden
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      '2026-05-28',
      catalog,
      'breastfed',
    );
    expect(ctx.reintroInfo?.allergenId).toBe('dairy');
    expect(ctx.protocolEliminated).not.toContain('dairy');
  });

  it('result has no status key', () => {
    const ctx = buildScheduleContext(
      { schedule: reintroSchedule, answers: sampleAnswers },
      '2026-05-28',
      catalog,
      'breastfed',
    );
    expect(ctx).not.toHaveProperty('status');
  });
});

// ── detectConflicts — live trigger resolution ─────────────────

function item(id: string, foodId: string): MealItem {
  return {
    id,
    name: id,
    foodId: foodId as MealItem['foodId'],
    amount: 'portion',
  };
}

describe('detectConflicts', () => {
  it('returns empty array when no items conflict', () => {
    // ryzove-mleko has no allergenIds — neutral food never conflicts
    const result = detectConflicts([item('a', 'ryzove-mleko')], ['dairy', 'soy'], catalog);
    expect(result).toHaveLength(0);
  });

  it('flags an item whose single trigger is eliminated', () => {
    // kravske-mleko → ['dairy']
    const result = detectConflicts([item('a', 'kravske-mleko')], ['dairy'], catalog);
    expect(result).toHaveLength(1);
    expect(result[0]!.foodId).toBe('kravske-mleko');
  });

  it('sójové mléko conflicts under soy elimination (family divergence)', () => {
    // sojove-mleko is in family 'dairy' but its trigger is 'soy', not 'dairy'
    const result = detectConflicts([item('a', 'sojove-mleko')], ['soy'], catalog);
    expect(result).toHaveLength(1);
  });

  it('sójové mléko does NOT conflict under dairy-only elimination', () => {
    // family is dairy but allergenId is soy — conflict resolves via allergenIds, not family
    const result = detectConflicts([item('a', 'sojove-mleko')], ['dairy'], catalog);
    expect(result).toHaveLength(0);
  });

  it('hummus conflicts when chickpea (legumes) is eliminated', () => {
    const result = detectConflicts([item('a', 'hummus')], ['legumes'], catalog);
    expect(result).toHaveLength(1);
  });

  it('hummus conflicts when sesame is eliminated', () => {
    const result = detectConflicts([item('a', 'hummus')], ['sesame'], catalog);
    expect(result).toHaveLength(1);
  });

  it('hummus conflicts when either trigger is eliminated', () => {
    const result = detectConflicts([item('a', 'hummus')], ['legumes', 'sesame'], catalog);
    expect(result).toHaveLength(1);
    expect(result[0]!.foodId).toBe('hummus');
  });

  it('neutral food never conflicts even when elimination list is non-empty', () => {
    // ryze has allergenIds: [] — always safe
    const result = detectConflicts([item('a', 'ryze')], ['dairy', 'eggs', 'wheat'], catalog);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty items list', () => {
    expect(detectConflicts([], ['dairy'], catalog)).toHaveLength(0);
  });

  it('returns empty array when eliminated list is empty', () => {
    const result = detectConflicts([item('a', 'hummus')], [], catalog);
    expect(result).toHaveLength(0);
  });

  it('unknown foodId (other: custom) resolves to no triggers — never conflicts', () => {
    const result = detectConflicts([item('a', 'other:custom-cake')], ['dairy', 'eggs'], catalog);
    expect(result).toHaveLength(0);
  });

  it('only returns the conflicting items, not all items', () => {
    const items: MealItem[] = [item('safe', 'ryze'), item('conflict', 'kravske-mleko')];
    const result = detectConflicts(items, ['dairy'], catalog);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('conflict');
  });
});

describe('actor-aware conflict detection (pre-combined per-actor sets)', () => {
  // A mother meal is checked against protocol ∪ permanentMother; a baby meal
  // against protocol ∪ permanentBaby. When the two permanent sets diverge, the
  // SAME foods must produce DIFFERENT conflict sets — the retirement of the
  // merged `eliminatedToday` must not silently re-merge them.
  const schedule: GeneratedSchedule = {
    permanentMother: ['soy'],
    permanentBaby: ['dairy'],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-07-01',
    phases: [
      phase({
        id: 'reset',
        type: 'reset',
        startDate: '2026-05-01',
        endDate: '2026-05-05',
      }),
    ],
  };

  // During reset the protocol set is empty, so the only eliminations in play
  // come from each actor's permanent set — isolating the per-actor split.
  // Built through the canonical `eliminatedFor` helper so the test also guards
  // that the helper picks the right permanent set per actor.
  const ctx = {
    protocolEliminated: getProtocolEliminatedForDate(schedule, '2026-05-03'),
    permanentMother: schedule.permanentMother,
    permanentBaby: schedule.permanentBaby,
  } as ReadyContext;
  const motherSet = eliminatedFor(ctx, 'mother');
  const babySet = eliminatedFor(ctx, 'baby');

  // sojove-mleko → soy; kravske-mleko → dairy
  const items: MealItem[] = [item('soy', 'sojove-mleko'), item('milk', 'kravske-mleko')];

  it('flags the soy food for the mother (permanentMother = soy)', () => {
    const conflicts = detectConflicts(items, motherSet, catalog).map((i) => i.foodId);
    expect(conflicts).toEqual(['sojove-mleko']);
  });

  it('flags the dairy food for the baby (permanentBaby = dairy)', () => {
    const conflicts = detectConflicts(items, babySet, catalog).map((i) => i.foodId);
    expect(conflicts).toEqual(['kravske-mleko']);
  });

  it('mother and baby conflict sets differ for the same foods (no silent re-merge)', () => {
    const motherConflicts = detectConflicts(items, motherSet, catalog).map((i) => i.foodId);
    const babyConflicts = detectConflicts(items, babySet, catalog).map((i) => i.foodId);
    expect(motherConflicts).not.toEqual(babyConflicts);
  });
});

describe('eliminatedFor', () => {
  const ctx = {
    protocolEliminated: ['eggs'],
    permanentMother: ['soy'],
    permanentBaby: ['dairy'],
  } as ReadyContext;

  it('combines protocol with the mother permanent set for a mother meal', () => {
    expect(eliminatedFor(ctx, 'mother')).toEqual(['eggs', 'soy']);
  });

  it('combines protocol with the baby permanent set for a baby meal', () => {
    expect(eliminatedFor(ctx, 'baby')).toEqual(['eggs', 'dairy']);
  });

  it('never merges both actors — each actor sees only its own permanent set', () => {
    expect(eliminatedFor(ctx, 'mother')).not.toContain('dairy');
    expect(eliminatedFor(ctx, 'baby')).not.toContain('soy');
  });
});

describe('conflictingAllergens', () => {
  it('returns the distinct eliminated allergens actually triggered by the items', () => {
    // sojove-mleko → soy; kravske-mleko → dairy
    const items: MealItem[] = [item('soy', 'sojove-mleko'), item('milk', 'kravske-mleko')];
    const result = conflictingAllergens(items, ['soy', 'dairy'], catalog);
    expect([...result].sort()).toEqual(['dairy', 'soy']);
  });

  it('omits triggers that are not eliminated', () => {
    const items: MealItem[] = [item('soy', 'sojove-mleko'), item('milk', 'kravske-mleko')];
    // only soy is eliminated — dairy must not appear
    expect(conflictingAllergens(items, ['soy'], catalog)).toEqual(['soy']);
  });

  it('deduplicates when several items trigger the same allergen', () => {
    const items: MealItem[] = [item('a', 'kravske-mleko'), item('b', 'kravske-mleko')];
    expect(conflictingAllergens(items, ['dairy'], catalog)).toEqual(['dairy']);
  });

  it('returns empty when nothing is eliminated', () => {
    expect(conflictingAllergens([item('a', 'kravske-mleko')], [], catalog)).toHaveLength(0);
  });

  it('agrees with detectConflicts — allergens come only from flagged items', () => {
    const items: MealItem[] = [item('soy', 'sojove-mleko'), item('rice', 'ryzove-mleko')];
    const eliminated: AllergenId[] = ['soy', 'dairy'];
    const flaggedItems = detectConflicts(items, eliminated, catalog);
    const allergens = conflictingAllergens(items, eliminated, catalog);
    // ryzove-mleko is neutral, so only soy is flagged on both paths
    expect(flaggedItems.map((i) => i.foodId)).toEqual(['sojove-mleko']);
    expect(allergens).toEqual(['soy']);
  });
});

describe('mealConflicts', () => {
  it('returns both the offending item ids and the distinct offending allergens in one pass', () => {
    const items: MealItem[] = [
      item('soy', 'sojove-mleko'),
      item('milk', 'kravske-mleko'),
      item('rice', 'ryzove-mleko'),
    ];
    const { itemIds, allergens } = mealConflicts(items, ['soy', 'dairy'], catalog);
    expect([...itemIds].sort()).toEqual(['milk', 'soy']);
    expect([...allergens].sort()).toEqual(['dairy', 'soy']);
  });

  it('agrees with detectConflicts + conflictingAllergens — the two projections stay consistent', () => {
    const items: MealItem[] = [item('soy', 'sojove-mleko'), item('rice', 'ryzove-mleko')];
    const eliminated: AllergenId[] = ['soy', 'dairy'];
    const combined = mealConflicts(items, eliminated, catalog);
    expect([...combined.itemIds].sort()).toEqual(
      detectConflicts(items, eliminated, catalog)
        .map((i) => i.id)
        .sort(),
    );
    expect([...combined.allergens].sort()).toEqual(
      [...conflictingAllergens(items, eliminated, catalog)].sort(),
    );
  });

  it('deduplicates an allergen shared across items but keeps every offending item id', () => {
    const items: MealItem[] = [item('a', 'kravske-mleko'), item('b', 'kravske-mleko')];
    const { itemIds, allergens } = mealConflicts(items, ['dairy'], catalog);
    expect([...itemIds].sort()).toEqual(['a', 'b']);
    expect(allergens).toEqual(['dairy']);
  });

  it('returns empty projections when nothing is eliminated', () => {
    const { itemIds, allergens } = mealConflicts([item('a', 'kravske-mleko')], [], catalog);
    expect(itemIds.size).toBe(0);
    expect(allergens).toHaveLength(0);
  });
});

describe('isPhaseEndForEvaluation', () => {
  // baseSchedule: reset 05-01→05-05, elimination 05-06→05-26, reintro-dairy 05-27→05-30
  it('is true on the last day of a reset phase', () => {
    expect(isPhaseEndForEvaluation(baseSchedule, '2026-05-05')).toBe(true);
  });

  it('is true on the last day of an elimination phase', () => {
    expect(isPhaseEndForEvaluation(baseSchedule, '2026-05-26')).toBe(true);
  });

  it('is true on the last day of a reintroduction phase', () => {
    expect(isPhaseEndForEvaluation(baseSchedule, '2026-05-30')).toBe(true);
  });

  it('is false mid-phase (not the last day)', () => {
    expect(isPhaseEndForEvaluation(baseSchedule, '2026-05-10')).toBe(false);
  });

  it('is false on the last day of a rest phase (rest is not evaluated)', () => {
    // scheduleWithRestPhase: rest-1 05-31→06-02
    expect(isPhaseEndForEvaluation(scheduleWithRestPhase, '2026-06-02')).toBe(false);
  });
});

// ── Copy-meal conflict re-derivation (spec #599, issue #606, US-21/US-22) ──
//
// A copied meal carries no conflict state of its own — conflicts are always
// re-derived from the *destination day's* eliminated set. These tests prove
// that indistinguishability through the real `copyMealInto` → `detectConflicts`
// path: the destination's flags depend only on its date, never on the source's.
// baseSchedule: dairy is eliminated 2026-05-06..2026-05-26 and allowed during
// reintro-dairy 2026-05-27..2026-05-30.
describe('copy-meal conflict re-derivation (US-21/US-22)', () => {
  const DAIRY_FORBIDDEN_DAY = '2026-05-10'; // elimination phase
  const DAIRY_ALLOWED_DAY = '2026-05-28'; // reintro-dairy phase

  function dairyMeal(date: string): Meal {
    return {
      id: `${date}:lunch:mother`,
      date,
      mealType: 'lunch',
      actor: 'mother',
      items: [item('src-milk', 'kravske-mleko')],
      createdAt: `${date}T12:00:00.000Z`,
    };
  }

  it('does NOT flag a food forbidden on the source day but allowed on the destination day (US-22)', () => {
    // Source day forbids dairy; copy the dairy meal onto a day where dairy is
    // allowed. The copied items, checked against the destination day's set,
    // must not be flagged.
    const source = dairyMeal(DAIRY_FORBIDDEN_DAY);
    const destSlot = {
      date: DAIRY_ALLOWED_DAY,
      mealType: 'lunch' as const,
      actor: 'mother' as const,
    };
    const { meal } = copyMealInto(source, null, destSlot);
    const destEliminated = getProtocolEliminatedForDate(baseSchedule, DAIRY_ALLOWED_DAY);

    expect(destEliminated).not.toContain('dairy');
    expect(detectConflicts(meal!.items, destEliminated, catalog)).toHaveLength(0);
  });

  it('DOES flag a food fine on the source day but forbidden on the destination day (US-21)', () => {
    // Source day allows dairy (reintro); copy onto a day where dairy is
    // eliminated. The copied items must be flagged against the destination set.
    const source = dairyMeal(DAIRY_ALLOWED_DAY);
    const destSlot = {
      date: DAIRY_FORBIDDEN_DAY,
      mealType: 'lunch' as const,
      actor: 'mother' as const,
    };
    const { meal } = copyMealInto(source, null, destSlot);
    const destEliminated = getProtocolEliminatedForDate(baseSchedule, DAIRY_FORBIDDEN_DAY);

    expect(destEliminated).toContain('dairy');
    const flagged = detectConflicts(meal!.items, destEliminated, catalog);
    expect(flagged).toHaveLength(1);
    expect(flagged[0]!.foodId).toBe('kravske-mleko');
  });
});
