// The presentation view-model of the single-day inspector: it projects one day's
// real `explainLadderMove` output (`LadderExplain`, from `$lib/domain/ladder`)
// plus the run's own ladder and raw inputs into the cosmetic shape the Svelte
// components render. NO decision logic lives here — the verdict and its trace
// come straight from the engine seam; this only labels and lays them out. Since
// #521's F build landed, `explainLadderMove` is a real export and nothing is
// reconstructed (the prototype's old `seam.ts`/`buildExplain` are gone).
import type { LadderDecision } from '$lib/domain/ladder';
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

// ── View-model ────────────────────────────────────────────────────────────────

export interface RungView {
  id: string;
  dose: string;
  checkpoint: boolean;
  state: 'passed' | 'current' | 'ahead';
}

export interface DayView {
  date: string;
  explain: DayResolution['explain'];
  verdictLabel: string;
  verdictTone: 'go' | 'hold' | 'stop';
  verdictJson: string;
  rungs: RungView[];
  liveRungLabel: string;
  allergenLabel: string;
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

  return {
    date,
    explain,
    verdictLabel: verdictLabel(decision),
    verdictTone: verdictTone(decision),
    verdictJson: JSON.stringify(decision, null, 2),
    rungs,
    liveRungLabel: liveRung ? liveRung.dose : 'not started',
    allergenLabel: run.allergenId,
    inputs: {
      meals: dayMeals.map((m) => {
        const item = m.items[0]!;
        const rung = steps.find((s) => s.anchor === item.amount);
        return { time: m.createdAt.slice(11, 16), text: item.name, dose: rung?.dose ?? String(item.amount) };
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
