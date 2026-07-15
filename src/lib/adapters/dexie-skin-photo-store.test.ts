import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { DexieSkinPhotoStore } from './dexie-skin-photo-store';
import { AtopicDb } from '$lib/db/atopic-db';
import type { SkinPhoto } from '$lib/domain/models';

// ── Helpers ───────────────────────────────────────────────────

function makePhoto(observationId: string, overrides?: Partial<SkinPhoto>): SkinPhoto {
  return {
    id: `photo-${observationId}`,
    observationId,
    region: 'face',
    capturedAt: '2026-05-27T08:00:00.000Z',
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

  // ── listByObservationId ──────────────────────────────────────

  it('listByObservationId returns empty array when no photos exist', async () => {
    const result = await store.listByObservationId('obs-none');
    expect(result).toEqual({ ok: true, data: [] });
  });

  it('listByObservationId returns photos scoped to that observationId', async () => {
    const photo = makePhoto('obs-1');
    await db.photos.put(photo);
    const result = await store.listByObservationId('obs-1');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe(photo.id);
    }
  });

  it('listByObservationId excludes photos from other observations', async () => {
    await db.photos.put(makePhoto('obs-a', { id: 'photo-a' }));
    await db.photos.put(makePhoto('obs-b', { id: 'photo-b' }));

    const result = await store.listByObservationId('obs-a');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]!.id).toBe('photo-a');
    }
  });

  it('listByObservationId returns all photos for the same observation', async () => {
    await db.photos.put(makePhoto('obs-multi', { id: 'photo-1' }));
    await db.photos.put(makePhoto('obs-multi', { id: 'photo-2', region: 'arms' }));

    const result = await store.listByObservationId('obs-multi');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data).toHaveLength(2);
      expect(result.data.map((p) => p.id).sort()).toEqual(['photo-1', 'photo-2']);
    }
  });

  // ── Blob round-trip ──────────────────────────────────────────
  // fake-indexeddb does not implement the full structured-clone algorithm for Blob,
  // so these tests verify the field is present; content fidelity is a browser-runtime guarantee.

  it('Blob field is present after round-trip (non-null)', async () => {
    const photo = makePhoto('obs-blob', { id: 'photo-blob' });
    await db.photos.put(photo);
    const result = await store.listByObservationId('obs-blob');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data[0]!.blob).toBeDefined();
      expect(result.data[0]!.blob).not.toBeNull();
    }
  });

  // ── Scalar field preservation ────────────────────────────────

  it('id, region and capturedAt are preserved exactly', async () => {
    const photo = makePhoto('obs-exact', {
      id: 'photo-exact',
      region: 'belly',
      capturedAt: '2026-05-27T14:22:01.500Z',
    });
    await db.photos.put(photo);
    const result = await store.listByObservationId('obs-exact');
    expect(result).toMatchObject({ ok: true });
    if (result.ok) {
      expect(result.data[0]!.id).toBe('photo-exact');
      expect(result.data[0]!.region).toBe('belly');
      expect(result.data[0]!.capturedAt).toBe('2026-05-27T14:22:01.500Z');
    }
  });

  // ── Error path ────────────────────────────────────────────────

  it('listByObservationId returns Err when DB throws', async () => {
    vi.spyOn(db.photos, 'where').mockImplementation(() => {
      throw new Error('index fail');
    });
    const result = await store.listByObservationId('obs-1');
    expect(result).toEqual({ ok: false, error: 'index fail' });
  });
});
