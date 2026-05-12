import type { SchedulePhaseType } from '$lib/domain/models';

type PhaseDisplay = { icon: string; badge: string; iconBg: string };

const PHASE_DISPLAY: Record<SchedulePhaseType, PhaseDisplay> = {
  reset:          { icon: '📊', badge: 'bg-surface-dark text-text-muted', iconBg: 'bg-surface-dark' },
  elimination:    { icon: '🚫', badge: 'bg-danger text-white',            iconBg: 'bg-danger/15' },
  reintroduction: { icon: '🔬', badge: 'bg-success text-white',           iconBg: 'bg-success/15' },
  rest:           { icon: '⏸️', badge: 'bg-surface-dark text-text-muted', iconBg: 'bg-surface-dark' },
  training:       { icon: '🏋️', badge: 'bg-primary text-white',           iconBg: 'bg-primary/15' },
};

const PHASE_DISPLAY_FALLBACK: PhaseDisplay = {
  icon: '📅',
  badge: 'bg-surface-dark text-text-muted',
  iconBg: 'bg-surface-dark',
};

export function getPhaseDisplay(type: SchedulePhaseType): PhaseDisplay {
  return PHASE_DISPLAY[type] ?? PHASE_DISPLAY_FALLBACK;
}
