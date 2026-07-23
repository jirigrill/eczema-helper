import { describe, expect, it } from 'vitest';

import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import { ALLERGENS } from '$lib/data/allergen-catalog/allergen-catalog';
import type {
  LadderAllergenId,
  Meal,
  PortionKind,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';
import { REST_PHASE_DAYS_CLEAR, REST_PHASE_DAYS_MILD } from '$lib/domain/policy';
import { addDays } from '$lib/utils/date';

import {
  cadenceGate,
  checkpointVerdictGate,
  currentRung,
  decideLadderMove,
  explainLadderMove,
  nextLegalStep,
  resolveLadder,
  rungAtDayInPhase,
  skinStabilityGate,
} from './ladder';
import type { Ladder, LadderDecisionInput, LadderStep } from './ladder';

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
    expect(nextLegalStep(eggsSteps[0]!, eggsLadder, 'breastfed')?.id).toBe('rung-2');
    expect(nextLegalStep(eggsSteps[1]!, eggsLadder, 'breastfed')?.id).toBe('rung-3');
  });

  it('returns null once the top of the ladder is reached', () => {
    const top = eggsSteps[eggsSteps.length - 1]!;
    expect(nextLegalStep(top, eggsLadder, 'breastfed')).toBeNull();
  });

  it('cannot express a multi-step advance — the return is a single step or null', () => {
    // The signature itself precludes returning two steps at once. This test
    // documents that guarantee: `nextLegalStep` walks exactly one rung.
    const returned = nextLegalStep(eggsSteps[0]!, eggsLadder, 'breastfed');
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
      nextLegalStep(eggsSteps[0]!, eggsLadder, 'breastfed', undefined, {
        isPermanentlyEliminated: true,
      }),
    ).toBeNull();
    expect(
      nextLegalStep(eggsSteps[1]!, eggsLadder, 'breastfed', undefined, {
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
    const result = checkpointVerdictGate(eggsSteps[0]!, 'eggs', []);
    expect(result.allowed).toBe(true);
  });

  it('blocks at a checkpoint rung when no verdict has been recorded yet', () => {
    const result = checkpointVerdictGate(eggsSteps[2]!, 'eggs', []);
    expect(result.allowed).toBe(false);
    expect(result.requiresRest).toBe(false);
  });

  it('allows past a checkpoint once the latest verdict for the allergen is tolerated', () => {
    const evaluations = [evaluation({ date: '2026-06-03', outcome: 'tolerated' })];
    const result = checkpointVerdictGate(eggsSteps[2]!, 'eggs', evaluations);
    expect(result.allowed).toBe(true);
    expect(result.requiresRest).toBe(false);
  });

  it('holds and requires rest when the latest verdict is a reaction', () => {
    const evaluations = [evaluation({ date: '2026-06-03', outcome: 'clear-reaction' })];
    const result = checkpointVerdictGate(eggsSteps[2]!, 'eggs', evaluations);
    expect(result.allowed).toBe(false);
    expect(result.requiresRest).toBe(true);
    expect(result.restDays).toBe(7);
  });

  it('uses only the latest verdict by date, not an earlier stale one', () => {
    const evaluations = [
      evaluation({ date: '2026-06-01', outcome: 'severe-reaction' }),
      evaluation({ date: '2026-06-05', outcome: 'tolerated' }),
    ];
    const result = checkpointVerdictGate(eggsSteps[2]!, 'eggs', evaluations);
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
    const result = checkpointVerdictGate(eggsSteps[2]!, 'eggs', evaluations);
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
    expect(resolved.stages.breastfed?.[0]!.id).toBe('override-b-1');
  });

  it('preserves default stages the override does not define — a breastfed-only override keeps mixed/solids', () => {
    // Regression guard: an override customising just one stage must not
    // silently erase the other stages. The child would find an empty ladder
    // on transition into mixed/solids otherwise (issue #427 review).
    const resolved = resolveLadder(defaultLadder, overrideLadder);
    expect(resolved.stages.mixed?.[0]!.id).toBe('default-m-1');
    expect(resolved.stages.solids?.[0]!.id).toBe('default-s-1');
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
  const engineLadder: Ladder = {
    allergenId: 'eggs',
    stages: { breastfed: engineSteps },
  };

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

    it('advances past a former checkpoint rung without waiting for a verdict', () => {
      // The checkpoint verdict hold is retired (ADR-0023 §6): reaching e2 (a
      // checkpoint) no longer stops the climb for a recorded verdict. In probe
      // mode the fast cadence lets it advance straight on.
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-03', 'teaspoon')];
      expect(decideLadderMove(decInput({ meals, today: '2026-06-05' }))).toEqual({
        kind: 'advance',
        from: engineSteps[1],
        to: engineSteps[2],
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

    it('reports passed at the top while the dwell confirmation is still running', () => {
      // Reaching the top flips the mode to confirm (cadence ≥ latency = 3). A
      // single top dose is not yet a completed dwell (N = 3 steps), so the top
      // reads as `passed` — being confirmed — not `settled`.
      const meals = [
        eggMeal('2026-06-01', 'pinch'),
        eggMeal('2026-06-02', 'teaspoon'),
        eggMeal('2026-06-03', 'spoon'),
      ];
      const evaluations = [evaluation({ date: '2026-06-03', outcome: 'tolerated' })];
      // spoon dosed 06-03; today 06-07 clears the confirm cadence (3 d).
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

    it('rests on the stepped-down rung after a reaction rather than holding for a verdict', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
      const evaluations = [evaluation({ date: '2026-06-02', outcome: 'clear-reaction' })];
      const move = decideLadderMove(decInput({ meals, evaluations, today: '2026-06-02' }));
      // e2 reacted → walk down to e1; the recovery rest is on the stepped-down rung.
      expect(move).toEqual({
        kind: 'rest',
        rung: engineSteps[0],
        days: REST_PHASE_DAYS_CLEAR,
        until: addDays('2026-06-02', REST_PHASE_DAYS_CLEAR),
      });
    });
  });

  // ── Walk-down on a confirmed reaction: step down one rung, never re-climb ──
  // PRD #454 stories #6, #7; ADR-0023 §6. A confirmed non-tolerated verdict
  // steps the ladder down one rung and caps the reacting rung permanently — a
  // later dose at the reacting anchor never re-advances onto it.
  describe('walk-down', () => {
    const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
    const evaluations = [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })];

    it('steps down to the rung below and never climbs back to the reacting rung', () => {
      // e2 reacted on 06-02. Under walk-down the ladder caps at e1 (the rung
      // below) and never re-climbs e2. With only the stepped-down rung dosed so
      // far, e1 is the effective top being confirmed — the engine must not
      // advance onto e2. (v1 would `advance` e1→e2, treating the reaction as a
      // temporary setback; walk-down forbids that.)
      const move = decideLadderMove(decInput({ meals, evaluations, today: '2026-06-20' }));
      expect(move).not.toEqual(expect.objectContaining({ kind: 'advance', to: engineSteps[1] }));
    });

    // A walk-down to e2 (from a top-rung e3 reaction), then a full re-confirm
    // dwell on e2. N = 3 default steps; confirm cadence = latency = 3 d.
    const climbToTop = [
      eggMeal('2026-06-01', 'pinch'),
      eggMeal('2026-06-02', 'teaspoon'),
      eggMeal('2026-06-03', 'spoon'), // reaches e3
    ];
    const topReaction = [evaluation({ date: '2026-06-03', outcome: 'mild-reaction' })];

    it('holds the stepped-down rung as passed until its own dwell completes', () => {
      // e3 reacts → down to e2. The single earlier climb-past teaspoon (06-02)
      // does not count; after the rest, two fresh e2 doses (06-07, 06-10) are
      // only 2 of the 3 required — e2 reads `passed`, not yet `settled`.
      const meals = [
        ...climbToTop,
        eggMeal('2026-06-07', 'teaspoon'),
        eggMeal('2026-06-10', 'teaspoon'),
      ];
      expect(
        decideLadderMove(decInput({ meals, evaluations: topReaction, today: '2026-06-13' })),
      ).toEqual({
        kind: 'passed',
        rung: engineSteps[1],
      });
    });

    it('reports the stepped-down rung settled only after a full dwell + latency window', () => {
      // Three fresh e2 doses (06-07, 06-10, 06-13) after the walk-down complete
      // the N=3 dwell; terminal eval at last dose (06-13) + latency (3) = 06-16.
      const meals = [
        ...climbToTop,
        eggMeal('2026-06-07', 'teaspoon'),
        eggMeal('2026-06-10', 'teaspoon'),
        eggMeal('2026-06-13', 'teaspoon'),
      ];
      expect(
        decideLadderMove(decInput({ meals, evaluations: topReaction, today: '2026-06-16' })),
      ).toEqual({
        kind: 'settled',
        rung: engineSteps[1],
      });
    });

    it('does not count the single earlier climb-past exposure toward the stepped-down dwell', () => {
      // Only two fresh e2 doses after the walk-down (06-07, 06-10). If the
      // 06-02 climb-past teaspoon counted, N=3 would already be met and 06-13
      // (past 06-10 + latency) would read `settled`. It must read `passed`.
      const meals = [
        ...climbToTop,
        eggMeal('2026-06-07', 'teaspoon'),
        eggMeal('2026-06-10', 'teaspoon'),
      ];
      expect(
        decideLadderMove(decInput({ meals, evaluations: topReaction, today: '2026-06-16' })),
      ).toEqual({
        kind: 'passed',
        rung: engineSteps[1],
      });
    });
  });

  // ── Reaction binding by date ──
  // A verdict dated D binds to the highest rung whose anchor was dosed in the
  // latency window `[D − latency, D]` (under confirm cadence ≥ latency the
  // window holds exactly one rung). The replay orders a same-date meal *before*
  // a same-date eval, so a dose logged the same day the reaction is recorded
  // still counts as the reacting rung. This pins that ordering — flip it and the
  // reaction would bind one rung lower.
  describe('reaction binding by date', () => {
    it('binds a same-day reaction to the rung dosed that same day, then walks down from it', () => {
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
      const evaluations = [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })];
      // teaspoon (e2) dosed on 06-02 → the 06-02 reaction binds to e2 and walks
      // down to e1 (rest at e1). Had it bound to e1 instead, the lowest rung
      // would have reacted → floor-exhaustion, so the rest at e1 proves the bind.
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-03' }))).toEqual({
        kind: 'rest',
        rung: engineSteps[0],
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
        reason: 'floor-exhaustion',
      });
    });
  });

  // ── Terminals ──
  describe('terminals', () => {
    it('cascades further down on a second reaction — never re-climbing either reacting rung', () => {
      // Climb to e3, react on e3 (06-03) → walk down to e2. After the rest,
      // re-confirm e2 with a fresh teaspoon dose (06-10) that also reacts →
      // cascade down to e1. During e1's recovery the rest binds to e1: the
      // second reaction stepped down from e2, proving the cascade (had e2 not
      // stepped down first, the second reaction would have bound to e3).
      const meals = [
        eggMeal('2026-06-01', 'pinch'),
        eggMeal('2026-06-02', 'teaspoon'),
        eggMeal('2026-06-03', 'spoon'),
        eggMeal('2026-06-10', 'teaspoon'), // re-confirm the stepped-down e2
      ];
      const evaluations = [
        evaluation({ date: '2026-06-03', outcome: 'mild-reaction' }), // e3 reacts → down to e2
        evaluation({ date: '2026-06-10', outcome: 'mild-reaction' }), // e2 reacts → down to e1
      ];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-11' }))).toEqual({
        kind: 'rest',
        rung: engineSteps[0],
        days: REST_PHASE_DAYS_MILD,
        until: addDays('2026-06-10', REST_PHASE_DAYS_MILD),
      });
    });

    it('reports ceiling-reached on floor exhaustion — the lowest rung reacts', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      const evaluations = [evaluation({ date: '2026-06-01', outcome: 'severe-reaction' })];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-05' }))).toEqual({
        kind: 'ceiling-reached',
        rung: engineSteps[0],
        reason: 'floor-exhaustion',
      });
    });

    it('reports floor-exhaustion when a cascade of reactions reaches the lowest rung', () => {
      // e3 reacts → down to e2; e2 reacts → down to e1; e1 (the floor) reacts →
      // nowhere lower to retreat → ceiling-reached { floor-exhaustion }.
      const meals = [
        eggMeal('2026-06-01', 'pinch'),
        eggMeal('2026-06-02', 'teaspoon'),
        eggMeal('2026-06-03', 'spoon'),
        eggMeal('2026-06-10', 'teaspoon'), // re-confirm e2
        eggMeal('2026-06-17', 'pinch'), // re-confirm e1
      ];
      const evaluations = [
        evaluation({ date: '2026-06-03', outcome: 'mild-reaction' }),
        evaluation({ date: '2026-06-10', outcome: 'mild-reaction' }),
        evaluation({ date: '2026-06-17', outcome: 'mild-reaction' }), // floor reacts
      ];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-25' }))).toEqual({
        kind: 'ceiling-reached',
        rung: engineSteps[0],
        reason: 'floor-exhaustion',
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

  // ── v2 clinical reshape: probe/confirm mode, dwell, settled (ADR-0023 §6) ──
  // The escalation half of PRD #454. Reactions now walk the ladder down (see the
  // walk-down block above). These assert only the returned `LadderDecision`,
  // never the private mode/dwell.
  describe('probe/confirm reshape', () => {
    // A full clean climb to the top, then repeated top-rung doses spaced at the
    // confirm cadence (≥ latency = 3 d). N = 3 default steps.
    const spoon = (date: string) => eggMeal(date, 'spoon');
    const cleanClimb = [
      eggMeal('2026-06-01', 'pinch'),
      eggMeal('2026-06-02', 'teaspoon'),
      spoon('2026-06-03'), // top dose #1
    ];

    it('advances fast in probe — a 1-day gap is enough before any reaction', () => {
      const meals = [eggMeal('2026-06-01', 'pinch')];
      // Probe cadence is 1: one day after the first dose the climb advances.
      expect(decideLadderMove(decInput({ meals, today: '2026-06-02' }))).toEqual({
        kind: 'advance',
        from: engineSteps[0],
        to: engineSteps[1],
      });
    });

    it('slows to confirm cadence (≥ latency) once a reaction has been seen', () => {
      // Reaction on e2 flips to confirm and walks down to e1. Re-confirming e1
      // must honour the confirm cadence (≥ latency = 3 d): a fresh pinch dosed
      // 06-11, a 2-day gap would advance in probe but is below confirm cadence,
      // so the engine holds on the stepped-down rung e1.
      const meals = [
        eggMeal('2026-06-01', 'pinch'),
        eggMeal('2026-06-02', 'teaspoon'),
        eggMeal('2026-06-11', 'pinch'), // re-confirm the stepped-down e1
      ];
      const evaluations = [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-13' }))).toEqual({
        kind: 'hold',
        rung: engineSteps[0],
        reason: 'cadence',
        daysRemaining: 1,
      });
    });

    it('binds a delayed reaction to a single rung under confirm cadence ≥ latency', () => {
      // At the top the mode is confirm, so the dwell doses are ≥ 3 d apart and
      // the [D − latency, D] attribution window holds exactly one rung. The last
      // top dose is 06-06; a reaction dated 06-08 falls in its window and binds
      // to the top rung e3 — which then walks down to e2 (rest at e2).
      const meals = [...cleanClimb, spoon('2026-06-06')];
      const evaluations = [evaluation({ date: '2026-06-08', outcome: 'mild-reaction' })];
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-09' }))).toEqual({
        kind: 'rest',
        rung: engineSteps[1],
        days: REST_PHASE_DAYS_MILD,
        until: addDays('2026-06-08', REST_PHASE_DAYS_MILD),
      });
    });

    it('reports passed — not settled — until the top-rung dwell completes', () => {
      // Two of the three required top doses; dwell incomplete → passed.
      const meals = [...cleanClimb, spoon('2026-06-06')];
      expect(decideLadderMove(decInput({ meals, today: '2026-06-09' }))).toEqual({
        kind: 'passed',
        rung: engineSteps[2],
      });
    });

    it('holds (cadence) after the Nth dose until the latency window elapses', () => {
      // Third (final) top dose on 06-09. The terminal evaluation is at last dose
      // + latency = 06-12; confirm cadence (3) coincides with latency, so 06-11
      // (2 d after the last dose) is still a cadence hold, not yet settled.
      const meals = [...cleanClimb, spoon('2026-06-06'), spoon('2026-06-09')];
      expect(decideLadderMove(decInput({ meals, today: '2026-06-11' }))).toEqual({
        kind: 'hold',
        rung: engineSteps[2],
        reason: 'cadence',
        daysRemaining: 1,
      });
    });

    it('reports settled once the dwell completes and the latency window elapses', () => {
      // N = 3 top doses (06-03, 06-06, 06-09) at confirm cadence; terminal eval
      // at 06-09 + latency (3) = 06-12.
      const meals = [...cleanClimb, spoon('2026-06-06'), spoon('2026-06-09')];
      expect(decideLadderMove(decInput({ meals, today: '2026-06-12' }))).toEqual({
        kind: 'settled',
        rung: engineSteps[2],
      });
    });

    it('confirms the top rung only — a clean lower rung advances, never dwells', () => {
      // A mid-ladder rung (e2) is not the top, so no dwell/settled ever accrues
      // there; in probe mode the engine simply climbs on to e3 once cadence allows.
      const meals = [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')];
      expect(decideLadderMove(decInput({ meals, today: '2026-06-04' }))).toEqual({
        kind: 'advance',
        from: engineSteps[1],
        to: engineSteps[2],
      });
    });

    it('never returns the retired awaiting-verdict hold', () => {
      // Sweep the climb across the former checkpoint rung (e2) at every day from
      // the first dose onward; the retired `awaiting-verdict` hold must never
      // appear regardless of whether a verdict was logged.
      const meals = [
        eggMeal('2026-06-01', 'pinch'),
        eggMeal('2026-06-02', 'teaspoon'),
        spoon('2026-06-03'),
      ];
      for (let d = 1; d <= 20; d++) {
        const today = addDays('2026-06-01', d);
        const move = decideLadderMove(decInput({ meals, today }));
        if (move.kind === 'hold') expect(move.reason).not.toBe('awaiting-verdict');
      }
    });

    it('keeps settled derived — recomputing from the same history is identical', () => {
      const meals = [...cleanClimb, spoon('2026-06-06'), spoon('2026-06-09')];
      const input = decInput({ meals, today: '2026-06-12' });
      const first = decideLadderMove(input);
      const second = decideLadderMove(input);
      expect(first).toEqual({ kind: 'settled', rung: engineSteps[2] });
      expect(second).toEqual(first); // pure recompute, nothing persisted
    });

    it('restarts the dwell on the stepped-down rung after a walk-down — a lone fresh dose never settles', () => {
      // Two top-rung dwell doses (06-03, 06-06), then a reaction at the top on
      // 06-07 walks the ladder down to e2 (e3 is capped, never re-climbed). The
      // mother re-confirms e2 with a single fresh teaspoon dose (06-14). The
      // stepped-down rung's dwell restarts from zero, so one fresh dose is not a
      // completed dwell: e2 reads `passed`, not `settled` — the reset guards
      // against trusting the rung on a single earlier climb-past exposure.
      const meals = [
        ...cleanClimb, // e1, e2, e3 (top dose #1 on 06-03)
        spoon('2026-06-06'), // top dose #2
        eggMeal('2026-06-14', 'teaspoon'), // re-confirm the stepped-down e2 (fresh dwell #1)
      ];
      const evaluations = [evaluation({ date: '2026-06-07', outcome: 'mild-reaction' })];
      // 06-17 clears the confirm cadence since the fresh e2 dose (06-14); with
      // the dwell reset, only 1 of 3 required doses has accrued → passed.
      expect(decideLadderMove(decInput({ meals, evaluations, today: '2026-06-17' }))).toEqual({
        kind: 'passed',
        rung: engineSteps[1],
      });
    });
  });

  // ── Override ──
  it('reports passed at the effective top when an override shortens the ladder', () => {
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
    // override makes pinch the sole, top rung. At the top the mode is confirm
    // (cadence ≥ 3), so today 06-04 clears it; the single top dose has not yet
    // completed the dwell (N = 3 default steps), so the top reads as `passed`.
    expect(decideLadderMove(decInput({ meals, override, today: '2026-06-04' }))).toEqual({
      kind: 'passed',
      rung: override.stages.breastfed![0],
    });
  });

  // ── explainLadderMove trace seam (issue #528) ──
  describe('explainLadderMove', () => {
    // A corpus spanning every engine branch, reusing the block's fixtures.
    const corpus: LadderDecisionInput[] = [
      // clean climb / advance from null
      decInput({}),
      // advance one rung
      decInput({ meals: [eggMeal('2026-06-01', 'pinch')], today: '2026-06-03' }),
      // skin-worsening hold
      decInput({
        meals: [eggMeal('2026-06-01', 'pinch')],
        observations: [obs('2026-06-01', 0), obs('2026-06-03', 2)],
        today: '2026-06-03',
      }),
      // cadence hold
      decInput({ meals: [eggMeal('2026-06-01', 'pinch')], cadenceDays: 3, today: '2026-06-02' }),
      // rest (reaction still in effect)
      decInput({
        meals: [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')],
        evaluations: [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })],
        today: '2026-06-03',
      }),
      // ceiling-reached (floor exhaustion)
      decInput({
        meals: [eggMeal('2026-06-01', 'pinch')],
        evaluations: [evaluation({ date: '2026-06-01', outcome: 'severe-reaction' })],
        today: '2026-06-05',
      }),
      // blocked (permanently eliminated)
      decInput({ isPermanentlyEliminated: true }),
      // passed / settled at the top
      decInput({
        meals: [
          eggMeal('2026-06-01', 'pinch'),
          eggMeal('2026-06-02', 'teaspoon'),
          eggMeal('2026-06-03', 'spoon'),
          eggMeal('2026-06-06', 'spoon'),
          eggMeal('2026-06-09', 'spoon'),
        ],
        today: '2026-06-12',
      }),
    ];

    it('never drifts from decideLadderMove — the explained decision deep-equals the decision', () => {
      for (const input of corpus) {
        expect(explainLadderMove(input).decision).toEqual(decideLadderMove(input));
      }
    });

    const NAMES_IN_ORDER = [
      'permanent-or-empty',
      'ceiling',
      'reaction',
      'skin-worsening',
      'cadence',
      'advance-or-dwell',
    ];

    it('always returns the six precedence step names in order, whatever fired', () => {
      for (const input of corpus) {
        const { steps } = explainLadderMove(input);
        expect(steps.map((s) => s.name)).toEqual(NAMES_IN_ORDER);
      }
    });

    it('marks exactly one step fired, with every later step not-reached', () => {
      for (const input of corpus) {
        const { steps } = explainLadderMove(input);
        const firedAt = steps.findIndex((s) => s.status === 'fired');
        expect(firedAt).toBeGreaterThanOrEqual(0);
        expect(steps.filter((s) => s.status === 'fired')).toHaveLength(1);
        steps.forEach((s, i) => {
          if (i > firedAt) expect(s.status).toBe('not-reached');
          else if (i < firedAt) expect(s.status).not.toBe('not-reached');
        });
      }
    });

    it('fires permanent-or-empty for a permanently-eliminated allergen', () => {
      const { steps, decision } = explainLadderMove(decInput({ isPermanentlyEliminated: true }));
      expect(decision).toEqual({ kind: 'blocked' });
      expect(steps[0].status).toBe('fired');
      expect(steps.slice(1).every((s) => s.status === 'not-reached')).toBe(true);
    });

    it('fires permanent-or-empty for an empty stage ladder', () => {
      const emptyLadder: Ladder = { allergenId: 'eggs', stages: {} };
      const { steps, decision } = explainLadderMove(
        decInput({ defaultLadder: emptyLadder, isPermanentlyEliminated: false }),
      );
      expect(decision).toEqual({ kind: 'blocked' });
      expect(steps[0].status).toBe('fired');
    });

    it('fires ceiling on floor exhaustion, passing permanent-or-empty first', () => {
      const { steps, decision } = explainLadderMove(
        decInput({
          meals: [eggMeal('2026-06-01', 'pinch')],
          evaluations: [evaluation({ date: '2026-06-01', outcome: 'severe-reaction' })],
          today: '2026-06-05',
        }),
      );
      expect(decision.kind).toBe('ceiling-reached');
      expect(steps[0].status).toBe('passed-confirmed');
      expect(steps[1].status).toBe('fired');
      expect(steps.slice(2).every((s) => s.status === 'not-reached')).toBe(true);
    });

    it('fires reaction while a rest window is open', () => {
      const { steps, decision } = explainLadderMove(
        decInput({
          meals: [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')],
          evaluations: [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })],
          today: '2026-06-03',
        }),
      );
      expect(decision.kind).toBe('rest');
      expect(steps[2].status).toBe('fired');
      expect(steps.slice(3).every((s) => s.status === 'not-reached')).toBe(true);
    });

    it('fires skin-worsening and carries the gate result with the effective window', () => {
      const { steps, decision } = explainLadderMove(
        decInput({
          meals: [eggMeal('2026-06-01', 'pinch')],
          observations: [obs('2026-06-01', 0), obs('2026-06-03', 2)],
          stabilityWindowDays: 3,
          today: '2026-06-03',
        }),
      );
      expect(decision.kind).toBe('hold');
      const skinStep = steps[3];
      expect(skinStep.status).toBe('fired');
      if (skinStep.detail.step !== 'skin-worsening') throw new Error('wrong detail');
      expect(skinStep.detail.windowDays).toBe(3);
      expect(skinStep.detail.gate).toEqual({
        allowed: false,
        baselineSeverity: 0,
        currentSeverity: 2,
      });
      // Cadence is downstream of the fired skin step and was never evaluated,
      // but it still reports its real effective threshold (probe mode, injected
      // cadenceDays=1) — consistently with how skin-worsening carries windowDays.
      expect(steps[4].status).toBe('not-reached');
      if (steps[4].detail.step !== 'cadence') throw new Error('wrong detail');
      expect(steps[4].detail.cadenceDays).toBe(1);
    });

    it('fires cadence and carries the gate result with the effective, mode-adjusted threshold', () => {
      // Probe mode (no reaction yet): the effective cadence equals the injected
      // cadenceDays (3), unraised by the latency floor.
      const { steps, decision } = explainLadderMove(
        decInput({ meals: [eggMeal('2026-06-01', 'pinch')], cadenceDays: 3, today: '2026-06-02' }),
      );
      expect(decision).toMatchObject({ kind: 'hold', reason: 'cadence' });
      const cadenceStep = steps[4];
      expect(cadenceStep.status).toBe('fired');
      if (cadenceStep.detail.step !== 'cadence') throw new Error('wrong detail');
      expect(cadenceStep.detail.cadenceDays).toBe(3);
      expect(cadenceStep.detail.gate).toEqual({ allowed: false, daysSinceLastDose: 1 });
      // The skin-stability step passed with no observations → passed-no-data.
      expect(steps[3].status).toBe('passed-no-data');
    });

    it('raises the effective cadence to the latency floor in confirm mode', () => {
      // A reaction flips the mode to confirm; the effective cadence is then
      // max(cadenceDays=1, latency=3) = 3, and the trace records 3, not 1.
      const { steps } = explainLadderMove(
        decInput({
          meals: [
            eggMeal('2026-06-01', 'pinch'),
            eggMeal('2026-06-02', 'teaspoon'),
            eggMeal('2026-06-11', 'teaspoon'),
          ],
          evaluations: [
            evaluation({ date: '2026-06-02', outcome: 'mild-reaction' }),
            evaluation({ date: '2026-06-11', outcome: 'tolerated' }),
          ],
          cadenceDays: 1,
          today: '2026-06-13',
        }),
      );
      const cadenceStep = steps[4];
      expect(cadenceStep.status).toBe('fired');
      if (cadenceStep.detail.step !== 'cadence') throw new Error('wrong detail');
      expect(cadenceStep.detail.cadenceDays).toBe(3);
    });

    it('fires advance-or-dwell on a clean advance, both gate steps passing', () => {
      const { steps, decision } = explainLadderMove(
        decInput({
          meals: [eggMeal('2026-06-01', 'pinch')],
          observations: [obs('2026-06-01', 1), obs('2026-06-03', 1)],
          today: '2026-06-03',
        }),
      );
      expect(decision.kind).toBe('advance');
      expect(steps[3].status).toBe('passed-confirmed'); // observations present
      expect(steps[4].status).toBe('passed-confirmed'); // a dose was logged
      expect(steps[5].status).toBe('fired');
    });

    it('exposes the state snapshot with all six fields and explicit nulls', () => {
      const { snapshot } = explainLadderMove(decInput({}));
      expect(snapshot).toEqual({
        liveRung: null,
        atEffectiveTop: false,
        pendingRest: null,
        ceilingRung: null,
        mode: 'probe',
        dwell: { count: 0, lastDoseDate: null },
      });
    });

    it('surfaces liveRung and confirm mode in the snapshot once the top is reached', () => {
      const { snapshot } = explainLadderMove(
        decInput({
          meals: [
            eggMeal('2026-06-01', 'pinch'),
            eggMeal('2026-06-02', 'teaspoon'),
            eggMeal('2026-06-03', 'spoon'),
          ],
          today: '2026-06-07',
        }),
      );
      expect(snapshot.liveRung?.id).toBe('e3');
      expect(snapshot.mode).toBe('confirm');
      expect(snapshot.dwell.count).toBe(1);
      expect(snapshot.ceilingRung).toBeNull();
    });

    it('surfaces the pending rest on the stepped-down rung in the snapshot during a rest', () => {
      const { snapshot } = explainLadderMove(
        decInput({
          meals: [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')],
          evaluations: [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })],
          today: '2026-06-03',
        }),
      );
      // e2 reacted → walk down to e1; the rest window sits on the stepped-down rung.
      expect(snapshot.pendingRest?.rung.id).toBe('e1');
      expect(snapshot.pendingRest?.outcome).toBe('mild-reaction');
    });

    it('surfaces the ceiling rung in the snapshot on a terminal', () => {
      const { snapshot } = explainLadderMove(
        decInput({
          meals: [eggMeal('2026-06-01', 'pinch')],
          evaluations: [evaluation({ date: '2026-06-01', outcome: 'severe-reaction' })],
          today: '2026-06-05',
        }),
      );
      expect(snapshot.ceilingRung?.id).toBe('e1');
    });

    // ── replay trace (per-event deriveLadderState trace for ladder-viz) ──
    describe('replay trace', () => {
      it('has the all-null/empty initial frame before any event', () => {
        const { replay } = explainLadderMove(decInput({}));
        expect(replay.initial).toEqual({
          liveRung: null,
          pendingRest: null,
          ceilingRung: null,
          dwell: { count: 0, lastDoseDate: null },
        });
        expect(replay.steps).toEqual([]); // nothing logged
      });

      it('emits one step per replayed event, in date order', () => {
        const { replay } = explainLadderMove(
          decInput({
            meals: [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')],
            evaluations: [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })],
            today: '2026-06-03',
          }),
        );
        // 2 anchors + 1 eval, meal-before-eval on the shared 06-02 date.
        expect(replay.steps.map((s) => [s.event.kind, s.branch])).toEqual([
          ['anchor', 'climb'],
          ['anchor', 'climb'],
          ['eval', 'reaction-walkdown'],
        ]);
      });

      it('classifies every branch across a representative history', () => {
        const { replay } = explainLadderMove(
          decInput({
            meals: [
              eggMeal('2026-06-01', 'pinch'), // climb → e1
              eggMeal('2026-06-02', 'spoon'), // anchor-noop (next wants teaspoon)
              eggMeal('2026-06-03', 'teaspoon'), // climb → e2
              eggMeal('2026-06-05', 'spoon'), // climb → e3 (top)
              eggMeal('2026-06-07', 'spoon'), // dwell (re-dose at top)
            ],
            evaluations: [evaluation({ date: '2026-06-06', outcome: 'tolerated' })], // tolerated-clear
            today: '2026-06-08',
          }),
        );
        expect(replay.steps.map((s) => s.branch)).toEqual([
          'climb',
          'anchor-noop',
          'climb',
          'climb',
          'tolerated-clear',
          'dwell',
        ]);
      });

      it('records reaction-noop when a reaction precedes any dose', () => {
        const { replay } = explainLadderMove(
          decInput({
            evaluations: [evaluation({ date: '2026-06-01', outcome: 'mild-reaction' })],
            today: '2026-06-02',
          }),
        );
        expect(replay.steps).toHaveLength(1);
        expect(replay.steps[0]!.branch).toBe('reaction-noop');
      });

      it('records reaction-ceiling and stops the trace at the terminal', () => {
        const { replay } = explainLadderMove(
          decInput({
            meals: [eggMeal('2026-06-01', 'pinch')],
            evaluations: [
              evaluation({ date: '2026-06-01', outcome: 'severe-reaction' }),
              // A later meal must NOT appear — the loop breaks at the ceiling.
              evaluation({ date: '2026-06-03', outcome: 'tolerated' }),
            ],
            today: '2026-06-05',
          }),
        );
        expect(replay.steps.map((s) => s.branch)).toEqual(['climb', 'reaction-ceiling']);
      });

      it("the last step's `after` equals the snapshot's evolving fields — the ledger's bottom row", () => {
        const input = decInput({
          meals: [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')],
          evaluations: [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })],
          today: '2026-06-03',
        });
        const { snapshot, replay } = explainLadderMove(input);
        const last = replay.steps.at(-1)!.after;
        // The frame carries only the loop's evolving fields — `mode` and
        // `atEffectiveTop` are derived after the loop, so they live on the
        // snapshot but never on a frame.
        expect(last).toEqual({
          liveRung: snapshot.liveRung,
          pendingRest: snapshot.pendingRest,
          ceilingRung: snapshot.ceilingRung,
          dwell: snapshot.dwell,
        });
      });

      it('is pure — a re-run is deep-equal', () => {
        const input = decInput({
          meals: [eggMeal('2026-06-01', 'pinch'), eggMeal('2026-06-02', 'teaspoon')],
          evaluations: [evaluation({ date: '2026-06-02', outcome: 'mild-reaction' })],
          today: '2026-06-03',
        });
        expect(explainLadderMove(input).replay).toEqual(explainLadderMove(input).replay);
      });
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
