import { dairy } from './dairy';
import { eggs } from './eggs';
import { wheat } from './wheat';
import { soy } from './soy';
import { nuts } from './nuts';
import { fish } from './fish';
import { shellfish } from './shellfish';
import { citrus } from './citrus';
import { chocolate } from './chocolate';
import { tomatoes } from './tomatoes';
import { strawberries } from './strawberries';
import { corn } from './corn';
import { sesame } from './sesame';
import { grains } from './grains';
import { seeds } from './seeds';
import { legumes } from './legumes';
import { fruit } from './fruit';
import { exoticFruit } from './exotic-fruit';
import { carrotRootVeg } from './carrot-root-veg';
import { cabbageBrassica } from './cabbage-brassica';
import { onionGarlic } from './onion-garlic';
import { potato } from './potato';
import { mushroom } from './mushroom';
import { otherVegetables } from './other-vegetables';
import { meat } from './meat';
import { mustard } from './mustard';
import { sulphitesAdditives } from './sulphites-additives';
import { vinegarFermented } from './vinegar-fermented';
import { yeast } from './yeast';
import { sweeteners } from './sweeteners';
import { spicesHerbs } from './spices-herbs';
import { coffeeTea } from './coffee-tea';

import type { AllergenProtocol, CanonicalAllergen } from '$lib/domain/canonical-allergen';

export type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const ALLERGEN_CATALOG = [
  dairy, eggs, wheat, soy, nuts, fish, shellfish,
  citrus, chocolate, tomatoes, strawberries, corn, sesame,
  // ADR-0017 slice 6 — regional expansion (log-only, no protocol)
  grains, seeds, legumes, fruit, exoticFruit,
  carrotRootVeg, cabbageBrassica, onionGarlic, potato, mushroom, otherVegetables,
  meat,
  mustard, sulphitesAdditives, vinegarFermented, yeast, sweeteners, spicesHerbs, coffeeTea,
] as const;

type CatalogRecord = typeof ALLERGEN_CATALOG[number];

/** All catalog allergen ids (no custom tier) — use for exhaustive display-config records. */
export type CatalogAllergenId = CatalogRecord['id'];

/** User-defined custom allergens (e.g. `'other:Paprika'`); never enter a protocol phase. */
export type CustomAllergenId = `other:${string}`;

/** All catalog allergen ids, plus the open-ended custom tier. */
export type AllergenId = CatalogRecord['id'] | CustomAllergenId;

/** Allergen ids that carry a reintroduction protocol — derived from the records. */
export type ProtocolAllergenId = Extract<CatalogRecord, { protocol: object }>['id'];

import { categoryStrings } from '$lib/strings/categories';

export type CategoryConfig = {
  name: string;
  icon: string;
};

/**
 * Returns the display config (name + icon) for any catalog allergen.
 * Returns undefined for custom other: items.
 */
export function getCategoryConfig(id: string): CategoryConfig | undefined {
  const record = (ALLERGEN_CATALOG as readonly CanonicalAllergen[]).find((r) => r.id === id);
  if (!record) return undefined;
  const strings = (categoryStrings as Record<string, { name: string }>)[id];
  if (!strings) return undefined;
  return { name: strings.name, icon: record.icon };
}

/**
 * The reintroduction protocol for an allergen, or undefined if it has none.
 * Thin accessor backed by CanonicalCatalogPort (ADR-0017). Custom and
 * protocol-less allergens return undefined.
 */
export function getProtocolForAllergen(id: AllergenId): AllergenProtocol | undefined {
  const record = (ALLERGEN_CATALOG as readonly CanonicalAllergen[]).find((r) => r.id === id);
  return record?.protocol;
}
