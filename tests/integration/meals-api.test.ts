import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { getDatabaseUrl } from '../test-utils';

const DATABASE_URL = getDatabaseUrl();
const BASE_URL = 'http://localhost:5173';

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

describe('Meals API', () => {
  let sql: ReturnType<typeof postgres>;
  let sessionCookie: string;
  let userId: string;
  let subItemId: string;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 5 });

    await cleanupTestData(sql);

    // Create test user
    const email = `test-meals-${Date.now()}@example.com`;
    const passwordHash = await hashPassword('password123');
    const users = await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, 'Test User', ${passwordHash})
      RETURNING id
    `;
    userId = users[0].id as string;

    // Get a sub-item ID for testing
    const subItems = await sql`SELECT id FROM food_sub_items LIMIT 1`;
    subItemId = subItems[0].id as string;

    // Login
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
    await db`DELETE FROM meal_items WHERE meal_id IN (
      SELECT id FROM meals WHERE user_id IN (
        SELECT id FROM users WHERE email LIKE 'test-meals-%@example.com'
      )
    )`;
    await db`DELETE FROM meals WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-meals-%@example.com')`;
    await db`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-meals-%@example.com')`;
    await db`DELETE FROM users WHERE email LIKE 'test-meals-%@example.com'`;
  }

  beforeEach(async () => {
    // Clean meals before each test
    await sql`DELETE FROM meal_items WHERE meal_id IN (SELECT id FROM meals WHERE user_id = ${userId})`;
    await sql`DELETE FROM meals WHERE user_id = ${userId}`;
  });

  describe('POST /api/meals', () => {
    it('creates a meal with predefined items', async () => {
      const res = await fetch(`${BASE_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          date: '2026-03-15',
          mealType: 'lunch',
          items: [{ subItemId }],
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveProperty('id');
      expect(json.data.mealType).toBe('lunch');
      expect(json.data.date).toBe('2026-03-15');
      expect(json.data.items).toHaveLength(1);
    });

    it('creates a meal with custom items', async () => {
      const res = await fetch(`${BASE_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          date: '2026-03-15',
          mealType: 'dinner',
          items: [{ customName: 'vepřové' }],
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.items[0].customName).toBe('vepřové');
    });

    it('creates a meal with mixed items', async () => {
      const res = await fetch(`${BASE_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          date: '2026-03-15',
          mealType: 'lunch',
          items: [
            { subItemId },
            { customName: 'rýže' },
          ],
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.items).toHaveLength(2);
    });

    it('rejects invalid mealType', async () => {
      const res = await fetch(`${BASE_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          date: '2026-03-15',
          mealType: 'brunch',
          items: [{ customName: 'test' }],
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.ok).toBe(false);
      expect(json.code).toBe('VALIDATION_ERROR');
    });

    it('rejects meal with no items', async () => {
      const res = await fetch(`${BASE_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          date: '2026-03-15',
          mealType: 'lunch',
          items: [],
        }),
      });

      expect(res.status).toBe(400);
    });

    it('rejects item with neither subItemId nor customName', async () => {
      const res = await fetch(`${BASE_URL}/api/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          date: '2026-03-15',
          mealType: 'lunch',
          items: [{}],
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/meals', () => {
    beforeEach(async () => {
      // Create test meals
      const meal1 = await sql`
        INSERT INTO meals (user_id, date, meal_type)
        VALUES (${userId}, '2026-03-15', 'breakfast')
        RETURNING id
      `;
      await sql`INSERT INTO meal_items (meal_id, custom_name) VALUES (${meal1[0].id}, 'toast')`;

      const meal2 = await sql`
        INSERT INTO meals (user_id, date, meal_type)
        VALUES (${userId}, '2026-03-15', 'lunch')
        RETURNING id
      `;
      await sql`INSERT INTO meal_items (meal_id, custom_name) VALUES (${meal2[0].id}, 'salad')`;
    });

    it('returns meals with items for date', async () => {
      const res = await fetch(`${BASE_URL}/api/meals?date=2026-03-15`, {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveLength(2);
      expect(json.data[0].items).toBeDefined();
    });

    it('returns empty for date with no meals', async () => {
      const res = await fetch(`${BASE_URL}/api/meals?date=2026-04-01`, {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data).toHaveLength(0);
    });

    it('scopes to authenticated user', async () => {
      // Create another user with a meal on the same date
      const otherEmail = `test-other-meals-${Date.now()}@example.com`;
      const passwordHash = await hashPassword('password123');
      const otherUsers = await sql`
        INSERT INTO users (email, name, password_hash)
        VALUES (${otherEmail}, 'Other User', ${passwordHash})
        RETURNING id
      `;
      const otherUserId = otherUsers[0].id as string;

      const otherMeal = await sql`
        INSERT INTO meals (user_id, date, meal_type)
        VALUES (${otherUserId}, '2026-03-15', 'dinner')
        RETURNING id
      `;
      await sql`INSERT INTO meal_items (meal_id, custom_name) VALUES (${otherMeal[0].id}, 'dinner item')`;

      // Query as original user
      const res = await fetch(`${BASE_URL}/api/meals?date=2026-03-15`, {
        headers: { Cookie: sessionCookie },
      });

      const json = await res.json();
      expect(json.data).toHaveLength(2); // Only original user's meals, not 3

      // Cleanup
      await sql`DELETE FROM meal_items WHERE meal_id = ${otherMeal[0].id}`;
      await sql`DELETE FROM meals WHERE user_id = ${otherUserId}`;
      await sql`DELETE FROM users WHERE id = ${otherUserId}`;
    });
  });

  describe('PUT /api/meals/[id]', () => {
    let mealId: string;

    beforeEach(async () => {
      const meals = await sql`
        INSERT INTO meals (user_id, date, meal_type)
        VALUES (${userId}, '2026-03-15', 'lunch')
        RETURNING id
      `;
      mealId = meals[0].id as string;
      await sql`INSERT INTO meal_items (meal_id, custom_name) VALUES (${mealId}, 'original item')`;
    });

    it('updates meal metadata and replaces items', async () => {
      const res = await fetch(`${BASE_URL}/api/meals/${mealId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({
          mealType: 'dinner',
          label: 'updated label',
          items: [{ customName: 'new item 1' }, { customName: 'new item 2' }],
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.data.mealType).toBe('dinner');
      expect(json.data.label).toBe('updated label');
      expect(json.data.items).toHaveLength(2);
    });

    it('returns 404 for non-existent meal', async () => {
      const res = await fetch(`${BASE_URL}/api/meals/00000000-0000-0000-0000-000000000000`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
        body: JSON.stringify({ mealType: 'dinner' }),
      });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/meals/[id]', () => {
    let mealId: string;

    beforeEach(async () => {
      const meals = await sql`
        INSERT INTO meals (user_id, date, meal_type)
        VALUES (${userId}, '2026-03-15', 'lunch')
        RETURNING id
      `;
      mealId = meals[0].id as string;
      await sql`INSERT INTO meal_items (meal_id, custom_name) VALUES (${mealId}, 'item')`;
    });

    it('removes meal and cascades to items', async () => {
      const res = await fetch(`${BASE_URL}/api/meals/${mealId}`, {
        method: 'DELETE',
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);

      // Verify meal and items are gone
      const meals = await sql`SELECT * FROM meals WHERE id = ${mealId}`;
      expect(meals).toHaveLength(0);

      const items = await sql`SELECT * FROM meal_items WHERE meal_id = ${mealId}`;
      expect(items).toHaveLength(0);
    });
  });

  describe('authentication', () => {
    it('all endpoints require authentication', async () => {
      const endpoints = [
        { method: 'GET', url: `${BASE_URL}/api/meals?date=2026-03-15` },
        { method: 'POST', url: `${BASE_URL}/api/meals`, body: { date: '2026-03-15', mealType: 'lunch', items: [{ customName: 'test' }] } },
      ];

      for (const { method, url, body } of endpoints) {
        const res = await fetch(url, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : undefined,
          body: body ? JSON.stringify(body) : undefined,
        });

        expect(res.status).toBe(401);
      }
    });
  });
});
