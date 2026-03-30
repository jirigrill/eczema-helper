import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';
import { getDatabaseUrl } from '../test-utils';

const DATABASE_URL = getDatabaseUrl();

describe('Rate Limiting', () => {
  let sql: ReturnType<typeof postgres>;

  async function cleanupTestData() {
    await sql`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-ratelimit-%@example.com')`;
    await sql`DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-ratelimit-%@example.com')`;
    await sql`DELETE FROM users WHERE email LIKE 'test-ratelimit-%@example.com'`;
  }

  async function createTestUser(email: string, passwordHash: string) {
    const users = await sql`
      INSERT INTO users (email, name, password_hash, failed_login_attempts, locked_until)
      VALUES (${email}, 'Test User', ${passwordHash}, 0, NULL)
      RETURNING id, email
    `;
    return users[0];
  }

  async function hashPassword(password: string): Promise<string> {
    const bcrypt = await import('bcryptjs');
    return bcrypt.hash(password, 12);
  }

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 5 });
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await sql.end();
  });

  describe('login throttling', () => {
    it('allows login attempts when under threshold', async () => {
      const email = `test-ratelimit-under-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('correctpassword');
      await createTestUser(email, passwordHash);

      // First few failed attempts should not lock
      for (let i = 0; i < 3; i++) {
        const res = await fetch('http://localhost:5173/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrongpassword' }),
        });
        expect(res.status).toBe(401); // Invalid credentials, not locked
      }

      // Successful login should still work
      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'correctpassword' }),
      });
      expect(res.status).toBe(200);
    });

    it('locks account after 5 failed attempts', async () => {
      const email = `test-ratelimit-lock-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('correctpassword');
      await createTestUser(email, passwordHash);

      // Make 5 failed login attempts
      for (let i = 0; i < 5; i++) {
        await fetch('http://localhost:5173/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrongpassword' }),
        });
      }

      // 6th attempt should return 429 (rate limited)
      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrongpassword' }),
      });

      expect(res.status).toBe(429);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('RATE_LIMITED');
      expect(json).toHaveProperty('retryAfterSeconds');
      expect(typeof json.retryAfterSeconds).toBe('number');
    });

    it('blocks even correct password when account is locked', async () => {
      const email = `test-ratelimit-lockblock-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('correctpassword');
      await createTestUser(email, passwordHash);

      // Lock the account with 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await fetch('http://localhost:5173/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrongpassword' }),
        });
      }

      // Even correct password should be blocked
      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'correctpassword' }),
      });

      expect(res.status).toBe(429);
    });

    it('resets failed attempts after successful login', async () => {
      const email = `test-ratelimit-reset-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('correctpassword');
      const user = await createTestUser(email, passwordHash);

      // Make 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await fetch('http://localhost:5173/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password: 'wrongpassword' }),
        });
      }

      // Check counter
      const before = await sql`SELECT failed_login_attempts FROM users WHERE id = ${user.id}`;
      expect(before[0].failed_login_attempts).toBe(3);

      // Successful login should reset counter
      await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'correctpassword' }),
      });

      const after = await sql`SELECT failed_login_attempts, locked_until FROM users WHERE id = ${user.id}`;
      expect(after[0].failed_login_attempts).toBe(0);
      expect(after[0].locked_until).toBeNull();
    });

    it('returns generic error message for non-existent email', async () => {
      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nonexistent@example.com', password: 'whatever' }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      // Security: Error message should not reveal whether email exists
      expect(json.error).toContain('Nesprávné přihlašovací údaje');
    });
  });
});
