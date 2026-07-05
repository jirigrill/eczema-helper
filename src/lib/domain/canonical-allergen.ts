import type { PortionKind } from '$lib/domain/models';

export type ProtocolDay = {
  day: number;
  instructionCs: string;
  isEvaluationDay: boolean;
};

export type AllergenProtocol = {
  days: ProtocolDay[];
};

/**
 * A single dose step on a per-allergen escalation ladder (ADR-0023, Option A).
 *
 * `anchor` reuses the shared `PortionKind` vocabulary; *order within the
 * ladder* — not the anchor value on its own — is what makes a step "higher"
 * than another. `isEvaluationCheckpoint` marks rungs whose reaction the mother
 * should record (mirrors the legacy `ProtocolDay.isEvaluationDay`).
 */
export type LadderStep = {
  id: string;
  anchor: PortionKind;
  isEvaluationCheckpoint: boolean;
};

/**
 * Ordered ladder of dose steps for one protocol allergen.
 *
 * `allergenId` is typed `string` (rather than the derived `ProtocolAllergenId`)
 * to break a circular type: `ProtocolAllergenId` is inferred from the catalog
 * which now embeds `Ladder` records. Consumers that need the narrow type read
 * the parent allergen record's `id` directly.
 */
export type Ladder = {
  allergenId: string;
  steps: readonly LadderStep[];
};

/** A single self-contained allergen record. `protocol` presence determines reintroducibility. */
export type CanonicalAllergen = {
  id: string;
  icon: string;
  aliases: readonly string[];
  source?: string;
  protocol?: AllergenProtocol;
  ladder?: Ladder;
};
