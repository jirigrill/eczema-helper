import { describe, it, expect } from 'vitest';
import { getPhaseForDate, getEliminatedSlugsForDate, getScheduleProgress } from './schedule-queries';
import type { GeneratedSchedule, SchedulePhase } from '$lib/domain/models';

function phase(overrides: Partial<SchedulePhase> & Pick<SchedulePhase, 'id' | 'type' | 'startDate' | 'endDate'>): SchedulePhase {
  return { label: '', description: '', categoryIds: [], ...overrides };
}

const baseSchedule: GeneratedSchedule = {
  permanentEliminations: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({ id: 'reset',        type: 'reset',           startDate: '2026-05-01', endDate: '2026-05-05' }),
    phase({ id: 'elimination',  type: 'elimination',     startDate: '2026-05-06', endDate: '2026-05-26', categoryIds: ['dairy', 'eggs'] }),
    phase({ id: 'reintro-dairy',type: 'reintroduction',  startDate: '2026-05-27', endDate: '2026-05-30', categoryIds: ['dairy'] }),
  ],
};

// Two successive reintros without a rest between them → first allergen is "passed"
const scheduleWithPassedAllergen: GeneratedSchedule = {
  permanentEliminations: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({ id: 'reset',         type: 'reset',          startDate: '2026-05-01', endDate: '2026-05-05' }),
    phase({ id: 'elimination',   type: 'elimination',    startDate: '2026-05-06', endDate: '2026-05-26', categoryIds: ['dairy', 'eggs', 'wheat'] }),
    phase({ id: 'reintro-dairy', type: 'reintroduction', startDate: '2026-05-27', endDate: '2026-05-30', categoryIds: ['dairy'] }),
    phase({ id: 'reintro-eggs',  type: 'reintroduction', startDate: '2026-05-31', endDate: '2026-06-03', categoryIds: ['eggs'] }),
  ],
};

// Reintro followed by a rest phase → allergen is NOT considered passed
const scheduleWithRestPhase: GeneratedSchedule = {
  permanentEliminations: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({ id: 'reset',         type: 'reset',          startDate: '2026-05-01', endDate: '2026-05-05' }),
    phase({ id: 'elimination',   type: 'elimination',    startDate: '2026-05-06', endDate: '2026-05-26', categoryIds: ['dairy', 'eggs'] }),
    phase({ id: 'reintro-dairy', type: 'reintroduction', startDate: '2026-05-27', endDate: '2026-05-30', categoryIds: ['dairy'] }),
    phase({ id: 'rest-1',        type: 'rest',           startDate: '2026-05-31', endDate: '2026-06-02' }),
  ],
};

// Training phase starts after rest; a subsequent reintro overlaps with it
const scheduleWithTraining: GeneratedSchedule = {
  permanentEliminations: [],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-07-01',
  phases: [
    phase({ id: 'reset',          type: 'reset',          startDate: '2026-05-01', endDate: '2026-05-05' }),
    phase({ id: 'elimination',    type: 'elimination',    startDate: '2026-05-06', endDate: '2026-05-26', categoryIds: ['dairy', 'eggs'] }),
    phase({ id: 'reintro-dairy',  type: 'reintroduction', startDate: '2026-05-27', endDate: '2026-05-30', categoryIds: ['dairy'] }),
    phase({ id: 'rest-1',         type: 'rest',           startDate: '2026-05-31', endDate: '2026-06-01' }),
    // training starts Jun 2, open-ended (endDate '')
    phase({ id: 'training-dairy', type: 'training',       startDate: '2026-06-02', endDate: '',           categoryIds: ['dairy'] }),
    // reintro-eggs also starts Jun 2 — overlaps with training
    phase({ id: 'reintro-eggs',   type: 'reintroduction', startDate: '2026-06-02', endDate: '2026-06-05', categoryIds: ['eggs'] }),
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

describe('getEliminatedSlugsForDate', () => {
  it('returns only permanent eliminations during reset', () => {
    const schedule = { ...baseSchedule, permanentEliminations: ['soy'] };
    const slugs = getEliminatedSlugsForDate(schedule, '2026-05-03');
    expect(slugs).toEqual(['soy']);
  });

  it('returns protocol allergens during elimination phase', () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, '2026-05-10');
    expect(slugs).toContain('dairy');
    expect(slugs).toContain('eggs');
  });

  it('excludes permanent eliminations from protocol allergens (already covered)', () => {
    const schedule = { ...baseSchedule, permanentEliminations: ['dairy'] };
    const slugs = getEliminatedSlugsForDate(schedule, '2026-05-10');
    expect(slugs).toContain('dairy');
    expect(slugs).toContain('eggs');
  });

  it('allows the reintroduced allergen during its reintro phase', () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, '2026-05-28');
    expect(slugs).not.toContain('dairy');
  });

  it('still eliminates other protocol allergens during reintro', () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, '2026-05-28');
    expect(slugs).toContain('eggs');
  });

  it('returns empty array before program starts', () => {
    const slugs = getEliminatedSlugsForDate(baseSchedule, '2026-04-30');
    expect(slugs).toEqual([]);
  });
});

describe('getEliminatedSlugsForDate — already-passed allergens', () => {
  // dairy reintro is followed directly by eggs reintro (no rest) → dairy is "passed"
  // during reintro-eggs: dairy allowed, eggs allowed (current), wheat eliminated

  it('allows an allergen that was tolerated in a previous reintro', () => {
    const slugs = getEliminatedSlugsForDate(scheduleWithPassedAllergen, '2026-06-01');
    expect(slugs).not.toContain('dairy');
  });

  it('allows the allergen currently being reintroduced', () => {
    const slugs = getEliminatedSlugsForDate(scheduleWithPassedAllergen, '2026-06-01');
    expect(slugs).not.toContain('eggs');
  });

  it('still eliminates allergens not yet reintroduced', () => {
    const slugs = getEliminatedSlugsForDate(scheduleWithPassedAllergen, '2026-06-01');
    expect(slugs).toContain('wheat');
  });
});

describe('getEliminatedSlugsForDate — rest phase', () => {
  // dairy reintro followed by rest → dairy NOT passed (reaction triggered the rest)
  // during rest: all protocol allergens remain eliminated

  it('eliminates the preceding reintro allergen during rest (not passed because rest follows)', () => {
    const slugs = getEliminatedSlugsForDate(scheduleWithRestPhase, '2026-06-01');
    expect(slugs).toContain('dairy');
  });

  it('eliminates all other protocol allergens during rest', () => {
    const slugs = getEliminatedSlugsForDate(scheduleWithRestPhase, '2026-06-01');
    expect(slugs).toContain('eggs');
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
    expect(result?.id).toBe('training-dairy');
  });

  it('treats open-ended training phase as active on any date after its start', () => {
    const result = getPhaseForDate(scheduleWithTraining, '2026-12-31');
    expect(result?.id).toBe('training-dairy');
  });
});

describe('getScheduleProgress', () => {
  // 10-day program: 2026-05-01 → 2026-05-10
  const tenDaySchedule: GeneratedSchedule = {
    permanentEliminations: [],
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
      permanentEliminations: [],
      startDate: '2026-05-01',
      estimatedEndDate: '2026-05-03',
      phases: [],
    };
    const result = getScheduleProgress(threeDay, '2026-05-01');
    expect(result.percentComplete).toBe(33);
  });
});
