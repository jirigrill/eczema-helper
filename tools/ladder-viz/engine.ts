// PROTOTYPE — throwaway (ticket #522). Drives the REAL ladder engine.
//
// Unlike the first prototype (hand-authored verdicts), every verdict + gate
// reading below comes from the actual domain functions in `src/lib/domain`.
// Only the *events* are supplied by the tool — either the canned scenario
// (`SCENARIO`) or events the user logs in manual mode. The logic is real, so
// the visualizer shows what `decideLadderMove` actually does.
//
// The 6-step precedence trace is reconstructed here from the public gates +
// the real verdict (exactly what `scripts/simulate.ts` does today). The #521
// explain/trace seam — not yet built — will make this first-class and let this
// tool drop the reconstruction. Two derived values (`mode`, and therefore the
// effective cadence) are recomputed with the documented rule since
// `deriveLadderState` is private; flagged in the UI.
import type { FeedingStage, Ladder, LadderStep } from '$lib/domain/canonical-allergen';
import {
  cadenceGate,
  currentRung,
  decideLadderMove,
  nextLegalStep,
  skinStabilityGate,
  type LadderDecision,
  type LadderDecisionInput,
} from '$lib/domain/ladder';
import type {
  AllergenOutcome,
  Meal,
  RegionLevel,
  ReintroductionEvaluation,
  SkinObservation,
} from '$lib/domain/models';
import {
  REINTRODUCTION_CADENCE_DAYS,
  effectiveCadenceDays,
  stabilityWindowFor,
  type LadderMode,
} from '$lib/domain/policy';

// ── The ladder: one allergen, one real 4-rung ladder ─────────────────────────

const ALLERGEN_ID = 'peanut';
const STAGE: FeedingStage = 'breastfed';

// A real 4-rung ladder (the engine walks whatever Ladder we hand it — no
// catalog needed). Rung 3 is an evaluation checkpoint, rung 4 the top.
export const LADDER: Ladder = {
  allergenId: ALLERGEN_ID,
  stages: {
    breastfed: [
      { id: 'r1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: 'špetka' },
      { id: 'r2', anchor: 'teaspoon', isEvaluationCheckpoint: false, dose: '¼ lžičky' },
      { id: 'r3', anchor: 'spoon', isEvaluationCheckpoint: true, dose: '½ lžičky' },
      { id: 'r4', anchor: 'portion', isEvaluationCheckpoint: false, dose: 'plná porce' },
    ],
  },
};

export const STEPS = LADDER.stages.breastfed!;

// ── Event builders (shared by the canned scenario + manual mode) ─────────────

// `other:<id>` guarantees a meal registers as a dose for the allergen without
// wiring up the food catalog — `foodTriggers` slices the prefix.
export function dose(date: string, rung: LadderStep, mealType: Meal['mealType'] = 'lunch'): Meal {
  return {
    id: `${date}:${mealType}:${rung.id}`,
    date,
    mealType,
    actor: 'mother',
    items: [
      { id: `${date}-${rung.id}`, name: `arašíd — ${rung.dose}`, foodId: `other:${ALLERGEN_ID}`, amount: rung.anchor },
    ],
    createdAt: `${date}T12:00:00`,
  };
}

export function skin(date: string, level: RegionLevel, region = 'face' as const): SkinObservation {
  return {
    id: `${date}-skin`,
    date,
    createdAt: `${date}T08:00:00`,
    regions: level === 0 ? [] : [{ id: region, level }],
  };
}

export function evaluation(date: string, outcome: AllergenOutcome): ReintroductionEvaluation {
  return { phaseId: 'p1', phaseType: 'allergen-test', outcome, allergenId: ALLERGEN_ID, date };
}

// ── The canned scenario ──────────────────────────────────────────────────────

/** The three event streams the engine replays. Swapped wholesale in manual mode. */
export interface ScenarioEvents {
  meals: Meal[];
  observations: SkinObservation[];
  evaluations: ReintroductionEvaluation[];
}

// An arc that exercises a real spread of the union. Doses are spaced so that
// "advance" days (cadence met, next step legal) fall between dose days, and a
// `tolerated` eval clears the reaction so the run actually re-climbs.
export const SCENARIO: ScenarioEvents = {
  meals: [
    dose('2026-06-01', STEPS[0]!), //  dose r1
    dose('2026-06-03', STEPS[1]!), //  dose r2 (probe cadence 1)
    dose('2026-06-05', STEPS[2]!), //  dose r3 (checkpoint)
    dose('2026-06-11', STEPS[1]!), //  re-test r2 after step-back
    dose('2026-06-15', STEPS[2]!), //  re-climb r3 (confirm cadence 3)
    dose('2026-06-19', STEPS[3]!), //  reach top r4 — then leave a gap so `passed` shows
  ],
  observations: [
    skin('2026-06-02', 1),
    skin('2026-06-03', 1),
    skin('2026-06-05', 2), // worsened 1→2 → skin-worsening hold on 06-05
    skin('2026-06-08', 1),
    skin('2026-06-12', 1),
    skin('2026-06-20', 1),
  ],
  evaluations: [
    evaluation('2026-06-06', 'mild-reaction'), // reaction at r3 → rest, then step-back
    evaluation('2026-06-11', 'tolerated'), // clears the pending reaction → re-climb
    evaluation('2026-06-26', 'mild-reaction'), // late reaction at top → re-opens a confirmed run
  ],
};

export function emptyEvents(): ScenarioEvents {
  return { meals: [], observations: [], evaluations: [] };
}

// Days the scrubber can visit.
export const DAYS: string[] = Array.from({ length: 28 }, (_, i) => addISO('2026-06-01', i));

// ── Per-step trace model ─────────────────────────────────────────────────────

export type StepStatus = 'fired' | 'passed' | 'not-reached';

export interface StepView {
  key: string;
  /** Real code identifier(s) this step evaluates — the node title (mono). */
  fn: string;
  /** One-line description of what the step decides (muted subtitle). */
  note: string;
  status: StepStatus;
  /** Named input readings this step evaluated that day. */
  inputs: { label: string; value: string }[];
  /** What the step emitted / passed through. */
  output: string;
}

export interface SnapshotView {
  liveRung: string;
  mode: LadderMode;
  daysSinceDose: string;
  skinTrend: string;
}

export interface RungView {
  id: string;
  dose: string;
  checkpoint: boolean;
  state: 'passed' | 'current' | 'ahead';
}

export interface DayView {
  date: string;
  verdict: LadderDecision;
  verdictLabel: string;
  verdictTone: 'go' | 'hold' | 'stop';
  firedIndex: number;
  steps: StepView[];
  snapshot: SnapshotView;
  rungs: RungView[];
  inputs: {
    meals: { time: string; text: string; dose: string }[];
    skin: { level: RegionLevel; text: string }[];
    evals: { outcome: AllergenOutcome }[];
  };
}

// Reconstruct probe/confirm mode with the documented rule (deriveLadderState is
// private): confirm once any reaction seen OR the top rung is reached.
function deriveMode(liveRung: LadderStep | null, evals: ReintroductionEvaluation[]): LadderMode {
  const reactionSeen = evals.some((e) => e.outcome !== 'tolerated');
  const atTop = liveRung?.id === STEPS[STEPS.length - 1]!.id;
  return reactionSeen || atTop ? 'confirm' : 'probe';
}

function firedIndex(v: LadderDecision): number {
  switch (v.kind) {
    case 'blocked':
      return 0;
    case 'ceiling-reached':
      return 1;
    case 'rest':
    case 'step-back':
      return 2;
    case 'hold':
      return v.reason === 'skin-worsening' ? 3 : 4;
    default:
      return 5; // advance / passed / settled / adapting-decelerate / suspected-reaction
  }
}

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

const OUTCOME_LABEL: Record<AllergenOutcome, string> = {
  tolerated: 'tolerated',
  'mild-reaction': 'mild reaction',
  'clear-reaction': 'clear reaction',
  'severe-reaction': 'severe reaction',
};

const SEV_LABEL = ['klidné', 'mírné', 'střední', 'silné'];

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

  // The real verdict.
  const verdict = decideLadderMove(input);

  // Public readings for the per-step trace.
  const liveRung = currentRung(ALLERGEN_ID, meals, LADDER, STAGE, null, evaluations);
  const mode = deriveMode(liveRung, evaluations);
  const baseCadence = REINTRODUCTION_CADENCE_DAYS;
  const effCadence = effectiveCadenceDays(mode, baseCadence);
  const cadence = cadenceGate(ALLERGEN_ID, meals, today, effCadence);
  const stability = skinStabilityGate(observations, today, input.stabilityWindowDays);
  const next = nextLegalStep(liveRung, LADDER, STAGE, null);

  const fired = firedIndex(verdict);
  const status = (i: number): StepStatus => (i < fired ? 'passed' : i === fired ? 'fired' : 'not-reached');

  const sev = (n: RegionLevel | null) => (n === null ? '—' : `${SEV_LABEL[n]} (${n})`);

  const steps: StepView[] = [
    {
      key: 'permanent',
      fn: 'resolveLadder().stages[stage]',
      note: 'permanent-elimination + empty-ladder guard',
      status: status(0),
      inputs: [
        { label: 'isPermanentlyEliminated', value: input.isPermanentlyEliminated ? 'true' : 'false' },
        { label: 'rungs in stage', value: String(STEPS.length) },
      ],
      output: fired === 0 ? '→ blocked (inert)' : 'ladder active — continue',
    },
    {
      key: 'ceiling',
      fn: 'deriveLadderState().ceilingRung',
      note: 'floor exhaustion / per-rung reaction cap → terminal',
      status: status(1),
      inputs: [
        { label: 'ceilingRung', value: verdict.kind === 'ceiling-reached' ? verdict.rung.dose : 'null' },
        { label: 'reason', value: verdict.kind === 'ceiling-reached' ? verdict.reason : '—' },
      ],
      output:
        verdict.kind === 'ceiling-reached'
          ? `→ ceiling-reached (${verdict.reason})`
          : 'no ceiling — continue',
    },
    {
      key: 'reaction',
      fn: 'deriveLadderState().pendingReaction',
      note: 'rest window open → rest, else step-back',
      status: status(2),
      inputs: [
        {
          label: 'pendingReaction',
          value:
            verdict.kind === 'rest'
              ? `rung ${verdict.rung.dose}`
              : verdict.kind === 'step-back'
                ? `was ${verdict.from.dose}`
                : 'null',
        },
        {
          label: verdict.kind === 'rest' ? 'until' : 'stepBackTo',
          value:
            verdict.kind === 'rest'
              ? verdict.until
              : verdict.kind === 'step-back'
                ? verdict.to.dose
                : '—',
        },
      ],
      output:
        verdict.kind === 'rest'
          ? `→ rest ${verdict.days}d`
          : verdict.kind === 'step-back'
            ? `→ step-back → ${verdict.to.dose}`
            : 'no active reaction — continue',
    },
    {
      key: 'skin',
      fn: 'skinStabilityGate()',
      note: 'hold if skin worsened over the stability window',
      status: status(3),
      inputs: [
        { label: 'baselineSeverity', value: sev(stability.baselineSeverity) },
        { label: 'currentSeverity', value: sev(stability.currentSeverity) },
        { label: 'windowDays', value: `${input.stabilityWindowDays}` },
        { label: 'allowed', value: String(stability.allowed) },
      ],
      output: stability.allowed ? 'skin stable — continue' : "→ hold('skin-worsening')",
    },
    {
      key: 'cadence',
      fn: 'effectiveCadenceDays() · cadenceGate()',
      note: 'minimum spacing since last dose (mode-driven)',
      status: status(4),
      inputs: [
        { label: 'daysSinceLastDose', value: cadence.daysSinceLastDose === null ? 'null (never)' : `${cadence.daysSinceLastDose}` },
        { label: 'mode', value: mode },
        { label: 'baseCadenceDays', value: `${baseCadence}` },
        { label: 'effectiveCadenceDays', value: `${effCadence}` },
        { label: 'allowed', value: String(cadence.allowed) },
      ],
      output: cadence.allowed
        ? 'cadence met — continue'
        : `→ hold('cadence', ${Math.max(0, effCadence - (cadence.daysSinceLastDose ?? 0))}d)`,
    },
    {
      key: 'advance',
      fn: 'nextLegalStep() · dwell',
      note: 'advance one step; at top passed → settled',
      status: status(5),
      inputs: [
        { label: 'liveRung', value: liveRung ? liveRung.dose : 'null (not started)' },
        { label: 'nextLegalStep', value: next ? next.dose : 'null (at top — dwell)' },
      ],
      output: fired === 5 ? `→ ${verdictLabel(verdict)}` : 'not reached',
    },
  ];

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
    verdict,
    verdictLabel: verdictLabel(verdict),
    verdictTone: verdictTone(verdict),
    firedIndex: fired,
    steps,
    snapshot: {
      liveRung: liveRung ? liveRung.dose : 'not started',
      mode,
      daysSinceDose: cadence.daysSinceLastDose === null ? '—' : `${cadence.daysSinceLastDose}d`,
      skinTrend: stability.allowed ? 'stable' : 'worsening',
    },
    rungs,
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

export { OUTCOME_LABEL, SEV_LABEL };

// Small date helper (avoids importing $lib/utils just for +N days). String
// math via a UTC anchor so it never shifts across a local-timezone boundary.
export function addISO(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
