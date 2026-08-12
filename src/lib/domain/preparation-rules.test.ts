import { describe, expect, it } from 'vitest';

import type { FoodId } from '$lib/data/allergen-catalog/allergen-catalog';

import { preparationsForFood } from './preparation-rules';

describe('preparationsForFood', () => {
  it('returns the catalog preparation list for a known food', () => {
    // losos (salmon) is smokeable and fry-able
    expect(preparationsForFood('losos')).toEqual(['raw', 'boiled', 'baked', 'smoked', 'fried']);
  });

  it('offers dried but not fried for a dried-fruit-capable fruit', () => {
    // banán: you dry it and stew it (compote), you never fry it
    expect(preparationsForFood('banan')).toEqual(['raw', 'baked', 'boiled', 'dried']);
  });

  it('offers only raw for a raw-only food', () => {
    expect(preparationsForFood('listovy-salat')).toEqual(['raw']);
  });

  it('offers nothing for a no-preparation food', () => {
    expect(preparationsForFood('sul')).toEqual([]);
  });

  it('offers nothing, rather than a guessed set, for a food id absent from the catalog', () => {
    // A stale persisted row, not an entry path. This stays total because
    // `fromMealItems` throws on such an id, so no meal reaching the editor
    // holds one — the two compose rather than each guessing a fallback.
    // Cast past the narrowed `FoodId`: this exercises the runtime `Array.find`
    // miss the type system can no longer produce from a valid caller.
    expect(preparationsForFood('totally-unknown-id' as FoodId)).toEqual([]);
  });
});
