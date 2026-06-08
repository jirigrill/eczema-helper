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

import type { AllergenProtocol, CanonicalAllergen } from '$lib/domain/canonical-allergen';

export type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const ALLERGEN_CATALOG = [
  dairy, eggs, wheat, soy, nuts, fish, shellfish,
  citrus, chocolate, tomatoes, strawberries, corn, sesame,
] as const;

type CatalogRecord = typeof ALLERGEN_CATALOG[number];

/** User-defined custom allergens (e.g. `'other:Paprika'`); never enter a protocol phase. */
export type CustomAllergenId = `other:${string}`;

/** All catalog allergen ids, plus the open-ended custom tier. */
export type AllergenId = CatalogRecord['id'] | CustomAllergenId;

/** Allergen ids that carry a reintroduction protocol — derived from the records. */
export type ProtocolAllergenId = Extract<CatalogRecord, { protocol: object }>['id'];

/**
 * Full compound subitem ids, e.g. `'sesame:sesame-seeds'`.
 * Derived per-record via conditional distribution — only valid allergenId:bare pairings exist.
 * Records store bare keys; this type constructs `allergenId:bare` for each record in the union.
 */
export type SubitemId = CatalogRecord extends infer R
  ? R extends { id: string; subitems: readonly string[] }
    ? `${R['id']}:${R['subitems'][number]}`
    : never
  : never;

/**
 * Structural category list derived from ALLERGEN_CATALOG.
 * Consumers that previously imported CATEGORIES from `$lib/data/categories` can
 * switch to this; the legacy file re-exports it for backwards compat.
 */
export const CATEGORIES = ALLERGEN_CATALOG.map((r) => ({
  allergenId: r.id as ProtocolAllergenId,
  subItems: r.subitems.map((bare) => ({
    subitemId: `${r.id}:${bare}` as SubitemId,
    allergenId: r.id as ProtocolAllergenId,
  })),
}));

/**
 * The reintroduction protocol for an allergen, or undefined if it has none.
 * Reads straight from the catalog record — the single source of truth for
 * clinical dosing (ADR-0017). Custom and protocol-less allergens return undefined.
 */
export function getProtocolForAllergen(id: AllergenId): AllergenProtocol | undefined {
  const record = (ALLERGEN_CATALOG as readonly CanonicalAllergen[]).find((r) => r.id === id);
  return record?.protocol;
}
