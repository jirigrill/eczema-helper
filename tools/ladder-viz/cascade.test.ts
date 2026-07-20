import { describe, expect, it } from 'vitest';

import { explainLadderMove } from '$lib/domain/ladder';

import { buildCascade } from './cascade';
import { ALLERGEN_ID, CADENCE_DAYS, LADDER, STABILITY_WINDOW_DAYS, STAGE, dose, skin } from './scenario';

/** A day-one climb: first dose logged, nothing else — the engine advances. */
function firstClimbExplain() {
  return explainLadderMove({
    allergenId: ALLERGEN_ID,
    meals: [dose('2026-06-01', LADDER.stages.breastfed![0]!)],
    evaluations: [],
    observations: [],
    defaultLadder: LADDER,
    stage: STAGE,
    today: '2026-06-01',
    cadenceDays: CADENCE_DAYS,
    stabilityWindowDays: STABILITY_WINDOW_DAYS,
  });
}

describe('buildCascade — snapshot projection', () => {
  it('renders all five snapshot fields in order, none omitted', () => {
    const view = buildCascade(firstClimbExplain());
    expect(view.snapshot.map((r) => r.field)).toEqual([
      'liveRung',
      'pendingReaction',
      'ceilingRung',
      'mode',
      'dwell',
    ]);
  });

  it('carries each field’s raw value, keeping explicit nulls (never omitted)', () => {
    const explain = firstClimbExplain();
    const view = buildCascade(explain);
    const byField = Object.fromEntries(view.snapshot.map((r) => [r.field, r.value]));
    // On a day-one climb the reaction and ceiling facts are genuinely null —
    // they must appear as rows carrying `null`, not be dropped.
    expect(byField.pendingReaction).toBeNull();
    expect(byField.ceilingRung).toBeNull();
    // The populated facts carry the engine's actual values verbatim.
    expect(byField.liveRung).toEqual(explain.snapshot.liveRung);
    expect(byField.mode).toBe(explain.snapshot.mode);
    expect(byField.dwell).toEqual(explain.snapshot.dwell);
  });
});

describe('buildCascade — the six precedence steps', () => {
  it('renders all six steps in precedence order, always', () => {
    const view = buildCascade(firstClimbExplain());
    expect(view.steps.map((s) => s.name)).toEqual([
      'permanent-or-empty',
      'ceiling',
      'reaction',
      'skin-worsening',
      'cadence',
      'advance-or-dwell',
    ]);
  });

  it('carries each step’s status straight from the seam and marks the one fired step', () => {
    const explain = firstClimbExplain();
    const view = buildCascade(explain);
    // Status is a pure passthrough of the seam — the UI re-derives nothing.
    expect(view.steps.map((s) => s.status)).toEqual(explain.steps.map((s) => s.status));
    // Exactly one step fires, and `fired` flags precisely that step.
    const firedName = explain.steps.find((s) => s.status === 'fired')?.name;
    const fired = view.steps.filter((s) => s.fired);
    expect(fired).toHaveLength(1);
    expect(fired[0]?.name).toBe(firedName);
  });

  it('marks advance-or-dwell as the fired step on a clean climb day', () => {
    // r1 dosed 06-01, r2 dosed 06-02 (probe cadence 1): by 06-03 cadence has
    // elapsed (1 day since the last dose) and skin is calm, so the verdict is
    // produced at advance-or-dwell — an independently worked climb day.
    const explain = explainLadderMove({
      allergenId: ALLERGEN_ID,
      meals: [
        dose('2026-06-01', LADDER.stages.breastfed![0]!),
        dose('2026-06-02', LADDER.stages.breastfed![1]!),
      ],
      evaluations: [],
      observations: [],
      defaultLadder: LADDER,
      stage: STAGE,
      today: '2026-06-03',
      cadenceDays: CADENCE_DAYS,
      stabilityWindowDays: STABILITY_WINDOW_DAYS,
    });
    expect(explain.decision.kind).toBe('advance');
    const view = buildCascade(explain);
    expect(view.steps.find((s) => s.fired)?.name).toBe('advance-or-dwell');
    // All five earlier steps passed; advance-or-dwell fires last. The two
    // gate-backed steps passed with data (a dose exists; skin readings exist).
    expect(view.steps.map((s) => s.status)).toEqual([
      'passed-confirmed',
      'passed-confirmed',
      'passed-confirmed',
      'passed-no-data',
      'passed-confirmed',
      'fired',
    ]);
  });
});

describe('buildCascade — gate-backed steps carry gate signals + effective threshold', () => {
  it('pairs the skin-stability gate’s signals to its effective window on a skin-worsening hold', () => {
    // skin 1 on 06-03, skin 2 on 06-04 → worsened across the window; on 06-04
    // the engine holds at skin-worsening. The cascade shows the gate's own
    // baseline/current severities paired to the window it compared across.
    const explain = explainLadderMove({
      allergenId: ALLERGEN_ID,
      meals: [
        dose('2026-06-01', LADDER.stages.breastfed![0]!),
        dose('2026-06-02', LADDER.stages.breastfed![1]!),
      ],
      evaluations: [],
      observations: [skin('2026-06-03', 1), skin('2026-06-04', 2)],
      defaultLadder: LADDER,
      stage: STAGE,
      today: '2026-06-04',
      cadenceDays: CADENCE_DAYS,
      stabilityWindowDays: STABILITY_WINDOW_DAYS,
    });
    expect(explain.decision.kind).toBe('hold');
    const view = buildCascade(explain);
    const skinStep = view.steps.find((s) => s.name === 'skin-worsening');
    expect(skinStep?.fired).toBe(true);
    expect(skinStep?.gate).toEqual({
      threshold: STABILITY_WINDOW_DAYS,
      signals: [
        { label: 'allowed', value: false },
        { label: 'baselineSeverity', value: 1 },
        { label: 'currentSeverity', value: 2 },
      ],
    });
  });

  it('pairs the cadence gate’s signals to its effective spacing on a cadence hold', () => {
    // r1 dosed today: 0 days since last dose < cadence 1 → cadence hold. The
    // cascade shows daysSinceLastDose paired to the effective cadence spacing.
    const explain = explainLadderMove({
      allergenId: ALLERGEN_ID,
      meals: [dose('2026-06-01', LADDER.stages.breastfed![0]!)],
      evaluations: [],
      observations: [],
      defaultLadder: LADDER,
      stage: STAGE,
      today: '2026-06-01',
      cadenceDays: CADENCE_DAYS,
      stabilityWindowDays: STABILITY_WINDOW_DAYS,
    });
    expect(explain.decision.kind).toBe('hold');
    const view = buildCascade(explain);
    const cadenceStep = view.steps.find((s) => s.name === 'cadence');
    expect(cadenceStep?.fired).toBe(true);
    expect(cadenceStep?.gate).toEqual({
      threshold: CADENCE_DAYS,
      signals: [
        { label: 'allowed', value: false },
        { label: 'daysSinceLastDose', value: 0 },
      ],
    });
  });

  it('leaves structural steps without a gate payload', () => {
    const view = buildCascade(firstClimbExplain());
    const structural = view.steps.filter(
      (s) => s.name !== 'skin-worsening' && s.name !== 'cadence',
    );
    expect(structural.every((s) => s.gate === undefined)).toBe(true);
  });
});

describe('buildCascade — verdict as a raw field dump at the fired step', () => {
  it('dumps the fired LadderDecision variant’s own fields, verdict only at the fired step', () => {
    // r1 dosed today → cadence hold: verdict { kind:'hold', rung, reason:'cadence', daysRemaining }.
    const explain = explainLadderMove({
      allergenId: ALLERGEN_ID,
      meals: [dose('2026-06-01', LADDER.stages.breastfed![0]!)],
      evaluations: [],
      observations: [],
      defaultLadder: LADDER,
      stage: STAGE,
      today: '2026-06-01',
      cadenceDays: CADENCE_DAYS,
      stabilityWindowDays: STABILITY_WINDOW_DAYS,
    });
    const view = buildCascade(explain);
    // The verdict rides the fired step only — never synthesized, never elsewhere.
    const fired = view.steps.find((s) => s.fired);
    expect(fired?.name).toBe('cadence');
    expect(view.steps.filter((s) => s.verdict !== undefined)).toHaveLength(1);
    // The discriminant is lifted out too, and rides the fired step only.
    expect(fired?.verdictKind).toBe(explain.decision.kind);
    expect(view.steps.filter((s) => s.verdictKind !== undefined)).toHaveLength(1);
    // A raw field dump: one entry per field of the decision object, values verbatim.
    const dump = Object.fromEntries((fired!.verdict ?? []).map((f) => [f.field, f.value]));
    expect(dump).toEqual({ ...explain.decision });
  });

  it('dumps every field of the skin-worsening verdict verbatim', () => {
    const explain = explainLadderMove({
      allergenId: ALLERGEN_ID,
      meals: [
        dose('2026-06-01', LADDER.stages.breastfed![0]!),
        dose('2026-06-02', LADDER.stages.breastfed![1]!),
      ],
      evaluations: [],
      observations: [skin('2026-06-03', 1), skin('2026-06-04', 2)],
      defaultLadder: LADDER,
      stage: STAGE,
      today: '2026-06-04',
      cadenceDays: CADENCE_DAYS,
      stabilityWindowDays: STABILITY_WINDOW_DAYS,
    });
    const view = buildCascade(explain);
    const fired = view.steps.find((s) => s.fired);
    const dump = Object.fromEntries((fired?.verdict ?? []).map((f) => [f.field, f.value]));
    expect(dump).toEqual({ ...explain.decision });
    // Nested object fields (the rung) survive as the raw value, not flattened prose.
    expect(dump.reason).toBe('skin-worsening');
    expect(dump.rung).toEqual(explain.snapshot.liveRung);
  });
});
