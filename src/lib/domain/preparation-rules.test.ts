import { describe, expect, it } from 'vitest';

import { preparationsForFood } from './preparation-rules';

describe('preparationsForFood', () => {
  it('returns the catalog preparation list for a known food', () => {
    // losos (salmon) is smokeable but not fried-in-the-log sense
    expect(preparationsForFood('losos')).toEqual(['raw', 'boiled', 'baked', 'smoked']);
  });

  it('offers dried but not fried for a dried-fruit-capable fruit', () => {
    // banán: you dry it, you never fry it
    expect(preparationsForFood('banan')).toEqual(['raw', 'baked', 'dried']);
  });

  it('offers only raw for a raw-only food', () => {
    expect(preparationsForFood('listovy-salat')).toEqual(['raw']);
  });

  it('offers nothing for a no-preparation food', () => {
    expect(preparationsForFood('sul')).toEqual([]);
  });

  it('defaults custom (other:*) and unknown foods to the permissive everyday set', () => {
    expect(preparationsForFood('other:moje-jidlo')).toEqual(['raw', 'boiled', 'baked', 'fried']);
    expect(preparationsForFood('totally-unknown-id')).toEqual(['raw', 'boiled', 'baked', 'fried']);
  });
});
