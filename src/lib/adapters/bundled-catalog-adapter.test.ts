import { describe, it, expect } from 'vitest';
import { BundledCatalogAdapter } from './bundled-catalog-adapter';
import { ALLERGEN_CATALOG } from '$lib/data/allergen-catalog';

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
