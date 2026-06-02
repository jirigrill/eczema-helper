import { describe, it, expect } from 'vitest';
import { resolveRouteDate } from './route-date';

describe('resolveRouteDate', () => {
  const protocolStart = '2025-06-01';
  const today = '2025-06-10';

  it('returns the param unchanged when it is a valid in-range date', () => {
    const result = resolveRouteDate('2025-06-05', protocolStart, today);
    expect(result).toEqual({ type: 'date', date: '2025-06-05' });
  });

  it('returns redirect sentinel for a malformed string', () => {
    const result = resolveRouteDate('not-a-date', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('returns redirect for an empty string', () => {
    const result = resolveRouteDate('', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('returns redirect for a future date', () => {
    const result = resolveRouteDate('2025-12-31', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('returns redirect for a date before protocolStart', () => {
    const result = resolveRouteDate('2025-05-15', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });

  it('accepts today as a valid date', () => {
    const result = resolveRouteDate(today, protocolStart, today);
    expect(result).toEqual({ type: 'date', date: today });
  });

  it('accepts protocolStart as a valid date', () => {
    const result = resolveRouteDate(protocolStart, protocolStart, today);
    expect(result).toEqual({ type: 'date', date: protocolStart });
  });

  it('rejects date with wrong format (missing day)', () => {
    const result = resolveRouteDate('2025-06', protocolStart, today);
    expect(result).toEqual({ type: 'redirect', to: today });
  });
});
