// Shared, CALM palette + tiny presentational helpers for the visualizer.
// Nothing here interprets engine semantics — it only maps the *strings the
// engine already emitted* (verdict.kind, gate.passed) to a colour. Slate/stone
// base, muted accents; no neon.
import type { Step } from './engine';

// Verdict tone by kind — one muted accent each, readable on a slate card.
export const verdictTone: Record<string, string> = {
  advance: 'bg-emerald-800/60 text-emerald-100 ring-1 ring-emerald-600/50',
  passed: 'bg-emerald-900/50 text-emerald-200 ring-1 ring-emerald-700/40',
  settled: 'bg-emerald-800/70 text-emerald-50 ring-1 ring-emerald-500/50',
  hold: 'bg-amber-900/50 text-amber-100 ring-1 ring-amber-600/50',
  rest: 'bg-sky-900/50 text-sky-100 ring-1 ring-sky-600/50',
  'step-back': 'bg-orange-900/50 text-orange-100 ring-1 ring-orange-600/50',
  blocked: 'bg-stone-700/60 text-stone-200 ring-1 ring-stone-500/50',
  'ceiling-reached': 'bg-rose-900/60 text-rose-100 ring-1 ring-rose-600/50',
  'adapting-decelerate': 'bg-orange-900/50 text-orange-100 ring-1 ring-orange-600/50',
  'suspected-reaction': 'bg-rose-900/60 text-rose-100 ring-1 ring-rose-600/50',
};

// Input-kind accents — quiet, distinguishable.
export const inputTone = {
  meal: { dot: 'bg-indigo-400', text: 'text-indigo-300', label: 'meal' },
  skin: { dot: 'bg-teal-400', text: 'text-teal-300', label: 'skin' },
  eval: { dot: 'bg-rose-400', text: 'text-rose-300', label: 'eval' },
} as const;

export function verdictDetail(v: Step['verdict']): string {
  if (v.kind === 'advance') return `→ ${v.to.anchor}`;
  if (v.kind === 'hold')
    return (
      v.reason +
      (v.reason === 'cadence' && v.daysRemaining != null ? ` · ${v.daysRemaining}d left` : '')
    );
  if (v.kind === 'rest') return `until ${v.until}`;
  if (v.kind === 'step-back') return `${v.from.anchor} → ${v.to.anchor}`;
  if (v.kind === 'ceiling-reached') return v.reason;
  if ('rung' in v) return v.rung.anchor;
  return '';
}

export function eventText(e: Step['events'][number]): string {
  if (e.kind === 'meal') return e.dose;
  if (e.kind === 'eval') return e.outcome;
  return `severity ${e.severity}`;
}
