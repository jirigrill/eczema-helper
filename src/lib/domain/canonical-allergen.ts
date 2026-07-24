import type { FeedingStage, PortionKind } from '$lib/domain/models';

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

/**
 * How allergenic a food is — the one authored input the derived adaptation
 * window needs (ADR-0023 §6). The engine (`deriveLadderState`, not yet built)
 * only distinguishes `'low'`: a `'low'` food is eligible for the
 * decelerated-continuation *adaptation window* on a first-contact sub-threshold
 * flare, whereas anything higher routes straight to the reaction path.
 *
 * The three-level scale is **tunable curator policy, not a clinically stamped
 * classification** — an ordinal placeholder. Order is meaningful (`low` <
 * `moderate` < `high`); only the `low` boundary is engine-load-bearing today,
 * so `moderate`/`high` are free to be split or renumbered later without
 * touching engine code.
 */
export const ALLERGENICITY_LEVELS = ['low', 'moderate', 'high'] as const;
export type Allergenicity = (typeof ALLERGENICITY_LEVELS)[number];

/**
 * A single self-contained allergen record. `ladder` presence determines
 * reintroducibility.
 *
 * `allergenicity` is an intrinsic property of the allergen (not the dose
 * progression), so it lives here rather than on `Ladder`. It is authored
 * only where a `ladder` is present — the adaptation window it gates exists
 * only during reintroduction — and a catalog invariant test enforces that
 * pairing (ADR-0023 §6).
 */
export type CanonicalAllergen = {
  id: string;
  icon: string;
  aliases: readonly string[];
  /** Position in Matoušková's 20-allergen testing sequence. Absent for allergens not in her list. */
  allergenOrder?: number;
  source?: string;
  ladder?: Ladder;
  allergenicity?: Allergenicity;
};
