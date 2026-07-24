import { describe, expect, it } from 'vitest';

import { getEligibleActors, mealId, parseMealId } from './models';

describe('mealId', () => {
  it('joins date, mealType and actor with colons', () => {
    expect(mealId('2026-05-27', 'lunch', 'mother')).toBe('2026-05-27:lunch:mother');
  });

  it('round-trips a mother meal through parseMealId', () => {
    const id = mealId('2026-05-27', 'breakfast', 'mother');
    expect(parseMealId(id)).toEqual({ date: '2026-05-27', mealType: 'breakfast', actor: 'mother' });
  });

  it('round-trips a baby meal through parseMealId', () => {
    const id = mealId('2026-05-27', 'breakfast', 'baby');
    expect(parseMealId(id)).toEqual({ date: '2026-05-27', mealType: 'breakfast', actor: 'baby' });
  });

  it('rejects transposed args at compile time', () => {
    // Compile-time proof: an arbitrary date string is not assignable to the
    // MealType parameter — swapping (date, mealType) → (mealType, date) fails
    // tsc without a cast. Runtime assertion is incidental; @ts-expect-error is
    // the actual test — it fails the build if the error goes away.
    // @ts-expect-error '2026-05-27' is not assignable to MealType
    expect(mealId('lunch', '2026-05-27', 'mother')).toBe('lunch:2026-05-27:mother');
  });

  it('requires the actor argument at compile time', () => {
    // @ts-expect-error actor is required — a 2-arg call no longer compiles
    expect(mealId('2026-05-27', 'lunch')).toBeDefined();
  });
});

describe('getEligibleActors', () => {
  it('breastfed → only the mother may log', () => {
    expect(getEligibleActors('breastfed')).toEqual(['mother']);
  });

  it('mixed → both mother and baby may log', () => {
    expect(getEligibleActors('mixed')).toEqual(['mother', 'baby']);
  });

  it('solids → only the baby may log', () => {
    expect(getEligibleActors('solids')).toEqual(['baby']);
  });
});
