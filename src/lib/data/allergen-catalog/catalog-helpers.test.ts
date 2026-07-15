import { describe, expect, it } from 'vitest';

import { allergensByFamily, singleAllergenFamily } from './index';

describe('allergensByFamily', () => {
  it('returns allergens for legumes family (soy + legumes)', () => {
    const result = allergensByFamily('legumes');
    const ids = result.map((a) => a.id);
    expect(ids).toContain('soy');
    expect(ids).toContain('legumes');
  });

  it('returns only the one allergen for single-allergen family', () => {
    const result = allergensByFamily('eggs');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('eggs');
  });

  it('returns empty array for custom family (no allergens)', () => {
    const result = allergensByFamily('custom');
    expect(result).toHaveLength(0);
  });

  it('soy allergen appears under legumes, not dairy', () => {
    const legumes = allergensByFamily('legumes').map((a) => a.id);
    const dairy = allergensByFamily('dairy').map((a) => a.id);
    expect(legumes).toContain('soy');
    expect(dairy).not.toContain('soy');
  });
});

describe('singleAllergenFamily', () => {
  it('returns allergen id for dairy (single-allergen family)', () => {
    expect(singleAllergenFamily('dairy')).toBe('dairy');
  });

  it('returns allergen id for eggs (single-allergen family)', () => {
    expect(singleAllergenFamily('eggs')).toBe('eggs');
  });

  it('returns null for meat (multi-allergen: meat + beef)', () => {
    expect(singleAllergenFamily('meat')).toBeNull();
  });

  it('returns null for legumes (multi-allergen: soy + legumes)', () => {
    expect(singleAllergenFamily('legumes')).toBeNull();
  });

  it('returns null for grains (wheat + corn + grains)', () => {
    expect(singleAllergenFamily('grains')).toBeNull();
  });

  it('returns null for custom family (zero allergens)', () => {
    expect(singleAllergenFamily('custom')).toBeNull();
  });
});
