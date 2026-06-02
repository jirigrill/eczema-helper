import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import type { SkinPhoto } from '$lib/domain/models';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForPhotos(
  store: { subscribe: (cb: (v: SkinPhoto[]) => void) => () => void },
  predicate: (rows: SkinPhoto[]) => boolean,
  timeoutMs = 500,
): Promise<SkinPhoto[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for photos predicate'));
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

const today = new Date().toISOString().slice(0, 10);

function makePhoto(overrides: Partial<SkinPhoto> = {}): SkinPhoto {
  return {
    id: `photo-${today}`,
    date: today,
    capturedAt: new Date().toISOString(),
    blob: new Blob(['img'], { type: 'image/jpeg' }),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('skinPhotoSession', () => {
  it('exports subscribe and save', async () => {
    const mod = await import('./skin-photo-session');
    expect(mod.skinPhotoSession).toBeDefined();
    expect(typeof mod.skinPhotoSession.subscribe).toBe('function');
    expect(typeof mod.skinPhotoSession.save).toBe('function');
  });

  it('initial store value is an array', async () => {
    const { skinPhotoSession } = await import('./skin-photo-session');
    const rows = get(skinPhotoSession);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('save returns ok:true for a valid photo', async () => {
    const { skinPhotoSession } = await import('./skin-photo-session');
    const result = await skinPhotoSession.save(makePhoto());
    expect(result).toMatchObject({ ok: true });
  });

  it('after save, subscribe emits an array containing the saved photo', async () => {
    const { skinPhotoSession } = await import('./skin-photo-session');
    const photo = makePhoto({ id: `photo-${today}-extra` });
    await skinPhotoSession.save(photo);
    const rows = await waitForPhotos(
      skinPhotoSession,
      (rs) => rs.some((r) => r.id === photo.id),
    );
    expect(rows.some((r) => r.id === photo.id)).toBe(true);
  });

  it('photos for other dates are excluded from the subscription', async () => {
    const { skinPhotoSession } = await import('./skin-photo-session');
    const pastPhoto = makePhoto({ id: 'photo-past', date: '2000-01-01' });
    await skinPhotoSession.save(pastPhoto);
    const rows = await waitForPhotos(skinPhotoSession, () => true);
    expect(rows.some((r) => r.id === 'photo-past')).toBe(false);
  });
});
