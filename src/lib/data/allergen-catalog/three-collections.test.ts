import { describe, it, expect } from 'vitest';
import {
  FAMILIES,
  ALLERGENS,
  FOODS,
} from './three-collections';

// ── Id uniqueness ─────────────────────────────────────────────

describe('id uniqueness', () => {
  it('FAMILIES ids are unique', () => {
    const ids = FAMILIES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('ALLERGENS ids are unique', () => {
    const ids = ALLERGENS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('FOODS ids are unique', () => {
    const ids = FOODS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Referential integrity ─────────────────────────────────────

describe('referential integrity', () => {
  const familyIds = new Set(FAMILIES.map((f) => f.id));
  const allergenIds = new Set(ALLERGENS.map((a) => a.id));

  it('every allergen references a known familyId', () => {
    for (const allergen of ALLERGENS) {
      expect(familyIds, `allergen '${allergen.id}' has unknown familyId '${allergen.familyId}'`).toContain(allergen.familyId);
    }
  });

  it('every food references a known familyId', () => {
    for (const food of FOODS) {
      expect(familyIds, `food '${food.id}' has unknown familyId '${food.familyId}'`).toContain(food.familyId);
    }
  });

  it('every food allergenId references a known allergen', () => {
    for (const food of FOODS) {
      for (const aId of food.allergenIds) {
        expect(allergenIds, `food '${food.id}' references unknown allergenId '${aId}'`).toContain(aId);
      }
    }
  });
});

// ── Required fields ───────────────────────────────────────────

describe('required fields', () => {
  it('every family has id and icon', () => {
    for (const family of FAMILIES) {
      expect(typeof family.id).toBe('string');
      expect(typeof family.icon).toBe('string');
    }
  });

  it('every allergen has id, familyId, and icon', () => {
    for (const allergen of ALLERGENS) {
      expect(typeof allergen.id).toBe('string');
      expect(typeof allergen.familyId).toBe('string');
      expect(typeof allergen.icon).toBe('string');
    }
  });

  it('every food has id, familyId, and allergenIds array', () => {
    for (const food of FOODS) {
      expect(typeof food.id).toBe('string');
      expect(typeof food.familyId).toBe('string');
      expect(Array.isArray(food.allergenIds)).toBe(true);
    }
  });
});

// ── Count sanity ──────────────────────────────────────────────

describe('collection counts', () => {
  it('13 families (12 clinical + custom)', () => {
    expect(FAMILIES).toHaveLength(13);
  });

  it('at least 32 allergens (all records from the previous catalog)', () => {
    expect(ALLERGENS.length).toBeGreaterThanOrEqual(32);
  });

  it('at least 15 foods (twins + divergent + composite + loose)', () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(15);
  });
});

// ── Protocol allergens ────────────────────────────────────────

describe('protocol allergens', () => {
  it('dairy has a protocol', () => {
    const dairy = ALLERGENS.find((a) => a.id === 'dairy');
    expect(dairy?.protocol).toBeDefined();
  });

  it('meat has no protocol', () => {
    const meat = ALLERGENS.find((a) => a.id === 'meat') as { id: string; protocol?: unknown } | undefined;
    expect(meat).toBeDefined();
    expect((meat as Record<string, unknown>).protocol).toBeUndefined();
  });

  it('coffee-tea has no protocol', () => {
    const coffeeTea = ALLERGENS.find((a) => a.id === 'coffee-tea') as { id: string; protocol?: unknown } | undefined;
    expect(coffeeTea).toBeDefined();
    expect((coffeeTea as Record<string, unknown>).protocol).toBeUndefined();
  });
});

// ── Specific data spot checks from the spec ───────────────────

describe('spec spot checks', () => {
  it('hummus (composite) has legumes + sesame allergenIds', () => {
    const hummus = FOODS.find((f) => f.id === 'hummus');
    expect(hummus).toBeDefined();
    expect(hummus?.allergenIds).toContain('legumes');
    expect(hummus?.allergenIds).toContain('sesame');
  });

  it('sojove-mleko (divergent) lives in dairy family but triggers soy', () => {
    const sojoveMleko = FOODS.find((f) => f.id === 'sojove-mleko');
    expect(sojoveMleko).toBeDefined();
    expect(sojoveMleko?.familyId).toBe('dairy');
    expect(sojoveMleko?.allergenIds).toContain('soy');
  });

  it('ryzove-mleko lives in dairy family with empty allergenIds', () => {
    const ryzoveMleko = FOODS.find((f) => f.id === 'ryzove-mleko');
    expect(ryzoveMleko).toBeDefined();
    expect(ryzoveMleko?.familyId).toBe('dairy');
    expect(ryzoveMleko?.allergenIds).toHaveLength(0);
  });

  it('vejce (twin) is in eggs family and triggers eggs allergen', () => {
    const vejce = FOODS.find((f) => f.id === 'vejce');
    expect(vejce).toBeDefined();
    expect(vejce?.familyId).toBe('eggs');
    expect(vejce?.allergenIds).toContain('eggs');
  });

  it('tofu lives under legumes family', () => {
    const tofu = FOODS.find((f) => f.id === 'tofu');
    expect(tofu).toBeDefined();
    expect(tofu?.familyId).toBe('legumes');
  });

  it('all 4 homeless allergens (mustard, sulphites-additives, vinegar-fermented, yeast) live under spices-condiments', () => {
    const homelessIds = ['mustard', 'sulphites-additives', 'vinegar-fermented', 'yeast'];
    for (const id of homelessIds) {
      const allergen = ALLERGENS.find((a) => a.id === id);
      expect(allergen, `allergen '${id}' not found`).toBeDefined();
      expect(allergen?.familyId, `allergen '${id}' should be under spices-condiments`).toBe('spices-condiments');
    }
  });

  it('soy allergen lives under legumes family', () => {
    const soy = ALLERGENS.find((a) => a.id === 'soy');
    expect(soy?.familyId).toBe('legumes');
  });

  it('shellfish allergen lives under fish-seafood family', () => {
    const shellfish = ALLERGENS.find((a) => a.id === 'shellfish');
    expect(shellfish?.familyId).toBe('fish-seafood');
  });
});

// ── FoodId type coverage ──────────────────────────────────────

describe('FoodId type', () => {
  it('all FOODS ids are valid FoodIds at runtime', () => {
    for (const food of FOODS) {
      // FoodId = typeof FOODS[number]['id'] | `other:${string}`
      // A valid food id is either a catalog id (string) or other:X
      expect(typeof food.id).toBe('string');
    }
  });
});
