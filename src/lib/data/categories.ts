import type { Category } from '$lib/domain/models';

// ── Food categories (mirrors DB seed data) ────────────────────
export const CATEGORIES: Category[] = [
  { categoryId: 'dairy', nameCs: 'Mléčné výrobky', icon: '🥛', subItems: [
    { subitemId: 'dairy:milk', categoryId: 'dairy', nameCs: 'Kravské mléko' },
    { subitemId: 'dairy:butter', categoryId: 'dairy', nameCs: 'Máslo' },
    { subitemId: 'dairy:cheese', categoryId: 'dairy', nameCs: 'Sýr' },
    { subitemId: 'dairy:yogurt', categoryId: 'dairy', nameCs: 'Jogurt' },
    { subitemId: 'dairy:cream', categoryId: 'dairy', nameCs: 'Smetana' },
    { subitemId: 'dairy:cottage', categoryId: 'dairy', nameCs: 'Tvaroh' },
  ]},
  { categoryId: 'eggs', nameCs: 'Vejce', icon: '🥚', subItems: [
    { subitemId: 'eggs:egg-white', categoryId: 'eggs', nameCs: 'Bílek' },
    { subitemId: 'eggs:egg-yolk', categoryId: 'eggs', nameCs: 'Žloutek' },
  ]},
  { categoryId: 'wheat', nameCs: 'Pšenice / lepek', icon: '🌾', subItems: [
    { subitemId: 'wheat:bread', categoryId: 'wheat', nameCs: 'Chléb / rohlík' },
    { subitemId: 'wheat:pasta', categoryId: 'wheat', nameCs: 'Těstoviny' },
    { subitemId: 'wheat:flour', categoryId: 'wheat', nameCs: 'Mouka' },
    { subitemId: 'wheat:gluten', categoryId: 'wheat', nameCs: 'Lepek (gluten)' },
  ]},
  { categoryId: 'soy', nameCs: 'Sója', icon: '🫘', subItems: [
    { subitemId: 'soy:soy-milk', categoryId: 'soy', nameCs: 'Sójové mléko' },
    { subitemId: 'soy:tofu', categoryId: 'soy', nameCs: 'Tofu' },
    { subitemId: 'soy:soy-sauce', categoryId: 'soy', nameCs: 'Sójová omáčka' },
    { subitemId: 'soy:soy-lecithin', categoryId: 'soy', nameCs: 'Sójový lecitin' },
  ]},
  { categoryId: 'nuts', nameCs: 'Ořechy', icon: '🥜', subItems: [
    { subitemId: 'nuts:peanuts', categoryId: 'nuts', nameCs: 'Arašídy' },
    { subitemId: 'nuts:walnuts', categoryId: 'nuts', nameCs: 'Vlašské ořechy' },
    { subitemId: 'nuts:hazelnuts', categoryId: 'nuts', nameCs: 'Lískové ořechy' },
    { subitemId: 'nuts:almonds', categoryId: 'nuts', nameCs: 'Mandle' },
    { subitemId: 'nuts:cashews', categoryId: 'nuts', nameCs: 'Kešu' },
  ]},
  { categoryId: 'fish', nameCs: 'Ryby', icon: '🐟', subItems: [
    { subitemId: 'fish:freshwater-fish', categoryId: 'fish', nameCs: 'Sladkovodní ryby' },
    { subitemId: 'fish:saltwater-fish', categoryId: 'fish', nameCs: 'Mořské ryby' },
    { subitemId: 'fish:fish-oil', categoryId: 'fish', nameCs: 'Rybí tuk' },
  ]},
  { categoryId: 'shellfish', nameCs: 'Korýši a měkkýši', icon: '🦐', subItems: [
    { subitemId: 'shellfish:shrimp', categoryId: 'shellfish', nameCs: 'Krevety' },
    { subitemId: 'shellfish:crab', categoryId: 'shellfish', nameCs: 'Krab' },
    { subitemId: 'shellfish:mussels', categoryId: 'shellfish', nameCs: 'Mušle' },
  ]},
  { categoryId: 'citrus', nameCs: 'Citrusy', icon: '🍋', subItems: [
    { subitemId: 'citrus:oranges', categoryId: 'citrus', nameCs: 'Pomeranče' },
    { subitemId: 'citrus:lemons', categoryId: 'citrus', nameCs: 'Citrony' },
    { subitemId: 'citrus:grapefruit', categoryId: 'citrus', nameCs: 'Grapefruit' },
    { subitemId: 'citrus:mandarins', categoryId: 'citrus', nameCs: 'Mandarinky' },
  ]},
  { categoryId: 'chocolate', nameCs: 'Čokoláda / kakao', icon: '🍫', subItems: [
    { subitemId: 'chocolate:dark-choc', categoryId: 'chocolate', nameCs: 'Hořká čokoláda' },
    { subitemId: 'chocolate:milk-choc', categoryId: 'chocolate', nameCs: 'Mléčná čokoláda' },
    { subitemId: 'chocolate:cocoa', categoryId: 'chocolate', nameCs: 'Kakao' },
  ]},
  { categoryId: 'tomatoes', nameCs: 'Rajčata', icon: '🍅', subItems: [
    { subitemId: 'tomatoes:fresh-tomatoes', categoryId: 'tomatoes', nameCs: 'Čerstvá rajčata' },
    { subitemId: 'tomatoes:tomato-sauce', categoryId: 'tomatoes', nameCs: 'Rajčatová omáčka' },
    { subitemId: 'tomatoes:ketchup', categoryId: 'tomatoes', nameCs: 'Kečup' },
  ]},
  { categoryId: 'strawberries', nameCs: 'Jahody', icon: '🍓', subItems: [
    { subitemId: 'strawberries:fresh-strawberries', categoryId: 'strawberries', nameCs: 'Čerstvé jahody' },
    { subitemId: 'strawberries:strawberry-jam', categoryId: 'strawberries', nameCs: 'Jahodový džem' },
  ]},
  { categoryId: 'corn', nameCs: 'Kukuřice', icon: '🌽', subItems: [
    { subitemId: 'corn:corn-flour', categoryId: 'corn', nameCs: 'Kukuřičná mouka' },
    { subitemId: 'corn:sweet-corn', categoryId: 'corn', nameCs: 'Kukuřice (sladká)' },
  ]},
  { categoryId: 'sesame', nameCs: 'Sezamové výrobky', icon: '🌰', subItems: [
    { subitemId: 'sesame:sesame-seeds', categoryId: 'sesame', nameCs: 'Sezamová semínka' },
    { subitemId: 'sesame:tahini', categoryId: 'sesame', nameCs: 'Tahini' },
  ]},
  { categoryId: 'other', nameCs: 'Ostatní', icon: '🍽️', subItems: [] },
];

// Standard protocol — allergens eliminated and reintroduced in this order (least → most common trigger).
export const DEFAULT_TESTED_ALLERGENS = ['soy', 'wheat', 'eggs', 'dairy'];

// ── Helpers ───────────────────────────────────────────────────

export function getCategoryById(id: string): Category | undefined {
  return CATEGORIES.find(c => c.categoryId === id);
}
