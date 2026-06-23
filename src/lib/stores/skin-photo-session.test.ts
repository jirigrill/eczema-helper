import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';

// Photos are now saved atomically through DexieSkinObservationRepository.save.
// skin-photo-session is a read-only stub that returns an empty array while
// the day-view photo panel awaits re-wiring in the final slice.

describe('skinPhotoSession (stub)', () => {
  it('exports subscribe', async () => {
    const mod = await import('./skin-photo-session');
    expect(mod.skinPhotoSession).toBeDefined();
    expect(typeof mod.skinPhotoSession.subscribe).toBe('function');
  });

  it('initial store value is an empty array', async () => {
    const { skinPhotoSession } = await import('./skin-photo-session');
    const rows = get(skinPhotoSession);
    expect(Array.isArray(rows)).toBe(true);
    expect(rows).toHaveLength(0);
  });
});

describe('createSkinPhotoSession (factory stub)', () => {
  it('exports createSkinPhotoSession function', async () => {
    const mod = await import('./skin-photo-session');
    expect(typeof mod.createSkinPhotoSession).toBe('function');
  });

  it('factory returns a store with subscribe', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const session = createSkinPhotoSession('2024-01-15');
    expect(typeof session.subscribe).toBe('function');
  });

  it('factory store always returns an empty array (stub)', async () => {
    const { createSkinPhotoSession } = await import('./skin-photo-session');
    const session = createSkinPhotoSession('2024-07-04');
    const rows = get(session);
    expect(rows).toEqual([]);
  });
});
