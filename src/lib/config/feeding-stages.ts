import type { FeedingStage } from '$lib/domain/models';
import { FEEDING_STAGES } from '$lib/domain/models';
import { type FeedingStageStrings, feedingStageStrings } from '$lib/strings/feeding-stages';

export type FeedingStageConfig = FeedingStageStrings & {
  value: FeedingStage;
};

/**
 * Ordered feeding-stage options for the Settings segmented control. Labels only
 * (no visual tokens yet, #567); order follows the source protocol progression.
 */
export const feedingStageOptions = FEEDING_STAGES.map((value) => ({
  value,
  ...feedingStageStrings[value],
})) satisfies FeedingStageConfig[];
