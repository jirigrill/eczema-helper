import { describe, it, expect, vi } from 'vitest';
import { shouldRunSessionCleanup } from './session';

describe('session utilities', () => {
  describe('shouldRunSessionCleanup', () => {
    it('returns boolean', () => {
      const result = shouldRunSessionCleanup();
      expect(typeof result).toBe('boolean');
    });

    it('returns true approximately 1% of the time', () => {
      // Mock Math.random to test the threshold behavior
      const originalRandom = Math.random;

      // Test below threshold (should return true)
      Math.random = vi.fn(() => 0.005);
      expect(shouldRunSessionCleanup()).toBe(true);

      // Test at threshold (should return false)
      Math.random = vi.fn(() => 0.01);
      expect(shouldRunSessionCleanup()).toBe(false);

      // Test above threshold (should return false)
      Math.random = vi.fn(() => 0.5);
      expect(shouldRunSessionCleanup()).toBe(false);

      // Restore original
      Math.random = originalRandom;
    });

    it('has approximately 1% probability over many calls', () => {
      const iterations = 10000;
      let trueCount = 0;

      for (let i = 0; i < iterations; i++) {
        if (shouldRunSessionCleanup()) {
          trueCount++;
        }
      }

      const percentage = (trueCount / iterations) * 100;
      // Allow for statistical variance (0.5% to 1.5%)
      expect(percentage).toBeGreaterThan(0.5);
      expect(percentage).toBeLessThan(1.5);
    });
  });
});
