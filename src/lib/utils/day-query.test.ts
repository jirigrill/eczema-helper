import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/utils/date', () => ({
  todayIso: () => '2026-06-07',
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe('parseDayQuery', () => {
  async function parse(search: string) {
    const { parseDayQuery } = await import('./day-query');
    return parseDayQuery(new URL(`http://localhost/meal${search}`));
  }

  it('returns todayIso() for date when ?date= is absent', async () => {
    const { date } = await parse('');
    expect(date).toBe('2026-06-07');
  });

  it('returns the given date when ?date= is present', async () => {
    const { date } = await parse('?date=2025-01-15');
    expect(date).toBe('2025-01-15');
  });

  it('returns /day/<date> for returnTo when ?returnTo= is absent', async () => {
    const { returnTo } = await parse('?date=2025-01-15');
    expect(returnTo).toBe('/day/2025-01-15');
  });

  it('returns /day/<today> for returnTo when both params are absent', async () => {
    const { returnTo } = await parse('');
    expect(returnTo).toBe('/day/2026-06-07');
  });

  it('returns the given returnTo when ?returnTo= is present', async () => {
    const { returnTo } = await parse('?returnTo=/program');
    expect(returnTo).toBe('/program');
  });

  it('honours explicit returnTo even when date is also set', async () => {
    const { date, returnTo } = await parse('?date=2025-03-01&returnTo=/program');
    expect(date).toBe('2025-03-01');
    expect(returnTo).toBe('/program');
  });

  it('parses a valid ?actor= into the Actor type', async () => {
    expect((await parse('?actor=baby')).actor).toBe('baby');
    expect((await parse('?actor=mother')).actor).toBe('mother');
  });

  it('leaves actor undefined when ?actor= is absent or not a known Actor', async () => {
    expect((await parse('')).actor).toBeUndefined();
    expect((await parse('?actor=')).actor).toBeUndefined();
    expect((await parse('?actor=dog')).actor).toBeUndefined();
  });
});
