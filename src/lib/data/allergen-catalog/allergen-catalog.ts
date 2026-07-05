// Three-collection catalog — families, allergens, foods (ADR-0017 slice 2 / issue #227).
// Ids derive from the data; types are structurally enforced at compile time.

import type { AllergenProtocol, Ladder } from '$lib/domain/canonical-allergen';

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
  { id: 'fats-oils',          icon: '🧈' },
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
  ladder?: Ladder;
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
    ladder: {
      allergenId: 'dairy',
      steps: [
        { id: 'dairy-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'dairy-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'dairy-3', anchor: 'package', isEvaluationCheckpoint: false },
        { id: 'dairy-4', anchor: 'package', isEvaluationCheckpoint: false },
        { id: 'dairy-5', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'eggs',
      steps: [
        { id: 'eggs-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'eggs-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'eggs-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'wheat',
      steps: [
        { id: 'wheat-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'wheat-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'wheat-3', anchor: 'package', isEvaluationCheckpoint: false },
        { id: 'wheat-4', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'soy',
      steps: [
        { id: 'soy-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'soy-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'soy-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'nuts',
      steps: [
        { id: 'nuts-1', anchor: 'pinch',   isEvaluationCheckpoint: false },
        { id: 'nuts-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'nuts-3', anchor: 'package', isEvaluationCheckpoint: false },
        { id: 'nuts-4', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'fish',
      steps: [
        { id: 'fish-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'fish-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'fish-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'shellfish',
      steps: [
        { id: 'shellfish-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'shellfish-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'shellfish-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'citrus',
      steps: [
        { id: 'citrus-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'citrus-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'citrus-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'chocolate',
      steps: [
        { id: 'chocolate-1', anchor: 'pinch',   isEvaluationCheckpoint: false },
        { id: 'chocolate-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'chocolate-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'tomatoes',
      steps: [
        { id: 'tomatoes-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'tomatoes-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'tomatoes-3', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'tomatoes-4', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'strawberries',
      steps: [
        { id: 'strawberries-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'strawberries-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'strawberries-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'corn',
      steps: [
        { id: 'corn-1', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'corn-2', anchor: 'portion', isEvaluationCheckpoint: false },
        { id: 'corn-3', anchor: 'package', isEvaluationCheckpoint: true  },
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
    ladder: {
      allergenId: 'sesame',
      steps: [
        { id: 'sesame-1', anchor: 'teaspoon', isEvaluationCheckpoint: false },
        { id: 'sesame-2', anchor: 'spoon',    isEvaluationCheckpoint: false },
        { id: 'sesame-3', anchor: 'package',  isEvaluationCheckpoint: true  },
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
  { id: 'celery',             familyId: 'vegetables' as FamilyId,        icon: '🥬', aliases: ['celery', 'celer'] },
  { id: 'other-vegetables',   familyId: 'vegetables' as FamilyId,        icon: '🥒', aliases: ['vegetables', 'zelenina', 'paprika', 'cucumber', 'okurka', 'cuketa', 'zucchini'] },
  { id: 'meat',               familyId: 'meat' as FamilyId,              icon: '🥩', aliases: ['meat', 'maso'] },
  { id: 'beef',               familyId: 'meat' as FamilyId,              icon: '🐄', aliases: ['beef', 'hovězí', 'telecí', 'cow protein', 'BSA'] },
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

/**
 * Ids of every rung on every ladder authored in `ALLERGENS`. Derived from the
 * data so per-step Czech captions in `strings/ladder.ts` fail `tsc` via a
 * `satisfies Record<LadderStepId, ...>` clause when a rung is added but its
 * caption is missing (ADR-0014).
 */
export type LadderStepId = NonNullable<
  Extract<typeof ALLERGENS[number], { ladder: object }>['ladder']
>['steps'][number]['id'];

// ── Foods ─────────────────────────────────────────────────────

/**
 * Physical form of a food, governing which preparation chips make sense.
 * Catalog-only metadata — never persisted on a logged meal item.
 *   - none      → no preparation row (water, oil, salt, sugar)
 *   - liquid    → raw · boiled · baked (milk, drinkable)
 *   - cookable  → all four chips (potato, meat, rice, vegetables, most fruit — anything not destroyed by cooking)
 *   - raw-only  → only raw (leafy salad, cucumber — destroyed or made unpalatable by heat)
 *
 * Single source of truth — the type derives from this array, and
 * `formPreparations` fails `tsc` via its `satisfies` clause until it covers
 * every value here.
 */
export const FOOD_FORMS = ['none', 'liquid', 'cookable', 'raw-only'] as const;
export type FoodForm = (typeof FOOD_FORMS)[number];

type FoodRecord = {
  id: string;
  familyId: FamilyId;
  allergenIds: readonly CatalogAllergenId3[];
  form: FoodForm;
  aliases?: readonly string[];
  /**
   * Optional presentation key clustering foods within a family (ADR-0019).
   * Independent of `familyId`/`allergenIds`; never enters conflict detection.
   */
  sourceGroup?: string;
};

export const FOODS = [
  // ── Food twins (§3a) ─────────────────────────────────────
  { id: 'vejce',             familyId: 'eggs' as FamilyId,        allergenIds: ['eggs'],         form: 'cookable', aliases: ['celé vejce'] },
  { id: 'bilek',             familyId: 'eggs' as FamilyId,        allergenIds: ['eggs'],         form: 'cookable', aliases: ['bílek', 'vaječný bílek', 'egg white'] },
  { id: 'zloutek',           familyId: 'eggs' as FamilyId,        allergenIds: ['eggs'],         form: 'cookable', aliases: ['žloutek', 'vaječný žloutek', 'egg yolk'] },
  { id: 'kravske-mleko',     familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'liquid',   sourceGroup: 'cow' },
  { id: 'jogurt',            familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'liquid',   sourceGroup: 'cow' },
  { id: 'psenice',           familyId: 'grains' as FamilyId,      allergenIds: ['wheat'],        form: 'cookable', sourceGroup: 'gluten' },
  { id: 'tofu',              familyId: 'legumes' as FamilyId,     allergenIds: ['soy'],          form: 'cookable' },
  { id: 'sezam',             familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['sesame'],       form: 'cookable', sourceGroup: 'seminka' },
  { id: 'jahody',            familyId: 'fruit' as FamilyId,       allergenIds: ['strawberries'], form: 'cookable', sourceGroup: 'bobuloviny' },
  { id: 'rajce',             familyId: 'vegetables' as FamilyId,  allergenIds: ['tomatoes'],     form: 'cookable', sourceGroup: 'plodova' },
  { id: 'kukurice',          familyId: 'grains' as FamilyId,      allergenIds: ['corn'],         form: 'cookable', sourceGroup: 'gluten-free' },
  { id: 'pomeranc',          familyId: 'fruit' as FamilyId,       allergenIds: ['citrus'],       form: 'cookable', sourceGroup: 'citrusy' },
  { id: 'horka-cokolada',   familyId: 'sweet' as FamilyId,       allergenIds: ['chocolate'],    form: 'raw-only', sourceGroup: 'chocolate', aliases: ['hořká čokoláda', 'dark chocolate'] },
  { id: 'losos',             familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske' },
  { id: 'krevetky',          familyId: 'fish-seafood' as FamilyId,allergenIds: ['shellfish'],    form: 'cookable', sourceGroup: 'plody-more' },
  // ── Divergent placements (§3b) ───────────────────────────
  { id: 'sojove-mleko',      familyId: 'dairy' as FamilyId,       allergenIds: ['soy'],          form: 'liquid', aliases: ['sójové mléko', 'sojove mleko', 'soya milk'], sourceGroup: 'plant' },
  { id: 'ryzove-mleko',      familyId: 'dairy' as FamilyId,       allergenIds: [],               form: 'liquid', aliases: ['rýžové mléko', 'rice milk'], sourceGroup: 'plant' },
  { id: 'mandlove-mleko',    familyId: 'dairy' as FamilyId,       allergenIds: ['nuts'],         form: 'liquid', aliases: ['mandlové mléko', 'almond milk'], sourceGroup: 'plant' },
  { id: 'ovesne-mleko',      familyId: 'dairy' as FamilyId,       allergenIds: [],               form: 'liquid', aliases: ['ovesné mléko', 'oat milk'], sourceGroup: 'plant' },
  { id: 'kokosove-mleko',    familyId: 'dairy' as FamilyId,       allergenIds: [],               form: 'liquid', aliases: ['kokosové mléko', 'coconut milk'], sourceGroup: 'plant' },
  { id: 'ovci-mleko',        familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'liquid', aliases: ['ovčí mléko', 'sheep milk'], sourceGroup: 'sheep' },
  { id: 'kozi-mleko',        familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'liquid', aliases: ['kozí mléko', 'goat milk'], sourceGroup: 'goat' },
  // ── Composite food (§3c) ─────────────────────────────────
  { id: 'hummus', familyId: 'legumes' as FamilyId, allergenIds: ['legumes', 'sesame'], form: 'raw-only', aliases: ['hummus', 'homus'] },
   { id: 'mlecna-cokolada',  familyId: 'sweet' as FamilyId,       allergenIds: ['chocolate', 'dairy'], form: 'raw-only', sourceGroup: 'chocolate', aliases: ['mléčná čokoláda', 'milk chocolate'] },
   { id: 'oriskova-cokolada', familyId: 'sweet' as FamilyId,      allergenIds: ['chocolate', 'dairy', 'nuts'], form: 'raw-only', sourceGroup: 'chocolate', aliases: ['oříšková čokoláda', 'hazelnut chocolate'] },
  // ── Loose everyday foods (§3d) ───────────────────────────
  // Dairy — cow product split (earned: jogurt fermented, sýr/tvaroh casein-heavy, smetana fat-rich)
  // Note: cooking fats (máslo, ghí, rostlinné máslo) live in `fats-oils` family — they share a
  // shopping aisle with sádlo and olej, not with milk drinks. Allergen tags preserved (máslo + ghí
  // still carry `dairy` for elimination).
  { id: 'tvaroh',            familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'raw-only', sourceGroup: 'cow' },
  { id: 'syr',               familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'cookable', sourceGroup: 'cow' },
  { id: 'smetana',           familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'liquid',   sourceGroup: 'cow' },
  { id: 'brynza',            familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'cookable', sourceGroup: 'sheep' },
  { id: 'kozi-syr',          familyId: 'dairy' as FamilyId,       allergenIds: ['dairy'],        form: 'cookable', sourceGroup: 'goat', aliases: ['kozí sýr'] },
  // Grains — source-tier only (ADR-0019 + #319 follow-up).
  // Specific products (chleb, rohlík, těstoviny, mouka) reduce to their source.
  { id: 'oves',              familyId: 'grains' as FamilyId,      allergenIds: [],               form: 'cookable', sourceGroup: 'gluten' },
  { id: 'jecmen',            familyId: 'grains' as FamilyId,      allergenIds: [],               form: 'cookable', sourceGroup: 'gluten' },
  { id: 'zito',              familyId: 'grains' as FamilyId,      allergenIds: [],               form: 'cookable', sourceGroup: 'gluten' },
  { id: 'ryze',              familyId: 'grains' as FamilyId,      allergenIds: [],               form: 'cookable', aliases: ['rýže', 'ryze', 'rice'], sourceGroup: 'gluten-free' },
  { id: 'pohanka',           familyId: 'grains' as FamilyId,      allergenIds: [],               form: 'cookable', sourceGroup: 'gluten-free' },
  { id: 'proso-jahly',       familyId: 'grains' as FamilyId,      allergenIds: [],               form: 'cookable', sourceGroup: 'gluten-free' },
  { id: 'quinoa',            familyId: 'grains' as FamilyId,      allergenIds: [],               form: 'cookable', sourceGroup: 'gluten-free' },
  // Vegetables
  // Vegetables — 6-group culinary axis (Plodová / Listová / Kořenová / Cibulová / Hlízová / Košťálová).
  // Houby renders under `Ostatní` (mushrooms aren't culinary vegetables).
  { id: 'okurka',            familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'raw-only', sourceGroup: 'plodova' },
  { id: 'cuketa',            familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'plodova' },
  { id: 'spenat',            familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'listova' },
  { id: 'listovy-salat',     familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'raw-only', sourceGroup: 'listova', aliases: ['listový salát', 'salát'] },
  { id: 'paprika',           familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'plodova' },
  { id: 'brokolice',         familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'kostalova' },
  { id: 'mrkev',             familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'korenova' },
  { id: 'pastynak',          familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'korenova', aliases: ['pastyňák'] },
  { id: 'celer',             familyId: 'vegetables' as FamilyId,  allergenIds: ['celery'],       form: 'cookable', sourceGroup: 'korenova' },
  { id: 'redkev',            familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'raw-only', sourceGroup: 'korenova', aliases: ['ředkev', 'ředkvička'] },
  { id: 'brambory',          familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'hlizova' },
  { id: 'cesnek',            familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'cibulova' },
  { id: 'cibule',            familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'cibulova' },
  { id: 'kvetak',            familyId: 'vegetables' as FamilyId,  allergenIds: ['cabbage-brassica'], form: 'cookable', sourceGroup: 'kostalova', aliases: ['květák'] },
  { id: 'zeli',               familyId: 'vegetables' as FamilyId,  allergenIds: ['cabbage-brassica'], form: 'cookable', sourceGroup: 'kostalova', aliases: ['zelí'] },
  { id: 'dyne',               familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'plodova', aliases: ['dýně'] },
  { id: 'repa',               familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'korenova', aliases: ['řepa'] },
  { id: 'bataty',             familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'hlizova', aliases: ['batáty'] },
  { id: 'lilek',              familyId: 'vegetables' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'plodova' },
  { id: 'houby',              familyId: 'vegetables' as FamilyId,  allergenIds: ['mushroom'],     form: 'cookable' },
  // Fruit
  { id: 'jablko',            familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'jadroviny' },
  { id: 'hruska',            familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'jadroviny' },
  { id: 'merunka',           familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'peckoviny' },
  { id: 'broskev',           familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'peckoviny' },
  { id: 'hrozny',            familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'bobuloviny' },
  { id: 'svestka',           familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'peckoviny', aliases: ['švestka'] },
  { id: 'tresne',            familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'peckoviny', aliases: ['třešně', 'višně'] },
  { id: 'boruvky',           familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'bobuloviny' },
  { id: 'maliny',            familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'bobuloviny' },
  { id: 'rybiz',             familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'bobuloviny', aliases: ['rybíz'] },
  { id: 'banan',             familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'tropicke' },
  { id: 'kiwi',              familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'tropicke' },
  { id: 'mango',             familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'tropicke' },
  { id: 'ananas',            familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'tropicke' },
  { id: 'avokado',           familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'tropicke', aliases: ['avokádo'] },
  { id: 'granatove-jablko',  familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'tropicke', aliases: ['granátové jablko', 'pomegranate'] },
  { id: 'citron',            familyId: 'fruit' as FamilyId,       allergenIds: ['citrus'],       form: 'cookable', sourceGroup: 'citrusy' },
  { id: 'mandarinka',        familyId: 'fruit' as FamilyId,       allergenIds: ['citrus'],       form: 'cookable', sourceGroup: 'citrusy' },
  { id: 'grapefruit',        familyId: 'fruit' as FamilyId,       allergenIds: ['citrus'],       form: 'cookable', sourceGroup: 'citrusy' },
  { id: 'meloun',            familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'tropicke' },
  { id: 'brusinky',          familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'bobuloviny' },
  { id: 'ostruziny',         familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'bobuloviny', aliases: ['ostružiny'] },
  { id: 'angrest',           familyId: 'fruit' as FamilyId,       allergenIds: [],               form: 'cookable', sourceGroup: 'bobuloviny', aliases: ['angrešt'] },
  // Meat
  { id: 'kureci',            familyId: 'meat' as FamilyId,        allergenIds: ['eggs'],         form: 'cookable' },
  { id: 'hovezi',            familyId: 'meat' as FamilyId,        allergenIds: ['beef'],         form: 'cookable' },
  { id: 'teleci',            familyId: 'meat' as FamilyId,        allergenIds: ['beef'],         form: 'cookable', aliases: ['telecí'] },
  { id: 'veprove',          familyId: 'meat' as FamilyId,        allergenIds: [],               form: 'cookable' },
  { id: 'kruti',             familyId: 'meat' as FamilyId,        allergenIds: [],               form: 'cookable' },
  { id: 'jehnneci',          familyId: 'meat' as FamilyId,        allergenIds: [],               form: 'cookable' },
  { id: 'kachna',            familyId: 'meat' as FamilyId,        allergenIds: [],               form: 'cookable' },
  { id: 'kralik',            familyId: 'meat' as FamilyId,        allergenIds: [],               form: 'cookable', aliases: ['králík'] },
  { id: 'zverina',           familyId: 'meat' as FamilyId,        allergenIds: ['dairy'],        form: 'cookable', aliases: ['zvěřina', 'jelení', 'srnčí', 'divočák'] },
  // Note: sádlo (rendered pork fat) lives in `fats-oils` family — it's a cooking fat, not meat.
  // Fish/seafood
  { id: 'treska',            familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske' },
  { id: 'tunak',             familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske' },
  { id: 'sardinky',          familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske' },
  { id: 'makrela',           familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske' },
  { id: 'sled',              familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske', aliases: ['sleď'] },
  { id: 'halibut',           familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske' },
  { id: 'tilapie',           familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'morske' },
  { id: 'pstruh',            familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'sladkovodni' },
  { id: 'kapr',              familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'sladkovodni' },
  { id: 'sumec',             familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'sladkovodni' },
  { id: 'pangas',            familyId: 'fish-seafood' as FamilyId,allergenIds: ['fish'],         form: 'cookable', sourceGroup: 'sladkovodni' },
  { id: 'musle',             familyId: 'fish-seafood' as FamilyId,allergenIds: ['shellfish'],    form: 'cookable', sourceGroup: 'plody-more', aliases: ['mušle'] },
  { id: 'krab',              familyId: 'fish-seafood' as FamilyId,allergenIds: ['shellfish'],    form: 'cookable', sourceGroup: 'plody-more' },
  // Legumes
  { id: 'cocka',             familyId: 'legumes' as FamilyId,     allergenIds: ['legumes'],      form: 'cookable' },
  { id: 'fazole',            familyId: 'legumes' as FamilyId,     allergenIds: ['legumes'],      form: 'cookable' },
  { id: 'hrac',              familyId: 'legumes' as FamilyId,     allergenIds: ['legumes'],      form: 'cookable' },
  { id: 'cizrna',            familyId: 'legumes' as FamilyId,     allergenIds: ['legumes'],      form: 'cookable' },
  { id: 'tempeh',            familyId: 'legumes' as FamilyId,     allergenIds: ['soy'],          form: 'cookable' },
  { id: 'edamame',           familyId: 'legumes' as FamilyId,     allergenIds: ['soy'],          form: 'cookable' },
  // Nuts/seeds
  { id: 'vlassky-orech',     familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy' },
  { id: 'mandle',            familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy' },
  { id: 'liskove',           familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy', aliases: ['lískové ořechy'] },
  { id: 'kesu',              familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy', aliases: ['kešu'] },
  { id: 'para',              familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy', aliases: ['para ořechy'] },
  { id: 'arasidy',           familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy', aliases: ['arašídy', 'peanuts'] },
  { id: 'pekanove',          familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy', aliases: ['pekanové ořechy', 'pecans'] },
  { id: 'pistacie',          familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy', aliases: ['pistácie', 'pistachios'] },
  { id: 'makadamove',        familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['nuts'],         form: 'raw-only', sourceGroup: 'orechy', aliases: ['makadamové ořechy', 'macadamia'] },
  { id: 'kokos',             familyId: 'nuts-seeds' as FamilyId,  allergenIds: [],               form: 'cookable', sourceGroup: 'orechy', aliases: ['kokosové vločky', 'coconut'] },
  { id: 'dynova-seminka',    familyId: 'nuts-seeds' as FamilyId,  allergenIds: [],               form: 'raw-only', sourceGroup: 'seminka' },
  { id: 'lnene-semenko',     familyId: 'nuts-seeds' as FamilyId,  allergenIds: [],               form: 'raw-only', sourceGroup: 'seminka' },
  { id: 'slunecnicova-seminka', familyId: 'nuts-seeds' as FamilyId, allergenIds: ['seeds'],      form: 'raw-only', sourceGroup: 'seminka' },
  { id: 'chia',              familyId: 'nuts-seeds' as FamilyId,  allergenIds: [],               form: 'raw-only', sourceGroup: 'seminka' },
  { id: 'mak',               familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['seeds'],        form: 'cookable', sourceGroup: 'seminka', aliases: ['mák', 'poppy seeds'] },
  { id: 'konopna-seminka',   familyId: 'nuts-seeds' as FamilyId,  allergenIds: ['seeds'],        form: 'raw-only', sourceGroup: 'seminka', aliases: ['konopná semínka', 'hemp seeds'] },
  // Fats & oils — cooking fats consolidated (Q7: split out from dairy/meat/spices)
  // Source axis: plant (oils, margarine) / animal (dairy fats + rendered pork fat).
  // Oils split by type (option A) — different fatty-acid profiles are a plausible
  // eczema insight signal; all carry [] (refined oil ≈ no seed/fruit protein).
  { id: 'maslo',             familyId: 'fats-oils' as FamilyId,   allergenIds: ['dairy'],        form: 'cookable', sourceGroup: 'animal' },
  { id: 'ghi',               familyId: 'fats-oils' as FamilyId,   allergenIds: ['dairy'],        form: 'cookable', sourceGroup: 'animal', aliases: ['ghí', 'ghee', 'přepuštěné máslo'] },
  { id: 'sadlo',             familyId: 'fats-oils' as FamilyId,   allergenIds: [],               form: 'cookable', sourceGroup: 'animal', aliases: ['sádlo', 'vepřové sádlo', 'husí sádlo'] },
  { id: 'rostlinne-maslo',   familyId: 'fats-oils' as FamilyId,   allergenIds: [],               form: 'cookable', sourceGroup: 'plant',  aliases: ['rostlinné máslo', 'margarín', 'Rama', 'Flora'] },
  { id: 'olivovy-olej',      familyId: 'fats-oils' as FamilyId,   allergenIds: [],               form: 'cookable', sourceGroup: 'plant',  aliases: ['olivový olej', 'olive oil'] },
  { id: 'repkovy-olej',      familyId: 'fats-oils' as FamilyId,   allergenIds: [],               form: 'cookable', sourceGroup: 'plant',  aliases: ['řepkový olej', 'rapeseed oil', 'canola'] },
  { id: 'slunecnicovy-olej', familyId: 'fats-oils' as FamilyId,   allergenIds: [],               form: 'cookable', sourceGroup: 'plant',  aliases: ['slunečnicový olej', 'sunflower oil'] },
  { id: 'lneny-olej',        familyId: 'fats-oils' as FamilyId,   allergenIds: [],               form: 'cookable', sourceGroup: 'plant',  aliases: ['lněný olej', 'flaxseed oil', 'linseed oil'] },
  { id: 'kokosovy-olej',     familyId: 'fats-oils' as FamilyId,   allergenIds: [],               form: 'cookable', sourceGroup: 'plant',  aliases: ['kokosový olej', 'coconut oil'] },
  // Sweet
  { id: 'kakao',             familyId: 'sweet' as FamilyId,       allergenIds: ['chocolate'],    form: 'none',     sourceGroup: 'chocolate', aliases: ['kakao', 'cocoa', 'kakaový prášek'] },
  { id: 'karob',             familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'chocolate', aliases: ['karob', 'carob', 'svatojánský chléb'] },
  { id: 'med',               familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'sweetener' },
  { id: 'javorovy-sirup',    familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'sweetener' },
  { id: 'agavovy-sirup',     familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'sweetener', aliases: ['agávový sirup', 'agave syrup'] },
  { id: 'cekankovy-sirup',   familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'sweetener', aliases: ['čekankový sirup', 'chicory syrup'] },
  { id: 'cukr',              familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'sweetener', aliases: ['cukr', 'třtinový cukr', 'bílý cukr', 'sugar'] },
  { id: 'xylitol',           familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'sweetener', aliases: ['xylitol', 'březový cukr', 'birch sugar'] },
  { id: 'stevie',            familyId: 'sweet' as FamilyId,       allergenIds: [],               form: 'none',     sourceGroup: 'sweetener', aliases: ['stévie', 'stevia'] },
  // Spices/condiments
  { id: 'sul',               familyId: 'spices-condiments' as FamilyId, allergenIds: [],         form: 'none'     },
  // Bylinky aggregated (fresh + dried herbs share [] allergen signal); individual spices
  // split out per #338 — cinnamon/chilli/cumin/paprika powder appear often enough to
  // warrant their own tiles. Yeast (droždí) gets a tile so it can be logged from /meal.
  { id: 'bylinky',           familyId: 'spices-condiments' as FamilyId, allergenIds: [],         form: 'none', aliases: ['bylinky', 'bazalka', 'oregano', 'petržel', 'majoránka', 'kurkuma', 'zázvor', 'tymián', 'rozmarýn', 'koriandr'] },
  { id: 'skorice',           familyId: 'spices-condiments' as FamilyId, allergenIds: [],         form: 'none', aliases: ['skořice', 'cinnamon'] },
  { id: 'chilli',            familyId: 'spices-condiments' as FamilyId, allergenIds: [],         form: 'none', aliases: ['chilli', 'chili', 'kajenský pepř', 'cayenne'] },
  { id: 'kmin',              familyId: 'spices-condiments' as FamilyId, allergenIds: [],         form: 'none', aliases: ['kmín', 'caraway'] },
  { id: 'mleta-paprika',     familyId: 'spices-condiments' as FamilyId, allergenIds: [],         form: 'none', aliases: ['mletá paprika', 'paprika powder', 'sladká paprika', 'uzená paprika'] },
  { id: 'drozdi',            familyId: 'spices-condiments' as FamilyId, allergenIds: ['yeast'],  form: 'none', aliases: ['droždí', 'kvasnice', 'pekařské droždí', 'sušené droždí'] },
  { id: 'kecup',             familyId: 'spices-condiments' as FamilyId, allergenIds: ['tomatoes'], form: 'none' },
  { id: 'horcice',           familyId: 'spices-condiments' as FamilyId, allergenIds: ['mustard'], form: 'none' },
  { id: 'ocet',              familyId: 'spices-condiments' as FamilyId, allergenIds: ['vinegar-fermented'], form: 'none', aliases: ['ocet', 'jablečný ocet', 'vinný ocet', 'balsamico'] },
  // Drinks — all form: none (beverages are drunk, not prepared raw/cooked)
  { id: 'bylinny-caj',       familyId: 'drinks' as FamilyId,      allergenIds: [],               form: 'none'   },
  { id: 'kava',              familyId: 'drinks' as FamilyId,      allergenIds: ['coffee-tea'],   form: 'none'   },
  { id: 'caj',               familyId: 'drinks' as FamilyId,      allergenIds: ['coffee-tea'],   form: 'none', aliases: ['čaj', 'černý čaj', 'zelený čaj', 'bílý čaj', 'oolong'] },
  { id: 'obilna-kava',       familyId: 'drinks' as FamilyId,      allergenIds: ['wheat'],        form: 'none', aliases: ['obilná káva', 'Caro', 'Melta', 'cikorka'] },
  { id: 'pivo',              familyId: 'drinks' as FamilyId,      allergenIds: ['wheat', 'yeast'], form: 'none', aliases: ['pivo', 'nealkoholické pivo', 'alkoholické pivo', 'beer'] },
  { id: 'vino',              familyId: 'drinks' as FamilyId,      allergenIds: ['sulphites-additives'], form: 'none', aliases: ['víno', 'wine'] },
  { id: 'tvrdy-alkohol',     familyId: 'drinks' as FamilyId,      allergenIds: [],               form: 'none', aliases: ['tvrdý alkohol', 'destilát', 'spirits'] },
  { id: 'dzus',              familyId: 'drinks' as FamilyId,      allergenIds: [],               form: 'none', aliases: ['džus'] },
] as const satisfies readonly FoodRecord[];

export type CatalogFoodId = typeof FOODS[number]['id'];
/** CustomFoodId = `other:${string}` — user-typed foods, never a protocol phase */
export type CustomFoodId = `other:${string}`;
export type FoodId = CatalogFoodId | CustomFoodId;

/** User-defined custom allergens (e.g. `'other:Paprika'`); never enter a protocol phase. */
export type CustomAllergenId = `other:${string}`;
