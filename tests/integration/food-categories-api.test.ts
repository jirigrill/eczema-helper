import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import postgres from 'postgres';
import { getDatabaseUrl } from '../test-utils';

const DATABASE_URL = getDatabaseUrl();
const BASE_URL = 'http://localhost:5173';

async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(password, 12);
}

describe('Food Categories API', () => {
  let sql: ReturnType<typeof postgres>;
  let sessionCookie: string;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 5 });

    // Clean up any leftover test data
    await cleanupTestData(sql);

    // Create test user and login
    const email = `test-categories-${Date.now()}@example.com`;
    const passwordHash = await hashPassword('password123');
    await sql`
      INSERT INTO users (email, name, password_hash)
      VALUES (${email}, 'Test User', ${passwordHash})
    `;

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
    await db`DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE email LIKE 'test-categories-%@example.com')`;
    await db`DELETE FROM users WHERE email LIKE 'test-categories-%@example.com'`;
  }

  describe('GET /api/food-categories', () => {
    it('returns all categories with items', async () => {
      const res = await fetch(`${BASE_URL}/api/food-categories`, {
        headers: { Cookie: sessionCookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(Array.isArray(json.data)).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(12); // At least 12 seeded categories

      // Check structure of a category
      const category = json.data[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('slug');
      expect(category).toHaveProperty('nameCs');
      expect(category).toHaveProperty('icon');
      expect(category).toHaveProperty('sortOrder');
      expect(category).toHaveProperty('subItems');
      expect(Array.isArray(category.subItems)).toBe(true);
    });

    it('categories have sub-items', async () => {
      const res = await fetch(`${BASE_URL}/api/food-categories`, {
        headers: { Cookie: sessionCookie },
      });

      const json = await res.json();
      // Find dairy category (should have multiple sub-items)
      const dairy = json.data.find((c: { slug: string }) => c.slug === 'dairy');
      expect(dairy).toBeDefined();
      expect(dairy.subItems.length).toBeGreaterThan(0);

      // Check sub-item structure
      const subItem = dairy.subItems[0];
      expect(subItem).toHaveProperty('id');
      expect(subItem).toHaveProperty('categoryId');
      expect(subItem).toHaveProperty('slug');
      expect(subItem).toHaveProperty('nameCs');
    });

    it('requires authentication', async () => {
      const res = await fetch(`${BASE_URL}/api/food-categories`);
      expect(res.status).toBe(401);
    });
  });
});
