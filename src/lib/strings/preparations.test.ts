import { describe, expect, it } from 'vitest';

import { PREPARATION_METHODS } from '$lib/domain/models';

describe('preparationStrings', () => {
  it('exports a Czech label for every PreparationMethod', async () => {
    const { preparationStrings } = await import('./preparations');

    for (const key of PREPARATION_METHODS) {
      expect(preparationStrings[key]).toBeDefined();
      expect(typeof preparationStrings[key].label).toBe('string');
      expect(preparationStrings[key].label.length).toBeGreaterThan(0);
    }
  });

  it('Czech labels match expected values', async () => {
    const { preparationStrings } = await import('./preparations');

    expect(preparationStrings.raw.label).toBe('Syrové');
    expect(preparationStrings.boiled.label).toBe('Vařené');
    expect(preparationStrings.baked.label).toBe('Pečené');
    expect(preparationStrings.fried.label).toBe('Smažené');
  });
});
