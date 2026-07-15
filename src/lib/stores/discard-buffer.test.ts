import { describe, it, expect, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { discardBuffer, writeBuffer, clearBuffer } from './discard-buffer';
import type { WorkingMeal } from '$lib/domain/working-meal';
import { emptyWorkingMeal, startEditing, confirmFood } from '$lib/domain/working-meal';

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
    writeBuffer({
      kind: 'meal-compose',
      workingMeal: meal,
      mealType: 'lunch',
      date: '2026-01-01',
      returnTo: '/day/2026-01-01',
    });
    const buf = get(discardBuffer);
    expect(buf).not.toBeNull();
    if (
      buf &&
      (buf.kind === 'meal-compose' || buf.kind === 'meal-edit' || buf.kind === 'meal-delete')
    ) {
      expect(buf.workingMeal).toEqual(meal);
    } else {
      throw new Error('expected meal-* kind');
    }
  });

  it('clearBuffer resets to null', () => {
    writeBuffer({
      kind: 'meal-compose',
      workingMeal: mealWithConfirmed(),
      mealType: 'lunch',
      date: '2026-01-01',
      returnTo: '/day/2026-01-01',
    });
    clearBuffer();
    expect(get(discardBuffer)).toBeNull();
  });

  it('stores mealType and returnTo alongside the working meal', () => {
    writeBuffer({
      kind: 'meal-compose',
      workingMeal: mealWithConfirmed(),
      mealType: 'breakfast',
      date: '2026-06-12',
      returnTo: '/day/2026-06-12',
    });
    const buf = get(discardBuffer);
    if (buf && buf.kind === 'meal-compose') {
      expect(buf.mealType).toBe('breakfast');
      expect(buf.returnTo).toBe('/day/2026-06-12');
      expect(buf.date).toBe('2026-06-12');
    } else {
      throw new Error('expected meal-compose kind');
    }
  });

  it('subsequent writeBuffer overwrites the previous snapshot', () => {
    writeBuffer({
      kind: 'meal-compose',
      workingMeal: mealWithConfirmed(),
      mealType: 'lunch',
      date: '2026-01-01',
      returnTo: '/a',
    });
    const fresh = mealWithConfirmed();
    writeBuffer({
      kind: 'meal-compose',
      workingMeal: fresh,
      mealType: 'dinner',
      date: '2026-01-02',
      returnTo: '/b',
    });
    const buf = get(discardBuffer);
    if (buf && buf.kind === 'meal-compose') {
      expect(buf.mealType).toBe('dinner');
      expect(buf.returnTo).toBe('/b');
    } else {
      throw new Error('expected meal-compose kind');
    }
  });

  // ── kind discriminator (issue #277 / ADR-0021 amendment) ─────────
  // The toast in `+layout.svelte` switches its message off `kind`, not
  // off context the layout doesn't have. The buffer is the source of
  // truth for "what just happened" — compose-new vs edit vs delete
  // across meal and skin domains.

  it('round-trips kind="meal-compose" — back-out of a fresh meal draft', () => {
    writeBuffer({
      kind: 'meal-compose',
      workingMeal: mealWithConfirmed(),
      mealType: 'lunch',
      date: '2026-01-01',
      returnTo: '/day/2026-01-01',
    });
    expect(get(discardBuffer)?.kind).toBe('meal-compose');
  });

  it('round-trips kind="meal-edit" — back-out of a dirty meal edit', () => {
    writeBuffer({
      kind: 'meal-edit',
      workingMeal: mealWithConfirmed(),
      mealType: 'lunch',
      date: '2026-01-01',
      returnTo: '/day/2026-01-01',
    });
    expect(get(discardBuffer)?.kind).toBe('meal-edit');
  });

  it('round-trips kind="meal-delete" — explicit meal delete with undo', () => {
    writeBuffer({
      kind: 'meal-delete',
      workingMeal: mealWithConfirmed(),
      mealType: 'lunch',
      date: '2026-01-01',
      returnTo: '/day/2026-01-01',
    });
    expect(get(discardBuffer)?.kind).toBe('meal-delete');
  });

  it('round-trips kind="skin-edit" — dirty skin observation edit', () => {
    writeBuffer({
      kind: 'skin-edit',
      observationId: 'obs-1',
      observation: {
        id: 'obs-1',
        date: '2026-01-01',
        createdAt: '2026-01-01T09:00:00.000Z',
        regions: [],
      },
      addPhotos: [],
      removePhotoIds: [],
      date: '2026-01-01',
      returnTo: '/day/2026-01-01',
    });
    const buf = get(discardBuffer);
    if (buf?.kind === 'skin-edit') {
      expect(buf.observationId).toBe('obs-1');
      expect(buf.addPhotos).toEqual([]);
      expect(buf.removePhotoIds).toEqual([]);
    } else {
      throw new Error('expected skin-edit kind');
    }
  });

  it('round-trips kind="skin-delete" — carries the photo blobs for undo', () => {
    const blob = new Blob(['x'], { type: 'image/jpeg' });
    writeBuffer({
      kind: 'skin-delete',
      observationId: 'obs-2',
      observation: {
        id: 'obs-2',
        date: '2026-01-02',
        createdAt: '2026-01-02T10:00:00.000Z',
        regions: [],
      },
      addPhotos: [],
      removePhotoIds: [],
      photoBlobs: [
        {
          id: 'photo-1',
          observationId: 'obs-2',
          region: 'face',
          capturedAt: '2026-01-02T10:00:00.000Z',
          blob,
        },
      ],
      date: '2026-01-02',
      returnTo: '/day/2026-01-02',
    });
    const buf = get(discardBuffer);
    if (buf?.kind === 'skin-delete') {
      expect(buf.observationId).toBe('obs-2');
      expect(buf.photoBlobs).toHaveLength(1);
    } else {
      throw new Error('expected skin-delete kind');
    }
  });
});
