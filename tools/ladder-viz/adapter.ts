// The presentation view-model of the single-day inspector: it projects one day's
// real `explainLadderMove` output (`LadderExplain`, from `$lib/domain/ladder`)
// plus the run's own ladder and raw inputs into the cosmetic shape the Svelte
// components render. NO decision logic lives here — the verdict and its trace
// come straight from the engine seam; this only labels and lays them out. Since
// #521's F build landed, `explainLadderMove` is a real export and nothing is
// reconstructed (the prototype's old `seam.ts`/`buildExplain` are gone).
import type {
  LadderDecision,
  LadderReplay,
  LadderReplayBranch,
  LadderReplayFrame,
  LadderReplayStep,
  LadderStateSnapshot,
} from '$lib/domain/ladder';
import type { AllergenOutcome, RegionLevel } from '$lib/domain/models';

import type { DayResolution, JourneyRun } from './journey';
import { resolveDay } from './journey';

// ── Presentation labels (cosmetic, not logic) ────────────────────────────────

export const OUTCOME_LABEL: Record<AllergenOutcome, string> = {
  tolerated: 'tolerated',
  'mild-reaction': 'mild reaction',
  'clear-reaction': 'clear reaction',
  'severe-reaction': 'severe reaction',
};

export const SEV_LABEL = ['klidné', 'mírné', 'střední', 'silné'];

// Display prose for each `LadderReplayBranch`. The DOMAIN decides the branch
// (emitted on the replay trace); this map only NAMES it — no classification
// logic here. When `deriveLadderState` gains a branch, add its label here (see
// the maintenance contract on `LadderReplayStep`).
export const REPLAY_BRANCH_LABEL: Record<LadderReplayBranch, string> = {
  climb: 'dose matched next rung → climbed',
  dwell: 're-dose at effective top → dwell +1',
  'anchor-noop': "dose didn't match next rung → ignored",
  'tolerated-clear': 'tolerated → cleared rest window',
  'reaction-walkdown': 'reaction → walked down one rung, capped it forever',
  'reaction-ceiling': 'reaction on floor → ceiling (terminal)',
  'reaction-noop': 'reaction before any dose → nothing to bind',
};

// Shared formatters for `LadderStateSnapshot` fields — used by the snapshot bar
// and by the engine pipeline's structural-step detail, so the two can never
// disagree on how a null rung or an empty dwell reads.
export function fmtRung(r: { dose: string } | null): string {
  return r ? r.dose : 'null';
}
export function fmtPendingRest(p: LadderStateSnapshot['pendingRest']): string {
  return p ? `${p.rung.dose} · until ${p.until || '—'}` : 'null';
}
export function fmtDwell(d: LadderStateSnapshot['dwell']): string {
  return `${d.count}× · ${d.lastDoseDate ?? '—'}`;
}
export function fmtBool(b: boolean): string {
  return b ? 'yes' : 'no';
}

// One replayed event as a short label — the ledger's "event" column.
export function fmtReplayEvent(
  e: LadderReplayStep['event'],
  rungForAmount: (a: string) => string,
): string {
  return e.kind === 'anchor'
    ? `▲ dose ${rungForAmount(e.amount)} · ${e.date}`
    : `● ${OUTCOME_LABEL[e.outcome]} · ${e.date}`;
}

// The replay-frame fields as label/value rows, in a fixed order so every ledger
// row lines up column-for-column. Reuses the snapshot formatters, so the ledger's
// last row reads identically to the SnapshotBar's evolving fields by construction.
export function replayFrameCells(f: LadderReplayFrame): { k: string; v: string }[] {
  return [
    { k: 'liveRung', v: fmtRung(f.liveRung) },
    { k: 'pendingRest', v: fmtPendingRest(f.pendingRest) },
    { k: 'ceilingRung', v: fmtRung(f.ceilingRung) },
    { k: 'dwell', v: fmtDwell(f.dwell) },
  ];
}

// Which frame fields changed across an event — pure diff of the domain's own
// before/after frames (comparison for highlighting, never computation). Keyed by
// the same `k` labels as `replayFrameCells`.
export function changedFrameKeys(before: LadderReplayFrame, after: LadderReplayFrame): Set<string> {
  const b = new Map(replayFrameCells(before).map((c) => [c.k, c.v]));
  return new Set(
    replayFrameCells(after)
      .filter((c) => b.get(c.k) !== c.v)
      .map((c) => c.k),
  );
}

// Back-links: which replay step set the current `ceilingRung` / `pendingRest`.
// Pure find-index over the domain's trace — no logic. `null` when unset.
export function ceilingSetByStep(replay: LadderReplay): number | null {
  const i = replay.steps.findIndex((s) => s.branch === 'reaction-ceiling');
  return i === -1 ? null : i;
}
export function pendingRestSetByStep(replay: LadderReplay): number | null {
  // The last walk-down still standing (a later tolerated-clear would have reset it).
  for (let i = replay.steps.length - 1; i >= 0; i--) {
    const b = replay.steps[i]!.branch;
    if (b === 'reaction-walkdown') return i;
    if (b === 'tolerated-clear') return null;
  }
  return null;
}

// ── View-model ────────────────────────────────────────────────────────────────

export interface RungView {
  id: string;
  dose: string;
  checkpoint: boolean;
  state: 'passed' | 'current' | 'ahead';
}

export interface ReplayRowView {
  /** Index into the domain `replay.steps` (back-link target). */
  index: number;
  event: string;
  branch: LadderReplayBranch;
  branchLabel: string;
  /** Resulting-state cells (the 6 frame fields), with `changed` flagged. */
  cells: { k: string; v: string; changed: boolean }[];
  terminal: boolean;
}

export interface ReplayView {
  /** The initial frame (before any event) as label/value rows. */
  initialCells: { k: string; v: string }[];
  rows: ReplayRowView[];
  /** Back-links: which row set the current ceiling / pending rest (null when unset). */
  ceilingSetBy: number | null;
  pendingRestSetBy: number | null;
}

export interface DayView {
  date: string;
  explain: DayResolution['explain'];
  verdictLabel: string;
  verdictTone: 'go' | 'hold' | 'stop';
  verdictJson: string;
  rungs: RungView[];
  isPermanentlyEliminated: boolean;
  allergenLabel: string;
  replay: ReplayView;
  inputs: {
    meals: { time: string; text: string; dose: string }[];
    skin: { level: RegionLevel; text: string }[];
    evals: { outcome: AllergenOutcome }[];
  };
}

// Cosmetic mapping of the decision union → a header pill. Presentation only — the
// seam synthesizes no prose (#521), so labelling lives here in the tool.
function verdictLabel(v: LadderDecision): string {
  switch (v.kind) {
    case 'advance':
      return `advance → ${v.to.dose}`;
    case 'hold':
      return v.reason === 'cadence'
        ? `hold — wait ${v.daysRemaining}d (cadence)`
        : `hold — skin worsening`;
    case 'rest':
      return `rest until ${v.until}`;
    case 'passed':
      return `passed (confirming top)`;
    case 'settled':
      return `settled ✓`;
    case 'blocked':
      return `blocked (inert)`;
    case 'ceiling-reached':
      return `ceiling (${v.reason})`;
    case 'adapting-decelerate':
      return `adapting — decelerate`;
    case 'suspected-reaction':
      return `suspected reaction`;
  }
}

function verdictTone(v: LadderDecision): 'go' | 'hold' | 'stop' {
  switch (v.kind) {
    case 'advance':
    case 'passed':
    case 'settled':
      return 'go';
    case 'hold':
    case 'rest':
    case 'adapting-decelerate':
    case 'suspected-reaction':
      return 'hold';
    case 'blocked':
    case 'ceiling-reached':
      return 'stop';
  }
}

/**
 * The view-model for one calendar day of a run, or `null` outside its calendar.
 * Reads the run's own ladder for the rungs (never a hard-coded one) and the day's
 * raw events for the logged-inputs panel.
 */
export function computeDay(run: JourneyRun, date: string): DayView | null {
  const resolved = resolveDay(run, date);
  if (!resolved) return null;

  const { explain } = resolved;
  const decision = explain.decision;
  const liveRung = explain.snapshot.liveRung;
  const steps = run.defaultLadder.stages[run.stage] ?? [];

  const liveIdx = liveRung ? steps.findIndex((x) => x.id === liveRung.id) : -1;
  const rungs: RungView[] = steps.map((s, i) => ({
    id: s.id,
    dose: s.dose,
    checkpoint: s.isEvaluationCheckpoint,
    state: liveIdx === i ? 'current' : i < liveIdx ? 'passed' : 'ahead',
  }));

  const dayMeals = run.events.meals.filter((m) => m.date === date);
  const dayObs = run.events.observations.filter((o) => o.date === date);
  const dayEvals = run.events.evaluations.filter((e) => e.date === date);

  // Replay ledger view — pre-formatted from the domain's own `replay` trace.
  const rungForAmount = (amount: string): string =>
    steps.find((s) => s.anchor === amount)?.dose ?? amount;
  const replay: ReplayView = {
    initialCells: replayFrameCells(explain.replay.initial),
    rows: explain.replay.steps.map((step, index) => {
      const changed = changedFrameKeys(step.before, step.after);
      return {
        index,
        event: fmtReplayEvent(step.event, rungForAmount),
        branch: step.branch,
        branchLabel: REPLAY_BRANCH_LABEL[step.branch],
        cells: replayFrameCells(step.after).map((c) => ({ ...c, changed: changed.has(c.k) })),
        terminal: step.branch === 'reaction-ceiling',
      };
    }),
    ceilingSetBy: ceilingSetByStep(explain.replay),
    pendingRestSetBy: pendingRestSetByStep(explain.replay),
  };

  return {
    date,
    explain,
    verdictLabel: verdictLabel(decision),
    verdictTone: verdictTone(decision),
    verdictJson: JSON.stringify(decision, null, 2),
    rungs,
    isPermanentlyEliminated: run.isPermanentlyEliminated ?? false,
    allergenLabel: run.allergenId,
    replay,
    inputs: {
      meals: dayMeals.map((m) => {
        const item = m.items[0]!;
        const rung = steps.find((s) => s.anchor === item.amount);
        return {
          time: m.createdAt.slice(11, 16),
          text: item.name,
          dose: rung?.dose ?? String(item.amount),
        };
      }),
      skin: dayObs.map((o) => {
        const lvl = (o.regions[0]?.level ?? 0) as RegionLevel;
        return { level: lvl, text: SEV_LABEL[lvl]! };
      }),
      // The tool's builders only ever emit an `AllergenOutcome` eval; the model
      // type is wider, so narrow here (the inputs panel labels the allergen set).
      evals: dayEvals.map((e) => ({ outcome: e.outcome as AllergenOutcome })),
    },
  };
}
