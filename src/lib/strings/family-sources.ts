import type { FamilyId } from '$lib/data/allergen-catalog/allergen-catalog';

export type SourceGroup = {
  /** Matches `Food.sourceGroup`. */
  key: string;
  /** Czech header label. */
  label: string;
};

/**
 * Per-family ordered list of source subgroups (ADR-0019).
 * Array order is render order. Only families large enough to benefit need an
 * entry; missing families render flat.
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
} as const satisfies Partial<Record<FamilyId, readonly SourceGroup[]>>;

/** Czech label for the trailing unsourced bucket. */
export const ostatniLabel = 'Ostatní';
