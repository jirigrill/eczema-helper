import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './auth';

describe('auth utilities', () => {
  describe('hashPassword', () => {
    it('returns a bcrypt hash', async () => {
      const hash = await hashPassword('testpass123');
      expect(hash).toMatch(/^\$2[ab]\$/);
      expect(hash.length).toBeGreaterThan(50);
    });

    it('produces unique hashes for same input', async () => {
      const hash1 = await hashPassword('samepassword');
      const hash2 = await hashPassword('samepassword');
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string (bcrypt can hash it)', async () => {
      const hash = await hashPassword('');
      expect(hash).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('verifyPassword', () => {
    it('succeeds with correct password', async () => {
      const password = 'mypassword';
      const hash = await hashPassword(password);
      const valid = await verifyPassword(password, hash);
      expect(valid).toBe(true);
    });

    it('fails with incorrect password', async () => {
      const password = 'mypassword';
      const hash = await hashPassword(password);
      const valid = await verifyPassword('wrongpassword', hash);
      expect(valid).toBe(false);
    });

    it('fails with wrong hash', async () => {
      const valid = await verifyPassword('test123', '$2b$12$abcdefghijklmnopqrstuuiwxyz1234567890AB');
      expect(valid).toBe(false);
    });
  });
});
