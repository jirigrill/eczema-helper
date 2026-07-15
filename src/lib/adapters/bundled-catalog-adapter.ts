import type { CatalogFamily } from '$lib/data/allergen-catalog/allergen-catalog';
import { ALLERGENS, FAMILIES, FOODS } from '$lib/data/allergen-catalog/allergen-catalog';
import type {
  CanonicalCatalogPort,
  CatalogAllergen,
} from '$lib/domain/ports/canonical-catalog-port';

export class BundledCatalogAdapter implements CanonicalCatalogPort {
  list(): CatalogAllergen[] {
    return ALLERGENS as unknown as CatalogAllergen[];
  }

  get(id: string): CatalogAllergen | undefined {
    return ALLERGENS.find((r) => r.id === id) as CatalogAllergen | undefined;
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
    // Catalog foods have explicit allergenIds
    const food = (FOODS as readonly { id: string; allergenIds: readonly string[] }[]).find(
      (f) => f.id === foodId,
    );
    if (food) return [...food.allergenIds];
    // Convention: `other:${allergenId}` encodes a known allergen without a catalog food twin
    if (foodId.startsWith('other:')) {
      const allergenId = foodId.slice(6);
      const allergen = ALLERGENS.find((a) => a.id === allergenId);
      if (allergen) return [allergenId];
    }
    return [];
  }
}
