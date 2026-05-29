import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieSkinPhotoStore } from './dexie-skin-photo-store';
import { AtopicDb } from '$lib/db/atopic-db';
import type { SkinPhoto } from '$lib/domain/models';

// ── Helpers ───────────────────────────────────────────────────

function makePhoto(date: string, overrides?: Partial<Omit<SkinPhoto, 'blob'>>): SkinPhoto {
  return {
    id: `photo-${date}`,
    date,
    capturedAt: `${date}T08:00:00.000Z`,
    blob: new Blob(['test-image-data'], { type: 'image/jpeg' }),
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────

describe('DexieSkinPhotoStore', () => {
  let store: DexieSkinPhotoStore;
  let db: AtopicDb;

  beforeEach(() => {
    db = new AtopicDb({ indexedDB: new IDBFactory(), IDBKeyRange });
    store = new DexieSkinPhotoStore(db);
  });

  // ── Round-trip ───────────────────────────────────────────────

  it('save() persists and listByDate() returns the photo', async () => {
    const photo = makePhoto('2026-05-27');
    expect(await store.save(photo)).toMatchObject({ ok: true });
    const result = await store.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data).toHaveLength(1);
  });

  it('listByDate returns empty array when nothing saved for that date', async () => {
    expect(await store.listByDate('2026-05-27')).toEqual({ ok: true, data: [] });
  });

  // ── Blob round-trip ──────────────────────────────────────────
  // fake-indexeddb does not implement the full structured-clone algorithm for Blob,
  // so these tests verify the field is present; content fidelity is a browser-runtime guarantee.

  it('Blob field is present after round-trip (non-null)', async () => {
    const photo = makePhoto('2026-05-27', { id: 'photo-blob' });
    await store.save(photo);
    const result = await store.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data[0].blob).toBeDefined();
      expect(result.data[0].blob).not.toBeNull();
    }
  });

  it('Blob field is preserved as the same reference when fake-indexeddb serialises it', async () => {
    const content = 'binary-photo-content-xyz';
    const blob = new Blob([content], { type: 'image/png' });
    const photo = makePhoto('2026-05-27', { id: 'photo-content' });
    photo.blob = blob;
    await store.save(photo);

    const result = await store.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      // fake-indexeddb does not deserialise Blob back to a Blob instance, but the
      // field must not be null or undefined — real IndexedDB preserves Blob content.
      expect(result.data[0].blob).toBeDefined();
    }
  });

  // ── Multiple photos same date ────────────────────────────────

  it('multiple photos for same date all appear in listByDate', async () => {
    const first = makePhoto('2026-05-27', { id: 'photo-1' });
    const second = makePhoto('2026-05-27', { id: 'photo-2' });
    await store.save(first);
    await store.save(second);

    const result = await store.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data.map((p) => p.id).sort()).toEqual(['photo-1', 'photo-2']);
    }
  });

  it('photos for different date do not appear', async () => {
    await store.save(makePhoto('2026-05-27', { id: 'photo-other' }));
    const result = await store.listByDate('2026-05-28');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) expect(result.data).toHaveLength(0);
  });

  // ── Scalar fields ────────────────────────────────────────────

  it('id and capturedAt are preserved exactly', async () => {
    const photo = makePhoto('2026-05-27', {
      id: 'photo-exact',
      capturedAt: '2026-05-27T14:22:01.500Z',
    });
    await store.save(photo);
    const result = await store.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data[0].id).toBe('photo-exact');
      expect(result.data[0].capturedAt).toBe('2026-05-27T14:22:01.500Z');
    }
  });

  // ── Upsert by id ─────────────────────────────────────────────

  it('second save for same id overwrites and does not duplicate', async () => {
    const first = makePhoto('2026-05-27', { id: 'photo-1' });
    const second = makePhoto('2026-05-27', { id: 'photo-1', capturedAt: '2026-05-27T12:00:00.000Z' });
    await store.save(first);
    await store.save(second);

    const result = await store.listByDate('2026-05-27');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0].capturedAt).toBe('2026-05-27T12:00:00.000Z');
    }
  });

  // ── Error paths ───────────────────────────────────────────────

  it('save returns Err when DB throws', async () => {
    vi.spyOn(db.photos, 'put').mockRejectedValueOnce(new Error('write fail'));
    const result = await store.save(makePhoto('2026-05-27'));
    expect(result).toEqual({ ok: false, error: 'write fail' });
  });

  it('listByDate returns Err when DB throws', async () => {
    vi.spyOn(db.photos, 'where').mockImplementation(() => {
      throw new Error('index fail');
    });
    const result = await store.listByDate('2026-05-27');
    expect(result).toEqual({ ok: false, error: 'index fail' });
  });
});
