import type { Actor } from '$lib/domain/models';
import { type ActorStrings, actorStrings } from '$lib/strings/actors';

export type ActorConfig = ActorStrings;

/**
 * Config per actor, keyed for lookup. The meal picker renders one pill per
 * eligible actor (from `getEligibleActors`), so pill order follows that list
 * rather than this catalog order. Mirrors `mealConfig`.
 */
export const actorConfig = {
  mother: { ...actorStrings.mother },
  baby: { ...actorStrings.baby },
} as const satisfies Record<Actor, ActorConfig>;
