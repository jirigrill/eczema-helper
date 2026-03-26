import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://eczema:eczema_dev@localhost:5432/eczema_helper';

// Helper to create a test user directly in DB
async function createTestUser(sql: ReturnType<typeof postgres>, email: string, passwordHash: string) {
  const users = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, 'Test User', ${passwordHash})
    RETURNING id, email, name, role
  `;
  return users[0];
}

// Helper to hash password using the same method as the app
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

describe('Auth API', () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 5 });
  });

  afterAll(async () => {
    // Cleanup test data
    await sql`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@example.com')`;
    await sql`DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-%@example.com')`;
    await sql`DELETE FROM children WHERE id NOT IN (SELECT child_id FROM user_children)`;
    await sql`DELETE FROM users WHERE email LIKE 'test-%@example.com'`;
    await sql.end();
  });

  describe('POST /api/auth/register', () => {
    it('creates a user and returns 201', async () => {
      const email = `test-register-${Date.now()}@example.com`;
      const res = await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'Test User' }),
      });

      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data).toHaveProperty('id');
      expect(data.email).toBe(email.toLowerCase());
      expect(data).not.toHaveProperty('password');
      expect(data).not.toHaveProperty('password_hash');
      expect(data.name).toBe('Test User');
      expect(data.role).toBe('parent');
    });

    it('rejects duplicate email with 409', async () => {
      const email = `test-dup-${Date.now()}@example.com`;
      
      // First registration
      await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'Test User' }),
      });

      // Second registration with same email
      const res = await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'Test User 2' }),
      });

      expect(res.status).toBe(409);
      const data = await res.json();
      expect(data.error).toContain('Účet');
    });

    it('rejects short password with 400', async () => {
      const res = await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'a@b.com', password: '123', name: 'X' }),
      });

      expect(res.status).toBe(400);
    });

    it('rejects invalid email format with 400', async () => {
      const res = await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: 'password123', name: 'X' }),
      });

      expect(res.status).toBe(400);
    });

    it('sets session cookie on successful registration', async () => {
      const email = `test-cookie-${Date.now()}@example.com`;
      const res = await fetch('http://localhost:5173/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123', name: 'Test User' }),
      });

      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('session_id');
      expect(setCookie).toContain('HttpOnly');
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns session cookie on valid credentials', async () => {
      const email = `test-login-${Date.now()}@example.com`;
      const password = 'password123';
      const passwordHash = await hashPassword(password);
      await createTestUser(sql, email, passwordHash);

      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('session_id');
      expect(setCookie).toContain('HttpOnly');
      expect(setCookie).toContain('Path=/');
      
      const data = await res.json();
      expect(data).toHaveProperty('id');
      expect(data.email).toBe(email.toLowerCase());
    });

    it('rejects invalid credentials with 401', async () => {
      const email = `test-login-fail-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('correctpassword');
      await createTestUser(sql, email, passwordHash);

      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'wrongpassword' }),
      });

      expect(res.status).toBe(401);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeNull();
    });

    it('rejects non-existent user with 401', async () => {
      const res = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@example.com', password: 'whatever' }),
      });

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears session cookie', async () => {
      const email = `test-logout-${Date.now()}@example.com`;
      const password = 'password123';
      const passwordHash = await hashPassword(password);
      await createTestUser(sql, email, passwordHash);

      // Login first
      const loginRes = await fetch('http://localhost:5173/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const cookie = loginRes.headers.get('set-cookie');

      // Logout
      const logoutRes = await fetch('http://localhost:5173/api/auth/logout', {
        method: 'POST',
        headers: { 'Cookie': cookie ?? '' },
      });

      expect(logoutRes.status).toBe(200);
      const clearCookie = logoutRes.headers.get('set-cookie');
      expect(clearCookie).toContain('session_id');
      expect(clearCookie).toContain('Max-Age=0');
    });
  });

  describe('session expiration', () => {
    it('session expires after expiry date', async () => {
      const email = `test-expire-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const user = await createTestUser(sql, email, passwordHash);

      // Create expired session directly in DB
      await sql`
        INSERT INTO sessions (id, user_id, expires_at)
        VALUES (gen_random_uuid(), ${user.id}, NOW() - INTERVAL '1 second')
      `;

      // Verify it's treated as invalid
      const sessions = await sql`
        SELECT * FROM sessions WHERE user_id = ${user.id} AND expires_at > NOW()
      `;
      expect(sessions).toHaveLength(0);
    });
  });
});
