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

export type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

export const ALLERGEN_CATALOG = [
  dairy, eggs, wheat, soy, nuts, fish, shellfish,
  citrus, chocolate, tomatoes, strawberries, corn, sesame,
] as const;

/** All catalog allergen ids, plus open-ended `other:${string}` custom tier. */
export type AllergenId = typeof ALLERGEN_CATALOG[number]['id'] | `other:${string}`;

/** Allergen ids that carry a reintroduction protocol — derived from the records. */
export type ProtocolAllergenId = Extract<typeof ALLERGEN_CATALOG[number], { protocol: object }>['id'];

/** All known subitem ids — derived from the records; widens automatically when subitems are added. */
export type SubitemId = typeof ALLERGEN_CATALOG[number]['subitems'][number];
