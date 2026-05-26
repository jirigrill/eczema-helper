import type { AllergenId, Category, ProtocolAllergenId } from '$lib/domain/models';

// ── Food categories (mirrors DB seed data) ────────────────────
export const CATEGORIES: Category[] = [
  { allergenId: 'dairy', nameCs: 'Mléčné výrobky', icon: '🥛', subItems: [
    { subitemId: 'dairy:milk', allergenId: 'dairy', nameCs: 'Kravské mléko' },
    { subitemId: 'dairy:butter', allergenId: 'dairy', nameCs: 'Máslo' },
    { subitemId: 'dairy:cheese', allergenId: 'dairy', nameCs: 'Sýr' },
    { subitemId: 'dairy:yogurt', allergenId: 'dairy', nameCs: 'Jogurt' },
    { subitemId: 'dairy:cream', allergenId: 'dairy', nameCs: 'Smetana' },
    { subitemId: 'dairy:cottage', allergenId: 'dairy', nameCs: 'Tvaroh' },
  ]},
  { allergenId: 'eggs', nameCs: 'Vejce', icon: '🥚', subItems: [
    { subitemId: 'eggs:egg-white', allergenId: 'eggs', nameCs: 'Bílek' },
    { subitemId: 'eggs:egg-yolk', allergenId: 'eggs', nameCs: 'Žloutek' },
  ]},
  { allergenId: 'wheat', nameCs: 'Pšenice / lepek', icon: '🌾', subItems: [
    { subitemId: 'wheat:bread', allergenId: 'wheat', nameCs: 'Chléb / rohlík' },
    { subitemId: 'wheat:pasta', allergenId: 'wheat', nameCs: 'Těstoviny' },
    { subitemId: 'wheat:flour', allergenId: 'wheat', nameCs: 'Mouka' },
    { subitemId: 'wheat:gluten', allergenId: 'wheat', nameCs: 'Lepek (gluten)' },
  ]},
  { allergenId: 'soy', nameCs: 'Sója', icon: '🫘', subItems: [
    { subitemId: 'soy:soy-milk', allergenId: 'soy', nameCs: 'Sójové mléko' },
    { subitemId: 'soy:tofu', allergenId: 'soy', nameCs: 'Tofu' },
    { subitemId: 'soy:soy-sauce', allergenId: 'soy', nameCs: 'Sójová omáčka' },
    { subitemId: 'soy:soy-lecithin', allergenId: 'soy', nameCs: 'Sójový lecitin' },
  ]},
  { allergenId: 'nuts', nameCs: 'Ořechy', icon: '🥜', subItems: [
    { subitemId: 'nuts:peanuts', allergenId: 'nuts', nameCs: 'Arašídy' },
    { subitemId: 'nuts:walnuts', allergenId: 'nuts', nameCs: 'Vlašské ořechy' },
    { subitemId: 'nuts:hazelnuts', allergenId: 'nuts', nameCs: 'Lískové ořechy' },
    { subitemId: 'nuts:almonds', allergenId: 'nuts', nameCs: 'Mandle' },
    { subitemId: 'nuts:cashews', allergenId: 'nuts', nameCs: 'Kešu' },
  ]},
  { allergenId: 'fish', nameCs: 'Ryby', icon: '🐟', subItems: [
    { subitemId: 'fish:freshwater-fish', allergenId: 'fish', nameCs: 'Sladkovodní ryby' },
    { subitemId: 'fish:saltwater-fish', allergenId: 'fish', nameCs: 'Mořské ryby' },
    { subitemId: 'fish:fish-oil', allergenId: 'fish', nameCs: 'Rybí tuk' },
  ]},
  { allergenId: 'shellfish', nameCs: 'Korýši a měkkýši', icon: '🦐', subItems: [
    { subitemId: 'shellfish:shrimp', allergenId: 'shellfish', nameCs: 'Krevety' },
    { subitemId: 'shellfish:crab', allergenId: 'shellfish', nameCs: 'Krab' },
    { subitemId: 'shellfish:mussels', allergenId: 'shellfish', nameCs: 'Mušle' },
  ]},
  { allergenId: 'citrus', nameCs: 'Citrusy', icon: '🍋', subItems: [
    { subitemId: 'citrus:oranges', allergenId: 'citrus', nameCs: 'Pomeranče' },
    { subitemId: 'citrus:lemons', allergenId: 'citrus', nameCs: 'Citrony' },
    { subitemId: 'citrus:grapefruit', allergenId: 'citrus', nameCs: 'Grapefruit' },
    { subitemId: 'citrus:mandarins', allergenId: 'citrus', nameCs: 'Mandarinky' },
  ]},
  { allergenId: 'chocolate', nameCs: 'Čokoláda / kakao', icon: '🍫', subItems: [
    { subitemId: 'chocolate:dark-choc', allergenId: 'chocolate', nameCs: 'Hořká čokoláda' },
    { subitemId: 'chocolate:milk-choc', allergenId: 'chocolate', nameCs: 'Mléčná čokoláda' },
    { subitemId: 'chocolate:cocoa', allergenId: 'chocolate', nameCs: 'Kakao' },
  ]},
  { allergenId: 'tomatoes', nameCs: 'Rajčata', icon: '🍅', subItems: [
    { subitemId: 'tomatoes:fresh-tomatoes', allergenId: 'tomatoes', nameCs: 'Čerstvá rajčata' },
    { subitemId: 'tomatoes:tomato-sauce', allergenId: 'tomatoes', nameCs: 'Rajčatová omáčka' },
    { subitemId: 'tomatoes:ketchup', allergenId: 'tomatoes', nameCs: 'Kečup' },
  ]},
  { allergenId: 'strawberries', nameCs: 'Jahody', icon: '🍓', subItems: [
    { subitemId: 'strawberries:fresh-strawberries', allergenId: 'strawberries', nameCs: 'Čerstvé jahody' },
    { subitemId: 'strawberries:strawberry-jam', allergenId: 'strawberries', nameCs: 'Jahodový džem' },
  ]},
  { allergenId: 'corn', nameCs: 'Kukuřice', icon: '🌽', subItems: [
    { subitemId: 'corn:corn-flour', allergenId: 'corn', nameCs: 'Kukuřičná mouka' },
    { subitemId: 'corn:sweet-corn', allergenId: 'corn', nameCs: 'Kukuřice (sladká)' },
  ]},
  { allergenId: 'sesame', nameCs: 'Sezamové výrobky', icon: '🌰', subItems: [
    { subitemId: 'sesame:sesame-seeds', allergenId: 'sesame', nameCs: 'Sezamová semínka' },
    { subitemId: 'sesame:tahini', allergenId: 'sesame', nameCs: 'Tahini' },
  ]},
];

// Standard protocol — allergens eliminated and reintroduced in this order (least → most common trigger).
export const DEFAULT_TESTED_ALLERGENS: ProtocolAllergenId[] = ['soy', 'wheat', 'eggs', 'dairy'];

// ── Helpers ───────────────────────────────────────────────────

export function getCategoryById(id: AllergenId): Category | undefined {
  return CATEGORIES.find(c => c.allergenId === id);
}
