import type { Actor } from '$lib/domain/models';

export type ActorStrings = {
  label: string;
};

/**
 * Czech labels for the two dietary actors, shown on the meal-logging actor
 * picker (issue #569) — the mother's own meal vs. the baby's. Labels only; the
 * picker is a full-width Chip pill row, shown in `mixed` (spec #564).
 */
export const actorStrings = {
  mother: { label: 'Já' },
  baby: { label: 'Miminko' },
} as const satisfies Record<Actor, ActorStrings>;
