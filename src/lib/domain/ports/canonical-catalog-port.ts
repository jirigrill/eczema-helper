import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export type CanonicalCatalogPort = {
  /** Return all canonical allergen records. */
  list(): CanonicalAllergen[];
  /** Look up a single record by id, or undefined if not found. */
  get(id: string): CanonicalAllergen | undefined;
};
