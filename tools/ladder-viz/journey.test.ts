import { describe, expect, it } from 'vitest';

import type { LadderDecision } from '$lib/domain/ladder';
import { explainLadderMove } from '$lib/domain/ladder';

import { journeyNodeKind, replayDays, resolveDay } from './journey';
import { RUN_INPUT } from './scenario';

describe('journeyNodeKind — LadderDecision → journey situation', () => {
  it('maps advance to climbing', () => {
    const decision: LadderDecision = {
      kind: 'advance',
      from: null,
      to: { id: 'r1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'špetka' },
    };
    expect(journeyNodeKind(decision)).toBe('climbing');
  });

  it('splits hold by reason and maps the remaining arms', () => {
    const rung = { id: 'r2', anchor: 'teaspoon' as const, isEvaluationCheckpoint: false, dose: '¼' };
    expect(journeyNodeKind({ kind: 'hold', rung, reason: 'cadence', daysRemaining: 2 })).toBe(
      'holding-cadence',
    );
    expect(
      journeyNodeKind({
        kind: 'hold',
        rung,
        reason: 'skin-worsening',
        baselineSeverity: 1,
        currentSeverity: 2,
      }),
    ).toBe('holding-skin');
    expect(journeyNodeKind({ kind: 'rest', rung, days: 7, until: '2026-06-10' })).toBe('resting');
    expect(journeyNodeKind({ kind: 'step-back', from: rung, to: rung })).toBe('stepped-back');
    expect(journeyNodeKind({ kind: 'passed', rung })).toBe('dwelling');
    expect(journeyNodeKind({ kind: 'settled', rung })).toBe('settled');
    expect(journeyNodeKind({ kind: 'blocked' })).toBe('blocked');
    expect(journeyNodeKind({ kind: 'ceiling-reached', rung, reason: 'floor-exhaustion' })).toBe(
      'ceiling-floor-exhaustion',
    );
    expect(journeyNodeKind({ kind: 'ceiling-reached', rung, reason: 'severe' })).toBe(
      'ceiling-severe',
    );
  });
});

describe('replayDays — one resolved day per calendar day', () => {
  it('resolves exactly one day per calendar day, in order', () => {
    const days = replayDays(RUN_INPUT);
    expect(days).toHaveLength(RUN_INPUT.days.length);
    expect(days.map((d) => d.date)).toEqual([...RUN_INPUT.days]);
  });

  it('each day is the real explainLadderMove over the history clipped to that day', () => {
    for (const { date, explain } of replayDays(RUN_INPUT)) {
      const expected = explainLadderMove({
        allergenId: RUN_INPUT.allergenId,
        meals: RUN_INPUT.events.meals.filter((m) => m.date <= date),
        evaluations: RUN_INPUT.events.evaluations.filter((e) => e.date <= date),
        observations: RUN_INPUT.events.observations.filter((o) => o.date <= date),
        defaultLadder: RUN_INPUT.defaultLadder,
        stage: RUN_INPUT.stage,
        today: date,
        cadenceDays: RUN_INPUT.cadenceDays,
        stabilityWindowDays: RUN_INPUT.stabilityWindowDays,
        isPermanentlyEliminated: RUN_INPUT.isPermanentlyEliminated,
      });
      expect(explain.decision).toEqual(expected.decision);
    }
  });

  it('every day carries the fixed 6-step trace with exactly one fired step', () => {
    for (const { explain } of replayDays(RUN_INPUT)) {
      expect(explain.steps).toHaveLength(6);
      expect(explain.steps.filter((s) => s.status === 'fired')).toHaveLength(1);
    }
  });
});

describe('resolveDay — a single day of a run', () => {
  it('matches the same day from a full replay', () => {
    const date = RUN_INPUT.days[3]!;
    expect(resolveDay(RUN_INPUT, date)?.explain).toEqual(
      replayDays(RUN_INPUT).find((d) => d.date === date)?.explain,
    );
  });

  it('returns null for a date outside the calendar', () => {
    expect(resolveDay(RUN_INPUT, '1999-01-01')).toBeNull();
  });
});
