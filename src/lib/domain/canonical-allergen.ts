import type { PortionKind } from "$lib/domain/models";

/**
 * Feeding stage a ladder's dose steps apply to, mirroring the three table
 * variants in the source protocols (Pekárková, Matoušková):
 * "plně kojené dítě (bez příkrmů)", "kojené dítě + příkrmy", "dítě plně na
 * příkrmech".
 */
export const FEEDING_STAGES = ["breastfed", "mixed", "solids"] as const;
export type FeedingStage = (typeof FEEDING_STAGES)[number];

/**
 * A single dose step on a per-allergen escalation ladder (ADR-0023, Option A).
 *
 * `anchor` reuses the shared `PortionKind` vocabulary; *order within the
 * ladder* — not the anchor value on its own — is what makes a step "higher"
 * than another. `isEvaluationCheckpoint` marks rungs whose reaction the mother
 * should record.
 *
 * `dose` is the Czech caption shown at that rung — sourced from the source
 * protocol tables under `docs/full elimination diet schedule - atopicky
 * ekzem Pekarkova/…` and `docs/jak testovat alergeny - matouskova/…`.
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
 * `allergenId` is typed `string` (rather than the derived `ProtocolAllergenId`)
 * to break a circular type: `ProtocolAllergenId` is inferred from the catalog
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
