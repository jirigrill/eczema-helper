import type { Component } from 'svelte';

import { BabyIcon, MotherIcon } from '$lib/components/icons';
import type { Actor } from '$lib/domain/models';
import { type ActorStrings, actorStrings } from '$lib/strings/actors';

export type ActorConfig = ActorStrings & {
  /**
   * Round actor marker for the dual-actor day-view slot (issue #570): a woman
   * with a side ponytail for the mother, a seated baby in a diaper for the
   * child. Fixed-width so stacked actor rows stay aligned. Monochrome via
   * `currentColor`, mirroring `mealConfig.icon`.
   */
  icon: Component<{ class?: string }>;
};

/**
 * Config per actor, keyed for lookup. The meal picker renders one pill per
 * eligible actor (from `getEligibleActors`), so pill order follows that list
 * rather than this catalog order. Mirrors `mealConfig`.
 */
export const actorConfig = {
  mother: { ...actorStrings.mother, icon: MotherIcon },
  baby: { ...actorStrings.baby, icon: BabyIcon },
} as const satisfies Record<Actor, ActorConfig>;
