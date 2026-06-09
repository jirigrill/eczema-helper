import type { CanonicalCatalogPort } from '$lib/domain/ports/canonical-catalog-port';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';
import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog';

export class BundledCatalogAdapter implements CanonicalCatalogPort {
  private readonly records: readonly CanonicalAllergen[] = ALLERGEN_CATALOG as readonly CanonicalAllergen[];

  list(): CanonicalAllergen[] {
    return [...this.records];
  }

  get(id: string): CanonicalAllergen | undefined {
    return this.records.find((r) => r.id === id);
  }
}
