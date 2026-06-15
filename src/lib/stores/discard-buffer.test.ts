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
    writeBuffer({ kind: 'compose', workingMeal: meal, mealType: 'lunch', returnTo: '/day/2026-01-01' });
    const buf = get(discardBuffer);
    expect(buf).not.toBeNull();
    expect(buf?.workingMeal).toEqual(meal);
  });

  it('clearBuffer resets to null', () => {
    writeBuffer({ kind: 'compose', workingMeal: mealWithConfirmed(), mealType: 'lunch', returnTo: '/day/2026-01-01' });
    clearBuffer();
    expect(get(discardBuffer)).toBeNull();
  });

  it('stores mealType and returnTo alongside the working meal', () => {
    writeBuffer({ kind: 'compose', workingMeal: mealWithConfirmed(), mealType: 'breakfast', returnTo: '/day/2026-06-12' });
    const buf = get(discardBuffer);
    expect(buf?.mealType).toBe('breakfast');
    expect(buf?.returnTo).toBe('/day/2026-06-12');
  });

  it('subsequent writeBuffer overwrites the previous snapshot', () => {
    writeBuffer({ kind: 'compose', workingMeal: mealWithConfirmed(), mealType: 'lunch', returnTo: '/a' });
    const fresh = mealWithConfirmed();
    writeBuffer({ kind: 'compose', workingMeal: fresh, mealType: 'dinner', returnTo: '/b' });
    const buf = get(discardBuffer);
    expect(buf?.mealType).toBe('dinner');
    expect(buf?.returnTo).toBe('/b');
  });

  // ── kind discriminator (issue #277) ──────────────────────────────
  // The toast in `+layout.svelte` switches its message off `kind`, not
  // off context the layout doesn't have. The buffer is the source of
  // truth for "what just happened" — compose-new vs edit vs delete.

  it('round-trips kind="compose" — back-out of a fresh draft', () => {
    writeBuffer({ kind: 'compose', workingMeal: mealWithConfirmed(), mealType: 'lunch', returnTo: '/day/2026-01-01' });
    expect(get(discardBuffer)?.kind).toBe('compose');
  });

  it('round-trips kind="edit" — back-out of a dirty edit', () => {
    writeBuffer({ kind: 'edit', workingMeal: mealWithConfirmed(), mealType: 'lunch', returnTo: '/day/2026-01-01' });
    expect(get(discardBuffer)?.kind).toBe('edit');
  });

  it('round-trips kind="delete" — explicit delete with undo', () => {
    writeBuffer({ kind: 'delete', workingMeal: mealWithConfirmed(), mealType: 'lunch', returnTo: '/day/2026-01-01' });
    expect(get(discardBuffer)?.kind).toBe('delete');
  });
});
