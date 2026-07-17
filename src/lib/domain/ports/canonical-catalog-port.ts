import type { CatalogFamily } from '$lib/data/allergen-catalog/allergen-catalog';
import type { Allergenicity, Ladder } from '$lib/domain/canonical-allergen';

/**
 * Shape returned by the canonical catalog port. The concrete data source
 * (bundled catalog today, future remote provider) narrows this type via
 * `satisfies`; consumers depend only on the shape declared here.
 */
export type CatalogAllergen = {
  id: string;
  familyId: string;
  icon: string;
  aliases: readonly string[];
  ladder?: Ladder;
  allergenicity?: Allergenicity;
};

type CatalogFood = {
  id: string;
  familyId: string;
  allergenIds: readonly string[];
  aliases?: readonly string[];
};

export type CanonicalCatalogPort = {
  /** Return all canonical allergen records. */
  list(): CatalogAllergen[];
  /** Look up a single record by id, or undefined if not found. */
  get(id: string): CatalogAllergen | undefined;

  /** Return all family records. */
  listFamilies(): CatalogFamily[];
  /** Return all allergen records from the three-collection catalog. */
  listAllergens(): CatalogAllergen[];
  /** Return all food records. */
  listFoods(): CatalogFood[];
  /** Return the allergen ids triggered by a food, or [] if food not found or has no triggers. */
  allergensForFood(foodId: string): string[];
};
