import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import {
  discardBuffer,
  writeBuffer,
  clearBuffer,
} from './discard-buffer';
import type { WorkingMeal } from '$lib/domain/working-meal';
import {
  emptyWorkingMeal,
  startEditing,
  confirmFood,
} from '$lib/domain/working-meal';

const FAM = 'dairy' as const;

function mealWithConfirmed(): WorkingMeal {
  let m = startEditing(emptyWorkingMeal(), FAM, 'kravske-mleko', 'Kravské mléko');
  m = confirmFood(m, FAM, 'kravske-mleko');
  return m;
}

beforeEach(() => {
  clearBuffer();
});

describe('discardBuffer store', () => {
  it('starts as null', () => {
    expect(get(discardBuffer)).toBeNull();
  });

  it('writeBuffer stores a WorkingMeal snapshot', () => {
    const meal = mealWithConfirmed();
    writeBuffer({ workingMeal: meal, mealType: 'lunch', returnTo: '/day/2026-01-01' });
    const buf = get(discardBuffer);
    expect(buf).not.toBeNull();
    expect(buf?.workingMeal).toEqual(meal);
  });

  it('clearBuffer resets to null', () => {
    writeBuffer({ workingMeal: mealWithConfirmed(), mealType: 'lunch', returnTo: '/day/2026-01-01' });
    clearBuffer();
    expect(get(discardBuffer)).toBeNull();
  });

  it('stores mealType and returnTo alongside the working meal', () => {
    writeBuffer({ workingMeal: mealWithConfirmed(), mealType: 'breakfast', returnTo: '/day/2026-06-12' });
    const buf = get(discardBuffer);
    expect(buf?.mealType).toBe('breakfast');
    expect(buf?.returnTo).toBe('/day/2026-06-12');
  });

  it('subsequent writeBuffer overwrites the previous snapshot', () => {
    writeBuffer({ workingMeal: mealWithConfirmed(), mealType: 'lunch', returnTo: '/a' });
    const fresh = mealWithConfirmed();
    writeBuffer({ workingMeal: fresh, mealType: 'dinner', returnTo: '/b' });
    const buf = get(discardBuffer);
    expect(buf?.mealType).toBe('dinner');
    expect(buf?.returnTo).toBe('/b');
  });
});
