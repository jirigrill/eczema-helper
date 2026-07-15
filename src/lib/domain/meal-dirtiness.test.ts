import { describe, it, expect } from 'vitest';
import { snapshotOf, snapshotsEqual } from './meal-dirtiness';
import type { MealSnapshot } from './meal-dirtiness';
import { fromMealItems } from '$lib/domain/working-meal';
import type { MealItem } from '$lib/domain/models';

// ── Fixtures ──────────────────────────────────────────────────

const brambory: MealItem = {
  id: 'i-1',
  name: 'Brambory',
  foodId: 'brambory',
  amount: 'portion',
};

const mrkev: MealItem = {
  id: 'i-2',
  name: 'Mrkev',
  foodId: 'mrkev',
  amount: 'portion',
};

const mrkevRaw: MealItem = { ...mrkev, id: 'i-3', preparationMethod: 'raw' };
const mrkevBoiled: MealItem = { ...mrkev, id: 'i-4', preparationMethod: 'boiled' };

describe('snapshotsEqual', () => {
  it('treats reordered items as equal (order-independent)', () => {
    const a: MealSnapshot = {
      items: [
        { name: 'Brambory', foodId: 'brambory', amount: 'portion', preparationMethod: undefined },
        { name: 'Mrkev', foodId: 'mrkev', amount: 'portion', preparationMethod: undefined },
      ],
      notes: '',
    };
    const b: MealSnapshot = {
      items: [
        { name: 'Mrkev', foodId: 'mrkev', amount: 'portion', preparationMethod: undefined },
        { name: 'Brambory', foodId: 'brambory', amount: 'portion', preparationMethod: undefined },
      ],
      notes: '',
    };

    expect(snapshotsEqual(a, b)).toBe(true);
  });

  it('detects a different amount on an otherwise identical item', () => {
    const a: MealSnapshot = {
      items: [{ name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      notes: '',
    };
    const b: MealSnapshot = {
      items: [{ name: 'Brambory', foodId: 'brambory', amount: 'spoon' }],
      notes: '',
    };

    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it('detects a different preparation method on an otherwise identical item', () => {
    const a: MealSnapshot = {
      items: [{ name: 'Mrkev', foodId: 'mrkev', amount: 'portion', preparationMethod: 'raw' }],
      notes: '',
    };
    const b: MealSnapshot = {
      items: [{ name: 'Mrkev', foodId: 'mrkev', amount: 'portion', preparationMethod: 'boiled' }],
      notes: '',
    };

    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it('treats preparationMethod undefined as different from a set value', () => {
    const a: MealSnapshot = {
      items: [{ name: 'Mrkev', foodId: 'mrkev', amount: 'portion' }],
      notes: '',
    };
    const b: MealSnapshot = {
      items: [{ name: 'Mrkev', foodId: 'mrkev', amount: 'portion', preparationMethod: 'raw' }],
      notes: '',
    };

    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it('treats missing preparationMethod key as equal to explicit undefined', () => {
    const a: MealSnapshot = {
      items: [{ name: 'Mrkev', foodId: 'mrkev', amount: 'portion' }],
      notes: '',
    };
    const b: MealSnapshot = {
      items: [{ name: 'Mrkev', foodId: 'mrkev', amount: 'portion', preparationMethod: undefined }],
      notes: '',
    };

    expect(snapshotsEqual(a, b)).toBe(true);
  });

  it('detects a differing item count (subset vs superset)', () => {
    const a: MealSnapshot = {
      items: [{ name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      notes: '',
    };
    const b: MealSnapshot = {
      items: [
        { name: 'Brambory', foodId: 'brambory', amount: 'portion' },
        { name: 'Mrkev', foodId: 'mrkev', amount: 'portion' },
      ],
      notes: '',
    };

    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it('detects different notes when items are identical', () => {
    const a: MealSnapshot = {
      items: [{ name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      notes: 'before',
    };
    const b: MealSnapshot = {
      items: [{ name: 'Brambory', foodId: 'brambory', amount: 'portion' }],
      notes: 'after',
    };

    expect(snapshotsEqual(a, b)).toBe(false);
  });

  it('treats two empty snapshots as equal', () => {
    expect(snapshotsEqual({ items: [], notes: '' }, { items: [], notes: '' })).toBe(true);
  });
});

describe('snapshotOf', () => {
  it('trims leading/trailing whitespace on notes so padding does not flip dirty', () => {
    const meal = fromMealItems([brambory]);
    const padded = snapshotOf(meal, '  hello  ');
    const clean = snapshotOf(meal, 'hello');

    expect(padded.notes).toBe('hello');
    expect(snapshotsEqual(padded, clean)).toBe(true);
  });

  it('strips the per-call random id so two projections of the same working meal compare equal', () => {
    // `toMealItems` mints a fresh UUID for every call — the snapshot must
    // project the item to a shape whose equality does not depend on that id.
    const meal = fromMealItems([brambory, mrkevBoiled]);
    const a = snapshotOf(meal, '');
    const b = snapshotOf(meal, '');

    expect(snapshotsEqual(a, b)).toBe(true);
  });

  it('projects amount and preparation onto the snapshot item', () => {
    const meal = fromMealItems([mrkevRaw]);
    const snap = snapshotOf(meal, '');

    expect(snap.items).toHaveLength(1);
    expect(snap.items[0]).toMatchObject({
      foodId: 'mrkev',
      name: 'Mrkev',
      amount: 'portion',
      preparationMethod: 'raw',
    });
  });

  it('treats whitespace-only notes as equal to empty', () => {
    const meal = fromMealItems([brambory]);
    const spaces = snapshotOf(meal, '   ');
    const empty = snapshotOf(meal, '');

    expect(snapshotsEqual(spaces, empty)).toBe(true);
  });
});
