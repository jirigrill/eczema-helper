import { describe, expect, it } from 'vitest';

import { PREPARATION_METHODS } from '$lib/domain/models';

import { preparationStrings } from './preparations';

describe('preparationStrings', () => {
  it('labels every preparation method (ADR-0028: raw…cured)', () => {
    for (const method of PREPARATION_METHODS) {
      expect(preparationStrings[method]?.label, `missing label for '${method}'`).toBeTruthy();
    }
  });

  it('uses the agreed Czech labels for the specialty preparations', () => {
    expect(preparationStrings.dried.label).toBe('Sušené');
    expect(preparationStrings.smoked.label).toBe('Uzené');
    expect(preparationStrings.cured.label).toBe('Naložené');
  });
});
