-- Seed food categories and sub-items (idempotent)

INSERT INTO food_categories (slug, name_cs, icon, sort_order) VALUES
  ('dairy',        'Mléčné výrobky',       '🥛', 1),
  ('eggs',         'Vejce',                '🥚', 2),
  ('wheat',        'Pšenice / lepek',      '🌾', 3),
  ('soy',          'Sója',                 '🫘', 4),
  ('nuts',         'Ořechy',               '🥜', 5),
  ('fish',         'Ryby',                 '🐟', 6),
  ('shellfish',    'Korýši a měkkýši',     '🦐', 7),
  ('citrus',       'Citrusy',              '🍋', 8),
  ('chocolate',    'Čokoláda / kakao',     '🍫', 9),
  ('tomatoes',     'Rajčata',              '🍅', 10),
  ('strawberries', 'Jahody',               '🍓', 11),
  ('corn',         'Kukuřice',             '🌽', 12),
  ('sesame',       'Sezamové výrobky',     '🌰', 13),
  ('other',        'Ostatní',              '🍽️', 14)
ON CONFLICT (slug) DO NOTHING;

-- Dairy sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'cows-milk',       'Kravské mléko',  1 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'butter',          'Máslo',           2 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'cheese',          'Sýr',             3 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'yogurt',          'Jogurt',          4 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'cream',           'Smetana',         5 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'cottage-cheese',  'Tvaroh',          6 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'whey',            'Syrovátka',       7 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'casein',          'Kasein',          8 FROM food_categories WHERE slug = 'dairy'
ON CONFLICT DO NOTHING;

-- Eggs sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'whole-egg',   'Celé vejce',  1 FROM food_categories WHERE slug = 'eggs'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'egg-white',   'Bílek',       2 FROM food_categories WHERE slug = 'eggs'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'egg-yolk',    'Žloutek',     3 FROM food_categories WHERE slug = 'eggs'
ON CONFLICT DO NOTHING;

-- Wheat sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'bread',     'Chléb',       1 FROM food_categories WHERE slug = 'wheat'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'pasta',     'Těstoviny',   2 FROM food_categories WHERE slug = 'wheat'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'flour',     'Mouka',       3 FROM food_categories WHERE slug = 'wheat'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'pastries',  'Pečivo',      4 FROM food_categories WHERE slug = 'wheat'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'gluten',    'Lepek',       5 FROM food_categories WHERE slug = 'wheat'
ON CONFLICT DO NOTHING;

-- Soy sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'soy-milk',      'Sójové mléko',  1 FROM food_categories WHERE slug = 'soy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'tofu',          'Tofu',          2 FROM food_categories WHERE slug = 'soy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'soy-sauce',     'Sójová omáčka', 3 FROM food_categories WHERE slug = 'soy'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'soy-lecithin',  'Sójový lecitin',4 FROM food_categories WHERE slug = 'soy'
ON CONFLICT DO NOTHING;

-- Nuts sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'peanuts',     'Arašídy',          1 FROM food_categories WHERE slug = 'nuts'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'walnuts',     'Vlašské ořechy',   2 FROM food_categories WHERE slug = 'nuts'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'hazelnuts',   'Lískové ořechy',   3 FROM food_categories WHERE slug = 'nuts'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'almonds',     'Mandle',            4 FROM food_categories WHERE slug = 'nuts'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'cashews',     'Kešu ořechy',       5 FROM food_categories WHERE slug = 'nuts'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'pistachios',  'Pistácie',          6 FROM food_categories WHERE slug = 'nuts'
ON CONFLICT DO NOTHING;

-- Fish sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'freshwater-fish', 'Sladkovodní ryby', 1 FROM food_categories WHERE slug = 'fish'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'saltwater-fish',  'Mořské ryby',       2 FROM food_categories WHERE slug = 'fish'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'fish-oil',         'Rybí olej',         3 FROM food_categories WHERE slug = 'fish'
ON CONFLICT DO NOTHING;

-- Shellfish sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'shrimp',   'Krevety', 1 FROM food_categories WHERE slug = 'shellfish'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'crab',     'Krab',    2 FROM food_categories WHERE slug = 'shellfish'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'mussels',  'Slávky',  3 FROM food_categories WHERE slug = 'shellfish'
ON CONFLICT DO NOTHING;

-- Citrus sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'oranges',     'Pomeranče',    1 FROM food_categories WHERE slug = 'citrus'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'lemons',      'Citrony',      2 FROM food_categories WHERE slug = 'citrus'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'grapefruits', 'Grapefruity',  3 FROM food_categories WHERE slug = 'citrus'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'mandarins',   'Mandarinky',   4 FROM food_categories WHERE slug = 'citrus'
ON CONFLICT DO NOTHING;

-- Chocolate sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'dark-chocolate',  'Hořká čokoláda',  1 FROM food_categories WHERE slug = 'chocolate'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'milk-chocolate',  'Mléčná čokoláda', 2 FROM food_categories WHERE slug = 'chocolate'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'cocoa',           'Kakao',            3 FROM food_categories WHERE slug = 'chocolate'
ON CONFLICT DO NOTHING;

-- Tomatoes sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'fresh-tomatoes', 'Čerstvá rajčata',    1 FROM food_categories WHERE slug = 'tomatoes'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'tomato-sauce',   'Rajčatová omáčka',   2 FROM food_categories WHERE slug = 'tomatoes'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'ketchup',        'Kečup',               3 FROM food_categories WHERE slug = 'tomatoes'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'tomato-paste',   'Rajčatový protlak',   4 FROM food_categories WHERE slug = 'tomatoes'
ON CONFLICT DO NOTHING;

-- Strawberries sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'fresh-strawberries', 'Čerstvé jahody',  1 FROM food_categories WHERE slug = 'strawberries'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'strawberry-jam',     'Jahodový džem',   2 FROM food_categories WHERE slug = 'strawberries'
ON CONFLICT DO NOTHING;

-- Corn sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'corn-flour',   'Kukuřičná mouka',   1 FROM food_categories WHERE slug = 'corn'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'corn-starch',  'Kukuřičný škrob',   2 FROM food_categories WHERE slug = 'corn'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'sweet-corn',   'Sladká kukuřice',   3 FROM food_categories WHERE slug = 'corn'
ON CONFLICT DO NOTHING;

-- Sesame sub-items
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'sesame-seeds', 'Sezamová semínka', 1 FROM food_categories WHERE slug = 'sesame'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'sesame-oil',   'Sezamový olej',    2 FROM food_categories WHERE slug = 'sesame'
ON CONFLICT DO NOTHING;
INSERT INTO food_sub_items (category_id, slug, name_cs, sort_order)
SELECT id, 'tahini',       'Tahini',            3 FROM food_categories WHERE slug = 'sesame'
ON CONFLICT DO NOTHING;
