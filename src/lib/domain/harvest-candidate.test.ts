import { describe, expect, it } from 'vitest';

import { mergeCandidate, normalizeKey } from './harvest-candidate';
import type { HarvestCandidate } from './harvest-candidate';

// ── Fixtures ──────────────────────────────────────────────────────────────────

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

// ── First observation ─────────────────────────────────────────────────────────

describe('mergeCandidate — first observation (existing = null)', () => {
  it('creates a new candidate with count 1', () => {
    const result = mergeCandidate(null, 'Křen', 'křen', '2026-06-01T10:00:00.000Z');
    expect(result.count).toBe(1);
  });

  it('sets normalizedKey from the provided normalized form', () => {
    const result = mergeCandidate(null, 'Křen', 'křen', '2026-06-01T10:00:00.000Z');
    expect(result.normalizedKey).toBe('křen');
  });

  it('sets status to pending', () => {
    const result = mergeCandidate(null, 'Křen', 'křen', '2026-06-01T10:00:00.000Z');
    expect(result.status).toBe('pending');
  });

  it('sets firstSeen and lastSeen to the given timestamp', () => {
    const ts = '2026-06-01T10:00:00.000Z';
    const result = mergeCandidate(null, 'Křen', 'křen', ts);
    expect(result.firstSeen).toBe(ts);
    expect(result.lastSeen).toBe(ts);
  });

  it('sets rawForms to [raw]', () => {
    const result = mergeCandidate(null, 'Křen', 'křen', '2026-06-01T10:00:00.000Z');
    expect(result.rawForms).toEqual(['Křen']);
  });

  it('trims raw form before storing', () => {
    const result = mergeCandidate(null, '  Křen  ', 'křen', '2026-06-01T10:00:00.000Z');
    expect(result.rawForms).toEqual(['Křen']);
  });
});

// ── Repeat observation ────────────────────────────────────────────────────────

describe('mergeCandidate — repeat observation (existing != null)', () => {
  it('increments count by 1', () => {
    const existing = makeCandidate({ count: 3 });
    const result = mergeCandidate(existing, 'Křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.count).toBe(4);
  });

  it('updates lastSeen to the new timestamp', () => {
    const existing = makeCandidate({ lastSeen: '2026-06-01T10:00:00.000Z' });
    const result = mergeCandidate(existing, 'Křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.lastSeen).toBe('2026-06-02T09:00:00.000Z');
  });

  it('does NOT change firstSeen', () => {
    const firstSeen = '2026-06-01T10:00:00.000Z';
    const existing = makeCandidate({ firstSeen });
    const result = mergeCandidate(existing, 'Křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.firstSeen).toBe(firstSeen);
  });

  it('appends a new raw form', () => {
    const existing = makeCandidate({ rawForms: ['Křen'] });
    const result = mergeCandidate(existing, 'křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.rawForms).toContain('křen');
    expect(result.rawForms).toHaveLength(2);
  });

  it('does NOT append a duplicate raw form', () => {
    const existing = makeCandidate({ rawForms: ['Křen'] });
    const result = mergeCandidate(existing, 'Křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.rawForms).toEqual(['Křen']);
    expect(result.rawForms).toHaveLength(1);
  });

  it('does not append trimmed duplicate raw form', () => {
    const existing = makeCandidate({ rawForms: ['Křen'] });
    const result = mergeCandidate(existing, '  Křen  ', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.rawForms).toHaveLength(1);
  });

  it('preserves existing status through a repeat observation', () => {
    const existing = makeCandidate({ status: 'ingested' });
    const result = mergeCandidate(existing, 'Křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.status).toBe('ingested');
  });

  it('preserves normalizedKey exactly', () => {
    const existing = makeCandidate({ normalizedKey: 'křen' });
    const result = mergeCandidate(existing, 'Křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(result.normalizedKey).toBe('křen');
  });

  it('accumulates multiple distinct raw forms over several observations', () => {
    let candidate = mergeCandidate(null, 'Křen', 'křen', '2026-06-01T10:00:00.000Z');
    candidate = mergeCandidate(candidate, 'křen', 'křen', '2026-06-02T09:00:00.000Z');
    candidate = mergeCandidate(candidate, 'KŘEN', 'křen', '2026-06-03T08:00:00.000Z');
    expect(candidate.rawForms).toHaveLength(3);
    expect(candidate.count).toBe(3);
  });
});

// ── Return type immutability ──────────────────────────────────────────────────

describe('mergeCandidate — immutability', () => {
  it('does not mutate the existing candidate', () => {
    const existing = makeCandidate({ count: 2, rawForms: ['Křen'] });
    const original = { ...existing, rawForms: [...existing.rawForms] };
    mergeCandidate(existing, 'křen', 'křen', '2026-06-02T09:00:00.000Z');
    expect(existing.count).toBe(original.count);
    expect(existing.rawForms).toEqual(original.rawForms);
  });
});

// ── normalizeKey ──────────────────────────────────────────────────────────────

describe('normalizeKey', () => {
  it('lowercases Czech characters', () => {
    expect(normalizeKey('Špenát')).toBe('špenát');
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeKey('  křen  ')).toBe('křen');
  });

  it('collapses internal whitespace', () => {
    expect(normalizeKey('hroznové  víno')).toBe('hroznové víno');
  });

  it('strips leading/trailing non-letter characters', () => {
    expect(normalizeKey('--špenát--')).toBe('špenát');
  });

  it('returns empty string for whitespace-only input', () => {
    expect(normalizeKey('   ')).toBe('');
  });
});
