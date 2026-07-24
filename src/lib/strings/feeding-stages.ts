import type { FeedingStage } from '$lib/domain/models';

export type FeedingStageStrings = {
  label: string;
};

/**
 * Czech labels for the three feeding-stage variants (Pekárková/Matoušková
 * source tables). Labels only — the control is current-value, no history.
 */
export const feedingStageStrings = {
  breastfed: { label: 'Plně kojené' },
  mixed: { label: 'Kojené + příkrmy' },
  solids: { label: 'Plně na příkrmech' },
} as const satisfies Record<FeedingStage, FeedingStageStrings>;
