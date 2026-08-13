# GDPR — does this app trigger a mandatory DPIA, and what does compliance concretely require?

**Research ticket:** [#680](https://github.com/jirigrill/eczema-helper/issues/680) · map [#672](https://github.com/jirigrill/eczema-helper/issues/672)
**Date:** 2026-08-13
**Subject:** the planned native iOS app — records an infant's eczema (meals, skin observations, photos) for the child's mother. SwiftData locally, sync to the **user's own** iCloud account via **CloudKit private database**. No developer-operated backend. Paid app, sold internationally, English-first, by a **solo individual developer (natural person) established in the Czech Republic**.

> ⚠️ **This is not legal advice.** It is primary-source groundwork for a decision the owner makes. Every load-bearing claim below is quoted from regulation text, EDPB/WP29 guidance endorsed by the EDPB, a supervisory authority's own publication, or the vendor's own published terms — with a URL. Where a question is genuinely unsettled, it says so instead of resolving it.

---

## Overview

**The DPIA question does not resolve cleanly, and the reason is worth stating up front: it does not actually turn on the ÚOOÚ list. It turns on a prior question — whether the developer is a controller of data he never sees — and that question is not settled by any primary source found here.**

- Applying ÚOOÚ's published scoring method (§3) on the assumption that the developer's own processing is small-scale, this app scores **one critical characteristic** (special-category health data) and three or four significant ones. ÚOOÚ's threshold is *two* criticals, or one plus *five* significants. **On that reading, no mandatory DPIA.**
- That reading holds only if the "large scale" characteristic scores low, which holds only if the developer is **not** a controller of every user's data. **EDPB Guidelines 07/2020 state twice, in terms, that a controller need not have access to the data** (§6). Applied literally, the developer is a controller of every installed instance, a successful international app clears ÚOOÚ's stated 10,001-data-subject / NUTS1 line, the large-scale characteristic goes critical, and **a DPIA becomes mandatory**.
- **Neither reading is resolved by a source found here.** No EDPB or ÚOOÚ material addresses a vendor whose software processes data solely on the end-user's own device and in the end-user's own cloud account, for the end-user's own purposes. Recital 18's final sentence reaches means-providers but does not say they are controllers of the household data.
- The best support for "no DPIA" is not ÚOOÚ but **Recital 91**, whose carve-out WP29/EDPB guidance applies as a worked example of "DPIA **not** likely to be required" for **exactly the two criteria this app meets** (sensitive data + vulnerable data subjects) — §2.
- **Practical upshot: do the DPIA anyway.** It is a few pages, it is the same document as the Art. 30 record and the WP248 "why we decided not to" memo, and it is the only way to be correct under both readings. Art. 35(7) sets out what it must contain; the ÚOOÚ methodology gives a ready-made structure.
- **Not doing a DPIA is not the same as not documenting.** WP248 is explicit: a controller who decides against a DPIA must *justify and document the reasons*, and must assess whether a high risk is likely even if it ultimately decides not to. The Art. 30 record is separately mandatory here regardless — the Art. 30(5) SME exemption fails, and ÚOOÚ itself calls that exemption "unworkable in practice" (§5).
- **Several planned features flip the answer to an unambiguous yes** — the AI/correlation feature alone is enough (§3, "cliffs"). Any derived-insight surface takes ÚOOÚ characteristic 8 to critical, which with health data is two criticals.
- **One engineering decision should be made before the first CloudKit schema ships:** put the health fields in `record.encryptedValues` (§6). Cheap now, expensive to retrofit, and Apple can otherwise read them under standard data protection.

---

## 0. Prior findings carried forward (not re-derived)

Per the pinned handoff on [#672](https://github.com/jirigrill/eczema-helper/issues/672) §7, already verified in a prior session:

- Art. 9 health data applies; eczema photos qualify via the **health limb**, not biometrics (Recital 51).
- The Art. 30(5) SME record-keeping exemption **fails** for Art. 9 data.
- A DPIA is **not automatic**: Art. 35(3)(b) hinges on an undefined "large scale".

---

## 1. The threshold provision — Art. 35 GDPR, verbatim

Source: [Regulation (EU) 2016/679, EUR-Lex CELEX:32016R0679](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679)

> **Article 35 — Data protection impact assessment**
>
> 1. Where a type of processing in particular using new technologies, and taking into account the nature, scope, context and purposes of the processing, is likely to result in a high risk to the rights and freedoms of natural persons, the controller shall, prior to the processing, carry out an assessment of the impact of the envisaged processing operations on the protection of personal data. A single assessment may address a set of similar processing operations that present similar high risks.
>
> 3. A data protection impact assessment referred to in paragraph 1 shall in particular be required in the case of:
>    (a) a systematic and extensive evaluation of personal aspects relating to natural persons which is based on automated processing, including profiling, and on which decisions are based that produce legal effects concerning the natural person or similarly significantly affect the natural person;
>    (b) processing on a large scale of special categories of data referred to in Article 9(1), or of personal data relating to criminal convictions and offences referred to in Article 10; or
>    (c) a systematic monitoring of a publicly accessible area on a large scale.
>
> 4. The supervisory authority shall establish and make public a list of the kind of processing operations which are subject to the requirement for a data protection impact assessment pursuant to paragraph 1. The supervisory authority shall communicate those lists to the Board referred to in Article 68.
>
> 5. The supervisory authority may also establish and make public a list of the kind of processing operations for which no data protection impact assessment is required. […]
>
> 6. Prior to the adoption of the lists referred to in paragraphs 4 and 5, the competent supervisory authority shall apply the consistency mechanism referred to in Article 63 where such lists involve processing activities which are related to the offering of goods or services to data subjects or to the monitoring of their behaviour in several Member States, or may substantially affect the free movement of personal data within the Union.

Note what Art. 35(3) is *not*: it is not the trigger, it is a non-exhaustive illustration of Art. 35(1). Art. 35(3)(a) does not apply — v1 derives nothing and takes no decisions (the "Records only. Never instructs, never derives, no correlation" scope in the handoff is doing real regulatory work here). Art. 35(3)(c) does not apply — no publicly accessible area. Art. 35(3)(b) is the live one and turns on "large scale".

### Recital 91 — the operative carve-out

Same source, Recital 91, final two sentences:

> The processing of personal data **should not be considered to be on a large scale if the processing concerns personal data from patients or clients by an individual physician, other health care professional or lawyer. In such cases, a data protection impact assessment should not be mandatory.**

---

## 2. WP29 / EDPB guidance — the nine criteria and the two-criteria rule

Source: [Guidelines on Data Protection Impact Assessment (DPIA), wp248rev.01](https://ec.europa.eu/newsroom/article29/items/611236), adopted 13 October 2017, **endorsed by the EDPB on 25 May 2018** ([EDPB endorsed WP29 guidelines](https://www.edpb.europa.eu/our-work-tools/general-guidance/endorsed-wp29-guidelines_en)). PDF: <https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711>

The nine criteria (verbatim headings): 1. Evaluation or scoring · 2. Automated-decision making with legal or similar significant effect · 3. Systematic monitoring · 4. Sensitive data or data of a highly personal nature · 5. Data processed on a large scale · 6. Matching or combining datasets · 7. Data concerning vulnerable data subjects · 8. Innovative use or applying new technological or organisational solutions · 9. When the processing in itself "prevents data subjects from exercising a right or using a service or a contract".

On large scale (criterion 5), verbatim:

> the GDPR does not define what constitutes large-scale, though recital 91 provides some guidance. In any event, the WP29 recommends that the following factors, in particular, be considered when determining whether the processing is carried out on a large scale: a. the number of data subjects concerned, either as a specific number or as a proportion of the relevant population; b. the volume of data and/or the range of different data items being processed; c. the duration, or permanence, of the data processing activity; d. the geographical extent of the processing activity.

On vulnerable data subjects (criterion 7), verbatim:

> Vulnerable data subjects may include **children** (they can be considered as not able to knowingly and thoughtfully oppose or consent to the processing of their data), employees, more vulnerable segments of the population requiring special protection (mentally ill persons, asylum seekers, or the elderly, **patients**, etc.)…

The decision rule, verbatim:

> In most cases, a data controller can consider that a processing **meeting two criteria** would require a DPIA to be carried out. In general, the WP29 considers that the more criteria are met by the processing, the more likely it is to present a high risk […]
>
> However, in some cases, a data controller can consider that a processing meeting **only one** of these criteria requires a DPIA.

### The decisive worked example

WP248's own examples table contains this row (verbatim from the PDF), in the block whose "DPIA likely to be required?" answer is **No**:

| Examples of processing | Possible Relevant criteria | DPIA likely to be required? |
|---|---|---|
| A processing of "personal data from patients or clients by an **individual physician**, other health care professional or lawyer" (Recital 91). | – Sensitive data or data of a highly personal nature.<br>– Data concerning vulnerable data subjects. | **No** |

This is the single most useful primary source for this app. It is a case that **meets exactly the two criteria this app meets** (sensitive data + vulnerable data subjects) and that the EDPB-endorsed guidance nonetheless places on the *no-DPIA* side, on the strength of Recital 91.

The analogy is not perfect and should not be oversold. An individual physician has a **direct treatment relationship** with each patient and holds the data themselves; the app developer here holds **nothing**, which is arguably an even weaker case for high risk, but is a *different* fact pattern rather than a stronger instance of the same one. Recital 91's list ("individual physician, other health care professional or lawyer") does not name app developers.

### And the documentation duty that survives a "no"

Verbatim, immediately after the table:

> Conversely, a processing operation may correspond to the above mentioned cases and still be considered by the controller not to be "likely to result in a high risk". In such cases the controller **should justify and document the reasons for not carrying out a DPIA**, and include/record the views of the data protection officer.
>
> In addition, as part of the accountability principle, every data controller "shall maintain a record of processing activities under its responsibility" […] and **must assess whether a high risk is likely, even if they ultimately decide not to carry out a DPIA**.

**This is the concrete deliverable.** "No DPIA required" is a conclusion that has to be written down and kept.

---

## 3. Item 1 (the crux) — the Czech ÚOOÚ Art. 35(4) list, verbatim

### Provenance

ÚOOÚ publishes both lists in one document: **"Seznam druhů operací zpracování (ne)podléhajících požadavku na posouzení vlivu na ochranu osobních údajů", Verze 1.0** — "List of the kinds of processing operations (not) subject to the requirement of a data protection impact assessment".

- Current official copy: <https://uoou.gov.cz/media/profesional/seznam-operaci-zpracovani-nepodlehajicich-pozadavku-na-dpia.pdf>
- Landing page: <https://uoou.gov.cz/profesional/qa-otazky-a-odpovedi/posouzeni-vlivu-na-ochranu-osobnich-udaju>
- English text filed with the EDPB: <https://www.edpb.europa.eu/sites/default/files/decisions/cz_dpia_list_354_cz_authority.pdf>
- EDPB register entry: <https://www.edpb.europa.eu/registers/register-of-consistency-and-of-accountability-tools/data-protection-impact-assessment_en>
- EDPB [Opinion 4/2018 on the draft list of the competent supervisory authority of Czech Republic (Art. 35.4 GDPR)](https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-42018-draft-list-competent-supervisory_en)

The document itself records its own adoption path (verbatim, Czech):

> Seznam byl upraven a schválen na základě stanoviska Sboru pro ochranu osobních údajů ze dne **25. září 2018**.
> *(The list was amended and approved on the basis of the opinion of the European Data Protection Board of 25 September 2018.)*

> Negativní seznam byl upraven a schválen na základě stanoviska Sboru pro ochranu osobních údajů ze dne **10. července 2019** a dalšího projednání.
> *(The negative list was amended and approved on the basis of the EDPB opinion of 10 July 2019 and further discussion.)*

### The two-step procedure ÚOOÚ prescribes

Verbatim (Czech), p. 3:

> 1. krok – nahlédnutí do seznamu druhů operací zpracování, která nepodléhají posouzení vlivu […]. Pokud v něm správce zpracování nenalezne, postupuje ke 2. kroku.
> 2. krok – správce provede analýzu zpracování osobních údajů na základě parametrů tohoto zpracování osobních údajů a seznamu operací zpracování, která podléhají požadavku posouzení vlivu […]. Pokud na základě analýzy dojde k závěru, že se nejedná o zpracování s vysokým rizikem pro práva a svobody subjektů údajů, potom posouzení vlivu na ochranu osobních údajů nezpracovává. V opačném případě musí Posouzení vlivu na ochranu osobních údajů zpracovat.

*Translation:* **Step 1** — look at the list of processing kinds *not* subject to a DPIA. If the controller does not find its processing there, go to step 2. **Step 2** — the controller analyses its processing against the parameters and the list of operations *subject* to a DPIA. If the analysis concludes it is not high-risk processing, no DPIA is prepared. Otherwise a DPIA must be prepared.

### Step 1 — the negative ("white") list: does this app land on it?

The seven exempt kinds, verbatim in Czech with translation:

1. > Zpracování (operace zpracování) osobních údajů zaměstnanců s trvalým pracovištěm na území České republiky, prováděné pouze na území České republiky, a to v rámci plnění zákonných povinností při vedení účetnictví, mzdové agendy, sociálního a zdravotního pojištění.
   *Employee data processed only in CZ for statutory accounting, payroll, social and health insurance.*
2. > Zpracování personální agendy zaměstnanců s trvalým pracovištěm na území České republiky, prováděné pouze na území České republiky, pokud neobsahuje zpracování biometrických údajů, hodnocení a bodování subjektů údajů nebo systematické monitorování subjektů údajů. Mezi zpracování personální agendy se nezahrnuje whistleblowing.
   *HR administration for CZ-based employees, performed only in CZ, without biometrics, scoring or systematic monitoring; whistleblowing excluded.*
3. > Zpracování (operace zpracování) osobních údajů zákazníků prováděné v celém rozsahu na území České republiky, týkající se obchodní činnosti (prodeje a poskytování služeb, včetně pořádání soutěží a zasílání newsletterů), prováděné **pouze v českém jazyce**, pokud neobsahuje zpracování **zvláštních kategorií osobních údajů**, hodnocení, bodování nebo systematické monitorování subjektů údajů (s výjimkou dle bodu 4 seznamu).
   *Customer data processed entirely within CZ, for commercial activity (sale and provision of services, incl. competitions and newsletters), performed **only in the Czech language**, provided it contains no **special categories of personal data**, scoring, or systematic monitoring.*
   > *(Footnote 2, verbatim: "činnost je tedy zaměřena především nebo zcela na členský stát, v jehož jazyce je prováděna, viz rozsudek Soudního dvora Evropské unie čj. C-213/14" — the activity is therefore directed primarily or entirely at the Member State in whose language it is carried out.)*
4. > Zpracování (operace zpracování) spojené s jednotlivou návštěvou zákazníka na webové stránce správce, a to včetně profilování zákazníka […] V rámci tohoto zpracování nedochází ke zpracování zvláštních kategorií osobních údajů, údajů vysoce osobní povahy […] a nedochází k zaměření zpracování osobních údajů na ohrožené subjekty údajů jako samostatnou cílovou skupinu.
   *A single customer visit to the controller's website, incl. profiling on items viewed — provided no special categories, no highly personal data, and no targeting of vulnerable data subjects as a distinct target group.*
5. > Zpracování (operace zpracování) zajišťované osobou oprávněnou k poskytování zdravotních služeb, která není v zaměstnaneckém poměru. Tato osoba využívá nezbytné osobní údaje pouze k poskytování zdravotních služeb pro subjekt údajů (viz recitál 91 nařízení), přičemž nedochází k systematickému předávání do třetích zemí, pro některé operace zpracování osobních údajů o pacientech není využíván zpracovatel, nebo nedochází ke sdílení/propojení osobních údajů pacientů dvou nebo více jednotlivých lékařů.
   *Processing by a **person licensed to provide health services** who is not an employee, using necessary data only to provide health services to the data subject (**cf. Recital 91**), with no systematic third-country transfers, no processor used for some patient-data operations, and no sharing/linking of patient data across two or more individual doctors.*
6. > […] zajišťované jednotlivými advokáty a notáři […] *(individual lawyers and notaries, same conditions)*
7. > […] zajišťované jednotlivými podnikajícími fyzickými osobami poskytujícími sociální služby […] *(individual self-employed social-services providers, same conditions)*

Plus, verbatim note:

> Správce také nemusí provádět posouzení vlivu na ochranu osobních údajů před zahájením zpracování, pokud mu právní předpis stanoví povinnost konkrétní zpracování osobních údajů provést (§ 10 zákona č. 110/2019 Sb., o zpracování osobních údajů).
> *(No DPIA needed before processing where a legal provision imposes the obligation to carry out that specific processing — § 10 of Act No. 110/2019 Coll.)*

**Assessment — this app does NOT land on the negative list.** Item 3 is the only near miss and it fails on three independent grounds: the app is English-first and sold internationally (not "pouze v českém jazyce", and not "v celém rozsahu na území České republiky"), and it involves special categories of data. Item 5 fails because the developer is not a person licensed to provide health services. Items 1, 2, 4, 6, 7 are plainly off-point.

**⇒ Step 1 does not exempt. Proceed to step 2.**

### Step 2 — the positive ("black") list and its scoring method

ÚOOÚ does not publish a list of named processing operations. It publishes a **scoring method over 10 characteristics**, each with a three-level scale. Verbatim (Czech), p. 6:

> Zpracování osobních údajů se dle každé z charakteristik roztřídí do tří skupin, s tím, že se označí každá skupina jinak, tedy:
> ▪ KRITICKÉ HODNOTY ▪ VÝZNAMNÉ HODNOTY ▪ NÍZKÉ HODNOTY
>
> Zařazení mezi zpracování s vysokým rizikem pro práva a svobody subjektů údajů se stanoví tak, že:
> ▪ pokud **úroveň dvou a více charakteristik zasáhne mezi kritické**, potom se DPIA zpracovává,
> ▪ pokud **jedna úroveň zasáhne mezi kritické a zároveň nejméně pět charakteristik dosáhne úrovně významné**, potom se DPIA rovněž zpracovává,
> ▪ každá charakteristika se započítává jen jednou (nejvyšší dosaženou) úrovní

*Translation:* Each processing is sorted, per characteristic, into three groups: **CRITICAL VALUES** (red), **SIGNIFICANT VALUES** (blue in the Czech PDF / yellow in the English EDPB filing), **LOW VALUES** (green). Processing qualifies as high-risk if: **two or more characteristics reach critical**; **or** one reaches critical **and at the same time at least five characteristics reach significant**. Each characteristic counts once, at its highest level attained.

And the express bar on pre-crediting your own mitigations, verbatim:

> Při návrhu řešení nemůže být zohledněna situace, kdy by se uvažovalo předem se splněním určitých předpokladů (například splnění nějakých technických nebo organizačních opatření, jako je pseudonymizace údajů) […] Tyto úvahy jsou součástí vlastního posouzení vlivu […]
> *(In designing the solution one may not take into account meeting certain prerequisites in advance — e.g. technical or organisational measures such as pseudonymisation. Those considerations are part of the DPIA itself.)*

**This matters:** encryption at rest, on-device-only storage and "we never see the data" are **mitigations**, and ÚOOÚ's own method says you may not credit them at the classification stage. They belong inside the DPIA, not in the decision whether to do one.

### The 10 characteristics, verbatim, and this app's score

Colour levels below were read off the ÚOOÚ PDF's own colour-coded sub-headings (red = critical, blue = significant, green = low); the English EDPB filing marks the same levels with coloured bullets.

| # | Characteristic (ÚOOÚ heading, translated) | Levels | **This app** |
|---|---|---|---|
| 1 | Processing including **monitoring of data subjects** (guidelines criterion 3) | 1.1 identifiable + locatable — **critical**; 1.2 identifiable + recognisable — significant; 1.3 identifiable + **otherwise monitored** — significant | **Significant** (arguable). 1.3 verbatim: *"Patří sem například záznam monitorování životních funkcí pacientů, docházkové systémy, zvukové záznamy, záznamy činnosti subjektů na síti"* — recording of patients' vital functions, attendance systems, audio records, activity records. Repeated dated skin observations are close in kind, though not vital functions. No location, no camera surveillance ⇒ not 1.1/1.2. |
| 2 | Processing of **critical data**, directly-identifying data and/or data of a highly personal nature (criterion 4) | 2.1 **KRITICKÉ ÚDAJE** — **critical**; 2.2 významné údaje — significant; 2.3 běžné údaje — low | **CRITICAL.** 2.1.2 verbatim names *"o zdravotním stavu"* (health status) among special categories. Eczema observations and photos are health data. Unavoidable. |
| 3 | Processing of data that may expose data subjects to a **vulnerability-provoking environment** (criterion 7) | 3.1 stálá zranitelnost (permanent) — **critical**; 3.2 omezená zranitelnost (limited) — significant; 3.3 bez zvláštní zranitelnosti — low | **Significant.** 3.2.1 verbatim: *"Časově omezená zranitelnost (subjekty jsou zařaditelné jako členové vymezené skupiny podle toho, zda jde o migranty, nemocné, staré lidi, **děti**, mladistvé apod.)"* — time-limited vulnerability incl. the sick and **children**. 3.1's list (nationality, religion, sexual orientation, physical or mental handicap, criminal conviction) does not cover infant eczema. |
| 4 | Processing of personal data **on a large scale** (criterion 5) | 4.1 velký rozsah — **critical**; 4.2 střední rozsah — significant; 4.3 malý rozsah — low | **Low** — *conditional, see §3 "the load-bearing condition"*. |
| 5 | Processing including **video surveillance of publicly accessible areas** (criterion 3) | 5.1 public places — **critical**; 5.2 restricted/inaccessible places — significant | **Not applicable.** No CCTV. |
| 6 | Processing with **limited influence by the data subject** (criteria 9 and 1) | 6.1 cannot influence — **critical**; 6.2 limited influence — significant; 6.3 can influence — low | **Low.** 6.3 verbatim: *"Týká se zpracování, kde subjekt údajů bez problémů prosazuje svá práva daná nařízením 2016/679."* The mother holds the device and the iCloud account; she can delete everything unilaterally. Note the data subject (the infant) exercises rights via the holder of parental responsibility — see the caveat below. |
| 7 | Processing of **publicly accessible** personal data (criteria 4 and 9, partly) | 7.1 unlimited public — **critical**; 7.2 limited public — significant; 7.3 not publicly accessible — low | **Low.** 7.3: data accessible only to the controller/processor. |
| 8 | Processing in **technically complex or advanced infrastructures/platforms** (criteria 6, 5, 1, partly) | 8.1 automated expert systems incl. **AI** — **critical**; 8.2 system linked to other processing by the same controller or data from other controllers — significant; 8.3 simple or complex system without such linkage — low | **Low for v1.** 8.1 verbatim: *"Systémy sloužící k analýzám, profilování"* — systems serving analysis or profiling. v1 derives nothing. **The later AI/correlation feature flips this to CRITICAL — see below.** |
| 9 | Processing **linked to other controllers or processors** (criteria 6 and 9, partly) | 9.1 links to non-unambiguously defined controllers — **critical**; 9.2 links to unambiguously defined controllers/processors — significant; 9.3 no links — low | **Significant at most.** Apple is a single, exhaustively nameable party (9.2) — *if* Apple is a processor at all (item 4 below). If not, 9.3 = low. |
| 10 | Processing using **new technological or organisational solutions** (criterion 8) | 10.1 wholly new solution — **critical**; 10.2 new-to-this-controller solution already known elsewhere — significant; 10.3 solution the controller already has experience with, or a repeatedly-deployed off-the-shelf/turnkey solution — low | **Significant.** 10.2 verbatim: *"Jedná se pro správce o nové řešení, nebo správce může využít zkušeností jiného člena konsorcia (včetně členů v EHS) nebo jiného subjektu (například dodavatele)."* SwiftData + CloudKit is a vendor-supplied, widely-deployed stack, but new to this developer, who has no prior iOS experience (handoff §7b). Arguably 10.3 ("krabicová řešení" / turnkey). |

**Score: 1 critical, 3–4 significant.** ÚOOÚ's threshold is *two* criticals, or *one* critical plus *at least five* significants.

**⇒ On ÚOOÚ's own published method, and on the scoring above, this processing does not classify as high-risk and a DPIA is not mandatory — but see the condition immediately below, which is where the real answer lives.**

### The load-bearing condition

The whole result hangs on characteristic 4 being **low**. ÚOOÚ's own indicative figures, verbatim (p. 10–11) — note ÚOOÚ prefaces each with the EDPB's insistence that explicit quantifiers be omitted for Art. 35(6) cross-border processing, and offers them only *"jako podporu pro správce"* (as support for controllers):

> **4.1 velký rozsah:** od 10001 subjektů údajů nebo více než 1,0 ‰ populace ČR nebo dotčených států, a/nebo nad 20 přistupujících osob/zaměstnanců správce, a/nebo s více než 20 místy zpracování/pobočkami, a zároveň úroveň státu (NUTS1) z hlediska původu/umístění subjektů údajů.
> *(large: from 10,001 data subjects or >1.0‰ of the population of CZ or of the states concerned; and/or >20 persons with access/employees; and/or >20 processing locations/branches; and simultaneously state level (NUTS1) as to origin/location of data subjects.)*

> **4.2 střední rozsah:** od 5001 do 10000 subjektů údajů nebo mezi 0,5-1,0 ‰ populace […] a/nebo od 2 do 20 přistupujících osob/zaměstnanců správce, a/nebo s 5-20 místy zpracování/pobočkami, a zároveň úroveň nejméně regionu (NUTS2) nebo kraje (NUTS3) […]

> **4.3 malý rozsah:** do 5000 subjektů údajů nebo méně než 0,5 ‰ populace ČR nebo dotčených států, a/nebo do 2 přistupujících osob/zaměstnanců správce, a/nebo s 1-4 místy zpracování/pobočkami, a úroveň nejméně obce […]

Two readings, and the choice between them decides the answer:

- **Reading A (the one this document adopts).** The developer holds no data at all. The relevant count of data subjects for *the developer's own processing* is effectively zero, the number of persons with access is one, the number of processing locations is one. Small scale ⇒ characteristic 4 = **low**. This reading depends on the controller/processor analysis in §6.
- **Reading B.** Aggregate every installation: a successful international paid app crosses 10,001 users trivially, and "a zároveň úroveň státu (NUTS1)" is satisfied by an international release. Characteristic 4 = **critical** ⇒ **two criticals (2 and 4) ⇒ DPIA mandatory.**

**Reading B is not obviously wrong, and this is genuinely unsettled.** It is the same unresolved "large scale" question that the handoff already flagged, restated inside ÚOOÚ's method rather than dissolved by it. No ÚOOÚ publication found in this research addresses a controller who supplies software that processes data solely on end-users' own devices and in the end-users' own cloud accounts.

What tips toward Reading A: Recital 91 and the WP248 worked example in §2 above, plus the plain point that ÚOOÚ's own figures mix subject counts with *employees* and *branches*, which only makes sense as a measure of the controller's own operation.

What tips toward Reading B: **EDPB Guidelines 07/2020's express statement that a controller need not have access to the data** — see §6, which is where this question is actually argued out. That section is the pivot of this whole document; §3's arithmetic is downstream of it.

### Cliffs that flip the answer

Each of these, on its own, is enough to re-open the conclusion:

| Change | Effect |
|---|---|
| **AI / correlation feature** (handoff §2 defers it past v1) | Characteristic 8 → **CRITICAL** (8.1 explicitly names AI, analysis, profiling). Combined with characteristic 2 that is **two criticals ⇒ DPIA mandatory.** Also engages Art. 35(3)(a) and MDR Rule 11 (handoff §7). |
| **Any developer-operated backend, analytics, or crash reporting that carries content** | Reading A collapses; the developer processes real volumes of Art. 9 data. Characteristic 4 likely → critical. |
| **Multi-child / family sharing / any cross-account linking** | Characteristic 9 → possibly critical; characteristic 6 changes (a data subject whose data is in someone else's account has less influence). |
| **Any derived insight or "which food triggers this" surface** | Characteristic 8 → critical, plus the marketing/MDR tripwire the handoff already flags. |

---

## 4. Item 2 — does an international English-first release pull in other authorities' Art. 35(4) lists?

**Answer: no. The ÚOOÚ list is the one that binds.** This is an inference from the text rather than an express rule — see the caveat at the end.

### The chain, verbatim

[GDPR, EUR-Lex](https://eur-lex.europa.eu/eli/reg/2016/679/oj):

> **Art. 3(1).** This Regulation applies to the processing of personal data in the context of the activities of an establishment of a controller or a processor in the Union, regardless of whether the processing takes place in the Union or not.

A CZ-established developer is caught by Art. 3(1) (establishment limb), **not** Art. 3(2) (which by its terms applies only to a controller "not established in the Union"). Consequence: no Art. 27 EU-representative obligation, and the one-stop-shop is available.

> **Art. 55(1).** Each supervisory authority shall be competent for the performance of the tasks assigned to and the exercise of the powers conferred on it in accordance with this Regulation **on the territory of its own Member State**.

> **Art. 56(1).** Without prejudice to Article 55, the supervisory authority of the main establishment **or of the single establishment** of the controller or processor shall be competent to act as lead supervisory authority for the cross-border processing carried out by that controller or processor in accordance with the procedure provided in Article 60.

> **Art. 56(6).** The lead supervisory authority shall be **the sole interlocutor** of the controller or processor for the cross-border processing carried out by that controller or processor.

Art. 4(16) defines "main establishment" only for a controller with establishments in *more than one* Member State, so for a single-establishment controller the Art. 56(1) "single establishment" limb applies directly. Recital 36 adds that *"The presence and use of technical means and technologies for processing personal data or processing activities do not, in themselves, constitute a main establishment"* — so iCloud/CloudKit datacentre location is irrelevant to establishment.

Art. 35(4) obliges "**the** supervisory authority" (singular) to publish a list; Art. 55(1) confines each authority's competence to its own territory. Art. 35(6) is the mechanism that handles the cross-border problem — it requires the competent authority to run the list through the Art. 63 consistency mechanism *before adopting it*, rather than requiring controllers to consult 30 lists.

### EDPB Guidelines 8/2022 (supersedes WP244 rev.01)

[Guidelines 8/2022 on identifying a controller or processor's lead supervisory authority, v2.1 (28 Sep 2023)](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-82022-identifying-controller-or-processors-lead_en) — PDF: <https://www.edpb.europa.eu/system/files/documents/2023-04/edpb_guidelines_202208_identifying_lsa_targeted_update_v2_en.pdf>

> Any reference to the WP29 Guidelines for identifying a controller or processor's lead supervisory authority (WP244 rev.01) should, from now on, be interpreted as a reference to these EDPB guidelines. (para. 1)

> Identifying the lead supervisory authority depends on determining the location of the controller's 'main establishment' **or 'single establishment'** in the EU. (para. 16)

> The GDPR's cooperation and consistency mechanisms only apply to controllers with an establishment, or establishments, within the EEA. If a company does not have an establishment in the EEA, the mere presence of a representative in a Member State does not trigger the one-stop-shop principle. This means that controllers **without any establishment in the EEA must deal with local supervisory authorities in every Member State they are active in**, through their local representative. (para. 49)

That last passage is the *negative* case — and this developer falls on the favourable side of it precisely because he is established in Czechia. **This is a concrete benefit of the owner's CZ establishment that should not be given up lightly.**

Guidelines 8/2022 para. 12, on whether processing "substantially affects" data subjects in more than one Member State (Art. 4(23)(b), the definition of cross-border processing for a single-establishment controller), expressly lists among the relevant factors processing that *"affects, or is likely to affect individuals' health, well-being or peace of mind"* and that *"involves the analysis of the special categories of personal or other intrusive data, particularly the personal data of children"*. Both are present here — so **if** the developer is a controller at all, this is cross-border processing and the one-stop-shop is engaged.

### EDPB Opinion 4/2018 on the Czech list — the lists are deliberately not uniform

[Opinion 4/2018](https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-42018-draft-list-competent-supervisory_en) — PDF: <https://www.edpb.europa.eu/sites/default/files/files/file1/2018-09-25-opinion_2018_art._64_cz_sas_dpia_list_en.pdf>

> Even though the GDPR **doesn't impose a single list**, it does promote consistency. (Whereas 1)

> While the draft lists of the competent supervisory authorities are subject to the consistency mechanism, **this does not mean that the lists should be identical**. The competent supervisory authorities have a margin of discretion with regard to the national or regional context and should take into account their local legislation. **The aim of the EDPB assessment/opinion is not to reach a single EU list** but rather to avoid significant inconsistencies that may affect the equivalent protection of the data subjects. (Whereas 3)

> The Board has noted that several supervisory authorities have included in their lists some types of processing which are necessarily local processing. Given that **only cross border processing and processing that may affect the free flow of personal data and data subjects are concerned by Article 35.6**, the Board will not comment on those local processing. (§2.1)

> The submitted draft list by the Supervisory Authority of the Czech Republic relates to the offering of goods or services to data subjects, relates to the monitoring of their behaviour in several Member States and/or may substantially affect the free movement of personal data within the Union mainly because the processing operations in the submitted draft list **are not limited to data subjects in this country**. (§2.2)

So the ÚOOÚ list has *already* been through the Art. 63 consistency mechanism precisely because it covers cross-border offering of services. That is the design: consistency is achieved upstream, at list adoption, not downstream by making controllers read every list.

### Caveat — stated plainly

**No GDPR article says in so many words "only your lead authority's Art. 35(4) list applies to you."** The conclusion above is an inference from Art. 55(1) + 56(1) + 56(6) + the design of Art. 35(6), corroborated by EDPB Opinion 4/2018. No EDPB guidance stating it directly was found. Other Member States' lists are best treated as **persuasive risk indicators, not binding instruments** — and if a national list contained something markedly stricter that applied on these facts, that would be worth knowing even if it does not bind. That cross-check was not performed here; see the open item in §9.

---

## 5. Item 3 — what Art. 30 records must actually contain here

### The checklist, verbatim

> **Art. 30(1).** Each controller and, where applicable, the controller's representative, shall maintain a record of processing activities under its responsibility. That record shall contain all of the following information:
> (a) the name and contact details of the controller and, where applicable, the joint controller, the controller's representative and the data protection officer;
> (b) the purposes of the processing;
> (c) a description of the categories of data subjects and of the categories of personal data;
> (d) the categories of recipients to whom the personal data have been or will be disclosed including recipients in third countries or international organisations;
> (e) where applicable, transfers of personal data to a third country or an international organisation, including the identification of that third country or international organisation and, in the case of transfers referred to in the second subparagraph of Article 49(1), the documentation of suitable safeguards;
> (f) where possible, the envisaged time limits for erasure of the different categories of data;
> (g) where possible, a general description of the technical and organisational security measures referred to in Article 32(1).

> **Art. 30(3).** The records referred to in paragraphs 1 and 2 shall be **in writing, including in electronic form**.

> **Art. 30(4).** The controller or the processor … shall make the record available to the supervisory authority **on request**.

(a)–(e) are unconditional. (f) and (g) are qualified by "where possible" — which for a greenfield app you control is not much of an escape.

### How far the Art. 30(5) exemption actually fails

The handoff records that the SME exemption "fails" for Art. 9 data. The precise scope is narrower and worth having right.

[WP29 Position Paper on the derogations from the obligation to maintain records of processing activities pursuant to Article 30(5) GDPR, 19 April 2018](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/position-paper-derogations-obligation-maintain-records_en) — PDF: <https://ec.europa.eu/newsroom/article29/redirection/document/51422> — endorsed by the EDPB:

> The WP29 underlines that the wording of Article 30(5) is clear in providing that the three types of processing to which the derogation does not apply are **alternative ("or")** and the occurrence of **any one of them alone** triggers the obligation to maintain the record of processing activities.

> However, such organisations need only maintain records of processing activities **for the types of processing mentioned by Article 30(5)**.

> Other processing activities which are in fact "occasional", however, **do not need to be included** in the record of processing activities, provided they are unlikely to result in a risk to the right and freedoms of data subjects and do not involve special categories of data…

> (fn. 1) The WP29 considers that a processing activity can only be considered as "occasional" if it is **not carried out regularly, and occurs outside the regular course of business** or activity of the controller or processor.

**So: the exemption fails *for the qualifying processing*, not globally.** In practice that distinction gives this app nothing — its core processing is simultaneously non-occasional *and* Art. 9 *and* likely to result in a risk. It must be recorded. A genuinely one-off, non-risky, non-Art. 9 activity (a support email) need not be.

### ÚOOÚ's own position on records

[ÚOOÚ, "Základní příručka k ochraně údajů"](https://uoou.gov.cz/verejnost/zakladni-prirucka-k-ochrane-udaju), verbatim:

> **Není stanovena forma těchto záznamů** a je předpoklad, že záznamy o činnostech zpracování se budou lišit i v závislosti na rozpětí prováděného zpracování. Nezbytné minimum záznamů je uvedeno v článku 30 odst. 1 obecného nařízení.
> *(No form for these records is prescribed, and it is expected that they will differ depending on the range of processing carried out. The necessary minimum is stated in Article 30(1).)*

> **Tato výjimka je však v praxi neuskutečnitelná z důvodu, že každé zpracování není příležitostné. Proto, pokud nejde o malé správce, by měli mít záznamy vypracovány správci a zpracovatelé nehledě na tuto výjimku.**
> *(This exemption is, however, unworkable in practice, because not every processing is occasional. Therefore, unless they are small controllers, controllers and processors should have records prepared regardless of this exemption.)*

The page also says *"Základní vzor k vyplnění můžete nalézt zde"* ("a basic template to fill in can be found here") — but **"zde" is plain text with no hyperlink in the current page; the general template link is dead.** No general-purpose Art. 30 `vzor` was located on uoou.gov.cz.

What ÚOOÚ still hosts is a **topic-specific** template — <https://uoou.gov.cz/media/clanky/dokumenty/2-zaznamy-o-cinnostech-zpracovani-1.doc>, *"Příloha č. 2 — VZOR — Záznamy o činnostech zpracování — čl. 30 odst. 1 obecného nařízení"*, 29 March 2021. Its substance is a worked example for mandatory COVID-19 employee testing and is useless here, **but its section skeleton is directly reusable** and is the closest thing to an ÚOOÚ-sanctioned shape:

- `I. Správce, účely zpracování, právní základ` — controller, purposes, legal basis
- `II. Kategorie subjektů údajů` — categories of data subjects
- `III. Kategorie osobních údajů` — categories of personal data
- `IV. Kategorie příjemců` — categories of recipients (incl. an express statement on third-country recipients)
- `V. Plánované lhůty pro výmaz jednotlivých kategorií osobních údajů` — erasure time limits
- `VI. Obecný popis technických a organizačních bezpečnostních opatření` — general description of technical and organisational security measures

### What this app's record would concretely have to say

This is a sketch of the shape, not a drafted record:

| Art. 30(1) item | What has to be answered here |
|---|---|
| (a) contact details | The developer's own name and contact details. Note this interacts with **App Store DSA trader status** (handoff §7), which already forces a published address, phone and email — so this is not new exposure. Where a DPO is not designated, (a) is satisfied by omitting it ("where applicable"). |
| (b) purposes | "Recording of an infant's meals and skin observations by the parent, for the parent's own reference." **Written narrowly, this is also the MDR-defence artefact** — it is a statement of intended purpose, and MDCG 2019-11 assesses device status from intended purpose (handoff §7). Do not write anything here that a marketing page could not also say. |
| (c) categories | Data subjects: the infant (a child), and the parent as account holder. Personal data: **special categories under Art. 9(1) — data concerning health** (skin observations, photographs of skin), plus food/meal records and timestamps. |
| (d) recipients | The genuinely awkward one. Either "none" (Reading 1, §6) or "Apple Distribution International Ltd., Ireland, as processor / as controller of the iCloud storage layer" (Reading 2). **Answer it factually and show the reasoning** rather than asserting a clean processor relationship the ADPLA does not clearly establish. |
| (e) third-country transfers | Depends on where the user's iCloud data resides, which Apple determines. ADPLA Att. 4 §3.6(f): *"Encrypted Personal Data may be stored at Apple's geographic discretion"*; §3.6(g) offers Model Contract Clauses *"upon request"*. Record what is actually known and say what is not. |
| (f) erasure time limits | v1 has none — data lives until the user deletes it. That is a *defensible* answer ("retained until deleted by the user; deletion is under the user's sole control, locally and in their own iCloud account") but it has to be written down as a decision, not left blank. |
| (g) security measures | On-device storage; CloudKit private database in the user's own account; `encryptedValues` on the health fields (see §6); no developer-operated backend; no analytics. Cross-reference Art. 32(1). |

**Practical note:** for a controller in this position, the Art. 30 record and the WP248-mandated "documented reasons for not carrying out a DPIA" (§2) are naturally the same short document, written once and kept current. That is the whole compliance artefact — a handful of pages, not a programme.

### DPO — Art. 37(1)(c)

> **Art. 37(1).** The controller and the processor shall designate a data protection officer in any case where: … (c) **the core activities** of the controller or the processor consist of processing **on a large scale** of special categories of data pursuant to Article 9…

Two cumulative conditions. **"Core activities" is plainly met** — health data is the entire point of the app. **"Large scale" is the same open question as everywhere else in this document**, and it turns on the controllership reading in §6. Recital 91's "individual physician" sentence is the only primary-source steer on the concept, and it is textually about Art. 35, not Art. 37 — using it here is interpretive.

Under Reading 1, no DPO. Under Reading 2 at scale, Art. 37(1)(c) starts to bite, and a solo individual developer designating himself as his own DPO runs into Art. 38(3) ("shall not receive any instructions", "shall directly report to the highest management level") and Art. 38(6) (conflict of interests). **No primary source was found giving a numeric threshold for Art. 37(1)(c) "large scale".** Flagging rather than resolving.

Note that Art. 37 is not what makes Art. 30 apply — Art. 30(1)(a) requires DPO contact details only "where applicable".

---

## 6. Item 4 — does CloudKit private DB change the controller/processor analysis?

**Short answer: no — and this is the most consequential finding in this document.** CloudKit private DB removes the developer's *access* to the data. EDPB guidance says twice, in terms, that access is irrelevant to controllership. Everything in §3 that leant on "the developer processes nothing" has to be re-read in that light.

### The tests, verbatim

> **Art. 4(7).** 'controller' means the natural or legal person, public authority, agency or other body which, **alone or jointly with others, determines the purposes and means** of the processing of personal data…

> **Art. 4(8).** 'processor' means a natural or legal person, public authority, agency or other body which processes personal data **on behalf of** the controller;

> **Art. 28(1).** Where processing is to be carried out on behalf of a controller, the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures…

> **Art. 28(3).** Processing by a processor shall be governed by a contract or other legal act … that sets out the subject-matter and duration of the processing, the nature and purpose of the processing, the type of personal data and categories of data subjects and the obligations and rights of the controller. [followed by (a)–(h)]

### EDPB Guidelines 07/2020 — access is not the test

[Guidelines 07/2020 on the concepts of controller and processor in the GDPR, v2.1, adopted 7 July 2021 (minor corrections 20 Sep 2022)](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en) — PDF: <https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf>

> A controller determines the purposes and means of the processing, i.e. the why and how of the processing. The controller must decide on both purposes and means. However, some more practical aspects of implementation ("non-essential means") can be left to the processor.

> "Essential means" are means that are closely linked to the purpose and the scope of the processing, such as **the type of personal data which are processed** … **the duration of the processing** … **the categories of recipients** … and **the categories of data subjects** … "Non-essential means" concern more practical aspects of implementation, such as the choice for a particular type of hard or software or the detailed security measures which may be left to the processor to decide on.

And the passage that matters most here:

> **It is not necessary that the controller actually has access to the data that is being processed.** Someone who outsources a processing activity and in doing so, has a determinative influence on the purpose and (essential) means of the processing … is to be regarded as controller **even though he or she will never have actual access to the data**.

Two examples worth having on file:

> *Example: standardised cloud storage service.* … The service is completely standardised, with customers having little or no ability to customise the service. The terms of the contract are determined and drawn up unilaterally by the cloud service provider, provided to the customer on a "take it or leave it basis". Company X decides to make use of the cloud provider to store personal data concerning its customers. **Company X will still be considered a controller, given its decision to make use of this particular cloud service provider in order to process personal data for its purposes.** Insofar as the cloud service provider does not process the personal data for its own purposes and stores the data solely on behalf of its customers and in accordance with instructions, the service provider will be considered as a processor.

> *Example: Hosting services.* Employer A hires hosting service H **to store encrypted data** on H's servers. … As storage is one example of a personal data processing activity, the hosting service H is processing personal data on employer A's behalf and is therefore a processor. Employer A must provide the necessary instructions to H **and a data processing agreement according to Article 28 must be concluded**…

Note that these examples share a shape: a controller *outsources its own* processing. **No retrieved source addresses a software vendor whose product processes data solely on the end-user's own device, in the end-user's own cloud account, for the end-user's own purposes.** That gap is the honest core of the uncertainty below.

### The household exemption and Recital 18

> **Art. 2(2).** This Regulation does not apply to the processing of personal data: … (c) **by a natural person in the course of a purely personal or household activity;**

> **Recital 18.** … Personal or household activities could include correspondence and the holding of addresses, or social networking and online activity undertaken within the context of such activities. **However, this Regulation applies to controllers or processors which provide the means for processing personal data for such personal or household activities.**

The *mother* logging her infant's data is squarely within Art. 2(2)(c). Recital 18's last sentence is what reaches the developer — but note precisely what it says: the Regulation "applies to" means-providers. It does not say a means-provider is a *controller of the household data*. The developer's status as a natural person is irrelevant; what disqualifies him from Art. 2(2)(c) is the commercial connection.

### The two readings — and why this is genuinely unsettled

| | **Reading 1 — developer is not a controller of user content** | **Reading 2 — developer is a controller** |
|---|---|---|
| Purposes | Determined by the mother; she decides what to log and why | Determined by the developer, who defines the schema, the nine regions, the four levels, what a "meal" is |
| Essential means (EDPB 07/2020: data types, duration, recipients, categories of data subjects) | The mother chooses to install, chooses what to enter, chooses retention by deleting | The developer fixes the data model, the retention behaviour and the recipient (Apple) in code; the user cannot vary them |
| Access | None. Private DB is not visible in the developer portal | Irrelevant per EDPB 07/2020 |
| Household exemption | Art. 2(2)(c) covers the actual processing; the developer merely supplies a tool | Recital 18 final sentence pulls the means-provider in |
| Support | Symmetry with any offline note-taking or spreadsheet app; no data ever leaves the user's control | EDPB 07/2020's express "access is not necessary"; the developer's determinative influence over the schema |

**Neither reading is settled by a primary source found in this research.** Reading 1 is the intuitive one and is probably how most local-first apps operate in practice. Reading 2 is the one that follows most directly from the EDPB text as written. A supervisory authority applying Guidelines 07/2020 literally would have a straightforward route to Reading 2.

### Consequence for §3 — this cuts against the "no DPIA" conclusion

§3 scored ÚOOÚ characteristic 4 (large scale) as **low**, on the basis that the developer's own processing involves effectively zero data subjects. **That holds under Reading 1 only.** Under Reading 2 the developer is a controller of every installed instance's data, and a successful international paid app passes ÚOOÚ's 4.1 threshold — "from 10,001 data subjects … and simultaneously state level (NUTS1) as to origin/location of data subjects" — without difficulty. Characteristic 4 then reads **critical**, joining characteristic 2 (health data), and ÚOOÚ's own rule ("two or more characteristics reach critical ⇒ DPIA") makes a **DPIA mandatory**.

So the DPIA answer is not really decided by the ÚOOÚ list at all. It is decided by the controllership question, which the ÚOOÚ list does not address and which no source found here resolves. See §9 for what this means practically.

### Apple's role — what is and is not published

**There is no standalone Apple Data Processing Addendum for App Store developers.** <https://developer.apple.com/terms/> lists the Apple Developer Program License Agreement, Paid Applications Agreement, Enterprise agreements, Apple Developer Agreement, Xcode and Apple SDKs Agreement, App Store Connect ToS, TestFlight T&Cs and the Developer Forums Agreement. No DPA, no GDPR data-processing agreement.

What Apple does publish is an **embedded Art. 28-style clause** in the [Apple Developer Program License Agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/), **Attachment 4 (Additional Terms for the use of iCloud), §3.6**:

> …to the extent that You store any personal information … in the iCloud service through the use of the iCloud Storage APIs or CloudKit APIs, **You agree that Apple … will act as Your agent for the processing, storage and handling of any such Personal Data.** … **Apple shall have no right, title or interest in such Personal Data solely as a result of Your use of the iCloud service.** … Apple shall:
> (a) use and handle such Personal Data only in accordance with the instructions and permissions from You set forth herein … **In the EEA and Switzerland, Personal Data will be handled by Apple only in accordance with the instructions and permissions from You set forth herein unless otherwise required by European Union or Member State Law**…
> […] **make available to You the information necessary to demonstrate compliance obligations set forth in Article 28 of Regulation (EU) 2016/679 … and to allow for and contribute to audits required under these provisions; provided however that You agree that Apple's ISO 27001 and 27018 certifications shall be considered sufficient for such required audit purposes;**
> […] **assist You, by any reasonable means Apple selects, in ensuring compliance with its obligations pursuant to Articles 33 to 36 of the GDPR.** …
> […] **ensure that where Personal Data … is transferred from the EEA or Switzerland it is only to a third country that ensures an adequate level of protection or using the Model Contract Clauses … which will be provided to You upon request**…

Gaps against Art. 28(3), worth knowing rather than acting on: no explicit sub-processor authorisation regime (Art. 28(2)/(4)); no delete-or-return-at-the-controller's-choice obligation (Art. 28(3)(g)); the audit right is pre-satisfied by certification; the SCCs are furnished on request rather than published.

**And a trigger problem.** §3.6 is engaged where "**You** store … Personal Data in the iCloud service". In a private-database-only design the *user's device*, on the *user's own account*, writes to the *user's own* container. Apple separately undertakes in **§3.5** not to touch it:

> Apple may monitor and collect information … about usage of the iCloud service … provided however that **Apple will not access or disclose any end user data stored in a private container through CloudKit** … unless Apple has a good faith belief that such access … is reasonably necessary to comply with a legal or regulatory process or request, or unless otherwise requested by an end user…

and in **§1.2** confirms the data outlives the developer relationship:

> You understand that You will not be permitted to access or use the iCloud service … after expiration or termination of Your Agreement; **however end users who have Your Applications … installed and who have a valid end user account with Apple to use iCloud may continue to access their user-generated documents, private containers and files** … You agree not to interfere with an end user's ability to access iCloud…

Meanwhile Apple is a **controller in its own right** toward the end user: the [iCloud Terms of Service](https://www.apple.com/legal/internet-services/icloud/en/terms.html) name **Apple Distribution International Ltd.** (Cork, Ireland) as the EEA contracting party, and the [Apple Privacy Policy](https://www.apple.com/legal/privacy/en-ww/) states that *"Personal data relating to individuals in the European Economic Area, the United Kingdom, and Switzerland is controlled by Apple Distribution International Limited in Ireland."*

**Apple's published text does not reconcile these two roles for the CloudKit private-database case.** Either reading is arguable; neither disturbs the developer's own position. The Art. 30 record should **describe the arrangement factually** rather than assert a clean processor relationship it cannot substantiate.

### Factual position on the private database — from Apple's own docs

[`CKContainer.privateCloudDatabase`](https://developer.apple.com/documentation/CloudKit/CKContainer/privateCloudDatabase):

> The user's private database is only available if the device has an iCloud account. **Only the user can access their private database, by default. They own all of the database's content and can view and modify that content. Data in the private database isn't visible in the developer portal.**
>
> **Data in the private database counts toward the user's iCloud storage quota.**

| Question | Answer |
|---|---|
| Whose storage quota? | The **user's** |
| Can the developer read it? | **No** — not visible in the developer portal |
| Can Apple read it? | **Yes**, under standard data protection, for fields not placed in `encryptedValues` (Apple holds the keys). **No** for `encryptedValues` fields and for `CKAsset`s, and no for third-party app data generally once **Advanced Data Protection** is enabled |
| Does the data survive the developer? | Yes (ADPLA Att. 4 §1.2) |
| Does Apple claim rights over it? | No (ADPLA Att. 4 §3.6) |

[iCloud data security overview](https://support.apple.com/en-us/102651) (published 5 Jan 2026):

> **Standard data protection** is the default setting for your account. Your iCloud data is encrypted, **the encryption keys are secured in Apple data centers so we can help you with data recovery**, and only certain data is end-to-end encrypted.

> **Third-party app data** — Third-party app data stored in iCloud is always encrypted in transit and on server. **When you turn on Advanced Data Protection, third-party app data stored in iCloud Backup and CloudKit encrypted fields and assets are end-to-end encrypted.**

[Encrypting user data](https://developer.apple.com/documentation/cloudkit/encrypting-user-data):

> **CloudKit encrypts data with the key material in the user's iCloud Keychain. If the user loses access to iCloud Keychain, CloudKit can't access the key material that it previously used to encrypt the data, so iCloud can't decrypt it.**
>
> Use the `encryptedValues` property to set a field on a `CKRecord` that instructs CloudKit to automatically encrypt data while writing, and decrypt it while reading. … However, there's **no encryption support for [reference] objects because they need to be visible to the server**. CloudKit encrypts `CKAsset` by default so you can't set it as a value for the `encryptedValues` property.

**Two concrete engineering consequences, straight from primary sources:**

1. **Put the eczema fields in `record.encryptedValues`.** Skin levels, region codes, food IDs, notes. Photos are `CKAsset`s and are encrypted by default. Fields left untagged, and all `CKReference`s, are readable by Apple under standard data protection. This is exactly the "appropriate technical and organisational measures" of Art. 32 and the "data protection by design" of Art. 25(1), and it costs almost nothing at schema-design time — but it is very expensive to retrofit after data exists. **Decide this before the first CloudKit schema ships.** Note it does *not* help with the DPIA threshold: ÚOOÚ's method expressly forbids crediting mitigations at the classification stage (§3).
2. **Apple's own export does not cover you.** [Allowing users to manage data](https://developer.apple.com/icloud/allowing-users-to-manage-data/): *"**Data stored in third-party CloudKit containers are not included in any export that Apple provides. Developers should provide their own method for users to get a copy of data stored in their CloudKit containers.**"* Apple frames data-subject rights as the developer's job — which is itself a data point in favour of Reading 2 above.

---

## 7. Item 5 — Art. 20 portability: what a compliant export must contain

**Headline: Art. 20 most likely imposes no obligation on this app at all. The export feature is a product and trust decision, not a compliance one.** But if it is built, WP242's spec is cheap to hit and worth hitting — so build to it.

### Art. 20 verbatim

> **1.** The data subject shall have the right to receive the personal data concerning him or her, **which he or she has provided to a controller**, in a **structured, commonly used and machine-readable format** and have the right to transmit those data to another controller without hindrance from the controller to which the personal data have been provided, **where:**
> (a) the processing is based on **consent** pursuant to point (a) of Article 6(1) or point (a) of Article 9(2) or on a **contract** pursuant to point (b) of Article 6(1); **and**
> (b) the processing is carried out by **automated means**.
>
> **2.** In exercising his or her right to data portability pursuant to paragraph 1, the data subject shall have the right to have the personal data transmitted directly from one controller to another, **where technically feasible**.
>
> **3.** The exercise of the right referred to in paragraph 1 of this Article shall be without prejudice to Article 17. That right shall not apply to processing necessary for the performance of a task carried out in the public interest or in the exercise of official authority vested in the controller.
>
> **4.** The right referred to in paragraph 1 shall not adversely affect the rights and freedoms of others.

### Why it probably does not bite here

Three independent gates, all of which must be passed before Art. 20 obliges anything:

1. **Is there a controller and any data it holds?** If the developer holds nothing (see §6), Art. 20's object is empty. Art. 20 obliges a controller to hand over data *it processes*; it does not oblige anyone to build an exporter for data sitting in the user's own iCloud account. Separately, the *mother's* own processing is outside GDPR entirely under Art. 2(2)(c) / Recital 18.
2. **Legal-basis gate.** Art. 20(1)(a) is exhaustive. WP242 rev.01, verbatim: *"**The GDPR does not establish a general right to data portability for cases where the processing of personal data is not based on consent or contract.**"* Whether an Art. 6(1)(b) contract exists between the developer and the user — as opposed to between Apple (merchant of record) and the user — is a factual question that no GDPR source answers. **Unresolved.**
3. **Automated means** — this one is trivially satisfied.

### If built anyway — the WP242 spec

[WP29 Guidelines on the right to data portability, WP242 rev.01](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-right-data-portability-under-regulation-2016679_en) (adopted 13 Dec 2016, rev. 5 Apr 2017, **endorsed by the EDPB 25 May 2018**) — PDF: <https://ec.europa.eu/newsroom/document.cfm?doc_id=44099>

**What's in scope — "provided by" reads broadly and includes observed data:**

> data 'provided by' the data subject **also result from the observation of his activity**. As a consequence, the WP29 considers that to give its full value to this new right, 'provided by' should also include the personal data that are observed from the activities of users such as raw data processed by a smart meter or other types of connected objects, activity logs, history of website usage or search activities.

> Two categories: — Data **actively and knowingly provided** by the data subject … — **Observed data** provided by the data subject by virtue of the use of the service or the device. … It may also include **other raw data such as the heartbeat tracked by a wearable device**.

> (fn. 21) Data collected through the tracking and recording of the data subject (**such as an app recording heartbeat** …) should also be considered as 'provided by' him or her even if the data are not actively or consciously transmitted.

⇒ **meals, skin observations, photos and their timestamps are all in scope.**

**What's out of scope — derived and inferred data:**

> In contrast, **inferred data and derived data are created by the data controller** on the basis of the data 'provided by the data subject'. For example, **the outcome of an assessment regarding the health of a user** … cannot in themselves be considered as 'provided by' the data subject … and thus will not be within scope of this new right.

> any personal data which have been created by the data controller as part of the data processing, e.g. by a personalisation or recommendation process, by user categorisation or profiling are data which are derived or inferred … and are **not** covered by the right to data portability.

⇒ **The future derived-insight engine (#468) is expressly excludable from an Art. 20 export.** Route it to Art. 15 instead (WP242 fn. 20 makes this routing explicit).

**Format:**

> The terms 'structured', 'commonly used' and 'machine-readable' are a set of **minimal requirements** … 'structured, commonly used and machine readable' are **specifications for the means, whereas interoperability is the desired outcome**.

> **the GDPR does not impose specific recommendations on the format** … **formats that are subject to costly licensing constraints would not be considered an adequate approach.**

> Where no formats are in common use for a given industry or given context, data controllers should provide personal data using **commonly used open formats (e.g. XML, JSON, CSV,…) along with useful metadata at the best possible level of granularity**, while maintaining a high level of abstraction. As such, **suitable metadata should be used in order to accurately describe the meaning of exchanged information. This metadata should be enough to make the function and reuse of the data possible**…

> **It is unlikely therefore that providing an individual with PDF versions of an email inbox would be sufficiently structured or descriptive** to allow the inbox data to be easily re-used.

> it is crucial that the individual is in a position to **fully understand the definition, schema and structure** of the personal data.

Machine-readable, per Recital 21 of Directive 2013/37/EU as quoted by WP242:

> a file format structured so that software applications can easily identify, recognize and extract specific data … **Documents encoded in a file format that limits automatic processing, because the data cannot, or cannot easily, be extracted from them, should not be considered to be in a machine-readable format.**

And a warning worth heeding:

> processing additional metadata for the sole purpose that they might be needed or wanted to answer a data portability request **poses no legitimate ground for such processing**.

### Concrete shape for the export ticket

Directly derivable from the above, and it changes the planned "CSV/PDF export" (handoff §4):

| Requirement | Source | Implication for this app |
|---|---|---|
| Open, non-proprietary, machine-readable | WP242 §V | **JSON or CSV.** PDF alone does **not** satisfy Art. 20 — WP242 names PDF as the counter-example. Keep PDF as the *human-readable* export; it satisfies Art. 15(3)'s weaker "commonly used electronic form", not Art. 20. |
| Observed data included | WP242 fn. 21 | All meals, all skin observations (all nine regions, all levels), all photos, all timestamps. |
| Derived data excludable | WP242 §III | The #468 insight engine's outputs need not be in the Art. 20 export. |
| Schema comprehensible to the user | WP242 §V | Ship a documented schema — a `README`/manifest inside the export archive naming each field, its units and its enum values (e.g. the four skin levels, the nine regions). This is the piece most likely to be skipped. |
| Photos | WP242 §V ("high level of abstraction from any internal or proprietary format") | Original image files in the archive, referenced by ID from the structured records — not base64 inlined, not re-encoded into a proprietary blob. |
| Metadata minimalism | WP242 §V | Do not start collecting extra data *in order to* have it exportable. |

### Art. 15(3) is a separate and, here, more robust obligation

> **Art. 15(3).** The controller shall provide a copy of the personal data undergoing processing. … Where the data subject makes the request by electronic means, and unless otherwise requested by the data subject, the information shall be provided in a **commonly used electronic form**.

Differences that matter:

- **No legal-basis gate** — Art. 15 applies whatever the Art. 6/9 basis, so it survives where Art. 20 fails on 20(1)(a). It still requires a controller holding data.
- **Wider data scope** — covers *all* personal data undergoing processing, including the derived/inferred data Art. 20 excludes.
- **Weaker format duty** — "commonly used electronic form" ≠ "structured, commonly used and machine-readable". A PDF that would fail Art. 20 can satisfy Art. 15(3).

Current EDPB guidance is [Guidelines 01/2022 on data subject rights — Right of access](https://www.edpb.europa.eu/system/files/2023-04/edpb_guidelines_202201_data_subject_rights_access_v2_en.pdf). **Not read for this ticket** — see §9.

---

## 8. What compliance concretely requires — consolidated

Assuming the developer is a controller (the safe assumption, per §6), and setting aside the non-GDPR obligations the handoff already records (MDR, PLD, App Store 5.1.1(ix)/5.1.3(ii), DSA trader status, § 2898 OZ):

| # | Obligation | Source | Status here |
|---|---|---|---|
| 1 | **Record of processing activities**, Art. 30(1)(a)–(g), in writing/electronic form, producible to ÚOOÚ on request | Art. 30(1),(3),(4); WP29 19 Apr 2018; ÚOOÚ | **Mandatory.** SME exemption fails. §5 gives the shape. |
| 2 | **Documented assessment of whether a DPIA is needed** — and, if the answer is no, the reasons | WP248 rev.01 | **Mandatory.** Same document as #1 in practice. |
| 3 | **DPIA** per Art. 35(7) | Art. 35(1),(7) | **Genuinely unsettled** (§3, §6). Recommended regardless: it is the only position correct under both readings, and it becomes unambiguously mandatory the moment any derived-insight/AI feature ships. |
| 4 | **Lawful basis for Art. 9 processing** | Art. 9(2) | Not analysed in this ticket — flagged in §9. Art. 9(2)(a) explicit consent is the only realistic limb; 9(2)(h) requires a health professional under an obligation of secrecy (Art. 9(3)) and is not available. |
| 5 | **Transparency / privacy notice**, Art. 13 | Art. 13 | Required, and independently required as an App Store privacy policy URL. |
| 6 | **Data protection by design and by default**, Art. 25 | Art. 25(1),(2) | Concretely: `encryptedValues` on health fields; no analytics; no data leaving the device except to the user's own iCloud. |
| 7 | **Security of processing**, Art. 32 | Art. 32(1) | Same measures; describe them in #1(g). |
| 8 | **Breach notification**, Arts. 33–34 | Arts. 33, 34 | A plan, not an artefact. Note Apple's Att. 4 §3.6 undertakes to notify the developer and to assist with Arts. 33–36. |
| 9 | **Data subject rights machinery** — Arts. 15, 16, 17, 20 | Chapter III | Art. 17 erasure is satisfied by in-app delete + the user's control of their own iCloud account. Art. 15(3) copy is the robust one; Art. 20 probably does not bite (§7). Apple expressly does **not** cover third-party CloudKit containers in its own exports. |
| 10 | **DPO** | Art. 37(1)(c) | Probably not required; scale-dependent and unresolved (§5). |
| 11 | **Art. 27 EU representative** | Art. 27 | **Not required** — the developer is established in the Union (Art. 3(1)), so Art. 27 never engages. |
| 12 | **Lead supervisory authority** | Arts. 55, 56 | **ÚOOÚ, sole interlocutor** (§4). A concrete benefit of CZ establishment. |

The realistic total is **one short document** (records + DPIA-or-why-not), **one privacy notice**, **a handful of schema-level engineering decisions**, and **one deliberate choice of Art. 9 lawful basis**. That is proportionate to a solo developer, and materially smaller than the MDR and PLD exposure the handoff already records.

---

## 9. Open items this research did not close

Candidates for new map tickets:

1. **Controllership of local-first apps (§6) — the biggest one.** Whether a developer whose software processes data solely on the user's device and in the user's own iCloud account is a controller of that data. Everything else keys off it: the DPIA answer, the Art. 30 record's recipients field, DPO applicability, and whether Art. 20 bites at all. Not resolved by any source found. Worth a direct enquiry to ÚOOÚ — which is free, and which the Art. 56(6) "sole interlocutor" position makes straightforward.
2. **Art. 9(2) lawful basis.** Not in this ticket's scope and not analysed. Art. 9(2)(a) explicit consent appears to be the only available limb; 9(2)(h) is closed off by Art. 9(3)'s professional-secrecy requirement. Interacts with Art. 8 (child's consent — the data subject is an infant, so the holder of parental responsibility acts) and with Art. 20's legal-basis gate (§7). **This should be a ticket.**
3. **Whether a *contract* exists between developer and user** (Apple as merchant of record), which decides Art. 6(1)(b) and therefore Art. 20 applicability. A commercial/factual question, not a GDPR-source question.
4. **Cross-check of other Member States' Art. 35(4) lists** as persuasive risk indicators. §4 concludes they do not bind; it does not check whether any is markedly stricter on these facts. The EDPB register is the index: <https://www.edpb.europa.eu/registers/register-of-consistency-and-of-accountability-tools/data-protection-impact-assessment_en>
5. **EDPB Guidelines 01/2022 on the right of access** — surfaced but not read. Relevant to the Art. 15(3) export shape (§7).
6. **WP29 WP243 (DPO guidelines)** — the non-quantitative "large scale" factors for Art. 37 were not extracted.
7. **`encryptedValues` schema decision (§6)** — an engineering ticket, and time-sensitive: it must land before the first CloudKit schema ships.
8. **ÚOOÚ's general Art. 30 template link is dead** on their own site (§5). Nothing to fix on our side, but worth noting that no authority-blessed general template exists to copy.

---

## 10. Sources

All URLs checked during this research (2026-08-13).

**Regulation text**
- Regulation (EU) 2016/679 (GDPR) — <https://eur-lex.europa.eu/eli/reg/2016/679/oj> · HTML: <https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679>

**EDPB / WP29 (all EDPB-endorsed or EDPB-adopted)**
- WP248 rev.01, Guidelines on Data Protection Impact Assessment (DPIA), adopted 13 Oct 2017, endorsed by EDPB 25 May 2018 — <https://ec.europa.eu/newsroom/article29/items/611236> · PDF <https://ec.europa.eu/newsroom/just/document.cfm?doc_id=47711>
- WP242 rev.01, Guidelines on the right to data portability — <https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-right-data-portability-under-regulation-2016679_en> · PDF <https://ec.europa.eu/newsroom/document.cfm?doc_id=44099>
- WP29 Position Paper on the derogations from Art. 30(5), 19 Apr 2018 — <https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/position-paper-derogations-obligation-maintain-records_en> · PDF <https://ec.europa.eu/newsroom/article29/redirection/document/51422>
- EDPB Guidelines 07/2020 on the concepts of controller and processor, v2.1 — <https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-072020-concepts-controller-and-processor-gdpr_en> · PDF <https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf>
- EDPB Guidelines 8/2022 on identifying a controller or processor's lead supervisory authority, v2.1 (supersedes WP244 rev.01) — <https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-82022-identifying-controller-or-processors-lead_en> · PDF <https://www.edpb.europa.eu/system/files/documents/2023-04/edpb_guidelines_202208_identifying_lsa_targeted_update_v2_en.pdf>
- EDPB Opinion 4/2018 on the draft Art. 35(4) list of the Czech supervisory authority — <https://www.edpb.europa.eu/our-work-tools/our-documents/opinion-board-art-64/opinion-42018-draft-list-competent-supervisory_en> · PDF <https://www.edpb.europa.eu/sites/default/files/files/file1/2018-09-25-opinion_2018_art._64_cz_sas_dpia_list_en.pdf>
- EDPB endorsed WP29 guidelines (index) — <https://www.edpb.europa.eu/our-work-tools/general-guidance/endorsed-wp29-guidelines_en>
- EDPB register of national DPIA lists — <https://www.edpb.europa.eu/registers/register-of-consistency-and-of-accountability-tools/data-protection-impact-assessment_en>

**ÚOOÚ (Czech supervisory authority)**
- "Seznam druhů operací zpracování (ne)podléhajících požadavku na posouzení vlivu na ochranu osobních údajů", v1.0 — <https://uoou.gov.cz/media/profesional/seznam-operaci-zpracovani-nepodlehajicich-pozadavku-na-dpia.pdf>
- DPIA landing page — <https://uoou.gov.cz/profesional/qa-otazky-a-odpovedi/posouzeni-vlivu-na-ochranu-osobnich-udaju>
- English text of the CZ list as filed with the EDPB — <https://www.edpb.europa.eu/sites/default/files/decisions/cz_dpia_list_354_cz_authority.pdf>
- "Metodika obecného posouzení vlivu na ochranu osobních údajů" — <https://uoou.gov.cz/media/profesional/metodika-obecneho-posouzeni-vlivu-na-ochranu-osobnich-udaju.pdf>
- "Základní příručka k ochraně údajů" — <https://uoou.gov.cz/verejnost/zakladni-prirucka-k-ochrane-udaju>
- Art. 30 template (COVID-testing-specific) — <https://uoou.gov.cz/media/clanky/dokumenty/2-zaznamy-o-cinnostech-zpracovani-1.doc>

**Apple (first-party legal and developer documentation)**
- Apple Developer Program License Agreement, Attachment 4 §§1.2, 3.5, 3.6 — <https://developer.apple.com/support/terms/apple-developer-program-license-agreement/>
- Apple developer agreements index (evidencing the absence of a DPA) — <https://developer.apple.com/terms/>
- iCloud Terms of Service — <https://www.apple.com/legal/internet-services/icloud/en/terms.html>
- Apple Privacy Policy — <https://www.apple.com/legal/privacy/en-ww/>
- `CKContainer.privateCloudDatabase` — <https://developer.apple.com/documentation/CloudKit/CKContainer/privateCloudDatabase>
- `CKDatabase` — <https://developer.apple.com/documentation/cloudkit/ckdatabase>
- Encrypting user data (CloudKit `encryptedValues`) — <https://developer.apple.com/documentation/cloudkit/encrypting-user-data>
- iCloud data security overview — <https://support.apple.com/en-us/102651>
- Allowing users to manage data (iCloud/GDPR) — <https://developer.apple.com/icloud/allowing-users-to-manage-data/>

**Method note.** ÚOOÚ's risk levels are encoded as colours in its PDF and are lost in text extraction; they were read off page images rendered from the official PDF (`pdftoppm`), and cross-checked against the coloured bullets in the English text filed with the EDPB. The Czech document uses red / **blue** / green for critical / significant / low; the English EDPB filing uses red / yellow / green for the same three levels.
