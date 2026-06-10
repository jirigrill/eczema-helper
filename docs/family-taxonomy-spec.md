# Family Taxonomy & Record→Food Mapping — Sign-off Spec

> Issue #226 — HITL artifact. This document must be reviewed and approved before Slice 2 (#225) begins implementation.

---

## 1. Family Set (grid tiles)

Thirteen families, one per row in the clinical table + `Vlastní`:

| `familyId`            | Czech display name       | Icon | Notes |
|-----------------------|--------------------------|------|-------|
| `grains`              | Obiloviny                | 🌾   | |
| `vegetables`          | Zelenina                 | 🥦   | Umbrella for all vegetable allergens |
| `fruit`               | Ovoce                    | 🍎   | Umbrella for all fruit allergens |
| `meat`                | Maso                     | 🥩   | Maso only — **separate** from Ryby |
| `fish-seafood`        | Ryby a plody moře        | 🐟   | Fish + shellfish merged into one family tile |
| `dairy`               | Mléko                    | 🥛   | |
| `eggs`                | Vejce                    | 🥚   | |
| `legumes`             | Luštěniny                | 🫘   | Soy lives here, not its own family |
| `nuts-seeds`          | Ořechy a semínka         | 🥜   | Merges the old Ostatní/nuts + seeds |
| `sweet`               | Sladké                   | 🍯   | Chocolate + sweeteners |
| `spices-condiments`   | Koření, omáčky a droždí  | 🌿   | Spices, mustard, vinegar, yeast, sulphites. Subtitle/alias: "koření, omáčky, ocet, droždí, přísady" — covers the breadth of this catch-all |
| `drinks`              | Nápoje a čaje            | ☕   | |
| `custom`              | Vlastní                  | ➕   | User-typed foods, never a protocol phase |

**Decisions baked in:**
- `Maso` and `Ryby a plody moře` are **separate families** (the clinical table has them separate).
- Soy is an allergen **under `legumes`**, not its own family.
- The table's "Ostatní" catch-all is split: `nuts-seeds` absorbs nuts + seeds; `sweet` absorbs chocolate + sweeteners.
- Mushrooms (`mushroom`) go under `vegetables` (see mapping below).

---

## 2. Current Allergen Record → New Family + Role

Each row: current record id → assigned `familyId` → role (`allergen` = keeps protocol seam, `log-only` = plain grouping record, `homeless-resolved` = was in homeless list).

| Current record id     | → familyId            | Role       | Notes |
|-----------------------|-----------------------|------------|-------|
| `dairy`               | `dairy`               | allergen   | Single-allergen family; questionnaire shows allergen in header, no extra drill |
| `eggs`                | `eggs`                | allergen   | Same single-allergen pattern |
| `wheat`               | `grains`              | allergen   | Grains family contains wheat allergen + loose grain foods |
| `soy`                 | `legumes`             | allergen   | **Divergent placement**: soy milk appears under `dairy` family in meal log |
| `nuts`                | `nuts-seeds`          | allergen   | |
| `fish`                | `fish-seafood`        | allergen   | |
| `shellfish`           | `fish-seafood`        | allergen   | |
| `citrus`              | `fruit`               | allergen   | |
| `chocolate`           | `sweet`               | allergen   | |
| `tomatoes`            | `vegetables`          | allergen   | |
| `strawberries`        | `fruit`               | allergen   | |
| `corn`                | `grains`              | allergen   | |
| `sesame`              | `nuts-seeds`          | allergen   | |
| `grains`              | `grains`              | log-only   | Becomes loose foods (rice, oats, etc.) under grains family |
| `seeds`               | `nuts-seeds`          | log-only   | Becomes loose foods under nuts-seeds family |
| `legumes`             | `legumes`             | log-only   | Becomes loose foods (lentils, beans, peas) under legumes family |
| `fruit`               | `fruit`               | log-only   | Becomes loose foods (apple, pear, etc.) under fruit family |
| `exotic-fruit`        | `fruit`               | log-only   | Exotic fruits join fruit family as loose foods |
| `carrot-root-veg`     | `vegetables`          | log-only   | |
| `cabbage-brassica`    | `vegetables`          | log-only   | |
| `onion-garlic`        | `vegetables`          | log-only   | |
| `potato`              | `vegetables`          | log-only   | |
| `mushroom`            | `vegetables`          | log-only   | Mushrooms live under vegetables (no natural separate family) |
| `other-vegetables`    | `vegetables`          | log-only   | |
| `meat`                | `meat`                | log-only   | No protocol; becomes rich food list under meat family |
| `sweeteners`          | `sweet`               | log-only   | Honey/sugar/syrup; joins chocolate under sweet family |
| `spices-herbs`        | `spices-condiments`   | log-only   | |
| `coffee-tea`          | `drinks`              | allergen   | Caffeine-sensitive mothers; kept as a log-only allergen (no protocol) |
| `mustard`             | `spices-condiments`   | homeless-resolved | EU-14 allergen; lives naturally alongside other condiments |
| `sulphites-additives` | `spices-condiments`   | homeless-resolved | EU-14 allergen; additives category fits under condiments umbrella |
| `vinegar-fermented`   | `spices-condiments`   | homeless-resolved | Vinegar is a condiment; fermented veg (pickles) are served as condiments |
| `yeast`               | `spices-condiments`   | homeless-resolved | Baker's yeast / extract typically used in bread/sauces context |

---

## 3. Food List

### 3a. Food twins (directly-eaten allergens that also get a food entity)

A food twin lets a mother log the concrete food she eats, while the allergen trigger still resolves correctly.

| food id        | Czech name   | familyId | allergenIds        | Notes |
|----------------|--------------|----------|--------------------|-------|
| `vejce`        | Vejce        | `eggs`   | `['eggs']`         | Twin for the entire eggs allergen |
| `kravske-mleko`| Kravské mléko| `dairy`  | `['dairy']`        | Twin for dairy allergen |
| `psenicny-chleb` | Pšeničný chléb | `grains` | `['wheat']`   | Representative wheat food |
| `tofu`         | Tofu         | `legumes`| `['soy']`          | Twin for soy, under legumes |
| `arasisove-maslo` | Arašídové máslo | `nuts-seeds` | `['nuts']` | Representative nut food |
| `sezam`        | Sezamová semínka | `nuts-seeds` | `['sesame']` | Twin for sesame allergen |
| `tahini`       | Tahini       | `nuts-seeds` | `['sesame']`   | |
| `jahody`       | Jahody       | `fruit`  | `['strawberries']` | Twin for strawberries allergen |
| `rajce`        | Rajče        | `vegetables` | `['tomatoes']` | Twin for tomatoes allergen |
| `kukurice`     | Kukuřice     | `grains` | `['corn']`         | Twin for corn allergen |
| `pomeranc`     | Pomeranč     | `fruit`  | `['citrus']`       | Twin for citrus allergen |
| `cokolada`     | Hořká čokoláda | `sweet` | `['chocolate']`   | Twin for chocolate allergen |
| `losos`        | Losos        | `fish-seafood` | `['fish']`   | Representative fish food |
| `krevetky`     | Krevety      | `fish-seafood` | `['shellfish']` | Twin for shellfish allergen |

### 3b. Divergent placement (food lives in a different family than its trigger allergen)

| food id         | Czech name     | familyId | allergenIds | Why divergent |
|-----------------|----------------|----------|-------------|---------------|
| `sojove-mleko`  | Sójové mléko   | `dairy`  | `['soy']`   | Mother reaches for milk substitutes under the Dairy tile, but soy allergy still fires |
| `ryzove-mleko`  | Rýžové mléko   | `dairy`  | `[]`        | Plain rice-based dairy sub; no allergen trigger (rice universally safe in elimination diets) |

### 3c. Composite food (multi-trigger, proves the model)

| food id  | Czech name | familyId  | allergenIds             | Notes |
|----------|------------|-----------|-------------------------|-------|
| `hummus` | Hummus     | `legumes` | `['legumes', 'sesame']` | Chickpea (legumes) + tahini (sesame) — warns during *either* elimination |

### 3d. Loose everyday foods per family (representative, non-exhaustive)

These are foods with no allergen trigger — neutral log items that make the family grid useful.

**Grains** (`grains`): `rýže` (rýže, []), `pohanka` (pohanka, []), `ovesné vločky` (oats, []), `proso/jáhly` ([])

**Vegetables** (`vegetables`): `okurka` ([]), `cuketa` ([]), `špenát` ([]), `paprika` ([]), `brokolice` ([]), `mrkev` ([]), `brambory` ([]), `česnek` ([]), `cibule` ([])

**Fruit** (`fruit`): `jablko` ([]), `hruška` ([]), `meruňka` ([]), `broskev` ([]), `hrozny` ([]), `borůvky` ([]), `banán` ([]), `kiwi` ([]), `mango` ([])

**Meat** (`meat`): `kuřecí prsa` ([]), `hovězí` ([]), `vepřová panenka` ([]), `krůtí` ([]), `jehněčí` ([])

**Fish/seafood** (`fish-seafood`): `treska` ([]), `pstruh` ([]), `tuňák` ([]), `sardinky` ([])

**Legumes** (`legumes`): `čočka` ([]), `fazole` ([]), `hrách` ([]), `cizrna` ([], note: also in hummus with no separate allergen)

**Nuts/seeds** (`nuts-seeds`): `vlašský ořech` ([`nuts`]), `mandle` ([`nuts`]), `dýňová semínka` ([]), `lněné semínko` ([]), `slunečnicová semínka` ([`seeds` log-only])

**Sweet** (`sweet`): `med` ([]), `javorový sirup` ([]), `třtinový cukr` ([])

**Spices/condiments** (`spices-condiments`): `sůl` ([]), `kmín` ([]), `skořice` ([]), `pepř` ([]), `ketchup` ([`tomatoes`]), `hořčice` ([`mustard`]), `ocet` ([`vinegar-fermented`])

**Drinks** (`drinks`): `voda` ([]), `bylinný čaj` ([]), `káva` ([`coffee-tea`]), `černý čaj` ([`coffee-tea`])

---

## 4. Homeless Records Resolution

| record id             | → familyId            | Reasoning |
|-----------------------|-----------------------|-----------|
| `mustard`             | `spices-condiments`   | Mustard is a condiment/sauce ingredient; EU-14 allergen status preserved (keeps protocol seam if protocol is added later) |
| `sulphites-additives` | `spices-condiments`   | Additives used in preserved/pickled/prepared foods; placed under condiments as the closest catch-all |
| `vinegar-fermented`   | `spices-condiments`   | Vinegar is a condiment; pickled vegetables are served as condiments/sides |
| `yeast`               | `spices-condiments`   | Baker's yeast appears in bread (under `grains`), but yeast extract is a condiment/sauce ingredient — placed here to avoid polluting `grains` |

---

## 5. Czech Names Checklist

New entities requiring Czech display names:

| entity type | id                  | Czech name           |
|-------------|---------------------|----------------------|
| family      | `grains`            | Obiloviny            |
| family      | `vegetables`        | Zelenina             |
| family      | `fruit`             | Ovoce                |
| family      | `meat`              | Maso                 |
| family      | `fish-seafood`      | Ryby a plody moře    |
| family      | `dairy`             | Mléko                |
| family      | `eggs`              | Vejce                |
| family      | `legumes`           | Luštěniny            |
| family      | `nuts-seeds`        | Ořechy a semínka     |
| family      | `sweet`             | Sladké               |
| family      | `spices-condiments` | Koření, omáčky a droždí |
| family      | `drinks`            | Nápoje a čaje        |
| family      | `custom`            | Vlastní              |

All food names in §3 are already Czech strings.

---

## 6. Acceptance Criteria Verification

- [x] Every current catalog record assigned to exactly one family (35 records → see §2)
- [x] Every food has a family and a (possibly empty) allergen trigger set (§3)
- [x] Food twins specified: `vejce`, `kravske-mleko`, `psenicny-chleb`, `tofu`, `arasisove-maslo`, `sezam`, `tahini`, `jahody`, `rajce`, `kukurice`, `pomeranc`, `cokolada`, `losos`, `krevetky` (§3a)
- [x] Divergent placements specified: `sojove-mleko`, `ryzove-mleko` (§3b)
- [x] At least one composite food: `hummus` (chickpea + sesame) (§3c)
- [x] Homeless records resolved: `mustard`, `sulphites-additives`, `vinegar-fermented`, `yeast` → all `spices-condiments` (§4)
- [x] Czech names for all 13 families (§5)
- [x] **HITL: reviewed and approved by maintainer**

---

## Open questions — resolved

1. **`mushroom` family placement** → `vegetables`. ✅
2. **`coffee-tea` role** → `log-only` allergen, no protocol. ✅
3. **`yeast` placement** → `spices-condiments`. Family display name updated to *"Koření, omáčky a droždí"* to make yeast's presence legible in the UI. ✅
4. **`ryzove-mleko` allergenIds** → empty `[]`; rice is universally safe in elimination diets. ✅
5. **`sojova-smetana`** → dropped; `sojove-mleko` is sufficient for now. ✅
