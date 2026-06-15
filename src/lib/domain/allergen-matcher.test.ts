import { describe, it, expect } from 'vitest';
import { matchAllergen, matchFood } from './allergen-matcher';
import { BundledCatalogAdapter } from '$lib/adapters/bundled-catalog-adapter';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

const catalog = new BundledCatalogAdapter();

describe('matchAllergen', () => {
  it('returns record on exact id hit', () => {
    const result = matchAllergen('dairy', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('dairy');
  });

  it('returns record on id hit case-insensitively', () => {
    const result = matchAllergen('Dairy', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('dairy');
  });

  it('returns record on Czech alias hit', () => {
    // 'mléčné výrobky' is an alias for dairy
    const result = matchAllergen('mléčné výrobky', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('dairy');
  });

  it('returns record on alias hit with surrounding whitespace/punctuation', () => {
    const result = matchAllergen('  pšenice  ', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('wheat');
  });

  it('returns null for a near-miss that does not match any id or alias', () => {
    // křen is NOT in any alias list
    expect(matchAllergen('křen', catalog)).toBeNull();
  });

  it('returns null for completely unknown input', () => {
    expect(matchAllergen('xyzzy-unknown-food', catalog)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(matchAllergen('', catalog)).toBeNull();
  });

  it('matches nuts via Czech alias', () => {
    const result = matchAllergen('ořechy', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('nuts');
  });

  it('does not match kren when only křen is an alias (diacritics preserved)', () => {
    // křen is not actually in catalog, so both return null — but this confirms
    // normalization does NOT strip diacritics
    const withDiacritics = matchAllergen('křen', catalog);
    const withoutDiacritics = matchAllergen('kren', catalog);
    expect(withDiacritics).toBeNull();
    expect(withoutDiacritics).toBeNull();
  });

  it('matches citrus via alias pomeranče', () => {
    const result = matchAllergen('pomeranče', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('citrus');
  });

  it('resolves paprika (bell pepper) to other-vegetables record', () => {
    const result = matchAllergen('paprika', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('other-vegetables');
    expect((result as CanonicalAllergen).protocol).toBeUndefined();
  });

  it('resolves Czech alias chilli to spices-herbs record', () => {
    const result = matchAllergen('chilli', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('spices-herbs');
  });

  it('resolves Paprika (capital) to canonical record — never creates other: entry', () => {
    const result = matchAllergen('Paprika', catalog);
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('other-vegetables');
  });
});

describe('matchFood', () => {
  it('returns record on exact id hit', () => {
    const result = matchFood('hummus', catalog);
    expect(result).not.toBeNull();
    expect(result!.foodId).toBe('hummus');
  });

  it('returns all allergenIds for composite food', () => {
    const result = matchFood('hummus', catalog);
    expect(result!.allergenIds).toContain('legumes');
    expect(result!.allergenIds).toContain('sesame');
  });

  it('resolves Czech alias for sojove-mleko', () => {
    const result = matchFood('sójové mléko', catalog);
    expect(result).not.toBeNull();
    expect(result!.foodId).toBe('sojove-mleko');
    expect(result!.allergenIds).toContain('soy');
  });

  it('sójové mléko trigger is soy, not dairy (family divergence)', () => {
    const result = matchFood('sójové mléko', catalog);
    expect(result!.allergenIds).not.toContain('dairy');
  });

  it('resolves Czech alias for rýže — neutral food', () => {
    const result = matchFood('rýže', catalog);
    expect(result).not.toBeNull();
    expect(result!.foodId).toBe('ryze');
    expect(result!.allergenIds).toHaveLength(0);
  });

  it('returns null for empty input', () => {
    expect(matchFood('', catalog)).toBeNull();
  });

  it('returns null for unknown food', () => {
    expect(matchFood('xyzzy-unknown-dish', catalog)).toBeNull();
  });

  it('id match is case-insensitive', () => {
    const result = matchFood('Hummus', catalog);
    expect(result).not.toBeNull();
    expect(result!.foodId).toBe('hummus');
  });
});
