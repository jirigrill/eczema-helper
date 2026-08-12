import { describe, expect, it } from 'vitest';

import { normalizeKey } from './normalize-key';

describe('normalizeKey', () => {
  it('lowercases Czech characters', () => {
    expect(normalizeKey('Špenát')).toBe('špenát');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeKey('  křen  ')).toBe('křen');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeKey('hroznové  víno')).toBe('hroznové víno');
  });

  it('strips leading/trailing non-letter characters', () => {
    expect(normalizeKey('--špenát--')).toBe('špenát');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeKey('   ')).toBe('');
  });
});
