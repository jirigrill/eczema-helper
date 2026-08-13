# Professional indemnity / product liability insurance for a health-adjacent app shipped from CZ

Research for [issue #681](https://github.com/jirigrill/eczema-helper/issues/681). Context: the
settled position recorded in the [PWA → iOS handoff](https://github.com/jirigrill/eczema-helper/issues/672)
is *professional indemnity insurance*, with the owner having declined to form an s.r.o. and
proceeding as an **individual developer**, shipping a **paid** iOS app **internationally** that
records an infant's eczema and carries an **agent-generated allergen catalog**.

> **This is neither legal nor financial advice.** It is a documentation exercise against primary
> sources. Nothing here has been reviewed by a Czech advokát, a licensed insurance intermediary,
> or a tax adviser. Every figure marked *estimate* is an estimate. Before acting, take advice.

**Confidence convention used throughout:** *Verified* = quoted from the insurer's own PDF or the
statute text. *Secondary* = a broker, law firm, or press write-up, not the owning source.
*Unverified* = could not be obtained; stated as an open question, never as a fact.

---

## Overview

The short version, and it is not the answer the settled position assumes.

1. **The product the owner intends to buy does not match the risk the app creates.** Professional
   indemnity (PI) / tech E&O indemnifies *a client's financial loss from negligent professional
   services*. A paid B2C App Store sale has no professional-services client. The realistic claim
   from a wrong allergen mapping is a **consumer bodily-injury / defective-product claim** — which
   PI wordings classically *exclude*, verbatim, and which PLD (EU) 2024/2853 turns into
   **strict liability** from 9 Dec 2026.
2. **Czech general liability is worse than useless here, because software is not a "výrobek".**
   Eight of nine Czech liability wordings examined define *výrobek* as a *tangible movable thing*
   and several exclude software **by name**. Buying "pojištění odpovědnosti za újmu způsobenou
   vadou výrobku" from most Czech insurers would buy cover that cannot respond to a software
   defect at all.
3. **Exactly one Czech wording found solves both problems.** ČSOB Pojišťovna's
   *Pojištění odpovědnosti … v souvislosti s poskytováním IT služeb* (**VPP OIT 2020**) says
   „výrobkem se pro účely tohoto pojištění rozumí i **software**" and is written with
   **worldwide territory including the USA and Canada**. It is the only domestic product located
   that does both.
4. **Whether any of them will write it for a natural person is unresolved — and it is the
   question that matters.** No insurer's published wording found says "no natural persons", but
   no Czech insurer publishes eligibility either, the one proposal form obtained (Colonnade) is
   drafted around a company, and the two products *shaped* for digital health (Beazley Virtual
   Care, CFC eHealth) are for **UK-based digital healthcare companies**. **This has to be asked in
   writing, and if the answer is "legal entity only", it reopens the s.r.o. question the owner
   declined.** See [§5](#5-can-a-natural-person-actually-buy-this--the-open-question).
5. **A large, load-bearing part of this exposure is uninsurable by law**, not by underwriting
   appetite. See [§6](#6-what-is-uninsurable-regardless).

---

## 1. The legal exposure the insurance has to answer

### 1.1 PLD (EU) 2024/2853 — software is a product, strictly

Verified from the [directive text](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202402853):

- **Art. 4(1)** — "'product' means all movables … it includes electricity, digital manufacturing
  files, raw materials **and software**."
- **Art. 6(1)** — compensable damage is (a) death or personal injury including medically
  recognised psychological harm; (b) damage to property **except the defective product itself**
  and except property used exclusively for professional purposes; (c) **"destruction or corruption
  of data that are not used for professional purposes"**.
- **Art. 5(1)** — "any natural person who suffers damage caused by a defective product … is
  entitled to compensation."
- **Art. 8(1)** — the **manufacturer** is liable. A software developer is the manufacturer.
- **Art. 11(2)** — the standard exemptions (defect arose later, state of the art) **do not apply**
  where the defectiveness is due to software or a related service **within the manufacturer's
  control**, or to failure to supply security updates.
- **Art. 15** — "Member States shall ensure that the liability of an economic operator pursuant
  to this Directive is not, in relation to the injured person, limited or excluded by a
  contractual provision or by national law." **No cap, no disclaimer, no EULA.**
- **Art. 16 / 17** — 3-year limitation from knowledge; **10-year longstop** from placing on
  market, extended to **25 years** for slowly-emerging personal injury.
- **Art. 2(2)** — the free-and-open-source carve-out applies only to software supplied
  "outside the course of a commercial activity". **A paid App Store app is inside commercial
  activity. This shelter is unavailable.**

There is **no micro-enterprise and no natural-person exemption anywhere in the directive.**

**Czech transposition — verified from the ministry itself.**
[MPO](https://mpo.gov.cz/cz/rozcestnik/ministerstvo/aplikace-zakona-c-106-1999-sb/informace-zverejnovane-podle-paragrafu-5-odstavec-3-zakona/transpozice-smernice-evropskeho-parlamentu-a-rady-eu-2024-2853-z-23--rijna-2024--289757/):
„Transpozice směrnice bude provedena prostřednictvím **novely zákona č. 89/2012 Sb., občanský
zákoník**" — *transposition will be effected through an amendment to the Civil Code* — draft to
government by 31 March 2026, in force by 9 December 2026. Secondary reporting
([PwC CZ](https://www.pwc.com/cz/cs/blog/pravo/digitalni-revoluce-v-odpovednosti-za-vyrobky.html),
403 on fetch; via search index) says the bill went to government on 23 Dec 2025 — **the two dates
conflict; MPO's own page is the one cited here.**

So the target is **§ 2939 ff. OZ**, today reading:

> § 2939(1) „Škodu způsobenou vadou **movité věci** určené k uvedení na trh jako výrobek … nahradí
> ten, kdo výrobek nebo jeho součást vyrobil …"
> § 2941(1) „Výrobek je … vadný, není-li tak bezpečný, jak to od něho lze rozumně očekávat …"
> § 2939(3) — property damage compensable only above ~EUR 500.
> ([zakonyprolidi.cz](https://www.zakonyprolidi.cz/cs/2012-89), current text also mirrored at
> [podnikatel.cz](https://www.podnikatel.cz/zakony/novy-obcansky-zakonik/f4588264/))

*Damage caused by a defect in a **movable thing** intended to be placed on the market as a product
shall be compensated by the person who manufactured it.* Today software arguably falls outside
"movitá věc". **After transposition it will not.**

### 1.2 The disclaimer is not a shield — § 2896 and § 2898 OZ

Verified verbatim from [zakonyprolidi.cz](https://www.zakonyprolidi.cz/cs/2012-89):

> **§ 2896** „Oznámí-li někdo, že svoji povinnost k náhradě újmy vůči jiným osobám vylučuje nebo
> omezuje, **nepřihlíží se k tomu**. Učiní-li to však ještě před vznikem újmy, může být takové
> oznámení posouzeno jako **varování před nebezpečím**."
>
> **§ 2898** „**Nepřihlíží se k ujednání, které předem vylučuje nebo omezuje povinnost k náhradě
> újmy způsobené člověku na jeho přirozených právech**, anebo způsobené úmyslně nebo z hrubé
> nedbalosti; nepřihlíží se ani k ujednání, které předem vylučuje nebo omezuje právo slabší strany
> na náhradu jakékoli újmy. **V těchto případech se práva na náhradu nelze ani platně vzdát.**"

*§ 2896: a unilateral notice excluding liability is disregarded — at best it counts as a warning
of danger. § 2898: an advance agreement excluding liability for harm to a person's natural rights,
or caused intentionally or by gross negligence, is disregarded; so is any advance exclusion of the
weaker party's right to compensation. In those cases the right cannot validly be waived either.*

A consumer is the weaker party. An infant's health is a natural right. **The wellness disclaimer
in the App Store listing has evidential value as a warning; it has no liability-limiting effect.**

### 1.3 Unlimited personal liability, and what an s.r.o. would and would not change

Nothing in Czech law limits a natural person's liability for damage they cause; the estate answers.
The contrast, verified from [zák. č. 90/2012 Sb.](https://www.zakonyprolidi.cz/cs/2012-90):

> **ZOK § 132(1)** „Společnost s ručením omezeným je společnost, za jejíž dluhy **ručí společníci
> společně a nerozdílně do výše, v jaké nesplnili vkladové povinnosti** podle stavu zapsaného
> v obchodním rejstříku …"

*Members guarantee the company's debts only up to the amount of unpaid capital contributions.*
Contribute the capital in full and member liability is, on the face of the statute, nil.

But it is not a clean shield, and the counterweights are also statutory:

> **OZ § 159(1)** „Kdo přijme funkci člena voleného orgánu, zavazuje se, že ji bude vykonávat
> s nezbytnou loajalitou i s potřebnými znalostmi a pečlivostí."
>
> **ZOK § 53(2)** „K právním jednáním obchodní korporace omezujícím odpovědnost člena jejího
> voleného orgánu **se nepřihlíží**."

*A director owes loyalty, knowledge and care; and any act of the company purporting to limit a
director's liability is disregarded.* A one-person s.r.o. means the owner is also the jednatel.

**Two further facts that cut against assuming an s.r.o. solves this**, both from primary text
already cited: PLD Art. 8(1) attaches liability to the **manufacturer** — if the s.r.o. is the
manufacturer it is the s.r.o.'s liability, but if the natural person authored and placed the
product they remain exposed on the facts; and PLD **Art. 15** forbids limiting that liability
towards the injured person by contract or national law.

**This section is assembled as facts. It deliberately makes no recommendation.**

### 1.4 App Store 5.1.1(ix) — verified current text

Fetched from
[developer.apple.com](https://developer.apple.com/app-store/review/guidelines/):

> "**(ix)** Apps that provide services in highly regulated fields (such as banking and financial
> services, healthcare, gambling, legal cannabis use, air travel and crypto exchanges) or that
> require sensitive user information **should be submitted by a legal entity that provides the
> services, and not by an individual developer.**"

And relevant to the CloudKit question tracked separately:

> "**5.1.3(ii)** Apps must not write false or inaccurate data into HealthKit or any other medical
> research or health management apps, and **may not store personal health information in iCloud**."

Apple's own [enrollment page](https://developer.apple.com/programs/enroll/) confirms the
Organization route requires "a legal entity that can enter into contracts with Apple … We do not
accept DBAs, fictitious business names, trade names, or branches" plus a **D-U-N-S Number**; the
Individual route needs only legal name, verified address (no P.O. boxes) and age of majority.

**Note the interaction:** Apple's guideline pushes toward a legal entity, and — as §5 shows —
so may the insurance market. They are two independent pressures pointing the same way.

---

## 2. What is actually available in the Czech Republic

### 2.1 The finding that reframes everything: software is not a "výrobek"

Definitions of *výrobek* quoted from each insurer's own wording PDF. **Verified.**

| Insurer / wording | Definition of *výrobek* | Software covered? |
|---|---|---|
| [Chubb CZ0025-L (2017)](https://www.chubb.com/cz-cz/_assets/documents/chubb_pp-odpovednosti-2017.pdf) §3.26 | „jakýkoliv **hmotný předmět**, který je prodán, dodán, upraven, vytvořen …" | **No** |
| [Kooperativa ZPP P-6000/21](https://www.koop.cz/file/edee/dokumenty/podnikatele-prumysl/Zvlastni-pojistne-podminky-pro-pojisteni-odpovednosti-za-ujmu-ZPP-600-14.pdf) čl. 25(25) | „**movitá věc** … Za součást výrobku se považuje také nahraný základní software nebo operační systém … který dodal pojištěný **společně s výrobkem**." | Only when bundled with hardware |
| [ČSOB VPP ODP 2014](https://www.csobpoj.cz/documents/10332/32946/10N2408_VPP_ODP_2014_n4_final_Pojisteni-odpovednosti-fyzickych-a-pravnickych-osob.pdf/3f70777f-6184-43e8-b93f-c16ab821770a) čl. IV.8 e) | product liability excludes „výrobky, majícími povahu **věci nehmotné**" | **No, expressly** |
| [Allianz OSPP-03](https://www.allianz.cz/content/dam/onemarketing/cee/azcz/dokumenty-a-formulare/pro-firmy/korporatni-rizika/VPP_pojisteni_odpovednosti.pdf) čl. 21/45 | „**Výrobkem nejsou** výsledky duševní tvořivé činnosti … jako např. projekty, posudky všeho druhu, audity, **software** …" | **No, named** |
| [UNIQA UCZ/Odp/20](https://www.rb.cz/attachments/pojisteni/pojisteni-podnikatelu-perfekt.pdf) čl. 10/15 | „jakákoliv **movitá věc**"; čl. 10/13 „Věcí se rozumí **hmotná věc**" | **No** — *doc obtained via a Raiffeisenbank-distributed booklet, not uniqa.cz; uniqa.cz's document search is JS-gated* |
| [ČPP ZPPVV P 1/16](https://www.cpp.cz/file/edee/dokumenty/pojisteni-podnikatelu/spolecne-dokumenty/zppvv-1_16.pdf) čl. 7(3) | „Za vadný výrobek se **nepovažují výsledky duševní práce (například posudky, projekty, SW a další)**" | **No, named** |
| [Generali ZPP O 2014/02](https://www.generaliceska.cz/documents/20183/64633/pojisteni_odpovednosti_podnikani.pdf/23fff7be-745a-413d-b112-78e55c90f586) čl. 6/4 | „Výrobek je **hmotná movitá věc** určená k uvedení na trh" | **No** |
| [Generali VPPMO-P-02/2020](https://www.generaliceska.cz/documents/20183/63226/VPPMO-P+a+DPP+02.2020+(v02.2022).pdf/a9870462-a63d-4ff3-9e27-c36467269288) | **no definition of *výrobek* at all**; cover limited to „hmotné věci" | No, by omission |
| [Generali "Profeska" VPPPI-P-01/2020](https://www.generaliceska.cz/documents/20183/63226/ProfeskaVPPPI-P-01-2020.pdf/fb0a1321-27a8-4dfd-b036-b899d9b41953) | „**IT výrobkem se rozumí hardware. Za IT výrobek se nepovažuje software.**" | **No** — a hardware clause under a software heading |
| **[ČSOB VPP OIT 2020](https://www.csobpoj.cz/documents/10332/32946/10N9136_PPR_VPP_OIT_2020.pdf/6d71b7c6-f094-e6ab-137f-f6c1650ca4a4) čl. II(2)** | **„výrobkem se pro účely tohoto pojištění rozumí i software."** | **YES — the only one found** |

This is the single most decision-relevant fact in this document. It means the obvious purchase —
generic *pojištění odpovědnosti podnikatele* with the *odpovědnost za výrobek* add-on — buys cover
that **cannot respond to a software defect** at seven of the eight non-ČSOB-IT wordings, precisely
as PLD is about to pull software into product liability.

Allianz goes further: base [VPP-PO 1/18] čl. 23(1)(k) excludes liability „způsobenou poskytováním,
vývojem, výrobou nebo instalací **softwaru**, zpracováním dat … a poskytováním jakýchkoliv
internetových služeb." Without their IT rider (ZPP-PO IT 1/18), an Allianz liability policy covers
a software developer for **nothing**.

### 2.2 The one Czech product built for this

**ČSOB Pojišťovna — Pojištění odpovědnosti za újmu způsobenou v souvislosti s poskytováním IT
služeb, VPP OIT 2020.** Verified from the wording PDF and the
[product page](https://www.csobpoj.cz/pojisteni/pojisteni-odpovednosti-it-sluzby):

- Scope: „Pojištění je určené pro **všechny IT podnikatele a IT specialisty**."
- Product-defect grant: čl. II(2) „Pojištění se vztahuje i na odpovědnost za újmu způsobenou
  **vadou výrobku** pojištěného; výrobkem se pro účely tohoto pojištění rozumí i **software**."
- Insured activity, čl. IX(4)(a): „poskytování softwaru třetí straně (navržení, výroba, nebo
  dodávka softwaru, který ve všech významných ohledech odpovídá písemné specifikaci a je v souladu
  s normami z hlediska **kvality, bezpečnosti a způsobilosti**)."
- **Territory, čl. VIII: „Pojištění se sjednává s územním rozsahem pro celý svět včetně USA
  a Kanady."** — worldwide including the USA and Canada. Unusual and valuable for an
  international App Store release.

Its own exclusions still bite this project — see [§6.4](#64-residual-exposures-with-no-czech-answer).

### 2.3 Everything else, ranked

| Rank | Option | Why |
|---|---|---|
| 1 | **ČSOB VPP OIT 2020** | Only CZ wording where software *is* a *výrobek*; worldwide incl. US/CA |
| 2 | **[Colonnade CZ PI-IT](https://www.colonnade.cz/firmy/pojisteni-financnich-rizik/pojisteni-profesni-odpovednosti)** | Its [proposal form (03/2026)](https://www.colonnade.cz/cdn/65b2eb68-cf8e-0106-94e7-7fcbfbaa6c5e/d9895dc5-59b5-4b54-9f8e-c6b0bb209fba/Dotaznik_PI_IT%20032026.pdf) rates „Vývoj webových a mobilních aplikací" and „Vývoj softwaru souvisejícího s **umělou inteligencí (AI)**", and asks for a client-sector split incl. „**Zdravotnictví**" and a US/Canada revenue split. Also offers [SMART LIABILITY](https://www.colonnade.cz/novinky/unikatni-kombinovane-pojisteni-smart-liability) (PI+GL+cyber+D&O). **Territory generally worldwide excluding US/Canada.** |
| 3 | **Allianz + ZPP-PO IT 1/18 rider** | Europe by default; **US/Canada judgments excluded absolutely**; recall exclusion has no buy-back; pure financial loss not purchasable at all |
| — | Kooperativa, Generali (both wordings + Profeska), ČPP, UNIQA, Slavia, Direct, Pillow | Software outside *výrobek*; or the product is closed to this risk |
| — | **ČPP "PROFEX"** | Its IPID limits eligibility to „fyzické nebo právnické osoby provozující činnost, **u které zákon ukládá povinnost sjednat si pojištění odpovědnosti**". A developer has no statutory insurance duty → **closed** |
| — | **Hiscox** | Does not operate in the Czech Republic |
| — | AIG CZ | **Unverified** — not reached |

Specialist Czech brokers that place this class:
[Respect](https://www.respect.cz/cs/pojisteni-pro-firmy/tech),
[Renomia](https://www.renomia.cz/),
[CEE Specialty](https://cee-specialty.eu/index.php/cs/odpovednost/pojisteni-profesni-odpovednosti-it),
[nablbost.cz](https://www.nablbost.cz/pojisteni-pro-podnikatelske-profese/pojisteni-pro-it-firmy-a-it-specialisty).

---

## 3. Cost

**No Czech insurer publishes a premium or an open calculator for business/professional liability.**
This was checked independently across every insurer named above. The online calculators that do
exist (ČSOB, Generali) are for **consumer/household** liability — a different product.

Everything below is therefore **secondary or an estimate. Do not budget on it; get a quote.**

| Figure | Source | Status |
|---|---|---|
| ~10 000 CZK/yr at a 2M CZK limit, 1M CZK turnover, **Czech territory only** | broker worked example | *Secondary.* The only concrete number located. Czech-only territory makes it a poor proxy for a worldwide-incl-US/CA placement |
| 3 000–8 000 CZK/yr, IT freelancer/small agency, turnover to 2M CZK | [dokumentomat.cz blog](https://dokumentomat.cz/blog/pojisteni-odpovednosti-osvc-2026) | *Secondary, blog.* Not an insurer figure |
| 5 000–15 000 CZK/yr, OSVČ without premises (consultant/programmer) | same | *Secondary, blog* |
| Standalone cyber, 1–3M CZK limit: 4 000–10 000 CZK/yr | same | *Secondary, blog* |
| Apple Developer Program **$99/yr** | Apple | *Verified* (recorded in #672 §7) |

**Rational expectation, stated as an estimate:** worldwide-including-US/Canada territory, a
consumer health-adjacent app, and an AI-generated safety-relevant dataset are each individually
premium-loading and appetite-narrowing factors. A quote materially above the freelancer ranges
above, or a decline, would both be unsurprising. **This is reasoning, not data.**

---

## 4. Does PI actually cover the risk? (deliverable 2)

### 4.1 PI/tech E&O excludes bodily injury — verified wordings

| Wording | Quote |
|---|---|
| [Travelers CyberRisk Tech CYB-16002 06-20](https://foragents.travelers.com/lscontent/iw-documents/business/technology/tech-cyberrisk-cov-details-CYB-16002.pdf) p.12 | "**Bodily Injury.** The Insurer will not pay Loss for: a. bodily injury; b. sickness; c. disease; d. death; or e. loss of consortium." |
| [Beazley MediaTech US F00731 022019](https://www.beazley.com/globalassets/product-documents/policy-form/beazley-media-tech-policy-us.pdf) | Excludes "physical injury, sickness, disease or death of any person …"; and *Professional Services* "will not include activities performed by or on behalf of the Insured Organization as … a **health care provider** …" |
| [CFC Technology v3.0 (2025)](https://www.mig.ie/wp-content/uploads/2025/12/Optis-CFC-Technology-Policy-1225.pdf) Excl. 15, 48 | "**Bodily injury** — … arising directly or indirectly out of bodily injury"; "**Products liability** — arising directly out of any bodily injury or property damage caused directly by any product." |

**CFC is the notable exception worth targeting:** its Insuring Clause 1 Section A is headed
"Products and Services Liability" and affirmatively grants, arising out of the insured's technology
services, "c. failure of a product to perform or function as intended; d. **bodily injury or
property damage and any consequential financial loss related to the bodily injury or property
damage**". That is a genuine carve-back, not the classic pure-financial-loss form.

**Negative finding, stated as such:** across every tech E&O wording obtained — including CFC's
full 66-item exclusion list, checked item by item — **there is no express medical-device,
health-advice, or life-critical-software exclusion.** The health constraint is enforced through
**underwriting appetite and the definition of the insured business**, not a named exclusion. Any
claim to the contrary should be treated as unverified.

Where health apps *are* placed is blended digital-health paper, which carves bodily injury back in:
[Beazley Virtual Care UK](https://www.beazley.com/globalassets/product-documents/policy-form/beazley-virtual-care-wording-uk-bidac-mm.pdf)
(Medical Malpractice + Tech Services + Public Liability + Products Liability in one wording) and
[CFC eHealth](https://www.cfc.com/media/4994/ehealth_keyfacts-v11.pdf) — "designed to meet the
insurance needs of **UK based** digital healthcare companies". **Both are UK-company products.**

### 4.2 PI ≠ product liability, and no one yet sells PLD cover

PI/E&O answers *a client's financial loss from negligent service*. Product liability answers
*bodily injury and property damage from a defective product*. PLD 2024/2853 puts a paid app
squarely in the second box while the owner is planning to buy the first.

Insurer, reinsurer, broker and law-firm bulletins on the new PLD all say the same thing — *review
your wordings, there is a gap* — and **none announces a PLD-specific product**:

- [Marsh](https://www.marsh.com/en-gb/services/financial-professional-liability/insights/eu-updated-product-liability-directive.html):
  "The fact that software is considered a product could call for **merging some tech PI and
  CGL/product liability and cyber liability covers to ensure there is no gap or overlap in
  coverage**"; "The definition of insured product has to be reviewed … no limitations related to
  software."
- [Sompo International](https://www.sompo.com/insights/preparing-for-the-eu-product-liability-directive-eu-20242853):
  "the inclusion of software as a product introduces a **hybrid exposure combining technology risk
  and product risk**."
- Law firms: [Reed Smith — key insurance themes](https://www.reedsmith.com/articles/the-eu-product-liability-directive-key-insurance-themes/),
  [Gibson Dunn](https://www.gibsondunn.com/eu-product-liability-directive-responding-to-software-ai-and-complex-supply-chains/),
  [Taylor Wessing](https://www.taylorwessing.com/en/insights-and-events/insights/2025/01/di-new-product-liability-directive),
  [A&O Shearman](https://www.aoshearman.com/en/insights/the-new-product-liability),
  [Šimek (epravo, CZ)](https://www.epravo.cz/top/clanky/nova-smernice-o-odpovednosti-za-vadne-vyrobky-pld-a-dopady-na-sektor-fintech-a-insurtech-119098.html).

**Negative finding as of this research: no insurer markets a wording built for PLD 2024/2853
software liability.** The nearest verified grant anywhere is ČSOB's VPP OIT 2020 čl. II(2).

### 4.3 The AI catalog is the part most likely to be excluded

Exclusions are arriving faster than affirmative cover, and they target exactly the
agent-generated-catalog risk:

- **ISO / Verisk generative-AI CGL exclusions CG 40 47, CG 40 48, CG 35 08 (all 01 26), effective
  1 January 2026.** CG 40 47 is broadest — excludes bodily injury, property damage and personal &
  advertising injury arising out of or attributable to generative AI; CG 35 08 extends it to
  Products/Completed Operations.
  ([Gallagher](https://www.ajg.com/news-and-insights/iso-introduces-generative-ai-exclusion-in-commercial-general-liability-policies/),
  [Independent Agent VU](https://www.independentagent.com/vu_resource/verisk-to-roll-out-new-general-liability-exclusions-for-generative-ai-exposures/))
- **Hamilton** professional-liability genAI exclusion; **W. R. Berkley** "absolute" AI exclusion
  applying to D&O, **E&O** and Fiduciary — "based upon, arising out of, or attributable to" the
  use, deployment or development of AI, enumerating AI-generated content and failure to detect
  AI-produced material.
  ([Zelle LLP](https://www.zellelaw.com/AI_Update_The_Growing_Trend_of_AI-Related_Insurance_Policy_Exclusions))
- Scale: ["More than 60 P&C insurance groups file to adopt AI exclusions", The Insurer, 23 Jul 2026](https://www.theinsurer.com/ti/analysis/more-than-60-pc-insurance-groups-file-to-adopt-ai-exclusions-2026-07-23/)
  — *headline verified, body paywalled.*
- Affirmative AI cover exists but not for this buyer:
  [Coalition's Affirmative AI Endorsement](https://www.coalitioninc.com/announcements/coalition-adds-new-affirmative-ai-endorsement-to-cyber-policies)
  applies to **US Surplus and Canada cyber** policies, not tech E&O and not EU buyers;
  [Armilla](https://www.armilla.ai/ai-insurance) (Lloyd's coverholder, Chaucer/Axis paper) is
  enterprise-scale. Microsoft/Google AI indemnities are **copyright/IP** indemnities for use of
  *their* models — they do not indemnify the accuracy of AI-generated content you publish
  (*secondary; vendor terms not fetched*).

**Also note:** content-accuracy liability is normally a **media liability** grant, not tech E&O.
CFC puts media in a separate Insuring Clause 7. An allergen catalog is content.

**Practical consequence: any quote must be checked for an AI exclusion before binding.** If one is
attached, the policy does not cover the app's single most likely failure mode.

---

## 5. Can a natural person actually buy this — the open question

**This is deliverable 3, and it is the finding to surface to the owner. It is reported, not decided.**

What is **verified**:

- **No Czech wording examined says "legal entities only."** ČSOB's IT product is marketed to
  „všechny IT podnikatele a IT specialisty" — language that reads as inclusive of OSVČ.
- **ČPP PROFEX is closed**, but for an unrelated reason: its IPID limits it to persons carrying on
  an activity „u které **zákon ukládá povinnost** sjednat si pojištění odpovědnosti" — a statutory
  insurance duty a developer does not have.
- **Colonnade's PI-IT proposal form is drafted around a company**: „Údaje o pojistníkovi:
  **Obchodní jméno společnosti (včetně IČO)**", signed „podpisem **zástupce společnosti**". An OSVČ
  has an IČO, so it is probably workable — but the form's shape is a company's.
- **Czech quote forms ask for IČO as standard**, i.e. business registration is assumed even where
  legal-entity status is not.
- **Apple's own rule points the same way** — Guideline 5.1.1(ix), quoted in §1.4.
- **The two products actually shaped for digital health are UK-company products** (Beazley Virtual
  Care, CFC eHealth).
- **Non-Czech retail routes look closed by domicile.** Superscript's online cover appears limited
  to UK-registered companies and UK-resident sole traders with non-UK applicants handled offline
  (*probable but unverified — text seen in search indexing, not confirmed in the page body*).
  [Simply Business](https://www.simplybusiness.co.uk/business-insurance/software-developers-insurance/),
  [Markel Direct](https://www.markeluk.com/business-insurance/sole-trader-insurance) and
  [With Jack](https://withjack.co.uk/products/professional-indemnity-insurance/) publish **no**
  eligibility, residency, territorial or health exclusions at all. US retail (Insureon, Next,
  Thimble, Hiscox US, Vouch, Embroker) writes US-admitted/surplus paper requiring a US-domiciled
  insured — *a Czech natural person is a near-certain decline, but this is an assumption, not a
  verified finding.*

What is **unverified and must be asked in writing**:

1. Will **ČSOB** bind VPP OIT 2020 with an **OSVČ natural person** as pojistník?
2. Will **Colonnade CZ** bind PI-IT for a natural person?
3. Does either insurer's **appetite** survive the disclosure that the insured product is a
   **consumer infant-health app** with an **AI-generated allergen catalog** and a **worldwide
   B2C** distribution?
4. Do these wordings, built around a **named client engagement**, respond at all to an
   **anonymous B2C App Store sale**?

> ### The finding to put in front of the owner
>
> **If the answer to (1) and (2) is that the insurer requires a legal entity — or if appetite
> evaporates once the health-adjacent, AI-generated, B2C-worldwide nature of the product is
> disclosed — then the settled position ("take out professional indemnity insurance, no s.r.o.")
> is not achievable as stated, and the s.r.o. question the owner declined is reopened by the
> insurance market rather than by anyone's opinion.**
>
> Note also that Apple Guideline 5.1.1(ix) and the insurance market are **two independent
> pressures pointing at a legal entity**. That does not make the decision; it is the owner's.
> **This document does not decide it.**

---

## 6. What is uninsurable regardless (deliverable 4)

### 6.1 Uninsurable by law, not by appetite

Four exposures cannot be fixed by paying more premium.

**(a) Fines and penalties on you — GDPR/ÚOOÚ, administrative, criminal.**
Three independent statutory failures:

- § 2758(1) OZ requires a **nahodilá událost** (fortuitous event).
- § 2861(1) OZ defines liability insurance as the insurer paying, for the insured, „**škodu,
  popřípadě i jinou újmu**" to a **poškozený** — *damage to an injured party*. A fine is paid to
  the state, not as compensation to an injured party.
- §§ 580 / 588 OZ void acts contrary to good morals or whose purpose the statute's „**smysl a
  účel**" requires be defeated; § 588 is applied *ex officio* where the act „zjevně narušuje
  veřejný pořádek".

Excluded verbatim in **every** Czech wording examined. Chubb §4.8: „Povinnost k náhradě jakékoli
uložené **pokuty a penále** … nebo jiné smluvní, správní nebo trestní sankce nebo jiné platby
**represivní nebo preventivní povahy**." Chubb's GDPR extension, even when purchased, excludes
„**pokuty či penále uložené Úřadem na ochranu osobních údajů**". Generali's Profeska IPID states
the market rule crisply: covered = „Čisté finanční škody, vč. pokut uložených **klientovi**
pojištěného"; excluded = „**Pokuty uložené pojištěnému**."

Jurisdictional context: the Aon/DLA Piper survey classes the Czech Republic as **"unclear"** on
GDPR-fine insurability, alongside DE/NL/PL; only FI and NO are clearly insurable
([StrategicRISK summary](https://www.strategic-risk-global.com/esg-risks/where-you-are-in-europe-matters-for-insuring-gdpr-fines/1427167.article);
[K&L Gates overview](https://www.klgates.com/Insurability-of-Financial-Penalties-for-Personal-Data-Breaches-Overview-of-Leading-European-Jurisdictions-2-23-2026)).
**No ČAP, ČNB or ÚOOÚ material on this was located despite direct searching.**

And buying such cover is affirmatively harmful: the NSS has treated „uzavření smlouvy o pojištění
proti pokutám" as an **aggravating circumstance** showing „celkově negativní vztah k dodržování
povinností" (**1 As 52/2019-43**; also **4 As 199/2017-30**) — *full judgment texts could not be
opened; holdings are secondary-sourced via
[pravniprostor.cz](https://www.pravniprostor.cz/pojisteni-proti-pokutam-je-pritezujici-okolnosti).*

**(b) Intentional harm — including *dolus eventualis*.**

> **§ 2799 OZ** „Způsobila-li **úmyslně** pojistnou událost … vzniká právo na pojistné plnění jen
> tehdy, bylo-li to výslovně ujednáno."

Dispositive in theory; no Czech insurer contracts around it. The definition that matters most here
is Kooperativa VPP P-100/14 § 19:

> „Újmou způsobenou **úmyslně** je újma … pokud škůdce věděl, že může způsobit škodlivý následek,
> a chtěl jej způsobit **anebo věděl, že škodlivý následek může způsobit, a pro případ, že jej
> způsobí, byl s tím srozuměn.**"

*…or knew he might cause the harmful consequence and, should he cause it, was reconciled to that.*
Generali (VPPMO-P čl. 29/9) and UNIQA (čl. 10/11) go further, extending intent to a case where the
insured „**věděli o závadách věcí nebo služeb**" — *knew about the defects in the goods or services*.

**Direct consequence for this project.** Documented awareness that an AI-generated allergen catalog
can be wrong is simultaneously (i) a § 2788 pre-contractual disclosure duty, (ii) a known-defect
exclusion trigger, and (iii) an argument for *dolus eventualis*. **The catalog sign-off gate
already required by #672 §10 is not just good practice — it is the evidence that the mappings were
reviewed rather than knowingly shipped unreviewed.** How the review is recorded matters.

**(c) The defective product itself, and *práva z vadného plnění* / warranty.** Contract risk, not
liability risk; excluded everywhere. PLD Art. 6(1)(b)(i) likewise excludes the defective product
itself. Fixing or refunding the app is on the developer.

**(d) *Smluvní pokuta*.** § 2050 OZ: „Je-li ujednána smluvní pokuta, **nemá věřitel právo na
náhradu škody**"; § 2048(1) makes it payable „bez zřetele k tomu, zda mu … vznikla škoda". Not
damages → outside § 2861; self-sized → moral hazard. ČPP folds it into „finanční sankce" and
excludes it.

**(e) Punitive damages.** Not a Czech institute — NS **20 Cdo 702/2021-1460**: a claim for
„sankční náhradu škody – obdobu tzv. punitive damages – … **není vůbec přípustný**"
(*via [epravo](https://www.epravo.cz/top/soudni-rozhodnuti/uznani-cizich-rozhodnuti-114539.html);
full text not opened*). Named and excluded in English in Chubb §4.17(a), Kooperativa čl. 2(2)(d),
Generali ZPP O čl. 3(4)(1)(dd). Relevant because the app ships to the US.

### 6.2 Pure financial loss (*čistá finanční škoda*) is not standard — and its buy-backs carve out software

Base cover in eight of nine wordings is bodily injury + damage to a *hmotná věc* + consequential
loss flowing from those. The statutory split sits in
[zák. č. 277/2009 Sb.](https://www.zakonyprolidi.cz/cs/2009-277) příloha 1 část B, bod 13
(liability) vs bod 16 (miscellaneous financial loss), and § 2871(1) OZ.

- **In base:** only ČPP, capped at **10% of the limit**, switched off for product liability unless
  agreed.
- **Add-on:** Chubb §2.11; Kooperativa (in base, then carved out); Generali V70 / ZPP O čl. 4(4);
  UNIQA UCZ/Odp-P čl. 5/6.
- **Not purchasable at all:** Allianz OSPP-03.
- **Every buy-back carves software back out.** Chubb re-excludes paid computer-data contracts and
  paid professional services; Kooperativa re-excludes „poskytováním software nebo hardware …
  hostingovými … nebo **webovými portály**"; UNIQA re-excludes the software/data/hosting activity
  itself plus GDPR-related loss; Generali re-excludes „**čistě finanční škodu způsobenou IT
  výrobkem**".

### 6.3 The exclusions that specifically bite this app

| Exposure | Where it is excluded |
|---|---|
| **Harm from information or advice** — *the app's core function* | ČSOB ODP 2014 čl. IV.1 w) „**informací nebo radou**"; Chubb §4.9 „…jakýchkoliv pokynů, **rad, poradenství, informací** nebo odborných služeb … **za úplatu**" |
| **App Store pull / recall** | Chubb §4.6; Kooperativa čl. 17.3 h) *and* čl. 22.11; Generali (both); Allianz čl. 5(1) z) (no buy-back); UNIQA čl. 8(6) c); **ČSOB OIT čl. IV.1 p) „stažením výrobků z trhu"**. Only ČPP negotiates it back. Every buy-back that exists is drafted for physically retrieving goods |
| **Beta / unsupported builds** | Kooperativa čl. 22(11) e) — „v **testovací fázi vývoje** (např. „beta" verze)" |
| **Defect known at inception** | ČSOB OIT čl. IV.1 d); ČSOB OC 2018 čl. VI.1 d); Kooperativa čl. 2(1) e); Chubb §§4.20–4.21 |
| **Works fine, doesn't do what you advertised** | Generali VPPMO-P čl. 23(4) c) and Profeska čl. 5 b) — „z technického hlediska **bezvadný, ale nedosahuje avizovaných funkčních parametrů**". *An allergen catalog that runs perfectly and is simply **wrong** lands here* |
| **Wrong-purpose use** | ČSOB OIT čl. IV.1 q) „použitím výrobku k **nevhodnému účelu**" |
| **Medical-device drift** | No IT wording carries a *zdravotnický prostředek* exclusion, but ČSOB ODP 2014 čl. IV.9 b)/h) excludes „**léků, vakcín** … farmaceutických výrobků" and „**lékařských zařízení**"; Kooperativa čl. 24(2) e) excludes drug/device trials. **If the app were ever MDR-classified, the general wordings shut and the IT wordings face a declared-activity mismatch** — which is the insurance restatement of #672 §7's "marketing copy is the regulatory tripwire" |

### 6.4 Residual exposures with no Czech answer

Even after buying the best available Czech wording:

1. Harm from **information or advice** — excluded by the general wordings; ČSOB OIT's insured
   activity is drafted around *software delivered to a specification*, not *advice to a consumer*.
2. **Removal from the App Store** and the revenue behind it.
3. **Regulatory fines** of every kind.
4. **The cost of fixing the catalog and re-shipping.**
5. A claim characterised as arising from **intentional** shipping of a known-fallible dataset.
6. Any claim if an **AI exclusion** is attached to the placed policy.

---

## 7. Open questions to put to a broker, in writing

Ask a Czech specialty broker to place ČSOB VPP OIT 2020 or Colonnade PI-IT, and require written
answers to:

1. Will the insurer accept an **OSVČ natural person** as pojistník? If not, what entity form is
   required?
2. Disclosed fully — **consumer infant-health app, AI-generated allergen catalog, worldwide B2C
   App Store distribution** — is it within appetite, and at what premium and limit?
3. Does the wording respond to an **anonymous consumer** claim, given it is drafted around a named
   client engagement?
4. Is **bodily injury** covered, excluded, or carved back for the insured's own software? (Compare
   CFC Technology v3.0 IC1 Section A.)
5. **Is an AI exclusion attached?** Do not bind without an answer.
6. How will the policy respond to a **PLD 2024/2853** strict-liability claim after 9 Dec 2026?
   Is the insurer amending wordings for it?
7. Is **US/Canada** in territory, and are US-court judgments excluded?

---

## Sources

**Statutes and regulation**
- [Zákon č. 89/2012 Sb., občanský zákoník](https://www.zakonyprolidi.cz/cs/2012-89) — §§ 159, 580, 588, 2050, 2048, 2758, 2788, 2799, 2861, 2871, 2894–2898, 2939–2943
- [Zákon č. 90/2012 Sb., o obchodních korporacích](https://www.zakonyprolidi.cz/cs/2012-90) — §§ 51–53, 132
- [Zákon č. 277/2009 Sb., o pojišťovnictví](https://www.zakonyprolidi.cz/cs/2009-277)
- [Zákon č. 110/2019 Sb., o zpracování osobních údajů](https://www.zakonyprolidi.cz/cs/2019-110) — § 62(5)
- [Zákon č. 418/2011 Sb., o trestní odpovědnosti právnických osob](https://www.zakonyprolidi.cz/cs/2011-418)
- [Směrnice (EU) 2024/2853 (PLD)](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ:L_202402853)
- [MPO — transpozice směrnice 2024/2853](https://mpo.gov.cz/cz/rozcestnik/ministerstvo/aplikace-zakona-c-106-1999-sb/informace-zverejnovane-podle-paragrafu-5-odstavec-3-zakona/transpozice-smernice-evropskeho-parlamentu-a-rady-eu-2024-2853-z-23--rijna-2024--289757/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) · [Apple Developer Program enrollment](https://developer.apple.com/programs/enroll/)

**Czech policy wordings** — see the linked PDFs in [§2.1](#21-the-finding-that-reframes-everything-software-is-not-a-výrobek) and [§2.2](#22-the-one-czech-product-built-for-this)
(Chubb CZ0025-L · ČSOB ODO/ODP/OIT/OC · Kooperativa ZPP P-6000/21 + VPP P-100/14 · Generali
VPPMO-P-02/2020, ZPP O 2014/02, Profeska VPPPI-P-01/2020 · Allianz OSPP-03 · UNIQA UCZ/Odp/20 ·
ČPP VPPOD 1/16, DPPOP P 1/16, ZPPVV P 1/16)

**International wordings and products** — Travelers CYB-16002 · Beazley MediaTech F00731, Beazley
Virtual Care UK · CFC Technology v3.0, CFC eHealth · Colonnade CZ PI-IT + SMART LIABILITY (all
linked inline)

**Analyses** — Marsh · Sompo International · Reed Smith · Gibson Dunn · Taylor Wessing ·
A&O Shearman · Gallagher/Verisk · Zelle LLP · The Insurer · Aon/DLA Piper via StrategicRISK ·
K&L Gates · epravo.cz (Šimek; Šarmír; Ondruchová & Borovková; Sojka) (all linked inline)

---

## What could not be verified

Recorded so the next reader does not mistake absence for absence of risk.

- **Whether ČSOB, Colonnade, Allianz or Chubb will contract with a one-person OSVČ natural
  person.** The central open question.
- **Any premium at a 1M / 5M / 10M CZK limit.** No Czech insurer publishes business-liability
  pricing.
- **AIG CZ** — not reached. **UNIQA's** own site is JS/anti-bot gated; its wording was obtained via
  a Raiffeisenbank-distributed booklet of the same typeset.
- **ČSOB PMOP business wording** — HTTP 500 on the vendor URL.
- **Hiscox US specimen E&O form** — HTTP 402 paywall. No public wording from Chubb (international),
  AIG, Zurich, Allianz Commercial, Coalition or Markel.
- **Health/medical exclusions in UK retail freelancer PI schemes** — none published by Simply
  Business, Markel Direct or With Jack.
- **Superscript's** non-UK offline route — seen in search indexing, not confirmed in the page body.
- **US retail decline for a Czech natural person** — an assumption, not a verified finding.
- Full texts of NSS 1 As 52/2019-43, NSS 4 As 199/2017-30, NS 30 Cdo 3157/2013 — courts' sites
  blocked; holdings secondary-sourced.
- **Coalition's Affirmative AI Endorsement date** — the page shows 2024, secondary coverage 2025.
- **Microsoft/Google AI indemnity terms** — read only via secondary sources.
- **PwC CZ's PLD article** — HTTP 403; the 23 Dec 2025 bill date comes from search indexing and
  conflicts with MPO's own 31 Mar 2026 statement.
</content>
