import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';

export type SourceGroup = {
  /** Matches `Food.sourceGroup`. */
  key: string;
  /** Czech header label. */
  label: string;
};

/**
 * Per-family ordered list of source subgroups (ADR-0019).
 *
 * Array order is the *curated* render order (editorial, frequency-biased —
 * the group most-encountered in everyday CZ use comes first). Foods inside
 * each group are sorted alphabetically by Czech name at render time
 * (`FamilyDrillIn.svelte`).
 *
 * The render layer additionally sinks fully-eliminated groups to the bottom:
 * a group whose every food carries an eliminated allergen renders below
 * non-eliminated groups, so the parent on an active protocol scrolls less
 * for the foods they actually log. Stable sort preserves curated order
 * among non-eliminated groups.
 *
 * Only families large enough to benefit need an entry; missing families
 * render flat (alphabetical).
 */
export const familySources = {
  dairy: [
    { key: 'cow',   label: 'Kravské'   },
    { key: 'sheep', label: 'Ovčí'      },
    { key: 'goat',  label: 'Kozí'      },
    { key: 'plant', label: 'Rostlinné' },
  ],
  grains: [
    { key: 'gluten',       label: 'S lepkem' },
    { key: 'gluten-free',  label: 'Bez lepku' },
  ],
  fruit: [
    { key: 'tuzemske',   label: 'Tuzemské'   },
    { key: 'bobuloviny', label: 'Bobuloviny' },
    { key: 'citrusy',    label: 'Citrusy'    },
    { key: 'exoticke',   label: 'Exotické'   },
  ],
  'nuts-seeds': [
    { key: 'orechy',  label: 'Ořechy'   },
    { key: 'seminka', label: 'Semínka'  },
  ],
  'fish-seafood': [
    { key: 'ryby',       label: 'Ryby'        },
    { key: 'plody-more', label: 'Plody moře'  },
  ],
  vegetables: [
    { key: 'korenova',  label: 'Kořenová'  },
    { key: 'listova',   label: 'Listová'   },
    { key: 'plodova',   label: 'Plodová'   },
    { key: 'cibulova',  label: 'Cibulová'  },
    { key: 'hlizova',   label: 'Hlízová'   },
    { key: 'kostalova', label: 'Košťálová' },
  ],
} as const satisfies Partial<Record<FamilyId, readonly SourceGroup[]>>;

/** Czech label for the trailing unsourced bucket. */
export const ostatniLabel = 'Ostatní';
