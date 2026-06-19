import { describe, it, expect } from 'vitest';
import { FOODS, ALLERGENS } from './allergen-catalog';

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
  it('grains are source-tier only — no wheat-product variants in catalog', () => {
    // ADR-0019 + #319 follow-up: grains are stored at source-tier (`psenice`,
    // `oves`, `jecmen`, `zito`, `ryze`, …). Specific cooked/processed wheat
    // products (chleb, rohlík, těstoviny, mouka, …) are NOT separate Foods —
    // they reduce to `psenice` as far as the allergen surface is concerned.
    const forbiddenWheatProducts = [
      'psenicny-chleb',
      'rohlik', 'houska', 'bageta', 'toust', 'sendvic',
      'testoviny', 'psenicna-mouka',
      'ovesne-vlocky',
      'kukuricna-mouka',
    ];
    for (const id of forbiddenWheatProducts) {
      expect(byId(id), `wheat-product '${id}' must not be in catalog`).toBeUndefined();
    }
    expect(byId('psenice'), 'canonical wheat source must exist').toBeDefined();
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

  it('grains: source-tier rows for cereals (pšenice/oves/ječmen/žito + quinoa)', () => {
    // Wheat is the only gluten cereal carrying the `wheat` allergen.
    expect(byId('psenice')?.familyId).toBe('grains');
    expect(byId('psenice')?.allergenIds).toEqual(['wheat']);
    expect(byId('psenice')?.sourceGroup).toBe('gluten');
    // Other gluten cereals: gluten in `sourceGroup` but no per-Food allergen
    // (they trigger no specific tracked allergen besides the gluten axis).
    for (const id of ['oves', 'jecmen', 'zito']) {
      expect(byId(id), `gluten cereal '${id}' missing`).toBeDefined();
      expect(byId(id)?.familyId).toBe('grains');
      expect(byId(id)?.allergenIds).toEqual([]);
      expect(byId(id)?.sourceGroup).toBe('gluten');
    }
    expect(byId('quinoa')?.familyId).toBe('grains');
    expect(byId('quinoa')?.allergenIds).toEqual([]);
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
    expect(byId('makrela')?.sourceGroup).toBe('morske');
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

  it('vegetables: pastyňák / listový salát / celer / ředkev added (issue #319 follow-up)', () => {
    for (const id of ['pastynak', 'listovy-salat', 'celer', 'redkev']) {
      const f = byId(id);
      expect(f, `vegetable '${id}' missing`).toBeDefined();
      expect(f?.familyId).toBe('vegetables');
    }
    // Celer carries the (newly tracked) `celery` allergen — EU regulatory allergen #9.
    expect(byId('celer')?.allergenIds).toEqual(['celery']);
    // Other three carry no tracked allergen.
    expect(byId('pastynak')?.allergenIds).toEqual([]);
    expect(byId('listovy-salat')?.allergenIds).toEqual([]);
    expect(byId('redkev')?.allergenIds).toEqual([]);
  });

  it('vegetables: every food has a sourceGroup matching the kořenová/listová/plodová/cibulová/hlízová/košťálová axis (houby → ostatní)', () => {
    type FoodLite = { id: string; familyId: string; sourceGroup?: string };
    const veg = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'vegetables');
    const expected: Record<string, string | undefined> = {
      // Plodová (fruit-vegetables)
      rajce:           'plodova',
      okurka:          'plodova',
      cuketa:          'plodova',
      paprika:         'plodova',
      dyne:            'plodova',
      lilek:           'plodova',
      // Listová (leaf)
      spenat:          'listova',
      'listovy-salat': 'listova',
      // Kořenová (root)
      mrkev:           'korenova',
      repa:            'korenova',
      celer:           'korenova',
      pastynak:        'korenova',
      redkev:          'korenova',
      // Cibulová (bulb / allium)
      cesnek:          'cibulova',
      cibule:          'cibulova',
      // Hlízová (tuber)
      brambory:        'hlizova',
      bataty:          'hlizova',
      // Košťálová (brassica)
      kvetak:          'kostalova',
      zeli:            'kostalova',
      brokolice:       'kostalova',
      // Houby — mushrooms aren't culinary vegetables → Ostatní (sourceGroup undefined)
      houby:           undefined,
    };
    for (const food of veg) {
      const want = expected[food.id];
      if (want === undefined) {
        expect(food.sourceGroup, `${food.id} should be unsourced (Ostatní)`).toBeUndefined();
      } else {
        expect(
          food.sourceGroup,
          `${food.id} expected sourceGroup '${want}', got '${food.sourceGroup}'`,
        ).toBe(want);
      }
    }
  });

  it('celery allergen tracked as log-only (no protocol)', () => {
    type AllergenLite = { id: string; familyId: string; protocol?: unknown };
    const celery = (ALLERGENS as readonly AllergenLite[]).find((a) => a.id === 'celery');
    expect(celery, '`celery` allergen must exist').toBeDefined();
    expect(celery?.familyId).toBe('vegetables');
    expect(celery?.protocol, '`celery` is log-only (no reintroduction protocol)').toBeUndefined();
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
