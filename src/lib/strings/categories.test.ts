import { describe, it, expect } from 'vitest';
import { categoryStrings, subitemStrings } from './categories';
import { ALLERGENS } from '$lib/data/allergen-catalog/allergen-catalog';

describe('categoryStrings', () => {
  it('covers every CatalogAllergenId', () => {
    for (const allergen of ALLERGENS) {
      expect(categoryStrings, `categoryStrings missing entry for '${allergen.id}'`).toHaveProperty(
        allergen.id,
      );
    }
  });

  it('every entry has a non-empty name', () => {
    for (const [id, entry] of Object.entries(categoryStrings)) {
      expect(
        typeof entry.name === 'string' && entry.name.length > 0,
        `categoryStrings['${id}'].name is empty`,
      ).toBe(true);
    }
  });
});

describe('subitemStrings', () => {
  it('every key is in allergenId:subitem format', () => {
    for (const key of Object.keys(subitemStrings)) {
      expect(
        key.includes(':') && !key.startsWith('other:'),
        `subitemStrings key '${key}' does not follow allergenId:subitem format`,
      ).toBe(true);
    }
  });

  it('every allergenId prefix in subitemStrings is a known CatalogAllergenId', () => {
    const knownAllergenIds = new Set(ALLERGENS.map((a) => a.id));
    for (const key of Object.keys(subitemStrings)) {
      const allergenId = key.split(':')[0];
      expect(
        knownAllergenIds,
        `subitemStrings key '${key}' references unknown allergenId '${allergenId}'`,
      ).toContain(allergenId);
    }
  });

  it('every value is a non-empty Czech string', () => {
    for (const [key, value] of Object.entries(subitemStrings)) {
      expect(
        typeof value === 'string' && value.length > 0,
        `subitemStrings['${key}'] is empty`,
      ).toBe(true);
    }
  });
});
