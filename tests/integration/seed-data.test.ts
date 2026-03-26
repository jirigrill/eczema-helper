import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import postgres from 'postgres';

const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgres://eczema:eczema_dev@localhost:5432/eczema_helper';

describe('Seed Data', () => {
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    sql = postgres(DATABASE_URL, { max: 1 });
  });

  afterAll(async () => {
    await sql.end();
  });

  it('food categories are seeded (>= 13)', async () => {
    const result = await sql`SELECT COUNT(*) as count FROM food_categories`;
    const count = Number(result[0].count);
    expect(count).toBeGreaterThanOrEqual(13);
  });

  it('food sub-items are seeded (>= 50)', async () => {
    const result = await sql`SELECT COUNT(*) as count FROM food_sub_items`;
    const count = Number(result[0].count);
    expect(count).toBeGreaterThanOrEqual(50);
  });

  it('every food sub-item references a valid category', async () => {
    const result = await sql`
      SELECT fsi.id 
      FROM food_sub_items fsi 
      LEFT JOIN food_categories fc ON fsi.category_id = fc.id 
      WHERE fc.id IS NULL
    `;
    expect(result).toHaveLength(0);
  });

  it('dairy category has 8 sub-items', async () => {
    const result = await sql`
      SELECT COUNT(*) as count 
      FROM food_sub_items fsi
      JOIN food_categories fc ON fsi.category_id = fc.id
      WHERE fc.slug = 'dairy'
    `;
    const count = Number(result[0].count);
    expect(count).toBe(8);
  });

  it('categories have Czech names and icons', async () => {
    const categories = await sql`SELECT name_cs, icon FROM food_categories`;
    expect(categories.length).toBeGreaterThan(0);
    
    for (const cat of categories) {
      expect(cat.name_cs).toBeTruthy();
      expect(cat.name_cs.length).toBeGreaterThan(0);
      expect(cat.icon).toBeTruthy();
      expect(cat.icon.length).toBeGreaterThan(0);
    }
  });

  it('categories have unique slugs', async () => {
    const result = await sql`
      SELECT slug, COUNT(*) as count 
      FROM food_categories 
      GROUP BY slug 
      HAVING COUNT(*) > 1
    `;
    expect(result).toHaveLength(0);
  });
});
