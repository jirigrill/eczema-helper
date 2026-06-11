// Three-collection catalog — families, allergens, foods (ADR-0017 slice 2 / issue #227).
// Ids derive from the data; types are structurally enforced at compile time.

import type { AllergenProtocol } from '$lib/domain/canonical-allergen';

// ── Families ──────────────────────────────────────────────────

export const FAMILIES = [
  { id: 'grains',             icon: '🌾' },
  { id: 'vegetables',         icon: '🥦' },
  { id: 'fruit',              icon: '🍎' },
  { id: 'meat',               icon: '🥩' },
  { id: 'fish-seafood',       icon: '🐟' },
  { id: 'dairy',              icon: '🥛' },
  { id: 'eggs',               icon: '🥚' },
  { id: 'legumes',            icon: '🫘' },
  { id: 'nuts-seeds',         icon: '🥜' },
  { id: 'sweet',              icon: '🍯' },
  { id: 'spices-condiments',  icon: '🌿' },
  { id: 'drinks',             icon: '☕' },
  { id: 'custom',             icon: '➕' },
] as const;

export type FamilyId = typeof FAMILIES[number]['id'];

export type CatalogFamily = {
  id: FamilyId;
  icon: string;
};

// ── Allergens ─────────────────────────────────────────────────

type AllergenRecord = {
  id: string;
  familyId: FamilyId;
  icon: string;
  aliases: readonly string[];
  protocol?: AllergenProtocol;
};

export const ALLERGENS = [
  // ── Core protocol allergens ───────────────────────────────
  {
    id: 'dairy',
    familyId: 'dairy' as FamilyId,
    icon: '🥛',
    aliases: ['dairy', 'milk', 'mleko', 'mléčné výrobky'],
    protocol: {
      days: [
        { day: 1, instructionCs: '100 ml kravského mléka nebo 1 jogurt', isEvaluationDay: false },
        { day: 2, instructionCs: '200 ml mléka nebo větší porce mléčného výrobku', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně mléčných výrobků', isEvaluationDay: false },
        { day: 4, instructionCs: 'Neomezeně mléčných výrobků', isEvaluationDay: false },
        { day: 5, instructionCs: 'Neomezeně mléčných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'eggs',
    familyId: 'eggs' as FamilyId,
    icon: '🥚',
    aliases: ['eggs', 'vejce', 'vaječný'],
    protocol: {
      days: [
        { day: 1, instructionCs: '1 vejce (vařené)', isEvaluationDay: false },
        { day: 2, instructionCs: '2 vejce nebo větší porce vaječných výrobků', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně vajec — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'wheat',
    familyId: 'grains' as FamilyId,
    icon: '🌾',
    aliases: ['wheat', 'pšenice', 'lepek', 'gluten'],
    protocol: {
      days: [
        { day: 1, instructionCs: '1 krajíc chleba nebo malá porce těstovin', isEvaluationDay: false },
        { day: 2, instructionCs: '2–3 krajíce chleba nebo střední porce těstovin', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně pšeničných výrobků', isEvaluationDay: false },
        { day: 4, instructionCs: 'Neomezeně pšeničných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'soy',
    familyId: 'legumes' as FamilyId,
    icon: '🫘',
    aliases: ['soy', 'soja', 'sója'],
    protocol: {
      days: [
        { day: 1, instructionCs: '100 ml sójového mléka nebo malá porce tofu', isEvaluationDay: false },
        { day: 2, instructionCs: '200 ml sójového mléka nebo střední porce tofu', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně sójových výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'nuts',
    familyId: 'nuts-seeds' as FamilyId,
    icon: '🥜',
    aliases: ['nuts', 'ořechy', 'arašídy', 'mandle', 'vlašské ořechy'],
    protocol: {
      days: [
        { day: 1, instructionCs: '5–6 ořechů (např. vlašských nebo mandlí)', isEvaluationDay: false },
        { day: 2, instructionCs: 'Hrst ořechů nebo 2 lžíce ořechového másla', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně ořechů', isEvaluationDay: false },
        { day: 4, instructionCs: 'Neomezeně ořechů — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'fish',
    familyId: 'fish-seafood' as FamilyId,
    icon: '🐟',
    aliases: ['fish', 'ryba', 'ryby'],
    protocol: {
      days: [
        { day: 1, instructionCs: '1 malá porce ryby (cca 50 g)', isEvaluationDay: false },
        { day: 2, instructionCs: 'Střední porce ryby (cca 100 g)', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně ryb — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'shellfish',
    familyId: 'fish-seafood' as FamilyId,
    icon: '🦐',
    aliases: ['shellfish', 'korýši', 'měkkýši', 'krevety', 'krab', 'mušle'],
    protocol: {
      days: [
        { day: 1, instructionCs: 'Malá porce korýšů nebo měkkýšů (cca 50 g)', isEvaluationDay: false },
        { day: 2, instructionCs: 'Střední porce korýšů nebo měkkýšů (cca 100 g)', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně korýšů a měkkýšů — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'citrus',
    familyId: 'fruit' as FamilyId,
    icon: '🍋',
    aliases: ['citrus', 'citrony', 'pomeranče', 'mandarinky', 'grapefruit'],
    protocol: {
      days: [
        { day: 1, instructionCs: '1 mandarinka nebo sklenice džusu (150 ml)', isEvaluationDay: false },
        { day: 2, instructionCs: '2 mandarinky nebo 1 pomeranč', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně citrusů — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'chocolate',
    familyId: 'sweet' as FamilyId,
    icon: '🍫',
    aliases: ['chocolate', 'čokoláda', 'kakao', 'cocoa'],
    protocol: {
      days: [
        { day: 1, instructionCs: '2–3 kostičky hořké čokolády (min. 70 % kakaa)', isEvaluationDay: false },
        { day: 2, instructionCs: 'Polovina tabulky čokolády', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně čokolády — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'tomatoes',
    familyId: 'vegetables' as FamilyId,
    icon: '🍅',
    aliases: ['tomatoes', 'rajčata', 'rajče', 'rajský'],
    protocol: {
      days: [
        { day: 1, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
        { day: 2, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně rajčat nebo paprik, min. 5 malých rajčátek', isEvaluationDay: false },
        { day: 4, instructionCs: 'Neomezeně rajčat nebo paprik — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'strawberries',
    familyId: 'fruit' as FamilyId,
    icon: '🍓',
    aliases: ['strawberries', 'jahody', 'jahoda'],
    protocol: {
      days: [
        { day: 1, instructionCs: 'Hrst jahod (cca 100 g)', isEvaluationDay: false },
        { day: 2, instructionCs: 'Větší porce jahod (cca 200 g)', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně jahod — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'corn',
    familyId: 'grains' as FamilyId,
    icon: '🌽',
    aliases: ['corn', 'kukuřice', 'kukuřičný'],
    protocol: {
      days: [
        { day: 1, instructionCs: 'Malá porce kukuřice (cca 50 g kukuřičné mouky nebo 1 klas)', isEvaluationDay: false },
        { day: 2, instructionCs: 'Střední porce kukuřice', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně kukuřičných výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  {
    id: 'sesame',
    familyId: 'nuts-seeds' as FamilyId,
    icon: '🌰',
    aliases: ['sesame', 'sezam', 'tahini', 'sezamová semínka'],
    protocol: {
      days: [
        { day: 1, instructionCs: '1 lžička sezamových semínek nebo tahini', isEvaluationDay: false },
        { day: 2, instructionCs: '2–3 lžíce tahini nebo větší porce sezamu', isEvaluationDay: false },
        { day: 3, instructionCs: 'Neomezeně sezamových výrobků — večer vyhodnoťte reakci', isEvaluationDay: true },
      ],
    },
  },
  // ── Log-only allergens (no protocol) ─────────────────────
  { id: 'grains',             familyId: 'grains' as FamilyId,            icon: '🌾', aliases: ['grains', 'obiloviny'] },
  { id: 'seeds',              familyId: 'nuts-seeds' as FamilyId,        icon: '🌱', aliases: ['seeds', 'semínka'] },
  { id: 'legumes',            familyId: 'legumes' as FamilyId,           icon: '🫘', aliases: ['legumes', 'luštěniny'] },
  { id: 'fruit',              familyId: 'fruit' as FamilyId,             icon: '🍎', aliases: ['fruit', 'ovoce'] },
  { id: 'exotic-fruit',       familyId: 'fruit' as FamilyId,             icon: '🥭', aliases: ['exotic-fruit', 'exotické ovoce'] },
  { id: 'carrot-root-veg',    familyId: 'vegetables' as FamilyId,        icon: '🥕', aliases: ['carrot', 'mrkev', 'kořenová zelenina'] },
  { id: 'cabbage-brassica',   familyId: 'vegetables' as FamilyId,        icon: '🥬', aliases: ['cabbage', 'brassica', 'zelí', 'košťálová zelenina'] },
  { id: 'onion-garlic',       familyId: 'vegetables' as FamilyId,        icon: '🧅', aliases: ['onion', 'garlic', 'cibule', 'česnek'] },
  { id: 'potato',             familyId: 'vegetables' as FamilyId,        icon: '🥔', aliases: ['potato', 'brambory'] },
  { id: 'mushroom',           familyId: 'vegetables' as FamilyId,        icon: '🍄', aliases: ['mushroom', 'houby'] },
  { id: 'other-vegetables',   familyId: 'vegetables' as FamilyId,        icon: '🥒', aliases: ['vegetables', 'zelenina', 'paprika', 'cucumber', 'okurka', 'cuketa', 'zucchini'] },
  { id: 'meat',               familyId: 'meat' as FamilyId,              icon: '🥩', aliases: ['meat', 'maso'] },
  { id: 'mustard',            familyId: 'spices-condiments' as FamilyId, icon: '🌿', aliases: ['mustard', 'hořčice'] },
  { id: 'sulphites-additives',familyId: 'spices-condiments' as FamilyId, icon: '⚗️', aliases: ['sulphites', 'additives', 'siřičitany', 'aditiva'] },
  { id: 'vinegar-fermented',  familyId: 'spices-condiments' as FamilyId, icon: '🫙', aliases: ['vinegar', 'fermented', 'ocet', 'kvašené'] },
  { id: 'yeast',              familyId: 'spices-condiments' as FamilyId, icon: '🍞', aliases: ['yeast', 'droždí', 'kvasnice'] },
  { id: 'sweeteners',         familyId: 'sweet' as FamilyId,             icon: '🍬', aliases: ['sweeteners', 'sladidla', 'med', 'cukr'] },
  { id: 'spices-herbs',       familyId: 'spices-condiments' as FamilyId, icon: '🌿', aliases: ['spices', 'herbs', 'koření', 'bylinky', 'chilli', 'pepper', 'paprika-powder', 'kmín', 'caraway'] },
  { id: 'coffee-tea',         familyId: 'drinks' as FamilyId,            icon: '☕', aliases: ['coffee', 'tea', 'káva', 'čaj'] },
] as const satisfies readonly AllergenRecord[];

export type CatalogAllergenId3 = typeof ALLERGENS[number]['id'];
/** Re-export as AllergenId for consumer convenience */
export type AllergenId = CatalogAllergenId3 | `other:${string}`;
/** Allergens with a reintroduction protocol */
export type ProtocolAllergenId3 = Extract<typeof ALLERGENS[number], { protocol: object }>['id'];

// ── Foods ─────────────────────────────────────────────────────

type FoodRecord = {
  id: string;
  familyId: FamilyId;
  allergenIds: readonly CatalogAllergenId3[];
  aliases?: readonly string[];
};

export const FOODS = [
  // ── Food twins (§3a) ─────────────────────────────────────
  { id: 'vejce',             familyId: 'eggs' as FamilyId,        allergenIds: ['eggs']          },
  { id: 'kravske-mleko',     familyId: 'dairy' as FamilyId,       allergenIds: ['dairy']         },
  { id: 'jogurt',            familyId: 'dairy' as FamilyId,       allergenIds: ['dairy']         },
  { id: 'psenicny-chleb',    familyId: 'grains' as FamilyId,      allergenIds: ['wheat']         },
  { id: 'tofu',              familyId: 'legumes' as FamilyId,     allergenIds: ['soy']           },
  { id: 'arasisove-maslo',   familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts']          },
  { id: 'sezam',             familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['sesame']        },
  { id: 'tahini',            familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['sesame']        },
  { id: 'jahody',            familyId: 'fruit' as FamilyId,       allergenIds: ['strawberries']  },
  { id: 'rajce',             familyId: 'vegetables' as FamilyId,  allergenIds: ['tomatoes']      },
  { id: 'kukurice',          familyId: 'grains' as FamilyId,      allergenIds: ['corn']          },
  { id: 'pomeranc',          familyId: 'fruit' as FamilyId,       allergenIds: ['citrus']        },
  { id: 'cokolada',          familyId: 'sweet' as FamilyId,       allergenIds: ['chocolate']     },
  { id: 'losos',             familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish']          },
  { id: 'krevetky',          familyId: 'fish-seafood' as FamilyId,allergenIds: ['shellfish']     },
  // ── Divergent placements (§3b) ───────────────────────────
  { id: 'sojove-mleko',      familyId: 'dairy' as FamilyId,       allergenIds: ['soy']           },
  { id: 'ryzove-mleko',      familyId: 'dairy' as FamilyId,       allergenIds: []                },
  // ── Composite food (§3c) ─────────────────────────────────
  { id: 'hummus',            familyId: 'legumes' as FamilyId,     allergenIds: ['legumes', 'sesame'] },
  // ── Loose everyday foods (§3d) ───────────────────────────
  // Grains
  { id: 'ryze',              familyId: 'grains' as FamilyId,      allergenIds: []                },
  { id: 'pohanka',           familyId: 'grains' as FamilyId,      allergenIds: []                },
  { id: 'ovesne-vlocky',     familyId: 'grains' as FamilyId,      allergenIds: []                },
  { id: 'proso-jahly',       familyId: 'grains' as FamilyId,      allergenIds: []                },
  // Vegetables
  { id: 'okurka',            familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'cuketa',            familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'spenat',            familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'paprika',           familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'brokolice',         familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'mrkev',             familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'brambory',          familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'cesnek',            familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  { id: 'cibule',            familyId: 'vegetables' as FamilyId,  allergenIds: []                },
  // Fruit
  { id: 'jablko',            familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'hruska',            familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'merunka',           familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'broskev',           familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'hrozny',            familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'boruvky',           familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'banan',             familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'kiwi',              familyId: 'fruit' as FamilyId,       allergenIds: []                },
  { id: 'mango',             familyId: 'fruit' as FamilyId,       allergenIds: []                },
  // Meat
  { id: 'kureci-prsa',       familyId: 'meat' as FamilyId,        allergenIds: []                },
  { id: 'hovezi',            familyId: 'meat' as FamilyId,        allergenIds: []                },
  { id: 'veprovka',          familyId: 'meat' as FamilyId,        allergenIds: []                },
  { id: 'kruti',             familyId: 'meat' as FamilyId,        allergenIds: []                },
  { id: 'jehnneci',          familyId: 'meat' as FamilyId,        allergenIds: []                },
  // Fish/seafood
  { id: 'treska',            familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish']          },
  { id: 'pstruh',            familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish']          },
  { id: 'tunak',             familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish']          },
  { id: 'sardinky',          familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish']          },
  // Legumes
  { id: 'cocka',             familyId: 'legumes' as FamilyId,     allergenIds: ['legumes']       },
  { id: 'fazole',            familyId: 'legumes' as FamilyId,     allergenIds: ['legumes']       },
  { id: 'hrac',              familyId: 'legumes' as FamilyId,     allergenIds: ['legumes']       },
  { id: 'cizrna',            familyId: 'legumes' as FamilyId,     allergenIds: ['legumes']       },
  // Nuts/seeds
  { id: 'vlassky-orech',     familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts']          },
  { id: 'mandle',            familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts']          },
  { id: 'dynova-seminka',    familyId: 'nuts-seeds' as FamilyId,  allergenIds: []                },
  { id: 'lnene-semenko',     familyId: 'nuts-seeds' as FamilyId,  allergenIds: []                },
  { id: 'slunecnicova-seminka', familyId: 'nuts-seeds' as FamilyId, allergenIds: ['seeds']       },
  // Sweet
  { id: 'med',               familyId: 'sweet' as FamilyId,       allergenIds: []                },
  { id: 'javorovy-sirup',    familyId: 'sweet' as FamilyId,       allergenIds: []                },
  { id: 'trtinovy-cukr',     familyId: 'sweet' as FamilyId,       allergenIds: []                },
  // Spices/condiments
  { id: 'sul',               familyId: 'spices-condiments' as FamilyId, allergenIds: []          },
  { id: 'kmin',              familyId: 'spices-condiments' as FamilyId, allergenIds: []          },
  { id: 'skorice',           familyId: 'spices-condiments' as FamilyId, allergenIds: []          },
  { id: 'pepr',              familyId: 'spices-condiments' as FamilyId, allergenIds: []          },
  { id: 'kecup',             familyId: 'spices-condiments' as FamilyId, allergenIds: ['tomatoes'] },
  { id: 'horcice',           familyId: 'spices-condiments' as FamilyId, allergenIds: ['mustard'] },
  { id: 'ocet',              familyId: 'spices-condiments' as FamilyId, allergenIds: ['vinegar-fermented'] },
  // Drinks
  { id: 'voda',              familyId: 'drinks' as FamilyId,      allergenIds: []                },
  { id: 'bylinny-caj',       familyId: 'drinks' as FamilyId,      allergenIds: []                },
  { id: 'kava',              familyId: 'drinks' as FamilyId,      allergenIds: ['coffee-tea']    },
  { id: 'cerny-caj',         familyId: 'drinks' as FamilyId,      allergenIds: ['coffee-tea']    },
] as const satisfies readonly FoodRecord[];

export type CatalogFoodId = typeof FOODS[number]['id'];
/** CustomFoodId = `other:${string}` — user-typed foods, never a protocol phase */
export type CustomFoodId = `other:${string}`;
export type FoodId = CatalogFoodId | CustomFoodId;

/** User-defined custom allergens (e.g. `'other:Paprika'`); never enter a protocol phase. */
export type CustomAllergenId = `other:${string}`;
