import { describe, it, expect } from 'vitest';
import { getAllergenStatuses, getPhaseVerdictStatuses } from './allergen-status';
import type { GeneratedSchedule, SchedulePhase } from '$lib/domain/models';

// ── Fixtures ──────────────────────────────────────────────────

function phase(overrides: Partial<SchedulePhase> & Pick<SchedulePhase, 'id' | 'type' | 'startDate' | 'endDate'>): SchedulePhase {
  return { allergenIds: [], ...overrides };
}

// Base schedule: 2 protocol allergens, 1 mother allergy, 1 baby allergy
const base: GeneratedSchedule = {
  permanentMother: ['fish'],
  permanentBaby: ['nuts'],
  startDate: '2026-05-01',
  estimatedEndDate: '2026-09-01',
  phases: [
    phase({ id: 'reset',       type: 'reset',        startDate: '2026-05-01', endDate: '2026-05-07' }),
    phase({ id: 'elimination', type: 'elimination',   startDate: '2026-05-08', endDate: '2026-06-04', allergenIds: ['dairy', 'eggs'] }),
    phase({ id: 'reintro-dairy', type: 'reintroduction', startDate: '2026-06-05', endDate: '2026-06-08', allergenIds: ['dairy'] }),
    phase({ id: 'reintro-eggs',  type: 'reintroduction', startDate: '2026-06-09', endDate: '2026-06-12', allergenIds: ['eggs'] }),
  ],
};

// ── Permanent statuses ───────────────────────────────────────

describe('getAllergenStatuses — permanent allergens', () => {
  it('mother allergen is permanent-mother on every date', () => {
    for (const date of ['2026-05-01', '2026-06-10', '2026-09-01']) {
      const s = getAllergenStatuses(base, date).find(x => x.allergenId === 'fish');
      expect(s?.status).toBe('permanent-mother');
    }
  });

  it('baby allergen is permanent-baby when no retest is scheduled', () => {
    for (const date of ['2026-05-01', '2026-06-10', '2026-09-01']) {
      const s = getAllergenStatuses(base, date).find(x => x.allergenId === 'nuts');
      expect(s?.status).toBe('permanent-baby');
    }
  });
});

// ── Protocol allergen phase-based statuses ────────────────────

describe('getAllergenStatuses — protocol lifecycle', () => {
  it('protocol allergen is eliminated during reset phase', () => {
    const s = getAllergenStatuses(base, '2026-05-03').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('eliminated');
  });

  it('protocol allergen is eliminated during elimination phase', () => {
    const s = getAllergenStatuses(base, '2026-05-20').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('eliminated');
  });

  it('allergen being reintroduced is testing', () => {
    const s = getAllergenStatuses(base, '2026-06-06').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('testing');
  });

  it('not-yet-started allergen is not-yet-tested during an earlier reintro', () => {
    // eggs reintro hasn't started on 2026-06-06 (dairy is being tested)
    const s = getAllergenStatuses(base, '2026-06-06').find(x => x.allergenId === 'eggs');
    expect(s?.status).toBe('not-yet-tested');
  });

  it('allergen that passed (reintro not followed by rest) is passed', () => {
    // dairy passed; now during eggs reintro
    const s = getAllergenStatuses(base, '2026-06-10').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('passed');
  });

  it('allergen that reacted (reintro followed by rest) is reacted', () => {
    const scheduleWithReaction: GeneratedSchedule = {
      ...base,
      phases: [
        ...base.phases.slice(0, 3), // reset + elimination + reintro-dairy
        phase({ id: 'rest-1', type: 'rest', startDate: '2026-06-09', endDate: '2026-06-11' }),
        phase({ id: 'reintro-eggs', type: 'reintroduction', startDate: '2026-06-12', endDate: '2026-06-15', allergenIds: ['eggs'] }),
      ],
    };
    const s = getAllergenStatuses(scheduleWithReaction, '2026-06-13').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('reacted');
  });

  it('allergen in tolerance-building phase is tolerance-building', () => {
    const scheduleWithTb: GeneratedSchedule = {
      ...base,
      phases: [
        ...base.phases.slice(0, 3), // reset + elimination + reintro-dairy
        phase({ id: 'rest-1', type: 'rest', startDate: '2026-06-09', endDate: '2026-06-10' }),
        phase({ id: 'tb-dairy', type: 'tolerance-building', startDate: '2026-06-11', endDate: '', allergenIds: ['dairy'] }),
        phase({ id: 'reintro-eggs', type: 'reintroduction', startDate: '2026-06-11', endDate: '2026-06-14', allergenIds: ['eggs'] }),
      ],
    };
    const s = getAllergenStatuses(scheduleWithTb, '2026-06-12').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('tolerance-building');
  });
});

// ── Latest-reintroduction-wins ────────────────────────────────

describe('getAllergenStatuses — latest reintroduction wins', () => {
  // dairy reacted on first test, then retested and passed
  const scheduleWithRetest: GeneratedSchedule = {
    ...base,
    phases: [
      phase({ id: 'reset',        type: 'reset',           startDate: '2026-05-01', endDate: '2026-05-07' }),
      phase({ id: 'elimination',  type: 'elimination',     startDate: '2026-05-08', endDate: '2026-06-04', allergenIds: ['dairy', 'eggs'] }),
      phase({ id: 'reintro-dairy-1', type: 'reintroduction', startDate: '2026-06-05', endDate: '2026-06-08', allergenIds: ['dairy'] }),
      phase({ id: 'rest-1',       type: 'rest',            startDate: '2026-06-09', endDate: '2026-06-11' }),
      phase({ id: 'reintro-eggs', type: 'reintroduction',  startDate: '2026-06-12', endDate: '2026-06-15', allergenIds: ['eggs'] }),
      // dairy retested after eggs
      phase({ id: 'reintro-dairy-2', type: 'reintroduction', startDate: '2026-06-16', endDate: '2026-06-19', allergenIds: ['dairy'] }),
    ],
  };

  it('is reacted after first failed reintro', () => {
    const s = getAllergenStatuses(scheduleWithRetest, '2026-06-13').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('reacted');
  });

  it('is testing during the second reintro', () => {
    const s = getAllergenStatuses(scheduleWithRetest, '2026-06-17').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('testing');
  });

  it('is passed after second reintro completes cleanly', () => {
    const s = getAllergenStatuses(scheduleWithRetest, '2026-06-20').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('passed');
  });
});

// ── Tolerance-building overridden by later reintroduction ─────

describe('getAllergenStatuses — tolerance-building overridden by reintro', () => {
  const scheduleWithTbThenReintro: GeneratedSchedule = {
    ...base,
    phases: [
      phase({ id: 'reset',       type: 'reset',            startDate: '2026-05-01', endDate: '2026-05-07' }),
      phase({ id: 'elimination', type: 'elimination',      startDate: '2026-05-08', endDate: '2026-06-04', allergenIds: ['dairy', 'eggs'] }),
      phase({ id: 'reintro-dairy', type: 'reintroduction', startDate: '2026-06-05', endDate: '2026-06-08', allergenIds: ['dairy'] }),
      phase({ id: 'rest-1',      type: 'rest',             startDate: '2026-06-09', endDate: '2026-06-10' }),
      phase({ id: 'tb-dairy',    type: 'tolerance-building', startDate: '2026-06-11', endDate: '', allergenIds: ['dairy'] }),
      // later formal reintro supersedes the tolerance-building phase
      phase({ id: 'reintro-dairy-2', type: 'reintroduction', startDate: '2026-07-01', endDate: '2026-07-04', allergenIds: ['dairy'] }),
    ],
  };

  it('is tolerance-building before the later reintro starts', () => {
    const s = getAllergenStatuses(scheduleWithTbThenReintro, '2026-06-20').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('tolerance-building');
  });

  it('is testing once the later reintro starts (reintro supersedes tb)', () => {
    const s = getAllergenStatuses(scheduleWithTbThenReintro, '2026-07-02').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('testing');
  });

  it('is passed after the later reintro ends cleanly', () => {
    const s = getAllergenStatuses(scheduleWithTbThenReintro, '2026-07-05').find(x => x.allergenId === 'dairy');
    expect(s?.status).toBe('passed');
  });
});

// ── Baby allergy retest ───────────────────────────────────────

describe('getAllergenStatuses — baby allergy retest', () => {
  // nuts is a baby allergy; a retest phase is appended after the protocol
  const scheduleWithBabyRetest: GeneratedSchedule = {
    permanentMother: ['fish'],
    permanentBaby: ['nuts'],
    startDate: '2026-05-01',
    estimatedEndDate: '2026-09-01',
    phases: [
      phase({ id: 'reset',       type: 'reset',            startDate: '2026-05-01', endDate: '2026-05-07' }),
      phase({ id: 'elimination', type: 'elimination',      startDate: '2026-05-08', endDate: '2026-06-04', allergenIds: ['dairy', 'eggs'] }),
      phase({ id: 'reintro-dairy', type: 'reintroduction', startDate: '2026-06-05', endDate: '2026-06-08', allergenIds: ['dairy'] }),
      phase({ id: 'reintro-eggs',  type: 'reintroduction', startDate: '2026-06-09', endDate: '2026-06-12', allergenIds: ['eggs'] }),
      // nuts retest appended at end of protocol
      phase({ id: 'retest-nuts', type: 'reintroduction', startDate: '2026-07-01', endDate: '2026-07-04', allergenIds: ['nuts'] }),
    ],
  };

  it('baby allergen is permanent-baby before retest starts', () => {
    const s = getAllergenStatuses(scheduleWithBabyRetest, '2026-06-20').find(x => x.allergenId === 'nuts');
    expect(s?.status).toBe('permanent-baby');
  });

  it('baby allergen is testing during retest', () => {
    const s = getAllergenStatuses(scheduleWithBabyRetest, '2026-07-02').find(x => x.allergenId === 'nuts');
    expect(s?.status).toBe('testing');
  });

  it('baby allergen is passed after clean retest', () => {
    const s = getAllergenStatuses(scheduleWithBabyRetest, '2026-07-05').find(x => x.allergenId === 'nuts');
    expect(s?.status).toBe('passed');
  });

  it('baby allergen reverts to permanent-baby after failed retest', () => {
    const withFailedRetest: GeneratedSchedule = {
      ...scheduleWithBabyRetest,
      phases: [
        ...scheduleWithBabyRetest.phases,
        phase({ id: 'rest-nuts', type: 'rest', startDate: '2026-07-05', endDate: '2026-07-07' }),
      ],
    };
    const s = getAllergenStatuses(withFailedRetest, '2026-07-06').find(x => x.allergenId === 'nuts');
    expect(s?.status).toBe('permanent-baby');
  });
});

// ── Closed universe ───────────────────────────────────────────

describe('getAllergenStatuses — closed universe', () => {
  it('returns one entry per allergen in permanentMother ∪ permanentBaby ∪ protocol', () => {
    const statuses = getAllergenStatuses(base, '2026-05-01');
    // fish (mother) + nuts (baby) + dairy + eggs (protocol) = 4
    expect(statuses).toHaveLength(4);
  });

  it('result ids are exactly the closed-universe members', () => {
    const statuses = getAllergenStatuses(base, '2026-05-01');
    const ids = statuses.map(s => s.allergenId).sort();
    expect(ids).toEqual(['dairy', 'eggs', 'fish', 'nuts'].sort());
  });
});

// ── getPhaseVerdictStatuses ───────────────────────────────────

describe('getPhaseVerdictStatuses — verdict-date boundary', () => {
  // dairy reintro ends 2026-06-08; eggs reintro follows immediately
  // On endDate (2026-06-08): dairy is still 'testing'
  // On endDate + 1 (2026-06-09): dairy is 'passed' (no rest follows)
  const reintroPhase = base.phases.find(p => p.id === 'reintro-dairy')!;

  it('allergen reads testing on phase endDate', () => {
    const onEndDate = getAllergenStatuses(base, '2026-06-08').find(x => x.allergenId === 'dairy');
    expect(onEndDate?.status).toBe('testing');
  });

  it('allergen reads passed on endDate + 1', () => {
    const rows = getPhaseVerdictStatuses(base, reintroPhase);
    const dairy = rows.find(r => r.allergenId === 'dairy');
    expect(dairy?.status).toBe('passed');
  });

  it('reacted allergen reads reacted on endDate + 1', () => {
    const withRest: GeneratedSchedule = {
      ...base,
      phases: [
        ...base.phases.slice(0, 3), // reset + elimination + reintro-dairy
        phase({ id: 'rest-1', type: 'rest', startDate: '2026-06-09', endDate: '2026-06-11' }),
      ],
    };
    const rows = getPhaseVerdictStatuses(withRest, withRest.phases[2]);
    const dairy = rows.find(r => r.allergenId === 'dairy');
    expect(dairy?.status).toBe('reacted');
  });
});

describe('getPhaseVerdictStatuses — permanent exclusion', () => {
  const reintroPhase = base.phases.find(p => p.id === 'reintro-dairy')!;

  it('excludes permanent-mother allergens', () => {
    const rows = getPhaseVerdictStatuses(base, reintroPhase);
    expect(rows.find(r => r.allergenId === 'fish')).toBeUndefined();
  });

  it('excludes permanent-baby allergens', () => {
    const rows = getPhaseVerdictStatuses(base, reintroPhase);
    expect(rows.find(r => r.allergenId === 'nuts')).toBeUndefined();
  });
});
