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

/**
 * The single source of truth for every journey node kind's presentation —
 * label, terminal role, and whether it is a future arm the engine does not emit
 * yet (#519), rendered greyed. Keyed exhaustively by `JourneyNodeKind`, so a
 * new kind added to the vocabulary breaks the build here until it is styled.
 * `label`, `terminal`, and `future` no longer drift across three parallel maps.
 */
const NODE_STYLES: Record<JourneyNodeKind, NodeStyle> = {
  'not-started': { label: 'not started', terminal: 'entry', future: false },
  climbing: { label: 'climbing', terminal: 'none', future: false },
  'holding-cadence': { label: 'holding · cadence', terminal: 'none', future: false },
  'holding-skin': { label: 'holding · skin worsening', terminal: 'none', future: false },
  resting: { label: 'resting', terminal: 'none', future: false },
  'stepped-back': { label: 'stepped back', terminal: 'none', future: false },
  dwelling: { label: 'dwelling', terminal: 'none', future: false },
  settled: { label: 'settled ✓', terminal: 'settled', future: false },
  'ceiling-floor-exhaustion': {
    label: 'ceiling · floor exhaustion ✗',
    terminal: 'absorbing',
    future: false,
  },
  blocked: { label: 'blocked ✗', terminal: 'absorbing', future: false },
  'adapting-decelerate': { label: 'adapting · decelerate', terminal: 'none', future: true },
  'suspected-reaction': { label: 'suspected reaction', terminal: 'none', future: true },
  'ceiling-severe': { label: 'ceiling · severe ✗', terminal: 'absorbing', future: true },
};

/** Presentation for one journey node kind — label, terminal role, greyed-ness. */
export function nodeStyle(kind: JourneyNodeKind): NodeStyle {
  return NODE_STYLES[kind];
}

/**
 * The future arms in vocabulary order — the single source both the styling and
 * the off-spine node list draw from (#519). A future arm the engine actually
 * emits appears on the spine instead; the caller filters those out.
 */
export const FUTURE_KINDS: JourneyNodeKind[] = (Object.keys(NODE_STYLES) as JourneyNodeKind[]).filter(
  (kind) => NODE_STYLES[kind].future,
);

/** Short Czech-day label for a box's date span (single day vs a range). */
export function spanLabel(fromDate: string, toDate: string): string {
  const short = (iso: string): string => {
    const [, m, d] = iso.split('-');
    return `${Number(d)}. ${Number(m)}.`;
  };
  return fromDate === toDate ? short(fromDate) : `${short(fromDate)} – ${short(toDate)}`;
}
