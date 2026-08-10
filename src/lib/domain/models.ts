// Domain model for the eczema-tracking app.
// ── Allergen identifiers ──────────────────────────────────────
// Derived from the data-first catalog (ADR-0017) and re-exported here so
// existing `$lib/domain/models` import sites are unchanged. The catalog is the
// single source of truth — these are no longer hand-written unions.
import type { AllergenId, CatalogAllergenId, CustomAllergenId } from '$lib/data/allergen-catalog';
import type { CatalogFoodId, FamilyId, FoodId } from '$lib/data/allergen-catalog/allergen-catalog';

export type { AllergenId, CatalogAllergenId, CustomAllergenId, FamilyId, FoodId, CatalogFoodId };

/**
 * The live master switch(es) the user controls, held in the dedicated `settings`
 * singleton row. `feedingStage` gates which actors may log a meal via
 * `getEligibleActors`. Room for future settings alongside it.
 */
export type SettingsData = {
  feedingStage: FeedingStage;
};

export type PortionKind = 'pinch' | 'teaspoon' | 'spoon' | 'portion' | 'package';

/**
 * Single source of truth for preparation methods, in chip-display order.
 * The type derives from this array — add or remove a method here only, and
 * `preparationStrings` (labels) fails `tsc` via its `satisfies` clause until it
 * matches. Which subset a given food offers is authored per food as
 * `preparations: PreparationMethod[]` in the catalog (ADR-0028), not derived
 * from a coarse form bucket.
 */
export const PREPARATION_METHODS = [
  'raw',
  'boiled',
  'baked',
  'fried',
  'dried',
  'smoked',
  'cured',
] as const;
export type PreparationMethod = (typeof PREPARATION_METHODS)[number];

export type MealItem = {
  id: string;
  name: string; // Czech display name
  foodId: FoodId; // identifies the specific food; custom foods use `other:${string}`
  amount: PortionKind;
  preparationMethod?: PreparationMethod;
};

export type MealType = 'breakfast' | 'lunch' | 'snack' | 'dinner';

/**
 * Who logged (or is credited with) a meal: `'mother' | 'baby'`. The baby is a
 * real dietary actor from the `mixed` feeding stage on — its own solids intake
 * participates in the same elimination diet (ADR-0027, parked — see
 * docs/parked-features.md). Which actors may log
 * at the current stage is governed by `getEligibleActors`; a mirrored schedule
 * means both ride the same protocol, differing only in their permanent
 * allergies.
 */
export const ACTORS = ['mother', 'baby'] as const;
export type Actor = (typeof ACTORS)[number];

/** Narrows an untrusted string (e.g. a `?actor=` URL param) to a known `Actor`. */
export function isActor(raw: string | null): raw is Actor {
  return raw !== null && (ACTORS as readonly string[]).includes(raw);
}

/**
 * Feeding stage a ladder's dose steps apply to, mirroring the three table
 * variants in the source protocols (Pekárková, Matoušková):
 * "plně kojené dítě (bez příkrmů)", "kojené dítě + příkrmy", "dítě plně na
 * příkrmech".
 */
export const FEEDING_STAGES = ['breastfed', 'mixed', 'solids'] as const;
export type FeedingStage = (typeof FEEDING_STAGES)[number];

/**
 * The actors permitted to log a meal at a given feeding stage — the single
 * source for "who may log". `breastfed → [mother]` (the newborn's intake is the
 * mother's diet), `mixed → [mother, baby]`, `solids → [baby]`.
 */
export function getEligibleActors(stage: FeedingStage): Actor[] {
  switch (stage) {
    case 'breastfed':
      return ['mother'];
    case 'mixed':
      return ['mother', 'baby'];
    case 'solids':
      return ['baby'];
    default: {
      const _exhaustive: never = stage;
      return _exhaustive;
    }
  }
}

/**
 * Composite key enforcing the one-meal-per-slot-per-actor invariant:
 * `"${date}:${mealType}:${actor}"`. A `(date, mealType)` pair can hold up to
 * one meal per actor.
 */
export type MealId = `${string}:${MealType}:${Actor}`;

/** A meal's addressable slot: the `(date, mealType, actor)` triple its `MealId` encodes. */
export type MealSlot = { date: string; mealType: MealType; actor: Actor };

export function mealId(date: string, mealType: MealType, actor: Actor): MealId {
  return `${date}:${mealType}:${actor}`;
}

export function parseMealId(id: MealId): MealSlot {
  const [date, mealType, actor] = id.split(':') as [string, MealType, Actor];
  return { date, mealType, actor };
}

export type Meal = {
  id: MealId; // deterministic composite key — e.g. "2026-05-27:lunch:mother"
  date: string; // ISO date
  mealType: MealType;
  actor: Actor; // 'mother' | 'baby', governed by FeedingStage via getEligibleActors (ADR-0027)
  items: MealItem[];
  notes?: string; // optional free-text observation (renamed from label)
  createdAt: string; // ISO datetime; render as Czech HH:MM at display sites (ADR-0014)
  /**
   * ISO datetime, set on edit-update only (issue #277, ADR-0018). Absent on a
   * compose-new write — `undefined` means "never edited since creation". Edits
   * preserve `createdAt` and stamp this field; only a fresh compose-new mints
   * a new `createdAt`.
   */
  updatedAt?: string;
};

/**
 * Body region the mother taps on the /skin grid. Canonical kebab-case slugs;
 * Czech labels live in `$lib/strings/skin-regions` keyed by `RegionId`.
 */
export type RegionId =
  | 'face'
  | 'scalp'
  | 'neck'
  | 'belly'
  | 'back'
  | 'arms'
  | 'elbow-folds'
  | 'knee-folds'
  | 'legs';

export const REGION_IDS: readonly RegionId[] = [
  'face',
  'scalp',
  'neck',
  'belly',
  'back',
  'arms',
  'elbow-folds',
  'knee-folds',
  'legs',
] as const;

/** Per-region severity. 0 = klidné (explicit default), 1 = mírné, 2 = střední, 3 = silné. */
export type RegionLevel = 0 | 1 | 2 | 3;

export type SkinRegionRecord = { id: RegionId; level: RegionLevel };

export type SkinObservation = {
  id: string;
  date: string; // ISO date
  createdAt: string; // ISO datetime
  /** Per-region severities. A region absent from the array is treated as klidné (0). */
  regions: SkinRegionRecord[];
  notes?: string;
};

/**
 * Day-overall severity = max(level over the observation's regions). Never
 * persisted — derive at every read site. Returns 0 when no region is logged.
 */
export function overallSeverity(observation: SkinObservation): RegionLevel {
  let max: RegionLevel = 0;
  for (const r of observation.regions) {
    if (r.level > max) max = r.level;
  }
  return max;
}

export type SkinPhoto = {
  id: string;
  observationId: string;
  region: RegionId;
  capturedAt: string; // ISO datetime
  blob: Blob;
};

/** Unsaved photo shape — callers never mint id/observationId/capturedAt. */
export type SkinPhotoInput = {
  region: RegionId;
  blob: Blob;
};
