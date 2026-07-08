import type { Ladder } from '$lib/domain/canonical-allergen';
import type { Result } from '$lib/types/result';

/**
 * Per-allergen ladder override — replaces the default ladder from the catalog
 * for the given `allergenId`. Overrides carry the same `Ladder` shape as the
 * curated catalog record (ADR-0023) and are keyed by `allergenId`.
 *
 * Stored in a local Dexie store (ADR-0006). Included in the ADR-0002 export
 * snapshot so a device restore preserves the clinician's individualized plan
 * (see follow-up: the export payload builder still needs to compose it).
 */
export type LadderOverrideRepository = {
  /** Upsert an override for its `allergenId`. Second save overwrites. */
  save(override: Ladder): Promise<Result<void, string>>;
  /** Load the override for `allergenId`, or `null` when none is present. */
  loadByAllergen(allergenId: string): Promise<Result<Ladder | null, string>>;
};
