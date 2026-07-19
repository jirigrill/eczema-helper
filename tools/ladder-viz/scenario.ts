// PROTOTYPE — throwaway. One hard-coded scenario for ticket #522
// (prototype the viz library + click-to-drill interaction).
//
// Shape follows the resolved models from #519 (day-spine journey, situation
// nodes 1:1 with LadderDecision kinds, nested events, settled->resting back
// -edge) and #520 (6-step cascade drill-in, derived-state snapshot, raw
// verdict dump). No explain/trace seam exists yet (#521 unresolved), so the
// cascade data below is hand-authored to the shape that seam will emit —
// this is standing in for it, not reconstructing engine behaviour for real.
import type { LadderDecision } from '$lib/domain/ladder';

export type EventKind = 'anchor' | 'eval' | 'observation';

export interface DayEvent {
  kind: EventKind;
  label: string;
}

export type StepStatus = 'not-reached' | 'fired' | 'passed-confirmed' | 'passed-no-data';

export interface CascadeStep {
  label: string;
  status: StepStatus;
  detail: string;
}

export interface DerivedStateSnapshot {
  liveRung: string | null;
  pendingReaction: string | null;
  ceilingRung: string | null;
  mode: 'probe' | 'confirm';
  dwell: string;
}

export interface DayNode {
  /** ISO date range this collapsed box spans — a single day repeats when identical boxes collapse. */
  dateRange: [string, string];
  /** The situation this day resolved to — mirrors a LadderDecision kind/reason 1:1, or the synthetic entry. */
  situation: string;
  verdict: LadderDecision;
  events: DayEvent[];
  snapshot: DerivedStateSnapshot;
  cascade: CascadeStep[];
}

const PRECEDENCE_LABELS = [
  'permanent / empty ladder',
  'ceiling',
  'rest / step-back',
  'skin-worsening',
  'cadence',
  'advance / passed / settled',
] as const;

function cascade(firedIndex: number, overrides: Partial<Record<number, CascadeStep>> = {}): CascadeStep[] {
  return PRECEDENCE_LABELS.map((label, i) => {
    if (overrides[i]) return overrides[i]!;
    if (i < firedIndex) return { label, status: 'not-reached', detail: 'earlier step already returned' };
    if (i > firedIndex) return { label, status: 'not-reached', detail: 'never evaluated — earlier step fired' };
    return { label, status: 'fired', detail: 'this step returned the verdict' };
  });
}

// day-spine scenario: one allergen (peanut), rungs 1..3, 14 days.
// Days 3-4 and 10-11 are consecutive identical boxes, pre-collapsed here —
// the real replay collapses them; this prototype hard-codes the result.
export const SCENARIO: DayNode[] = [
  {
    dateRange: ['2026-06-01', '2026-06-01'],
    situation: 'not-started',
    verdict: { kind: 'advance', from: null, to: 1 },
    events: [],
    snapshot: { liveRung: null, pendingReaction: 'none', ceilingRung: 'none', mode: 'probe', dwell: '0/3' },
    cascade: cascade(5, { 5: { label: PRECEDENCE_LABELS[5], status: 'fired', detail: 'no rungs attempted yet — advance to rung 1' } }),
  },
  {
    dateRange: ['2026-06-02', '2026-06-02'],
    situation: 'climbing',
    verdict: { kind: 'advance', from: 1, to: 2 },
    events: [{ kind: 'anchor', label: 'dose logged — rung 1, full portion' }],
    snapshot: { liveRung: '1', pendingReaction: 'none', ceilingRung: 'none', mode: 'probe', dwell: '0/3' },
    cascade: cascade(5),
  },
  {
    dateRange: ['2026-06-03', '2026-06-04'],
    situation: 'holding-cadence',
    verdict: { kind: 'hold', rung: 2, reason: 'cadence', daysRemaining: 1 },
    events: [{ kind: 'anchor', label: 'dose logged — rung 2, full portion' }],
    snapshot: { liveRung: '2', pendingReaction: 'none', ceilingRung: 'none', mode: 'probe', dwell: '0/3' },
    cascade: cascade(4, {
      4: { label: PRECEDENCE_LABELS[4], status: 'fired', detail: '1 of 2 days elapsed (probe mode)' },
    }),
  },
  {
    dateRange: ['2026-06-05', '2026-06-05'],
    situation: 'holding-skin',
    verdict: {
      kind: 'hold',
      rung: 2,
      reason: 'skin-worsening',
      baselineSeverity: 1,
      currentSeverity: 2,
    },
    events: [{ kind: 'observation', label: 'skin check — severity 2 (up from 1)' }],
    snapshot: { liveRung: '2', pendingReaction: 'none', ceilingRung: 'none', mode: 'probe', dwell: '0/3' },
    cascade: cascade(3, {
      3: { label: PRECEDENCE_LABELS[3], status: 'fired', detail: 'baseline 1 -> current 2 across 4-day window' },
      4: { label: PRECEDENCE_LABELS[4], status: 'not-reached', detail: 'never evaluated — earlier step fired' },
    }),
  },
  {
    dateRange: ['2026-06-06', '2026-06-07'],
    situation: 'resting',
    verdict: { kind: 'rest', rung: 2, days: 3, until: '2026-06-08' },
    events: [{ kind: 'eval', label: 'reaction logged — mild, rung 2' }],
    snapshot: { liveRung: '2', pendingReaction: 'mild @ rung 2 until 2026-06-08', ceilingRung: 'none', mode: 'confirm', dwell: '0/3' },
    cascade: cascade(2, {
      2: { label: PRECEDENCE_LABELS[2], status: 'fired', detail: 'rest window open until 2026-06-08' },
    }),
  },
  {
    dateRange: ['2026-06-08', '2026-06-08'],
    situation: 'stepped-back',
    verdict: { kind: 'step-back', from: 2, to: 1 },
    events: [],
    snapshot: { liveRung: '2', pendingReaction: 'mild @ rung 2, window closed', ceilingRung: 'none', mode: 'confirm', dwell: '0/3' },
    cascade: cascade(2, {
      2: { label: PRECEDENCE_LABELS[2], status: 'fired', detail: 'rest window closed — step back to rung 1 to re-test' },
    }),
  },
  {
    dateRange: ['2026-06-09', '2026-06-09'],
    situation: 'climbing',
    verdict: { kind: 'advance', from: 1, to: 2 },
    events: [{ kind: 'anchor', label: 'dose logged — rung 1, re-test, no reaction' }],
    snapshot: { liveRung: '1', pendingReaction: 'none', ceilingRung: 'none', mode: 'confirm', dwell: '0/3' },
    cascade: cascade(5),
  },
  {
    dateRange: ['2026-06-10', '2026-06-11'],
    situation: 'dwelling',
    verdict: { kind: 'passed', rung: 3 },
    events: [{ kind: 'anchor', label: 'dose logged — rung 3 (top), full portion' }],
    snapshot: { liveRung: '3', pendingReaction: 'none', ceilingRung: 'none', mode: 'confirm', dwell: '2/3' },
    cascade: cascade(5, {
      5: { label: PRECEDENCE_LABELS[5], status: 'passed-confirmed', detail: 'at top rung, dwell 2/3 — not yet complete' },
    }),
  },
  {
    dateRange: ['2026-06-12', '2026-06-12'],
    situation: 'settled',
    verdict: { kind: 'settled', rung: 3 },
    events: [{ kind: 'anchor', label: 'dose logged — rung 3, dwell complete' }],
    snapshot: { liveRung: '3', pendingReaction: 'none', ceilingRung: 'none', mode: 'confirm', dwell: '3/3' },
    cascade: cascade(5, {
      5: { label: PRECEDENCE_LABELS[5], status: 'passed-confirmed', detail: 'dwell 3/3 complete, latency elapsed — settled' },
    }),
  },
  {
    dateRange: ['2026-06-16', '2026-06-16'],
    situation: 'resting',
    verdict: { kind: 'rest', rung: 3, days: 3, until: '2026-06-19' },
    events: [{ kind: 'eval', label: 'late reaction logged — mild, rung 3 (4 days after settling)' }],
    snapshot: { liveRung: '3', pendingReaction: 'mild @ rung 3 until 2026-06-19', ceilingRung: 'none', mode: 'confirm', dwell: '0/3 (reset)' },
    cascade: cascade(2, {
      2: { label: PRECEDENCE_LABELS[2], status: 'fired', detail: 'settled run re-opened — rest window until 2026-06-19 (ladder.ts:230)' },
    }),
  },
];

// The one back-edge the model requires: settled -> resting. Everything else
// is sequential day-to-day. Index pairs into SCENARIO.
export const BACK_EDGES: Array<[from: number, to: number]> = [[8, 9]];
