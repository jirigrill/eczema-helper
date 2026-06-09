import { describe, it, expect } from 'vitest';
import { normalizeAllergenName } from './allergen-normalizer';

describe('normalizeAllergenName', () => {
  it('lowercases ASCII', () => {
    expect(normalizeAllergenName('Dairy')).toBe('dairy');
  });

  it('lowercases Czech diacritics', () => {
    expect(normalizeAllergenName('Mléko')).toBe('mléko');
  });

  it('trims leading and trailing whitespace', () => {
    expect(normalizeAllergenName('  wheat  ')).toBe('wheat');
  });

  it('collapses internal whitespace to single space', () => {
    expect(normalizeAllergenName('mléčné  výrobky')).toBe('mléčné výrobky');
  });

  it('strips surrounding punctuation', () => {
    expect(normalizeAllergenName('(pšenice)')).toBe('pšenice');
    expect(normalizeAllergenName('...dairy...')).toBe('dairy');
  });

  it('preserves diacritics — křen ≠ kren', () => {
    expect(normalizeAllergenName('křen')).toBe('křen');
    expect(normalizeAllergenName('kren')).toBe('kren');
    expect(normalizeAllergenName('křen')).not.toBe(normalizeAllergenName('kren'));
  });

  it('keeps declensions distinct — no stemming', () => {
    expect(normalizeAllergenName('ořechy')).toBe('ořechy');
    expect(normalizeAllergenName('ořech')).toBe('ořech');
    expect(normalizeAllergenName('ořechy')).not.toBe(normalizeAllergenName('ořech'));
  });

  it('handles empty string', () => {
    expect(normalizeAllergenName('')).toBe('');
  });

  it('handles string of only whitespace/punctuation', () => {
    expect(normalizeAllergenName('  ...  ')).toBe('');
  });
});
