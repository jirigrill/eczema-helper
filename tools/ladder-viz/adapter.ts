// PROTOTYPE — throwaway (ticket #522). THE READ-ONLY BOUNDARY.
//
// This is the ONLY file in the tool that touches the engine. Every Svelte
// component imports the `LadderExplain` shape (seam.ts) + pure data
// (scenario.ts) — none of them import `$lib/domain` decision logic. So the
// visualizer is engine-independent by construction: the engine can add or
// change a gate and only this file could ever need a touch.
//
// `buildExplain` RECONSTRUCTS the #521 `explainLadderMove` output — the fixed
// 6-step precedence trace + the derived-state snapshot — because that seam is
// designed (#521, closed) but not yet implemented. It does so read-only: it
// CALLS the real `decideLadderMove` + the real public gates and renders what
// they return; it never re-implements a gate. The only genuinely reconstructed
// bits are the ones the engine keeps private today — the precedence order
// (which step fired), `mode`, `pendingReaction`, `dwell` — each flagged below.
//
// WHEN #521'S F BUILD LANDS, this whole reconstruction collapses to:
//     import { explainLadderMove } from '$lib/domain/ladder';
//     export const buildExplain = explainLadderMove;
// and the mirrored types in seam.ts are deleted in favour of the engine's.
import {
  cadenceGate,
  currentRung,
  decideLadderMove,
  nextLegalStep,
  skinStabilityGate,
  type LadderDecision,
  type LadderDecisionInput,
  type LadderStep,
} from '$lib/domain/ladder';
import type { AllergenOutcome, RegionLevel } from '$lib/domain/models';
import {
  REINTRODUCTION_CADENCE_DAYS,
  REST_PHASE_DAYS_CLEAR,
  REST_PHASE_DAYS_MILD,
  effectiveCadenceDays,
  stabilityWindowFor,
  type LadderMode,
} from '$lib/domain/policy';
import {
  ALLERGEN_ID,
  LADDER,
  SEV_LABEL,
  STAGE,
  STEPS,
  SCENARIO,
  addISO,
  type ScenarioEvents,
} from './scenario';
import {
  STEP_ORDER,
  type Dwell,
  type LadderExplain,
  type LadderPrecedenceStepName,
  type LadderPrecedenceStepStatus,
  type LadderPrecedenceSteps,
  type LadderStateSnapshot,
  type PendingReaction,
} from './seam';

// ── Reconstruction (the parts the engine keeps private today) ────────────────

/** RECONSTRUCTED: probe/confirm mode (deriveLadderState is private, #521 exposes it). */
function deriveMode(liveRung: LadderStep | null, evals: { outcome: string }[]): LadderMode {
  const reactionSeen = evals.some((e) => e.outcome !== 'tolerated');
  const atTop = liveRung?.id === STEPS[STEPS.length - 1]!.id;
  return reactionSeen || atTop ? 'confirm' : 'probe';
}

/** RECONSTRUCTED: which of the 6 steps fired — mapped from the verdict kind. */
function firedName(v: LadderDecision): LadderPrecedenceStepName {
  switch (v.kind) {
    case 'blocked':
      return 'permanent-or-empty';
    case 'ceiling-reached':
      return 'ceiling';
    case 'rest':
    case 'step-back':
      return 'reaction';
    case 'hold':
      return v.reason === 'skin-worsening' ? 'skin-worsening' : 'cadence';
    default:
      return 'advance-or-dwell';
  }
}

/** RECONSTRUCTED: the pending reaction, inverted from the public decision. */
function reconstructPending(v: LadderDecision): PendingReaction | null {
  if (v.kind === 'rest') {
    // days → outcome and (until − days) → date are cleanly invertible.
    const outcome: AllergenOutcome =
      v.days === REST_PHASE_DAYS_MILD ? 'mild-reaction' : v.days === REST_PHASE_DAYS_CLEAR ? 'clear-reaction' : 'severe-reaction';
    const idx = STEPS.findIndex((s) => s.id === v.rung.id);
    return { rung: v.rung, outcome, date: addISO(v.until, -v.days), until: v.until, stepBackTo: STEPS[Math.max(0, idx - 1)]! };
  }
  if (v.kind === 'step-back') {
    // rest already elapsed; outcome/date are NOT recoverable from the public
    // decision (a #521 gap). Placeholders keep the mirrored type total — never
    // displayed.
    return { rung: v.from, outcome: 'mild-reaction', date: '', until: '', stepBackTo: v.to };
  }
  return null;
}

/** RECONSTRUCTED: top-rung dwell, re-counted from meals (private replay in the engine). */
function reconstructDwell(meals: { date: string; items: { amount: string; foodId: string }[] }[]): Dwell {
  const topAnchor = STEPS[STEPS.length - 1]!.anchor;
  const top = meals.filter((m) => m.items.some((i) => i.amount === topAnchor && i.foodId.endsWith(ALLERGEN_ID)));
  return { count: top.length, lastDoseDate: top.map((m) => m.date).sort().at(-1) ?? null };
}

/**
 * Reconstruct the #521 `LadderExplain` for one day. Read-only: the verdict and
 * the two gate results come straight from the engine; only the private bits are
 * reconstructed (each flagged above). Becomes `explainLadderMove(input)` verbatim
 * once #521's F build ships.
 */
export function buildExplain(input: LadderDecisionInput): LadderExplain {
  const decision = decideLadderMove(input); // REAL engine verdict

  // Real public reads.
  const liveRung = currentRung(input.allergenId, input.meals, input.defaultLadder, input.stage, input.override, input.evaluations);
  const mode = deriveMode(liveRung, [...input.evaluations]);
  const effCadence = effectiveCadenceDays(mode, input.cadenceDays);
  const gateCadence = cadenceGate(input.allergenId, input.meals, input.today, effCadence);
  const gateSkin = skinStabilityGate(input.observations, input.today, input.stabilityWindowDays);

  const fired = firedName(decision);
  const firedIdx = STEP_ORDER.indexOf(fired);
  const statusAt = (i: number, name: LadderPrecedenceStepName): LadderPrecedenceStepStatus => {
    if (i === firedIdx) return 'fired';
    if (i > firedIdx) return 'not-reached';
    // Passed: gate-backed steps report `passed-no-data` when permissive by
    // absence, `passed-confirmed` otherwise (#521 status rule).
    if (name === 'skin-worsening') return input.observations.length === 0 ? 'passed-no-data' : 'passed-confirmed';
    if (name === 'cadence') return gateCadence.daysSinceLastDose === null ? 'passed-no-data' : 'passed-confirmed';
    return 'passed-confirmed';
  };

  const steps: LadderPrecedenceSteps = [
    { name: 'permanent-or-empty', status: statusAt(0, 'permanent-or-empty'), detail: { step: 'permanent-or-empty' } },
    { name: 'ceiling', status: statusAt(1, 'ceiling'), detail: { step: 'ceiling' } },
    { name: 'reaction', status: statusAt(2, 'reaction'), detail: { step: 'reaction' } },
    { name: 'skin-worsening', status: statusAt(3, 'skin-worsening'), detail: { step: 'skin-worsening', gate: gateSkin, windowDays: input.stabilityWindowDays } },
    { name: 'cadence', status: statusAt(4, 'cadence'), detail: { step: 'cadence', gate: gateCadence, cadenceDays: effCadence } },
    { name: 'advance-or-dwell', status: statusAt(5, 'advance-or-dwell'), detail: { step: 'advance-or-dwell' } },
  ];

  const snapshot: LadderStateSnapshot = {
    liveRung,
    pendingReaction: reconstructPending(decision),
    ceilingRung: decision.kind === 'ceiling-reached' ? decision.rung : null,
    mode,
    dwell: reconstructDwell(input.meals),
  };

  return { decision, snapshot, steps };
}

// ── Presentation view-model (cosmetic; no decision logic) ─────────────────────

export interface RungView {
  id: string;
  dose: string;
  checkpoint: boolean;
  state: 'passed' | 'current' | 'ahead';
}

export interface DayView {
  date: string;
  explain: LadderExplain;
  verdictLabel: string;
  verdictTone: 'go' | 'hold' | 'stop';
  verdictJson: string;
  firedName: LadderPrecedenceStepName;
  rungs: RungView[];
  liveRungLabel: string;
  inputs: {
    meals: { time: string; text: string; dose: string }[];
    skin: { level: RegionLevel; text: string }[];
    evals: { outcome: AllergenOutcome }[];
  };
}

// Cosmetic mapping of the decision union → a header pill. Presentation only —
// the seam synthesizes no prose (#521), so labelling lives here in the tool.
function verdictLabel(v: LadderDecision): string {
  switch (v.kind) {
    case 'advance':
      return `advance → ${v.to.dose}`;
    case 'hold':
      return v.reason === 'cadence' ? `hold — wait ${v.daysRemaining}d (cadence)` : `hold — skin worsening`;
    case 'rest':
      return `rest until ${v.until}`;
    case 'step-back':
      return `step back → ${v.to.dose}`;
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
    case 'step-back':
    case 'adapting-decelerate':
    case 'suspected-reaction':
      return 'hold';
    case 'blocked':
    case 'ceiling-reached':
      return 'stop';
  }
}

export function computeDay(today: string, events: ScenarioEvents = SCENARIO): DayView {
  const meals = events.meals.filter((m) => m.date <= today);
  const observations = events.observations.filter((o) => o.date <= today);
  const evaluations = events.evaluations.filter((e) => e.date <= today);

  const input: LadderDecisionInput = {
    allergenId: ALLERGEN_ID,
    meals,
    evaluations,
    observations,
    defaultLadder: LADDER,
    stage: STAGE,
    today,
    cadenceDays: REINTRODUCTION_CADENCE_DAYS,
    stabilityWindowDays: stabilityWindowFor('reintroduction'),
  };

  const explain = buildExplain(input);
  const decision = explain.decision;
  const liveRung = explain.snapshot.liveRung;

  const rungs: RungView[] = STEPS.map((s, i) => {
    const liveIdx = liveRung ? STEPS.findIndex((x) => x.id === liveRung.id) : -1;
    const state: RungView['state'] = liveIdx === i ? 'current' : i < liveIdx ? 'passed' : 'ahead';
    return { id: s.id, dose: s.dose, checkpoint: s.isEvaluationCheckpoint, state };
  });

  const dayMeals = events.meals.filter((m) => m.date === today);
  const dayObs = events.observations.filter((o) => o.date === today);
  const dayEvals = events.evaluations.filter((e) => e.date === today);

  return {
    date: today,
    explain,
    verdictLabel: verdictLabel(decision),
    verdictTone: verdictTone(decision),
    verdictJson: JSON.stringify(decision, null, 2),
    firedName: explain.steps.find((s) => s.status === 'fired')?.name ?? 'advance-or-dwell',
    rungs,
    liveRungLabel: liveRung ? liveRung.dose : 'not started',
    inputs: {
      meals: dayMeals.map((m) => {
        const rung = STEPS.find((s) => s.anchor === m.items[0]!.amount);
        return { time: m.createdAt.slice(11, 16), text: m.items[0]!.name, dose: rung?.dose ?? String(m.items[0]!.amount) };
      }),
      skin: dayObs.map((o) => {
        const lvl = (o.regions[0]?.level ?? 0) as RegionLevel;
        return { level: lvl, text: SEV_LABEL[lvl]! };
      }),
      evals: dayEvals.map((e) => ({ outcome: e.outcome as AllergenOutcome })),
    },
  };
}
