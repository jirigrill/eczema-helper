import { describe, it, expect } from 'vitest';
import type { PreparationMethod } from '$lib/domain/models';

describe('preparationStrings', () => {
  it('exports all five PreparationMethod keys with Czech labels', async () => {
    const { preparationStrings } = await import('./preparations');

    const keys: PreparationMethod[] = ['raw', 'boiled', 'steamed', 'baked', 'fried'];
    for (const key of keys) {
      expect(preparationStrings[key]).toBeDefined();
      expect(typeof preparationStrings[key].label).toBe('string');
      expect(preparationStrings[key].label.length).toBeGreaterThan(0);
    }
  });

  it('Czech labels match expected values', async () => {
    const { preparationStrings } = await import('./preparations');

    expect(preparationStrings.raw.label).toBe('Syrové');
    expect(preparationStrings.boiled.label).toBe('Vařené');
    expect(preparationStrings.steamed.label).toBe('Dušené');
    expect(preparationStrings.baked.label).toBe('Pečené');
    expect(preparationStrings.fried.label).toBe('Smažené');
  });
});
