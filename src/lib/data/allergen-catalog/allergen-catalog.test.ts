import { describe, expect, it } from 'vitest';

import { ALLERGENICITY_LEVELS } from '$lib/domain/canonical-allergen';
import { PREPARATION_METHODS } from '$lib/domain/models';

import { ALLERGENS, FAMILIES, FOODS } from './allergen-catalog';

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
      expect(
        familyIds,
        `allergen '${allergen.id}' has unknown familyId '${allergen.familyId}'`,
      ).toContain(allergen.familyId);
    }
  });

  it('every food references a known familyId', () => {
    for (const food of FOODS) {
      expect(familyIds, `food '${food.id}' has unknown familyId '${food.familyId}'`).toContain(
        food.familyId,
      );
    }
  });

  it('every food allergenId references a known allergen', () => {
    for (const food of FOODS) {
      for (const aId of food.allergenIds) {
        expect(allergenIds, `food '${food.id}' references unknown allergenId '${aId}'`).toContain(
          aId,
        );
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

  it('every food has a preparations array drawn from the closed method set', () => {
    const valid = new Set(PREPARATION_METHODS);
    for (const food of FOODS) {
      expect(Array.isArray(food.preparations)).toBe(true);
      for (const method of food.preparations) {
        expect(valid, `food '${food.id}' has invalid preparation '${method}'`).toContain(method);
      }
    }
  });

  it('representative foods offer exactly the documented preparations (ADR-0028)', () => {
    const byId = (id: string) => FOODS.find((f) => f.id === id);
    // no-preparation food: empty list
    expect(byId('sul')?.preparations).toEqual([]);
    // liquid: raw · boiled · baked, no fried
    expect(byId('kravske-mleko')?.preparations).toEqual(['raw', 'boiled', 'baked']);
    // genuinely fry-able solid keeps fried
    expect(byId('brambory')?.preparations).toEqual(['raw', 'boiled', 'baked', 'fried']);
    // meat gains smoked + cured
    expect(byId('veprove')?.preparations).toEqual([
      'raw',
      'boiled',
      'baked',
      'fried',
      'smoked',
      'cured',
    ]);
    // fin fish gains smoked, still fry-able
    expect(byId('losos')?.preparations).toEqual(['raw', 'boiled', 'baked', 'smoked', 'fried']);
    // fruit gains dried and can be stewed (compote), but is never fried
    expect(byId('banan')?.preparations).toEqual(['raw', 'baked', 'boiled', 'dried']);
    // raw-only unchanged
    expect(byId('listovy-salat')?.preparations).toEqual(['raw']);
  });
});

// ── Count sanity ──────────────────────────────────────────────

describe('collection counts', () => {
  it('14 families (13 clinical + custom)', () => {
    expect(FAMILIES).toHaveLength(14);
  });

  it('at least 32 allergens (all records from the previous catalog)', () => {
    expect(ALLERGENS.length).toBeGreaterThanOrEqual(32);
  });

  it('at least 15 foods (twins + divergent + composite + loose)', () => {
    expect(FOODS.length).toBeGreaterThanOrEqual(15);
  });
});

// ── Protocol (ladder-bearing) allergens ───────────────────────

describe('protocol allergens', () => {
  it('dairy has a ladder', () => {
    const dairy = ALLERGENS.find((a) => a.id === 'dairy');
    expect(dairy?.ladder).toBeDefined();
  });

  it('meat has no ladder', () => {
    const meat = ALLERGENS.find((a) => a.id === 'meat') as
      | { id: string; ladder?: unknown }
      | undefined;
    expect(meat).toBeDefined();
    expect((meat as Record<string, unknown>).ladder).toBeUndefined();
  });

  it('coffee-tea has no ladder', () => {
    const coffeeTea = ALLERGENS.find((a) => a.id === 'coffee-tea') as
      | { id: string; ladder?: unknown }
      | undefined;
    expect(coffeeTea).toBeDefined();
    expect((coffeeTea as Record<string, unknown>).ladder).toBeUndefined();
  });

  // ADR-0023 is parked with the protocol engine — see docs/parked-features.md.
  it('every ladder-bearing allergen has a valid allergenicity level (ADR-0023 §6)', () => {
    const levels = new Set<string>(ALLERGENICITY_LEVELS);
    const laddered = ALLERGENS.filter(
      (a): a is typeof a & { ladder: object; allergenicity?: string } => 'ladder' in a,
    );
    expect(laddered.length).toBeGreaterThan(0);
    for (const allergen of laddered) {
      expect(
        levels,
        `allergen '${allergen.id}' has missing/invalid allergenicity '${allergen.allergenicity}'`,
      ).toContain(allergen.allergenicity);
    }
  });

  it('no log-only allergen carries an allergenicity (paired with ladder only)', () => {
    const orphaned = ALLERGENS.filter(
      (a): a is typeof a & { allergenicity?: string } =>
        !('ladder' in a) && 'allergenicity' in a && a.allergenicity !== undefined,
    );
    expect(orphaned.map((a) => a.id)).toEqual([]);
  });

  it("at least one allergen is 'low' — the adaptation-window boundary", () => {
    const hasLow = ALLERGENS.some(
      (a): a is typeof a & { allergenicity?: string } =>
        'allergenicity' in a && a.allergenicity === 'low',
    );
    expect(hasLow).toBe(true);
  });

  // Folded in from #507 / ADR-0028. Each ladder-bearing record carries a
  // `ladder.allergenId` that duplicates the record `id`; nothing reads it at
  // runtime (tolerance-building is parked), so the two can drift silently. A
  // catalog restructure (like this preparation-model change) is the realistic
  // way they diverge — guard it here.
  it('every ladder-bearing record has ladder.allergenId equal to its own id', () => {
    const laddered = ALLERGENS.filter(
      (a): a is typeof a & { ladder: { allergenId: string } } => 'ladder' in a,
    );
    expect(laddered.length).toBeGreaterThan(0);
    for (const allergen of laddered) {
      expect(
        allergen.ladder.allergenId,
        `allergen '${allergen.id}' ladder.allergenId '${allergen.ladder.allergenId}' != id`,
      ).toBe(allergen.id);
    }
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
      expect(allergen?.familyId, `allergen '${id}' should be under spices-condiments`).toBe(
        'spices-condiments',
      );
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
