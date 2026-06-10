import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';
import type { CatalogFamily } from '$lib/data/allergen-catalog/three-collections';

type CatalogAllergen3 = {
  id: string;
  familyId: string;
  icon: string;
  aliases: readonly string[];
  protocol?: import('$lib/domain/canonical-allergen').AllergenProtocol;
};

type CatalogFood = {
  id: string;
  familyId: string;
  allergenIds: readonly string[];
  aliases?: readonly string[];
};

export type CanonicalCatalogPort = {
  /** Return all canonical allergen records. */
  list(): CanonicalAllergen[];
  /** Look up a single record by id, or undefined if not found. */
  get(id: string): CanonicalAllergen | undefined;

  /** Return all 13 family records. */
  listFamilies(): CatalogFamily[];
  /** Return all allergen records from the three-collection catalog. */
  listAllergens(): CatalogAllergen3[];
  /** Return all food records. */
  listFoods(): CatalogFood[];
  /** Return the allergen ids triggered by a food, or [] if food not found or has no triggers. */
  allergensForFood(foodId: string): string[];
};
