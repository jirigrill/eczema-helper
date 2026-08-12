// Three-collection catalog — families, allergens, foods (ADR-0017 slice 2 / issue #227).
// Ids derive from the data; types are structurally enforced at compile time.
import type { Allergenicity, Ladder } from '$lib/domain/canonical-allergen';
import type { PreparationMethod } from '$lib/domain/models';

// ── Families ──────────────────────────────────────────────────

export const FAMILIES = [
  { id: 'grains', icon: '🌾' },
  { id: 'vegetables', icon: '🥦' },
  { id: 'fruit', icon: '🍎' },
  { id: 'meat', icon: '🥩' },
  { id: 'fish-seafood', icon: '🐟' },
  { id: 'dairy', icon: '🥛' },
  { id: 'eggs', icon: '🥚' },
  { id: 'legumes', icon: '🫘' },
  { id: 'nuts-seeds', icon: '🥜' },
  { id: 'fats-oils', icon: '🧈' },
  { id: 'sweet', icon: '🍯' },
  { id: 'spices-condiments', icon: '🌿' },
  { id: 'drinks', icon: '☕' },
] as const;

export type FamilyId = (typeof FAMILIES)[number]['id'];

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
  allergenOrder?: number;
  ladder?: Ladder;
  allergenicity?: Allergenicity;
};

// `allergenicity` values below are **curator-tunable, not clinically stamped**
// (ADR-0023 §6, parked — see docs/parked-features.md), but the tiers are
// evidence-based: `high` = FDA big-9 / EU
// Annex II recognized major allergens; `low` = not a major allergen and
// reactions typically mild/non-IgE (OAS) or rare; `moderate` = occasional /
// vasoactive-amine / OAS triggers. Rationale + sources per food:
// docs/research/food-allergenicity-tiers.md. Authored only on ladder-bearing
// allergens (the adaptation window it gates exists only during reintroduction).
// Only the `low` boundary is engine-load-bearing today (adaptation-window
// eligibility). `low`: legumes, carrot-root-veg, oats, chicken, beef.
export const ALLERGENS = [
  // ── Core protocol allergens ───────────────────────────────

  {
    id: 'legumes',
    familyId: 'legumes' as FamilyId,
    icon: '🫘',
    aliases: ['legumes', 'luštěniny'],
    allergenOrder: 1,
    allergenicity: 'low',
    ladder: {
      allergenId: 'legumes',
      stages: {
        breastfed: [
          {
            id: 'legumes-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Např. červená čočka, 30 g (červená čočka nejméně nadýmá, proto je k testu luštěnin nejvýhodnější)',
          },
          {
            id: 'legumes-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Např. červená čočka, 50–100 g',
          },
          {
            id: 'legumes-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství červené čočky, případně cizrny, hrachu či fazolí — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'legumes-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: červená čočka 30 g. Dítě: hypoalergenní příkrmy (žádné luštěniny).',
          },
          {
            id: 'legumes-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: červená čočka 50–100 g. Dítě: 1 lžička červené čočky.',
          },
          {
            id: 'legumes-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství luštěnin. Dítě: 2–3 lžičky červené čočky.',
          },
          {
            id: 'legumes-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství luštěnin. Dítě: neomezené množství luštěnin — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'legumes-solids-1',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky červené čočky.',
          },
          {
            id: 'legumes-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 lžička červené čočky.',
          },
          {
            id: 'legumes-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2–3 lžičky červené čočky.',
          },
          {
            id: 'legumes-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství luštěnin — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'carrot-root-veg',
    familyId: 'vegetables' as FamilyId,
    icon: '🥕',
    aliases: ['carrot', 'mrkev', 'kořenová zelenina'],
    allergenOrder: 2,
    allergenicity: 'low',
    ladder: {
      allergenId: 'carrot-root-veg',
      stages: {
        breastfed: [
          {
            id: 'carrot-root-veg-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '1 ks syrové mrkve (cca 70–120 g)',
          },
          {
            id: 'carrot-root-veg-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '2–3 ks syrové mrkve nebo 150–200 ml vývaru z kořenové zeleniny',
          },
          {
            id: 'carrot-root-veg-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství mrkve či vývaru z kořenové zeleniny — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'carrot-root-veg-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 ks syrové mrkve (cca 70–120 g). Dítě: pouze hypoalergenní příkrmy.',
          },
          {
            id: 'carrot-root-veg-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 2–3 ks syrové mrkve nebo 150–200 ml vývaru z kořenové zeleniny. Dítě: 1 lžička vařené mrkve.',
          },
          {
            id: 'carrot-root-veg-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství mrkve nebo vývaru z kořenové zeleniny. Dítě: 2 lžičky vařené mrkve nebo 1 lžička syrové mrkve.',
          },
          {
            id: 'carrot-root-veg-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství mrkve nebo vývaru z kořenové zeleniny. Dítě: neomezené množství mrkve nebo vývaru — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'carrot-root-veg-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Čtvrt lžičky vařené mrkve.',
          },
          {
            id: 'carrot-root-veg-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '½–1 lžička vařené mrkve.',
          },
          {
            id: 'carrot-root-veg-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2 lžičky vařené mrkve nebo 1 lžička syrové mrkve.',
          },
          {
            id: 'carrot-root-veg-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství mrkve nebo vývaru z kořenové zeleniny — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'tomatoes',
    familyId: 'vegetables' as FamilyId,
    icon: '🍅',
    aliases: ['tomatoes', 'rajčata', 'rajče', 'rajský'],
    allergenOrder: 3,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'tomatoes',
      stages: {
        breastfed: [
          {
            id: 'tomatoes-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50 g rajčat nebo paprik',
          },
          {
            id: 'tomatoes-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '70–100 g rajčat nebo paprik',
          },
          {
            id: 'tomatoes-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství rajčat nebo paprik — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'tomatoes-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50 g rajčat nebo paprik. Dítě: pouze hypoalergenní příkrmy.',
          },
          {
            id: 'tomatoes-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 70–100 g rajčat nebo paprik. Dítě: polovina cherry rajčátka.',
          },
          {
            id: 'tomatoes-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství rajčat nebo paprik. Dítě: cherry rajčátko.',
          },
          {
            id: 'tomatoes-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství rajčat nebo paprik. Dítě: neomezené množství — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'tomatoes-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Čtvrt cherry rajčátka.',
          },
          {
            id: 'tomatoes-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Půl cherry rajčátka.',
          },
          {
            id: 'tomatoes-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Cherry rajčátko.',
          },
          {
            id: 'tomatoes-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezená dávka — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'exotic-fruit',
    familyId: 'fruit' as FamilyId,
    icon: '🥭',
    aliases: ['exotic-fruit', 'exotické ovoce'],
    allergenOrder: 4,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'exotic-fruit',
      stages: {
        breastfed: [
          {
            id: 'exotic-fruit-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '1 banán',
          },
          {
            id: 'exotic-fruit-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '2 banány',
          },
          {
            id: 'exotic-fruit-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství exotického ovoce (např. ovocný salát z banánu, manga a kiwi) — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'exotic-fruit-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 banán. Dítě: hypoalergenní příkrmy (žádné tropické ovoce).',
          },
          {
            id: 'exotic-fruit-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 2 banány. Dítě: 1 lžička banánu.',
          },
          {
            id: 'exotic-fruit-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství exotického ovoce. Dítě: 2–3 lžičky banánu.',
          },
          {
            id: 'exotic-fruit-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství exotického ovoce. Dítě: neomezené množství exotického ovoce — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'exotic-fruit-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky banánu.',
          },
          {
            id: 'exotic-fruit-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 lžička banánu.',
          },
          {
            id: 'exotic-fruit-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2–3 lžičky banánu.',
          },
          {
            id: 'exotic-fruit-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství exotického ovoce — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'citrus',
    familyId: 'fruit' as FamilyId,
    icon: '🍋',
    aliases: ['citrus', 'citrony', 'pomeranče', 'mandarinky', 'grapefruit'],
    allergenOrder: 5,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'citrus',
      stages: {
        breastfed: [
          {
            id: 'citrus-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50 g kteréhokoli citrusu',
          },
          {
            id: 'citrus-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '70–100 g kteréhokoli citrusu',
          },
          {
            id: 'citrus-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství citrusů — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'citrus-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50 g kteréhokoli citrusu. Dítě: hypoalergenní příkrmy (žádné citrusy).',
          },
          {
            id: 'citrus-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 70–100 g kteréhokoli citrusu. Dítě: dáme „ožužlat“ ½ dílku mandarinky nebo třetinu dílku pomeranče; pokud dítě ještě nekouše, 1 lžičku mandarinkové šťávy.',
          },
          {
            id: 'citrus-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství výše uvedených citrusů. Dítě: dáme „ožužlat“ 1 dílek mandarinky nebo půl dílku pomeranče, případně 2–3 lžičky mandarinkové nebo pomerančové šťávy.',
          },
          {
            id: 'citrus-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství výše uvedených citrusů. Dítě: neomezená dávka citrusů ve formě, která vyhovuje dítěti — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'citrus-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Čtvrt lžičky mandarinkové/pomerančové šťávy.',
          },
          {
            id: 'citrus-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Dáme „ožužlat“ ½ dílku mandarinky nebo třetinu dílku pomeranče; pokud dítě ještě nekouše, 1 lžičku mandarinkové šťávy.',
          },
          {
            id: 'citrus-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Dáme „ožužlat“ 1 dílek mandarinky nebo půl dílku pomeranče, případně 2–3 lžičky mandarinkové nebo pomerančové šťávy.',
          },
          {
            id: 'citrus-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezená dávka citrusů ve formě, která vyhovuje dítěti — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'wheat',
    familyId: 'grains' as FamilyId,
    icon: '🌾',
    aliases: ['wheat', 'pšenice', 'lepek', 'gluten'],
    allergenOrder: 6,
    allergenicity: 'high',
    ladder: {
      allergenId: 'wheat',
      stages: {
        breastfed: [
          {
            id: 'wheat-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50 g v syrovém stavu bezvaječných těstovin nebo 50 g v syrovém stavu kuskusu',
          },
          {
            id: 'wheat-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '100 g v syrovém stavu bezvaječných těstovin nebo 100 g v syrovém stavu kuskusu',
          },
          {
            id: 'wheat-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství bezvaječných těstovin nebo kuskusu — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'wheat-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50 g bezvaječných těstovin nebo 50 g kuskusu. Dítě: hypoalergenní příkrmy (žádný lepek).',
          },
          {
            id: 'wheat-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50 g bezvaječných těstovin nebo 50 g kuskusu. Dítě: 1 kousek bezvaječné těstoviny nebo ½ lžičky kuskusu.',
          },
          {
            id: 'wheat-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství bezvaječných těstovin nebo kuskusu. Dítě: 2 kusy bezvaječných těstovin nebo 1 lžička kuskusu.',
          },
          {
            id: 'wheat-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství bezvaječných těstovin nebo kuskusu. Dítě: neomezené množství bezvaječných těstovin nebo kuskusu — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'wheat-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Malý kousíček bezvaječné těstoviny nebo špička lžičky kuskusu.',
          },
          {
            id: 'wheat-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 kus bezvaječné těstoviny (např. jedno kolínko) nebo ½ lžičky kuskusu.',
          },
          {
            id: 'wheat-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2 kusy bezvaječných těstovin nebo 1 lžička kuskusu.',
          },
          {
            id: 'wheat-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství bezvaječných těstovin nebo kuskusu — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    // oats: Matoušková tests dítě only (child-direct), no maminka column.
    // No Pekárková oats table exists.
    id: 'oats',
    familyId: 'grains' as FamilyId,
    icon: '🌾',
    aliases: ['oats', 'oves', 'ovesný'],
    allergenOrder: 7,
    allergenicity: 'low',
    ladder: {
      allergenId: 'oats',
      stages: {
        // No maminka-only (breastfed) table — Matoušková's dcera column is child-direct.
        // mixed: derived maminka side (assume unrestricted), dcera from source.
        mixed: [
          {
            id: 'oats-mixed-1',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Dítě: 2–3 lžičky ovesné kaše.',
          },
          {
            id: 'oats-mixed-2',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Dítě: 5–10 lžiček ovesné kaše.',
          },
          {
            id: 'oats-mixed-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Dítě: neomezeně ovesné kaše — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'oats-solids-1',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '2–3 lžičky ovesné kaše.',
          },
          {
            id: 'oats-solids-2',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '5–10 lžiček ovesné kaše.',
          },
          {
            id: 'oats-solids-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně ovesné kaše — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'eggs',
    familyId: 'eggs' as FamilyId,
    icon: '🥚',
    aliases: ['eggs', 'vejce', 'vaječný'],
    allergenOrder: 8,
    allergenicity: 'high',
    ladder: {
      allergenId: 'eggs',
      stages: {
        breastfed: [
          {
            id: 'eggs-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '1 žloutek (vejce natvrdo, sníst pouze žloutek, bílek NE)',
          },
          {
            id: 'eggs-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50 g piškotů (lze Opavia), případně buchty či jiného pečeného výrobku s vejcem',
          },
          {
            id: 'eggs-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Vejce v libovolné formě (míchaná, volské oko, vařené) — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'eggs-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 žloutek (vejce natvrdo, sníst pouze žloutek, bílek NE). Dítě: pouze hypoalergenní příkrmy.',
          },
          {
            id: 'eggs-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50 g piškotů (lze Opavia), případně buchty či jiného pečeného výrobku s vejcem. Dítě: ½ lžičky žloutku.',
          },
          {
            id: 'eggs-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství pečených vajec ve formě výrobku typu piškotu. Dítě: 1 ks vaječné těstoviny nebo polovina piškotu.',
          },
          {
            id: 'eggs-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: libovolná forma vajíčka (míchaná vejce, volské oko či vařené vajíčko). Dítě: 2–5 ks vaječných těstovin nebo 1–3 ks piškotů — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'eggs-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Na špičku lžičky žloutku — postupujte extrémně opatrně!',
          },
          {
            id: 'eggs-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 ks vaječné těstoviny nebo polovina piškotu.',
          },
          {
            id: 'eggs-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2–3 ks vaječných těstovin nebo 1–2 ks piškotů.',
          },
          {
            id: 'eggs-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezená dávka vaječných těstovin nebo piškotů — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    // chicken: Matoušková tests kuřecí maso together with vejce in one table;
    // extracted chicken-specific doses below. No Pekárková chicken table exists.
    id: 'chicken',
    familyId: 'meat' as FamilyId,
    icon: '🍗',
    aliases: ['chicken', 'kuřecí maso', 'kuřecí'],
    allergenOrder: 9,
    allergenicity: 'low',
    ladder: {
      allergenId: 'chicken',
      stages: {
        breastfed: [
          {
            id: 'chicken-breastfed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Kuřecí maso neomezeně.',
          },
          {
            id: 'chicken-breastfed-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Kuřecí maso neomezeně.',
          },
          {
            id: 'chicken-breastfed-3',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Kuřecí maso neomezeně.',
          },
          {
            id: 'chicken-breastfed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Kuřecí maso neomezeně — večer vyhodnoťte reakci.',
          },
        ],
        mixed: [
          {
            id: 'chicken-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Kuřecí maso neomezeně. Dítě: bez dávky.',
          },
          {
            id: 'chicken-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: Kuřecí maso neomezeně. Dítě: 1 lžička kuřecího masa.',
          },
          {
            id: 'chicken-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: Kuřecí maso neomezeně. Dítě: 2–3 lžičky kuřecího masa.',
          },
          {
            id: 'chicken-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: Kuřecí maso neomezeně. Dítě: neomezeně — večer vyhodnoťte reakci.',
          },
        ],
        // solids: derived from mixed dítě column.
        solids: [
          {
            id: 'chicken-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky kuřecího masa.',
          },
          {
            id: 'chicken-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 lžička kuřecího masa.',
          },
          {
            id: 'chicken-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2–3 lžičky kuřecího masa.',
          },
          {
            id: 'chicken-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'fish',
    familyId: 'fish-seafood' as FamilyId,
    icon: '🐟',
    aliases: ['fish', 'ryba', 'ryby'],
    allergenOrder: 10,
    allergenicity: 'high',
    ladder: {
      allergenId: 'fish',
      stages: {
        breastfed: [
          {
            id: 'fish-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '80–100 g po tepelné úpravě ryby',
          },
          {
            id: 'fish-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '100–130 g po tepelné úpravě ryby',
          },
          {
            id: 'fish-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství ryby — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'fish-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 80–100 g ryby. Dítě: hypoalergenní příkrmy (žádná ryba).',
          },
          {
            id: 'fish-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 100–130 g ryby. Dítě: 1 lžička ryby.',
          },
          {
            id: 'fish-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství ryby. Dítě: 2–3 lžičky ryby.',
          },
          {
            id: 'fish-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství ryby. Dítě: neomezené množství ryby — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'fish-solids-1',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 lžička ryby.',
          },
          {
            id: 'fish-solids-2',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2–3 lžičky ryby.',
          },
          {
            id: 'fish-solids-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství ryby — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },
  {
    id: 'dairy',
    familyId: 'dairy' as FamilyId,
    icon: '🥛',
    aliases: ['dairy', 'milk', 'mleko', 'mléčné výrobky'],
    allergenOrder: 11,
    allergenicity: 'high',
    ladder: {
      allergenId: 'dairy',
      stages: {
        breastfed: [
          {
            id: 'dairy-1',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Minimálně 2 čajové lžičky másla (maximum 10 čajových lžiček)',
          },
          {
            id: 'dairy-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50–75 g bílého jogurtu nebo 2 plátky tvrdého sýra (eidam, ementál, gouda)',
          },
          {
            id: 'dairy-3',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '150 g jogurtu nebo 3–5 plátků tvrdého sýra',
          },
          {
            id: 'dairy-4',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '100 g sušenek, buchty nebo koláče obsahující mléko',
          },
          {
            id: 'dairy-5',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '150 g sušenek, buchty nebo koláče obsahující mléko',
          },
          {
            id: 'dairy-6',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Pokud do dnešního dne nenastalo zhoršení stavu kůže či stolice ani jiné trávící obtíže, zkuste mléčnou zátěžovou zkoušku — neomezené množství jakýkoliv mléčných výrobků v nezakysané a nepečené formě. Večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'dairy-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1–2 čajové lžičky másla. Dítě: pouze hypoalergenní příkrmy.',
          },
          {
            id: 'dairy-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50–75 g bílého jogurtu nebo 2 plátky tvrdého sýra (eidam, ementál, gouda atd.). Dítě: půlka sušenky podle receptu „Sušenky pro eliminační dietu“.',
          },
          {
            id: 'dairy-mixed-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 150 g jogurtu nebo 3–5 plátků tvrdého sýra. Dítě: 1 ks sušenky podle receptu „Sušenky pro eliminační dietu“.',
          },
          {
            id: 'dairy-mixed-4',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 100 g sušenek, buchty, koláče či jiného výrobku s mlékem. Dítě: 2–3 sušenky podle receptu „Sušenky pro eliminační dietu“.',
          },
          {
            id: 'dairy-mixed-5',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 150 g sušenek, buchty, koláče či jiného výrobku s mlékem. Dítě: 4–7 lžiček jogurtu, případně 7–10 sušenek.',
          },
          {
            id: 'dairy-mixed-6',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství jakéhokoli mléčného výrobku. Dítě: 50–70 g jogurtu.',
          },
          {
            id: 'dairy-mixed-7',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství jakéhokoli mléčného výrobku. Dítě: libovolné množství jogurtu, libovolné množství „pečeného“ mléka, lze podat i mléčnou kaši, v tento den již v neomezené dávce. Nedoporučuje se ani v tento den klasické kravské mléko ani tvarohové krémy typu lipánku nebo pribináčku — s těmito výrobky opatrně i do budoucna. Večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'dairy-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Čtvrt sušenky podle receptu „Sušenky pro eliminační dietu“ — postupujte extrémně opatrně!',
          },
          {
            id: 'dairy-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Polovina sušenky podle receptu „Sušenky pro eliminační dietu“.',
          },
          {
            id: 'dairy-solids-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 ks sušenky podle receptu „Sušenky pro eliminační dietu“.',
          },
          {
            id: 'dairy-solids-4',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2–3 sušenky podle receptu „Sušenky pro eliminační dietu“.',
          },
          {
            id: 'dairy-solids-5',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '4–7 lžiček jogurtu nebo 7–10 sušenek.',
          },
          {
            id: 'dairy-solids-6',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50–70 g jogurtu.',
          },
          {
            id: 'dairy-solids-7',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Libovolné množství jogurtu (kolik dítě sní), případně libovolné množství „pečeného“ mléka; lze podat i mléčnou kaši, v tento den již v neomezené dávce. Nedoporučuje se ani v tento den klasické kravské mléko ani tvarohové krémy typu lipánku nebo pribináčku — s těmito výrobky opatrně i do budoucna. Večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'raspberries',
    familyId: 'fruit' as FamilyId,
    icon: '🍓',
    aliases: ['raspberries', 'maliny', 'malina', 'rybíz', 'ostružiny', 'currants', 'blackberries'],
    allergenOrder: 12,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'raspberries',
      stages: {
        breastfed: [
          {
            id: 'raspberries-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50 g malin',
          },
          {
            id: 'raspberries-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '70–100 g malin',
          },
          {
            id: 'raspberries-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství malin — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'raspberries-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: bez dávky. Dítě: bez dávky.',
          },
          {
            id: 'raspberries-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: maliny neomezeně. Dítě: 2 maliny.',
          },
          {
            id: 'raspberries-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: maliny neomezeně. Dítě: 3–5 malin.',
          },
          {
            id: 'raspberries-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: maliny neomezeně. Dítě: neomezeně — večer vyhodnoťte reakci.',
          },
        ],
        // solids: Matoušková's dcera column only has data for days 2–4 alongside
        // a simultaneous já dose; no isolated child-only table exists. Derived
        // by prepending a smaller starting rung to match the tiny-start/eval-day
        // shape used elsewhere — not sourced from either PDF.
        solids: [
          {
            id: 'raspberries-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '1 malina.',
          },
          {
            id: 'raspberries-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '2 maliny.',
          },
          {
            id: 'raspberries-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '3–5 malin.',
          },
          {
            id: 'raspberries-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně malin — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'strawberries',
    familyId: 'fruit' as FamilyId,
    icon: '🍓',
    aliases: ['strawberries', 'jahody', 'jahoda'],
    allergenOrder: 13,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'strawberries',
      stages: {
        breastfed: [
          {
            id: 'strawberries-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50 g jahod',
          },
          {
            id: 'strawberries-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '70–100 g',
          },
          {
            id: 'strawberries-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezené množství jahod — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'strawberries-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50 g jahod. Dítě: pouze hypoalergenní příkrmy.',
          },
          {
            id: 'strawberries-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 70–100 g jahod. Dítě: 1 lžička jahodové přesnídávky.',
          },
          {
            id: 'strawberries-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezené množství jahod. Dítě: 2 lžičky jahodové přesnídávky.',
          },
          {
            id: 'strawberries-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezené množství jahod. Dítě: neomezené množství — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'strawberries-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Čtvrt lžičky jahodové přesnídávky.',
          },
          {
            id: 'strawberries-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1 lžička jahodové přesnídávky.',
          },
          {
            id: 'strawberries-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2 lžičky jahodové přesnídávky.',
          },
          {
            id: 'strawberries-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezená dávka jahod — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    // add mak accordign to matouskova
    id: 'sesame',
    familyId: 'nuts-seeds' as FamilyId,
    icon: '🌰',
    aliases: [
      'sesame',
      'sezam',
      'mák',
      'tahini',
      'sezamová semínka',
      'chia',
      'slunečnicová semínka',
      'semínka a mák',
    ],
    allergenOrder: 14,
    allergenicity: 'high',
    ladder: {
      allergenId: 'sesame',
      stages: {
        // breastfed only — no dcera doses in Matoušková, no Pekárková seeds table
        breastfed: [
          {
            id: 'sesame-1',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '1 polévková lžíce semínek (chia/sezamových/slunečnicových)',
          },
          {
            id: 'sesame-2',
            anchor: 'package',
            isEvaluationCheckpoint: false,
            dose: 'Semínka neomezeně',
          },
          {
            id: 'sesame-3',
            anchor: 'package',
            isEvaluationCheckpoint: false,
            dose: '1 kousek makovce nebo 1 polévková lžíce máku či makového mléka',
          },
          {
            id: 'sesame-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Makovec neomezeně — večer vyhodnoťte reakci',
          },
        ],
      },
    },
  },

  {
    id: 'soy',
    familyId: 'legumes' as FamilyId,
    icon: '🫘',
    aliases: ['soy', 'soja', 'sója'],
    allergenOrder: 15,
    allergenicity: 'high',
    ladder: {
      allergenId: 'soy',
      stages: {
        breastfed: [
          {
            id: 'soy-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '50 ml sójového mléka',
          },
          {
            id: 'soy-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: '100–150 ml sójového mléka',
          },
          {
            id: 'soy-3',
            anchor: 'package',
            isEvaluationCheckpoint: false,
            dose: 'Neomezeně sójového mléka',
          },
          {
            id: 'soy-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně sójového mléka — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'soy-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 50 ml sojového mléka. Dítě: bez dávky.',
          },
          {
            id: 'soy-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 100–150 ml sojového mléka. Dítě: 1–2 lžičky sojového mléka.',
          },
          {
            id: 'soy-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezeně. Dítě: 4–6 lžiček sojového mléka.',
          },
          {
            id: 'soy-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezeně. Dítě: neomezeně — večer vyhodnoťte reakci.',
          },
        ],
        // solids: no source table in Pekárková or Matoušková (Matoušková never
        // tests dcera without a simultaneous já dose). Derived by scaling
        // Matoušková's dcera numbers to match the tiny-start/eval-day shape
        // used elsewhere (wheat/eggs solids) — not sourced from either PDF.
        solids: [
          {
            id: 'soy-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky sojového mléka.',
          },
          {
            id: 'soy-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1–2 lžičky sojového mléka.',
          },
          {
            id: 'soy-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '4–6 lžiček sojového mléka.',
          },
          {
            id: 'soy-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'nuts',
    familyId: 'nuts-seeds' as FamilyId,
    icon: '🥜',
    aliases: ['nuts', 'ořechy', 'mandle', 'vlašské ořechy', 'kešu', 'lískové ořechy'],
    allergenOrder: 16,
    allergenicity: 'high',
    ladder: {
      allergenId: 'nuts',
      stages: {
        breastfed: [
          { id: 'nuts-1', anchor: 'pinch', isEvaluationCheckpoint: false, dose: '1 Hrst mandlí' },
          {
            id: 'nuts-2',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '1 hrst kešu/vlašských ořechů',
          },
          {
            id: 'nuts-3',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '1 hrst lískových ořechů',
          },
          {
            id: 'nuts-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně ořechů — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'nuts-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 hrst mandlí. Dítě: zatím bez dávky (hypoalergenní příkrmy).',
          },
          {
            id: 'nuts-mixed-2',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 hrst kešu/vlašských. Dítě: zatím bez dávky (hypoalergenní příkrmy).',
          },
          {
            id: 'nuts-mixed-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 hrst lískových oříšků. Dítě: ½ lžičky drcených mandlí (nebo 1 lžíce mandlového mléka).',
          },
          {
            id: 'nuts-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezeně. Dítě: 2–5 lžiček drcených mandlí (nebo 2–5 lžic mandlového mléka) — večer vyhodnoťte reakci.',
          },
        ],
        // solids: Matoušková's dcera column only has data for days 3–4 (½ lžičky
        // and 2–5 lžiček drcených mandlí); days 1–2 below are derived to match
        // the tiny-start/eval-day shape used elsewhere (wheat/eggs solids) —
        // not sourced from either PDF.
        solids: [
          {
            id: 'nuts-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Špetka drcených mandlí (jemná moučka) — postupujte extrémně opatrně!',
          },
          {
            id: 'nuts-solids-2',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '¼ lžičky drcených mandlí.',
          },
          {
            id: 'nuts-solids-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky drcených mandlí (nebo 1 lžíce mandlového mléka).',
          },
          {
            id: 'nuts-solids-4',
            anchor: 'spoon',
            isEvaluationCheckpoint: true,
            dose: '2–5 lžiček drcených mandlí (nebo 2–5 lžic mandlového mléka) — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'beef',
    familyId: 'meat' as FamilyId,
    icon: '🐄',
    aliases: ['beef', 'hovězí', 'telecí', 'cow protein', 'BSA'],
    allergenOrder: 17,
    allergenicity: 'low',
    ladder: {
      allergenId: 'beef',
      stages: {
        breastfed: [
          {
            id: 'beef-breastfed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Hovězí maso neomezeně.',
          },
          {
            id: 'beef-breastfed-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Hovězí maso neomezeně.',
          },
          {
            id: 'beef-breastfed-3',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Hovězí maso neomezeně.',
          },
          {
            id: 'beef-breastfed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Hovězí maso neomezeně — večer vyhodnoťte reakci.',
          },
        ],
        mixed: [
          {
            id: 'beef-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: hovězí maso neomezeně. Dítě: bez dávky.',
          },
          {
            id: 'beef-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: hovězí maso neomezeně. Dítě: 1–2 lžičky hovězího masa (nebo 20–30 ml vývaru z hovězího masa).',
          },
          {
            id: 'beef-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: hovězí maso neomezeně. Dítě: 2–6 lžiček hovězího masa (nebo 40–90 ml vývaru).',
          },
          {
            id: 'beef-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: hovězí maso neomezeně. Dítě: neomezeně — večer vyhodnoťte reakci.',
          },
        ],
        // solids: derived from mixed dítě column; no breastfed maminka-only table in either PDF.
        solids: [
          {
            id: 'beef-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '1 lžička hovězího masa (nebo 10–15 ml vývaru z hovězího masa).',
          },
          {
            id: 'beef-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '1–2 lžičky hovězího masa (nebo 20–30 ml vývaru).',
          },
          {
            id: 'beef-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2–6 lžiček hovězího masa (nebo 40–90 ml vývaru).',
          },
          {
            id: 'beef-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'cocoa',
    familyId: 'sweet' as FamilyId,
    icon: '🍫',
    aliases: ['chocolate', 'čokoláda', 'kakao', 'cocoa'],
    allergenOrder: 18,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'cocoa',
      stages: {
        breastfed: [
          {
            id: 'cocoa-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '2–3 kostičky hořké čokolády (min. 70 % kakaa)',
          },
          {
            id: 'cocoa-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Polovina tabulky čokolády',
          },
          {
            id: 'cocoa-3',
            anchor: 'package',
            isEvaluationCheckpoint: false,
            dose: 'Neomezeně čokolády',
          },
          {
            id: 'cocoa-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně čokolády — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'cocoa-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 2–3 kostičky hořké čokolády (min. 70 % kakaa). Dítě: bez dávky.',
          },
          {
            id: 'cocoa-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: polovina tabulky čokolády. Dítě: ½ lžičky kakaa (do kaše).',
          },
          {
            id: 'cocoa-mixed-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: neomezeně. Dítě: 1–1½ lžičky kakaa.',
          },
          {
            id: 'cocoa-mixed-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezeně. Dítě: neomezeně — večer vyhodnoťte reakci.',
          },
        ],
        // solids: no isolated child-only table in either PDF (Matoušková's
        // dcera dose only occurs alongside a simultaneous já dose). Derived by
        // scaling Matoušková's dcera numbers to the tiny-start/eval-day shape
        // used elsewhere (soy solids) — not sourced from either PDF.
        solids: [
          {
            id: 'cocoa-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '¼ lžičky kakaa (do kaše).',
          },
          {
            id: 'cocoa-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky kakaa (do kaše).',
          },
          {
            id: 'cocoa-solids-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '1–1½ lžičky kakaa.',
          },
          {
            id: 'cocoa-solids-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    // honey: Matoušková tests in 5 days, maminka neomezeně from day 1;
    // dcera doses start day 2. No Pekárková honey table.
    id: 'honey',
    familyId: 'sweet' as FamilyId,
    icon: '🍯',
    aliases: ['honey', 'med'],
    allergenOrder: 19,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'honey',
      stages: {
        mixed: [
          {
            id: 'honey-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: med neomezeně. Dítě: bez dávky.',
          },
          {
            id: 'honey-mixed-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: med neomezeně. Dítě: ½ lžičky medu.',
          },
          {
            id: 'honey-mixed-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: med neomezeně. Dítě: ½ lžičky medu.',
          },
          {
            id: 'honey-mixed-4',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: med neomezeně. Dítě: 1 lžička medu.',
          },
          {
            id: 'honey-mixed-5',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: med neomezeně. Dítě: neomezeně (stačí 1 lžička) — večer vyhodnoťte reakci.',
          },
        ],
        // solids: derived from mixed dítě column; no isolated child table in either PDF.
        solids: [
          {
            id: 'honey-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '¼ lžičky medu.',
          },
          {
            id: 'honey-solids-2',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky medu.',
          },
          {
            id: 'honey-solids-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky medu.',
          },
          {
            id: 'honey-solids-4',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '1 lžička medu.',
          },
          {
            id: 'honey-solids-5',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně (stačí 1 lžička) — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    id: 'spices-herbs',
    familyId: 'spices-condiments' as FamilyId,
    icon: '🌿',
    aliases: [
      'spices',
      'herbs',
      'koření',
      'bylinky',
      'chilli',
      'pepper',
      'paprika-powder',
      'kmín',
      'caraway',
    ],
    allergenOrder: 20,
    allergenicity: 'moderate',
    ladder: {
      allergenId: 'spices-herbs',
      stages: {
        // No Pekárková table; Matoušková tests in 3 days with dcera doses days 2–3.
        // No breastfed or solids source — mixed is the only sourced stage.
        mixed: [
          {
            id: 'spices-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: koření neomezeně (kari, kurkuma, sladká paprika, pepř — ideálně vystřídat více druhů). Dítě: bez dávky.',
          },
          {
            id: 'spices-mixed-2',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: koření neomezeně. Dítě: špetka sladké papriky/kari/kurkumy.',
          },
          {
            id: 'spices-mixed-3',
            anchor: 'pinch',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: koření neomezeně. Dítě: špetka sladké papriky/kari/kurkumy — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    // split out of "nuts" — Matoušková tests arašídy on a separate table from
    // tree nuts, mother-only. No dcera dose exists anywhere in either PDF;
    // mixed/solids dítě doses below are fully derived (not sourced), kept
    // deliberately conservative given peanut's higher anaphylaxis risk.
    id: 'peanuts',
    familyId: 'nuts-seeds' as FamilyId,
    icon: '🥜',
    aliases: ['peanuts', 'arašídy', 'podzemnice olejná'],
    allergenOrder: 21,
    allergenicity: 'high',
    ladder: {
      allergenId: 'peanuts',
      stages: {
        breastfed: [
          {
            id: 'peanuts-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '1 lžička arašídů',
          },
          {
            id: 'peanuts-2',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '1 polévková lžíce arašídů',
          },
          {
            id: 'peanuts-3',
            anchor: 'spoon',
            isEvaluationCheckpoint: false,
            dose: '2 polévkové lžíce arašídů',
          },
          {
            id: 'peanuts-4',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně arašídů — večer vyhodnoťte reakci',
          },
        ],
        mixed: [
          {
            id: 'peanuts-mixed-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 lžička arašídů. Dítě: zatím bez dávky (hypoalergenní příkrmy).',
          },
          {
            id: 'peanuts-mixed-2',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 1 polévková lžíce arašídů. Dítě: špetka arašídového másla.',
          },
          {
            id: 'peanuts-mixed-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: 'Maminka: 2 polévkové lžíce arašídů. Dítě: ¼ lžičky arašídového másla.',
          },
          {
            id: 'peanuts-mixed-4',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: true,
            dose: 'Maminka: neomezeně. Dítě: ½ lžičky arašídového másla — večer vyhodnoťte reakci.',
          },
        ],
        solids: [
          {
            id: 'peanuts-solids-1',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: 'Špetka arašídového másla (na špičku prstu) — postupujte extrémně opatrně, ideálně pod dohledem lékaře.',
          },
          {
            id: 'peanuts-solids-2',
            anchor: 'pinch',
            isEvaluationCheckpoint: false,
            dose: '¼ lžičky arašídového másla.',
          },
          {
            id: 'peanuts-solids-3',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: false,
            dose: '½ lžičky arašídového másla.',
          },
          {
            id: 'peanuts-solids-4',
            anchor: 'teaspoon',
            isEvaluationCheckpoint: true,
            dose: '1 lžička arašídového másla — večer vyhodnoťte reakci.',
          },
        ],
      },
    },
  },

  {
    // no source for shellfish - ai generated only?
    id: 'shellfish',
    familyId: 'fish-seafood' as FamilyId,
    icon: '🦐',
    aliases: ['shellfish', 'korýši', 'měkkýši', 'krevety', 'krab', 'mušle'],
    allergenOrder: 22,
    allergenicity: 'high',
    ladder: {
      allergenId: 'shellfish',
      stages: {
        breastfed: [
          {
            id: 'shellfish-1',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Malá porce korýšů nebo měkkýšů (cca 50 g)',
          },
          {
            id: 'shellfish-2',
            anchor: 'portion',
            isEvaluationCheckpoint: false,
            dose: 'Střední porce korýšů nebo měkkýšů (cca 100 g)',
          },
          {
            id: 'shellfish-3',
            anchor: 'package',
            isEvaluationCheckpoint: true,
            dose: 'Neomezeně korýšů a měkkýšů — večer vyhodnoťte reakci',
          },
        ],
      },
    },
  },
  // ── Log-only allergens (no protocol) ─────────────────────
  {
    id: 'grains',
    familyId: 'grains' as FamilyId,
    icon: '🌾',
    aliases: ['grains', 'obiloviny'],
  },
  {
    id: 'seeds',
    familyId: 'nuts-seeds' as FamilyId,
    icon: '🌱',
    aliases: ['seeds', 'semínka'],
  },
  {
    id: 'fruit',
    familyId: 'fruit' as FamilyId,
    icon: '🍎',
    aliases: ['fruit', 'ovoce'],
  },
  {
    id: 'cabbage-brassica',
    familyId: 'vegetables' as FamilyId,
    icon: '🥬',
    aliases: ['cabbage', 'brassica', 'zelí', 'košťálová zelenina'],
  },
  {
    id: 'onion-garlic',
    familyId: 'vegetables' as FamilyId,
    icon: '🧅',
    aliases: ['onion', 'garlic', 'cibule', 'česnek'],
  },
  {
    id: 'potato',
    familyId: 'vegetables' as FamilyId,
    icon: '🥔',
    aliases: ['potato', 'brambory'],
  },
  {
    id: 'mushroom',
    familyId: 'vegetables' as FamilyId,
    icon: '🍄',
    aliases: ['mushroom', 'houby'],
  },
  {
    id: 'celery',
    familyId: 'vegetables' as FamilyId,
    icon: '🥬',
    aliases: ['celery', 'celer'],
  },
  {
    id: 'other-vegetables',
    familyId: 'vegetables' as FamilyId,
    icon: '🥒',
    aliases: ['vegetables', 'zelenina', 'paprika', 'cucumber', 'okurka', 'cuketa', 'zucchini'],
  },
  {
    id: 'meat',
    familyId: 'meat' as FamilyId,
    icon: '🥩',
    aliases: ['meat', 'maso'],
  },
  {
    id: 'mustard',
    familyId: 'spices-condiments' as FamilyId,
    icon: '🌿',
    aliases: ['mustard', 'hořčice'],
  },
  {
    id: 'sulphites-additives',
    familyId: 'spices-condiments' as FamilyId,
    icon: '⚗️',
    aliases: ['sulphites', 'additives', 'siřičitany', 'aditiva'],
  },
  {
    id: 'vinegar-fermented',
    familyId: 'spices-condiments' as FamilyId,
    icon: '🫙',
    aliases: ['vinegar', 'fermented', 'ocet', 'kvašené'],
  },
  {
    id: 'yeast',
    familyId: 'spices-condiments' as FamilyId,
    icon: '🍞',
    aliases: ['yeast', 'droždí', 'kvasnice'],
  },
  {
    id: 'sweeteners',
    familyId: 'sweet' as FamilyId,
    icon: '🍬',
    aliases: ['sweeteners', 'sladidla', 'med', 'cukr'],
  },
  {
    id: 'coffee-tea',
    familyId: 'drinks' as FamilyId,
    icon: '☕',
    aliases: ['coffee', 'tea', 'káva', 'čaj'],
  },
] as const satisfies readonly AllergenRecord[];

export type CatalogAllergenId = (typeof ALLERGENS)[number]['id'];
/**
 * Since #662 removed the `other:` arm there is one tier of allergen id, so this
 * is a plain synonym. `AllergenId` is the spelling for domain and UI code;
 * `CatalogAllergenId` is reserved for the sites that key a table *off the
 * catalog* (`satisfies Record<CatalogAllergenId, …>` in `strings/`), where the
 * name says the exhaustiveness check is the point.
 */
export type AllergenId = CatalogAllergenId;
/** Allergens with a reintroduction ladder */
export type LadderAllergenId = Extract<(typeof ALLERGENS)[number], { ladder: object }>['id'];

/**
 * Ids of every rung on every ladder authored in `ALLERGENS`. Derived from the
 * data. Consumers that need to reference a specific rung by id (routes, UI)
 * import this type; the rung's Czech `dose` caption lives inline on the
 * `LadderStep` record (ADR-0023, see comment on `LadderStep` in
 * `canonical-allergen.ts`).
 */
export type LadderStepId = NonNullable<
  NonNullable<
    Extract<(typeof ALLERGENS)[number], { ladder: object }>['ladder']
  >['stages'][keyof NonNullable<
    Extract<(typeof ALLERGENS)[number], { ladder: object }>['ladder']
  >['stages']]
>[number]['id'];

// ── Foods ─────────────────────────────────────────────────────

type FoodRecord = {
  id: string;
  familyId: FamilyId;
  allergenIds: readonly CatalogAllergenId[];
  /**
   * The preparation methods that make sense for this food, in chip-display
   * order (ADR-0028). Hand-authored per food — an empty list means the food
   * takes no preparation row (water, oil, salt, sugar). Catalog metadata only:
   * the `preparationMethod` stored on a logged meal item is unconstrained
   * (issue #314).
   */
  preparations: readonly PreparationMethod[];
  aliases?: readonly string[];
  /**
   * Optional presentation key clustering foods within a family (ADR-0019).
   * Independent of `familyId`/`allergenIds`; never enters conflict detection.
   */
  sourceGroup?: string;
};

export const FOODS = [
  // ── Food twins (§3a) ─────────────────────────────────────
  {
    id: 'vejce',
    familyId: 'eggs' as FamilyId,
    allergenIds: ['eggs'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    aliases: ['celé vejce'],
  },
  {
    id: 'bilek',
    familyId: 'eggs' as FamilyId,
    allergenIds: ['eggs'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    aliases: ['bílek', 'vaječný bílek', 'egg white'],
  },
  {
    id: 'zloutek',
    familyId: 'eggs' as FamilyId,
    allergenIds: ['eggs'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    aliases: ['žloutek', 'vaječný žloutek', 'egg yolk'],
  },
  {
    id: 'kravske-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'cow',
  },
  {
    id: 'jogurt',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'cow',
  },
  {
    id: 'psenice',
    familyId: 'grains' as FamilyId,
    allergenIds: ['wheat'],
    preparations: ['boiled', 'baked', 'fried'],
    sourceGroup: 'gluten',
  },
  {
    id: 'tofu',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['soy'],
    preparations: ['boiled', 'baked', 'fried'],
  },
  {
    id: 'sezam',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['sesame'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'seminka',
  },
  {
    id: 'jahody',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['strawberries'],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'bobuloviny',
  },
  {
    id: 'rajce',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['tomatoes'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'plodova',
  },
  {
    id: 'kukurice',
    familyId: 'grains' as FamilyId,
    allergenIds: [],
    preparations: ['boiled', 'baked', 'fried'],
    sourceGroup: 'gluten-free',
  },
  {
    id: 'pomeranc',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['citrus'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'citrusy',
  },
  {
    id: 'horka-cokolada',
    familyId: 'sweet' as FamilyId,
    allergenIds: ['cocoa'],
    preparations: ['raw'],
    sourceGroup: 'chocolate',
    aliases: ['hořká čokoláda', 'dark chocolate'],
  },
  {
    id: 'losos',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked', 'fried'],
    sourceGroup: 'morske',
  },
  {
    id: 'krevetky',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['shellfish'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'plody-more',
  },
  // ── Divergent placements (§3b) ───────────────────────────
  {
    id: 'sojove-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['soy'],
    preparations: ['raw', 'boiled', 'baked'],
    aliases: ['sójové mléko', 'sojove mleko', 'soya milk'],
    sourceGroup: 'plant',
  },
  {
    id: 'ryzove-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked'],
    aliases: ['rýžové mléko', 'rice milk'],
    sourceGroup: 'plant',
  },
  {
    id: 'mandlove-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'boiled', 'baked'],
    aliases: ['mandlové mléko', 'almond milk'],
    sourceGroup: 'plant',
  },
  {
    id: 'ovesne-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked'],
    aliases: ['ovesné mléko', 'oat milk'],
    sourceGroup: 'plant',
  },
  {
    id: 'kokosove-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked'],
    aliases: ['kokosové mléko', 'coconut milk'],
    sourceGroup: 'plant',
  },
  {
    id: 'ovci-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked'],
    aliases: ['ovčí mléko', 'sheep milk'],
    sourceGroup: 'sheep',
  },
  {
    id: 'kozi-mleko',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked'],
    aliases: ['kozí mléko', 'goat milk'],
    sourceGroup: 'goat',
  },
  // ── Composite food (§3c) ─────────────────────────────────
  {
    id: 'hummus',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['legumes', 'sesame'],
    preparations: [],
    aliases: ['hummus', 'homus'],
  },
  {
    id: 'mlecna-cokolada',
    familyId: 'sweet' as FamilyId,
    allergenIds: ['cocoa', 'dairy'],
    preparations: ['raw'],
    sourceGroup: 'chocolate',
    aliases: ['mléčná čokoláda', 'milk chocolate'],
  },
  {
    id: 'oriskova-cokolada',
    familyId: 'sweet' as FamilyId,
    allergenIds: ['cocoa', 'dairy', 'nuts'],
    preparations: ['raw'],
    sourceGroup: 'chocolate',
    aliases: ['oříšková čokoláda', 'hazelnut chocolate'],
  },
  // ── Loose everyday foods (§3d) ───────────────────────────
  // Dairy — cow product split (earned: jogurt fermented, sýr/tvaroh casein-heavy, smetana fat-rich)
  // Note: cooking fats (máslo, ghí, rostlinné máslo) live in `fats-oils` family — they share a
  // shopping aisle with sádlo and olej, not with milk drinks. Allergen tags preserved (máslo + ghí
  // still carry `dairy` for elimination).
  {
    id: 'tvaroh',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'cow',
  },
  {
    id: 'syr',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'cow',
  },
  {
    id: 'smetana',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'cow',
  },
  {
    id: 'brynza',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'sheep',
  },
  {
    id: 'kozi-syr',
    familyId: 'dairy' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'goat',
    aliases: ['kozí sýr'],
  },
  // Grains — source-tier only (ADR-0019 + #319 follow-up).
  // Specific products (chleb, rohlík, těstoviny, mouka) reduce to their source.
  {
    id: 'oves',
    familyId: 'grains' as FamilyId,
    allergenIds: ['oats'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'gluten',
  },
  {
    id: 'jecmen',
    familyId: 'grains' as FamilyId,
    allergenIds: [],
    preparations: ['boiled', 'baked', 'fried'],
    sourceGroup: 'gluten',
  },
  {
    id: 'zito',
    familyId: 'grains' as FamilyId,
    allergenIds: [],
    preparations: ['boiled', 'baked', 'fried'],
    sourceGroup: 'gluten',
  },
  {
    id: 'ryze',
    familyId: 'grains' as FamilyId,
    allergenIds: [],
    preparations: ['boiled', 'baked', 'fried'],
    aliases: ['rýže', 'ryze', 'rice'],
    sourceGroup: 'gluten-free',
  },
  {
    id: 'pohanka',
    familyId: 'grains' as FamilyId,
    allergenIds: [],
    preparations: ['boiled', 'baked', 'fried'],
    sourceGroup: 'gluten-free',
  },
  {
    id: 'proso-jahly',
    familyId: 'grains' as FamilyId,
    allergenIds: [],
    preparations: ['boiled', 'baked', 'fried'],
    sourceGroup: 'gluten-free',
  },
  {
    id: 'quinoa',
    familyId: 'grains' as FamilyId,
    allergenIds: [],
    preparations: ['boiled', 'baked', 'fried'],
    sourceGroup: 'gluten-free',
  },
  // Vegetables
  // Vegetables — 6-group culinary axis (Plodová / Listová / Kořenová / Cibulová / Hlízová / Košťálová).
  // Houby renders under `Ostatní` (mushrooms aren't culinary vegetables).
  {
    id: 'okurka',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw'],
    sourceGroup: 'plodova',
  },
  {
    id: 'cuketa',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'plodova',
  },
  {
    id: 'spenat',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'listova',
  },
  {
    id: 'listovy-salat',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw'],
    sourceGroup: 'listova',
    aliases: ['listový salát', 'salát'],
  },
  {
    id: 'paprika',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'plodova',
  },
  {
    id: 'brokolice',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'kostalova',
  },
  {
    id: 'mrkev',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['carrot-root-veg'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'korenova',
  },
  {
    id: 'pastynak',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['carrot-root-veg'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'korenova',
    aliases: ['pastyňák'],
  },
  {
    id: 'celer',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['celery'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'korenova',
  },
  {
    id: 'redkev',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['carrot-root-veg'],
    preparations: ['raw'],
    sourceGroup: 'korenova',
    aliases: ['ředkev', 'ředkvička'],
  },
  {
    id: 'brambory',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['potato'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'hlizova',
  },
  {
    id: 'cesnek',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'cibulova',
  },
  {
    id: 'cibule',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'cibulova',
  },
  {
    id: 'kvetak',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['cabbage-brassica'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'kostalova',
    aliases: ['květák'],
  },
  {
    id: 'zeli',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['cabbage-brassica'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'kostalova',
    aliases: ['zelí'],
  },
  {
    id: 'dyne',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'plodova',
    aliases: ['dýně'],
  },
  {
    id: 'repa',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['carrot-root-veg'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'korenova',
    aliases: ['řepa'],
  },
  {
    id: 'bataty',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['carrot-root-veg'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'hlizova',
    aliases: ['batáty'],
  },
  {
    id: 'lilek',
    familyId: 'vegetables' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'plodova',
  },
  {
    id: 'houby',
    familyId: 'vegetables' as FamilyId,
    allergenIds: ['mushroom'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
  },
  // Fruit
  {
    id: 'jablko',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'jadroviny',
  },
  {
    id: 'hruska',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'jadroviny',
  },
  {
    id: 'merunka',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'peckoviny',
  },
  {
    id: 'broskev',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'peckoviny',
  },
  {
    id: 'hrozny',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'dried'],
    sourceGroup: 'bobuloviny',
  },
  {
    id: 'svestka',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'peckoviny',
    aliases: ['švestka'],
  },
  {
    id: 'tresne',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'peckoviny',
    aliases: ['třešně', 'višně'],
  },
  {
    id: 'boruvky',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'bobuloviny',
  },
  {
    id: 'maliny',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['raspberries'],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'bobuloviny',
  },
  {
    id: 'rybiz',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['raspberries'],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'bobuloviny',
    aliases: ['rybíz'],
  },
  {
    id: 'banan',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['exotic-fruit'],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'tropicke',
  },
  {
    id: 'kiwi',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['exotic-fruit'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'tropicke',
  },
  {
    id: 'mango',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['exotic-fruit'],
    preparations: ['raw', 'baked', 'dried'],
    sourceGroup: 'tropicke',
  },
  {
    id: 'ananas',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['exotic-fruit'],
    preparations: ['raw', 'baked', 'dried'],
    sourceGroup: 'tropicke',
  },
  {
    id: 'avokado',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['exotic-fruit'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'tropicke',
    aliases: ['avokádo'],
  },
  {
    id: 'granatove-jablko',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['exotic-fruit'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'tropicke',
    aliases: ['granátové jablko', 'pomegranate'],
  },
  {
    id: 'citron',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['citrus'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'citrusy',
  },
  {
    id: 'mandarinka',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['citrus'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'citrusy',
  },
  {
    id: 'grapefruit',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['citrus'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'citrusy',
  },
  {
    id: 'meloun',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw'],
    sourceGroup: 'tropicke',
  },
  {
    id: 'brusinky',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'bobuloviny',
  },
  {
    id: 'ostruziny',
    familyId: 'fruit' as FamilyId,
    allergenIds: ['raspberries'],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'bobuloviny',
    aliases: ['ostružiny'],
  },
  {
    id: 'angrest',
    familyId: 'fruit' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked', 'boiled', 'dried'],
    sourceGroup: 'bobuloviny',
    aliases: ['angrešt'],
  },
  // Meat
  {
    id: 'kureci',
    familyId: 'meat' as FamilyId,
    allergenIds: ['chicken'],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked'],
  },
  {
    id: 'hovezi',
    familyId: 'meat' as FamilyId,
    allergenIds: ['beef'],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
  },
  {
    id: 'teleci',
    familyId: 'meat' as FamilyId,
    allergenIds: ['beef'],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
    aliases: ['telecí'],
  },
  {
    id: 'veprove',
    familyId: 'meat' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
  },
  {
    id: 'kruti',
    familyId: 'meat' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
  },
  {
    id: 'jehnneci',
    familyId: 'meat' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
  },
  {
    id: 'kachna',
    familyId: 'meat' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
  },
  {
    id: 'kralik',
    familyId: 'meat' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
    aliases: ['králík'],
  },
  {
    id: 'zverina',
    familyId: 'meat' as FamilyId,
    allergenIds: ['dairy'],
    preparations: ['raw', 'boiled', 'baked', 'fried', 'smoked', 'cured'],
    aliases: ['zvěřina', 'jelení', 'srnčí', 'divočák'],
  },
  // Note: sádlo (rendered pork fat) lives in `fats-oils` family — it's a cooking fat, not meat.
  // Fish/seafood
  {
    id: 'treska',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked', 'fried'],
    sourceGroup: 'morske',
  },
  {
    id: 'tunak',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked', 'fried'],
    sourceGroup: 'morske',
  },
  {
    id: 'sardinky',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked'],
    sourceGroup: 'morske',
  },
  {
    id: 'makrela',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked', 'fried'],
    sourceGroup: 'morske',
  },
  {
    id: 'sled',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked'],
    sourceGroup: 'morske',
    aliases: ['sleď'],
  },
  {
    id: 'halibut',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked', 'fried'],
    sourceGroup: 'morske',
  },
  {
    id: 'tilapie',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'morske',
  },
  {
    id: 'pstruh',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'smoked', 'fried'],
    sourceGroup: 'sladkovodni',
  },
  {
    id: 'kapr',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'sladkovodni',
  },
  {
    id: 'sumec',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'sladkovodni',
  },
  {
    id: 'pangas',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['fish'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'sladkovodni',
  },
  {
    id: 'musle',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['shellfish'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'plody-more',
    aliases: ['mušle'],
  },
  {
    id: 'krab',
    familyId: 'fish-seafood' as FamilyId,
    allergenIds: ['shellfish'],
    preparations: ['raw', 'boiled', 'baked', 'fried'],
    sourceGroup: 'plody-more',
  },
  // Legumes
  {
    id: 'cocka',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['legumes'],
    preparations: ['boiled', 'baked', 'fried'],
  },
  {
    id: 'fazole',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['legumes'],
    preparations: ['boiled', 'baked', 'fried'],
  },
  {
    id: 'hrac',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['legumes'],
    preparations: ['boiled', 'baked', 'fried'],
  },
  {
    id: 'cizrna',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['legumes'],
    preparations: ['boiled', 'baked', 'fried'],
  },
  {
    id: 'tempeh',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['soy'],
    preparations: ['boiled', 'baked', 'fried'],
  },
  {
    id: 'edamame',
    familyId: 'legumes' as FamilyId,
    allergenIds: ['soy'],
    preparations: ['boiled', 'baked', 'fried'],
  },
  // Nuts/seeds
  {
    id: 'vlassky-orech',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
  },
  {
    id: 'mandle',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
  },
  {
    id: 'liskove',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['lískové ořechy'],
  },
  {
    id: 'kesu',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['kešu'],
  },
  {
    id: 'para',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['para ořechy'],
  },
  {
    id: 'arasidy',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['peanuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['arašídy', 'peanuts'],
  },
  {
    id: 'pekanove',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['pekanové ořechy', 'pecans'],
  },
  {
    id: 'pistacie',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['pistácie', 'pistachios'],
  },
  {
    id: 'makadamove',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['nuts'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['makadamové ořechy', 'macadamia'],
  },
  {
    id: 'kokos',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked'],
    sourceGroup: 'orechy',
    aliases: ['kokosové vločky', 'coconut'],
  },
  {
    id: 'dynova-seminka',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked'],
    sourceGroup: 'seminka',
  },
  {
    id: 'lnene-semenko',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: [],
    preparations: ['raw', 'baked'],
    sourceGroup: 'seminka',
  },
  {
    id: 'slunecnicova-seminka',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['sesame'],
    preparations: ['raw', 'baked'],
    sourceGroup: 'seminka',
  },
  {
    id: 'chia',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['sesame'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'seminka',
  },
  {
    id: 'mak',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['sesame'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'seminka',
    aliases: ['mák', 'poppy seeds'],
  },
  {
    id: 'konopna-seminka',
    familyId: 'nuts-seeds' as FamilyId,
    allergenIds: ['seeds'],
    preparations: ['raw', 'boiled', 'baked'],
    sourceGroup: 'seminka',
    aliases: ['konopná semínka', 'hemp seeds'],
  },
  // Fats & oils — cooking fats consolidated (Q7: split out from dairy/meat/spices)
  // Source axis: plant (oils, margarine) / animal (dairy fats + rendered pork fat).
  // Oils split by type (option A) — different fatty-acid profiles are a plausible
  // eczema insight signal; all carry [] (refined oil ≈ no seed/fruit protein).
  {
    id: 'maslo',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: ['dairy'],
    preparations: [],
    sourceGroup: 'animal',
  },
  {
    id: 'ghi',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: ['dairy'],
    preparations: [],
    sourceGroup: 'animal',
    aliases: ['ghí', 'ghee', 'přepuštěné máslo'],
  },
  {
    id: 'sadlo',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'animal',
    aliases: ['sádlo', 'vepřové sádlo', 'husí sádlo'],
  },
  {
    id: 'rostlinne-maslo',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'plant',
    aliases: ['rostlinné máslo', 'margarín', 'Rama', 'Flora'],
  },
  {
    id: 'olivovy-olej',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'plant',
    aliases: ['olivový olej', 'olive oil'],
  },
  {
    id: 'repkovy-olej',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'plant',
    aliases: ['řepkový olej', 'rapeseed oil', 'canola'],
  },
  {
    id: 'slunecnicovy-olej',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'plant',
    aliases: ['slunečnicový olej', 'sunflower oil'],
  },
  {
    id: 'lneny-olej',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'plant',
    aliases: ['lněný olej', 'flaxseed oil', 'linseed oil'],
  },
  {
    id: 'kokosovy-olej',
    familyId: 'fats-oils' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'plant',
    aliases: ['kokosový olej', 'coconut oil'],
  },
  // Sweet
  {
    id: 'kakao',
    familyId: 'sweet' as FamilyId,
    allergenIds: ['cocoa'],
    preparations: [],
    sourceGroup: 'chocolate',
    aliases: ['kakao', 'cocoa', 'kakaový prášek'],
  },
  {
    id: 'karob',
    familyId: 'sweet' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'chocolate',
    aliases: ['karob', 'carob', 'svatojánský chléb'],
  },
  {
    id: 'med',
    familyId: 'sweet' as FamilyId,
    allergenIds: ['honey'],
    preparations: [],
    sourceGroup: 'sweetener',
  },
  {
    id: 'javorovy-sirup',
    familyId: 'sweet' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'sweetener',
  },
  {
    id: 'agavovy-sirup',
    familyId: 'sweet' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'sweetener',
    aliases: ['agávový sirup', 'agave syrup'],
  },
  {
    id: 'cekankovy-sirup',
    familyId: 'sweet' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'sweetener',
    aliases: ['čekankový sirup', 'chicory syrup'],
  },
  {
    id: 'cukr',
    familyId: 'sweet' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'sweetener',
    aliases: ['cukr', 'třtinový cukr', 'bílý cukr', 'sugar'],
  },
  {
    id: 'xylitol',
    familyId: 'sweet' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'sweetener',
    aliases: ['xylitol', 'březový cukr', 'birch sugar'],
  },
  {
    id: 'stevie',
    familyId: 'sweet' as FamilyId,
    allergenIds: [],
    preparations: [],
    sourceGroup: 'sweetener',
    aliases: ['stévie', 'stevia'],
  },
  // Spices/condiments
  {
    id: 'sul',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: [],
    preparations: [],
  },
  // Bylinky aggregated (fresh + dried herbs share [] allergen signal); individual spices
  // split out per #338 — cinnamon/chilli/cumin/paprika powder appear often enough to
  // warrant their own tiles. Yeast (droždí) gets a tile so it can be logged from /meal.
  {
    id: 'bylinky',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['spices-herbs'],
    preparations: [],
    aliases: [
      'bylinky',
      'bazalka',
      'oregano',
      'petržel',
      'majoránka',
      'kurkuma',
      'zázvor',
      'tymián',
      'rozmarýn',
      'koriandr',
    ],
  },
  {
    id: 'skorice',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['spices-herbs'],
    preparations: [],
    aliases: ['skořice', 'cinnamon'],
  },
  {
    id: 'chilli',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['spices-herbs'],
    preparations: [],
    aliases: ['chilli', 'chili', 'kajenský pepř', 'cayenne'],
  },
  {
    id: 'kmin',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['spices-herbs'],
    preparations: [],
    aliases: ['kmín', 'caraway'],
  },
  {
    id: 'mleta-paprika',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['spices-herbs'],
    preparations: [],
    aliases: ['mletá paprika', 'paprika powder', 'sladká paprika', 'uzená paprika'],
  },
  {
    id: 'drozdi',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['yeast'],
    preparations: [],
    aliases: ['droždí', 'kvasnice', 'pekařské droždí', 'sušené droždí'],
  },
  {
    id: 'kecup',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['tomatoes'],
    preparations: [],
  },
  {
    id: 'horcice',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['mustard'],
    preparations: [],
  },
  {
    id: 'ocet',
    familyId: 'spices-condiments' as FamilyId,
    allergenIds: ['vinegar-fermented'],
    preparations: [],
    aliases: ['ocet', 'jablečný ocet', 'vinný ocet', 'balsamico'],
  },
  // Drinks — no preparation row (beverages are drunk, not prepared raw/cooked)
  {
    id: 'bylinny-caj',
    familyId: 'drinks' as FamilyId,
    allergenIds: [],
    preparations: [],
  },
  {
    id: 'kava',
    familyId: 'drinks' as FamilyId,
    allergenIds: ['coffee-tea'],
    preparations: [],
  },
  {
    id: 'caj',
    familyId: 'drinks' as FamilyId,
    allergenIds: ['coffee-tea'],
    preparations: [],
    aliases: ['čaj', 'černý čaj', 'zelený čaj', 'bílý čaj', 'oolong'],
  },
  {
    id: 'obilna-kava',
    familyId: 'drinks' as FamilyId,
    allergenIds: ['wheat'],
    preparations: [],
    aliases: ['obilná káva', 'Caro', 'Melta', 'cikorka'],
  },
  {
    id: 'pivo',
    familyId: 'drinks' as FamilyId,
    allergenIds: ['wheat', 'yeast'],
    preparations: [],
    aliases: ['pivo', 'nealkoholické pivo', 'alkoholické pivo', 'beer'],
  },
  {
    id: 'vino',
    familyId: 'drinks' as FamilyId,
    allergenIds: ['sulphites-additives'],
    preparations: [],
    aliases: ['víno', 'wine'],
  },
  {
    id: 'tvrdy-alkohol',
    familyId: 'drinks' as FamilyId,
    allergenIds: [],
    preparations: [],
    aliases: ['tvrdý alkohol', 'destilát', 'spirits'],
  },
  {
    id: 'dzus',
    familyId: 'drinks' as FamilyId,
    allergenIds: [],
    preparations: [],
    aliases: ['džus'],
  },
] as const satisfies readonly FoodRecord[];

export type CatalogFoodId = (typeof FOODS)[number]['id'];
/**
 * The catalog is the whole set of loggable food identities (issue #662). There
 * is no free-text tier: a food the app cannot resolve to a catalog record is a
 * food it cannot reason about, so it is not representable. It is therefore a
 * plain synonym of `CatalogFoodId`, and the same spelling rule applies as for
 * `AllergenId`: use `FoodId` in domain and UI code, `CatalogFoodId` only where a
 * table is keyed off the catalog for exhaustiveness (`satisfies Record<…>`).
 */
export type FoodId = CatalogFoodId;
