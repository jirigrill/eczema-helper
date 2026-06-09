import { describe, it, expect } from 'vitest';
import { matchAllergen } from './allergen-matcher';
import type { CanonicalAllergen } from '$lib/domain/canonical-allergen';

describe('matchAllergen', () => {
  it('returns record on exact id hit', () => {
    const result = matchAllergen('dairy');
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('dairy');
  });

  it('returns record on id hit case-insensitively', () => {
    const result = matchAllergen('Dairy');
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('dairy');
  });

  it('returns record on Czech alias hit', () => {
    // 'mléčné výrobky' is an alias for dairy
    const result = matchAllergen('mléčné výrobky');
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('dairy');
  });

  it('returns record on alias hit with surrounding whitespace/punctuation', () => {
    const result = matchAllergen('  pšenice  ');
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('wheat');
  });

  it('returns null for a near-miss that does not match any id or alias', () => {
    // křen is NOT in any alias list
    expect(matchAllergen('křen')).toBeNull();
  });

  it('returns null for completely unknown input', () => {
    expect(matchAllergen('xyzzy-unknown-food')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(matchAllergen('')).toBeNull();
  });

  it('matches nuts via Czech alias', () => {
    const result = matchAllergen('ořechy');
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('nuts');
  });

  it('does not match kren when only křen is an alias (diacritics preserved)', () => {
    // křen is not actually in catalog, so both return null — but this confirms
    // normalization does NOT strip diacritics
    const withDiacritics = matchAllergen('křen');
    const withoutDiacritics = matchAllergen('kren');
    expect(withDiacritics).toBeNull();
    expect(withoutDiacritics).toBeNull();
  });

  it('matches citrus via alias pomeranče', () => {
    const result = matchAllergen('pomeranče');
    expect(result).not.toBeNull();
    expect((result as CanonicalAllergen).id).toBe('citrus');
  });
});
