import { describe, it, expect } from 'vitest';
import {
  currentRung,
  nextLegalStep,
  cadenceGate,
  skinCalmGate,
  skinStabilityGate,
  checkpointVerdictGate,
  resolveLadder,
  rungAtDayInPhase,
  decideLadderMove,
} from './ladder';
import type { Ladder, LadderStep, LadderDecisionInput } from './ladder';
import {
  MAX_RUNG_REACTIONS,
  REST_PHASE_DAYS_CLEAR,
  REST_PHASE_DAYS_MILD,
} from '$lib/domain/policy';
import { addDays } from '$lib/utils/date';
import type {
  Meal,
  SkinObservation,
  ReintroductionEvaluation,
  LadderAllergenId,
  PortionKind,
} from '$lib/domain/models';
import { ALLERGENS } from '$lib/data/allergen-catalog/allergen-catalog';
import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';

// ── Fixtures ──────────────────────────────────────────────────

function makeMeal(
  overrides: Partial<Meal> & Pick<Meal, 'id' | 'date' | 'mealType' | 'items'>,
): Meal {
  return {
    actor: 'mother',
    createdAt: `${overrides.date}T12:00:00Z`,
    ...overrides,
  };
}

const eggsSteps: readonly LadderStep[] = [
  {
    id: 'rung-1',
    anchor: 'portion',
    isEvaluationCheckpoint: false,
    dose: 'test rung 1',
  },
  {
    id: 'rung-2',
    anchor: 'portion',
    isEvaluationCheckpoint: false,
    dose: 'test rung 2',
  },
  {
    id: 'rung-3',
    anchor: 'package',
    isEvaluationCheckpoint: true,
    dose: 'test rung 3',
  },
];

const eggsLadder: Ladder = {
  allergenId: 'eggs',
  stages: { breastfed: eggsSteps },
};

// ── currentRung ───────────────────────────────────────────────

describe('currentRung', () => {
  it('returns null when the meal history has no matching allergen items', () => {
    const meals: Meal[] = [];
    expect(currentRung('eggs', meals, eggsLadder, 'breastfed')).toBeNull();
  });

  it('returns the first rung when only the first-rung anchor has been logged', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    expect(currentRung('eggs', meals, eggsLadder, 'breastfed')?.id).toBe('rung-1');
  });

  it('advances to the second rung once a second matching anchor is logged on a later meal', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-02:breakfast',
        date: '2026-06-02',
        mealType: 'breakfast',
        items: [{ id: 'i2', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    expect(currentRung('eggs', meals, eggsLadder, 'breastfed')?.id).toBe('rung-2');
  });

  it('reaches the top rung when the final anchor is logged after the earlier anchors', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-02:breakfast',
        date: '2026-06-02',
        mealType: 'breakfast',
        items: [{ id: 'i2', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-03:lunch',
        date: '2026-06-03',
        mealType: 'lunch',
        items: [{ id: 'i3', name: 'Vejce', foodId: 'vejce', amount: 'package' }],
      }),
    ];
    const rung = currentRung('eggs', meals, eggsLadder, 'breastfed');
    expect(rung?.id).toBe('rung-3');
    expect(rung?.isEvaluationCheckpoint).toBe(true);
  });

  it('ignores meals whose items do not match the allergen', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      }),
    ];
    expect(currentRung('eggs', meals, eggsLadder, 'breastfed')).toBeNull();
  });

  it('surfaces isEvaluationCheckpoint=false on a non-checkpoint resolved rung', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    const rung = currentRung('eggs', meals, eggsLadder, 'breastfed');
    expect(rung?.id).toBe('rung-1');
    expect(rung?.isEvaluationCheckpoint).toBe(false);
  });

  it('preserves the highest rung reached even when a smaller dose is logged afterwards', () => {
    // Reacted-history shape: mother reached the top rung, then dropped to a smaller
    // dose on a later meal. The derivation is monotone in the ordered history —
    // reaching a rung is a permanent record of "you've been here".
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-02:breakfast',
        date: '2026-06-02',
        mealType: 'breakfast',
        items: [{ id: 'i2', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-03:lunch',
        date: '2026-06-03',
        mealType: 'lunch',
        items: [{ id: 'i3', name: 'Vejce', foodId: 'vejce', amount: 'package' }],
      }),
      makeMeal({
        id: '2026-06-05:breakfast',
        date: '2026-06-05',
        mealType: 'breakfast',
        items: [{ id: 'i4', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    expect(currentRung('eggs', meals, eggsLadder, 'breastfed')?.id).toBe('rung-3');
  });

  it('caps the rung at doses logged before a recorded reaction (not reacted-against)', () => {
    // Two tolerated doses (rungs 1 & 2), then a reacting dose on 2026-06-03.
    // The reacting dose must not advance the rung to rung-3.
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-02:breakfast',
        date: '2026-06-02',
        mealType: 'breakfast',
        items: [{ id: 'i2', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-03:lunch',
        date: '2026-06-03',
        mealType: 'lunch',
        items: [{ id: 'i3', name: 'Vejce', foodId: 'vejce', amount: 'package' }],
      }),
    ];
    const evaluations = [evaluation({ date: '2026-06-03', outcome: 'clear-reaction' })];
    expect(currentRung('eggs', meals, eggsLadder, 'breastfed', null, evaluations)?.id).toBe(
      'rung-2',
    );
  });

  it('a tolerated evaluation does not cap the rung', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-02:breakfast',
        date: '2026-06-02',
        mealType: 'breakfast',
        items: [{ id: 'i2', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
      makeMeal({
        id: '2026-06-03:lunch',
        date: '2026-06-03',
        mealType: 'lunch',
        items: [{ id: 'i3', name: 'Vejce', foodId: 'vejce', amount: 'package' }],
      }),
    ];
    const evaluations = [evaluation({ date: '2026-06-03', outcome: 'tolerated' })];
    expect(currentRung('eggs', meals, eggsLadder, 'breastfed', null, evaluations)?.id).toBe(
      'rung-3',
    );
  });
});

// ── nextLegalStep ─────────────────────────────────────────────

describe('nextLegalStep', () => {
  it('returns the first step when the current rung is null', () => {
    expect(nextLegalStep(null, eggsLadder, 'breastfed')?.id).toBe('rung-1');
  });

  it('returns the next single step above the current rung', () => {
    expect(nextLegalStep(eggsSteps[0], eggsLadder, 'breastfed')?.id).toBe('rung-2');
    expect(nextLegalStep(eggsSteps[1], eggsLadder, 'breastfed')?.id).toBe('rung-3');
  });

  it('returns null once the top of the ladder is reached', () => {
    const top = eggsSteps[eggsSteps.length - 1];
    expect(nextLegalStep(top, eggsLadder, 'breastfed')).toBeNull();
  });

  it('cannot express a multi-step advance — the return is a single step or null', () => {
    // The signature itself precludes returning two steps at once. This test
    // documents that guarantee: `nextLegalStep` walks exactly one rung.
    const returned = nextLegalStep(eggsSteps[0], eggsLadder, 'breastfed');
    const idx = eggsSteps.findIndex((s) => s.id === returned?.id);
    expect(idx).toBe(1);
  });

  it('returns null when the allergen is permanently eliminated, regardless of rung', () => {
    // Permanent elimination (permanent-mother / permanent-baby per ADR-0012)
    // refuses advancement outright — the ladder is inert for that allergen.
    expect(
      nextLegalStep(null, eggsLadder, 'breastfed', undefined, { isPermanentlyEliminated: true }),
    ).toBeNull();
    expect(
      nextLegalStep(eggsSteps[0], eggsLadder, 'breastfed', undefined, {
        isPermanentlyEliminated: true,
      }),
    ).toBeNull();
    expect(
      nextLegalStep(eggsSteps[1], eggsLadder, 'breastfed', undefined, {
        isPermanentlyEliminated: true,
      }),
    ).toBeNull();
  });
});

// ── cadenceGate ───────────────────────────────────────────────

describe('cadenceGate', () => {
  it('blocks escalation when the last matching dose is fewer than the cadence threshold days ago', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    // Threshold is 3 days; two days elapsed → blocked.
    const result = cadenceGate('eggs', meals, '2026-06-03', 3);
    expect(result.allowed).toBe(false);
    expect(result.daysSinceLastDose).toBe(2);
  });

  it('unblocks once the cadence threshold has elapsed since the last dose', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    // 3 days elapsed → threshold met.
    const result = cadenceGate('eggs', meals, '2026-06-04', 3);
    expect(result.allowed).toBe(true);
    expect(result.daysSinceLastDose).toBe(3);
  });

  it('imposes no delay when the allergen has never been dosed', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Rýže', foodId: 'ryze', amount: 'portion' }],
      }),
    ];
    const result = cadenceGate('eggs', meals, '2026-06-04', 3);
    expect(result.allowed).toBe(true);
    expect(result.daysSinceLastDose).toBeNull();
  });

  it('blocks a same-day second dose regardless of cadence value', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    // F4 daily cadence (cadenceDays = 1): same-day re-check is still blocked.
    const result = cadenceGate('eggs', meals, '2026-06-01', 1);
    expect(result.allowed).toBe(false);
    expect(result.daysSinceLastDose).toBe(0);
  });
});

// ── skinCalmGate ──────────────────────────────────────────────

function obs(
  date: string,
  level: 0 | 1 | 2 | 3,
  overrides?: Partial<SkinObservation>,
): SkinObservation {
  return {
    id: overrides?.id ?? `obs-${date}`,
    date,
    createdAt: overrides?.createdAt ?? `${date}T12:00:00Z`,
    regions: level === 0 ? [] : [{ id: 'face', level }],
    ...(overrides ?? {}),
  };
}

describe('skinCalmGate', () => {
  it('holds escalation when the latest observation shows any active region (flare)', () => {
    const observations: SkinObservation[] = [
      obs('2026-06-01', 0),
      obs('2026-06-02', 2), // flare
    ];
    const result = skinCalmGate(observations, '2026-06-02');
    expect(result.allowed).toBe(false);
    expect(result.isFlare).toBe(true);
  });

  it('releases escalation once the latest observation returns to klidné', () => {
    const observations: SkinObservation[] = [
      obs('2026-06-01', 2), // earlier flare
      obs('2026-06-03', 0), // calm
    ];
    const result = skinCalmGate(observations, '2026-06-03');
    expect(result.allowed).toBe(true);
    expect(result.isFlare).toBe(false);
    expect(result.latestSeverity).toBe(0);
  });

  it('ignores observations after `today` — future observations do not gate a past date', () => {
    const observations: SkinObservation[] = [obs('2026-06-01', 0), obs('2026-06-05', 3)];
    const result = skinCalmGate(observations, '2026-06-02');
    expect(result.allowed).toBe(true);
    expect(result.isFlare).toBe(false);
  });
});

// ── skinStabilityGate ─────────────────────────────────────────

describe('skinStabilityGate', () => {
  it('is permissive when there are no observations at all (missing data ≠ hold)', () => {
    const result = skinStabilityGate([], '2026-06-05', 3);
    expect(result.allowed).toBe(true);
    expect(result.baselineSeverity).toBeNull();
    expect(result.currentSeverity).toBeNull();
  });

  it('allows advancing when severity stays the same across the window', () => {
    const observations = [obs('2026-06-01', 1), obs('2026-06-03', 1)];
    const result = skinStabilityGate(observations, '2026-06-03', 3);
    expect(result.allowed).toBe(true);
    expect(result.baselineSeverity).toBe(1);
    expect(result.currentSeverity).toBe(1);
  });

  it('allows advancing when severity improves across the window', () => {
    const observations = [obs('2026-06-01', 2), obs('2026-06-03', 0)];
    const result = skinStabilityGate(observations, '2026-06-03', 3);
    expect(result.allowed).toBe(true);
    expect(result.baselineSeverity).toBe(2);
    expect(result.currentSeverity).toBe(0);
  });

  it('blocks when severity increases even by one level', () => {
    const observations = [obs('2026-06-01', 0), obs('2026-06-03', 1)];
    const result = skinStabilityGate(observations, '2026-06-03', 3);
    expect(result.allowed).toBe(false);
    expect(result.baselineSeverity).toBe(0);
    expect(result.currentSeverity).toBe(1);
  });

  it('treats an unchanged log as stable — a single observation is its own baseline', () => {
    const observations = [obs('2026-06-01', 1)];
    const result = skinStabilityGate(observations, '2026-06-03', 3);
    expect(result.allowed).toBe(true);
    expect(result.baselineSeverity).toBe(1);
    expect(result.currentSeverity).toBe(1);
  });

  it('falls back to the pre-window observation when the window is empty (baseline == current)', () => {
    // today=06-10, window=3 → window starts 06-07; only obs (06-01) is pre-window,
    // so it serves as both baseline and current — a stale-but-known reading reads
    // as "unchanged," not as a hold.
    const observations = [obs('2026-06-01', 2)];
    const result = skinStabilityGate(observations, '2026-06-10', 3);
    expect(result.allowed).toBe(true);
    expect(result.baselineSeverity).toBe(2);
    expect(result.currentSeverity).toBe(2);
  });

  it('prefers the first in-window reading as baseline when both in-window and pre-window observations exist', () => {
    // today=06-05, window=3 → starts 06-02. Baseline should be 06-02 (severity 2), not 06-01.
    const observations = [obs('2026-06-01', 0), obs('2026-06-02', 2), obs('2026-06-05', 2)];
    const result = skinStabilityGate(observations, '2026-06-05', 3);
    expect(result.allowed).toBe(true);
    expect(result.baselineSeverity).toBe(2);
    expect(result.currentSeverity).toBe(2);
  });

  it('ignores observations after `today` — future readings do not gate a past date', () => {
    const observations = [obs('2026-06-01', 0), obs('2026-06-08', 3)];
    const result = skinStabilityGate(observations, '2026-06-02', 3);
    expect(result.allowed).toBe(true);
    expect(result.currentSeverity).toBe(0);
  });
});

// ── checkpointVerdictGate ─────────────────────────────────────

function evaluation(
  overrides: Partial<ReintroductionEvaluation> & Pick<ReintroductionEvaluation, 'date' | 'outcome'>,
): ReintroductionEvaluation {
  return {
    phaseId: 'phase-1',
    phaseType: 'allergen-test',
    allergenId: 'eggs',
    ...overrides,
  };
}

describe('checkpointVerdictGate', () => {
  it('is permissive at a non-checkpoint rung — nothing to evaluate there', () => {
    const result = checkpointVerdictGate(eggsSteps[0], 'eggs', []);
    expect(result.allowed).toBe(true);
  });

  it('blocks at a checkpoint rung when no verdict has been recorded yet', () => {
    const result = checkpointVerdictGate(eggsSteps[2], 'eggs', []);
    expect(result.allowed).toBe(false);
    expect(result.requiresRest).toBe(false);
  });

  it('allows past a checkpoint once the latest verdict for the allergen is tolerated', () => {
    const evaluations = [evaluation({ date: '2026-06-03', outcome: 'tolerated' })];
    const result = checkpointVerdictGate(eggsSteps[2], 'eggs', evaluations);
    expect(result.allowed).toBe(true);
    expect(result.requiresRest).toBe(false);
  });

  it('holds and requires rest when the latest verdict is a reaction', () => {
    const evaluations = [evaluation({ date: '2026-06-03', outcome: 'clear-reaction' })];
    const result = checkpointVerdictGate(eggsSteps[2], 'eggs', evaluations);
    expect(result.allowed).toBe(false);
    expect(result.requiresRest).toBe(true);
    expect(result.restDays).toBe(7);
  });

  it('uses only the latest verdict by date, not an earlier stale one', () => {
    const evaluations = [
      evaluation({ date: '2026-06-01', outcome: 'severe-reaction' }),
      evaluation({ date: '2026-06-05', outcome: 'tolerated' }),
    ];
    const result = checkpointVerdictGate(eggsSteps[2], 'eggs', evaluations);
    expect(result.allowed).toBe(true);
  });

  it('ignores evaluations for a different allergen or a skin-status phase', () => {
    const evaluations = [
      evaluation({ date: '2026-06-03', outcome: 'tolerated', allergenId: 'dairy' }),
      evaluation({
        date: '2026-06-04',
        outcome: 'improved',
        phaseType: 'skin-status',
        allergenId: 'eggs',
      }),
    ];
    const result = checkpointVerdictGate(eggsSteps[2], 'eggs', evaluations);
    expect(result.allowed).toBe(false);
  });
});

// ── Catalog parity ────────────────────────────────────────────

describe('ALLERGENS ladders', () => {
  // Post-migration (#437) a "protocol allergen" IS "an allergen carrying a
  // ladder" — `LadderAllergenId` is derived from the `ladder` field's presence
  // (allergen-catalog.ts). So the old "missing ladder" case is structurally
  // impossible; what still needs a gate is a *malformed* ladder (Story 11).
  // The repo validates curated data at test/CI time (see curation-rules.test.ts),
  // which is its build-merge gate.
  const VALID_ANCHORS: readonly PortionKind[] = [
    'pinch',
    'teaspoon',
    'spoon',
    'portion',
    'package',
  ];

  const withLadder = ALLERGENS.filter(
    (a): a is typeof a & { ladder: Ladder } =>
      'ladder' in a && !!(a as { ladder?: unknown }).ladder,
  );

  it('the catalog authors at least one ladder-bearing allergen', () => {
    expect(withLadder.length).toBeGreaterThan(0);
  });

  it('every ladder is well-formed (non-empty stage, valid anchors, unique ids, non-empty dose)', () => {
    const seenIds = new Set<string>();
    for (const { id, ladder } of withLadder) {
      const stages = Object.values(ladder.stages).filter((s): s is readonly LadderStep[] => !!s);
      expect(stages.length, `ladder on ${id} defines no stage`).toBeGreaterThan(0);
      for (const steps of stages) {
        expect(steps.length, `empty stage on ${id}`).toBeGreaterThan(0);
        for (const step of steps) {
          expect(VALID_ANCHORS, `invalid anchor "${step.anchor}" on ${id}`).toContain(step.anchor);
          expect(step.dose.trim().length, `empty dose on ${id}/${step.id}`).toBeGreaterThan(0);
          expect(seenIds.has(step.id), `duplicate step id "${step.id}"`).toBe(false);
          seenIds.add(step.id);
        }
      }
    }
  });
});

// ── resolveLadder (override merge) ────────────────────────────

describe('resolveLadder', () => {
  const defaultLadder: Ladder = {
    allergenId: 'eggs',
    stages: {
      breastfed: [
        {
          id: 'default-b-1',
          anchor: 'pinch',
          isEvaluationCheckpoint: false,
          dose: 'default breastfed',
        },
      ],
      mixed: [
        {
          id: 'default-m-1',
          anchor: 'teaspoon',
          isEvaluationCheckpoint: false,
          dose: 'default mixed',
        },
      ],
      solids: [
        {
          id: 'default-s-1',
          anchor: 'portion',
          isEvaluationCheckpoint: false,
          dose: 'default solids',
        },
      ],
    },
  };

  const overrideLadder: Ladder = {
    allergenId: 'eggs',
    stages: {
      breastfed: [
        {
          id: 'override-b-1',
          anchor: 'teaspoon',
          isEvaluationCheckpoint: true,
          dose: 'override breastfed',
        },
      ],
    },
  };

  it('returns the default ladder when no override is present', () => {
    expect(resolveLadder(defaultLadder, null)).toBe(defaultLadder);
  });

  it('returns the default ladder when the override is undefined', () => {
    expect(resolveLadder(defaultLadder, undefined)).toBe(defaultLadder);
  });

  it("replaces the default stage's rungs with the override's when the override defines that stage", () => {
    const resolved = resolveLadder(defaultLadder, overrideLadder);
    expect(resolved.stages.breastfed?.[0].id).toBe('override-b-1');
  });

  it('preserves default stages the override does not define — a breastfed-only override keeps mixed/solids', () => {
    // Regression guard: an override customising just one stage must not
    // silently erase the other stages. The child would find an empty ladder
    // on transition into mixed/solids otherwise (issue #427 review).
    const resolved = resolveLadder(defaultLadder, overrideLadder);
    expect(resolved.stages.mixed?.[0].id).toBe('default-m-1');
    expect(resolved.stages.solids?.[0].id).toBe('default-s-1');
  });

  it('currentRung uses the override rungs when an override is passed', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:breakfast',
        date: '2026-06-01',
        mealType: 'breakfast',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'teaspoon' }],
      }),
    ];
    // The default first rung anchors on `pinch`; the override anchors on `teaspoon`.
    // A `teaspoon` meal advances the override's first rung, not the default's.
    expect(currentRung('eggs', meals, defaultLadder, 'breastfed', overrideLadder)?.id).toBe(
      'override-b-1',
    );
  });

  it('nextLegalStep walks the override rungs when an override is passed', () => {
    expect(nextLegalStep(null, defaultLadder, 'breastfed', overrideLadder)?.id).toBe(
      'override-b-1',
    );
  });

  it('currentRung falls back to the default stage when the override does not define that stage', () => {
    const meals: Meal[] = [
      makeMeal({
        id: '2026-06-01:lunch',
        date: '2026-06-01',
        mealType: 'lunch',
        items: [{ id: 'i1', name: 'Vejce', foodId: 'vejce', amount: 'portion' }],
      }),
    ];
    // Override only defines breastfed; asking about solids must use the default.
    expect(currentRung('eggs', meals, defaultLadder, 'solids', overrideLadder)?.id).toBe(
      'default-s-1',
    );
  });
});

// ── rungAtDayInPhase ──────────────────────────────────────────

describe('rungAtDayInPhase', () => {
  const catalog = new BundledCatalogAdapter();
  const firstLadder = ALLERGENS.find(
    (a): a is typeof a & { ladder: { stages: { breastfed?: readonly LadderStep[] } } } =>
      'ladder' in a &&
      !!(a as { ladder?: { stages?: { breastfed?: unknown } } }).ladder?.stages?.breastfed,
  );

  it('returns the rung at day 1 (1-indexed)', () => {
    if (!firstLadder) throw new Error('catalog has no ladder-bearing allergen');
    const expected = firstLadder.ladder.stages.breastfed![0];
    expect(rungAtDayInPhase(catalog, firstLadder.id as LadderAllergenId, 1, 'breastfed')).toBe(
      expected,
    );
  });

  it('returns null when the day is out of range', () => {
    if (!firstLadder) throw new Error('catalog has no ladder-bearing allergen');
    const totalDays = firstLadder.ladder.stages.breastfed!.length;
    expect(
      rungAtDayInPhase(catalog, firstLadder.id as LadderAllergenId, totalDays + 1, 'breastfed'),
    ).toBeNull();
  });

  it('returns null when the allergen has no ladder for the stage', () => {
    if (!firstLadder) throw new Error('catalog has no ladder-bearing allergen');
    // No catalog allergen currently carries a `solids` stage — the assertion is
    // vacuously true today, but pin the contract for when one is authored.
    const hasSolids = ALLERGENS.some(
      (a) =>
        'ladder' in a &&
        !!(a as { ladder?: { stages?: { solids?: unknown } } }).ladder?.stages?.solids,
    );
    if (hasSolids) return; // skip if data has moved on
    expect(rungAtDayInPhase(catalog, firstLadder.id as LadderAllergenId, 1, 'solids')).toBeNull();
  });

  it('returns null when the allergen is unknown', () => {
    expect(
      rungAtDayInPhase(catalog, 'not-a-real-allergen' as LadderAllergenId, 1, 'breastfed'),
    ).toBeNull();
  });
});

// ── decideLadderMove ──────────────────────────────────────────

describe('decideLadderMove', () => {
  // Distinct anchors per rung so the reaction re-test walk is unambiguous.
  const engineSteps: readonly LadderStep[] = [
    { id: 'e1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'd1' },
    { id: 'e2', anchor: 'teaspoon', isEvaluationCheckpoint: true, dose: 'd2' },
    { id: 'e3', anchor: 'spoon', isEvaluationCheckpoint: false, dose: 'd3' },
  ];
  const engineLadder: Ladder = { allergenId: 'eggs', stages: { breastfed: engineSteps } };

  function decInput(overrides: Partial<LadderDecisionInput>): LadderDecisionInput {
    return {
      allergenId: 'eggs',
      meals: [],
      evaluations: [],
      observations: [],
      defaultLadder: engineLadder,
      override: null,
      stage: 'breastfed',
      today: '2026-06-10',
      cadenceDays: 1,
      stabilityWindowDays: 3,
      isPermanentlyEliminated: false,
      ...overrides,
    };
  }

  function eggMeal(date: string, amount: PortionKind): Meal {
    return makeMeal({
      id: `${date}:breakfast`,
      date,
      mealType: 'breakfast',
      items: [{ id: `i-${date}-${amount}`, name: 'Vejce', foodId: 'vejce', amount }],
    });
  }

  // ── Clean climb → passed ──
  describe('clean climb', () => {
    it('advances from null (the first move) when nothing has been logged', () => {
      expect(decideLadderMove(decInput({}))).toEqual({
        kind: 'advance',
        from: null,
        to: engineSteps[0],
      });
    });

    it('advances one rung at a time once the cadence has elapsed', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      expect(decideLadderMove(decInput({ meals, today: '2026-06-03' }))).toEqual({
        kind: 'advance',
        from: engineSteps[0],
        to: engineSteps[1],
      });
    });

    it('holds at a checkpoint rung awaiting a verdict', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-03', 'teaspoon')];
      expect(decideLadderMove(decInput({ meals, today: '2026-06-05' }))).toEqual({
        kind: 'hold',
        rung: engineSteps[1],
        reason: 'awaiting-verdict',
      });
    });

    it('advances past a checkpoint once its verdict is tolerated', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-03', 'teaspoon')];
      const evaluations = [evaluation({ date: '2026-06-03', outcome: 'tolerated' })];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-05' }))).toEqual({
        kind: 'advance',
        from: engineSteps[1],
        to: engineSteps[2],
      });
    });

    it('reports the whole ladder passed at the effective top rung', () => {
      const meals = [
        eggMeal('2026-06-01', 'pinch'),
        eggMeal('2026-06-03', 'teaspoon'),
        eggMeal('2026-06-05', 'spoon'),
      ];
      const evaluations = [evaluation({ date: '2026-06-03', outcome: 'tolerated' })];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-07' }))).toEqual({
        kind: 'passed',
        rung: engineSteps[2],
      });
    });
  });

  // ── Each hold reason in isolation ──
  describe('hold reasons', () => {
    it('holds when skin has worsened across the window and reports the delta', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      const observations = [obs('2026-06-01', 0), obs('2026-06-03', 2)];
      expect(decideLadderMove(decInput({ meals, observations, today: '2026-06-03' }))).toEqual({
        kind: 'hold',
        rung: engineSteps[0],
        reason: 'skin-worsening',
        baselineSeverity: 0,
        currentSeverity: 2,
      });
    });

    it('allows advancing when skin has stayed at a steady non-zero baseline', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      const observations = [obs('2026-06-01', 1), obs('2026-06-03', 1)];
      expect(decideLadderMove(decInput({ meals, observations, today: '2026-06-03' }))).toEqual({
        kind: 'advance',
        from: engineSteps[0],
        to: engineSteps[1],
      });
    });

    it('allows advancing when skin has improved across the window', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      const observations = [obs('2026-06-01', 2), obs('2026-06-03', 1)];
      expect(decideLadderMove(decInput({ meals, observations, today: '2026-06-03' }))).toEqual({
        kind: 'advance',
        from: engineSteps[0],
        to: engineSteps[1],
      });
    });

    it('treats an absent observation today as unchanged since the last log', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      const observations = [obs('2026-06-01', 1)];
      expect(decideLadderMove(decInput({ meals, observations, today: '2026-06-03' }))).toEqual({
        kind: 'advance',
        from: engineSteps[0],
        to: engineSteps[1],
      });
    });

    it('holds on cadence and reports the days remaining', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      expect(decideLadderMove(decInput({ meals, cadenceDays: 3, today: '2026-06-02' }))).toEqual({
        kind: 'hold',
        rung: engineSteps[0],
        reason: 'cadence',
        daysRemaining: 2,
      });
    });
  });

  // ── Precedence overlaps ──
  describe('precedence', () => {
    it('prefers the skin-worsening hold over cadence when the cadence is already satisfied', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      const observations = [obs('2026-06-02', 0), obs('2026-06-04', 3)];
      // cadence (1 day) is satisfied by 06-04, so only the skin gate should hold.
      const move = decideLadderMove(decInput({ meals, observations, today: '2026-06-04' }));
      expect(move).toEqual({
        kind: 'hold',
        rung: engineSteps[0],
        reason: 'skin-worsening',
        baselineSeverity: 0,
        currentSeverity: 3,
      });
    });

    it('rests on a recorded checkpoint reaction rather than holding for a verdict', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
      const evaluations = [evaluation({ date: '2026-06-02', outcome: 'clear-reaction' })];
      const move = decideLadderMove(decInput({ meals, evaluations, today: '2026-06-02' }));
      expect(move).toEqual({
        kind: 'rest',
        rung: engineSteps[1],
        days: REST_PHASE_DAYS_CLEAR,
        until: addDays('2026-06-02', REST_PHASE_DAYS_CLEAR),
      });
    });
  });

  // ── Reaction cycle: rest → step-back → clean re-test → re-advance ──
  describe('reaction cycle', () => {
    const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
    const evaluations = [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })];
    const until = addDays('2026-06-02', REST_PHASE_DAYS_MILD);

    it('rests while the recovery window is open', () => {
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-03' }))).toEqual({
        kind: 'rest',
        rung: engineSteps[1],
        days: REST_PHASE_DAYS_MILD,
        until,
      });
    });

    it('steps back to the last-passing rung once the rest has elapsed', () => {
      expect(decideLadderMove(decInput({ meals, evaluations, today: addDays(until, 1) }))).toEqual({
        kind: 'step-back',
        from: engineSteps[1],
        to: engineSteps[0],
      });
    });

    it('re-advances after a clean re-test — a reaction is a temporary setback', () => {
      const retestMeals = [...meals, eggMeal('2026-06-11', 'teaspoon')];
      const retestEvals = [
        ...evaluations,
        evaluation({ date: '2026-06-11', outcome: 'tolerated' }),
      ];
      expect(
        decideLadderMove(
          decInput({ meals: retestMeals, evaluations: retestEvals, today: '2026-06-13' }),
        ),
      ).toEqual({ kind: 'advance', from: engineSteps[1], to: engineSteps[2] });
    });
  });

  // ── Reaction binding by date ──
  // A verdict dated D binds to the highest rung whose anchor was dosed on or
  // before D. The replay orders a same-date meal *before* a same-date eval, so
  // a dose logged the same day the reaction is recorded still counts as the
  // reacting rung. This pins that ordering — flip it and the reaction would
  // bind one rung lower.
  describe('reaction binding by date', () => {
    it('binds a same-day reaction to the rung dosed that same day, not the rung below', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
      const evaluations = [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })];
      // teaspoon (e2) dosed on 06-02 → the 06-02 reaction rests at e2, not e1.
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-03' }))).toEqual({
        kind: 'rest',
        rung: engineSteps[1],
        days: REST_PHASE_DAYS_MILD,
        until: addDays('2026-06-02', REST_PHASE_DAYS_MILD),
      });
    });

    it('does not bind a reaction to a higher rung dosed after the reaction date', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-05', 'teaspoon')];
      // Reaction dated 06-02: only pinch (e1) was dosed on or before that day,
      // so it binds to e1 (floor exhaustion) — the later teaspoon does not count.
      const evaluations = [evaluation({ date: '2026-06-02', outcome: 'severe-reaction' })];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-10' }))).toEqual({
        kind: 'ceiling-reached',
        rung: engineSteps[0],
      });
    });
  });

  // ── Terminals ──
  describe('terminals', () => {
    it('reports ceiling-reached when a rung reacts up to the per-rung cap', () => {
      const meals = [
        eggMeal('2026-06-01', 'pinch'),
        eggMeal('2026-06-02', 'teaspoon'),
        eggMeal('2026-06-11', 'teaspoon'),
      ];
      const evaluations = [
        evaluation({ date: '2026-06-02', outcome: 'mild-reaction' }),
        evaluation({ date: '2026-06-11', outcome: 'mild-reaction' }),
      ];
      expect(MAX_RUNG_REACTIONS).toBe(2); // pin the fixture to the constant
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-20' }))).toEqual({
        kind: 'ceiling-reached',
        rung: engineSteps[1],
      });
    });

    it('reports ceiling-reached on floor exhaustion — the lowest rung reacts', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      const evaluations = [evaluation({ date: '2026-06-01', outcome: 'severe-reaction' })];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-05' }))).toEqual({
        kind: 'ceiling-reached',
        rung: engineSteps[0],
      });
    });

    it('reports blocked when permanently eliminated, regardless of history', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-03', 'teaspoon')];
      const evaluations = [evaluation({ date: '2026-06-03', outcome: 'tolerated' })];
      expect(
        decideLadderMove(decInput({ meals, evaluations, isPermanentlyEliminated: true })),
      ).toEqual({ kind: 'blocked' });
    });
  });

  // ── Override ──
  it('fires passed at the effective top when an override shortens the ladder', () => {
    const override: Ladder = {
      allergenId: 'eggs',
      stages: {
        breastfed: [
          { id: 'o1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'override top' },
        ],
      },
    };
    const meals = [eggMeal('2026-06-01', 'pinch')];
    // Against the default the pinch is rung e1 with e2 above (→ advance); the
    // override makes pinch the sole, top rung (→ passed at the effective top).
    expect(decideLadderMove(decInput({ meals, override, today: '2026-06-03' }))).toEqual({
      kind: 'passed',
      rung: override.stages.breastfed![0],
    });
  });

  // ── currentRung reaction-awareness (shared replay through the projection) ──
  it('currentRung drops the live rung after a bound reaction', () => {
    const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
    // No reaction: the live rung is the checkpoint e2.
    expect(currentRung('eggs', meals, engineLadder, 'breastfed')?.id).toBe('e2');
    // A reaction bound to e2 drops the live rung to e1.
    const evaluations = [evaluation({ date: '2026-06-02', outcome: 'clear-reaction' })];
    expect(currentRung('eggs', meals, engineLadder, 'breastfed', null, evaluations)?.id).toBe('e1');
  });
});
