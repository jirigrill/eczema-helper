import type { SchedulePhaseType } from '$lib/domain/models';

type PhaseDisplay = { icon: string; badge: string; iconBg: string; label: string };

const PHASE_DISPLAY: Record<SchedulePhaseType, PhaseDisplay> = {
  reset:          { icon: '📊', badge: 'bg-surface-dark text-text-muted', iconBg: 'bg-surface-dark', label: 'Reset' },
  elimination:    { icon: '🚫', badge: 'bg-danger text-white',            iconBg: 'bg-danger/15',    label: 'Eliminace' },
  reintroduction: { icon: '🔬', badge: 'bg-success text-white',           iconBg: 'bg-success/15',   label: 'Reintrodukce' },
  rest:           { icon: '⏸️', badge: 'bg-surface-dark text-text-muted', iconBg: 'bg-surface-dark', label: 'Odpočinek' },
  training:       { icon: '🏋️', badge: 'bg-primary text-white',           iconBg: 'bg-primary/15',   label: 'Trénink' },
};

const PHASE_DISPLAY_FALLBACK: PhaseDisplay = {
  icon: '📅',
  badge: 'bg-surface-dark text-text-muted',
  iconBg: 'bg-surface-dark',
  label: 'Neznámá fáze',
};

export function getPhaseDisplay(type: SchedulePhaseType): PhaseDisplay {
  return PHASE_DISPLAY[type] ?? PHASE_DISPLAY_FALLBACK;
}
