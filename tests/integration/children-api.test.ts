import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://eczema:eczema_dev@localhost:5432/eczema_helper';

// Helper to create test user
async function createTestUser(sql: ReturnType<typeof postgres>, email: string) {
  const bcrypt = await import('bcryptjs');
  const passwordHash = await bcrypt.hash('password123', 12);
  const users = await sql`
    INSERT INTO users (email, name, password_hash)
    VALUES (${email}, 'Test User', ${passwordHash})
    RETURNING id
  `;
  return users[0];
}

// Helper to create session and get cookie
async function loginAndGetCookie(_sql: ReturnType<typeof postgres>, email: string): Promise<string> {
  const res = await fetch('http://localhost:5173/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'password123' }),
  });
  if (!res.ok) {
    throw new Error(`Login failed: ${res.status} ${res.statusText}`);
  }
  const cookie = res.headers.get('set-cookie');
  if (!cookie) {
    throw new Error('No session cookie returned');
  }
  return cookie;
}

describe('Children API', () => {
  let sql: ReturnType<typeof postgres>;

  // Helper to clean up test data - called in both beforeAll and afterAll
  // This handles the crash scenario where afterAll never runs
  async function cleanupTestData() {
    // Cleanup test data in correct order to respect foreign key constraints
    // 1. Delete sessions first (references users)
    await sql`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-child-%@example.com')`;
    // 2. Delete user_children junction table (references both users and children)
    await sql`DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-child-%@example.com')`;
    // 3. Delete orphaned children (those with no user_children entries, created recently)
    await sql`
      DELETE FROM children
      WHERE id NOT IN (SELECT DISTINCT child_id FROM user_children)
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    // 4. Finally delete users
    await sql`DELETE FROM users WHERE email LIKE 'test-child-%@example.com'`;
  }

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 5 });
    // Clean up any leftover test data from previous crashed runs
    await cleanupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await sql.end();
  });

  describe('GET /api/children', () => {
    it('returns empty array for new user', async () => {
      const email = `test-child-empty-${Date.now()}@example.com`;
      await createTestUser(sql, email);
      const cookie = await loginAndGetCookie(sql, email);

      const res = await fetch('http://localhost:5173/api/children', {
        headers: { 'Cookie': cookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data).toHaveLength(0);
    });

    it('returns created children', async () => {
      const email = `test-child-list-${Date.now()}@example.com`;
      const user = await createTestUser(sql, email);
      const cookie = await loginAndGetCookie(sql, email);

      // Create children directly
      const child1 = await sql`
        INSERT INTO children (name, birth_date) VALUES ('Emma', '2025-12-01') RETURNING id
      `;
      const child2 = await sql`
        INSERT INTO children (name, birth_date) VALUES ('Oliver', '2026-01-15') RETURNING id
      `;
      await sql`INSERT INTO user_children (user_id, child_id) VALUES (${user.id}, ${child1[0].id})`;
      await sql`INSERT INTO user_children (user_id, child_id) VALUES (${user.id}, ${child2[0].id})`;

      const res = await fetch('http://localhost:5173/api/children', {
        headers: { 'Cookie': cookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveLength(2);
    });
  });

  describe('POST /api/children', () => {
    it('creates a child and returns 201', async () => {
      const email = `test-child-create-${Date.now()}@example.com`;
      await createTestUser(sql, email);
      const cookie = await loginAndGetCookie(sql, email);

      const res = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Emma', birthDate: '2025-12-01' }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('id');
      expect(json.data.name).toBe('Emma');
      expect(json.data.birthDate).toMatch(/^2025-12-01/); // Allow ISO format or simple date
      expect(json.data).toHaveProperty('createdAt');
      expect(json.data).toHaveProperty('updatedAt');
    });

    it('rejects missing name', async () => {
      const email = `test-child-noname-${Date.now()}@example.com`;
      await createTestUser(sql, email);
      const cookie = await loginAndGetCookie(sql, email);

      const res = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: '', birthDate: '2025-12-01' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('rejects invalid birth date', async () => {
      const email = `test-child-baddate-${Date.now()}@example.com`;
      await createTestUser(sql, email);
      const cookie = await loginAndGetCookie(sql, email);

      const res = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Emma', birthDate: 'invalid-date' }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('requires authentication', async () => {
      const res = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Emma', birthDate: '2025-12-01' }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('UNAUTHORIZED');
    });
  });

  describe('PUT /api/children/[id]', () => {
    it('updates child name', async () => {
      const email = `test-child-update-${Date.now()}@example.com`;
      await createTestUser(sql, email);
      const cookie = await loginAndGetCookie(sql, email);

      // Create child first
      const createRes = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Emma', birthDate: '2025-12-01' }),
      });
      const createJson = await createRes.json();

      // Update
      const res = await fetch(`http://localhost:5173/api/children/${createJson.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Emmy' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.name).toBe('Emmy');
    });

    it('rejects access to another users child with 403', async () => {
      // User A
      const emailA = `test-child-usera-${Date.now()}@example.com`;
      await createTestUser(sql, emailA);
      const cookieA = await loginAndGetCookie(sql, emailA);

      // User B
      const emailB = `test-child-userb-${Date.now()}@example.com`;
      await createTestUser(sql, emailB);
      const cookieB = await loginAndGetCookie(sql, emailB);

      // User A creates child
      const createRes = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
        body: JSON.stringify({ name: 'ChildA', birthDate: '2025-12-01' }),
      });
      const createJson = await createRes.json();

      // User B tries to update
      const res = await fetch(`http://localhost:5173/api/children/${createJson.data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieB },
        body: JSON.stringify({ name: 'Stolen Child' }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('FORBIDDEN');
    });
  });

  describe('DELETE /api/children/[id]', () => {
    it('removes the child and returns 200', async () => {
      const email = `test-child-delete-${Date.now()}@example.com`;
      await createTestUser(sql, email);
      const cookie = await loginAndGetCookie(sql, email);

      // Create child
      const createRes = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookie },
        body: JSON.stringify({ name: 'Temp', birthDate: '2025-12-01' }),
      });
      const createJson = await createRes.json();

      // Delete
      const deleteRes = await fetch(`http://localhost:5173/api/children/${createJson.data.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookie },
      });

      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.ok).toBe(true);

      // Verify deleted
      const listRes = await fetch('http://localhost:5173/api/children', {
        headers: { 'Cookie': cookie },
      });
      const listJson = await listRes.json();
      expect(listJson.data).toHaveLength(0);
    });

    it('rejects access to another users child with 403', async () => {
      // User A
      const emailA = `test-child-dela-${Date.now()}@example.com`;
      await createTestUser(sql, emailA);
      const cookieA = await loginAndGetCookie(sql, emailA);

      // User B
      const emailB = `test-child-delb-${Date.now()}@example.com`;
      await createTestUser(sql, emailB);
      const cookieB = await loginAndGetCookie(sql, emailB);

      // User A creates child
      const createRes = await fetch('http://localhost:5173/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cookie': cookieA },
        body: JSON.stringify({ name: 'ChildA', birthDate: '2025-12-01' }),
      });
      const createJson = await createRes.json();

      // User B tries to delete
      const res = await fetch(`http://localhost:5173/api/children/${createJson.data.id}`, {
        method: 'DELETE',
        headers: { 'Cookie': cookieB },
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('FORBIDDEN');
    });
  });
});
