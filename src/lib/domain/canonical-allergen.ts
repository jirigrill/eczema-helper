import type { PortionKind } from '$lib/domain/models';

/**
 * Feeding stage a ladder's dose steps apply to, mirroring the three table
 * variants in the source protocols (Pekárková, Matoušková):
 * "plně kojené dítě (bez příkrmů)", "kojené dítě + příkrmy", "dítě plně na
 * příkrmech".
 */
export const FEEDING_STAGES = ['breastfed', 'mixed', 'solids'] as const;
export type FeedingStage = (typeof FEEDING_STAGES)[number];

/**
 * The single feeding stage v1 supports. v1 tracks a breastfed newborn on the
 * mother's elimination diet (ADR-0001), so every ladder read resolves to
 * `breastfed`. `mixed`/`solids` ladders are authored for a later release that
 * has a real feeding-stage source; until then consumers must reference this
 * constant instead of hardcoding the literal so the two call sites cannot drift
 * and the assumption is greppable. Follow-up: wire an actual stage source.
 */
export const V1_FEEDING_STAGE: FeedingStage = 'breastfed';

/**
 * A single dose step on a per-allergen escalation ladder (ADR-0023, Option A).
 *
 * `anchor` reuses the shared `PortionKind` vocabulary; *order within the
 * ladder* — not the anchor value on its own — is what makes a step "higher"
 * than another. `isEvaluationCheckpoint` marks rungs whose reaction the mother
 * should record.
 *
 * `dose` is the Czech caption shown at that rung — sourced from the source
 * protocol tables under `docs/allergen-reference/elimination-diet-schedule-pekarkova/…`
 * and `docs/allergen-reference/allergen-testing-matouskova/…`.
 * Inlining display text on a domain record is a deliberate deviation from
 * ADR-0014 for the Czech-only single-tenant v1: single-file review beats
 * cross-file lookup for the person auditing the schedule.
 */
export type LadderStep = {
  id: string;
  anchor: PortionKind;
  isEvaluationCheckpoint: boolean;
  dose: string;
};

/**
 * Per-allergen dose ladder, keyed by feeding stage. Not every allergen has
 * data for every stage — e.g. a source table tested in the child only leaves
 * `breastfed` absent.
 *
 * `allergenId` is typed `string` (rather than the derived `LadderAllergenId`)
 * to break a circular type: `LadderAllergenId` is inferred from the catalog
 * which now embeds `Ladder` records. Consumers that need the narrow type read
 * the parent allergen record's `id` directly.
 */
export type Ladder = {
  allergenId: string;
  stages: Partial<Record<FeedingStage, readonly LadderStep[]>>;
};

/** A single self-contained allergen record. `ladder` presence determines reintroducibility. */
export type CanonicalAllergen = {
  id: string;
  icon: string;
  aliases: readonly string[];
  /** Position in Matoušková's 20-allergen testing sequence. Absent for allergens not in her list. */
  allergenOrder?: number;
  source?: string;
  ladder?: Ladder;
};
