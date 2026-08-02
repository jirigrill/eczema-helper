import { describe, expect, it } from 'vitest';

import { earlierLoggedDate } from './earliest-logged';

describe('earlierLoggedDate', () => {
  it('is null when both repositories are empty', () => {
    expect(earlierLoggedDate(null, null)).toBe(null);
  });

  it('is the meal date when only meals are logged', () => {
    expect(earlierLoggedDate('2026-06-03', null)).toBe('2026-06-03');
  });

  it('is the skin date when only skin is logged', () => {
    expect(earlierLoggedDate(null, '2026-06-03')).toBe('2026-06-03');
  });

  it('is the earlier of the two when both are logged', () => {
    expect(earlierLoggedDate('2026-06-05', '2026-06-02')).toBe('2026-06-02');
    expect(earlierLoggedDate('2026-06-02', '2026-06-05')).toBe('2026-06-02');
  });
});
