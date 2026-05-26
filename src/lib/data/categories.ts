import type { Category, ProtocolAllergenId } from '$lib/domain/models';

// ── Food categories (structural seed data) ────────────────────
// Display text lives in $lib/strings/categories; visual tokens in $lib/config/categories.
export const CATEGORIES: Category[] = [
  { allergenId: 'dairy', subItems: [
    { subitemId: 'dairy:milk',    allergenId: 'dairy' },
    { subitemId: 'dairy:butter',  allergenId: 'dairy' },
    { subitemId: 'dairy:cheese',  allergenId: 'dairy' },
    { subitemId: 'dairy:yogurt',  allergenId: 'dairy' },
    { subitemId: 'dairy:cream',   allergenId: 'dairy' },
    { subitemId: 'dairy:cottage', allergenId: 'dairy' },
  ]},
  { allergenId: 'eggs', subItems: [
    { subitemId: 'eggs:egg-white', allergenId: 'eggs' },
    { subitemId: 'eggs:egg-yolk',  allergenId: 'eggs' },
  ]},
  { allergenId: 'wheat', subItems: [
    { subitemId: 'wheat:bread',  allergenId: 'wheat' },
    { subitemId: 'wheat:pasta',  allergenId: 'wheat' },
    { subitemId: 'wheat:flour',  allergenId: 'wheat' },
    { subitemId: 'wheat:gluten', allergenId: 'wheat' },
  ]},
  { allergenId: 'soy', subItems: [
    { subitemId: 'soy:soy-milk',     allergenId: 'soy' },
    { subitemId: 'soy:tofu',         allergenId: 'soy' },
    { subitemId: 'soy:soy-sauce',    allergenId: 'soy' },
    { subitemId: 'soy:soy-lecithin', allergenId: 'soy' },
  ]},
  { allergenId: 'nuts', subItems: [
    { subitemId: 'nuts:peanuts',   allergenId: 'nuts' },
    { subitemId: 'nuts:walnuts',   allergenId: 'nuts' },
    { subitemId: 'nuts:hazelnuts', allergenId: 'nuts' },
    { subitemId: 'nuts:almonds',   allergenId: 'nuts' },
    { subitemId: 'nuts:cashews',   allergenId: 'nuts' },
  ]},
  { allergenId: 'fish', subItems: [
    { subitemId: 'fish:freshwater-fish', allergenId: 'fish' },
    { subitemId: 'fish:saltwater-fish',  allergenId: 'fish' },
    { subitemId: 'fish:fish-oil',        allergenId: 'fish' },
  ]},
  { allergenId: 'shellfish', subItems: [
    { subitemId: 'shellfish:shrimp',  allergenId: 'shellfish' },
    { subitemId: 'shellfish:crab',    allergenId: 'shellfish' },
    { subitemId: 'shellfish:mussels', allergenId: 'shellfish' },
  ]},
  { allergenId: 'citrus', subItems: [
    { subitemId: 'citrus:oranges',    allergenId: 'citrus' },
    { subitemId: 'citrus:lemons',     allergenId: 'citrus' },
    { subitemId: 'citrus:grapefruit', allergenId: 'citrus' },
    { subitemId: 'citrus:mandarins',  allergenId: 'citrus' },
  ]},
  { allergenId: 'chocolate', subItems: [
    { subitemId: 'chocolate:dark-choc', allergenId: 'chocolate' },
    { subitemId: 'chocolate:milk-choc', allergenId: 'chocolate' },
    { subitemId: 'chocolate:cocoa',     allergenId: 'chocolate' },
  ]},
  { allergenId: 'tomatoes', subItems: [
    { subitemId: 'tomatoes:fresh-tomatoes', allergenId: 'tomatoes' },
    { subitemId: 'tomatoes:tomato-sauce',   allergenId: 'tomatoes' },
    { subitemId: 'tomatoes:ketchup',        allergenId: 'tomatoes' },
  ]},
  { allergenId: 'strawberries', subItems: [
    { subitemId: 'strawberries:fresh-strawberries', allergenId: 'strawberries' },
    { subitemId: 'strawberries:strawberry-jam',     allergenId: 'strawberries' },
  ]},
  { allergenId: 'corn', subItems: [
    { subitemId: 'corn:corn-flour', allergenId: 'corn' },
    { subitemId: 'corn:sweet-corn', allergenId: 'corn' },
  ]},
  { allergenId: 'sesame', subItems: [
    { subitemId: 'sesame:sesame-seeds', allergenId: 'sesame' },
    { subitemId: 'sesame:tahini',       allergenId: 'sesame' },
  ]},
];

// Standard protocol — allergens eliminated and reintroduced in this order (least → most common trigger).
export const DEFAULT_TESTED_ALLERGENS: ProtocolAllergenId[] = ['soy', 'wheat', 'eggs', 'dairy'];
