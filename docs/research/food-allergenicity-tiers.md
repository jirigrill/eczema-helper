# Food allergenicity tiers — evidence base for the `allergenicity` field

Research backing the `allergenicity` values authored on ladder-bearing allergens
in `src/lib/data/allergen-catalog/allergen-catalog.ts` (issue #499). Consumed by
the adaptation-window decision in [ADR-0023 §6](../adr/0023-dose-escalation-ladder.md).

## What the tier decides (and what it does not)

The engine uses `allergenicity` for **one** decision: on a *mild, sub-threshold,
first-contact* skin flare, is the food eligible for a **decelerated-continuation /
adaptation window** (keep dosing flat, watch the trajectory) or does it route
**straight to the reaction path** (treat the flare as a probable reaction)?

- `low` → eligible for the adaptation window. A mild flare may be benign
  adaptation.
- `moderate` / `high` → not eligible; a flare is treated as a probable reaction.

**Only the `low` boundary is behaviorally load-bearing today.** `moderate` vs
`high` is currently cosmetic (no engine reads the difference) but is graded by
recognized major-allergen status so it stays defensible if a second boundary is
added later.

This is a **curator-tunable placeholder**, not a clinical certification. The goal
is a defensible tier per food, grounded in the sources below.

## The governing principle

A food is **not `low`** if it is a *recognized major allergen* (regulatory
priority list) or carries *meaningful anaphylaxis risk*. A food is a candidate
for `low` when reactions to it are typically **non-IgE, mild, local, or
non-immune** (oral allergy syndrome / pollen-food cross-reactivity, or
histamine/vasoactive-amine intolerance) rather than true systemic food allergy —
i.e. exactly the case where a transient first-contact flare is plausibly benign.

## Sources

- **US FDA — major food allergens (FALCPA + FASTER Act).** The "big 9": milk,
  eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat, soybeans, and
  **sesame** (9th, effective 1 Jan 2023). ~90% of reactions.
  Confirmed via ACAAI (below); FDA source:
  <https://www.fda.gov/food/food-labeling-nutrition/food-allergies>
- **EU Regulation 1169/2011 Annex II — 14 declarable allergens.** The big-9
  set plus **celery, mustard, lupin, sulphur dioxide/sulphites, and molluscs**
  (the EU list splits crustaceans and molluscs and adds celery/mustard/lupin).
  <https://food.ec.europa.eu/food-safety/labelling-and-nutrition/food-information-consumers-legislation/allergens_en>
- **ACAAI — food allergy overview.** "Eight foods cause about 90% of reactions:
  eggs, milk/dairy, peanuts, tree nuts, fish, shellfish, wheat, and soy. Sesame
  is the 9th … effective January 1, 2023." Childhood allergy dominated by milk,
  egg, peanut; **peanut and tree nut allergies are likely to persist**. Oral
  allergy syndrome is "not a food allergy … This is a pollen allergy";
  reactions are "generally mild and short-lived" because the cross-reacting
  allergens are quickly digested and destroyed by cooking.
  <https://acaai.org/allergies/allergic-conditions/food/>
- **Allergy UK — histamine intolerance.** Tomatoes, strawberries,
  oranges/tangerines (citrus), and chocolate are listed among foods high in
  **vasoactive amines**; the condition "is not a true allergy, but the symptoms
  can feel very similar" (DAO-mediated, non-immune).
  <https://www.allergyuk.org/resources/histamine-intolerance/>
- **Infant botulism / honey (separate hazard).** No honey before 12 months —
  this is *infant botulism* from *Clostridium botulinum* spores, a
  microbiological hazard, **not allergenicity**. CDC / Mayo Clinic consensus.
  <https://www.mayoclinic.org/healthy-lifestyle/infant-and-toddler-health/expert-answers/botulism/faq-20058500>

## Per-food tiers

### High — recognized major allergens / meaningful anaphylaxis risk

| Food | Tier | Basis |
|---|---|---|
| `dairy` (cow's milk) | high | FDA big-9 + EU Annex II. One of the top-3 childhood allergens (ACAAI). |
| `eggs` | high | FDA big-9 + EU Annex II. Top-3 childhood allergen (ACAAI). |
| `wheat` | high | FDA big-9; EU Annex II (cereals containing gluten). |
| `soy` | high | FDA big-9 + EU Annex II. |
| `fish` | high | FDA big-9 + EU Annex II. Persistent, anaphylaxis-associated. |
| `shellfish` | high | FDA big-9 (crustaceans) + EU Annex II (crustaceans **and** molluscs). Persistent, high anaphylaxis risk. |
| `peanuts` | high | FDA big-9 + EU Annex II. **Likely to persist** (ACAAI); leading anaphylaxis cause. |
| `nuts` (tree nuts) | high | FDA big-9 + EU Annex II. **Likely to persist** (ACAAI). |
| `sesame` | high | FDA 9th major allergen (2023) + EU Annex II. |

### Low — typically non-IgE / mild, or not major allergens

| Food | Tier | Basis |
|---|---|---|
| `legumes` (non-soy: lentils/chickpeas/beans/peas) | low | Not on the FDA big-9 or EU Annex II (lupin is the only listed legume; soy is separate). True IgE allergy uncommon in this population. |
| `carrot-root-veg` | low | Not a major allergen. Carrot is a classic **OAS/pollen-food** trigger — reactions "generally mild and short-lived," destroyed by cooking (ACAAI). **Borderline** (see below). |
| `oats` | low | Not on the big-9/Annex II (distinct from wheat; gluten cross-contamination is a labelling, not allergenicity, concern). **Borderline** (see below). |
| `chicken` | low | Not a major allergen; poultry allergy is rare. Source protocol dose ladder starts unrestricted. |
| `beef` | low | Not on the big-9/Annex II. (Alpha-gal/tick-associated red-meat allergy exists but is uncommon and out of this population's scope.) Source ladder starts unrestricted. |

### Moderate — occasional / non-immune triggers, not major allergens

| Food | Tier | Basis |
|---|---|---|
| `citrus` | moderate | Not a major allergen; **vasoactive-amine/histamine** trigger, "not a true allergy" (Allergy UK). |
| `tomatoes` | moderate | Not a major allergen; vasoactive-amine trigger (Allergy UK). |
| `strawberries` | moderate | Not a major allergen; vasoactive-amine trigger (Allergy UK). |
| `raspberries` (currants/blackberries) | moderate | Not a major allergen; berry group, occasional non-immune reactions. |
| `exotic-fruit` (banana/mango/kiwi) | moderate | Not major allergens, but **kiwi and banana are recognized OAS + latex-fruit cross-reactors** and can cause more-than-trivial reactions in some children — kept above `low` as the conservative call. |
| `cocoa` | moderate | Not a major allergen; chocolate is a vasoactive-amine trigger (Allergy UK). |
| `honey` | moderate | Not a recognized allergen tier concern. **Held above `low` as a safety flag: no honey <12 months due to infant botulism** (microbiological, not allergic). |
| `spices-herbs` | moderate | Mostly not major allergens (mustard/celery are the EU-listed exceptions and are handled as separate log-only allergens). Occasional triggers; kept above `low`. |

## Borderline calls (the `low`/not-`low` boundary — the only one with teeth)

- **`carrot-root-veg` → low.** Carrot is one of the most-cited OAS triggers.
  OAS reactions are typically mild, local, and heat-labile (ACAAI), which fits
  the adaptation-window rationale — a mild first-contact flare is plausibly
  benign. A cautious curator could raise it to `moderate`; the evidence supports
  `low` but it is not clear-cut.
- **`oats` → low.** Oats are not a major allergen and are distinct from wheat.
  The real-world caveat is gluten **cross-contamination**, which is a labelling
  issue, not an intrinsic allergenicity of oats. `low` is defensible; a curator
  worried about contaminated supply could raise it.
- **`exotic-fruit` (kiwi/banana) → moderate, not low.** Deliberately kept out of
  `low` despite being "just fruit": kiwi and banana are established OAS +
  latex-fruit-syndrome cross-reactors with a non-trivial share of systemic
  reactions, so treating a flare as a probable reaction is the safer default.

## Reconciliation with the current catalog values (pre-research)

The research **confirms every current value.** The pre-research placeholders were
set from general allergy knowledge; grounding them in the regulatory lists and
clinical literature above changed nothing:

- `high`: dairy, eggs, wheat, soy, fish, shellfish, peanuts, nuts, sesame — all
  FDA big-9 / EU Annex II. ✅
- `low`: legumes, carrot-root-veg, oats, chicken, beef — none are major
  allergens; reactions are typically mild/non-IgE or rare. ✅ (carrot, oats
  flagged borderline above.)
- `moderate`: citrus, tomatoes, strawberries, raspberries, exotic-fruit, cocoa,
  honey, spices-herbs — occasional / vasoactive-amine / OAS triggers, none major
  allergens. ✅

No catalog changes are required. This document records the evidence so the values
are no longer bare placeholders.
