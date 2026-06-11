import { describe, it, expect } from 'vitest';
import { BundledCatalogAdapter } from './bundled-catalog-adapter';
import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog';
import { FAMILIES, ALLERGENS, FOODS } from '$lib/data/allergen-catalog/allergen-catalog';

describe('BundledCatalogAdapter', () => {
  const adapter = new BundledCatalogAdapter();

  it('list() returns all catalog records', () => {
    expect(adapter.list()).toHaveLength(ALLERGEN_CATALOG.length);
  });

  it('list() records match ALLERGEN_CATALOG content', () => {
    expect(adapter.list()).toEqual(ALLERGEN_CATALOG);
  });

  it('get() returns the correct record for a known id', () => {
    const record = adapter.get('dairy');
    expect(record).toBeDefined();
    expect(record?.id).toBe('dairy');
  });

  it('get() returns undefined for an unknown id', () => {
    expect(adapter.get('not-a-real-allergen')).toBeUndefined();
  });
});

describe('BundledCatalogAdapter — three-collection methods', () => {
  const adapter = new BundledCatalogAdapter();

  it('listFamilies() returns all 13 families', () => {
    expect(adapter.listFamilies()).toHaveLength(FAMILIES.length);
  });

  it('listFamilies() returns the dairy family', () => {
    const dairy = adapter.listFamilies().find((f) => f.id === 'dairy');
    expect(dairy).toBeDefined();
  });

  it('listAllergens() returns all catalog allergens', () => {
    expect(adapter.listAllergens()).toHaveLength(ALLERGENS.length);
  });

  it('listAllergens() dairy has a protocol', () => {
    const dairy = adapter.listAllergens().find((a) => a.id === 'dairy');
    expect(dairy?.protocol).toBeDefined();
  });

  it('listFoods() returns all food records', () => {
    expect(adapter.listFoods()).toHaveLength(FOODS.length);
  });

  it('allergensForFood(hummus) returns legumes and sesame', () => {
    const result = adapter.allergensForFood('hummus');
    expect(result).toContain('legumes');
    expect(result).toContain('sesame');
    expect(result).toHaveLength(2);
  });

  it('allergensForFood(vejce) returns eggs', () => {
    expect(adapter.allergensForFood('vejce')).toEqual(['eggs']);
  });

  it('allergensForFood(sojove-mleko) returns soy despite living in dairy family', () => {
    expect(adapter.allergensForFood('sojove-mleko')).toEqual(['soy']);
  });

  it('allergensForFood(ryzove-mleko) returns empty array', () => {
    expect(adapter.allergensForFood('ryzove-mleko')).toHaveLength(0);
  });

  it('allergensForFood(unknown-food) returns empty array', () => {
    expect(adapter.allergensForFood('unknown-food')).toHaveLength(0);
  });
});
