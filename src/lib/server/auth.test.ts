import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './auth';

describe('auth utilities', () => {
  describe('hashPassword', () => {
    it('returns a bcrypt hash', async () => {
      const hash = await hashPassword('testpass123');
      // bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      expect(hash.length).toBeGreaterThanOrEqual(59); // Standard bcrypt length
    });

    it('produces unique hashes for same input', async () => {
      const hash1 = await hashPassword('samepassword');
      const hash2 = await hashPassword('samepassword');
      expect(hash1).not.toBe(hash2);
    });

    it('handles empty string (bcrypt can hash it)', async () => {
      const hash = await hashPassword('');
      // bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/);
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
