import { describe, it, expect } from 'vitest';
import { ladderStepStrings } from './ladder';
import { ALLERGENS } from '$lib/data/allergen-catalog/allergen-catalog';

describe('ladderStepStrings', () => {
  it('provides a Czech dose caption for every rung authored on every ALLERGENS ladder', () => {
    for (const allergen of ALLERGENS) {
      if (!('ladder' in allergen) || !allergen.ladder) continue;
      for (const step of allergen.ladder.steps) {
        const entry = (ladderStepStrings as Record<string, { dose: string }>)[step.id];
        expect(entry, `missing caption for ${step.id}`).toBeDefined();
        expect(entry.dose.length, `empty caption for ${step.id}`).toBeGreaterThan(0);
      }
    }
  });

  // Note: the compile-time guarantee that a *missing* rung caption is a build
  // failure is enforced by the `satisfies Record<LadderStepId, LadderStepStrings>`
  // clause in ladder.ts; adding a rung to the catalog without a caption fails
  // `bunx tsc --noEmit`. That is asserted through CI, not runtime.
});
