import type { PhaseType } from '$lib/domain/models';
import { phaseStrings, type PhaseStrings } from '$lib/strings/phases';

export type PhaseConfig = PhaseStrings & {
  icon: string;   // emoji used in icon circles
  badge: string;  // Tailwind classes for the colored badge pill
  iconBg: string; // Tailwind classes for the icon circle background
};

export const phaseConfig = {
  reset:          { ...phaseStrings.reset,          icon: '📊', badge: 'bg-surface-dark text-text-muted', iconBg: 'bg-surface-dark' },
  elimination:    { ...phaseStrings.elimination,    icon: '🚫', badge: 'bg-danger text-white',            iconBg: 'bg-danger/15'    },
  reintroduction: { ...phaseStrings.reintroduction, icon: '🔬', badge: 'bg-success text-white',           iconBg: 'bg-success/15'   },
  rest:           { ...phaseStrings.rest,           icon: '⏸️', badge: 'bg-surface-dark text-text-muted', iconBg: 'bg-surface-dark' },
  'tolerance-building': { ...phaseStrings['tolerance-building'], icon: '🥄', badge: 'bg-primary text-white', iconBg: 'bg-primary/15' },
} as const satisfies Record<PhaseType, PhaseConfig>;
