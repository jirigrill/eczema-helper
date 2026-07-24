import type { Actor } from '$lib/domain/models';
import { type ActorStrings, actorStrings } from '$lib/strings/actors';

export type ActorConfig = ActorStrings & {
  value: Actor;
};

/**
 * Config for a single actor pill. The meal picker renders one per eligible
 * actor (from `getEligibleActors`), so order there follows that list rather
 * than a fixed catalog order.
 */
export function actorConfig(value: Actor): ActorConfig {
  return { value, ...actorStrings[value] };
}
