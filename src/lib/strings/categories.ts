import type { ProtocolAllergenId, ProtocolSubitemId } from '$lib/domain/models';

export type CategoryStrings = {
  name: string; // full Czech category name shown in grids and lists
};

/** Regional (protocol-less) allergen names — kept separate so the ProtocolAllergenId satisfies clause on categoryStrings stays intact. */
export const regionalCategoryStrings: Record<string, CategoryStrings> = {
  paprika: { name: 'Paprika / chilli' },
};

/** Regional subitem Czech names — keyed by `allergenId:bare` compound key. */
export const regionalSubitemStrings: Record<string, string> = {
  'paprika:sweet-pepper':    'Sladká paprika',
  'paprika:chilli-pepper':   'Chilli paprika',
  'paprika:paprika-powder':  'Mletá paprika',
};

export const categoryStrings = {
  dairy:        { name: 'Mléčné výrobky'   },
  eggs:         { name: 'Vejce'            },
  wheat:        { name: 'Pšenice / lepek'  },
  soy:          { name: 'Sója'             },
  nuts:         { name: 'Ořechy'           },
  fish:         { name: 'Ryby'             },
  shellfish:    { name: 'Korýši a měkkýši' },
  citrus:       { name: 'Citrusy'          },
  chocolate:    { name: 'Čokoláda / kakao' },
  tomatoes:     { name: 'Rajčata'          },
  strawberries: { name: 'Jahody'           },
  corn:         { name: 'Kukuřice'         },
  sesame:       { name: 'Sezamové výrobky' },
} as const satisfies Record<ProtocolAllergenId, CategoryStrings>;

export const subitemStrings = {
  'dairy:milk':                      'Kravské mléko',
  'dairy:butter':                    'Máslo',
  'dairy:cheese':                    'Sýr',
  'dairy:yogurt':                    'Jogurt',
  'dairy:cream':                     'Smetana',
  'dairy:cottage':                   'Tvaroh',
  'eggs:egg-white':                  'Bílek',
  'eggs:egg-yolk':                   'Žloutek',
  'wheat:bread':                     'Chléb / rohlík',
  'wheat:pasta':                     'Těstoviny',
  'wheat:flour':                     'Mouka',
  'wheat:gluten':                    'Lepek (gluten)',
  'soy:soy-milk':                    'Sójové mléko',
  'soy:tofu':                        'Tofu',
  'soy:soy-sauce':                   'Sójová omáčka',
  'soy:soy-lecithin':                'Sójový lecitin',
  'nuts:peanuts':                    'Arašídy',
  'nuts:walnuts':                    'Vlašské ořechy',
  'nuts:hazelnuts':                  'Lískové ořechy',
  'nuts:almonds':                    'Mandle',
  'nuts:cashews':                    'Kešu',
  'fish:freshwater-fish':            'Sladkovodní ryby',
  'fish:saltwater-fish':             'Mořské ryby',
  'fish:fish-oil':                   'Rybí tuk',
  'shellfish:shrimp':                'Krevety',
  'shellfish:crab':                  'Krab',
  'shellfish:mussels':               'Mušle',
  'citrus:oranges':                  'Pomeranče',
  'citrus:lemons':                   'Citrony',
  'citrus:grapefruit':               'Grapefruit',
  'citrus:mandarins':                'Mandarinky',
  'chocolate:dark-choc':             'Hořká čokoláda',
  'chocolate:milk-choc':             'Mléčná čokoláda',
  'chocolate:cocoa':                 'Kakao',
  'tomatoes:fresh-tomatoes':         'Čerstvá rajčata',
  'tomatoes:tomato-sauce':           'Rajčatová omáčka',
  'tomatoes:ketchup':                'Kečup',
  'strawberries:fresh-strawberries': 'Čerstvé jahody',
  'strawberries:strawberry-jam':     'Jahodový džem',
  'corn:corn-flour':                 'Kukuřičná mouka',
  'corn:sweet-corn':                 'Kukuřice (sladká)',
  'sesame:sesame-seeds':             'Sezamová semínka',
  'sesame:tahini':                   'Tahini',
} as const satisfies Record<ProtocolSubitemId, string>;
