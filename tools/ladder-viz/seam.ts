// PROTOTYPE — throwaway (ticket #522). A verbatim mirror of the #521
// `explainLadderMove` seam contract — the read-only surface the visualizer
// renders instead of reconstructing engine internals.
//
//   https://github.com/jirigrill/eczema-helper/issues/521
//
// #521 is DESIGNED (closed) but not yet IMPLEMENTED — its "F hand-off build"
// will add these exports to `$lib/domain/ladder`. Until then the tool mirrors
// the types here and `adapter.ts` reconstructs their values. THE DAY THE F
// BUILD LANDS:
//   1. delete this file,
//   2. `import { explainLadderMove, type LadderExplain, ... } from '$lib/domain/ladder'`,
//   3. `adapter.ts`'s body becomes `return explainLadderMove(input)`.
// The UI renders `LadderExplain` and does not change.
//
// Gate result types + LadderStep/LadderDecision/LadderMode are already public,
// so those are imported, not mirrored. `PendingReaction`/`Dwell` are private
// today (the F build exports them per #521) — mirrored below until then.
import type {
  CadenceGateResult,
  LadderDecision,
  LadderStep,
  SkinStabilityGateResult,
} from '$lib/domain/ladder';
import type { AllergenOutcome } from '$lib/domain/models';
import type { LadderMode } from '$lib/domain/policy';

/** Mirror of the private `PendingReaction` (ladder.ts) — exported by #521's F build. */
export type PendingReaction = {
  rung: LadderStep;
  outcome: AllergenOutcome;
  date: string;
  until: string;
  stepBackTo: LadderStep;
};

/** Mirror of the private `Dwell` (ladder.ts) — exported by #521's F build. */
export type Dwell = { count: number; lastDoseDate: string | null };

export type LadderStateSnapshot = {
  liveRung: LadderStep | null;
  pendingReaction: PendingReaction | null;
  ceilingRung: LadderStep | null;
  mode: LadderMode;
  dwell: Dwell;
};

export type LadderPrecedenceStepName =
  | 'permanent-or-empty'
  | 'ceiling'
  | 'reaction'
  | 'skin-worsening'
  | 'cadence'
  | 'advance-or-dwell';

export type LadderPrecedenceStepStatus = 'not-reached' | 'fired' | 'passed-confirmed' | 'passed-no-data';

export type LadderPrecedenceStepDetail =
  | { step: 'permanent-or-empty' }
  | { step: 'ceiling' }
  | { step: 'reaction' }
  | { step: 'skin-worsening'; gate: SkinStabilityGateResult; windowDays: number }
  | { step: 'cadence'; gate: CadenceGateResult; cadenceDays: number } // cadenceDays is the *effective*, mode-adjusted value
  | { step: 'advance-or-dwell' };

export type LadderPrecedenceStep = {
  name: LadderPrecedenceStepName;
  status: LadderPrecedenceStepStatus;
  detail: LadderPrecedenceStepDetail;
};

/** Fixed 6-tuple, precedence order — never variable-length (a step is never omitted). */
export type LadderPrecedenceSteps = [
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
  LadderPrecedenceStep,
];

export type LadderExplain = {
  decision: LadderDecision;
  snapshot: LadderStateSnapshot;
  steps: LadderPrecedenceSteps;
};

/** Precedence order + display captions for the 6 fixed step names (contract-stable). */
export const STEP_ORDER: LadderPrecedenceStepName[] = [
  'permanent-or-empty',
  'ceiling',
  'reaction',
  'skin-worsening',
  'cadence',
  'advance-or-dwell',
];
