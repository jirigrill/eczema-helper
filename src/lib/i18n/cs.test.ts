import { describe, it, expect } from 'vitest';
import { cs } from './cs';

const REQUIRED_KEYS = [
  'login',
  'logout',
  'register',
  'calendar',
  'food',
  'photos',
  'trends',
  'settings',
  'save',
  'cancel',
  'delete',
  'loading',
  'error'
] as const;

describe('Czech translations', () => {
  it('has all required keys', () => {
    for (const key of REQUIRED_KEYS) {
      expect(cs).toHaveProperty(key);
    }
  });

  it('no translation value is empty string', () => {
    for (const [key, value] of Object.entries(cs)) {
      expect(value, `translation for key "${key}" must not be empty`).not.toBe('');
    }
  });
});
