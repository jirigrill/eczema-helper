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

describe('eggs family: bílek / žloutek / celé vejce split (Q8)', () => {
  it('eggs family has 3 members (vejce, bilek, zloutek)', () => {
    type FoodLite = { id: string; familyId: string };
    const eggs = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'eggs');
    const ids = eggs.map((f) => f.id).sort();
    expect(ids).toEqual(['bilek', 'vejce', 'zloutek']);
  });

  it('vejce (whole egg): eggs allergen, cookable, no sourceGroup', () => {
    const f = byId('vejce');
    expect(f).toBeDefined();
    expect(f?.familyId).toBe('eggs');
    expect(f?.allergenIds).toEqual(['eggs']);
    expect(f?.form).toBe('cookable');
    expect(f?.sourceGroup).toBeUndefined();
  });

  it('bilek (egg white): eggs allergen, cookable, no sourceGroup', () => {
    const f = byId('bilek');
    expect(f, 'bilek must be added').toBeDefined();
    expect(f?.familyId).toBe('eggs');
    expect(f?.allergenIds).toEqual(['eggs']);
    expect(f?.form).toBe('cookable');
    expect(f?.sourceGroup).toBeUndefined();
  });

  it('zloutek (egg yolk): eggs allergen, cookable, no sourceGroup', () => {
    const f = byId('zloutek');
    expect(f, 'zloutek must be added').toBeDefined();
    expect(f?.familyId).toBe('eggs');
    expect(f?.allergenIds).toEqual(['eggs']);
    expect(f?.form).toBe('cookable');
    expect(f?.sourceGroup).toBeUndefined();
  });
});

describe('per-family expansion (issue #319 scope)', () => {
  it('dairy: cow product split present (tvaroh, syr, smetana)', () => {
    // Note: máslo moved to fats-oils family (Q7) — it's a cooking fat, not a milk product.
    for (const id of ['tvaroh', 'syr', 'smetana']) {
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
    for (const id of ['liskove', 'kesu', 'para', 'arasidy', 'pekanove', 'pistacie', 'makadamove']) {
      const f = byId(id);
      expect(f, `nut '${id}' missing`).toBeDefined();
      expect(f?.allergenIds).toEqual(['nuts']);
      expect(f?.sourceGroup).toBe('orechy');
    }
    expect(byId('chia')?.allergenIds).toEqual([]);
    expect(byId('chia')?.sourceGroup).toBe('seminka');
    expect(byId('mak')?.allergenIds).toEqual(['seeds']);
    expect(byId('mak')?.sourceGroup).toBe('seminka');
    expect(byId('konopna-seminka')?.allergenIds).toEqual(['seeds']);
    expect(byId('konopna-seminka')?.sourceGroup).toBe('seminka');
    expect(byId('kokos')?.allergenIds).toEqual([]);
    expect(byId('kokos')?.sourceGroup).toBe('orechy');
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

describe('fats-oils family: cooking fats consolidated (Q7: split out from dairy/meat/spices)', () => {
  it('family exists with 5 members (olej, maslo, ghi, rostlinne-maslo, sadlo)', () => {
    type FoodLite = { id: string; familyId: string };
    const fats = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'fats-oils');
    const ids = fats.map((f) => f.id).sort();
    expect(ids).toEqual(['ghi', 'maslo', 'olej', 'rostlinne-maslo', 'sadlo']);
  });

  it('ryzove-mleko stays in dairy family (sourceGroup: plant) — fats-oils is for cooking fats, not plant milks', () => {
    expect(byId('ryzove-mleko')?.familyId).toBe('dairy');
    expect(byId('ryzove-mleko')?.sourceGroup).toBe('plant');
  });

  it('maslo: fats-oils family, cow source, dairy allergen, form: none', () => {
    const f = byId('maslo');
    expect(f).toBeDefined();
    expect(f?.familyId).toBe('fats-oils');
    expect(f?.sourceGroup).toBe('cow');
    expect(f?.allergenIds).toEqual(['dairy']);
    expect(f?.form).toBe('none');
  });

  it('ghi: fats-oils family, cow source, dairy allergen, cookable', () => {
    const f = byId('ghi');
    expect(f, 'ghi must be added').toBeDefined();
    expect(f?.familyId).toBe('fats-oils');
    expect(f?.sourceGroup).toBe('cow');
    expect(f?.allergenIds).toEqual(['dairy']);
    expect(f?.form).toBe('cookable');
  });

  it('rostlinne-maslo: fats-oils family, plant source, no allergens, form: none', () => {
    const f = byId('rostlinne-maslo');
    expect(f, 'rostlinne-maslo must be added').toBeDefined();
    expect(f?.familyId).toBe('fats-oils');
    expect(f?.sourceGroup).toBe('plant');
    expect(f?.allergenIds).toEqual([]);
    expect(f?.form).toBe('none');
  });

  it('sadlo: fats-oils family, pork source (rendered pork fat), no allergens, form: none', () => {
    const f = byId('sadlo');
    expect(f, 'sadlo must be added').toBeDefined();
    expect(f?.familyId).toBe('fats-oils');
    expect(f?.sourceGroup).toBe('pork');
    expect(f?.allergenIds).toEqual([]);
    expect(f?.form).toBe('none');
  });

  it('olej: fats-oils family, plant source, no allergens, form: none (was misfiled in spices-condiments)', () => {
    const f = byId('olej');
    expect(f).toBeDefined();
    expect(f?.familyId).toBe('fats-oils');
    expect(f?.sourceGroup).toBe('plant');
    expect(f?.allergenIds).toEqual([]);
    expect(f?.form).toBe('none');
  });

  it('siblings-cohere: every fats-oils food has a sourceGroup in {cow, plant, pork}', () => {
    type FoodLite = { id: string; familyId: string; sourceGroup?: string };
    const validGroups = new Set(['cow', 'plant', 'pork']);
    const fats = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'fats-oils');
    expect(fats.length, 'sanity: fats-oils non-empty').toBeGreaterThan(0);
    for (const f of fats) {
      expect(
        f.sourceGroup,
        `fats-oils '${f.id}' must have sourceGroup in {cow, plant, pork} (got '${f.sourceGroup}')`,
      ).toBeDefined();
      expect(
        validGroups,
        `fats-oils '${f.id}' has invalid sourceGroup '${f.sourceGroup}'`,
      ).toContain(f.sourceGroup);
    }
  });

  it('dairy family no longer contains pure fats (maslo, ghi, rostlinne-maslo moved out)', () => {
    type FoodLite = { id: string; familyId: string };
    const dairy = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'dairy');
    const dairyIds = new Set(dairy.map((f) => f.id));
    expect(dairyIds.has('maslo'), 'maslo must not be in dairy').toBe(false);
    expect(dairyIds.has('ghi'), 'ghi must not be in dairy').toBe(false);
    expect(dairyIds.has('rostlinne-maslo'), 'rostlinne-maslo must not be in dairy').toBe(false);
  });

  it('meat family no longer contains sadlo (rendered fat moved to fats-oils)', () => {
    type FoodLite = { id: string; familyId: string };
    const meat = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'meat');
    expect(meat.find((f) => f.id === 'sadlo'), 'sadlo must not be in meat').toBeUndefined();
  });

  it('spices-condiments family no longer contains olej', () => {
    type FoodLite = { id: string; familyId: string };
    const spices = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'spices-condiments');
    expect(spices.find((f) => f.id === 'olej'), 'olej must not be in spices-condiments').toBeUndefined();
  });
});

describe('dairy: plant-milks coherence (after fats moved out)', () => {
  it('siblings-cohere: every dairy *-mleko food not in cow|sheep|goat is in plant (defense test)', () => {
    type FoodLite = { id: string; familyId: string; sourceGroup?: string };
    const animalGroups = new Set(['cow', 'sheep', 'goat']);
    const dairyMleko = (FOODS as readonly FoodLite[]).filter(
      (f) => f.familyId === 'dairy' && f.id.endsWith('-mleko'),
    );
    expect(dairyMleko.length, 'sanity: should have several *-mleko foods').toBeGreaterThan(3);
    for (const f of dairyMleko) {
      if (f.sourceGroup && animalGroups.has(f.sourceGroup)) continue;
      expect(
        f.sourceGroup,
        `dairy plant-milk '${f.id}' must have sourceGroup: 'plant' (got '${f.sourceGroup}')`,
      ).toBe('plant');
    }
  });
});

describe('vegetables family: form coherence (Q6: only the genuinely raw-only stay raw-only)', () => {
  it('špenát and paprika flip to cookable (špenát se smetanou, plněné papriky — dominant CZ uses)', () => {
    expect(byId('spenat')?.form).toBe('cookable');
    expect(byId('paprika')?.form).toBe('cookable');
  });

  it('listový salát, okurka, ředkev stay raw-only (cooking is not a CZ-canonical pathway)', () => {
    // Rule: chip presence reflects "is cooking a recognized CZ preparation",
    // not "is cooking physically possible". A cooked-okurka chip would be
    // dead weight on the meal-log UI; a parent logging cooked cucumber is
    // more likely a fat-finger error than an intentional log.
    expect(byId('listovy-salat')?.form).toBe('raw-only');
    expect(byId('okurka')?.form).toBe('raw-only');
    expect(byId('redkev')?.form).toBe('raw-only');
  });

  it('siblings-cohere: every vegetable not in the raw-only allow-list is cookable', () => {
    type FoodLite = { id: string; familyId: string; form: string };
    const RAW_ONLY_VEG = new Set(['listovy-salat', 'okurka', 'redkev']);
    const veg = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'vegetables');
    expect(veg.length, 'sanity: should have many vegetables').toBeGreaterThan(15);
    for (const f of veg) {
      const expected = RAW_ONLY_VEG.has(f.id) ? 'raw-only' : 'cookable';
      expect(
        f.form,
        `vegetable '${f.id}' expected form '${expected}' (allow-list: ${[...RAW_ONLY_VEG].join(', ')}), got '${f.form}'`,
      ).toBe(expected);
    }
  });
});

describe('fruit family: form coherence (Q5: fruit is cookable, not raw-only)', () => {
  it('every fruit has form: cookable (compote, jam, baking, povidla — fruit is not destroyed by cooking)', () => {
    // `form` governs which preparation chips render on the meal-log UI.
    // `raw-only` should be reserved for foods *destroyed* by cooking (leafy salads).
    // CZ home cooking routinely cooks fruit: štrúdl, povidla, kompoty, koláče,
    // knedlíky s ovocem, grilled pears, citrus zest in baking, berry jams.
    type FoodLite = { id: string; familyId: string; form: string };
    const fruits = (FOODS as readonly FoodLite[]).filter((f) => f.familyId === 'fruit');
    expect(fruits.length, 'sanity: should have many fruits').toBeGreaterThan(20);
    for (const f of fruits) {
      expect(
        f.form,
        `fruit '${f.id}' should be 'cookable' (compote/jam/baking applies); got '${f.form}'`,
      ).toBe('cookable');
    }
  });
});
