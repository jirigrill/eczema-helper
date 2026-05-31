import { describe, it, expect } from 'vitest';
import { dnyCs } from './common';

describe('dnyCs', () => {
  it('returns "1 den" for 1', () => {
    expect(dnyCs(1)).toBe('1 den');
  });

  it('returns dny form for 2–4', () => {
    expect(dnyCs(2)).toBe('2 dny');
    expect(dnyCs(3)).toBe('3 dny');
    expect(dnyCs(4)).toBe('4 dny');
  });

  it('returns dní form for 5 and above', () => {
    expect(dnyCs(5)).toBe('5 dní');
    expect(dnyCs(10)).toBe('10 dní');
    expect(dnyCs(999)).toBe('999 dní');
  });

  it('returns dní form for 0', () => {
    expect(dnyCs(0)).toBe('0 dní');
  });
});
