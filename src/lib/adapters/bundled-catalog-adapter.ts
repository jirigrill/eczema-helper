import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';
import type { CatalogFamily } from '$lib/data/allergen-catalog/three-collections';
import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog';
import { FAMILIES, ALLERGENS, FOODS } from '$lib/data/allergen-catalog/three-collections';

export class BundledCatalogAdapter implements CanonicalCatalogPort {
  private readonly records: readonly CanonicalAllergen[] = ALLERGEN_CATALOG as readonly CanonicalAllergen[];

  list(): CanonicalAllergen[] {
    return [...this.records];
  }

  get(id: string): CanonicalAllergen | undefined {
    return this.records.find((r) => r.id === id);
  }

  listFamilies(): CatalogFamily[] {
    return [...FAMILIES];
  }

  listAllergens() {
    return [...ALLERGENS];
  }

  listFoods() {
    return [...FOODS];
  }

  allergensForFood(foodId: string): string[] {
    const food = (FOODS as readonly { id: string; allergenIds: readonly string[] }[]).find((f) => f.id === foodId);
    if (!food) return [];
    return [...food.allergenIds];
  }
}
