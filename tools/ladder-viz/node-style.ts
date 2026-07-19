import type { JourneyNodeKind } from './journey';

/** Terminal character of a journey node (#519). */
export type NodeTerminal =
  | 'entry' // the synthetic not-started entry
  | 'none' // an ordinary in-flight situation
  | 'settled' // reversible success terminal (green ✓, keeps settled → resting)
  | 'absorbing'; // ceiling / blocked — hard, no edges out

export type NodeStyle = {
  label: string;
  terminal: NodeTerminal;
  /** True for the future arms the engine does not emit yet — rendered greyed. */
  future: boolean;
};

/** The three arms in the vocabulary the engine does not emit yet (#519). */
const FUTURE_KINDS: ReadonlySet<JourneyNodeKind> = new Set([
  'adapting-decelerate',
  'suspected-reaction',
  'ceiling-severe',
]);

const LABELS: Record<JourneyNodeKind, string> = {
  'not-started': 'not started',
  climbing: 'climbing',
  'holding-cadence': 'holding · cadence',
  'holding-skin': 'holding · skin worsening',
  resting: 'resting',
  'stepped-back': 'stepped back',
  dwelling: 'dwelling',
  settled: 'settled ✓',
  'ceiling-floor-exhaustion': 'ceiling · floor exhaustion ✗',
  blocked: 'blocked ✗',
  'adapting-decelerate': 'adapting · decelerate',
  'suspected-reaction': 'suspected reaction',
  'ceiling-severe': 'ceiling · severe ✗',
};

function terminalOf(kind: JourneyNodeKind): NodeTerminal {
  if (kind === 'not-started') return 'entry';
  if (kind === 'settled') return 'settled';
  if (kind === 'blocked' || kind === 'ceiling-floor-exhaustion' || kind === 'ceiling-severe') {
    return 'absorbing';
  }
  return 'none';
}

/** Presentation for one journey node kind — label, terminal role, greyed-ness. */
export function nodeStyle(kind: JourneyNodeKind): NodeStyle {
  return { label: LABELS[kind], terminal: terminalOf(kind), future: FUTURE_KINDS.has(kind) };
}

/** Short Czech-day label for a box's date span (single day vs a range). */
export function spanLabel(fromDate: string, toDate: string): string {
  const short = (iso: string): string => {
    const [, m, d] = iso.split('-');
    return `${Number(d)}. ${Number(m)}.`;
  };
  return fromDate === toDate ? short(fromDate) : `${short(fromDate)} – ${short(toDate)}`;
}
