# Primary sources for an English-market infant allergen catalog

Research for [issue #678](https://github.com/jirigrill/eczema-helper/issues/678). Establishes
what an English-market catalog can safely be **built from**. It does not build the catalog and
does not decide its scope — a later ticket does that.

## Overview

Four things came out of this.

1. **The regulatory allergen lists are settled, short, and easy to cite.** EU and UK mandate 14,
   the US 9, Canada 11 classes plus a separate gluten category, Australia/NZ its own set — and
   every one is retrievable verbatim from the instrument that enacts it. This part of the catalog
   is safe to build from primary sources. Codex is *not* a usable baseline — since its Dec 2024
   revision it omits molluscs and has demoted soy, making it more permissive than any national
   list here (§1.8).
2. **They only cover about a third of what the current catalog calls an "allergen."** The Czech
   catalog carries 38 allergen records; roughly 13 map onto a regulatory list. The other ~25
   (`tomatoes`, `citrus`, `cocoa`, `yeast`, `spices-herbs`, `cabbage-brassica`, `onion-garlic`,
   `mushroom`, `beef`, `chicken`, `coffee-tea`, …) have **no regulatory primary source at all**.
   They are elimination-diet clinical folklore, not labelling law. No authority will supply them.
3. **Infant-specific primary sources exist and are food-level — but they are mostly not about
   allergens.** The NHS "foods to avoid" list is honey/botulism, soft cheese/listeria, rice
   drinks/arsenic, shark/mercury, whole nuts/choking, salt/kidneys. This is a hazard axis the
   catalog does not currently model.
4. **One catalog can serve the international English market; one *allergen list* cannot.** See
   [§5](#5-one-catalog-or-market-variants).

The single largest risk is not a wrong mapping. It is that the catalog's `allergen` concept
silently means two different things — "legally declarable allergen" and "thing a mother might
suspect" — and only one of them has sources.

---

## Verification method

Every claim below carries a URL to the body that owns it and was verified by fetching that
source during this session. Where a source could not be retrieved in this environment it is
marked **UNVERIFIED** rather than asserted. Nothing here rests on model recall.

This matters because the precedent in this repo has already rotted:
[`docs/research/food-allergenicity-tiers.md`](./food-allergenicity-tiers.md) cites
`https://www.fda.gov/food/food-labeling-nutrition/food-allergies` — **that URL now returns
HTTP 404** — and states its FDA facts were "Confirmed via ACAAI," i.e. via a professional-body
secondary source rather than the statute. That document's tier table is defensible; its sourcing
discipline is not what #678 asks for.

---

## 1. The authoritative allergen lists and their exact scope

### 1.1 EU — Regulation (EU) No 1169/2011 (FIC), Annex II

Source: [EUR-Lex, CELEX:32011R1169, Annex II](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011R1169)
(consolidated text also at [CELEX:02011R1169-20180101](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:02011R1169-20180101)).
Retrieved verbatim.

Annex II, "SUBSTANCES OR PRODUCTS CAUSING ALLERGIES OR INTOLERANCES", 14 entries:

| # | Entry (verbatim, abridged at the exemptions) |
|---|---|
| 1 | "Cereals containing gluten, namely: wheat, rye, barley, oats, spelt, kamut or their hybridised strains" — *except* wheat-based glucose syrups/dextrose, wheat-based maltodextrins, barley-based glucose syrups, cereals for alcoholic distillates |
| 2 | Crustaceans |
| 3 | Eggs |
| 4 | Fish — *except* fish gelatine as vitamin/carotenoid carrier; fish gelatine or Isinglass as beer/wine fining agent |
| 5 | Peanuts |
| 6 | Soybeans — *except* fully refined soybean oil and fat, natural mixed tocopherols (E306) etc., soy-derived phytosterols/esters, plant stanol ester |
| 7 | "Milk and products thereof (including lactose)" — *except* whey for alcoholic distillates; lactitol |
| 8 | "Nuts, namely: almonds (*Amygdalus communis* L.), hazelnuts (*Corylus avellana*), walnuts (*Juglans regia*), cashews (*Anacardium occidentale*), pecan nuts (*Carya illinoinensis*), Brazil nuts (*Bertholletia excelsa*), pistachio nuts (*Pistacia vera*), macadamia or Queensland nuts (*Macadamia ternifolia*)" — *except* nuts for alcoholic distillates |
| 9 | Celery |
| 10 | Mustard |
| 11 | Sesame seeds |
| 12 | Sulphur dioxide and sulphites "at concentrations of more than 10 mg/kg or 10 mg/litre … in terms of the total SO₂" |
| 13 | Lupin |
| 14 | Molluscs |

Two details that bite a catalog builder:

- **Item 1 names the cereal species, not "gluten."** Oats are *inside* Annex II item 1. The
  existing `curation-rules.test.ts` asserts oat milk carries no allergens on the stated ground
  that "oats are gluten-free" — under EU law oats are a declarable cereal containing gluten.
  See [§4.3](#43-the-assertions-that-do-not-survive-re-sourcing).
- **Item 8 enumerates exactly 8 tree nuts with binomials.** No pine nut. No coconut. No chestnut.
  A tree nut outside that list is not a declarable EU allergen.

Article 21 governs how these are declared; Article 44 extends allergen disclosure to
non-prepacked food.

### 1.2 US — FD&C Act §201(qq) as amended by FALCPA (2004) and the FASTER Act (2021)

Statutory text: [21 U.S.C. §321(qq)](https://www.law.cornell.edu/uscode/text/21/321) (LII
reproduction of the US Code; the House version at `uscode.house.gov` refused connection from
this environment).

> **(1)** "Milk, egg, fish (e.g., bass, flounder, or cod), Crustacean shellfish (e.g., crab,
> lobster, or shrimp), tree nuts (e.g., almonds, pecans, or walnuts), wheat, peanuts, soybeans,
> and sesame."
> **(2)** any food ingredient containing protein derived from those, *except* "(A) Any highly
> refined oil derived from a food specified in paragraph (1) and any ingredient derived from such
> highly refined oil" and (B) ingredients exempted under §343(w)(6)/(7).

The sesame amendment, verbatim from the compiled statute
([govinfo COMPS-16373, Public Law 117-11](https://www.govinfo.gov/content/pkg/COMPS-16373/pdf/COMPS-16373.pdf)):

> SEC. 2(a) … "Section 201(qq)(1) … is amended by striking ''and soybeans'' and inserting
> ''soybeans, and sesame''."
> SEC. 2(b) EFFECTIVE DATE. — "The amendment made by subsection (a) shall apply to any food that
> is introduced or delivered for introduction into interstate commerce on or after January 1, 2023."

**The list is statutory and FDA cannot change it.** From FDA's own guidance (see §1.3): "FDA
cannot alter the statutory list of the nine major food allergens."

### 1.3 US — FDA guidance that narrows "tree nuts", and defines "milk", "egg", "wheat"

Source: **Questions and Answers Regarding Food Allergens, Including the Food Allergen Labeling
Requirements of the Federal Food, Drug, and Cosmetic Act (Edition 5): Guidance for Industry**,
FDA Human Foods Program, **January 2025**, docket FDA-2022-D-0099.
Landing page: <https://www.fda.gov/food/food-allergensgluten-free-guidance-documents-regulatory-information/frequently-asked-questions-food-allergen-labeling-guidance-industry> ·
PDF: <https://www.fda.gov/media/117410/download>. Retrieved and read in full.

This is the single most catalog-relevant document found. It is non-binding ("Contains Nonbinding
Recommendations") but it is FDA's stated position and it resolves ambiguities that a catalog
must resolve.

**Table 1 — Tree Nuts FDA Considers as Major Food Allergens** (verbatim list):

Almond (*Prunus dulcis*), Black walnut (*Juglans nigra*), Brazil nut (*Bertholletia excelsa*),
California walnut (*Juglans californica*), Cashew (*Anacardium occidentale*), Filbert/Hazelnut
(*Corylus* spp.), Heartnut/Japanese walnut (*Juglans ailantifolia* var. *cordiformis*), Macadamia
nut/Bush nut (*Macadamia* spp.), Pecan (*Carya illinoinensis*), **Pine nut/Pinon nut (*Pinus* spp.)**,
Pistachio (*Pistacia vera*), Walnut, English/Persian (*Juglans regia*).

> Q C.8: "Only the tree nuts listed in Table 1 are considered major food allergens… Because other
> tree nuts that are not listed in Table 1 do not have a robust body of evidence to support
> inclusion as a major food allergen, **they should not be included in the 'Contains' statement**
> even if they are used as ingredients."

**Coconut is not in Table 1.** Neither is chestnut, shea nut, or ginkgo. The existing catalog's
`kokos → allergenIds: []` is therefore *correct under current FDA guidance* — but for a reason the
test comment does not state, and the reason changed in January 2025.

Other definitions this guidance settles, each directly usable as a catalog citation:

| Question | FDA position (verbatim) |
|---|---|
| C.1 "milk" | "milk from domesticated cows, goats, sheep, or other ruminants" — so goat/sheep cheese **is** the milk allergen |
| C.3 "eggs" | "eggs from domesticated chickens, ducks, geese, quail, and other fowl" |
| C.9 "wheat" | "any species in the genus *Triticum*" — incl. spelt, durum, einkorn, emmer, khorasan, semolina, **and triticale** |
| C.5 | §403(w)(2) requires the **specific type of tree nut** and the **species** of fish and Crustacean shellfish — "cannot broadly declare 'tree nuts,' 'fish,' or 'Crustacean shellfish'" |
| B.7 lactose / **ghee** | "Because lactose is a milk sugar and ghee is a milk-derived fat, residual protein from milk is often present in these ingredients. When that is the case, lactose and ghee must be labeled…" — the catalog's `ghi → ['dairy']` is defensible and now citable |
| B.6 | ingredients from an allergen-bearing plant that "do not contain proteins from that major food allergen are not subject to FDA's allergen labeling requirements" — this is the citable basis for refined oils carrying `[]` |
| A.2 | "There are over 160 foods that have been reported to cause allergic reactions in addition to the list of major food allergens" — but their sources need not be declared |

A.2 is the load-bearing sentence for [§2.3](#23-what-no-authority-will-give-you) and
[§4.3](#43-the-assertions-that-do-not-survive-re-sourcing): FDA acknowledges the long tail exists
and declines to enumerate it.

### 1.4 US — FDA's Seafood List (the only *food-level* species authority found)

FDA Q&A C.6 delegates fish/crustacean species naming to **The Seafood List**:
guidance page <https://www.fda.gov/regulatory-information/search-fda-guidance-documents/guidance-industry-seafood-list-fdas-guide-determine-acceptable-seafood-names>,
searchable database <https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=SeafoodList>,
Compliance Policy Guide Sec. 540.750. It supplies acceptable market name, common name and
scientific name per species, updated twice yearly.

This is the one primary source encountered that is genuinely **food-level** and machine-readable.
It settles the `kapr` → *carp* problem and every other fish naming question.

### 1.5 UK — 14, same as the EU

Source: **Food allergy and intolerance: advice for consumers**, Food Standards Agency, published
on GOV.UK, last updated **7 August 2026**, applying to England, Northern Ireland and Wales.
<https://www.gov.uk/government/publications/food-allergy-and-intolerance-advice-for-consumers/food-allergy-and-intolerance-advice-for-consumers>

> "celery, cereals containing gluten (such as wheat, rye, barley and oats), crustaceans (such as
> prawns, crabs and lobsters), eggs, fish, lupin, milk, molluscs (such as mussels and oysters),
> mustard, peanuts, sesame, soybeans, sulphur dioxide and sulphites (at a concentration of more
> than ten parts per million), tree nuts (such as almonds, hazelnuts, walnuts, brazil nuts,
> cashews, pecans, pistachios and macadamia nuts)"

14 allergens, identical in substance to FIC Annex II. The page links the assimilated instrument at
`legislation.gov.uk/eur/2011/1169/contents`. Note the page's own scope line names England, NI and
Wales — **Scotland is administered by Food Standards Scotland**, and Scottish guidance was not
checked. Not expected to diverge on the list itself; flagged as **UNVERIFIED**.

### 1.6 Canada — a third scope, and the only one that splits "allergen" from "gluten"

Source: **Food and Drug Regulations, C.R.C., c. 870, s. B.01.010.1**, current to and last amended
**2026-06-17**, retrieved verbatim from the Justice Laws Website:
<https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._870/section-B.01.010.1.html>

> **food allergen** means any protein from any of the following foods, or any modified protein …
> **(a)** almonds, Brazil nuts, cashews, hazelnuts, macadamia nuts, pecans, **pine nuts**,
> pistachios or walnuts; **(b)** peanuts; **(c)** sesame seeds; **(d)** wheat or **triticale**;
> **(e)** eggs; **(f)** milk; **(g)** soybeans; **(h)** crustaceans; **(i)** molluscs;
> **(j)** fish; or **(k)** mustard seeds.

> **gluten** means (a) any gluten protein from the grain of any of the following cereals … (i)
> barley, (ii) oats, (iii) rye, (iv) triticale, (v) wheat; or from a hybridized strain …

Canada is structurally different from every other jurisdiction here: **barley, oats and rye are
not "food allergens"** — they are *gluten sources*, a parallel declarable category under
B.01.010.1(2). Sulphites are a third parallel category (the "food allergen source, gluten source
and added sulphites statement", total ≥ 10 p.p.m.). **Celery and lupin are absent entirely.**
Tree nuts are 9, i.e. the EU's 8 plus pine nut.

Also worth noting for a catalog builder: B.01.010.1(3) — "Subsection (2) does not apply to a food
allergen or gluten that is present in a prepackaged product **as a result of cross-contamination**."
That is a regulatory endorsement of exactly the modelling choice `curation-rules.test.ts` already
made ("no cross-contamination tag").

### 1.7 Australia / New Zealand — PEAL, in force 25 February 2024

Source: **Food Standards Australia New Zealand, "Allergen labelling for food businesses"**,
<https://www.foodstandards.gov.au/business/labelling/allergen-labelling>, implementing
**Standard 1.2.3 and Schedule 9** of the Australia New Zealand Food Standards Code (Federal
Register of Legislation, Standard 1.2.3: <https://www.legislation.gov.au/F2015L00397/latest/text>
— the register's full instrument text could not be extracted through this environment's fetcher,
so the *required-name table* below is cited to FSANZ's own guidance rather than to the instrument;
marked **PARTIALLY VERIFIED**).

Required names to be declared:

- **Individually named tree nuts (9):** almond, Brazil nut, cashew, hazelnut, macadamia, pecan,
  pistachio, **pine nut**, walnut
- **Individually named gluten cereals:** wheat, barley, oats, rye
- **Crustacean** and **mollusc** declared separately
- egg, milk, **lupin**, peanut, "soy/soya/soybean", sesame, fish
- **sulphites** when added at ≥ 10 mg/kg

Plain English Allergen Labelling came into force **25 February 2024**, with a transition to
25 February 2026. **No celery. No mustard.**

### 1.8 Codex Alimentarius — two-tier since 2024, and now the *narrowest* mandatory list

**CXS 1-1985, General Standard for the Labelling of Prepackaged Foods**, cover marked
**ADOPTED 1985 / AMENDED 2024**, revised "following decisions taken at the Forty-seventh Session
of the Codex Alimentarius Commission in December 2024" (CAC47). Amended sections: 2, 4.2.1.3,
4.2.1.4, 4.2.3, 4.2.3.1, 4.2.4.2, 6, 8.

> **⚠️ Two citation traps, both hit during this research.**
> 1. `https://www.fao.org/input/download/standards/32/CXS_001e.pdf` is a **dead legacy path that
>    still serves the 2010 text** — "Adopted 1985. Amended 1991, 1999, 2001, 2003, 2005, 2008 and
>    2010", with no sesame, no molluscs, an eight-bullet flat list and unenumerated tree nuts. It
>    resolves, returns HTTP 200, and is wrong. Do not cite it.
> 2. The live text on `workspace.fao.org` is Cloudflare-walled and returned HTTP 403 to every
>    plain client used here. The current text below was obtained in a parallel session via a
>    browser with a `cf_clearance` cookie; that cookie is UA- and IP-bound and expires, so **this
>    retrieval is not reproducible from a plain client** and the quotations below could not be
>    independently re-fetched. Treat as verified-once, and re-verify before shipping anything
>    that depends on them.

The 2024 revision replaced the flat global list with a **two-tier, risk-assessment-based model**.
There is no "Table 1"/"Table 2" — those strings do not appear; cite the section numbers.

**§4.2.1.4 — mandatory, "shall always be declared":** wheat (and other *Triticum* spp.), rye (and
other *Secale* spp.), barley (and other *Hordeum* spp.), Crustacea, egg, fish, peanut, milk,
**sesame**, and six tree nuts — almond, cashew, hazelnut, pecan, pistachio, walnut. Spelt,
Khorasan and triticale are covered by a genus footnote rather than enumerated; a hybridised strain
must name all parent genera (triticale → "wheat and rye"). "Gluten" may be used *in addition to*
wheat/rye/barley, not instead of.

**§4.2.1.5 (newly created) — regional/national, adopted on national risk assessment:**
buckwheat, celery, **oats**, lupin, mustard, **soy**, Brazil nut, macadamia, pine nut.

**§4.2.1.7 (moved out on its own):** sulphites ≥ 10 mg/kg, now expressly "measured on a sulphur
dioxide (SO₂) equivalents basis"; declared as "sulphite" or "sulfite".

Four changes matter to anyone tempted to treat Codex as a baseline:

- **Molluscs appear nowhere in the document** — not in 4.2.1.4, not in 4.2.1.5.
- **Soybeans were demoted** from mandatory to regional/national. Every one of EU/UK, US, Canada
  and AU/NZ mandates soy.
- **Oats were demoted** out of the gluten-cereal group, with an explicit coeliac-tolerance rationale.
- **Sesame was newly promoted** to mandatory; tree nuts were narrowed to six, demoting Brazil nut,
  macadamia and pine nut.

The standard cites the FAO/WHO expert consultations in its own footnotes — Part 1 at
[doi:10.4060/cb9070en](https://doi.org/10.4060/cb9070en) and Part 4 at
[doi:10.4060/cc9554en](https://doi.org/10.4060/cc9554en) — which partially closes the §1.9 gap:
Codex's adopted two-tier split *is* the expert consultation's priority list, as enacted.

**Do not use Codex as the catalog's baseline.** As of 2024 it is not a floor at all in the naive
sense — on molluscs and soy it is *more permissive* than every national regime studied. It is a
framework for national risk assessment, and following it would under-label in all four markets.

A precautionary-allergen-labelling ("may contain") annex was separately adopted at the 49th
Session, 6–10 July 2026 —
<https://www.fao.org/newsroom/detail/global-food-safety-standards-body-codex-adopts-new-guidance-on--may-contain--allergen-labels/en>.
Not relevant while the catalog declines to model cross-contamination (§1.6, §4.1).

### 1.9 The scientific opinions behind the lists

**EFSA NDA Panel, "Scientific Opinion on the evaluation of allergenic foods and food ingredients
for labelling purposes", EFSA Journal 2014;12(11):3894**,
<https://www.efsa.europa.eu/en/efsajournal/pub/3894>. Covers cereals containing gluten, milk,
eggs, nuts, peanuts, soy, fish, crustaceans, molluscs, celery, lupin, sesame, mustard, sulphites.
Landing page verified; the full text is behind a Wiley redirect that returned HTTP 402 in this
environment — **body text UNVERIFIED**.

**FAO/WHO Ad hoc Joint Expert Consultation on Risk Assessment of Food Allergens, Part 1: Review
and validation of Codex Alimentarius priority allergen list through risk assessment**, WHO & FAO,
29 March 2022, ISBN 978-92-4-004239-1, 178 pp.
<https://www.who.int/publications/i/item/9789240042391> · DOI 10.4060/cb9070en.
Title, publisher, date and ISBN verified from the WHO landing page. **The report body could not
be retrieved** (TLS handshake failure to `openknowledge.fao.org`, HTTP 000, from this
environment) — so **the exact global priority list it recommends is UNVERIFIED here** and must be
read from the PDF before it is relied on. This is the source that drove the 2023 Codex revision,
so it should be read.

Partly resolved after the fact: **CXS 1-1985 cites both reports in its own footnotes** (Part 1
[doi:10.4060/cb9070en](https://doi.org/10.4060/cb9070en), Part 4
[doi:10.4060/cc9554en](https://doi.org/10.4060/cc9554en)), and the two-tier §4.2.1.4 / §4.2.1.5
split recorded in §1.8 *is* their priority list as adopted. So the substance is now visible even
though the reports themselves were not read.

Further partial corroboration from FAO's own topic page
(<https://www.fao.org/food-safety/scientific-advice/food-allergens/en>): the 2023 threshold work
covered "tree nuts (Brazil nut, macadamia nut or Queensland nut, pine nut), soy, celery, lupin,
mustard, **buckwheat** and **oats**" — buckwheat and oats being outside both the EU 14 and the US 9.

---

## 2. Infant weaning specifically

### 2.1 Legal definitions worth adopting

**Regulation (EU) No 609/2013**, Art. 2(2),
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32013R0609>:

> "(a) 'infant' means a child under the age of 12 months; (b) 'young child' means a child aged
> between one and three years"

**Commission Directive 2006/125/EC** on processed cereal-based foods and baby foods,
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32006L0125>, Art. 7(1):
labelling must carry "(b) information as to the presence or absence of gluten if the indicated age
from which the product may be used is below six months", and "The stated age shall not be less
than four months for any product." This is the *only* infant-specific allergen labelling
obligation found in EU law, and it concerns a single allergen.

**WHO Guideline for complementary feeding of infants and young children 6–23 months of age**, WHO,
16 October 2023, <https://www.who.int/publications/i/item/9789240081864>. Establishes that
complementary feeding "generally starts at age 6 months and continues until 23 months of age."
The landing page does not surface allergen-specific recommendations; **allergen content
UNVERIFIED**.

### 2.2 The one food-level infant source verified here — and what it actually contains

**NHS, "Foods to avoid giving babies and young children"**,
<https://www.nhs.uk/conditions/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/>.
Retrieved. Named foods with age limits and stated reasons:

| Food | Limit | Reason given |
|---|---|---|
| Honey | "Do not give your child honey until they're over 1 year old" | infant botulism |
| Whole nuts and peanuts | "should not be given to children under 5 years old" | **choking**, not allergy — crushed/ground nuts fine from 6 months |
| Mould-ripened soft cheese (brie, camembert), blue-veined cheese, raw unpasteurised cheese | under 1 | listeria |
| Raw / lightly cooked eggs without British Lion mark; duck, goose, quail eggs | must be fully cooked | salmonella |
| Rice drinks | "Children under 5 years old should not have rice drinks" as a milk substitute | arsenic |
| Slush ice drinks | "Children aged 7 years and under" | glycerol |
| Raw shellfish (mussels, clams, oysters) | avoid | food poisoning |
| Shark, swordfish, marlin | "Children under 16 should avoid" | mercury / nervous system development |
| Raw jelly cubes | avoid | choking |
| Salt / sugar / saturated fat | limit | kidneys, tooth decay, general |

**Read this table twice.** It is the most food-level, most infant-specific, most citable source in
this document, and **not one row of it is an allergen hazard.** It is botulism, listeria,
salmonella, arsenic, mercury, glycerol, choking and salt load.

The current catalog has no representation for any of this. It models `honey` as an *allergen* with
`allergenicity: 'moderate'`, and `docs/research/food-allergenicity-tiers.md` admits the fudge in
writing: "Held above `low` as a safety flag: no honey <12 months due to infant botulism
(microbiological, not allergic)." A catalog re-sourced for an infant product needs a **second
axis** — an infant hazard flag with an age threshold and a hazard type — or it will keep
smuggling non-allergen hazards through the allergen field.

### 2.3 What no authority will give you

Cross-checking FDA Q&A A.2 ("over 160 foods … in addition to the list of major food allergens")
against the catalog's 38 allergen records:

**Has a regulatory source (≈13):** `wheat`, `oats`, `eggs`, `fish`, `dairy`, `sesame`, `soy`,
`nuts`, `peanuts`, `shellfish`, `celery`, `mustard`, `sulphites-additives`.

**Has no regulatory source (≈25):** `legumes`, `carrot-root-veg`, `tomatoes`, `exotic-fruit`,
`citrus`, `chicken`, `raspberries`, `strawberries`, `beef`, `cocoa`, `honey`, `spices-herbs`,
`grains`, `seeds`, `fruit`, `cabbage-brassica`, `onion-garlic`, `potato`, `mushroom`,
`other-vegetables`, `meat`, `vinegar-fermented`, `yeast`, `sweeteners`, `coffee-tea`.

Also note **lupin is absent from the catalog entirely**, and the catalog's `shellfish` conflates
crustaceans with molluscs (`musle` → `shellfish`) — a distinction the EU, UK, Canada **and**
Australia/NZ all make, and only the US does not. The catalog is, on this point, modelled to the
one jurisdiction whose list is narrowest.

Two-thirds of the allergen axis is not sourceable from any food-safety authority. This is not a
gap to be filled by better searching; the authorities have declined to enumerate it. It is a
scoping decision for the later ticket, and it is the decision with the liability exposure.

### 2.4 Allergen-introduction guidance — verified

**ASCIA Guideline: Infant Feeding for Food Allergy Prevention — Summary of Recommendations**,
Australasian Society of Clinical Immunology and Allergy, last updated **January 2026**,
<https://www.allergy.org.au/hp/papers/infant-feeding-and-allergy-prevention>. Retrieved.

- Introduce solids "when the infant is showing signs of developmental readiness. This is usually
  around 6 months of age and **not before 4 months of age**."
- Egg and peanut introduced "soon after the infant is developmentally ready and has started solid
  foods"; peanut "in an age-appropriate form such as smooth peanut butter, finely ground peanut or
  peanut flour."
- Introduce "other common food allergens in the first year of life … This includes **cow's milk,
  wheat, tree nuts (such as cashew and walnut), sesame, soy, fish and shellfish**."
- New in the 2026 revision: once introduced without reaction, "the food should continue to be
  offered to the infant **at least once a week**."

This is the closest thing found to an authority-issued, food-level, infant-scoped **allergen** list
— and note it is a list of *eight or nine classes*, not of individual foods. It also introduces a
concept the current catalog has no field for: **ongoing weekly exposure**. If the English product
ever surfaces anything beyond raw records, that concept will matter.

### 2.5 Infant guidance still to be verified

These were identified as the right sources but **could not be retrieved in this environment** and
are recorded as open work, not as findings:

| Source | Why it matters | Status |
|---|---|---|
| **NIAID, Addendum Guidelines for the Prevention of Peanut Allergy in the United States (2017)** — <https://www.niaid.nih.gov/diseases-conditions/guidelines-clinicians-and-patients-food-allergy> | The US early-peanut-introduction guideline. Its risk stratification keys explicitly on **severe eczema** — i.e. exactly this app's user | ❌ `niaid.nih.gov` unreachable (socket closed / HTTP 000) — **UNVERIFIED** |
| **SACN, Feeding in the First Year of Life (2018)**, gov.uk | UK scientific basis for allergenic-food introduction timing | not attempted |
| **Dietary Guidelines for Americans 2020–2025**, birth-to-24-months chapter, dietaryguidelines.gov | US federal position on allergenic foods and foods to avoid | not attempted |
| **CDC infant & toddler nutrition** — food allergies, foods/drinks to avoid | US counterpart to the NHS list in §2.2 | not attempted |
| **Health Canada / Canadian Paediatric Society**, Nutrition for Healthy Term Infants 6–24 months | Canadian allergenic-introduction position | not attempted |
| **NHMRC Infant Feeding Guidelines** (AU) | statutory backing for ASCIA | not attempted |
| **safefood / HSE** weaning guidance (IE) | Irish market | not attempted |

The web-search budget for this session was exhausted before these could be reached. None of them
is expected to change the §5 conclusion — they are allergen-*introduction* guidance, and the
catalog is a record-only vocabulary — but the NIAID addendum should be read before the app makes
any claim near eczema and peanut.

---

## 3. Product-liability framing (why the sourcing discipline exists)

**Directive (EU) 2024/2853 on liability for defective products**,
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202402853>. Retrieved verbatim.

- **Art. 4(1)** — "'product' means all movables … it includes electricity, digital manufacturing
  files, raw materials and **software**".
- **Art. 6(1)(a)** — compensable damage includes "death or personal injury, including medically
  recognised damage to psychological health"; **(c)** "destruction or corruption of data that are
  not used for professional purposes".
- **Art. 7(1)** — "A product shall be considered defective where it does not provide the safety
  that a person is entitled to expect".
- **Art. 7(2)(a)** — defectiveness assessment takes account of "the presentation and the
  characteristics of the product, including its labelling, design, technical features, composition".
- **Art. 7(2)(h)** — "**the specific needs of the group of users for whose use the product is
  intended**".
- **Art. 15** — "Member States shall ensure that the liability of an economic operator pursuant to
  this Directive is not, in relation to the injured person, limited or excluded by a contractual
  provision or by national law."
- **Art. 16(1)** — three-year limitation period running from awareness of damage, defectiveness
  and operator identity.

Art. 7(2)(a) + 7(2)(h) together are why the catalog matters legally: it is *composition and
presentation* of a product whose intended user group is infants. Art. 15 is why a disclaimer does
not help. There is no micro-enterprise or individual-developer carve-out.

---

## 4. Reproducing the `curation-rules.test.ts` discipline

`src/lib/data/allergen-catalog/curation-rules.test.ts` (622 ln) is the artifact #678 asks about.
Here is what it actually is, and what reproducing it costs.

### 4.1 What it does well

It converts curation *rationale* into *executable assertions*, in four distinguishable species:

1. **Precision-biased positive mappings** — "`sójové mléko` carries only soy", "`mléčná čokoláda`
   carries [cocoa, dairy] — no nuts". Pins an exact set, so any later widening breaks a test.
2. **Deliberate absence guards** — the `earned-granularity guard` block asserts that
   `psenicny-chleb`, `rohlik`, `testoviny`, `kefir`, `zmrzlina`, `pizza`, `gulas` … **must not
   exist**. A negative assertion is the only way to encode "we considered this and said no."
3. **Siblings-cohere invariants** — "every food in `fats-oils` has a `sourceGroup` in
   {plant, animal}"; "every vegetable not in the raw-only allow-list offers the cookable set";
   "every drink offers no preparation". These are the rules that scale: they catch a wrong row
   added a year later without anyone having written a test for that row.
4. **Migration guards** — "dairy family no longer contains pure fats", "meat family no longer
   contains `sadlo`". Snapshots of a past refactor.

Structural integrity (id uniqueness, referential integrity of `familyId`/`allergenIds`) is a
separate file, `allergen-catalog.test.ts`, and is genuinely portable — those tests are about the
shape, not the data.

### 4.2 What it is missing, and what that costs to add

**There is no citation anywhere in the data.** `FoodRecord` is:

```ts
type FoodRecord = {
  id: string;
  familyId: FamilyId;
  allergenIds: readonly CatalogAllergenId[];
  preparations: readonly PreparationMethod[];
  aliases?: readonly string[];
  sourceGroup?: string;
};
```

No source field. No date. No reviewer. The rationale lives in **TypeScript comments and test
titles** — prose that no tool can check, that does not travel to Swift, and that cannot be audited
by a reviewer signing off on 160 rows. Where a source *is* named, it is named in a comment
(`// ADR-0019 + #319 follow-up`) pointing at an internal issue, not at an authority.

The ticket asks for "cited sources per mapping, not model recall." Under the current record shape
that is **not expressible**. Reproducing the discipline therefore requires, concretely:

1. **A citation field on the record type** — minimally `{ authority, url, retrieved }`, required
   on every non-empty `allergenIds`, and required on every deliberate `[]` that a reader would
   find surprising (refined oils, coconut, carob, oat milk). Make it a compile-time requirement,
   not a convention; the `satisfies readonly FoodRecord[]` pattern already in the file will
   enforce it for free.
2. **A structural test that every allergenId mapping resolves to a citation**, and a test that
   every cited URL belongs to an allow-list of authority domains (`eur-lex.europa.eu`,
   `fda.gov`, `gov.uk`, `nhs.uk`, `who.int`, `inspection.canada.ca`, `foodstandards.gov.au`, …).
   That single test is what converts "agent-generated" into "agent-generated and auditable" and
   is the cheapest high-value addition in this whole document.
3. **Retention of all four assertion species above** — in particular the *absence guards*, which
   are the least obvious and the most valuable. Re-sourcing means the forbidden-id list must be
   re-derived in English (`white-bread`, `pasta`, `granola`, `pizza`, …) rather than translated.
4. **A dated review record.** Per the pinned handoff, a human sign-off gate is required before
   release regardless of authorship. A `reviewedBy`/`reviewedAt` on the catalog module, asserted
   non-stale by a test, is the mechanism.

Note the id→string coupling already works in the catalog's favour: `src/lib/strings/families.ts`
keys `foodStrings` off `CatalogFoodId`, so any id change is a compile error rather than a silent
drift. That property must survive the port.

### 4.3 The assertions that do not survive re-sourcing

Re-sourcing is not translation, and three existing assertions are wrong or unsourceable once you
check them against the authorities above:

- **`ovesne-mleko` carries no allergens "because oats are gluten-free."** Under EU FIC Annex II
  item 1 and the UK 14, **oats are a named cereal containing gluten** and are declarable. Under
  the US 9 they are not an allergen at all. The current assertion is right for the US, wrong for
  the EU/UK, and its stated *reason* is wrong everywhere. The catalog also carries a separate
  tracked `oats` allergen, so the two encodings already disagree with each other.
- **`obilna-kava` (Caro/Melta) carries [wheat].** The mapping is sound; the food is a
  Central-European product with no English-market equivalent. Its English replacement (barley
  cup / roasted grain beverage) needs its own re-derivation, and barley is item 1 of Annex II
  while being invisible to the US 9.
- **`kokos` carries no allergens.** Correct — but only citable as of the **January 2025** FDA
  Edition-5 guidance, where coconut is absent from Table 1. It was previously treated as a tree
  nut. Any assertion of this kind needs the *date* of the guidance, not just the fact.

The general lesson: several assertions in the file are true, sourceable, and *jurisdiction-specific
without saying so*. That is the exact failure mode an English-first international release walks
into.

### 4.4 Count discrepancy

#678 describes the catalog as "13 families / 27 allergens / 198 foods". Measured in
`allergen-catalog.ts` at this commit: **13 families, 38 allergen records (22 of them
ladder-bearing, i.e. carrying `ladder` + `allergenOrder`), 160 foods.** Neither the "27" nor the
"198" figure corresponds to any count in the file. Worth reconciling before the scoping ticket
sizes the work.

---

## 5. One catalog, or market variants?

**One catalog. Not one allergen list.**

The food identities are overwhelmingly shared — an apple is an apple in Sydney, Toronto and
Manchester. The Central-European tail (`brynza`, `obilná káva`, `kapr`) is small and is being
re-sourced away regardless. Splitting the *food* catalog per market would multiply maintenance
for almost no divergence, and would fragment the `FoodId` space that strings, tests and the
future SwiftData schema all key off.

What is genuinely irreconcilable is the **food → declarable-allergen mapping**, because the
authorities disagree on scope in ways that are not reconcilable by taking a union or an
intersection:

| | EU / UK / IE (14) | US (9) | Canada | AU / NZ | Codex 2024 |
|---|---|---|---|---|---|
| Wheat / *Triticum* | ● | ● | ● (+ triticale) | ● | ● |
| Rye | ● | ○ | ◐ gluten source | ● | ● |
| Barley | ● | ○ | ◐ gluten source | ● | ● |
| **Oats** | ● | ○ | ◐ gluten source | ● | **◑ 4.2.1.5** |
| Crustaceans | ● | ● | ● | ● | ● |
| **Molluscs** | ● | ○ | ● | ● | **○ absent entirely** |
| Eggs | ● | ● | ● | ● | ● |
| Fish | ● | ● | ● | ● | ● |
| Peanuts | ● | ● | ● | ● | ● |
| **Soybeans** | ● | ● | ● | ● | **◑ 4.2.1.5** |
| Milk | ● | ● | ● | ● | ● |
| Tree nuts | ● 8 spp. | ● 12 entries, binomials | ● 9 spp. incl. pine nut | ● 9 spp., named individually | ● **6 mandatory**; Brazil / macadamia / pine ◑ |
| **Sesame** | ● | ● (1 Jan 2023) | ● | ● | ● **new in 2024** |
| **Celery** | ● | ○ | ○ | ○ | ◑ 4.2.1.5 |
| **Mustard** | ● | ○ | ● | ○ | ◑ 4.2.1.5 |
| **Lupin** | ● | ○ | ○ | ● | ◑ 4.2.1.5 |
| **Sulphites** | ● > 10 mg/kg | ○ | ◐ ≥ 10 p.p.m., own category | ● ≥ 10 mg/kg | ● ≥ 10 mg/kg SO₂-eq (4.2.1.7) |
| **Buckwheat** | ○ | ○ | ○ | ○ | **◑ 4.2.1.5** |
| **Pine nut** | ○ | ● | ● | ● | ◑ |
| **Coconut** | ○ | ○ (excluded from Table 1, Jan 2025) | ○ | ○ | ○ |

● mandated · ◑ Codex regional/national tier (§4.2.1.5) · ◐ mandated by a *separate legal route* ·
○ not mandated

Read across any row and the point makes itself:

- An **intersection** drops celery, mustard, lupin, sulphites, molluscs and every gluten cereal
  but wheat. Unsafe for EU/UK users.
- A **union** tells a US user that celery and sulphites are regulated allergens, which is false,
  and dilutes the signal for everyone.
- Neither resolves **Canada**, where "barley is a declarable gluten source but not a food
  allergen" is a distinction with no counterpart in any other regime.
- Neither resolves **Codex**, which since 2024 is not a floor at all: it omits molluscs entirely
  and has demoted soy — so it is *more permissive* than the US on two counts.
- **Pine nut** alone splits the English markets 3–1: mandated in the US, Canada and AU/NZ,
  absent from the EU/UK list of eight.

**The workable shape** is one food catalog plus a per-allergen *jurisdictional applicability*
field — each tracked allergen declares which lists recognise it (`euUk14`, `us9`, `ca`, `anz`,
`none`), and the UI filters or annotates by the user's market. That keeps a single
`FoodId` space and a single set of curation tests, and it makes the disagreements explicit in
data rather than hidden in a curator's head. It also gives the ~25 non-regulatory allergens an
honest home: they carry `none`, and the app can say so.

That is a scoping recommendation for the later ticket, not a decision made here.

---

## 6. Source register

Everything cited above, with what it is good for. **Tier** is the trust level: *law* = binding
instrument; *authority guidance* = non-binding but stated position of the regulator; *scientific
opinion* = advisory body.

| Source | Body | Date | Tier | Use for | Verified |
|---|---|---|---|---|---|
| [Reg. (EU) No 1169/2011 Annex II](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32011R1169) | EU | 2011, consol. 2018 | law | the EU/UK 14, with botanical names and exemptions | ✅ verbatim |
| [21 U.S.C. §321(qq)](https://www.law.cornell.edu/uscode/text/21/321) | US Congress | as amended 2021 | law | the US 9 + refined-oil exclusion | ✅ verbatim |
| [FASTER Act, PL 117-11 (COMPS-16373)](https://www.govinfo.gov/content/pkg/COMPS-16373/pdf/COMPS-16373.pdf) | US Congress | 23 Apr 2021 | law | sesame amendment + 1 Jan 2023 effective date | ✅ verbatim |
| [FDA Allergen Q&A, Edition 5](https://www.fda.gov/media/117410/download) | FDA | Jan 2025 | authority guidance | **tree-nut Table 1**, definitions of milk/egg/wheat, ghee, refined oils, "over 160 foods" | ✅ full read |
| [The Seafood List](https://www.hfpappexternal.fda.gov/scripts/fdcc/index.cfm?set=SeafoodList) | FDA | updated 2×/yr | authority guidance | fish & crustacean **species-level naming** | ✅ |
| [FSA allergen advice for consumers](https://www.gov.uk/government/publications/food-allergy-and-intolerance-advice-for-consumers/food-allergy-and-intolerance-advice-for-consumers) | FSA / GOV.UK | upd. 7 Aug 2026 | authority guidance | UK 14 (England, NI, Wales) | ✅ verbatim |
| [NHS foods to avoid](https://www.nhs.uk/conditions/baby/weaning-and-feeding/foods-to-avoid-giving-babies-and-young-children/) | NHS | — | authority guidance | **food-level infant hazard list** with ages | ✅ full read |
| [Reg. (EU) No 609/2013](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32013R0609) | EU | 2013 | law | legal definitions of "infant" / "young child" | ✅ verbatim |
| [Dir. 2006/125/EC](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32006L0125) | EU | 2006 | law | the only infant-specific allergen labelling rule (gluten, <6 mo) | ✅ verbatim |
| [WHO complementary feeding guideline](https://www.who.int/publications/i/item/9789240081864) | WHO | 16 Oct 2023 | scientific opinion | 6–23 month window | ⚠️ allergen content UNVERIFIED |
| [Dir. (EU) 2024/2853 (PLD)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202402853) | EU | 2024 | law | Art. 4(1), 6, 7(2)(a)+(h), 15, 16 | ✅ verbatim |
| [EFSA Opinion 2014;12(11):3894](https://www.efsa.europa.eu/en/efsajournal/pub/3894) | EFSA NDA Panel | 2014 | scientific opinion | evidence behind the EU 14 | ⚠️ body UNVERIFIED (HTTP 402) |
| [FAO/WHO Risk Assessment of Food Allergens Pt 1](https://www.who.int/publications/i/item/9789240042391) | FAO + WHO | 29 Mar 2022 | scientific opinion | global priority allergen list; drove the Codex revision | ⚠️ body UNVERIFIED (network) |
| [EFSA FoodEx2 rev. 2](https://www.efsa.europa.eu/en/supporting/pub/en-804) | EFSA | — | reference taxonomy | a ready-made hierarchical **food identity** vocabulary, 7 exposure levels | ✅ landing page |
| [USDA FoodData Central](https://fdc.nal.usda.gov/data-documentation/) | USDA | — | data set | food identities; Branded Foods is **manufacturer-label derived**, not authority-curated | ⚠️ allergen fields UNVERIFIED |
| [Food and Drug Regulations s. B.01.010.1](https://laws-lois.justice.gc.ca/eng/regulations/C.R.C.,_c._870/section-B.01.010.1.html) | Canada (Justice Laws) | amended 17 Jun 2026 | law | Canadian allergen list; allergen/gluten/sulphite split; cross-contamination carve-out | ✅ verbatim |
| [FSANZ allergen labelling](https://www.foodstandards.gov.au/business/labelling/allergen-labelling) | FSANZ | PEAL in force 25 Feb 2024 | authority guidance | ANZ required names | ✅ (instrument text ⚠️) |
| [Std 1.2.3, Federal Register of Legislation](https://www.legislation.gov.au/F2015L00397/latest/text) | Australia | — | law | the ANZ instrument itself | ⚠️ text not extractable here |
| Codex **CXS 1-1985** §§4.2.1.4 / 4.2.1.5 / 4.2.1.7 — live text on `workspace.fao.org` | Codex (FAO/WHO) | amended **Dec 2024 (CAC47)** | law (int'l framework) | two-tier allergen model | ⚠️ verified once via a browser session; **not reproducible from a plain client** (403) |
| ~~`fao.org/input/download/standards/32/CXS_001e.pdf`~~ | — | serves the **2010** text | — | **DO NOT CITE** — live dead-legacy path, returns 200 with superseded content | ❌ trap |
| [ASCIA Infant Feeding for Food Allergy Prevention](https://www.allergy.org.au/hp/papers/infant-feeding-and-allergy-prevention) | ASCIA | Jan 2026 | professional guideline | infant allergen introduction, named classes, weekly re-exposure | ✅ |
| [NIAID peanut allergy prevention addendum](https://www.niaid.nih.gov/diseases-conditions/guidelines-clinicians-and-patients-food-allergy) | NIAID / NIH | 2017 | professional guideline | **risk-stratifies on severe eczema** | ❌ UNREACHABLE — UNVERIFIED |

### Sources deliberately not used

- **ACAAI, Allergy UK, Mayo Clinic** — used by `food-allergenicity-tiers.md`. Professional bodies
  and clinics, not primary. Fine for orientation, not for a mapping that carries PLD exposure.
- **Open Food Facts, allergen aggregator sites, nutrition apps** — crowd- or vendor-sourced.
- Any secondary write-up of the 14/9 lists. Every list in this document was taken from the
  instrument or the regulator, and the two places where that failed are labelled UNVERIFIED.

---

## 7. What this does *not* decide

Per #678, this establishes what the catalog can be built **from**. It does not:

- decide the catalog's scope, size, or family structure;
- decide whether the ~25 non-regulatory allergens survive the port;
- decide the jurisdictional-applicability field proposed in §5 — that is a recommendation;
- constitute legal advice.

**Before the catalog is built**, these need closing — all failed on network access here, not on
availability:

1. **NIAID peanut allergy prevention addendum (2017)** — §2.5. It risk-stratifies on severe
   eczema, which is this app's entire user population.
2. **Codex CXS 1-1985 current text** — §1.8 is verified-once through a browser session that
   cannot be reproduced from a plain client. Re-fetch before relying on it.
3. **FAO/WHO Risk Assessment of Food Allergens Part 1** ([doi:10.4060/cb9070en](https://doi.org/10.4060/cb9070en))
   and **Part 4** ([doi:10.4060/cc9554en](https://doi.org/10.4060/cc9554en)) — cited by Codex
   itself; the adopted two-tier split in §1.8 is these reports as enacted, so reading them is now
   lower priority but still the primary evidence base.
4. **FSANZ Schedule 9** legal text — §1.7 cites the regulator's guidance, not the instrument.
5. **The remaining infant-feeding guidance** in §2.5 (SACN, DGA 2020–2025, CDC, Health Canada,
   NHMRC, safefood).
