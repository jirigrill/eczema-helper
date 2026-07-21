// The cascade drill-in content model (#531): a pure, library-independent
// projection of one day's `explainLadderMove` output into the rows a renderer
// draws. It reads *only* the seam's `LadderExplain` — it re-derives nothing, so
// what the cascade shows can never diverge from what the engine decided (#527).
import type {
  CadenceGateResult,
  LadderDecision,
  LadderExplain,
  LadderPrecedenceStep,
  LadderStateSnapshot,
  SkinStabilityGateResult,
} from '$lib/domain/ladder';

/** One snapshot fact rendered up front — the field name and its raw value. */
export type SnapshotRow = {
  field: keyof LadderStateSnapshot;
  value: LadderStateSnapshot[keyof LadderStateSnapshot];
};

/** One gate reading, ready to render: its label and raw value. */
export type GateSignal = { label: string; value: boolean | number | null };

/**
 * A gate-backed step's payload: the gate's own signals paired to the *effective*
 * (mode-adjusted) threshold the walker actually fed it — the exact comparison the
 * gate made that day (#531). Structural steps carry no gate.
 */
export type CascadeGate = { threshold: number; signals: GateSignal[] };

/** One field of the fired verdict's raw dump — the field name and its raw value. */
export type VerdictField = { field: string; value: unknown };

/** One precedence step, ready to render: its name, uniform status, whether it fired. */
export type CascadeStep = {
  name: LadderPrecedenceStep['name'];
  status: LadderPrecedenceStep['status'];
  fired: boolean;
  /** Present only on the two gate-backed steps (skin-worsening, cadence). */
  gate?: CascadeGate;
  /**
   * The fired `LadderDecision` variant dumped field-by-field, verbatim — present
   * only on the step that fired, never synthesized into prose (#531).
   */
  verdict?: VerdictField[];
  /**
   * The fired decision's discriminant, lifted out so a renderer can label the
   * dump without re-reading `verdict` — present only on the step that fired.
   */
  verdictKind?: LadderDecision['kind'];
};

export type CascadeView = {
  snapshot: SnapshotRow[];
  steps: CascadeStep[];
};

/**
 * The display order of every snapshot field. Keyed exhaustively by
 * `LadderStateSnapshot`, so a field added to the seam breaks the build here until
 * it is placed — the cascade can never silently omit one (#531), matching the
 * exhaustive-guard discipline the sibling `node-style.ts` uses.
 */
const SNAPSHOT_ORDER: Record<keyof LadderStateSnapshot, number> = {
  liveRung: 0,
  pendingReaction: 1,
  ceilingRung: 2,
  mode: 3,
  dwell: 4,
};

/** The snapshot fields in fixed display order — derived from the exhaustive map. */
const SNAPSHOT_FIELDS = (Object.keys(SNAPSHOT_ORDER) as (keyof LadderStateSnapshot)[]).sort(
  (a, b) => SNAPSHOT_ORDER[a] - SNAPSHOT_ORDER[b],
);

/**
 * Every field of a gate result as an ordered signal list — derived generically
 * (like `verdictDump`), not hand-listed, so a signal added to a gate result
 * surfaces automatically and can never be silently dropped from the cascade
 * (#531). Field order is the gate literal's declaration order (both `ladder.ts`
 * gates return plain object literals), matching `verdictDump`'s assumption.
 */
function signalsOf(gate: SkinStabilityGateResult | CadenceGateResult): GateSignal[] {
  return Object.entries(gate).map(([label, value]) => ({ label, value }));
}

/**
 * The gate payload for a gate-backed step, or `undefined` for a structural step
 * (whose evidence is the snapshot, not a gate). Reads the seam's `detail` — the
 * gate result and effective threshold the walker recorded — and pairs them.
 */
function gateOf(step: LadderPrecedenceStep): CascadeGate | undefined {
  const { detail } = step;
  if (detail.step === 'skin-worsening') {
    return { threshold: detail.windowDays, signals: signalsOf(detail.gate) };
  }
  if (detail.step === 'cadence') {
    return { threshold: detail.cadenceDays, signals: signalsOf(detail.gate) };
  }
  return undefined;
}

/**
 * The fired `LadderDecision` variant dumped field-by-field, verbatim — every own
 * property of the decision object, in declaration order, values untouched (#531).
 */
function verdictDump(decision: LadderDecision): VerdictField[] {
  return Object.entries(decision).map(([field, value]) => ({ field, value }));
}

/** Project one `LadderExplain` into the renderable cascade content model. */
export function buildCascade(explain: LadderExplain): CascadeView {
  const snapshot: SnapshotRow[] = SNAPSHOT_FIELDS.map((field) => ({
    field,
    value: explain.snapshot[field],
  }));
  const steps: CascadeStep[] = explain.steps.map((step) => {
    const fired = step.status === 'fired';
    return {
      name: step.name,
      status: step.status,
      fired,
      gate: gateOf(step),
      verdict: fired ? verdictDump(explain.decision) : undefined,
      verdictKind: fired ? explain.decision.kind : undefined,
    };
  });
  return { snapshot, steps };
}
