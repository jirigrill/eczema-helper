import { describe, expect, it } from 'vitest';

import type { LadderDecision } from '$lib/domain/ladder';

import { journeyNodeKind, replayJourney } from './journey';
import { RUN_INPUT } from './scenario';

describe('journeyNodeKind — LadderDecision → journey node kind', () => {
  it('maps advance to climbing', () => {
    const decision: LadderDecision = {
      kind: 'advance',
      from: null,
      to: { id: 'r1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'špetka' },
    };
    expect(journeyNodeKind(decision)).toBe('climbing');
  });

  it('splits hold by reason: cadence → holding-cadence, skin-worsening → holding-skin', () => {
    const rung = {
      id: 'r2',
      anchor: 'teaspoon' as const,
      isEvaluationCheckpoint: false,
      dose: '¼',
    };
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
  });

  it('maps the remaining live arms and splits ceiling-reached by reason', () => {
    const rung = { id: 'r3', anchor: 'spoon' as const, isEvaluationCheckpoint: false, dose: '½' };
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

  it('maps the future arms the engine does not emit yet', () => {
    const rung = { id: 'r1', anchor: 'pinch' as const, isEvaluationCheckpoint: false, dose: 'x' };
    expect(journeyNodeKind({ kind: 'adapting-decelerate', rung })).toBe('adapting-decelerate');
    expect(journeyNodeKind({ kind: 'suspected-reaction', rung })).toBe('suspected-reaction');
  });
});

describe('replayJourney — day-spine of collapsed situations', () => {
  it('prepends the synthetic not-started entry node before any engine verdict', () => {
    const days = replayJourney(RUN_INPUT);
    expect(days[0]?.kind).toBe('not-started');
  });

  it('collapses consecutive identical boxes into one node per distinct situation', () => {
    const kinds = replayJourney(RUN_INPUT).map((d) => d.kind);
    // Independently derived by replaying explainLadderMove day-by-day over RUN:
    // a probe climb, a skin-worsening hold, the top-rung dwell, settle, then a
    // late reaction re-opens the run (rest → step-back).
    expect(kinds).toEqual([
      'not-started',
      'holding-cadence',
      'climbing',
      'holding-skin',
      'holding-cadence',
      'settled',
      'resting',
      'stepped-back',
    ]);
  });

  it('has no two adjacent boxes of the same kind (collapse invariant)', () => {
    const kinds = replayJourney(RUN_INPUT).map((d) => d.kind);
    for (let i = 1; i < kinds.length; i++) {
      expect(kinds[i]).not.toBe(kinds[i - 1]);
    }
  });

  it('nests the events logged within a box span inside that box', () => {
    const days = replayJourney(RUN_INPUT);
    // The skin-worsening hold spans 06-04..06-05; the reading that triggered it
    // (severity 2 on 06-04) is nested as evidence inside that box.
    const skinBox = days.find((d) => d.kind === 'holding-skin');
    expect(skinBox?.events.map((e) => e.channel)).toContain('observation');
    expect(
      skinBox?.events.some(
        (e) => e.channel === 'observation' && e.observation.date === '2026-06-04',
      ),
    ).toBe(true);
  });

  it('nests a day’s events in channel order (meal, observation, eval)', () => {
    const days = replayJourney(RUN_INPUT);
    // Every nested event's date falls within its box's [fromDate, toDate] span.
    for (const box of days) {
      for (const event of box.events) {
        expect(event.date >= box.fromDate && event.date <= box.toDate).toBe(true);
      }
    }
  });

  it('keeps the honest settled → resting edge for the reversible terminal', () => {
    const days = replayJourney(RUN_INPUT);
    const settledIdx = days.findIndex((d) => d.kind === 'settled');
    expect(settledIdx).toBeGreaterThan(-1);
    // The reversible terminal (#519): a late reaction after settling re-opens
    // the run, so `resting` follows `settled` — the one edge out of settled.
    expect(days[settledIdx + 1]?.kind).toBe('resting');
    // That re-open was driven by the mild-reaction evaluation channel.
    expect(days[settledIdx + 1]?.enteredVia).toBe('eval');
  });

  it('labels a time-triggered transition as the time channel when no event fired', () => {
    const days = replayJourney(RUN_INPUT);
    // `settled` opens once the dwell latency elapses with no event that day —
    // a pure `time` transition, not a meal/observation/eval.
    const settled = days.find((d) => d.kind === 'settled');
    expect(settled?.enteredVia).toBe('time');
  });
});
