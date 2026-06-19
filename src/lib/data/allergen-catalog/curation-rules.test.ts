import { describe, it, expect } from 'vitest';
import { FOODS } from './allergen-catalog';

type FoodLite = { id: string; familyId: string; allergenIds: readonly string[]; form: string; sourceGroup?: string };
const byId = (id: string): FoodLite | undefined => (FOODS as readonly FoodLite[]).find((f) => f.id === id);

describe('curation: precision-biased allergenIds', () => {
  it('ovesné mléko carries no allergens (oats are gluten-free; no cross-contamination tag)', () => {
    const f = byId('ovesne-mleko');
    expect(f).toBeDefined();
    expect(f?.allergenIds).toEqual([]);
  });

  it('rýžové mléko carries no allergens', () => {
    expect(byId('ryzove-mleko')?.allergenIds).toEqual([]);
  });

  it('kokosové mléko carries no allergens', () => {
    expect(byId('kokosove-mleko')?.allergenIds).toEqual([]);
  });

  it('sójové mléko carries only soy', () => {
    expect(byId('sojove-mleko')?.allergenIds).toEqual(['soy']);
  });

  it('mandlové mléko carries only nuts', () => {
    expect(byId('mandlove-mleko')?.allergenIds).toEqual(['nuts']);
  });

  it('mléčná čokoláda carries [chocolate, dairy] — no nuts', () => {
    const f = byId('mlecna-cokolada');
    expect(f).toBeDefined();
    expect([...(f?.allergenIds ?? [])].sort()).toEqual(['chocolate', 'dairy'].sort());
  });

  it('oříšková čokoláda is a separate Food carrying [chocolate, dairy, nuts]', () => {
    const f = byId('oriskova-cokolada');
    expect(f, 'oříšková čokoláda must exist as its own Food').toBeDefined();
    expect([...(f?.allergenIds ?? [])].sort()).toEqual(['chocolate', 'dairy', 'nuts'].sort());
  });

  it('olej (cooking fat) is form: none with no allergens', () => {
    const f = byId('olej');
    expect(f, 'olej must be added as a neutral staple').toBeDefined();
    expect(f?.form).toBe('none');
    expect(f?.allergenIds).toEqual([]);
  });

  it('nealko pivo carries [wheat, yeast]', () => {
    const f = byId('nealko-pivo');
    expect(f).toBeDefined();
    expect([...(f?.allergenIds ?? [])].sort()).toEqual(['wheat', 'yeast'].sort());
  });
});

describe('curation: cross-tag retention (intentional, not bugs)', () => {
  it('kuřecí keeps eggs cross-tag', () => {
    expect(byId('kureci')?.allergenIds).toEqual(['eggs']);
  });

  it('hovězí keeps dairy cross-tag', () => {
    expect(byId('hovezi')?.allergenIds).toEqual(['dairy']);
  });
});

describe('earned-granularity guard', () => {
  it('exactly one canonical wheat-bread food (no rohlík/houska cosmetic dups)', () => {
    // Wheat-bread tile = grains + wheat + cookable + sourceGroup 'gluten' AND id contains 'chleb' or is bread-shaped.
    // The denylist below catches the specific cosmetic variants the issue forbids.
    const forbiddenBreadIds = ['rohlik', 'houska', 'bageta', 'toust', 'sendvic'];
    for (const id of forbiddenBreadIds) {
      expect(byId(id), `cosmetic wheat-bread '${id}' must not be in catalog`).toBeUndefined();
    }
    expect(byId('psenicny-chleb'), 'canonical wheat-bread must exist').toBeDefined();
  });

  it('forbidden cosmetic-dup ids are absent (kefír, zmrzlina, granola, müsli, pizza, guláš)', () => {
    const forbidden = ['kefir', 'zmrzlina', 'granola', 'musli', 'pizza', 'gulas', 'polevka', 'salat'];
    for (const id of forbidden) {
      expect(byId(id), `cosmetic / dish '${id}' must not be in catalog`).toBeUndefined();
    }
  });
});

describe('per-family expansion (issue #319 scope)', () => {
  it('dairy: cow product split present (tvaroh, syr, maslo)', () => {
    for (const id of ['tvaroh', 'syr', 'maslo']) {
      const f = byId(id);
      expect(f, `dairy product '${id}' missing`).toBeDefined();
      expect(f?.familyId).toBe('dairy');
      expect(f?.allergenIds).toEqual(['dairy']);
      expect(f?.sourceGroup).toBe('cow');
    }
  });

  it('dairy: brynza is sheep, kozí sýr is goat', () => {
    expect(byId('brynza')?.sourceGroup).toBe('sheep');
    expect(byId('brynza')?.allergenIds).toEqual(['dairy']);
    expect(byId('kozi-syr')?.sourceGroup).toBe('goat');
    expect(byId('kozi-syr')?.allergenIds).toEqual(['dairy']);
  });

  it('grains: těstoviny + quinoa + kukuřičná mouka present', () => {
    expect(byId('testoviny')?.allergenIds).toEqual(['wheat']);
    expect(byId('quinoa')?.familyId).toBe('grains');
    expect(byId('quinoa')?.allergenIds).toEqual([]);
    expect(byId('kukuricna-mouka')?.allergenIds).toEqual(['corn']);
  });

  it('fruit expansion has švestka, třešně, maliny, rybíz, ananas, avokádo, citron', () => {
    for (const id of ['svestka', 'tresne', 'maliny', 'rybiz', 'ananas', 'avokado', 'citron']) {
      expect(byId(id), `fruit '${id}' missing`).toBeDefined();
      expect(byId(id)?.familyId).toBe('fruit');
    }
    expect(byId('citron')?.allergenIds).toEqual(['citrus']);
  });

  it('nuts-seeds expansion has lískové, kešu, para, chia', () => {
    for (const id of ['liskove', 'kesu', 'para']) {
      const f = byId(id);
      expect(f, `nut '${id}' missing`).toBeDefined();
      expect(f?.allergenIds).toEqual(['nuts']);
      expect(f?.sourceGroup).toBe('orechy');
    }
    expect(byId('chia')?.allergenIds).toEqual([]);
    expect(byId('chia')?.sourceGroup).toBe('seminka');
  });

  it('fish-seafood expansion has makrela, sleď, mušle, krab', () => {
    expect(byId('makrela')?.allergenIds).toEqual(['fish']);
    expect(byId('makrela')?.sourceGroup).toBe('ryby');
    expect(byId('sled')?.allergenIds).toEqual(['fish']);
    expect(byId('musle')?.allergenIds).toEqual(['shellfish']);
    expect(byId('musle')?.sourceGroup).toBe('plody-more');
    expect(byId('krab')?.allergenIds).toEqual(['shellfish']);
  });

  it('vegetables expansion has květák, zelí, dýně, řepa, batáty, lilek, houby', () => {
    expect(byId('kvetak')?.allergenIds).toEqual(['cabbage-brassica']);
    expect(byId('zeli')?.allergenIds).toEqual(['cabbage-brassica']);
    for (const id of ['dyne', 'repa', 'bataty', 'lilek']) {
      const f = byId(id);
      expect(f, `vegetable '${id}' missing`).toBeDefined();
      expect(f?.familyId).toBe('vegetables');
    }
    expect(byId('houby')?.allergenIds).toEqual(['mushroom']);
  });

  it('meat expansion has kachna, králík, šunka', () => {
    for (const id of ['kachna', 'kralik', 'sunka']) {
      const f = byId(id);
      expect(f, `meat '${id}' missing`).toBeDefined();
      expect(f?.familyId).toBe('meat');
    }
  });

  it('legumes expansion has tempeh, edamame (both soy)', () => {
    expect(byId('tempeh')?.allergenIds).toEqual(['soy']);
    expect(byId('edamame')?.allergenIds).toEqual(['soy']);
  });

  it('drinks: džus added; nealko pivo present', () => {
    expect(byId('dzus')?.familyId).toBe('drinks');
    expect(byId('nealko-pivo')?.familyId).toBe('drinks');
  });

  it('spices: bazalka, oregano, mletá paprika added', () => {
    for (const id of ['bazalka', 'oregano', 'mleta-paprika']) {
      const f = byId(id);
      expect(f, `spice '${id}' missing`).toBeDefined();
      expect(f?.familyId).toBe('spices-condiments');
    }
  });
});
