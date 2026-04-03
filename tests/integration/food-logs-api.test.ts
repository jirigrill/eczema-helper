import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { getDatabaseUrl } from '../test-utils';

const DATABASE_URL = getDatabaseUrl();
const BASE_URL = 'http://localhost:5173';

// Helper to hash password
async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

describe('Food Logs API', () => {
  let sql: ReturnType<typeof postgres>;
  let sessionCookie: string;
  let userId: string;
  let childId: string;
  let categoryId: string;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 5 });

    // Clean up any leftover test data
    await cleanupTestData(sql);

    // Create test user
    const email = `test-foodlogs-${Date.now()}@example.com`;
    const passwordHash = await hashPassword('password123');
    const users = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, 'Test User', ${passwordHash})
      RETURNING id
    `;
    userId = users[0].id as string;

    // Create child
    const children = await sql`
      INSERT INTO children (name, birth_date)
      VALUES ('Test Child', '2025-01-15')
      RETURNING id
    `;
    childId = children[0].id as string;

    // Link user to child
    await sql`INSERT INTO user_children (user_id, child_id) VALUES (${userId}, ${childId})`;

    // Get a food category ID
    const categories = await sql`SELECT id FROM food_categories LIMIT 1`;
    categoryId = categories[0].id as string;

    // Login to get session cookie
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    });
    sessionCookie = loginRes.headers.get('set-cookie') ?? '';
  });

  afterAll(async () => {
    await cleanupTestData(sql);
    await sql.end();
  });

  async function cleanupTestData(db: ReturnType<typeof postgres>) {
    await db`DELETE FROM food_logs WHERE child_id IN (
      SELECT child_id FROM user_children WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE 'test-foodlogs-%@example.com'
      )
    )`;
    await db`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-foodlogs-%@example.com')`;
    await db`DELETE FROM user_children WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-foodlogs-%@example.com')`;
    await db`DELETE FROM children WHERE id NOT IN (SELECT DISTINCT child_id FROM user_children) AND created_at > NOW() - INTERVAL '1 hour'`;
    await db`DELETE FROM users WHERE email LIKE 'test-foodlogs-%@example.com'`;
  }

  describe('GET /api/food-logs', () => {
    it('returns empty array for new child', async () => {
      const res = await fetch(
        `${BASE_URL}/api/food-logs?childId=${childId}&startDate=2026-03-01&endDate=2026-03-31`,
        { headers: { Cookie: sessionCookie } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveLength(0);
    });

    it('requires childId parameter', async () => {
      const res = await fetch(
        `${BASE_URL}/api/food-logs?startDate=2026-03-01&endDate=2026-03-31`,
        { headers: { Cookie: sessionCookie } }
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('requires authentication', async () => {
      const res = await fetch(
        `${BASE_URL}/api/food-logs?childId=${childId}&startDate=2026-03-01&endDate=2026-03-31`
      );

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/food-logs', () => {
    it('creates a food log entry', async () => {
      const res = await fetch(`${BASE_URL}/api/food-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          childId,
          categoryId,
          date: '2026-03-20',
          action: 'eliminated',
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('id');
      expect(json.data.childId).toBe(childId);
      expect(json.data.categoryId).toBe(categoryId);
      expect(json.data.action).toBe('eliminated');
      expect(json.data.date).toBe('2026-03-20');
    });

    it('rejects invalid action', async () => {
      const res = await fetch(`${BASE_URL}/api/food-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          childId,
          categoryId,
          date: '2026-03-20',
          action: 'invalid',
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('rejects non-owned child', async () => {
      // Create another user and child
      const otherEmail = `test-other-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const otherUsers = await sql`
        INSERT INTO users (email, name, password_hash)
        VALUES (${otherEmail}, 'Other User', ${passwordHash})
        RETURNING id
      `;
      const otherUserId = otherUsers[0].id as string;
      const otherChildren = await sql`
        INSERT INTO children (name, birth_date)
        VALUES ('Other Child', '2025-02-01')
        RETURNING id
      `;
      const otherChildId = otherChildren[0].id as string;
      await sql`INSERT INTO user_children (user_id, child_id) VALUES (${otherUserId}, ${otherChildId})`;

      // Try to create log for other user's child
      const res = await fetch(`${BASE_URL}/api/food-logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          childId: otherChildId,
          categoryId,
          date: '2026-03-20',
          action: 'eliminated',
        }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('FORBIDDEN');

      // Cleanup
      await sql`DELETE FROM user_children WHERE user_id = ${otherUserId}`;
      await sql`DELETE FROM children WHERE id = ${otherChildId}`;
      await sql`DELETE FROM users WHERE id = ${otherUserId}`;
    });
  });

  describe('GET /api/food-logs (with data)', () => {
    beforeEach(async () => {
      // Clear and create test data
      await sql`DELETE FROM food_logs WHERE child_id = ${childId}`;
      await sql`
        INSERT INTO food_logs (child_id, date, category_id, action, created_by)
        VALUES
          (${childId}, '2026-03-15', ${categoryId}, 'eliminated', ${userId}),
          (${childId}, '2026-03-20', ${categoryId}, 'reintroduced', ${userId}),
          (${childId}, '2026-04-01', ${categoryId}, 'eliminated', ${userId})
      `;
    });

    it('returns entries within date range', async () => {
      const res = await fetch(
        `${BASE_URL}/api/food-logs?childId=${childId}&startDate=2026-03-01&endDate=2026-03-31`,
        { headers: { Cookie: sessionCookie } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveLength(2);
    });

    it('excludes entries outside date range', async () => {
      const res = await fetch(
        `${BASE_URL}/api/food-logs?childId=${childId}&startDate=2026-03-21&endDate=2026-03-31`,
        { headers: { Cookie: sessionCookie } }
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveLength(0);
    });
  });

  describe('PUT /api/food-logs/[id]', () => {
    let logId: string;

    beforeEach(async () => {
      await sql`DELETE FROM food_logs WHERE child_id = ${childId}`;
      const logs = await sql`
        INSERT INTO food_logs (child_id, date, category_id, action, created_by)
        VALUES (${childId}, '2026-03-15', ${categoryId}, 'eliminated', ${userId})
        RETURNING id
      `;
      logId = logs[0].id as string;
    });

    it('updates the action', async () => {
      const res = await fetch(`${BASE_URL}/api/food-logs/${logId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ action: 'reintroduced' }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.action).toBe('reintroduced');
    });

    it('returns 404 for non-existent log', async () => {
      const res = await fetch(`${BASE_URL}/api/food-logs/00000000-0000-0000-0000-000000000000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ action: 'reintroduced' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/food-logs/[id]', () => {
    let logId: string;

    beforeEach(async () => {
      await sql`DELETE FROM food_logs WHERE child_id = ${childId}`;
      const logs = await sql`
        INSERT INTO food_logs (child_id, date, category_id, action, created_by)
        VALUES (${childId}, '2026-03-15', ${categoryId}, 'eliminated', ${userId})
        RETURNING id
      `;
      logId = logs[0].id as string;
    });

    it('removes the entry', async () => {
      const res = await fetch(`${BASE_URL}/api/food-logs/${logId}`, {
        method: 'DELETE',
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);

      // Verify it's gone
      const remaining = await sql`SELECT * FROM food_logs WHERE id = ${logId}`;
      expect(remaining).toHaveLength(0);
    });
  });

  describe('POST /api/food-logs/batch', () => {
    beforeEach(async () => {
      await sql`DELETE FROM food_logs WHERE child_id = ${childId}`;
    });

    it('syncs multiple entries', async () => {
      const logs = [
        {
          id: crypto.randomUUID(),
          childId,
          categoryId,
          date: '2026-03-15',
          action: 'eliminated',
          createdBy: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          childId,
          categoryId,
          date: '2026-03-16',
          action: 'reintroduced',
          createdBy: userId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const res = await fetch(`${BASE_URL}/api/food-logs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ logs }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.syncedCount).toBe(2);

      // Verify they exist
      const dbLogs = await sql`SELECT * FROM food_logs WHERE child_id = ${childId}`;
      expect(dbLogs).toHaveLength(2);
    });

    it('handles upsert correctly', async () => {
      const logId = crypto.randomUUID();

      // First sync
      await fetch(`${BASE_URL}/api/food-logs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          logs: [{
            id: logId,
            childId,
            categoryId,
            date: '2026-03-15',
            action: 'eliminated',
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        }),
      });

      // Second sync with updated action
      const res = await fetch(`${BASE_URL}/api/food-logs/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          logs: [{
            id: logId,
            childId,
            categoryId,
            date: '2026-03-15',
            action: 'reintroduced',
            createdBy: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }],
        }),
      });

      expect(res.status).toBe(200);

      // Verify only one entry exists with updated action
      const dbLogs = await sql`SELECT * FROM food_logs WHERE id = ${logId}`;
      expect(dbLogs).toHaveLength(1);
      expect(dbLogs[0].action).toBe('reintroduced');
    });
  });
});
