import type { Category } from '$lib/domain/models';

// ── Food categories (mirrors DB seed data) ────────────────────
export const CATEGORIES: Category[] = [
  { slug: 'dairy', nameCs: 'Mléčné výrobky', icon: '🥛', subItems: [
    { id: 'milk', categorySlug: 'dairy', nameCs: 'Kravské mléko' },
    { id: 'butter', categorySlug: 'dairy', nameCs: 'Máslo' },
    { id: 'cheese', categorySlug: 'dairy', nameCs: 'Sýr' },
    { id: 'yogurt', categorySlug: 'dairy', nameCs: 'Jogurt' },
    { id: 'cream', categorySlug: 'dairy', nameCs: 'Smetana' },
    { id: 'cottage', categorySlug: 'dairy', nameCs: 'Tvaroh' },
  ]},
  { slug: 'eggs', nameCs: 'Vejce', icon: '🥚', subItems: [
    { id: 'egg-white', categorySlug: 'eggs', nameCs: 'Bílek' },
    { id: 'egg-yolk', categorySlug: 'eggs', nameCs: 'Žloutek' },
  ]},
  { slug: 'wheat', nameCs: 'Pšenice / lepek', icon: '🌾', subItems: [
    { id: 'bread', categorySlug: 'wheat', nameCs: 'Chléb / rohlík' },
    { id: 'pasta', categorySlug: 'wheat', nameCs: 'Těstoviny' },
    { id: 'flour', categorySlug: 'wheat', nameCs: 'Mouka' },
    { id: 'gluten', categorySlug: 'wheat', nameCs: 'Lepek (gluten)' },
  ]},
  { slug: 'soy', nameCs: 'Sója', icon: '🫘', subItems: [
    { id: 'soy-milk', categorySlug: 'soy', nameCs: 'Sójové mléko' },
    { id: 'tofu', categorySlug: 'soy', nameCs: 'Tofu' },
    { id: 'soy-sauce', categorySlug: 'soy', nameCs: 'Sójová omáčka' },
    { id: 'soy-lecithin', categorySlug: 'soy', nameCs: 'Sójový lecitin' },
  ]},
  { slug: 'nuts', nameCs: 'Ořechy', icon: '🥜', subItems: [
    { id: 'peanuts', categorySlug: 'nuts', nameCs: 'Arašídy' },
    { id: 'walnuts', categorySlug: 'nuts', nameCs: 'Vlašské ořechy' },
    { id: 'hazelnuts', categorySlug: 'nuts', nameCs: 'Lískové ořechy' },
    { id: 'almonds', categorySlug: 'nuts', nameCs: 'Mandle' },
    { id: 'cashews', categorySlug: 'nuts', nameCs: 'Kešu' },
  ]},
  { slug: 'fish', nameCs: 'Ryby', icon: '🐟', subItems: [
    { id: 'freshwater-fish', categorySlug: 'fish', nameCs: 'Sladkovodní ryby' },
    { id: 'saltwater-fish', categorySlug: 'fish', nameCs: 'Mořské ryby' },
    { id: 'fish-oil', categorySlug: 'fish', nameCs: 'Rybí tuk' },
  ]},
  { slug: 'shellfish', nameCs: 'Korýši a měkkýši', icon: '🦐', subItems: [
    { id: 'shrimp', categorySlug: 'shellfish', nameCs: 'Krevety' },
    { id: 'crab', categorySlug: 'shellfish', nameCs: 'Krab' },
    { id: 'mussels', categorySlug: 'shellfish', nameCs: 'Mušle' },
  ]},
  { slug: 'citrus', nameCs: 'Citrusy', icon: '🍋', subItems: [
    { id: 'oranges', categorySlug: 'citrus', nameCs: 'Pomeranče' },
    { id: 'lemons', categorySlug: 'citrus', nameCs: 'Citrony' },
    { id: 'grapefruit', categorySlug: 'citrus', nameCs: 'Grapefruit' },
    { id: 'mandarins', categorySlug: 'citrus', nameCs: 'Mandarinky' },
  ]},
  { slug: 'chocolate', nameCs: 'Čokoláda / kakao', icon: '🍫', subItems: [
    { id: 'dark-choc', categorySlug: 'chocolate', nameCs: 'Hořká čokoláda' },
    { id: 'milk-choc', categorySlug: 'chocolate', nameCs: 'Mléčná čokoláda' },
    { id: 'cocoa', categorySlug: 'chocolate', nameCs: 'Kakao' },
  ]},
  { slug: 'tomatoes', nameCs: 'Rajčata', icon: '🍅', subItems: [
    { id: 'fresh-tomatoes', categorySlug: 'tomatoes', nameCs: 'Čerstvá rajčata' },
    { id: 'tomato-sauce', categorySlug: 'tomatoes', nameCs: 'Rajčatová omáčka' },
    { id: 'ketchup', categorySlug: 'tomatoes', nameCs: 'Kečup' },
  ]},
  { slug: 'strawberries', nameCs: 'Jahody', icon: '🍓', subItems: [
    { id: 'fresh-strawberries', categorySlug: 'strawberries', nameCs: 'Čerstvé jahody' },
    { id: 'strawberry-jam', categorySlug: 'strawberries', nameCs: 'Jahodový džem' },
  ]},
  { slug: 'corn', nameCs: 'Kukuřice', icon: '🌽', subItems: [
    { id: 'corn-flour', categorySlug: 'corn', nameCs: 'Kukuřičná mouka' },
    { id: 'sweet-corn', categorySlug: 'corn', nameCs: 'Kukuřice (sladká)' },
  ]},
  { slug: 'sesame', nameCs: 'Sezamové výrobky', icon: '🌰', subItems: [
    { id: 'sesame-seeds', categorySlug: 'sesame', nameCs: 'Sezamová semínka' },
    { id: 'tahini', categorySlug: 'sesame', nameCs: 'Tahini' },
  ]},
  { slug: 'other', nameCs: 'Ostatní', icon: '🍽️', subItems: [] },
];

// Standard protocol — allergens eliminated and reintroduced in this order (least → most common trigger).
export const DEFAULT_TESTED_ALLERGENS = ['soy', 'wheat', 'eggs', 'dairy'];

// ── Helpers ───────────────────────────────────────────────────

export function getCategoryBySlug(slug: string): Category | undefined {
  return CATEGORIES.find(c => c.slug === slug);
}
