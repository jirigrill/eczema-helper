import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import type { SkinObservation } from '$lib/domain/models';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForObservations(
  store: { subscribe: (cb: (v: SkinObservation[]) => void) => () => void },
  predicate: (rows: SkinObservation[]) => boolean,
  timeoutMs = 500,
): Promise<SkinObservation[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for observations predicate'));
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

function makeObservation(overrides: Partial<SkinObservation> = {}): SkinObservation {
  return {
    id: `obs-${today}`,
    date: today,
    createdAt: new Date().toISOString(),
    status: 'unchanged',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('skinObservationSession', () => {
  it('exports subscribe and save', async () => {
    const mod = await import('./skin-observation-session');
    expect(mod.skinObservationSession).toBeDefined();
    expect(typeof mod.skinObservationSession.subscribe).toBe('function');
    expect(typeof mod.skinObservationSession.save).toBe('function');
  });

  it('initial store value is an array', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    const rows = get(skinObservationSession);
    expect(Array.isArray(rows)).toBe(true);
  });

  it('save returns ok:true for a valid observation', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    const result = await skinObservationSession.save(makeObservation());
    expect(result).toMatchObject({ ok: true });
  });

  it('after save, subscribe emits an array containing the saved observation', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    const obs = makeObservation({ id: `obs-${today}-improved`, status: 'improved' });
    await skinObservationSession.save(obs);
    const rows = await waitForObservations(
      skinObservationSession,
      (rs) => rs.some((r) => r.id === obs.id),
    );
    expect(rows.some((r) => r.id === obs.id)).toBe(true);
  });

  it('observations for other dates are excluded from the subscription', async () => {
    const { skinObservationSession } = await import('./skin-observation-session');
    // Save an observation with a different (past) date via the store's save method.
    // Because the store filters by today, this should never appear in the subscription.
    const pastObs = makeObservation({ id: 'obs-past', date: '2000-01-01' });
    await skinObservationSession.save(pastObs);
    // Give liveQuery a moment to settle, then verify past row is absent.
    const rows = await waitForObservations(
      skinObservationSession,
      // Pass predicate that is always true so we just wait for any emission.
      () => true,
    );
    expect(rows.some((r) => r.id === 'obs-past')).toBe(false);
  });
});
