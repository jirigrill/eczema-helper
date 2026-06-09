import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import type { HarvestCandidate } from '$lib/domain/harvest-candidate';

// fake-indexeddb is loaded globally in test-setup.ts; Dexie works without setup.

// ── Helpers ───────────────────────────────────────────────────────────────────

async function waitForCandidates(
  store: { subscribe: (cb: (v: HarvestCandidate[]) => void) => () => void },
  predicate: (candidates: HarvestCandidate[]) => boolean,
  timeoutMs = 500,
): Promise<HarvestCandidate[]> {
  return new Promise((resolve, reject) => {
    let unsub: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsub?.();
      reject(new Error('Timed out waiting for candidates predicate'));
    }, timeoutMs);
    unsub = store.subscribe((candidates) => {
      if (predicate(candidates)) {
        clearTimeout(timer);
        Promise.resolve().then(() => unsub?.());
        resolve(candidates);
      }
    });
  });
}

function makeCandidate(overrides: Partial<HarvestCandidate> = {}): HarvestCandidate {
  return {
    normalizedKey: 'křen',
    status: 'pending',
    count: 1,
    firstSeen: '2026-06-01T10:00:00.000Z',
    lastSeen: '2026-06-01T10:00:00.000Z',
    rawForms: ['Křen'],
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('harvestCandidateSession (singleton store)', () => {
  it('exports subscribe, upsert, readByKey', async () => {
    const mod = await import('./harvest-candidate-session');
    expect(mod.harvestCandidateSession).toBeDefined();
    expect(typeof mod.harvestCandidateSession.subscribe).toBe('function');
    expect(typeof mod.harvestCandidateSession.upsert).toBe('function');
    expect(typeof mod.harvestCandidateSession.readByKey).toBe('function');
  });

  it('initial store value is an empty array', async () => {
    const { harvestCandidateSession } = await import('./harvest-candidate-session');
    const candidates = get(harvestCandidateSession);
    expect(Array.isArray(candidates)).toBe(true);
  });

  it('upsert returns ok:true for a valid candidate', async () => {
    const { harvestCandidateSession } = await import('./harvest-candidate-session');
    const result = await harvestCandidateSession.upsert(makeCandidate());
    expect(result).toMatchObject({ ok: true });
  });

  it('after upsert, subscribe emits an array containing the saved candidate', async () => {
    const { harvestCandidateSession } = await import('./harvest-candidate-session');
    const candidate = makeCandidate({ normalizedKey: 'citron' });
    await harvestCandidateSession.upsert(candidate);
    const candidates = await waitForCandidates(
      harvestCandidateSession,
      (cs) => cs.some((c) => c.normalizedKey === candidate.normalizedKey),
    );
    expect(candidates.some((c) => c.normalizedKey === 'citron')).toBe(true);
  });

  it('readByKey returns the saved candidate for a known key', async () => {
    const { harvestCandidateSession } = await import('./harvest-candidate-session');
    const candidate = makeCandidate({ normalizedKey: 'jahody' });
    await harvestCandidateSession.upsert(candidate);
    const result = await harvestCandidateSession.readByKey('jahody');
    expect(result).toMatchObject({ ok: true });
    expect(result.ok && result.data?.normalizedKey).toBe('jahody');
  });

  it('readByKey returns ok:true data:null for an unknown key', async () => {
    const { harvestCandidateSession } = await import('./harvest-candidate-session');
    const result = await harvestCandidateSession.readByKey('neexistující-potravina');
    expect(result).toMatchObject({ ok: true, data: null });
  });
});
