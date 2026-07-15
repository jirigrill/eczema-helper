import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';

import { db } from '$lib/db/atopic-db';
import type { SkinObservation, SkinPhoto } from '$lib/domain/models';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.
// The session joins observations-for-date with photos-by-observationId.

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForRows<T>(
  store: { subscribe: (cb: (v: T[]) => void) => () => void },
  predicate: (rows: T[]) => boolean,
  timeoutMs = 500,
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for rows predicate'));
    }, timeoutMs);
    unsub = store.subscribe((rows) => {
      if (predicate(rows)) {
        clearTimeout(timer);
        Promise.resolve().then(() => unsub?.());
        resolve(rows);
      }
    });
  });
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeObs(id: string, date: string): SkinObservation {
  return {
    id,
    date,
    createdAt: new Date().toISOString(),
    regions: [{ id: 'face', level: 1 }],
  };
}

function makePhoto(
  id: string,
  observationId: string,
  region: SkinPhoto['region'] = 'face',
): SkinPhoto {
  return {
    id,
    observationId,
    region,
    capturedAt: new Date().toISOString(),
    blob: new Blob(['x'], { type: 'image/jpeg' }),
  };
}

// ── Shape (the day view consumes a Readable<SkinPhoto[]> via the factory) ────

describe('createSkinPhotoSession (factory)', () => {
  it('exports createSkinPhotoSession function', async () => {
    const mod = await import('./skin-photo-session');
    expect(typeof mod.createSkinPhotoSession).toBe('function');
  });

  it('factory returns a store with subscribe', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const session = createSkinPhotoSession('2024-01-15');
    expect(typeof session.subscribe).toBe('function');
  });

  it('initial value is an empty array', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const session = createSkinPhotoSession('2030-12-31');
    const rows = get(session);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(0);
  });
});

// ── Join: observations-for-date → photos-by-observationId ────────────────────

describe('createSkinPhotoSession join', () => {
  it('emits photos whose observationId belongs to an observation for that date', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const date = '2025-05-10';
    const obs = makeObs('obs-join-match', date);
    const photo = makePhoto('photo-join-match', obs.id, 'arms');
    await db.skin_observations.put(obs);
    await db.photos.put(photo);

    const session = createSkinPhotoSession(date);
    const rows = await waitForRows(session, (rs) => rs.some((r) => r.id === photo.id));
    expect(rows.some((r) => r.id === photo.id)).toBe(true);
    expect(rows.find((r) => r.id === photo.id)?.region).toBe('arms');
  });

  it('excludes photos whose observation is on a different date', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const targetDate = '2025-05-11';
    const otherDate = '2025-05-12';
    const otherObs = makeObs('obs-join-other', otherDate);
    const otherPhoto = makePhoto('photo-join-other', otherObs.id);
    await db.skin_observations.put(otherObs);
    await db.photos.put(otherPhoto);

    const session = createSkinPhotoSession(targetDate);
    // Let liveQuery settle
    await new Promise((r) => setTimeout(r, 100));
    const rows = get(session);
    expect(rows.some((r) => r.id === otherPhoto.id)).toBe(false);
  });

  it('emits multiple photos when one observation has many photos', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const date = '2025-05-13';
    const obs = makeObs('obs-join-many', date);
    const p1 = makePhoto('photo-many-1', obs.id, 'face');
    const p2 = makePhoto('photo-many-2', obs.id, 'belly');
    await db.skin_observations.put(obs);
    await db.photos.bulkPut([p1, p2]);

    const session = createSkinPhotoSession(date);
    const rows = await waitForRows(
      session,
      (rs) => rs.some((r) => r.id === p1.id) && rs.some((r) => r.id === p2.id),
    );
    expect(rows.map((r) => r.id).sort()).toEqual(
      expect.arrayContaining(['photo-many-1', 'photo-many-2']),
    );
  });

  it('emits photos from multiple observations for the same date', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const date = '2025-05-14';
    const obsA = makeObs('obs-join-A', date);
    const obsB = makeObs('obs-join-B', date);
    const pA = makePhoto('photo-multi-obs-A', obsA.id);
    const pB = makePhoto('photo-multi-obs-B', obsB.id);
    await db.skin_observations.bulkPut([obsA, obsB]);
    await db.photos.bulkPut([pA, pB]);

    const session = createSkinPhotoSession(date);
    const rows = await waitForRows(
      session,
      (rs) => rs.some((r) => r.id === pA.id) && rs.some((r) => r.id === pB.id),
    );
    expect(rows.map((r) => r.id).sort()).toEqual(
      expect.arrayContaining(['photo-multi-obs-A', 'photo-multi-obs-B']),
    );
  });

  it('reflects a subsequent observation+photo write reactively', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const date = '2025-05-15';
    const session = createSkinPhotoSession(date);
    // Settle initial empty emission
    await new Promise((r) => setTimeout(r, 50));

    const obs = makeObs('obs-reactive', date);
    const photo = makePhoto('photo-reactive', obs.id);
    await db.skin_observations.put(obs);
    await db.photos.put(photo);

    const rows = await waitForRows(session, (rs) => rs.some((r) => r.id === photo.id));
    expect(rows.some((r) => r.id === photo.id)).toBe(true);
  });
});
