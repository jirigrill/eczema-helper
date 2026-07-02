import { describe, it, expect } from 'vitest';
import { mealId, parseMealId } from './models';

describe('mealId', () => {
  it('joins date and mealType with a colon', () => {
    expect(mealId('2026-05-27', 'lunch')).toBe('2026-05-27:lunch');
  });

  it('round-trips through parseMealId', () => {
    const id = mealId('2026-05-27', 'breakfast');
    expect(parseMealId(id)).toEqual({ date: '2026-05-27', mealType: 'breakfast' });
  });

  it('rejects transposed args at compile time', () => {
    // Compile-time proof: an arbitrary date string is not assignable to the
    // MealType parameter — swapping (date, mealType) → (mealType, date) fails
    // tsc without a cast. Runtime assertion is incidental; @ts-expect-error is
    // the actual test — it fails the build if the error goes away.
    // @ts-expect-error '2026-05-27' is not assignable to MealType
    expect(mealId('lunch', '2026-05-27')).toBe('lunch:2026-05-27');
  });
});
