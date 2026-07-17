// ═══════════════════════════════════════════════════════════
// PROTOTYPE — pure DUMMY data. No engine, no imports from the app.
// This is a look-and-feel exploration of DAG-shaped layouts for the ladder
// decision engine. Every value here is hand-authored fiction; wiring to the
// real engine is a later step. Delete with the prototype folder.
// ═══════════════════════════════════════════════════════════

// The decision engine, as a static DAG. One SOURCE (the day's inputs) fans into
// an ordered cascade of GATES; each gate either fires (→ a verdict sink) or
// passes (→ the next gate). Verdicts are the sink nodes.
export type NodeKind = 'source' | 'gate' | 'verdict';

export type DagNode = {
  id: string;
  kind: NodeKind;
  label: string;
  /** short subtitle / the condition a gate tests */
  sub?: string;
  /** grid column (0 = source) and row, for layout */
  col: number;
  row: number;
};

export type DagEdge = {
  from: string;
  to: string;
  /** 'pass' = fell through to next gate; 'fire' = short-circuited to a verdict */
  kind: 'pass' | 'fire';
};

// Static graph shared by every layout.
export const NODES: DagNode[] = [
  { id: 'src', kind: 'source', label: 'inputs', sub: 'meals · skin · evals', col: 0, row: 3 },

  { id: 'g1', kind: 'gate', label: 'permanent', sub: 'eliminated?', col: 1, row: 0 },
  { id: 'g2', kind: 'gate', label: 'ceiling', sub: 'floor exhausted?', col: 1, row: 1 },
  { id: 'g3', kind: 'gate', label: 'reaction', sub: 'rest window open?', col: 1, row: 2 },
  { id: 'g4', kind: 'gate', label: 'skin', sub: 'worsened?', col: 1, row: 3 },
  { id: 'g5', kind: 'gate', label: 'cadence', sub: 'spacing met?', col: 1, row: 4 },
  { id: 'g6', kind: 'gate', label: 'advance', sub: 'higher rung?', col: 1, row: 5 },

  { id: 'v-blocked', kind: 'verdict', label: 'blocked', col: 2, row: 0 },
  { id: 'v-ceiling', kind: 'verdict', label: 'ceiling-reached', col: 2, row: 1 },
  { id: 'v-rest', kind: 'verdict', label: 'rest / step-back', col: 2, row: 2 },
  { id: 'v-hold-skin', kind: 'verdict', label: 'hold · skin', col: 2, row: 3 },
  { id: 'v-hold-cad', kind: 'verdict', label: 'hold · cadence', col: 2, row: 4 },
  { id: 'v-advance', kind: 'verdict', label: 'advance / settled', col: 2, row: 5 },
];

export const EDGES: DagEdge[] = [
  { from: 'src', to: 'g1', kind: 'pass' },
  // pass-through spine
  { from: 'g1', to: 'g2', kind: 'pass' },
  { from: 'g2', to: 'g3', kind: 'pass' },
  { from: 'g3', to: 'g4', kind: 'pass' },
  { from: 'g4', to: 'g5', kind: 'pass' },
  { from: 'g5', to: 'g6', kind: 'pass' },
  // fire → verdict
  { from: 'g1', to: 'v-blocked', kind: 'fire' },
  { from: 'g2', to: 'v-ceiling', kind: 'fire' },
  { from: 'g3', to: 'v-rest', kind: 'fire' },
  { from: 'g4', to: 'v-hold-skin', kind: 'fire' },
  { from: 'g5', to: 'v-hold-cad', kind: 'fire' },
  { from: 'g6', to: 'v-advance', kind: 'fire' },
];

// The gate ids, in precedence order — handy for per-step path building.
export const GATE_ORDER = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'] as const;
export type GateId = (typeof GATE_ORDER)[number];

export type InputChip = { kind: 'meal' | 'skin' | 'eval'; text: string };

// One day of the scenario: what the mother did, which gate the day's decision
// stopped at, the verdict node it landed on, and a live-values readout per gate
// so the graph nodes can show substituted conditions. All fiction.
export type DayStep = {
  date: string;
  inputs: InputChip[];
  /** gate where the pulse stopped (the fired gate) */
  firedGate: GateId;
  /** verdict node id it fired into */
  verdict: string;
  liveRung: string;
  /** per-gate condition text with dummy values substituted */
  conditions: Record<GateId, string>;
};

const cond = (over: Partial<Record<GateId, string>>): Record<GateId, string> => ({
  g1: 'eliminated = false',
  g2: 'floor intact',
  g3: 'no open rest window',
  g4: 'skin 1 ≤ baseline 1',
  g5: 'elapsed 4d ≥ cadence 3d',
  g6: 'next rung exists',
  ...over,
});

export const DAYS: DayStep[] = [
  {
    date: '06-01',
    inputs: [
      { kind: 'meal', text: 'pinch' },
      { kind: 'skin', text: 'severity 1' },
    ],
    firedGate: 'g5',
    verdict: 'v-hold-cad',
    liveRung: 'pinch',
    conditions: cond({ g5: 'elapsed 0d < cadence 3d' }),
  },
  {
    date: '06-05',
    inputs: [{ kind: 'meal', text: 'teaspoon' }],
    firedGate: 'g6',
    verdict: 'v-advance',
    liveRung: 'teaspoon',
    conditions: cond({ g5: 'elapsed 4d ≥ cadence 3d', g6: 'advance → teaspoon' }),
  },
  {
    date: '06-09',
    inputs: [{ kind: 'meal', text: 'teaspoon' }],
    firedGate: 'g6',
    verdict: 'v-advance',
    liveRung: 'spoon',
    conditions: cond({ g6: 'advance → spoon' }),
  },
  {
    date: '06-14',
    inputs: [
      { kind: 'skin', text: 'severity 2' },
      { kind: 'skin', text: 'severity 3' },
    ],
    firedGate: 'g4',
    verdict: 'v-hold-skin',
    liveRung: 'spoon',
    conditions: cond({ g4: 'skin 3 > baseline 1' }),
  },
  {
    date: '06-15',
    inputs: [{ kind: 'eval', text: 'clear-reaction' }],
    firedGate: 'g3',
    verdict: 'v-rest',
    liveRung: 'teaspoon',
    conditions: cond({ g3: 'rest open until 06-22' }),
  },
  {
    date: '06-22',
    inputs: [{ kind: 'meal', text: 'teaspoon' }],
    firedGate: 'g6',
    verdict: 'v-advance',
    liveRung: 'spoon',
    conditions: cond({ g6: 'advance → spoon' }),
  },
];

// Fixed, calm palette. Not neon.
export const inputTone = {
  meal: { dot: 'bg-indigo-400', text: 'text-indigo-300' },
  skin: { dot: 'bg-teal-400', text: 'text-teal-300' },
  eval: { dot: 'bg-rose-400', text: 'text-rose-300' },
} as const;

export const verdictTone: Record<string, string> = {
  'v-blocked': 'bg-stone-600',
  'v-ceiling': 'bg-rose-600',
  'v-rest': 'bg-sky-600',
  'v-hold-skin': 'bg-amber-600',
  'v-hold-cad': 'bg-amber-500',
  'v-advance': 'bg-emerald-600',
};
