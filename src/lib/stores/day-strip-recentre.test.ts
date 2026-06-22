import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { dayStripRecentreSignal, pulseRecentreDayStrip } from './day-strip-recentre';

describe('day-strip-recentre signal', () => {
  it('starts at 0', () => {
    // Reset for isolation — other tests may have pulsed it.
    dayStripRecentreSignal.set(0);
    expect(get(dayStripRecentreSignal)).toBe(0);
  });

  it('pulse() increments the counter so each call is observable', () => {
    dayStripRecentreSignal.set(0);
    pulseRecentreDayStrip();
    expect(get(dayStripRecentreSignal)).toBe(1);
    pulseRecentreDayStrip();
    expect(get(dayStripRecentreSignal)).toBe(2);
  });

  it('two consecutive pulses produce two distinct values (counter, not toggle)', () => {
    dayStripRecentreSignal.set(0);
    const seen: number[] = [];
    const unsub = dayStripRecentreSignal.subscribe((v) => seen.push(v));
    pulseRecentreDayStrip();
    pulseRecentreDayStrip();
    unsub();
    // Initial subscribe emits current value (0), then each update.
    expect(seen).toEqual([0, 1, 2]);
  });
});
