import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import type { AllergenProtocol } from '$lib/domain/canonical-allergen';
import type { CatalogFamily } from '$lib/data/allergen-catalog/three-collections';
import { FAMILIES, ALLERGENS, FOODS } from '$lib/data/allergen-catalog/three-collections';

type CatalogAllergen = {
  id: string;
  familyId: string;
  icon: string;
  aliases: readonly string[];
  protocol?: AllergenProtocol;
};

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
    const food = (FOODS as readonly { id: string; allergenIds: readonly string[] }[]).find((f) => f.id === foodId);
    if (!food) return [];
    return [...food.allergenIds];
  }
}
