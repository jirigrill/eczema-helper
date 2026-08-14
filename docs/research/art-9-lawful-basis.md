# Art. 9(2) GDPR — the lawful basis for processing this app's health data

**Research ticket:** [#694](https://github.com/jirigrill/eczema-helper/issues/694) · map [#672](https://github.com/jirigrill/eczema-helper/issues/672) · sibling [#680](https://github.com/jirigrill/eczema-helper/issues/680) (DPIA)
**Date:** 2026-08-14 (§§1–3.5 drafted 2026-08-13; §3.6 and §§4–6 on 2026-08-14)
**Subject:** the planned native iOS app — records an **infant's** atopic eczema (meals eaten by the breastfeeding mother, skin observations across nine regions at four severity levels, photos) for the child's **mother**. SwiftData locally, synced to the **user's own** iCloud account via **CloudKit private database**. No developer-operated backend. Paid app, sold internationally, English-first, by a **solo individual developer (natural person) established in the Czech Republic**. v1 records only — derives nothing, correlates nothing, instructs nothing.

> ⚠️ **This is not legal advice.** It is primary-source groundwork for a decision the owner makes, and it is not a substitute for a Czech data-protection lawyer. Every load-bearing claim below is quoted from regulation text, EDPB/WP29 guidance, a supervisory authority's own publication, or a national statute — with a URL. Where a question is genuinely unsettled, it says so instead of resolving it.

---

## Overview

**Art. 9(2)(a) explicit consent is the only open limb. That confirms the preliminary read — but the reason 9(2)(h) is closed is not the one that was assumed, and the child dimension is not governed by Art. 8 at all.**

- **All ten limbs walked (§2).** Nine are closed on the face of the text. Eight of them fail on an element the fact pattern cannot supply — an employment relationship, a not-for-profit body, public interest, a Union or Member State law basis. **9(2)(h) fails twice over**, and the first failure is the decisive one: it needs a basis in "Union or Member State law **or pursuant to contract with a health professional**", and there is none. Art. 9(3)'s professional-secrecy condition is a *second*, independent bar — so the DPIA's read was right in its conclusion but was citing the weaker of the two reasons.
- **9(2)(a) is genuinely open in the Czech Republic**, and this was checked rather than assumed. 9(2)(a) carries its own kill-switch — it does not apply "where Union or Member State law provide that the prohibition ... may not be lifted by the data subject". The Czech implementing act, **zákon č. 110/2019 Sb.**, contains **no such provision** and does not exercise Art. 9(4) to add conditions on health data in the private sector (§2.4). Verified by reading the full statute text, not a summary.
- **Art. 8 GDPR does not apply, and this is the most consequential finding (§3).** Art. 8 governs a *child consenting for themselves* to an information society service offered **"directly to a child"**. Here the service is offered to the **mother**, an adult, and she consents as the child's legal representative. The Czech age threshold — **15 years, § 7 of zákon č. 110/2019 Sb.**, quoted verbatim in §3.3 — is therefore a **red herring for this product**. It was worth establishing precisely so it can be ruled out rather than left hanging.
- **Once Art. 8 is out, GDPR is silent on proxy consent.** The phrase "parental responsibility" appears in the entire Regulation only three times — Recital 38, Art. 8, and Art. 40(2)(g) — all Art. 8 machinery. So the validity of the mother's consent falls to **national law**, here the Czech Civil Code (§3.5): **§ 892(1)** gives parents the right and duty to represent the child, **§ 892(2)** lets either parent act alone, and **§ 876(3)** creates a **rebuttable presumption** that a parent acting alone toward a good-faith third party acts with the other parent's agreement. **So the mother alone can validly consent — but by presumption, not by right.** The app should not ask her to assert that the other parent agrees; the presumption already does that work, and asking invites a false declaration.
- **The child grows up, and nothing in GDPR says what happens then (§3.6).** Parental responsibility ends at full legal capacity — **§ 858(2) + § 30(1)** of the Civil Code, age 18. The EDPB's guidance on this (paras 147–149) is Art. 8 machinery keyed to the "age of digital consent", so it does not apply on its own terms; WP 160 points to majority instead but is a Directive-era opinion the EDPB never endorsed. The two do not conflict — they answer different questions — but **which age governs a non-Art.-8 health app is UNSETTLED**, and para 149's duty to inform the child has **no addressee and no channel** on this architecture. The reasoned position taken here is 18, and it is a position, not a citation.
- **The bind the brief anticipated does not bite (§4).** Consent that is mandatory-for-function *and* the only available limb is the exact configuration the EDPB illustrates as **compliant**: Guidelines 05/2020 para 32 disapplies Art. 7(4) where the data is necessary for the requested service, and Examples 19–20 show residual explicit consent operating validly where health data is indispensable. A performative in-app checkbox ("I hereby consent…") with a working decline is an accepted form (Example 17) — **no signature, no two-stage verification**. What is genuinely unresolved is downstream of consent formation: **demonstrability (Art. 7(1)), erasure on withdrawal (Art. 17(1)(b)), and retention disclosure (Art. 13(2)(a)) all assume a controller who holds the data.** None of the guidance has been written for an architecture where he holds none.
- **The device boundary splits the product in two (§5), and that is the frame that should drive the compliance posture.** For data that never leaves the phone, WP 202 says the developer's responsibilities are "**considerably limited**" — a reduction, not an exemption — and the Czech § 89(3) network qualifier does not reach it. At the sync boundary that relief switches off: Apple becomes an Art. 4(9) recipient, Chapter V engages, and Art. 28 attaches. **Controllership over the synced data remains formally UNSETTLED** (§5.7) — Reading A is stronger for the synced zone, Reading B for the local one — but the compliance-safe course is the same under either, and the consent text differs by one line. Two corrections to the working premises: **processors need not be named in the consent** (para 65), so Apple belongs in the Art. 13 notice rather than the consent screen; and para 44 of Guidelines 2/2023 exempts local-only processing from the ePrivacy *access* limb only, **not** from the storage limb.
- **The most serious finding is not about consent at all (§5.4).** ADPLA Attachment 4 § 3.6 **does not satisfy Art. 28(3)**: (d) sub-processors and (g) end-of-processing deletion are substantively **absent**, (c) and (f) are materially narrower than the Regulation requires, and the developer **cannot cure it** — the agreement is non-negotiable. If the developer is the controller of synced data, that is a position of irreducible non-compliance. Together with the Art. 7(3) withdrawal problem under mandatory sync (§5.6), it is the pair of findings most worth putting to a qualified Czech lawyer before shipping.
- **For first-run UX (§6): yes, there must be a consent gate before the first record is written** — including before the feeding-stage picker, which is itself personal data about the mother. It must be a distinct affirmative act, not bundled into an onboarding "Continue" (para 81), and it must carry eleven disclosures readable without a sub-layer. §6.6 is the buildable list: ten things to build, five not to. **The sync half of the screen is specified as two alternative layouts**, because mandatory-vs-elective is [#705](https://github.com/jirigrill/eczema-helper/issues/705)'s decision and this ticket only supplies its inputs.
- **Two settled decisions on this map change what the screen must disclose (§6.5).** With **no export and no import in v1** ([#683](https://github.com/jirigrill/eczema-helper/issues/683)) and CloudKit being sync rather than backup, the year-18 mitigation cannot be "hand over an export" — the remedy is deletion only, and **Art. 20 portability is a live gap rather than merely unbuilt**. Flagged, not re-opened.

---

## 0. What is carried forward, not re-derived

From [#672](https://github.com/jirigrill/eczema-helper/issues/672) §7 and the DPIA research on [#680](https://github.com/jirigrill/eczema-helper/issues/680):

- Art. 9(1) health data applies; eczema photos qualify via the **health limb**, not biometrics (Recital 51).
- The Art. 30(5) SME record-keeping exemption **fails** for Art. 9 data.
- **Controllership is unresolved.** Whether the developer is a controller of data he never sees is not settled by any primary source found. #680 §6 sets out both readings. **This ticket does not resolve it either** — §5.7 restates both readings against the sources located here and explains why the practical posture survives either one.

From the stopped run's own findings, recorded on [#694](https://github.com/jirigrill/eczema-helper/issues/694) and treated here as established input rather than re-derived:

- **The ePrivacy device boundary is the sharper hook than Art. 9 sensitivity** — EDPB Guidelines 2/2023 para 44. §5.2 takes this forward, with one **correction**: para 44 exempts local-only processing from the *access* limb of Art. 5(3), **not** from the storage limb, which paras 35–38 engage independently.
- **Czech § 89(3) of zákon č. 127/2005 Sb. retains the "sítě elektronických komunikací" qualifier** the 2009 amendment deleted from Art. 5(3), and § 3(1) of that Act makes "Úřad" the ČTÚ, not ÚOOÚ. Both verified again in §5.2 — and §5.7 records that ÚOOÚ nonetheless asserts jurisdiction over the question via § 50(1) of Act 110/2019, so the competence split is not a safe harbour.
- **ADPLA Attachment 4 § 3.6 casts Apple as the developer's agent on the developer's instructions**, which is the Art. 4(8) processor formula. §5.3 records why that is evidence rather than proof, and §5.4 walks Art. 28(3) against it subparagraph by subparagraph.
- **`encryptedValues` cannot be retrofitted** and Apple can decrypt ordinary `CKRecord` fields absent Advanced Data Protection. §5.4 and §6.6 item 10 carry the consequence.

#680 §9 flagged this ticket's question as its own largest omission. This document answers it.

**Reading order, if not reading it whole:** §2 for the limb walk, §6 for what to build. §§4–5 are the reasoning those two rest on, and §5.4 is the finding that no design change fixes.

---

## 1. The prohibition and the ten exceptions — Art. 9 verbatim

Source: [Regulation (EU) 2016/679, EUR-Lex CELEX:32016R0679](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679). The text below was downloaded from that URL and quoted from the downloaded copy, not from recall.

> **Article 9 — Processing of special categories of personal data**
>
> **1.** Processing of personal data revealing racial or ethnic origin, political opinions, religious or philosophical beliefs, or trade union membership, and the processing of genetic data, biometric data for the purpose of uniquely identifying a natural person, **data concerning health** or data concerning a natural person's sex life or sexual orientation **shall be prohibited**.
>
> **2.** Paragraph 1 shall not apply if one of the following applies:
>
> **(a)** the data subject has given **explicit consent** to the processing of those personal data for one or more specified purposes, **except where Union or Member State law provide that the prohibition referred to in paragraph 1 may not be lifted by the data subject**;
>
> **(b)** processing is necessary for the purposes of carrying out the obligations and exercising specific rights of the controller or of the data subject in the field of **employment and social security and social protection law** in so far as it is authorised by Union or Member State law or a collective agreement pursuant to Member State law providing for appropriate safeguards for the fundamental rights and the interests of the data subject;
>
> **(c)** processing is necessary to protect the **vital interests** of the data subject or of another natural person **where the data subject is physically or legally incapable of giving consent**;
>
> **(d)** processing is carried out in the course of its legitimate activities with appropriate safeguards by a **foundation, association or any other not-for-profit body** with a political, philosophical, religious or trade union aim and on condition that the processing relates solely to the members or to former members of the body or to persons who have regular contact with it in connection with its purposes and that the personal data are not disclosed outside that body without the consent of the data subjects;
>
> **(e)** processing relates to personal data which are **manifestly made public by the data subject**;
>
> **(f)** processing is necessary for the **establishment, exercise or defence of legal claims** or whenever courts are acting in their judicial capacity;
>
> **(g)** processing is necessary for reasons of **substantial public interest, on the basis of Union or Member State law** which shall be proportionate to the aim pursued, respect the essence of the right to data protection and provide for suitable and specific measures to safeguard the fundamental rights and the interests of the data subject;
>
> **(h)** processing is necessary for the purposes of **preventive or occupational medicine**, for the assessment of the working capacity of the employee, **medical diagnosis, the provision of health or social care or treatment or the management of health or social care systems and services on the basis of Union or Member State law or pursuant to contract with a health professional** and subject to the conditions and safeguards referred to in paragraph 3;
>
> **(i)** processing is necessary for reasons of **public interest in the area of public health**, such as protecting against serious cross-border threats to health or ensuring high standards of quality and safety of health care and of medicinal products or medical devices, **on the basis of Union or Member State law** which provides for suitable and specific measures to safeguard the rights and freedoms of the data subject, in particular professional secrecy;
>
> **(j)** processing is necessary for **archiving purposes in the public interest, scientific or historical research purposes or statistical purposes** in accordance with Article 89(1) **based on Union or Member State law** which shall be proportionate to the aim pursued, respect the essence of the right to data protection and provide for suitable and specific measures to safeguard the fundamental rights and the interests of the data subject.
>
> **3.** Personal data referred to in paragraph 1 may be processed for the purposes referred to in **point (h) of paragraph 2** when those data are processed **by or under the responsibility of a professional subject to the obligation of professional secrecy** under Union or Member State law or rules established by national competent bodies **or by another person also subject to an obligation of secrecy** under Union or Member State law or rules established by national competent bodies.
>
> **4.** **Member States may maintain or introduce further conditions, including limitations, with regard to the processing of genetic data, biometric data or data concerning health.**

Three structural points the limb-walk depends on, and which are easy to lose:

1. **Art. 9(1) is a prohibition, not a balancing test.** The default is that this processing is *forbidden*. A 9(2) limb is not a "reason" — it is the thing that lifts a ban.
2. **Art. 9 does not replace Art. 6 — it stacks on top of it.** A controller needs *both* an Art. 6(1) legal basis *and* an Art. 9(2) exception. Neither substitutes for the other.
3. **Art. 9(4) is live.** Member States may add further conditions on health data, so "9(2)(a) is available" cannot be answered from the Regulation alone. It requires reading Czech law — §2.4 does that.

---

## 2. Walking all ten limbs

### 2.1 The EDPB has already stated the shape of this answer

Before the limb-by-limb walk, one passage does most of the work. **EDPB Guidelines 05/2020 on consent under Regulation 2016/679, Version 1.1, adopted 4 May 2020** — [landing page](https://www.edpb.europa.eu/our-work-tools/our-documents/guidelines/guidelines-052020-consent-under-regulation-2016679_en), [PDF](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf) — **paragraph 99**, verbatim:

> **99.** Article 9(2) does not recognize "necessary for the performance of a contract" as an exception to the general prohibition to process special categories of data. Therefore, controllers and Member States that deal with this situation should explore the specific exceptions in Article 9(2) subparagraphs (b) to (j). **Should none of the exceptions (b) to (j) apply, obtaining explicit consent in accordance with the conditions for valid consent in the GDPR remains the only possible lawful exception to process such data.**

This is the EDPB prescribing exactly the method this section applies, and pre-announcing the destination. It also disposes of an objection that would otherwise loom over §4: the fact that the processing is *necessary for the product to function at all* does **not** open a contract route under Art. 9. There is no contract limb. Explicit consent is the residual.

> Note the asymmetry this creates. Under Art. 6, a service whose whole point is the processing would naturally run on Art. 6(1)(b) (contract) rather than consent. Under Art. 9 that option does not exist. So this app plausibly ends up on **Art. 6(1)(b) contract + Art. 9(2)(a) explicit consent** — different instruments on the two stacked layers. That is not a contradiction; it is the ordinary consequence of Art. 9 having no contract limb. §4.3 returns to what it means for "freely given".

### 2.2 The limb-by-limb walk

| Limb | Verdict | The deciding words, and why |
|---|---|---|
| **(a) explicit consent** | **OPEN** | The only limb whose conditions this fact pattern can actually satisfy. Its own carve-out — "except where Union or Member State law provide that the prohibition ... may not be lifted by the data subject" — is **not triggered in the Czech Republic** (§2.4). Mechanics in §4. |
| **(b) employment / social security** | **CLOSED** | Requires processing "in the field of **employment and social security and social protection law**" *and* authorisation "by Union or Member State law or a collective agreement". There is no employment relationship anywhere in this fact pattern — the parties are a developer, a mother and an infant. Not arguable. |
| **(c) vital interests** | **CLOSED** | Superficially tempting because an infant genuinely *is* "physically or legally incapable of giving consent" — that half of the condition is met. But the limb requires processing to be "**necessary to protect the vital interests**" of the data subject. "Vital interests" is a life-or-death standard, and Recital 46 confines it: it "should ... be interpreted as being ... in principle ... only where the processing cannot be manifestly based on another legal basis". Here consent *can* be obtained, from the holder of parental responsibility — so the limb is displaced by its own terms. Eczema logging is also not life-preserving. **CLOSED, but worth noting it is the one limb where the infant status cuts *toward* availability rather than away** — it just does not get there. |
| **(d) not-for-profit body** | **CLOSED** | Requires a "foundation, association or any other **not-for-profit body** with a political, philosophical, religious or trade union aim" and processing relating "solely to the members". The developer is a for-profit sole trader shipping a paid app, with no members and none of the listed aims. Fails on every element. |
| **(e) manifestly made public** | **CLOSED** | Requires data "**manifestly made public by the data subject**". The data subject is an infant who has made nothing public; the data is entered by the mother into a private local database and is never published. The opposite of this limb. |
| **(f) legal claims** | **CLOSED for the processing itself** | Requires processing "necessary for the **establishment, exercise or defence of legal claims**". The app's ordinary operation is record-keeping, not litigation. **One narrow caveat worth keeping**: (f) is the limb a controller would rely on to *retain* consent records after withdrawal in order to defend a claim — see §4.5. It is not a basis for the health records. |
| **(g) substantial public interest** | **CLOSED** | Requires a basis "**on the basis of Union or Member State law**" that is proportionate and provides safeguards. No Czech or Union law designates infant-eczema tracking by a commercial app as a substantial public interest. Nothing in zákon č. 110/2019 Sb. does so (§2.4). Absent that law, the limb is empty — it is not self-executing. |
| **(h) health care** | **CLOSED — twice over** | See §2.3. This is the limb worth being precise about. |
| **(i) public health** | **CLOSED** | Requires "reasons of **public interest in the area of public health**" *and* "on the basis of Union or Member State law". Recital 54 defines public health by reference to Regulation (EC) No 1338/2008 — population-level health status, morbidity, determinants, health-care provision and financing. One family's eczema log is individual, not population-level, and again there is no enabling law. |
| **(j) archiving / research / statistics** | **CLOSED for v1** | Requires purposes of "archiving ... in the public interest, scientific or historical research ... or statistical purposes", subject to Art. 89(1) safeguards and, again, "**based on Union or Member State law**". v1 does no research and aggregates nothing. **Flag for later:** if the app ever pools user data to train or validate the AI/correlation feature, (j) is the limb that would be reached for — and it would still need a Member State law basis plus Art. 89(1) safeguards, which a solo commercial developer is unlikely to be able to construct. In practice that future feature would also run on explicit consent. |

**Result: nine closed, one open.** The preliminary read in the ticket is confirmed. **Art. 9(2)(a) explicit consent is the only available limb.**

### 2.3 Why (h) fails — and why the usual reason is the second-best one

The ticket's working hypothesis was that 9(2)(h) is closed off by Art. 9(3)'s professional-secrecy requirement. **That is correct, but it is the weaker of two independent bars, and the stronger one is inside 9(2)(h) itself.**

**First bar — the gateway condition, inside (h).** Limb (h) does not simply say "processing for health purposes is allowed". It requires those purposes to be pursued:

> …**on the basis of Union or Member State law or pursuant to contract with a health professional**…

There is no Czech or Union law authorising a consumer app developer to process health data for medical diagnosis or care provision, and there is no contract with a health professional anywhere in this product. The developer is not a health professional and does not contract with one. **(h) fails at its gateway before Art. 9(3) is ever reached.**

This matters practically, because it means (h) cannot be unlocked by the developer voluntarily adopting a secrecy obligation. Even a developer who bound himself to secrecy by contract would still have no law and no health-professional contract, and would still fail (h).

**Second bar — Art. 9(3).** Independently, processing under (h) is permitted only when the data are processed:

> …**by or under the responsibility of a professional subject to the obligation of professional secrecy** under Union or Member State law or rules established by national competent bodies **or by another person also subject to an obligation of secrecy** under Union or Member State law or rules established by national competent bodies.

Note the second branch — "**another person also subject to an obligation of secrecy**" — which is broader than "health professional" and is the branch someone might try to squeeze through. It still requires the secrecy obligation to arise "under Union or Member State law or rules established by national competent bodies". A **self-imposed contractual** confidentiality promise is not an obligation *under law* and is not a rule established by a *national competent body*. So this branch is closed too.

**Third, and dispositive on the facts:** the developer is not performing "medical diagnosis" or "the provision of health or social care or treatment". The product's entire regulatory posture — established in [#672](https://github.com/jirigrill/eczema-helper/issues/672) §7 — is that v1 **records only**, derives nothing and instructs nothing, precisely so that it stays outside MDR Annex VIII Rule 11. **The same design choice that keeps the app out of medical-device classification also keeps it out of Art. 9(2)(h).** These are consistent, not in tension: the app is not health care, so it gets neither the burdens nor the permissions of health care.

> **Do not try to "fix" this by claiming a clinical purpose.** Claiming 9(2)(h) would require asserting the app provides medical diagnosis or care — which would simultaneously re-qualify it as medical device software under MDR Rule 11 and trigger the notified-body requirement flagged in #672 §7. That trade is catastrophic and is not worth making to avoid a consent screen.

### 2.4 Czech law — checking that 9(2)(a) is actually open

Art. 9(2)(a) is not unconditional. It does not apply "where **Union or Member State law provide that the prohibition** referred to in paragraph 1 **may not be lifted by the data subject**". And Art. 9(4) separately lets Member States "maintain or introduce further conditions, including limitations" on health data. So the Czech position had to be read, not assumed.

**Source read:** *zákon č. 110/2019 Sb., o zpracování osobních údajů* — <https://www.zakonyprolidi.cz/cs/2019-110>. The full statute text was downloaded and searched.

**Findings:**

- The act contains **no provision disapplying Art. 9(2)(a)** for health data or for any other special category. The phrase "zvláštní kategorie" (special categories) does not appear in it at all.
- The act **does not exercise Art. 9(4)** to impose further conditions or limitations on the processing of health data in the private sector. Its only two references to "čl. 9" of the GDPR are (i) a pseudonymisation duty in the criminal-law/security-purposes head, and (ii) the journalistic/academic/artistic-expression provision — neither of which touches a consumer app.
- The only place the act enumerates the special categories is a **transitional interpretive provision** mapping the old term *citlivý údaj* ("sensitive data") onto the GDPR list, which includes "**údaj o zdravotním stavu**" (data on state of health). That confirms health data is in scope; it imposes nothing extra.

**Conclusion: Art. 9(2)(a) is open in the Czech Republic.** The carve-out in its final clause is not triggered.


> ⚠️ **Scope limit, stated plainly.** This checks the *Czech* position, because the developer is established in the Czech Republic. The app is to be sold **internationally**. Art. 9(4) is a Member State power, and other Member States have used their Art. 9(4)/Art. 9(2) margins differently. **No survey of all EEA Member States' Art. 9(4) provisions was carried out here, and this document does not claim one.** If the app is sold EEA-wide, the possibility that some Member State imposes an additional condition on health-data processing is **UNVERIFIED and open**. This is the same shape of problem the DPIA research hit at #680 §4 for supervisory-authority lists.

---

## 3. The data subject is an infant — and Art. 8 is not the route

This is the part the ticket flagged as most likely to be under-analysed, and it turns out the standard answer is the wrong one. The instinct is to reach for Art. 8 and its age threshold. **Art. 8 does not apply here**, and understanding why changes what the app has to build.

### 3.1 Art. 8 verbatim

Source: [EUR-Lex CELEX:32016R0679](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679), downloaded and quoted from the downloaded copy.

> **Article 8 — Conditions applicable to child's consent in relation to information society services**
>
> **1.** **Where point (a) of Article 6(1) applies**, in relation to **the offer of information society services directly to a child**, the processing of the personal data of a child shall be lawful where the child is at least 16 years old. Where the child is below the age of 16 years, such processing shall be lawful only if and to the extent that **consent is given or authorised by the holder of parental responsibility over the child**.
>
> Member States may provide by law for a lower age for those purposes provided that such lower age is not below 13 years.
>
> **2.** The controller shall make **reasonable efforts to verify** in such cases that consent is given or authorised by the holder of parental responsibility over the child, **taking into consideration available technology**.
>
> **3.** Paragraph 1 shall not affect the general contract law of Member States such as the rules on the validity, formation or effect of a contract in relation to a child.

And **Recital 38**, verbatim:

> Children merit specific protection with regard to their personal data, as they may be **less aware of the risks, consequences and safeguards** concerned and their rights in relation to the processing of personal data. Such specific protection should, in particular, apply to the use of personal data of children for the purposes of **marketing or creating personality or user profiles** and the collection of personal data with regard to children **when using services offered directly to a child**. The consent of the holder of parental responsibility should not be necessary in the context of preventive or counselling services offered directly to a child.

### 3.2 Two independent reasons Art. 8 does not apply

**Reason 1 — the trigger in Art. 8(1)'s opening words: "Where point (a) of Article 6(1) applies".** Art. 8 is machinery bolted onto **Art. 6(1)(a)** consent. If the Art. 6 basis for the developer's processing is Art. 6(1)(b) contract rather than Art. 6(1)(a) consent — which is the natural reading for a paid app whose function *is* the processing (§2.1) — **Art. 8 is not engaged on its own terms**, whatever the Art. 9 position. Art. 8 conspicuously does not say "or point (a) of Article 9(2)".

> This is a genuine textual gap and it should be named as such. Art. 9(2)(a) explicit consent is not Art. 6(1)(a) consent. Art. 8 by its terms attaches only to the latter. Whether a supervisory authority would nonetheless apply Art. 8's logic by analogy to an Art. 9(2)(a) consent concerning a child is **not resolved by any source found here**. The EDPB consent guidelines state at §5 that "Article 7 also applies to consent referred to in other articles of GDPR, e.g. Articles 8 and 9" — but that is Art. 7 reaching outward, not Art. 8 reaching into Art. 9. **UNSETTLED.** The analysis below does not depend on resolving it, because Reason 2 is independently sufficient.

**Reason 2 — the service is not "offered directly to a child".** This is the stronger and cleaner ground. Art. 8(1) applies only "in relation to **the offer of information society services directly to a child**". EDPB Guidelines 05/2020, **paragraph 130**, verbatim ([PDF](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf)):

> **130.** The inclusion of the wording '**offered directly to a child**' indicates that **Article 8 is intended to apply to some, not all information society services**. In this respect, if an information society service provider makes it clear to potential users that it is **only offering its service to persons aged 18 or over**, and this is not undermined by other evidence such as the content of the site or marketing plans then the service will not be considered to be 'offered directly to a child' and **Article 8 will not apply**.

This app is offered to **parents**. The user who downloads it, pays for it, holds the Apple ID, operates the interface and enters the data is an adult. The infant is the **subject** of the records, not the **recipient of the service**. An infant cannot be offered a service directly in any meaningful sense — a newborn cannot download an app.

Art. 8 asks: *may this child validly consent for themselves, or must a parent step in?* That question is incoherent when the data subject is a newborn and the parent is the actual user. Art. 8 addresses a child *using a service*; this is an adult using a service *about* a child.

**Paragraph 130 also hands the product a concrete, cheap action**: state in the App Store listing and in-app that the app is offered to adults (18+). That is not a legal fiction — it is true — and it is the EDPB's own stated route to putting Art. 8 out of scope beyond argument. It must not be undermined by marketing that addresses children.

### 3.3 The Czech Art. 8 age threshold — established, and then set aside

The ticket asked for this specifically, so it is recorded even though it turns out not to bite.

Czech law lowers the Art. 8(1) threshold from 16 to **15**. The provision is **§ 7 of zákon č. 110/2019 Sb., o zpracování osobních údajů** — <https://www.zakonyprolidi.cz/cs/2019-110>. Quoted verbatim from the downloaded statute text:

> **§ 7 — Způsobilost dítěte pro souhlas se zpracováním osobních údajů**
>
> *Dítě nabývá způsobilosti k udělení souhlasu se zpracováním osobních údajů v souvislosti s nabídkou služeb informační společnosti přímo jemu dovršením patnáctého roku věku.*

Translation:

> **§ 7 — Capacity of a child to consent to the processing of personal data**
>
> A child acquires the capacity to give consent to the processing of personal data **in connection with the offer of information society services directly to the child** upon **completing the fifteenth year of age**.

**Note that § 7 carries the same "přímo jemu" / "directly to the child" limitation as Art. 8 itself.** The Czech legislature transposed the restriction, not just the number. So § 7 confirms rather than disturbs §3.2: it only ever engages for services offered directly to a child.

**Verdict: the Czech 15-year threshold is a red herring for this product.** It is recorded so it can be ruled out rather than left as an open worry. The relevant Czech age for this app is not 15 but **18** — the age of full legal capacity, at which parental responsibility ends (§3.5).

> **Cross-border footnote.** EDPB Guidelines 05/2020 **paragraph 131** warns that "a controller providing a cross-border service cannot always rely on complying with only the law of the Member State in which it has its main establishment but may need to comply with the respective national laws of each Member State in which it offers the information society services." Member State thresholds range from 13 to 16. **This would be a real problem for an internationally sold app — if Art. 8 applied. On the analysis above it does not, which removes the need to survey 30 national thresholds.** That is a substantive benefit of getting §3.2 right.

### 3.4 Outside Art. 8, the GDPR is silent on proxy consent

Having ruled out Art. 8, the question becomes: what does the GDPR itself say about a parent consenting on a child's behalf?

**Almost nothing.** The full text of the Regulation was searched for "parental responsibility". It occurs **three times only**:

1. **Recital 38** — the recital explaining Art. 8.
2. **Art. 8(1) and 8(2)** — the Article itself.
3. **Art. 40(2)(g)** — codes of conduct may specify "the information provided to, and the protection of, children, and **the manner in which the consent of the holders of parental responsibility over children is to be obtained**".

All three are Art. 8 machinery. **The GDPR contains no free-standing rule on proxy or parental consent outside the information-society-service context.** Nor does it define who may exercise a child's data protection rights.

This is not an oversight — it is the GDPR deferring to national law. Consent is a legal act, and **capacity to perform legal acts, and representation of those who lack capacity, are matters of Member State civil law**, expressly preserved by **Art. 8(3)**: "Paragraph 1 shall not affect the general contract law of Member States such as the rules on the validity, formation or effect of a contract in relation to a child."

**So the validity of the mother's consent is a question of Czech civil law, not of the GDPR.** §3.5 answers it.

The EDPB does supply one relevant caution, in a footnote to Guidelines 05/2020 **paragraph 137 (footnote 67)**, verbatim:

> WP29 notes that it **not always the case that the holder of parental responsibility is the natural parent** of the child and that **parental responsibility can be held by multiple parties** which may include legal as well as natural persons.

That "multiple parties" point is exactly the one §3.5 has to resolve.

### 3.5 Czech civil law — can the mother alone validly consent?

**Source:** *zákon č. 89/2012 Sb., občanský zákoník* (Civil Code) — <https://www.zakonyprolidi.cz/cs/2012-89>. The statute text was downloaded and each section quoted below was read from it directly.

**The infant has no capacity of its own.**

> **§ 30(1)** *Plně svéprávným se člověk stává zletilostí. Zletilosti se nabývá dovršením osmnáctého roku věku.*
>
> **§ 30(1)** A person becomes **fully legally capable upon majority. Majority is attained upon completing the eighteenth year of age.**

**Parental responsibility exists from birth to majority, and expressly includes representing the child.**

> **§ 858** *Rodičovská odpovědnost zahrnuje povinnosti a práva rodičů, která spočívají v a) péči o dítě, zahrnující zejména péči o jeho zdraví … f) zastupování dítěte a g) spravování jmění dítěte.*
> **(2)** *Rodičovská odpovědnost vzniká narozením dítěte a zaniká, jakmile dítě nabude plné svéprávnosti.*
>
> **§ 858** Parental responsibility comprises the duties and rights of parents consisting in (a) **care for the child, including in particular care for its health** … (f) **representing the child** and (g) administering the child's property.
> **(2)** Parental responsibility **arises on the birth of the child and ends as soon as the child acquires full legal capacity.**

**Parents represent the child in legal acts it cannot perform — and either parent may act alone.**

> **§ 892(1)** *Rodiče mají povinnost a právo zastupovat dítě při právních jednáních, ke kterým není právně způsobilé.*
> **(2)** *Rodiče zastupují dítě společně, jednat však může každý z nich; ustanovení § 876 odst. 3 platí obdobně.*
>
> **§ 892(1)** Parents have the **duty and right to represent the child** in legal acts for which it is not legally competent.
> **(2)** Parents represent the child **jointly, but each of them may act**; the provision of § 876(3) applies accordingly.

**And § 876(3) supplies the presumption that makes single-parent consent workable.**

> **§ 876(1)** *Rodičovskou odpovědnost vykonávají rodiče ve vzájemné shodě.*
> **(3)** *Jedná-li jeden z rodičů v záležitosti dítěte sám vůči třetí osobě, která je v dobré víře, **má se za to**, že jedná se souhlasem druhého rodiče.*
>
> **§ 876(1)** Parents exercise parental responsibility **by mutual agreement**.
> **(3)** Where one parent acts alone in a matter concerning the child **towards a third party who is in good faith, it is presumed that they act with the consent of the other parent.**

**This is the answer to the ticket's practical question. The mother alone can give valid consent for her infant — by rebuttable presumption (*má se za to*), toward a good-faith third party.**

Two consequences the product should actually act on:

- **Do not build a second-parent consent flow, and do not ask the user to declare that the other parent agrees.** § 876(3) already supplies the presumption. Asking the mother to affirm the father's agreement adds a factual assertion that may be false, converts a legal presumption into a user-made representation, and gains nothing. It also collects data the app does not need, cutting against Art. 5(1)(c) minimisation.
- **The presumption depends on the developer being "in good faith" (*v dobré víře*).** It protects a third party who does not know the parents disagree. So the app must not do anything that would put the developer on notice of a dispute — and, correspondingly, if a second parent ever objects, the presumption is displaced. **UNVERIFIED:** no source was found addressing how a software vendor with no communication channel to users would ever receive such notice, or what it would then have to do. In practice this is remote, but it is not zero.

One nearby provision is worth flagging as **not** applicable, so it is not later mistaken for a requirement:

> **§ 877(2)** *Za významnou záležitost se považují zejména **nikoli běžné léčebné a obdobné zákroky**, určení místa bydliště a volba vzdělání nebo pracovního uplatnění dítěte.*
>
> **§ 877(2)** A **significant matter** is in particular **non-routine medical and similar interventions**, determination of the child's residence, and the choice of education or employment.

Significant matters require parental agreement, with the court deciding on disagreement. **Installing a record-keeping app is not a medical intervention**, routine or otherwise — again consistent with the app's non-medical-device posture. § 877 does not bite.

> **Also verified as not applicable:** *zákon č. 372/2011 Sb., o zdravotních službách* governs consent to the **provision of health services** by a **poskytovatel zdravotních služeb** (health services provider). The developer is not one, does not provide health services, and does not register as such. Its consent regime is not engaged. Claiming otherwise would carry the same catastrophic trade described in §2.3.

### 3.6 The child grows up

**Takeaway: the two sources do not actually conflict — but neither one answers our question.** EDPB Guidelines 05/2020 paras 147–149 say parental consent *survives* the child's coming of age unless the child acts, and they are expressly keyed to the Art. 8 "age of digital consent" — a threshold that, per §3.2 above, does not apply to this app. WP 160 §4 says the child "may, on attaining majority, revoke the consent" and that for **sensitive data** the controller "must make sure he still has a valid basis" — i.e. a *refresh* flavour, keyed to majority (18), and squarely about health/sensitive data. They address different triggers and different data categories, so the divergence is one of scope, not of holding. WP 160 was adopted under Directive 95/46/EC and was **not** endorsed by EDPB Endorsement 1/2018. Which age governs a non-Art.-8 health app, and what "inform the child" could mean 18 years out, are **UNSETTLED** in the primary sources. *Not legal advice.*

All sources below fetched **2026-08-14**.

---

#### 3.6.1 What the EDPB actually says

Fetched from <https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf> (Guidelines 05/2020 on consent under Regulation 2016/679, Version 1.1, adopted 4 May 2020). The paragraphs sit under section **7 "Specific areas of concern in the GDPR"** → **7.1 "Children (Article 8)"** → **7.1.4 "Children's consent and parental responsibility"**.

The paraphrase in the earlier draft is **confirmed accurate**. Verbatim:

> 147. With regard to the data subject's autonomy to consent to the processing of their personal data and have full control over the processing, consent by a holder of parental responsibility or authorized by a holder of parental responsibility for the processing of personal data of children can be confirmed, modified or withdrawn, once the data subject reaches the age of digital consent.

> 148. In practice, this means that if the child does not take any action, consent given by a holder of parental responsibility or authorized by a holder of parental responsibility for the processing of personal data given prior to the age of digital consent, will remain a valid ground for processing.

> 149. After reaching the age of digital consent, the child will have the possibility to withdraw the consent himself, in line with Article 7(3). In accordance with the principles of fairness and accountability, the controller must inform the child about this possibility.[69]

Footnote 69 to para 149, verbatim:

> Also, data subjects should be aware of the right to be forgotten as laid down in Article 17, which is in particular relevant for consent given when the data subject was still a child, see recital 63.

**Scope control — this is Art. 8 guidance.** The section heading is literally "Children (**Article 8**)", and para 127 of the same document fixes when that section bites:

> 127. It is clear from the foregoing that Article 8 shall only apply when the following conditions are met:
>
> - The processing is related to the offer of information society services directly to a child.
> - The processing is based on consent.

Since it is settled (§3.2) that this app is not "offered directly to a child" (EDPB Guidelines 05/2020 para 130), **paras 147–149 do not apply to us on their own terms.** Every operative phrase in them is indexed to "the age of digital consent," which is the Art. 8(1) threshold — a concept that has no referent for a service outside Art. 8. This is the single most important finding in this subsection, and it is what the earlier draft got wrong by treating 147–149 as generally applicable.

Note also the direction of travel in para 148: default is **continuity**, not lapse. Nothing in 147–149 requires re-consent.

#### 3.6.2 What WP 160 actually says

Fetched from <https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2009/wp160_en.pdf> (HTTP 200; document confirms itself as ref. **398/09/EN, WP 160**, "Opinion 2/2009 on the protection of children's personal data (General Guidelines and the special case of schools)", **adopted 11 February 2009**, signed Alex Türk).

The relevant passage is **Part II, section 4 "Representation"** — note this is in the *general principles* part, **not** the schools-specific Part III. Verbatim, in full:

> **4) – Representation**
>
> Children require legal representation to exercise most of their rights. However, this does not mean that the legal representative's status has any absolute or unconditional priority over the child's - because the child's best interest can sometimes confer upon them rights relating to data protection which may override the wishes of parents or other legal representatives. Nor does the need for legal representation imply that children should not, from a certain age, be consulted on matters relating to them.
>
> If the processing of a child's data began with the consent of their legal representative, the child concerned may, on attaining majority, revoke the consent. But if he wishes the processing to continue, it seems that the data subject need give explicit consent wherever this is required.
>
> For example, if a legal representative has given explicit consent to the inclusion of his child (the data subject) in a clinical trial, then upon attaining capacity, the controller must make sure he still has a valid basis to process the personal data of the data subject. He must in particular consider obtaining the explicit consent of the data subject himself in order for the trial to continue, because sensitive data are involved.
>
> On this issue, it must be remembered that the rights to data protection belong to the child, and not to their legal representatives, who simply exercise them.

On **evolving capacity**, WP 160 Part II §6 and §7, verbatim:

> **6) – Adapting to the degree of maturity of the child**
>
> Since the child is a person who is still developing, the exercise of their rights – including those relating to data protection – must adapt to their level of physical and psychological development. Not only are children in the process of developing, but they have a right to this development. The way in which this process is managed in the legal system varies from state to state, but in any society children should be treated in accordance with their level of maturity.
>
> Where consent is concerned, the solution can progress from mere consultation of the child, to a parallel consent of the child and the legal representative, and even to the sole consent of the child if he or she is already mature.

> **7) – Right to participate**
>
> Children gradually become capable of contributing to decisions made about them. As they grow, they should participate more regularly about the exercise of their rights, including those relating to data protection.

The footnote to §6 records that there is no single European age scheme, verbatim:

> Some legal systems implement this general principle distinguishing the periods before 12, between 12 and 16 and from 16 to 18.

WP 160 also fixes its own definition of a child, verbatim:

> According to the criteria in most relevant international instruments, a child is someone under the age of 18, unless he or she has acquired legal adulthood before that age.

So the "renewal" flavour the ticket suspected **is genuinely there**, but it is narrower and more hedged than "consent must be renewed": the operative words are "**it seems that**" the data subject "**need give explicit consent wherever this is required**," and the controller "**must consider** obtaining" it — and the worked example is explicitly conditioned on the fact that "**sensitive data are involved**." The trigger is "**attaining majority**"/"attaining capacity," not an Art. 8 digital-consent age (Art. 8 did not exist in 2009).

#### 3.6.3 Adjudication: do they conflict?

**No — not on a fair reading. They are keyed to different triggers, different data categories, and different legal instruments.** Set side by side:

| | EDPB GL 05/2020 ¶¶147–149 | WP 160 Part II §4 |
|---|---|---|
| Instrument | GDPR (2020) | Directive 95/46/EC (2009) |
| Trigger | "the age of digital consent" (Art. 8 threshold) | "attaining majority" / "attaining capacity" |
| Scope gate | Art. 8: ISS **offered directly to a child** (¶127) | Children's data generally; example is a clinical trial |
| Default if the data subject does nothing | Parental consent **remains a valid ground** (¶148) | Controller "must make sure he still has a valid basis"; must "consider obtaining" the subject's own explicit consent |
| Data category | Not category-specific | Example expressly reasons "because **sensitive data** are involved" |

Two readings are available, and both defeat the "flat contradiction" thesis:

1. **Different-questions reading (stronger).** The EDPB is answering a narrow Art. 8 housekeeping question: when a child who was below the digital-consent threshold crosses it, does the controller's Art. 6(1)(a) basis evaporate? Answer: no, it persists, and the now-competent data subject may confirm/modify/withdraw. WP 160 is answering a different question about a controller with a *live, ongoing, sensitive* processing relationship (a clinical trial) where the original consent was **explicit consent to sensitive-data processing** given by a representative — and its answer is that the controller must re-verify its basis at capacity. Our app is in WP 160's category (Art. 9 explicit consent, ongoing processing of health data), not the EDPB's.
2. **Lex-posterior reading.** Even if they did conflict, EDPB GL 05/2020 is the later instrument, issued under the GDPR by the body that succeeded the WP29, and would prevail — but only *within its own stated scope*, which excludes us.

There is also a genuine tension worth naming honestly rather than smoothing over: WP 160 §4's reasoning ("the rights to data protection belong to the child, and not to their legal representatives, who simply exercise them") pulls toward the child's control being **restored** at capacity, whereas EDPB ¶148's default of silence-equals-continuity pulls toward **inertia** favouring the controller. Both can be true simultaneously — the right belongs to the child, *and* the processing does not become unlawful the instant they turn 18 — but a supervisory authority inclined toward the WP 160 emphasis could read an Art. 9(2)(a) explicit-consent basis for a health app as requiring affirmative re-confirmation at majority. **UNSETTLED**: no primary source we located resolves which emphasis governs an Art. 9 health app outside Art. 8.

**Status of WP 160 — verified, not assumed.** Fetched <https://edpb.europa.eu/sites/default/files/files/news/endorsement_of_wp29_documents_en_0.pdf> ("**Endorsement 1/2018**", Brussels, 25 May 2018). It endorses a closed list of **16** documents, verbatim preamble:

> Acknowledges the continuity of the work provided by the predecessor Article 29 Working Party. Without prejudice to any future revision as appropriate, it endorses the Article 29 Working Party documents as following:

The 16 items are the GDPR-era guidelines (consent WP259 rev.01, transparency WP260 rev.01, profiling WP251 rev.01, breach WP250 rev.01, portability WP242 rev.01, DPIA WP248 rev.01, DPO WP243 rev.01, lead SA WP244 rev.01, the Art. 30(5) position paper, BCR documents WP263/264/265/256/257, Adequacy Referential WP254 rev.01, fines WP253). **WP 160 is not on the list.** Endorsement 1/2018 also frames the endorsed set as documents the WP29 "adopted in the last two years ... on various aspects of the GDPR" — WP 160 (2009) is outside that set by construction.

Consequences, stated precisely:
- WP 160 has **not** been endorsed by the EDPB, so it is not EDPB guidance and carries no GDPR-era imprimatur.
- It has also **not** been formally withdrawn or superseded by any children-specific EDPB replacement that we could locate. It remains an archived Directive-era WP29 opinion of persuasive/historical weight only.
- EDPB GL 05/2020 does **not** cite WP 160 anywhere (checked the full extracted text; it cites Opinion 15/2011 on consent, WP 187, and WP259 rev.01, but not WP 160).
- **UNVERIFIED**: we could not retrieve an authoritative EDPB or Commission statement expressly addressing the residual status of *non-endorsed* pre-GDPR WP29 opinions. The `ec.europa.eu/newsroom/article29` index returned HTTP 404 and the EDPB children-topic facet was not retrievable (HTTP 500). Treat "WP 160 is persuasive only" as our inference from Endorsement 1/2018's closed list, not as a quoted holding.

#### 3.6.4 The trigger-age problem: 15, 16, or 18?

**No primary source we could find states which age marks the transition for a service outside Art. 8. This is UNSETTLED, and we should say so in the ticket rather than pick a number and pretend.**

What the sources give us:

- **15** is the Czech Art. 8 threshold (§ 7 zákon č. 110/2019 Sb.). It is *structurally unavailable* here: it is an Art. 8(1) derogation, and Art. 8 does not apply (settled, §3.2). Using 15 would import the one number the sources tell us is inapplicable.
- **16** is the Art. 8(1) GDPR default, per EDPB GL 05/2020 ¶125, verbatim: "Article 8(1) states that where consent applies, in relation to the offer of information society services directly to a child, the processing of the personal data of a child shall be lawful where the child is at least 16 years old." Same defect — it is Art. 8's number, and its own text is conditioned on "offered directly to a child."
- **18** is where the non-GDPR sources converge. WP 160 §4 uses "attaining majority" and WP 160's own definition puts childhood at "under the age of 18, unless he or she has acquired legal adulthood before that age." Czech law matches: § 30(1) obč. zák. — verified verbatim from <https://www.zakonyprolidi.cz/cs/2012-89>:

> Plně svéprávným se člověk stává zletilostí. Zletilosti se nabývá dovršením osmnáctého roku věku.

  and (per §3.5) § 858(2) has parental responsibility ending at full legal capacity. That is the moment the mother's authority to exercise the child's data-protection rights actually expires as a matter of Czech law.

**Our reasoned position (and it is a position, not a citation): 18.** The mother's competence to consent on the infant's behalf is not derived from Art. 8 — Art. 8 does not apply — it is derived from parental responsibility under the Czech Civil Code. A consent grounded in representative authority can only sensibly be time-limited by the expiry of that authority, which is majority at 18 under § 30(1) / § 858(2). Borrowing 15 or 16 would be borrowing a threshold from a provision we have already concluded does not govern us. WP 160, the only source that speaks to a non-Art.-8 transition at all, independently says "majority."

Caveat, honestly stated: an argument for **15** exists on a "why should a Czech teenager have *less* autonomy over health data than over a social network" fairness intuition, and a cautious controller could treat 15 as the point from which the young person's own wishes are honoured *if expressed*, while treating 18 as the point at which the parental basis stops being self-sustaining. Nothing in the sources compels either. **UNSETTLED.**

We searched for a primary source on the non-Art.-8 transition and did not find one. Negative findings, so the ticket does not repeat the search:
- ICO, "3. Age appropriate application" (Age appropriate design code), <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/3-age-appropriate-application/> — addresses age bands (including "16-17: approaching adulthood") and under-13 parental authorisation, but is **silent** on what happens to parental consent when the child reaches the relevant age: no continuing-validity rule, no refresh duty, no duty to notify.
- ÚOOÚ (Czech DPA): the legal-framework page <https://uoou.gov.cz/pravni-ramec/ochrana-osobnich-udaju> does not discuss § 7 of 110/2019 Sb., children's consent, or the majority transition. No ÚOOÚ guidance on the growing-up question was located. **UNVERIFIED** whether such guidance exists in an ÚOOÚ publication we could not reach; ÚOOÚ site search was not retrievable in this run.
- EDPB: no children-specific guideline later than GL 05/2020 addressing the transition was located (the topic-facet listing returned HTTP 500 / unusable content). **UNVERIFIED** rather than confirmed absent.
- WebSearch was unavailable for the whole of this run (repeated HTTP 400 tool errors), so this is a targeted-fetch sweep rather than an exhaustive search. **A follow-up keyword sweep is still warranted before treating the absence as conclusive.**

#### 3.6.5 The duty to inform: incoherent on these facts

EDPB ¶149 imposes it: "the controller must inform the child about this possibility" (withdrawal under Art. 7(3)), grounded in "the principles of fairness and accountability," with footnote 69 extending awareness to the Art. 17 right to erasure.

On our facts the duty has **no available addressee and no channel**:

- The developer holds **no contact detail for the child** — and could not acquire one without collecting *more* personal data about a minor, which cuts against Art. 5(1)(c) data minimisation. EDPB ¶145 makes the same trade-off explicit in the verification context, verbatim: "As a general rule, controllers should avoid verification solutions which themselves involve excessive collection of personal data."
- The data lives in **SwiftData on the mother's device and her own CloudKit private DB**. The developer cannot read it, enumerate users, or push a message to a specific data subject. There is no server-side user record to attach a reminder to.
- The **18-year horizon** makes the duty's addressee unstable in both directions: a solo developer may not exist, the app may be delisted, iOS/CloudKit may not run it, and the child may never have known the app existed.
- Whether the mother is even a **"controller"** in the GDPR sense for purely household record-keeping — versus the developer, who processes nothing centrally — is itself doubtful (household-exemption territory, Art. 2(2)(c)). If the mother is the controller, ¶149's duty runs from *her* to her own child, which is a family conversation, not a software feature. **UNSETTLED** and cross-refer to the controllership analysis in §5.1 and §5.7.

**No source addresses any of this.** ¶149 plainly presupposes an online-service controller with a live account and a comms channel to the data subject. Neither the EDPB, WP 160, ICO nor ÚOOÚ addresses a duty to inform where the controller has no channel, no identity for the data subject, and a horizon longer than the likely life of the product. Flagging as **UNSETTLED**; do not represent ¶149 as satisfiable here.

The one thing the sources *do* give us that survives on these facts is **Recital 65**, which makes the right exercisable by the grown-up data subject regardless of the passage of time. Fetched via <https://gdpr-info.eu/recitals/no-65/> — **UNVERIFIED as to official wording**: EUR-Lex blocked automated retrieval throughout this run (HTTP 202 bot-challenge on every endpoint tried), so this is a secondary reproduction and **should be re-verified against the Official Journal before the memo is finalised**:

> That right is relevant in particular where the data subject has given his or her consent as a child and is not fully aware of the risks involved by the processing, and later wants to remove such personal data, especially on the internet. The data subject should be able to exercise that right notwithstanding the fact that he or she is no longer a child.

Recital 38, same caveat, from <https://gdpr-info.eu/recitals/no-38/>:

> Children merit specific protection with regard to their personal data, as they may be less aware of the risks, consequences and safeguards concerned and their rights in relation to the processing of personal data.

The practical upshot: the child's *substantive* remedy at 18 does not depend on the developer having discharged a notification duty. The data is on the mother's device and in her iCloud; deletion is within the family's physical control, not the developer's. That is a meaningful mitigation of the ¶149 gap and worth stating in the memo — the architecture that makes the duty unperformable is the same architecture that makes the remedy self-executing.

#### 3.6.6 What v1 must do

**Mostly "note it and do nothing" — but not entirely. Three cheap things now; one thing explicitly deferred; one thing to not build.**

Do now:

1. **Make the record deletable and exportable at the granularity of the child.** This is the only thing that actually preserves the answer for year 18, and it is justified independently by Art. 17 and Art. 20 (and by Recital 65's "notwithstanding the fact that he or she is no longer a child"). If at 18 the young adult says "delete it," the app must be able to do that without surgery. Concretely: a working delete-all-data path and a data export the mother can hand over. Do not defer this — retrofitting deletion into a schema that assumed permanence is the expensive failure mode.
2. **Record the consent event with a timestamp and a version.** Store *when* the mother consented, to *what* text, and *what version* of the purposes. One small SwiftData record. Without it, no one in 2044 can establish what was consented to, and the accountability limb of Art. 5(2) / ¶149's "fairness and accountability" is unanswerable. This is the single highest value-per-line item in this subsection.
3. **Say it in the privacy notice, in Czech, in one or two sentences.** State that the records concern the child, that they are kept on the mother's device, that the child may ask for them to be deleted when they grow up, and that the mother is expected to pass this on. That is the only realistic discharge of ¶149's spirit given no channel to the child — it routes the information through the person who *does* have a lifelong channel to the data subject. Frame it as informing the mother of the child's future right, not as informing the child.

Explicitly defer, with the reason recorded:

4. **No re-consent mechanism at 15/16/18 in v1.** Given §3.6.4 is **UNSETTLED** and §3.6.3 shows the EDPB default is continuity (¶148: parental consent "will remain a valid ground"), building an age-triggered re-consent flow now would encode a guess about an unresolved question into the schema. Record the open question in the ADR/backlog. Revisit if ÚOOÚ or the EDPB publishes on the non-Art.-8 transition, or if the app ever grows a backend or an account — either of which would change the ¶149 analysis materially by creating a channel.

Do **not** build:

5. **Do not collect the child's identity, contact details, or a future-contact channel** in order to be able to notify them at 18. It fails data minimisation (Art. 5(1)(c)), it is the precise pattern EDPB ¶145 warns against, and it would create an 18-year retention obligation for contact data about a minor in order to service a duty that the sources do not clearly impose on this architecture. The cure is worse than the disease.

**Honest note on the horizon.** A fifteen-to-eighteen-year compliance horizon is not something a v1 of a solo-developer app can meaningfully engineer for; the platform, the developer's existence, and the law will all change. The defensible posture is not "we solved the year-18 problem" but "we did not foreclose it": deletable data, a dated consent record, and a written statement that the right exists. Items 1–3 cost little and are each justified on grounds *other* than the growing-up question, which is why they survive the uncertainty in §3.6.3 and §3.6.4.

---

*Not legal advice. This subsection reports what the cited primary sources say and flags where they are silent or in tension; it is not a legal opinion and does not substitute for advice from a qualified Czech data-protection practitioner or a consultation with ÚOOÚ. All URLs fetched 2026-08-14. Two items require re-verification before the memo is finalised: the GDPR recital wording (EUR-Lex blocked automated access; quoted here from a secondary reproduction) and the completeness of the negative search findings in §3.6.4 (WebSearch was unavailable throughout this run).*

## 4. What explicit consent requires in practice

**Takeaway: the "explicit" in Art. 9(2)(a) is a requirement about the _form_ of the indication, not an extra substantive test — everything in Art. 4(11) and Art. 7 still applies on top, and an ordinary in-app "I consent" checkbox with clear wording is an accepted form (EDPB Guidelines 05/2020, Example 17). The two genuinely hard problems for this app are (a) whether consent can be "freely given" when the app cannot function without the health data, and (b) what withdrawal can mean when the controller holds no copy of the data. On (a) primary sources give a workable answer — EDPB paras 100–102 accept consent as freely given where the special-category data is necessary for the very service the user requested, and expressly disapply Art. 7(4) in that case. On (b) no primary source addresses a controller-holds-nothing architecture and the point is left **UNSETTLED**.**

_This document is legal research, not legal advice. It is a reading of primary sources by a non-lawyer and has not been reviewed by a qualified Czech or EU data protection lawyer. Nothing here should be relied on as a compliance opinion._

**Sources used in this section, with fetch dates (all fetched 2026-08-14):**

| Source | URL fetched |
|---|---|
| GDPR Arts. 4(11), 5, 6, 7, 9, 13, 17; Recitals 32, 33, 42, 43, 51 | `https://gdpr-info.eu/art-4-gdpr/`, `/art-5-gdpr/`, `/art-6-gdpr/`, `/art-7-gdpr/`, `/art-9-gdpr/`, `/art-13-gdpr/`, `/art-17-gdpr/`, `/recitals/no-32/` … `/no-51/` |
| EDPB Guidelines 05/2020 on consent under Regulation 2016/679, v1.1, adopted 4 May 2020 (formatting corrections 13 May 2020) | `https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf` |
| WP29 Opinion 15/2011 on the definition of consent (WP 187), 13 July 2011 | `https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2011/wp187_en.pdf` |
| WP29 Opinion 02/2013 on apps on smart devices (WP 202), 27 February 2013 | `https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2013/wp202_en.pdf` |
| EDPB Guidelines 03/2020 on the processing of data concerning health for scientific research in the COVID-19 outbreak | `https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202003_healthdatascientificresearchcovid19_en.pdf` |
| EDPB Opinion 3/2019 (Clinical Trials Regulation / GDPR interplay), adopted 23 January 2019 | `https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_opinionctrq_a_final_en.pdf` |

**Note on the EUR-Lex authentic text.** EUR-Lex (`eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679`) returned HTTP 202 with an empty body on every attempt on 2026-08-14, so the Regulation text quoted below was taken from `gdpr-info.eu`, which reproduces the OJ text. The wording was cross-checked against the verbatim quotations of Art. 7(4) and Recital 43 that appear in footnote 22 of the EDPB Guidelines (an EDPB-published document) and they match. For any filing or advice, re-verify against OJ L 119, 4.5.2016, p. 1.

**Note on the WP29 documents.** WP29 opinions are the predecessor body to the EDPB. EDPB Guidelines 05/2020 is the operative document (it is a lightly revised re-adoption of WP259 rev.01), but it repeatedly cites WP 187 as remaining relevant — Guidelines 05/2020 para 4 (fetched 2026-08-14):

> The existing Article 29 Working Party (WP29) Opinions on consent remain relevant, where consistent [with the GDPR framework].

WP 202 (apps on smart devices) predates the GDPR and interprets Directive 95/46/EC. It has **not** been re-endorsed by the EDPB under the GDPR. It is used below as persuasive-only material on app-specific questions the GDPR-era guidance does not reach, and every such use is flagged.

---

### 4.1 What makes consent "explicit" as distinct from ordinary consent

**Takeaway: "explicit" governs the _form_ of the expression — the data subject must make an _express statement_ of consent rather than an inferred or implied one. It is a higher bar than "clear affirmative action", but it does not require a wet signature, and an in-app consent screen with an affirmative-wording checkbox is expressly accepted.**

EDPB Guidelines 05/2020 para 92 frames the question (fetched 2026-08-14):

> The GDPR prescribes that a "statement or clear affirmative action" is a prerequisite for 'regular' consent. As the 'regular' consent requirement in the GDPR is already raised to a higher standard compared to the consent requirement in Directive 95/46/EC, it needs to be clarified what extra efforts a controller should undertake in order to obtain the explicit consent of a data subject in line with the GDPR.

Para 93 gives the core definition:

> The term explicit refers to the way consent is expressed by the data subject. It means that the data subject must give an express statement of consent. An obvious way to make sure consent is explicit would be to expressly confirm consent in a written statement. Where appropriate, the controller could make sure the written statement is signed by the data subject, in order to remove all possible doubt and potential lack of evidence in the future.

Para 94 is the operative permission for a software product — a signature is *not* required:

> However, such a signed statement is not the only way to obtain explicit consent and, it cannot be said that the GDPR prescribes written and signed statements in all circumstances that require valid explicit consent. For example, in the digital or online context, a data subject may be able to issue the required statement by filling in an electronic form, by sending an email, by uploading a scanned document carrying the signature of the data subject, or by using an electronic signature. In theory, the use of oral statements can also be sufficiently express to obtain valid explicit consent, however, it may be difficult to prove for the controller that all conditions for valid explicit consent were met when the statement was recorded.

**Example 17 (para 96) is the single most directly applicable passage in the whole guidance for this app**, and it validates a checkbox:

> Example 17: A data controller may also obtain explicit consent from a visitor to its website by offering an explicit consent screen that contains Yes and No check boxes, provided that the text clearly indicates the consent, for instance "I, hereby, consent to the processing of my data", and not for instance, "It is clear to me that my data will be processed". It goes without saying that the conditions for informed consent as well as the other conditions for obtaining valid consent should be met.

Note the two operative constraints buried in that example:

1. **Yes _and_ No boxes** — the screen must present a refusal option, not only an accept affordance. Cross-check WP 202 p. 14 (persuasive only, pre-GDPR): "The user should not be confronted with a screen containing a single 'Yes I accept' option in order to finish the installation. An option to 'Cancel' or otherwise halt the installation must be available."
2. **Performative wording, not acknowledgement wording.** "I hereby consent to…" is valid; "It is clear to me that my data will be processed" is not. Guidelines footnote 38 repeats the point independently: "The declaration of consent must be named as such. Drafting, such as 'I know that…' does not meet the requirement of clear language."

Para 98 offers a stronger (optional) route:

> Two stage verification of consent can also be a way to make sure explicit consent is valid. For example, a data subject receives an email notifying them of the controller's intent to process a record containing medical data. […] If the data subjects agrees to the use of this data, the controller asks him or her for an email reply containing the statement 'I agree'. After the reply is sent, the data subject receives a verification link that must be clicked, or an SMS message with a verification code, to confirm agreement.

Two-stage verification is presented as "**can also be** a way" — permissive, not mandatory. Nothing in Guidelines 05/2020 requires two-stage verification for health data; Example 17 (checkbox) and Example 18 (electronic signature, for a *transfer of a medical record to a third party*) sit side by side as alternatives. This app's processing is not a disclosure to a third party, so the Example 18 fact pattern is not the closest analogue.

#### What is rejected

| Rejected form | Source |
|---|---|
| Silence, pre-ticked boxes, inactivity | Recital 32 sentence 3; Guidelines para 79 ("The use of pre-ticked opt-in boxes is invalid under the GDPR.") |
| Opt-out / objection-based constructions | WP 187 p. 25: "Opt-out solutions will not meet the requirement of being 'explicit'" — the WP29 example is a patient told his file "will be transferred to a researcher unless he objects (by calling a number)", which "will not meet the requirement of explicit consent" |
| Inferred or implied consent | WP 187 p. 25: "The requirement for explicit consent means that consent that is inferred will not normally meet the requirement of Art 8(2)." |
| Scrolling or swiping through a page | Guidelines Example 16 (para 86): "actions such as scrolling or swiping through a webpage or similar user activity will not under any circumstances satisfy the requirement of a clear and affirmative action" |
| Consent bundled into the same motion as accepting T&Cs | Guidelines para 81: "consent cannot be obtained through the same motion as agreeing to a contract or accepting general terms and conditions of a service. Blanket acceptance of general terms and conditions cannot be seen as a clear affirmative action" |
| Acknowledgement-worded statements ("I understand that…") | Guidelines Example 17 and footnote 38 |
| Merely tapping "Install" in the App Store | WP 202 p. 14 (persuasive only): "Whilst such an action may, in some circumstances, fulfil the consent requirement of Article 5(3), it is unlikely to provide sufficient information in order to act as valid consent for the processing of personal data." |

**Consequence for this app:** the App Store purchase/install flow can carry no consent weight whatsoever. Consent must be a distinct in-app screen, and — per Guidelines para 90 — it must come *before* any recording: "consent must always be obtained before the controller starts processing personal data for which consent is needed."

WP 187 p. 25 also supplies the underlying meaning, which the GDPR-era guidance does not restate as crisply:

> In legal terms "explicit consent" is understood as having the same meaning as express consent. It encompasses all situations where individuals are presented with a proposal to agree or disagree to a particular use or disclosure of their personal information and they respond actively to the question, orally or in writing.

---

### 4.2 Art. 4(11) and Art. 7 — the four elements, applied

**Takeaway: Art. 9(2)(a) does not replace the ordinary conditions, it adds to them. All of Art. 4(11) and all of Art. 7 apply cumulatively, and Guidelines para 103 says so expressly.**

Art. 4(11) GDPR verbatim (fetched 2026-08-14, `https://gdpr-info.eu/art-4-gdpr/`):

> 'consent' of the data subject means any freely given, specific, informed and unambiguous indication of the data subject's wishes by which he or she, by a statement or by a clear affirmative action, signifies agreement to the processing of personal data relating to him or her;

Art. 7 GDPR verbatim, in full (fetched 2026-08-14, `https://gdpr-info.eu/art-7-gdpr/`):

> **1.** Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented to processing of his or her personal data.
>
> **2.** If the data subject's consent is given in the context of a written declaration which also concerns other matters, the request for consent shall be presented in a manner which is clearly distinguishable from the other matters, in an intelligible and easily accessible form, using clear and plain language. Any part of such a declaration which constitutes an infringement of this Regulation shall not be binding.
>
> **3.** The data subject shall have the right to withdraw his or her consent at any time. The withdrawal of consent shall not affect the lawfulness of processing based on consent before its withdrawal. Prior to giving consent, the data subject shall be informed thereof. It shall be as easy to withdraw as to give consent.
>
> **4.** When assessing whether consent is freely given, utmost account shall be taken of whether, inter alia, the performance of a contract, including the provision of a service, is conditional on consent to the processing of personal data that is not necessary for the performance of that contract.

That Art. 7 applies to Art. 9 consent is stated directly — Guidelines para 103:

> The GDPR introduces requirements for controllers to make additional arrangements to ensure they obtain, and maintain and are able to demonstrate, valid consent. Article 7 of the GDPR sets out these additional conditions for valid consent, with specific provisions on keeping records of consent and the right to easily withdraw consent. **Article 7 also applies to consent referred to in other articles of GDPR, e.g. Articles 8 and 9.**

(Emphasis added.) EDPB Guidelines 03/2020 para 18 confirms the cumulative reading for health data specifically:

> However, it has to be noted that all the conditions for explicit consent, particularly those found in Article 4 (11), Article 6 (1) (a), Article 7 and Article 9 (2) (a) GDPR, must be fulfilled. Notably, consent must be freely given, specific, informed, and unambiguous, and it must be made by way of a statement or "clear affirmative action".

Note that this passage also confirms the **two-basis structure**: Art. 6(1)(a) *in conjunction with* Art. 9(2)(a). EDPB Opinion 3/2019 para 14 uses the same formulation: "the data subject's explicit consent (Article 6(1)(a) in conjunction with Article 9(2)(a))". So a single consent act must satisfy both provisions; the app needs an Art. 6 basis as well as the Art. 9 derogation, and where both are consent they are obtained together.

#### Element-by-element application to this app

| Element | Requirement (source) | Application here |
|---|---|---|
| **Freely given** | Real choice, no detriment, no bundling; Art. 7(4), Recital 42–43 | The hard one — see 4.4. Provisionally satisfiable via Guidelines paras 100–102. |
| **Specific** | Purpose specification against function creep; granularity; separation from other matters (Guidelines para 55) | The purpose must be stated concretely. Guidelines footnote 30, quoting WP 203: "a purpose that is vague or general, such as for instance 'improving users' experience', 'marketing purposes', 'IT-security purposes' or 'future research' will — without more detail — usually not meet the criteria of being 'specific'." So "to help you track your child's eczema" is borderline; state it as recording meals, skin observations and photographs so the user can keep and review a record. |
| **Informed** | Six-item minimum content list, Guidelines para 64 | See 4.7. |
| **Unambiguous** | Active motion or declaration; Guidelines para 75 | Satisfied by the Example 17 checkbox + explicit "Continue"/"I consent" action. |
| **Explicit** (Art. 9 overlay) | Express statement, per 4.1 | Satisfied by performative wording on that checkbox. |
| **Prior** | Guidelines para 90 | Consent screen must gate first data entry, not appear afterwards. |
| **Distinguishable** (Art. 7(2)) | Not a paragraph in T&Cs; Guidelines para 71 | Must be its own screen, not a line in the EULA or privacy policy. |

Guidelines para 71 anticipates the small-screen problem directly and permits layering:

> Likewise, if consent is requested by electronic means, the consent request has to be separate and distinct, it cannot simply be a paragraph within terms and conditions, pursuant to Recital 32. To accommodate for small screens or situations with restricted room for information, a layered way of presenting information can be considered, where appropriate, to avoid excessive disturbance of user experience or product design.

But layering has an evidentiary limit — Guidelines footnote 42:

> Note that when the identity of the controller or the purpose of the processing is not apparent from the first information layer of the layered privacy notice (and are located in further sub-layers), it will be difficult for the data controller to demonstrate that the data subject has given informed consent, unless the data controller can show that the data subject in question accessed that information prior to giving consent.

**Design consequence:** controller identity and purposes must be on the *first* layer of the consent screen, on-screen, not behind a "Learn more" tap.

---

### 4.3 Granularity: does one consent cover both local recording and iCloud sync?

**Takeaway: the test in the primary sources is _purpose_, not _technical operation_. Recital 32 says consent covers all operations serving the same purpose; Recital 43 requires separate consent for separate operations only "despite it being appropriate in the individual case". A defensible position is that local storage and iCloud sync serve the same purpose (keeping the user's own record available to her) and can share one consent — but that position is a judgement call, not something a primary source resolves, and it is stronger if sync is a separately toggleable feature. Rated **UNSETTLED** on the specific local-vs-sync question; the safe design is a separate opt-in for sync.**

Recital 43 second sentence verbatim (fetched 2026-08-14, `https://gdpr-info.eu/recitals/no-43/`):

> Consent is presumed not to be freely given if it does not allow separate consent to be given to different personal data processing operations despite it being appropriate in the individual case, or if the performance of a contract, including the provision of a service, is dependent on the consent despite such consent not being necessary for such performance.

Recital 32 sentences 4–5 verbatim (fetched 2026-08-14, `https://gdpr-info.eu/recitals/no-32/`):

> Consent should cover all processing activities carried out for the same purpose or purposes. When the processing has multiple purposes, consent should be given for all of them.

Guidelines paras 42–44 put the two together:

> 42. A service may involve multiple processing operations for more than one purpose. In such cases, the data subjects should be free to choose which purpose they accept, rather than having to consent to a bundle of processing purposes. In a given case, several consents may be warranted to start offering a service, pursuant to the GDPR.
>
> 43. Recital 43 clarifies that consent is presumed not to be freely given if the process/procedure for obtaining consent does not allow data subjects to give separate consent for personal data processing operations respectively (e.g. only for some processing operations and not for others) despite it being appropriate in the individual case. […]
>
> 44. If the controller has conflated several purposes for processing and has not attempted to seek separate consent for each purpose, there is a lack of freedom. This granularity is closely related to the need of consent to be specific […] When data processing is done in pursuit of several purposes, the solution to comply with the conditions for valid consent lies in granularity, i.e. the separation of these purposes and obtaining consent for each purpose.

And para 57, which is the one that helps this app:

> In line with the concept of purpose limitation, Article 5(1)(b) and recital 32, consent may cover different operations, **as long as these operations serve the same purpose**.

(Emphasis added.)

#### The argument each way

| Position | Reasoning from sources |
|---|---|
| **One consent suffices** | Local write and CloudKit sync are two *operations* serving one *purpose*: making the mother's own record durable and available to her. Guidelines para 57 permits one consent across operations serving the same purpose. Recital 43's separation duty is conditioned on "despite it being **appropriate** in the individual case" — it is not unconditional. Guidelines Example 7 (para 45), the only granularity example given, concerns two genuinely different purposes (email marketing vs sharing with group companies) — a materially different fact pattern. |
| **Separate consent needed** | Sync is not necessary to the core function (the app works offline); it changes the risk profile (data leaves the device, crosses into Apple's infrastructure, potentially crosses borders); and Guidelines para 61 requires the user be made "aware of the impact of the different choices they have". WP 202 (persuasive only) treats the on-device vs client-server choice as materially significant: "Storing and processing data on the device gives the end users the greatest control over those data, for example allowing them to delete the data if they withdraw consent to its processing." |

**No primary source addresses the local-storage-plus-user's-own-cloud-account pattern.** Every EDPB and WP29 example involves the controller receiving the data. That absence is exactly the reason this is **UNSETTLED**: the granularity guidance was written for a world where "sync to the cloud" means "sync to the controller", and here it does not.

#### Practical recommendation (engineering, not a legal conclusion)

Because the separation is cheap to implement and the argument for bundling is only *defensible* rather than *settled*, the low-risk design is:

- **Consent 1 (required to use the app):** record meals, skin observations and photographs on this device, for the purpose of keeping a personal record of the child's eczema.
- **Consent 2 (separately toggleable, default off, revocable in Settings):** additionally copy that record to the user's own iCloud account so it is available across her devices and survives device loss.

This also produces a bonus benefit under Art. 7(4): if sync is optional and refusing it does not degrade the core product, then the *only* mandatory consent is the one for data genuinely necessary to the requested service — which is precisely the configuration Guidelines para 100 blesses (see 4.4). Bundling sync into a single mandatory consent would drag non-necessary processing inside the mandatory ask and would weaken the Art. 7(4) position on the whole consent.

A further point that follows from Recital 32 sentence 5 ("When the processing has multiple purposes, consent should be given for all of them"): **photographs may warrant their own opt-in.** Photographs of a child's skin are materially more intrusive than a four-level severity code, and an app that lets the user log observations without ever taking a photo has, on the face of it, two separable operations with different impact on the data subject. No source mandates this split. It is flagged as a design option, **UNVERIFIED** against any primary source. (Note: Recital 51 sentence 3 means the photographs are not special-category data *as biometric data* — "The processing of photographs should not systematically be considered to be processing of special categories of personal data as they are covered by the definition of biometric data only when processed through a specific technical means allowing the unique identification or authentication of a natural person." They are nonetheless health data here, because of what they depict and the context; that is settled input to this document.)

---

### 4.4 "Freely given" and conditionality — the mandatory-consent bind

**Takeaway: this is the question the ticket flagged as possibly unresolvable, and it turns out primary sources DO resolve it, favourably. EDPB Guidelines 05/2020 Examples 19 and 20 (paras 100–102) both concern special-category data that is _necessary for the very service the data subject requested_, and in both the EDPB concludes explicit consent is valid and freely given. Para 100 states flatly that "since that data are necessary for the provision of the requested service, Article 7 (4) does not apply." Art. 7(4) bites on _unnecessary_ data, not on data intrinsic to the requested function. The residual risk is not Art. 7(4) — it is the separate "genuine choice / no detriment" limb, which is satisfied here because the user can simply not buy or not use the app, and because there is no imbalance of power.**

Art. 7(4) verbatim is quoted in 4.2 above. Recital 43 is quoted in 4.3. The apparent bind is real on the face of the text: the app cannot function without recording health data, so consent looks like a condition of the service, and Recital 43 presumes such consent unfree.

But Art. 7(4)'s trigger is narrower than that. Guidelines para 32 is decisive:

> Article 7(4) is only relevant where the requested data are **not necessary** for the performance of the contract, (including the provision of a service), and the performance of that contract is made conditional on the obtaining of these data on the basis of consent. **Conversely, if processing is necessary to perform the contract (including to provide a service), then Article 7(4) does not apply.**

(Emphasis added.) And para 26 explains the mischief the provision targets:

> Article 7(4) seeks to ensure that the purpose of personal data processing is not disguised nor bundled with the provision of a contract of a service for which these personal data are not necessary. In doing so, the GDPR ensures that the processing of personal data for which consent is sought cannot become directly or indirectly the counter-performance of a contract.

The recorded eczema data is not counter-performance extracted in exchange for the app; it *is* the app's output, held for the user's own benefit. Nothing flows to the developer.

#### The two examples that resolve it

**Example 19 (para 100)** — airline travel assistance:

> An airline company, Holiday Airways, offers an assisted travelling service for passengers that cannot travel unassisted, for example due to a disability. A customer books a flight from Amsterdam to Budapest and requests travel assistance to be able to board the plane. Holiday Airways requires her to provide information on her health condition to be able to arrange the appropriate services for her […] Holiday Airways asks for explicit consent to process the health data of this customer for the purpose of arranging the requested travel assistance. -The data processed on the basis of consent should be necessary for the requested service. Moreover, flights to Budapest remain available without travel assistance. **Please note that since that data are necessary for the provision of the requested service, Article 7 (4) does not apply.**

(Emphasis added.)

**Example 20 (paras 101–102)** — custom prescription ski goggles:

> In order to be able to provide its customised products to customers who are short-sighted, this controller requests consent for the use of information on customers' eye condition. Customers provide the necessary health data, such as their prescription data online when they place their order. **Without this, it is not possible to provide the requested customized eyewear.** The company also offers series of goggles with standardized correctional values. Customers that do not wish to share health data could opt for the standard versions. **Therefore, an explicit consent under Article 9 is required and consent can be considered to be freely given.**

(Emphasis added.) Note the structure of the EDPB's reasoning in both examples:

1. The health data is *necessary* for the requested service → Art. 7(4) does not apply (Example 19, explicit).
2. There exists a way to deal with the controller *without* giving the health data (unassisted flights; standard goggles) → genuine choice exists.
3. Therefore consent is freely given.

Limb 1 maps onto this app cleanly. Limb 2 is where it needs thought.

#### Applying limb 2 — is there "genuine choice"?

Strictly read, both examples feature a **service variant that does not require the health data** — and this app has no such variant. An eczema tracker with the eczema data removed is not a product. So the question is whether limb 2 is a *necessary* condition or merely a *sufficient* reinforcement in those two examples.

Guidelines para 37 sheds light. It discusses alternatives in the context of *additional* data uses:

> The controller could argue that his organisation offers data subjects genuine choice if they were able to choose between a service that includes consenting to the use of personal data for additional purposes on the one hand, and an equivalent service offered by the same controller that does not involve consenting to data use for additional purposes on the other hand. As long as there is a possibility to have the contract performed or the contracted service delivered by this controller without consenting to the other or additional data use in question, this means there is no longer a conditional service.

The alternative-variant device in para 37 is a cure for *conditionality*, i.e. for the Art. 7(4) problem. If Art. 7(4) does not apply in the first place (para 32), no cure is needed. On that reading, the standard-goggles alternative in Example 20 is the EDPB belting-and-bracing rather than a freestanding requirement — and the app's lack of a data-free variant is not fatal.

Two further arguments support free consent here:

**No imbalance of power.** Recital 43 first sentence targets "a clear imbalance between the data subject and the controller, in particular where the controller is a public authority". EDPB Guidelines 03/2020 para 21, on a symptom-tracking survey, is the closest analogue found:

> In the view of the EDPB, the example above is not considered a case of "clear imbalance of power" as mentioned in Recital 43 and the data subject should be able to give the consent to the researchers. In the example, the data subjects are not in a situation of whatsoever dependency with the researchers that could inappropriately influence the exercise of their free will and it is also clear that it will have no adverse consequences if they refuse to give their consent.

A consumer buying a paid app from a solo developer is not in a relationship of dependency, is not a patient of the developer, and suffers no adverse consequence from declining — she has bought a piece of software she then chooses not to use. Compare the *opposite* result in EDPB Opinion 3/2019 paras 19–20 (clinical trials), where consent failed precisely because of "institutional or hierarchical dependency" and because participants "belong to an economically or socially disadvantaged group" — factors absent here.

**No detriment on refusal or withdrawal.** Guidelines para 46:

> The controller needs to demonstrate that it is possible to refuse or withdraw consent without detriment (recital 42). For example, the controller needs to prove that withdrawing consent does not lead to any costs for the data subject and thus no clear disadvantage for those withdrawing consent.

This is the one place the *paid* nature of the app creates genuine exposure, and it deserves flagging. Guidelines Example 8 (para 49) holds that an app which "now only works to a limited extent" after withdrawal inflicts detriment "which means that consent was never validly obtained". Read literally against an app that ceases to be usable at all on withdrawal, that is uncomfortable. The distinguishing feature is that in Example 8 the accelerometer data was expressly "not necessary for the app to work" — it was an additional use, and the degradation was punitive. Here, cessation of function is not a penalty imposed by the controller but the logical consequence of there being no data to display. Still, this is the residual soft spot in the analysis and is rated **UNSETTLED**: no source found addresses detriment where the withdrawn processing *is* the product.

#### Mitigations that strengthen the position

| Mitigation | Basis |
|---|---|
| Show the consent screen **before** purchase-relevant commitment where possible, or make clear pre-purchase (App Store description) that health data recording is intrinsic | Recital 42 last sentence — consent is not free where the subject "is unable to refuse or withdraw consent without detriment"; a refund path removes the financial detriment |
| Point users to Apple's refund mechanism if they decline consent after purchase | Removes the "costs for the data subject" that para 46 identifies as detriment |
| Keep the mandatory consent to the **minimum** necessary processing, with sync (and arguably photos) as separate optional consents | Guidelines paras 32 and 44 — mandatory ask must cover only necessary data |
| Do not make refusal of any optional consent degrade unrelated functionality | Guidelines para 48 |
| State plainly that no data is transmitted to the developer | Supports the para 26 point that data is not counter-performance |

**Bottom line on 4.4:** the ticket's framing — "what happens when consent is BOTH mandatory-for-function AND the only available limb?" — has an answer in the primary sources, and it is that Art. 7(4) simply does not engage (Guidelines para 32, Example 19). Paras 99–102 are best read as a set: para 99 says explicit consent is the residual limb where (b)–(j) fail, and paras 100–102 immediately illustrate that residual consent working validly in exactly the necessary-for-service posture. The EDPB placed those examples directly after para 99 for that reason. What remains genuinely unresolved is narrower than the ticket feared: not "can mandatory consent ever be free" but "does total loss of function on withdrawal count as detriment under Recital 42 when the processing is the product". **UNSETTLED.**

---

### 4.5 Evidence and demonstrability

**Takeaway: the controller must be able to show _that_ consent was given, _when_, _how_, and _what information was displayed at the time_ — and must keep proof for as long as the processing lasts, then only as long as strictly necessary for a legal obligation or legal claims. Note a correction to the ticket's premise: the EDPB grounds post-withdrawal retention of consent evidence in Art. 17(3)(b) and (e), NOT in Art. 9(2)(f). Art. 9(2)(f) is not cited anywhere in Guidelines 05/2020.**

Art. 7(1) verbatim (quoted in full in 4.2): "Where processing is based on consent, the controller shall be able to demonstrate that the data subject has consented to processing of his or her personal data."

Art. 5(2) verbatim (fetched 2026-08-14, `https://gdpr-info.eu/art-5-gdpr/`):

> The controller shall be responsible for, and be able to demonstrate compliance with, paragraph 1 ('accountability').

Guidelines para 104:

> In Article 7(1), the GDPR clearly outlines the explicit obligation of the controller to demonstrate a data subject's consent. The burden of proof will be on the controller, according to Article 7(1).

Guidelines para 106 sets the counterweight — demonstrability must not itself become a data-collection excuse:

> Controllers are free to develop methods to comply with this provision in a way that is fitting in their daily operations. At the same time, the duty to demonstrate that valid consent has been obtained by a controller, should not in itself lead to excessive amounts of additional data processing. This means that controllers should have enough data to show a link to the processing (to show consent was obtained) but they shouldn't be collecting any more information than necessary.

Para 108 is the concrete list of what to retain:

> For instance, the controller may keep a record of consent statements received, so he can show how consent was obtained, when consent was obtained and the information provided to the data subject at the time shall be demonstrable. The controller shall also be able to show that the data subject was informed and the controller's workflow met all relevant criteria for a valid consent. […] For example, in an online context, a controller could retain information on the session in which consent was expressed, together with documentation of the consent workflow at the time of the session, and a copy of the information that was presented to the data subject at that time. **It would not be sufficient to merely refer to a correct configuration of the respective website.**

(Emphasis added.) That last sentence matters for this app: "our consent screen is coded correctly, here is the source" is expressly declared insufficient as a standalone answer.

#### The retention period

Guidelines para 107:

> It is up to the controller to prove that valid consent was obtained from the data subject. The GDPR does not prescribe exactly how this must be done. However, the controller must be able to prove that a data subject in a given case has consented. **As long as a data processing activity in question lasts, the obligation to demonstrate consent exists. After the processing activity ends, proof of consent should be kept no longer then strictly necessary for compliance with a legal obligation or for the establishment, exercise or defence of legal claims, in accordance with Article 17(3)(b) and (e).**

(Emphasis added.)

**Correction to a premise in the research brief.** The brief asked whether "Art. 9(2)(f) [is] the limb for retaining consent evidence after withdrawal, if guidance supports that." The guidance does **not** frame it that way. A full-text search of Guidelines 05/2020 for "9(2)(f)" and for "legal claims" returns exactly one hit — para 107 — and it cites **Art. 17(3)(b) and (e)**, which are exceptions to the *right to erasure*, not Art. 9(2) derogations. This is a meaningful distinction:

- Art. 17(3)(e) ("for the establishment, exercise or defence of legal claims") answers the question *may I refuse an erasure request for this record?*
- Art. 9(2)(f) ("processing is necessary for the establishment, exercise or defence of legal claims") would answer the question *what lifts the Art. 9(1) prohibition on my continuing to hold special-category data?*

Both are plausibly needed in a real dispute, but **only the Art. 17(3) route is supported by the guidance actually fetched**. Whether Art. 9(2)(f) additionally applies to retained consent evidence is **UNVERIFIED** — no fetched source addresses it. In practice the point may be moot for this app, because the consent-evidence record need not contain health data at all (see below), so Art. 9 need not be engaged for it.

#### What this means for a no-backend app

This is the second place where the architecture creates a gap the sources do not anticipate. Guidelines para 108 assumes a server-side log. Here there is none: the developer never receives anything.

Consequences and options:

| Option | Assessment |
|---|---|
| **Store the consent record locally on-device** (timestamp, consent version, hash or copy of the exact text shown, which optional toggles were set) and include it in the CloudKit sync | Satisfies the *content* of para 108. But the developer cannot read it, so it proves consent only if the user produces it — which in an adversarial posture (a complaint to a DPA by that same user) is not obviously worth much. |
| **Retain the artefacts rather than the events**: version-control every consent screen string, keep dated screenshots of each released consent flow, and record which app version shipped which consent text | This is the realistic core of the developer's evidence. It addresses "the information provided to the data subject at the time shall be demonstrable" (para 108) and "documentation of the consent workflow at the time of the session". It does *not* address "when consent was obtained" for a specific individual. |
| **Send a consent receipt to the developer** | Would satisfy para 108 fully but destroys the entire privacy proposition and contradicts para 106's warning against demonstrability driving "excessive amounts of additional data processing". Not recommended. |

**Assessment: partial compliance is the best achievable and this is a real, unresolved residual risk.** The developer can fully demonstrate *what* was shown and *how* the flow worked, for every released version. He cannot independently demonstrate *that a specific data subject consented on a specific date*, without collecting data he has deliberately chosen not to collect. **No fetched primary source addresses how Art. 7(1) applies to a controller that by design holds no user records — UNSETTLED.** The para 106 minimisation principle is the strongest available argument that the local-record-plus-versioned-artefacts approach is proportionate, but it is an argument, not authority.

One mitigating observation: WP 187 p. 26 (persuasive only, pre-GDPR) accepts that evidentiary strength is expected to scale with context rather than being absolute — "Consent does not have to be recordable to be valid. However, it is in the interest of the data controller to retain evidence. Obviously, the strength of the evidence provided by a specific mechanism may vary". Art. 7(1) hardened this into an obligation, so WP 187 cannot be relied on to excuse the gap; it is noted only as context for why a proportionality argument is available.

#### Consent refresh

Guidelines paras 110–111:

> 110. There is no specific time limit in the GDPR for how long consent will last. How long consent lasts will depend on the context, the scope of the original consent and the expectations of the data subject. If the processing operations change or evolve considerably then the original consent is no longer valid. If this is the case, then new consent needs to be obtained.
>
> 111. The EDPB recommends as a best practice that consent should be refreshed at appropriate intervals. Providing all the information again helps to ensure the data subject remains well informed about how their data is being used and how to exercise their rights.

Refresh is "best practice", not obligation. But para 110's first limb is an obligation, and it has a direct product consequence: **the derived-insight engine, if built, requires fresh consent.** Correlating meals against skin observations is a new purpose, not a new operation within the old purpose. Guidelines para 58 is explicit:

> If a controller processes data based on consent and wishes to process the data for another purpose, too, that controller needs to seek additional consent for this other purpose unless there is another lawful basis, which better reflects the situation.

And Example 11 (para 59) is the same shape: a cable network with consent for personalised suggestions needs "new consent" for a new use of the same viewing data. Also relevant, per Guidelines para 90: "controllers do need to obtain a new and specific consent if purposes for data processing change after consent was obtained or if an additional purpose is envisaged."

---

### 4.6 Withdrawal

**Takeaway: the mechanical requirement is clear and easy to meet — an in-app control, same interface, one tap, free, no worse than the giving. What is _not_ resolved by any source is the substance: Art. 17(1)(b) obliges the controller to erase on withdrawal, but this controller has no access to the data, and the only entity that can erase it is the data subject herself. The one primary source that addresses uninstall-as-withdrawal (WP 202) is pre-GDPR, has not been re-endorsed, and assumes the controller holds server-side copies. Rated **UNSETTLED**; a defensible position is set out below but it rests on reasoning, not authority.**

Art. 7(3) verbatim (fetched 2026-08-14, `https://gdpr-info.eu/art-7-gdpr/`):

> The data subject shall have the right to withdraw his or her consent at any time. The withdrawal of consent shall not affect the lawfulness of processing based on consent before its withdrawal. Prior to giving consent, the data subject shall be informed thereof. It shall be as easy to withdraw as to give consent.

Note the third sentence: the *existence* of the withdrawal right must be disclosed **before** consent is taken — it is a precondition of valid consent, not merely a downstream obligation. Guidelines para 116 confirms and adds the transparency layer:

> As mentioned in section 3.1 on the condition of informed consent, the controller must inform the data subject of the right to withdraw consent prior to actually giving consent, pursuant to Article 7(3) of the GDPR. Additionally, the controller must as part of the transparency obligation inform the data subjects on how to exercise their rights.

#### The mechanics — easy to satisfy here

Guidelines para 114:

> However, when consent is obtained via electronic means through only one mouse-click, swipe, or keystroke, data subjects must, in practice, be able to withdraw that consent equally as easily. **Where consent is obtained through use of a service-specific user interface (for example, via a website, an app, a log-on account, the interface of an IoT device or by e-mail), there is no doubt a data subject must be able to withdraw consent via the same electronic interface, as switching to another interface for the sole reason of withdrawing consent would require undue effort.** Furthermore, the data subject should be able to withdraw his/her consent without detriment. This means, inter alia, that a controller must make withdrawal of consent possible free of charge or without lowering service levels.

(Emphasis added.) Para 113 adds that the *mechanism* need not be symmetrical, only the effort: "The GDPR does not say that giving and withdrawing consent must always be done through the same action."

Example 22 (para 115) shows what fails: consent given by one click online, withdrawal requiring a phone call during business hours — non-compliant because "more burdensome than the one mouse-click needed for giving consent".

**Design requirement, straightforwardly derived:** a withdrawal control inside the app itself (Settings), reachable in comparable taps to the consent, free, no dark patterns, no email-the-developer step. This is trivially achievable and is not where the difficulty lies.

#### What withdrawal *means* substantively

Guidelines paras 117 and 119:

> 117. As a general rule, if consent is withdrawn, all data processing operations that were based on consent and took place before the withdrawal of consent - and in accordance with the GDPR - remain lawful, however, the controller must stop the processing actions concerned. **If there is no other lawful basis justifying the processing (e.g. further storage) of the data, they should be deleted by the controller.**
>
> 119. Controllers have an obligation to delete data that was processed on the basis of consent once that consent is withdrawn, assuming that there is no other purpose justifying the continued retention.

(Emphasis added.) Note that para 117 treats **further storage as itself a processing action** requiring a basis — so "we just leave it sitting there" is not a neutral act. Art. 4(2) confirms storage is processing.

Art. 17(1)(b) verbatim (fetched 2026-08-14, `https://gdpr-info.eu/art-17-gdpr/`):

> the data subject withdraws consent on which the processing is based according to point (a) of Article 6(1), or point (a) of Article 9(2), and where there is no other legal ground for the processing;

So the obligation is clear in form: on withdrawal, delete. The problem is that the deletion must be performed by an actor who cannot reach the data.

#### The three unresolved sub-questions

**(a) Does deleting the app constitute withdrawal?**

The only source found that addresses this is WP 202 p. 25 (pre-GDPR, not re-endorsed, **persuasive only**):

> It must be possible to un-install apps and thereby remove all personal data, also from the servers of the data controller(s). In order to allow users to have their data deleted by the app developer, there is an important role for the OS manufacturer to provide a signal to the app developer once a user uninstalls the app. Such a signal could be provided through the API. **In principle, after the user has uninstalled the app, the app developer does not have a legal ground to continue processing of the personal data relating to that user, and therefore has to delete all data.** An app developer that wishes to keep certain data, for example in order to facilitate reinstallation of the app, has to separately ask for consent in the uninstall process, asking the user to agree to a defined extra retention period.

(Emphasis added.) So WP29 did treat uninstall as terminating the developer's basis. Three reasons to be careful relying on this:

1. It is a Directive-era document that the EDPB has not re-adopted; Guidelines 05/2020 para 4 preserves WP29 opinions only "where consistent" with the GDPR framework, and WP 202 is not in the list of opinions the EDPB cites for consent.
2. Its entire remedy is directed at deletion **from the developer's servers** — the premise is that the developer holds copies. Here he does not.
3. The uninstall signal it wishes for ("could be provided through the API") does not exist in the form contemplated; iOS gives the developer no uninstall notification.

Under the actual iOS/CloudKit architecture, uninstalling the app deletes the local SwiftData store but **does not** delete the CloudKit private database records — those persist in the user's iCloud account. So on this architecture, uninstall is *not* self-evidently equivalent to erasure, even though it does end the developer's processing. **UNSETTLED.**

**(b) Who is the controller for the iCloud-resident copy?**

The brief treats the developer as controller and states the developer never sees the data. Whether the developer is controller over records sitting in the user's own iCloud private database — determining purposes and means via the app's schema and sync logic, while having no access and no ability to delete — is a controllership question that this section does not resolve and that no fetched source addresses. It is upstream of the withdrawal analysis and is flagged as a dependency: **UNVERIFIED, requires the controllership analysis elsewhere in this document.** If the developer is *not* controller for the synced copy, the Art. 17 problem largely dissolves. If he is, it does not.

**(c) How can an obligation to erase bind a party with no access?**

No fetched source answers this. The candidate positions:

| Position | Support | Weakness |
|---|---|---|
| The obligation is discharged by giving the user effective deletion tools (in-app "delete all data", which deletes local *and* CloudKit records via the sync layer) | Art. 17 obliges the controller to "erase"; if the controller's only technical means of erasure is a code path the user triggers, shipping that path is the performance of the duty. Consistent with WP 202 p. 19's observation that on-device storage gives users "the greatest control over those data, for example allowing them to delete the data if they withdraw consent to its processing" | Art. 17(1) is worded as a controller obligation triggered by a *request*, not as a duty to supply tooling. A user who withdraws by uninstalling never triggers the code path. |
| The controller must ensure withdrawal *automatically* cascades to deletion | Para 117's "should be deleted by the controller" read strictly | Technically impossible after uninstall; iOS provides no hook |
| Withdrawal terminates the developer's processing (the app stops writing/syncing), and the residual iCloud copy is the user's own data under her own control, outside the developer's processing | Follows from the fact that after withdrawal no operation is performed by or for the developer | Storage is processing (Art. 4(2)); para 117 treats "further storage" as needing a basis. Depends entirely on (b). |

**Recommended design (engineering mitigation, not a legal conclusion), which makes the question largely moot:**

1. Withdrawal control in Settings, one tap, as easy as consent (Art. 7(3), para 114).
2. On withdrawal, **immediately offer and default to deletion** of all recorded data, local and CloudKit, executed in-app while the code can still reach both stores. Do not leave deletion to a later user action.
3. If the user withdraws but wants to keep her own record, obtain a **separate explicit consent for continued storage only** with its own stated purpose — this is the WP 202 p. 25 "defined extra retention period" device, adapted. Retention then has a live basis and para 117 is satisfied.
4. In the pre-consent information, state plainly that deleting the app removes the on-device data but that data already copied to her iCloud remains in her iCloud until she deletes it, and tell her how (in-app deletion before uninstalling; iOS Settings > iCloud > Manage Storage). This converts an unresolvable legal problem into a disclosed one, and supports the Art. 13(2)(a) retention-period disclosure.
5. Ship an in-app "delete all my data" control independent of withdrawal, so the erasure path exists at all times.

Steps 2 and 3 mean that in the ordinary course, withdrawal and erasure happen in the same session, and the gap only materialises for a user who uninstalls without withdrawing. For that residual case **no primary source provides an answer**, and honest reporting is that the developer's position rests on having provided the tools and the information, not on authority. **UNSETTLED.**

One further requirement worth isolating, Guidelines paras 120 and 122–123: the developer must not, on withdrawal, quietly reclassify the processing under a different basis.

> 120. In cases where the data subject withdraws his/her consent and the controller wishes to continue to process the personal data on another lawful basis, they cannot silently migrate from consent (which is withdrawn) to this other lawful basis. Any change in the lawful basis for processing must be notified to a data subject in accordance with the information requirements in Articles 13 and 14 and under the general principle of transparency.
>
> 123. In other words, the controller cannot swap from consent to other lawful bases. For example, it is not allowed to retrospectively utilise the legitimate interest basis in order to justify processing, where problems have been encountered with the validity of consent.

Para 123's second sentence is a warning against exactly the kind of fallback reasoning that is tempting here: if the consent analysis turns out to be weak, legitimate interests cannot be retrofitted. And in any event, Art. 9(1) is not lifted by Art. 6(1)(f) — as established elsewhere in this document, Art. 9(2)(a) is the only open limb, so there is no fallback to migrate to.

---

### 4.7 "Informed" — the concrete consent-screen checklist

**Takeaway: the EDPB gives a closed six-item minimum for _informed consent_ (Guidelines para 64), which is narrower than the full Art. 13 notice. Both apply, but they can be layered: the six items must be on the consent screen itself; the remainder of Art. 13 may live in the privacy notice.**

Guidelines para 64, verbatim and in full:

> For consent to be informed, it is necessary to inform the data subject of certain elements that are crucial to make a choice. Therefore, the EDPB is of the opinion that at least the following information is required for obtaining valid consent:
>
> i. the controller's identity,
> ii. the purpose of each of the processing operations for which consent is sought,
> iii. what (type of) data will be collected and used,
> iv. the existence of the right to withdraw consent,
> v. information about the use of the data for automated decision-making in accordance with Article 22 (2)(c) where relevant, and
> vi. on the possible risks of data transfers due to absence of an adequacy decision and of appropriate safeguards as described in Article 46.

Para 65 qualifies items (i) and (iii):

> With regard to item (i) and (iii), the EDPB notes that in a case where the consent sought is to be relied upon by multiple (joint) controllers or if the data is to be transferred to or processed by other controllers who wish to rely on the original consent, these organisations should all be named. **Processors do not need to be named as part of the consent requirements**, although to comply with Articles 13 and 14 of the GDPR, controllers will need to provide a full list of recipients or categories of recipients including processors. To conclude, the EDPB notes that depending on the circumstances and context of a case, more information may be needed to allow the data subject to genuinely understand the processing operations at hand.

(Emphasis added.) Two consequences:

- **Apple need not be named on the consent screen** *if* Apple is a processor for the CloudKit sync. Whether it is a processor, a separate controller, or neither is a controllership question outside this section — **UNVERIFIED here**. Naming Apple anyway is harmless and probably clearer.
- Apple **must** appear in the Art. 13(1)(e) recipients disclosure in the privacy notice regardless of which it is.

Para 72 authorises the layering:

> A controller that relies on consent of the data subject must also deal with the separate information duties laid down in Articles 13 and 14 in order to be compliant with the GDPR. In practice, compliance with the information duties and compliance with the requirement of informed consent may lead to an integrated approach in many cases. However, this section is written in the understanding that valid "informed" consent can exist, even when not all elements of Articles 13 and/or 14 are mentioned in the process of obtaining consent (these points should of course be mentioned in other places, such as the privacy notice of a company).

Example 13 (para 74) confirms with a worked case: omitting DPO contact details from the first layer still yields "valid 'informed' consent". But footnote 42 (quoted in 4.2) draws the line at controller identity and purposes — those cannot be demoted to a sub-layer.

Para 67 sets the register:

> When seeking consent, controllers should ensure that they use clear and plain language in all cases. This means a message should be easily understandable for the average person and not only for lawyers. Controllers cannot use long privacy policies that are difficult to understand or statements full of legal jargon. Consent must be clear and distinguishable from other matters and provided in an intelligible and easily accessible form. This requirement essentially means that information relevant for making informed decisions on whether or not to consent may not be hidden in general terms and conditions.

#### The checklist

**Tier 1 — must appear on the consent screen itself, first layer** (EDPB para 64 minimum, plus the Art. 7(3) pre-disclosure duty):

| # | Item | Source | Note for this app |
|---|---|---|---|
| 1 | Controller's identity — the developer's name as a natural person, and contact details | para 64(i); Recital 42; Art. 13(1)(a) | A solo natural-person controller must be named. A trading name alone is insufficient under Art. 13(1)(a). Consider the privacy/tension of a home address; a contact email plus name is the usual minimum. |
| 2 | The purpose of **each** processing operation consented to | para 64(ii) | State concretely: keeping a personal record of the child's meals-eaten-by-mother, skin observations and photographs, so the user can review it over time. Avoid vague framings (footnote 30). If sync is a separate consent, give it its own purpose statement. |
| 3 | The types of data collected | para 64(iii) | Meals eaten by the breastfeeding mother; skin severity observations across nine body regions at four levels; photographs of the child's skin; dates/times. **State expressly that this is health data concerning the child.** |
| 4 | Who the data subject is, and that the user is consenting **on behalf of her child** | Not in para 64 — derived from the Czech Civil Code § 892(2)/§ 876(3) analysis established elsewhere in this document | The consent must be *about* the infant's data. A screen that reads "I consent to the processing of **my** data" would be inaccurate on these facts. Wording must be along the lines of "I am this child's parent and I consent, on her behalf, to…". **UNVERIFIED against any primary source** — no EDPB guidance addresses the drafting of parental explicit consent outside Art. 8, which does not apply here. |
| 5 | The existence of the right to withdraw consent at any time | para 64(iv); Art. 7(3) sentence 3; Art. 13(2)(c) | Must be stated **before** consent is given, not just made available afterwards. |
| 6 | Automated decision-making — where relevant | para 64(v); Art. 22(2)(c) | **Not applicable to v1**, which derives and correlates nothing. Say nothing rather than say "no automated decisions" if that risks becoming stale. **Becomes mandatory if the insight engine ships** — and per 4.5 that also requires fresh consent. |
| 7 | Risks of transfers without an adequacy decision or Art. 46 safeguards | para 64(vi); Recital 111 | Depends on where CloudKit stores the data for a given user and on the controllership question. **UNVERIFIED — flagged as a dependency.** If any transfer relies on Art. 49(1)(a) explicit consent, para 64(vi) and Guidelines footnote 37 require specific disclosure of the *absence* of safeguards, which is a materially heavier disclosure. |
| 8 | Performative consent wording, with a genuine refusal option | Example 17 (para 96); footnote 38 | "I hereby consent to…", plus a working decline path. Not "I understand that…". |

**Tier 2 — may live in the privacy notice, but must exist and be reachable** (Art. 13 remainder, fetched 2026-08-14, `https://gdpr-info.eu/art-13-gdpr/`):

| Item | Art. 13 ref |
|---|---|
| Legal basis for the processing — state Art. 6(1)(a) and Art. 9(2)(a) | 13(1)(c) |
| Recipients or categories of recipients (Apple/iCloud) | 13(1)(e) |
| Third-country transfer facts, adequacy decision or safeguards, and how to obtain a copy | 13(1)(f) |
| Storage period, or the criteria used to determine it | 13(2)(a) |
| Rights of access, rectification, erasure, restriction, objection, portability | 13(2)(b) |
| Right to withdraw consent (repeat of Tier 1 item 5) | 13(2)(c) |
| Right to lodge a complaint with a supervisory authority — for a Czech-established controller, the ÚOOÚ | 13(2)(d) |
| Whether provision of the data is a statutory or contractual requirement or necessary to enter a contract, whether the subject is obliged to provide it, and the consequences of not providing it | 13(2)(e) |
| Existence of automated decision-making and meaningful information about the logic | 13(2)(f) |
| DPO contact details, where applicable | 13(1)(b) — almost certainly not applicable to a solo developer, but that conclusion belongs to the Art. 37 analysis elsewhere |

**Art. 13(2)(e) deserves particular attention** given 4.4. It requires disclosure of "whether the data subject is obliged to provide the personal data and of the possible consequences of failure to provide such data". For this app the honest disclosure is that providing the data is not a legal or contractual obligation, but that without it the app cannot function. Making that plain at the point of consent is both an Art. 13(2)(e) requirement and the best evidence that the user's choice was genuine and informed — which feeds directly back into the "freely given" argument in 4.4.

**Storage period (Art. 13(2)(a))** is awkward here and should be drafted with care: the developer sets no retention period at all, because the data lives in the user's own stores until she deletes it. WP 202 p. 25 (persuasive only) recognises this class of app: "a calendar, diary or photo sharing application would place the retention schedule into the control of the end user". Disclosing "retained until you delete it; we hold no copy" appears to be the accurate answer, and it pairs with the withdrawal disclosure in 4.6 step 4. **UNVERIFIED** — no GDPR-era source found addresses an Art. 13(2)(a) disclosure for user-controlled retention.

Finally, Guidelines para 70 on audience:

> A controller must assess what kind of audience it is that provides personal data to their organisation.

The audience is a new mother, on a phone, plausibly one-handed and tired. This is a substantive design constraint traceable to a primary source, not a nicety: the para 67 "average person" standard and the para 82 permission that "it may be necessary that a consent request interrupts the use experience to some extent to make that request effective" together support a deliberately interruptive, plainly worded, short consent screen with the six mandatory items visible without scrolling to a sub-layer.

---

### 4.8 Summary of what is settled and what is not

| Question | Status | Basis |
|---|---|---|
| A performative in-app checkbox ("I hereby consent…") can constitute explicit consent | **Settled** | Guidelines 05/2020 Example 17 (para 96) |
| A signature, electronic signature or two-stage verification is *not* required | **Settled** | Guidelines paras 94, 98 ("can also be a way") |
| App Store "Install" cannot carry consent | Settled for practical purposes | WP 202 p. 14 (persuasive only); Guidelines para 81 on bundling with T&Cs |
| Consent must precede first recording | **Settled** | Guidelines para 90 |
| Art. 7 in full applies to Art. 9(2)(a) consent | **Settled** | Guidelines para 103 |
| Consent must be Art. 6(1)(a) *and* Art. 9(2)(a) together | **Settled** | EDPB Guidelines 03/2020 para 18; EDPB Opinion 3/2019 para 14 |
| Art. 7(4) does not apply where the special-category data is necessary for the requested service | **Settled** | Guidelines para 32 and Example 19 (para 100), expressly |
| Explicit consent can be freely given even where the service is impossible without the data | **Settled in substance** | Guidelines Examples 19–20 (paras 100–102), read with para 99 |
| No imbalance of power between a solo developer and a consumer purchaser | Well supported | Recital 43; EDPB Guidelines 03/2020 para 21; contrast EDPB Opinion 3/2019 paras 19–20 |
| Whether total loss of app function on withdrawal is "detriment" under Recital 42 | **UNSETTLED** | Guidelines Example 8 (para 49) points the wrong way but is distinguishable (accelerometer data was unnecessary); no source addresses withdrawal of the processing that *is* the product |
| Whether local recording and iCloud sync need separate consents | **UNSETTLED** | Purpose-based test (para 57) suggests one may suffice; Recital 43's "appropriate in the individual case" is undefined; no source addresses sync to the user's *own* cloud account |
| Whether photographs need their own opt-in | **UNVERIFIED** | Recommended as prudent design; no source requires it |
| Whether Art. 9(2)(f) supports retaining consent evidence post-withdrawal | **UNVERIFIED — and the brief's premise is corrected** | Guidelines para 107 cites Art. 17(3)(b) and (e), not Art. 9(2)(f); Art. 9(2)(f) appears nowhere in Guidelines 05/2020 |
| How Art. 7(1) demonstrability works for a controller who by design holds no records | **UNSETTLED** | Guidelines para 108 assumes server-side logs; para 106's minimisation principle supports a proportionality argument but is not authority |
| Whether uninstalling the app constitutes withdrawal | **UNSETTLED** | Only WP 202 p. 25 addresses it; pre-GDPR, not re-endorsed, and premised on the developer holding server copies |
| What must happen to iCloud-resident data on withdrawal when the controller cannot reach it | **UNSETTLED** | Art. 17(1)(b) and Guidelines paras 117/119 impose deletion; no source addresses impossibility of access. Depends on the separate controllership question. |
| Whether the developer is controller for records in the user's own iCloud private database | **Out of scope here — flagged as a dependency** | Not addressed by any source fetched for this section; determines the shape of the Art. 17 answer |
| Drafting of parental explicit consent on a child's behalf outside Art. 8 | **UNVERIFIED** | No EDPB guidance found; Art. 8 is disapplied on these facts, and Guidelines section 7.1.4 addresses only the Art. 8 context |
| Art. 13(2)(a) retention disclosure for user-controlled retention | **UNVERIFIED** | WP 202 p. 25 recognises the pattern (persuasive only); no GDPR-era source found |
| The insight engine would require fresh consent | **Settled** | Guidelines paras 58, 90, Example 11 (para 59) |

**The single most useful finding in this section** is that paras 99–102 of Guidelines 05/2020 form a deliberate sequence: para 99 establishes explicit consent as the residual limb when Arts. 9(2)(b)–(j) all fail, and paras 100–102 immediately demonstrate that residual consent operating validly where the health data is indispensable to the requested service, with para 100 stating in terms that Art. 7(4) "does not apply". The bind the research brief anticipated — mandatory-for-function *and* only-available-limb — is the exact configuration the EDPB illustrates as compliant.

**The genuinely unresolved cluster** is not about consent formation at all. It is about what an architecture with no controller-side copy does to three downstream duties: demonstrability (Art. 7(1)), erasure on withdrawal (Art. 17(1)(b)), and retention disclosure (Art. 13(2)(a)). All EDPB and WP29 guidance on these points presupposes that the controller holds the data. None of it has been updated for local-first, user-owned-cloud designs. Any advice on this app should treat that as an open question and not as a solved one.

_Restating the disclaimer: this is research into primary sources, not legal advice, and has not been reviewed by a qualified lawyer._

## 5. The Device Boundary: Does Local-First / Never-Sees-the-Data Change What Consent Must Cover?

> **Not legal advice.** This section is primary-source research by a non-lawyer for a solo developer's own compliance assessment. It is not legal advice and must not be relied on as such. Sources fetched **2026-08-14**; all URLs below were retrieved on that date.

**Takeaway.** The local-first architecture narrows the developer's exposure but does **not** eliminate controllership, and it splits the product cleanly in two. For data that never leaves the phone, the strongest primary source — WP29 Opinion 02/2013, which is the only EU-level guidance written specifically about app developers — says the developer's responsibilities are *"considerably limited"*, and its footnote 10 says the establishment/targeting criterion *"might not be fulfilled if the data are only processed locally, in the device itself."* But "considerably limited" is expressly **not** "absent", and the same Opinion states flatly that an app developer determining purposes and means **is** the controller. For data synced to the mother's own iCloud, the analysis changes materially: Apple's own ADPLA § 3.6 casts Apple as the developer's *agent* acting on the developer's *instructions*, which is the Art. 4(8) processor formula, and that contractual posture — combined with the developer's unilateral design decision that sync happens at all — makes the controller reading substantially harder to escape. **Controllership remains formally UNSETTLED** (§ 5.7), but the compliance-safe course is the same under either reading, and the consent text differs by only one line.

The single most consequential finding for this ticket: **EDPB Guidelines 05/2020 para 65 states that processors do NOT need to be named in the consent.** If Apple is a processor, the consent need not name Apple as a condition of validity — the Apple disclosure belongs in the Art. 13 privacy notice instead. This corrects the framing in the brief (§ 5.5).

---

### 5.1 Does a developer who ships a binary and never receives the data "process" at all?

**Takeaway.** Two distinct questions get conflated here and must be separated. (i) Does *processing* occur? Unambiguously yes — but it is performed on the mother's device, and Art. 4(2) does not say by whom. (ii) Does the *developer* determine its purposes and means? That is the real question, and Art. 4(7) does not require the determiner to touch the data.

#### Art. 4(2): the verbs

The consolidated Official Journal text (EU Publications Office, CELEX 32016R0679, fetched via `publications.europa.eu/resource/celex/32016R0679`, `Accept: application/xhtml+xml`, `Accept-Language: eng`):

> ‘processing’ means any operation or set of operations which is performed on personal data or on sets of personal data, whether or not by automated means, such as collection, recording, organisation, structuring, storage, adaptation or alteration, retrieval, consultation, use, disclosure by transmission, dissemination or otherwise making available, alignment or combination, restriction, erasure or destruction;

Source: <https://publications.europa.eu/resource/celex/32016R0679> (official OJ consolidated text; EUR-Lex HTML/PDF endpoints returned HTTP 202 with an empty body to non-browser clients on the fetch date, so the Publications Office cellar endpoint was used instead — same authoritative text).

Walking the verbs against the product: **collection** (the mother enters meals; the camera captures photos), **recording**, **structuring** (the nine-region / four-level schema), **storage** (SwiftData), **retrieval** and **consultation** (the day view), **alteration** (edits), **erasure** (deletes), and — for synced data only — **disclosure by transmission** / **otherwise making available**. Every one of these operations occurs. Art. 4(2) is silent as to the actor: it defines operations, not persons. So "is there processing?" is the wrong question; there is obviously processing. The operative question is attribution.

#### Art. 4(7): "determines the purposes and means"

> ‘controller’ means the natural or legal person, public authority, agency or other body which, alone or jointly with others, determines the purposes and means of the processing of personal data; where the purposes and means of such processing are determined by Union or Member State law, the controller or the specific criteria for its nomination may be provided for by Union or Member State law;

> ‘processor’ means a natural or legal person, public authority, agency or other body which processes personal data on behalf of the controller;

Note that Art. 4(7) expressly contemplates a **natural person** as controller — the solo-developer status is no shield.

#### EDPB Guidelines 07/2020 (v2.1, adopted 07 July 2021)

Fetched: <https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf> (the URL in the brief, `.../2021-07/eppb_guidelines_...`, is dead — HTTP 404 on the fetch date; the live PDF is the `2023-10` path, internally "Version 2.1", version history: "Version 2.1 | 20 September 2022 | Minor corrections").

The concept is **functional and factual**, not contractual (para 12):

> The concepts of controller and processor are functional concepts: they aim to allocate responsibilities according to the actual roles of the parties. This implies that the legal status of an actor as either a "controller" or a "processor" must in principle be determined by its actual activities in a specific situation, rather than upon the formal designation of an actor as being either a "controller" or "processor" (e.g. in a contract). This means that the allocation of the roles usually should stem from an analysis of the factual elements or circumstances of the case and as such is not negotiable.

The test is a "why / who decided" test (para 20):

> A controller is a body that decides certain key elements about the processing. This controllership may be defined by law or may stem from an analysis of the factual elements or circumstances of the case. One should look at the specific processing operations in question and understand who determines them, by first considering the following questions: "why is this processing taking place?" and "who decided that the processing should take place for a particular purpose?"

And the concept is to be read **broadly, to avoid gaps** (para 14):

> As the underlying objective of attributing the role of controller is to ensure accountability and the effective and comprehensive protection of the personal data, the concept of 'controller' should be interpreted in a sufficiently broad way, favouring as much as possible effective and complete protection of data subjects so as to ensure full effect of EU data protection law, to avoid lacunae

That last clause cuts hard against a "nobody is the controller" outcome. It is the interpretive thumb on the scale.

#### "Essential means" — the passage that does the real damage

Para 40 defines what a controller, and only a controller, decides:

> As regards the determination of means, a distinction can be made between essential and non-essential means. "Essential means" are traditionally and inherently reserved to the controller. While non-essential means can also be determined by the processor, essential means are to be determined by the controller. "Essential means" are means that are closely linked to the purpose and the scope of the processing, such as the type of personal data which are processed ("which data shall be processed?"), the duration of the processing ("for how long shall they be processed?"), the categories of recipients ("who shall have access to them?") and the categories of data subjects ("whose personal data are being processed?"). Together with the purpose of processing, the essential means are also closely linked to the question of whether the processing is lawful, necessary and proportionate. "Non-essential means" concern more practical aspects of implementation, such as the choice for a particular type of hard- or software or the detailed security measures which may be left to the processor to decide on.

Apply this honestly to the product. The developer, alone and unilaterally, decided:

| "Essential means" question (para 40) | Who decided, in this product |
|---|---|
| *Which data shall be processed?* | The developer — the schema **is** the answer: meals, nine body regions, four severity levels, photos |
| *Whose personal data are being processed?* | The developer — the app is designed for an infant's eczema and a breastfeeding mother's diet |
| *Who shall have access to them?* | The developer — by wiring sync to CloudKit and (per the settled input) making it **mandatory with no toggle** |
| *For how long?* | Arguably the mother (she deletes records), but retention/lifecycle defaults are the developer's |
| Purpose | Contested — see below |

The developer determines three of the four enumerated essential means outright. This is the strongest single argument for controllership and it does not depend on access to data at all.

The counter-argument on **purpose** is genuinely available: the developer determines the *purposes for which the app is capable of being used*, but the mother determines the purpose for which *this* infant's data is processed — she decides to track her child. The developer never has a purpose of his own for the data because he never receives it, and there is no analytics, no research, no telemetry, no model-training. Para 20's question "who decided that the processing should take place for a particular purpose?" has an honest answer of "the mother", for the individual act of processing.

#### Para 45 — "the controller need not have access": does it reach this case?

The brief asks for an honest judgement on this. Verbatim (para 45):

> It is not necessary that the controller actually has access to the data that is being processed. Someone who outsources a processing activity and in doing so, has a determinative influence on the purpose and (essential) means of the processing (e.g. by adjusting parameters of a service in such a way that it influences whose personal data shall be processed), is to be regarded as controller even though he or she will never have actual access to the data.

**Honest judgement: para 45 is framed around outsourcing and does NOT squarely reach shipping a binary.** The sentence structure is explicit — "Someone who **outsources** a processing activity **and in doing so** has a determinative influence…". The determinative influence is exercised *through the act of outsourcing*. The worked example immediately following (Market research 1) confirms it: Company ABC "contracts a service provider", "provides a list of questions", "provided XYZ with detailed instructions". That is a principal directing an agent. A developer selling a binary to a stranger instructs nobody; the mother is not his service provider, and she is processing for herself, not on his behalf. Anyone citing para 45 as directly on point for shipped software is over-reading it.

**However**, the first sentence is a free-standing proposition — "It is not necessary that the controller actually has access to the data that is being processed" — and it is footnoted to *Wirtschaftsakademie* (C-210/16, para 38), which is not an outsourcing case at all. So para 45 defeats the argument "**no access, therefore no controllership**" as a matter of principle, even though its own reasoning is about outsourcing. It removes a defence; it does not by itself establish controllership.

Para 56 reinforces the point outside outsourcing, in a joint-controllership frame:

> The fact that one of the parties does not have access to personal data processed is not sufficient to exclude joint controllership. For example, in Jehovah's Witnesses, the CJEU considered that a religious community must be considered a controller, jointly with its members who engage in preaching, of the processing of personal data carried out by the latter in the context of door-to-door preaching. The CJEU considered that it was not necessary that the community had access to the data in question, or to establish that that community had given its members written guidelines or instructions in relation to the data processing. The community participated in the determination of purposes and means by organising and coordinating the activities of its members, which helped to achieve the objective of the Jehovah's Witnesses community. In addition, the community had knowledge on a general level of the fact that such processing was carried out in order to spread its faith.

*Jehovah's Witnesses* is the most uncomfortable authority for the developer, because it dispenses with **both** access **and** instructions, and finds controllership from *organising and coordinating* plus *general knowledge*. An app that structures data entry into a fixed schema and ships a sync pipeline is doing something recognisably like "organising and coordinating", and the developer plainly has "knowledge on a general level" of what the app records. The distinguishing feature is that the Jehovah's Witnesses community pursued **its own objective** ("which helped to achieve the objective of the … community", "in order to spread its faith") through the members' processing. A paid utility developer pursues no objective in the data. That distinction is real but it is the *only* thing separating the cases, and it rests on purpose, not access.

#### Who is NOT a controller: the tool/vendor passages

The guidelines do address entities that provide the means without becoming controllers, but every such passage assumes the provider **operates** something. Para 64–65:

> 64. It may also be the case that one of the entities involved provides the means of the processing and makes it available for personal data processing activities by other entities. The entity who decides to make use of those means so that personal data can be processed for a particular purpose also participates in the determination of the means of the processing.

> 65. This scenario can notably arise in case of platforms, standardised tools, or other infrastructure allowing the parties to process the same personal data and which have been set up in a certain way by one of the parties to be used by others that can also decide how to set it up. The use of an already existing technical system does not exclude joint controllership when users of the system can decide on the processing of personal data to be performed in this context.

Read carefully, **para 64's second sentence is the developer's best friend and worst enemy at once.** "The entity who decides to make use of those means … **also** participates in the determination of the means" — the word *also* means the user's decision to use the tool does not displace the provider; both can participate. But para 64–65 are written about *platforms and infrastructure* "allowing the parties to process the **same** personal data" — Facebook fan pages, Fashion ID's Like button. In this product the developer and the mother do **not** process the same personal data: she processes it, he never sees any of it. Para 65's "already existing technical system" scenario presupposes a system the provider runs.

The closest thing to a "mere tool" carve-out is the IT-consultant example (after para 83):

> Company ABC hires an IT-specialist from another company to fix a bug in a software that is being used by the company. The IT-consultant is not hired to process personal data, and Company ABC determines that any access to personal data will be purely incidental and therefore very limited in practice. ABC therefore concludes that the IT-specialist is not a processor (nor a controller in its own right) and that Company ABC will take appropriate measures according to Article 32 of the GDPR in order to prevent the IT-consultant from processing personal data in an unauthorised manner.

This is the guidelines' only express finding that a software-side actor is **"not a processor (nor a controller in its own right)"** — a third status, neither role. It is the structural precedent for "the developer is neither", and it turns on the processing being *incidental* to a technical task rather than the point of the engagement. Its limit is obvious: the consultant works under ABC's direction on ABC's system, and a bug fix is not a data-collection product.

And the telecom/e-mail example (after para 27) shows the EU-level template for "the conduit is not controller of the content":

> Providing an electronic communications service such as an electronic mail service involves processing of personal data. The provider of such services will normally be considered a controller in respect of the processing of personal data that is necessary for the operation of the service as such (e.g., traffic and billing data). If the sole purpose and role of the provider is to enable the transmission of email messages, the provider will not be considered as the controller in respect of the personal data contained in the message itself. The controller in respect of any personal data contained inside the message will normally be considered to be the person from whom the message originates, rather than the service provider offering the transmission service.

This is the most useful analogy available for the local-only case: **content vs. conduit.** The developer supplies the vessel; the mother supplies and originates the content. Note however that the example still makes the provider a controller for what it *does* handle (traffic, billing) — the carve-out is content-specific, not actor-specific. A developer who handles nothing at all handles no traffic data either.

#### Two passages that show a contract cannot fix this (relevant to Apple, § 5.4)

> 28. … However, the terms of a contract are not decisive in all circumstances, as this would simply allow parties to allocate responsibility as they see fit. It is not possible either to become a controller or to escape controller obligations simply by shaping the contract in a certain way where the factual circumstances say something else.

> 29. If one party in fact decides why and how personal data are processed that party will be a controller even if a contract says that it is a processor. Similarly, it is not because a commercial contract uses the term "subcontractor" that an entity shall be considered a processor from the perspective of data protection law.

This cuts **both** ways, and that is important: the ADPLA cannot *make* the developer a controller if the facts say otherwise, but neither can the developer disclaim controllership in his own EULA.

#### What the EDPB guidelines never do

**NOT FOUND / gap in the source.** Guidelines 07/2020 contain **no** discussion of the Art. 2(2)(c) household exemption (the words "household", "domestic" and "purely personal" do not appear in the document at all), and **no** worked example of software sold to a consumer who then processes their own data locally. Every one of the ~40 examples involves an organisation processing data about *third parties* — employees, customers, patients, job seekers. The one health example (after para 68, "Analysis of health data") is about an app developer joining a **research project** with a hospital, i.e. the developer processing for its own research purpose:

> Company ABC, the developer of a blood pressure monitoring app and Company XYZ, a provider of apps for medical professionals, both wish to examine how blood pressure changes can help predict certain diseases. … Company ABC, Hospital DEF and Company XYZ have jointly determined the purposes of processing.

It is cited here only to record that **the one place the guidelines mention a health-app developer, it is a joint-controllership-for-research scenario with no bearing on a records-only local app.** The guidelines simply do not address the consumer-software-vendor case. That silence is itself the central evidentiary gap (§ 5.7).

#### The source that actually addresses app developers: WP29 Opinion 02/2013

Guidelines 07/2020 do not discuss app developers. **WP29 Opinion 02/2013 on apps on smart devices (WP 202, adopted 27 February 2013)** does, and it is the only EU-level guidance written specifically about them. Fetched: <https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2013/wp202_en.pdf>

Status caveat: WP29 was the EDPB's predecessor; this Opinion is pre-GDPR and reasons under Directive 95/46/EC. The EDPB has endorsed some WP29 documents and not others. **UNVERIFIED** whether WP 202 has been expressly endorsed by the EDPB post-2018; it has not been formally withdrawn, and the Art. 4(7) controller definition is materially identical to Art. 2(d) of the Directive, so its controller reasoning carries over. Its consent reasoning is superseded in part by Guidelines 05/2020.

Section 3.3.1, verbatim and in full:

> **3.3.1 App developers**
> App developers create apps and/or make them available to end users. This category includes private and public sector organisations that outsource the app development and those companies and individuals building and deploying apps. They design and/or create the software which will run on the smartphones and thus decide the extent to which the app will access and process the different categories of personal data in the device and/or through remote computing resources (app developers' or third parties' computing units).
> To the extent the app developer determines the purposes and means of the processing of personal data on smart devices, he is the data controller as defined in Article 2(d) of the Data Protection Directive. In that case, he has to comply with the provisions of the entire Data Protection Directive.

Note "**those companies and individuals building and deploying apps**" — a solo natural person is squarely inside the category.

Then the two passages that matter most to this ticket:

> Even when the household exemption applies to a user, the app developer would still be responsible as data controller if he processes the data for his own purposes. This is for example relevant when the app requires access to the entire address book in order to deliver the service (instant messaging, phone calls, video calls).

> **The responsibilities of the app developer will be considerably limited if no personal data are processed and/or made available outside the device, or if the app developer has taken appropriate technical and organisational measures to ensure that data are irreversibly anonymised and aggregated on the device itself, prior to any data leaving the device.**

> In any case, if the app developer gains access to information that is stored on the device, the ePrivacy directive also applies and the app developer must comply with the consent requirement stipulated in Article 5(3) of the ePrivacy directive.

> To the extent that the app developer has outsourced some or all of the actual data processing to a third party and that third party assumes the role of a data processor then the app developer must comply with all obligations related to the use of a data processor. **This would also include the use of a cloud computing provider (e.g. for external data storage).**

Four things follow, and they are the backbone of this whole section:

1. **The household exemption protects the mother, not the developer.** WP29 says so directly, and it is the only source located that addresses the interaction. The mother's own use is almost certainly Art. 2(2)(c) household activity — she is a natural person recording her own child's health for family purposes, "with no connection to a professional or commercial activity" (Art. 2(2)(c), and Recital 18: "This Regulation does not apply to the processing of personal data by a natural person in the course of a purely personal or household activity and thus with no connection to a professional or commercial activity"). But her exemption is **hers**. It says nothing about the developer, who acts commercially (a paid app). Any argument of the form "this is just a mother's private diary, so GDPR doesn't apply" fails at the developer level.
2. **"Considerably limited" is the high-water mark of the local-only defence — and it is a reduction, not an exemption.** WP29 chose "considerably limited", not "no responsibilities". For the purely-local case the developer's residual duties are essentially: don't build in covert exfiltration, secure by design, be transparent. It is the strongest sentence in EU guidance for the local-first architecture, and it should be quoted in the developer's own accountability record.
3. **The condition in that sentence is disjunctive, and this product satisfies neither limb once sync is on.** "if **no** personal data are processed and/or made available outside the device, **or** if … irreversibly anonymised and aggregated on the device itself, **prior to any data leaving the device**". Synced eczema photos leave the device and are neither anonymised nor aggregated. So the "considerably limited" relief attaches to the local-only slice and switches off at the sync boundary. This is the cleanest primary-source basis for the two-zone analysis in § 5.2.
4. **Using a cloud provider for external storage is expressly named as triggering full processor obligations.** WP29 anticipated precisely the CloudKit situation and put it on the controller's side of the line. This is the strongest source for § 5.4 and it substantially undercuts the "the developer owes nothing because it's the user's own iCloud account" position — though WP29 was describing a developer-operated cloud account, not the user's own (§ 5.4, and see the ÚOOÚ gap in § 5.7).

Footnote 10, attached to the Opinion's discussion of when an app generates traffic to data controllers, is the other passage worth having:

> To the extent that the app generates traffic with personal data to data controllers. This criterion might not be fulfilled if the data are only processed locally, in the device itself.

This is as close as any EU source comes to saying local-only processing may fall outside the framework's reach — and note it is a **footnote about a jurisdictional/targeting criterion**, hedged with "might", not a holding on controllership. It should be cited for what it is: suggestive, not dispositive.

#### 5.1 conclusion

| Question | Answer |
|---|---|
| Does Art. 4(2) processing occur? | **Yes, unambiguously** — collection, structuring, storage, retrieval, and (synced) disclosure by transmission |
| Is "no access to the data" a defence to controllership? | **No.** Para 45 first sentence + para 56 + *Wirtschaftsakademie* + *Jehovah's Witnesses* all defeat it |
| Does para 45 squarely cover shipping a binary? | **No.** It is expressly about outsourcing. Over-cited; do not rest on it |
| Does the developer determine "essential means"? | **Largely yes** — the schema fixes which data and whose; the sync design fixes recipients (para 40) |
| Does the developer determine the *purpose*? | **UNSETTLED** — the honest weak point in the controller reading (§ 5.7) |
| Is there a recognised "neither controller nor processor" status? | **Yes**, but the only example (IT-consultant) is a poor fit |
| Does the household exemption help the developer? | **No** — WP 202 says it protects the user only |

---

### 5.2 Where the boundary actually falls: local storage vs. iCloud sync

**Takeaway.** There are two zones, and the developer's role genuinely differs between them. **Zone A** (data at rest on the mother's phone) attracts the ePrivacy **storage** limb but not the **access** limb, and the developer's GDPR responsibilities are "considerably limited" per WP 202. **Zone B** (sync to the mother's iCloud) crosses the device boundary in EDPB terms, engages the access limb, brings Apple in as a third party, and is where every substantive obligation in §§ 5.3–5.5 attaches. The boundary is not the *point of transmission* — it is the moment information "leaves the device".

#### The device boundary in EDPB terms

EDPB Guidelines 2/2023 on the technical scope of Art. 5(3) ePD (v2.0, adopted 7 October 2024), fetched: <https://www.edpb.europa.eu/system/files/documents/2024-10/edpb_guidelines_202302_technical_scope_art_53_eprivacydirective_v2_en_0.pdf>

Para 44 — verified verbatim against the PDF, and the brief's characterisation is accurate:

> On the other hand, there are some contexts in which local applications installed in the terminal equipment uses some information strictly inside the terminal, as it might be the case for smartphone system APIs (access to camera, microphone, GPS sensor, accelerator chip, radio chip, local file access, contact list, identifiers access, etc.). This might also be the case for web browsers that process information stored or generated information inside the device (such as cookies, local storage, WebSQL, or even information provided by the users themselves). The use of such information by an application would not constitute a 'gaining of access to information already stored' in the meaning of Article 5(3) ePD as long as the information does not leave the device, but when this information or any derivation of this information is accessed, Article 5(3) ePD would apply.

Two refinements the brief's summary omits, both of which matter:

**(a) Para 44 addresses only the ACCESS limb. The STORAGE limb is separate and is not subject to any "leaves the device" qualifier.** Section 2.6:

> 35. Storage of information in the sense of Article 5(3) ePD refers to placing information on a physical electronic storage medium that is part of a user or subscriber's terminal equipment.

> 36. Typically, information is not stored in the terminal equipment of a user or subscriber through direct access to the memory of the device by another party, but rather by instructing software on the terminal equipment to generate specific information. Storage taking place through such instructions is considered to be initiated directly by the other party. This includes making use of established protocols such as browser cookie storage as well as customized software, **regardless of who created or installed the protocols or software on the terminal equipment.**

> 37. The ePD does not place any upper or lower limit on the length of time that information must persist on a storage medium to be counted as stored, nor is there an upper or lower limit on the amount of information to be stored.

> 38. Similarly, the notion of storage does not depend on the type of medium on which the information is stored.

So writing eczema records into SwiftData is a **"storage of information"** in the Art. 5(3) sense, attributed to the developer as "the other party" whose software instructions caused it — and para 36's closing clause ("regardless of who created or installed") forecloses the argument that the mother installed the app herself. Para 44 does **not** exempt Zone A from Art. 5(3); it exempts Zone A from the *access* limb only. This is a genuine correction to the framing in the brief, which reads para 44 as putting local-only processing outside Art. 5(3) altogether. It does not — it puts it outside the *access* half.

Whether Art. 5(3) is *satisfied* in Zone A is then a question about the **exemptions**, which is where the analysis becomes reasoning rather than citation (below).

**(b) Para 15 confirms the 2009 amendment removed the network qualifier** — verified, and directly relevant to the Czech transposition gap:

> 15. … The EDPB notes that the amendments made in 2009 in the text of Article 5(3) ePD extended the protection of terminal equipment by **deleting the reference to the 'use of electronic communications network'** as a means to store information or to gain access to information stored in the terminal equipment. Therefore, as long as a device has a network interface that makes it eligible for connection (even if such connection is not in place), Article 5(3) ePD applies to every entity that would store and gain access to information already stored in the terminal equipment whatever the means of access to the terminal equipment is, and whether connected or disconnected from a network

The Art. 5(3) text itself, consolidated (Directive 2002/58/EC as amended, CELEX 02002L0058-20091219, fetched <https://publications.europa.eu/resource/celex/02002L0058-20091219>):

> 3. Member States shall ensure that the storing of information, or the gaining of access to information already stored, in the terminal equipment of a subscriber or user is only allowed on condition that the subscriber or user concerned has given his or her consent, having been provided with clear and comprehensive information, in accordance with Directive 95/46/EC, inter alia, about the purposes of the processing. This shall not prevent any technical storage or access for the sole purpose of carrying out the transmission of a communication over an electronic communications network, or as strictly necessary in order for the provider of an information society service explicitly requested by the subscriber or user to provide the service.

#### The Czech transposition gap — verified

§ 89(3) of zákon č. 127/2005 Sb., consolidated text fetched <https://www.zakonyprolidi.cz/cs/2005-127>:

> (3) Každý, kdo hodlá používat nebo používá **sítě elektronických komunikací** k ukládání údajů nebo k získávání přístupu k údajům uloženým v koncových zařízeních účastníků nebo uživatelů, získá od těchto účastníků nebo uživatelů předem prokazatelný souhlas s rozsahem a účelem jejich zpracování. Tato povinnost neplatí pro technické ukládání nebo přístup výhradně pro potřeby přenosu zprávy prostřednictvím sítě elektronických komunikací nebo je-li to nezbytné pro potřeby poskytování služby informační společnosti, která je výslovně vyžádána účastníkem nebo uživatelem.

(*"Anyone who intends to use or uses **electronic communications networks** to store data or to gain access to data stored in the terminal equipment of subscribers or users shall obtain from those subscribers or users prior demonstrable consent to the scope and purpose of the processing. This obligation does not apply to technical storage or access solely for the purpose of transmitting a message via an electronic communications network, or where it is necessary for the provision of an information society service explicitly requested by the subscriber or user."*)

**Both established findings confirmed.** The network qualifier deleted from Art. 5(3) in 2009 survives in the Czech text, and § 3(1) of the same Act makes "Úřad" the ČTÚ:

> § 3 (1) Zřizuje se Český telekomunikační úřad (dále jen "Úřad") jako ústřední správní úřad pro výkon státní správy ve věcech stanovených tímto zákonem…

Consequence for Zone A on a literal reading: purely local SwiftData storage involves no use of an electronic communications network, so § 89(3) as drafted does not bite. Zone B does use a network, so § 89(3) plainly bites there. The gap therefore closes exactly at the sync boundary — which is a striking alignment with the EDPB's own device boundary, and it means **the two-zone split is the right frame under both the Directive and the Czech statute, for different reasons.** As established, there is no horizontal direct effect against a private developer and conforming interpretation is the only route; a Czech court reading § 89(3) in conformity with the amended Directive would reach local storage, but the text resists it.

#### Do the Art. 5(3) exemptions cover the local storage? — REASONING, not citation

The EDPB expressly declines to analyse the exemptions. Verified, para 4:

> These Guidelines do not address the circumstances under which a processing operation may fall within the exemptions from the consent requirement provided for by the ePD, as these circumstances should be analysed on a case-by-case basis accounting for the relevant member state transposition(s), and guidance issued by national Competent Authorities.

And again at para 40:

> …they do not analyse the application of the exemptions to the obligation to collect consent provided by Article 5(3) ePD. The EDPB reminds that for all of the cases where there is a storage of information or a gaining of access to information already stored, it would have to be assessed if a consent is needed or whether an exemption under Article 5(3) ePD could apply. The reader should therefore consider the exemptions in their use case, in conjunction with this technical analysis.

So everything below is **my reasoning by analogy from WP29's exemption criteria, not a citable holding.** Flagged **UNSETTLED** accordingly.

The controlling analytical framework for the exemptions remains **WP29 Opinion 04/2012 on the cookie consent exemption (WP 194, adopted 7 June 2012)**, fetched <https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf>. Its two-part test for the "explicitly requested" exemption (CRITERION B):

> Following a direct reading of the directive, a cookie matching CRITERION B has to pass simultaneously the two following tests:
> 1) The information society service has been explicitly requested by the user: the user (or subscriber) did a positive action to request a service with a clearly defined perimeter.
> 2) The cookie is strictly needed to enable the information society service: if cookies are disabled, the service will not work.

Restated in functionality terms:

> 1) A cookie is necessary to provide a specific functionality to the user (or subscriber): if cookies are disabled, the functionality will not be available.
> 2) This functionality has been explicitly requested by the user (or subscriber), as part of an information society service.

The most apposite worked examples are user-input cookies and UI-customization cookies:

> These cookies are clearly needed to provide an information service explicitly requested by the user. Additionally, they are tied to a user's action (such as clicking on a button or filling a form). As such these cookies are exempted under CRITERION B.

> These customization functionalities are thus explicitly enabled by the user of an information society service (e.g. by clicking on button or ticking a box) although in the absence of additional information the intention of the user could not be interpreted as a preference to remember that choice for longer than a browser session (or no more than a few additional hours). As such only session (or short term) cookies storing such information are exempted under CRITERION B.

**Applying this to Zone A (my reasoning):**

The local storage of an eczema record passes the WP 194 test more comfortably than almost any cookie does:

- *Explicitly requested, positive action, clearly defined perimeter?* Yes, emphatically. The mother bought the app, opened it, and tapped to record a meal or a skin observation. The perimeter is defined by the app's stated purpose. This is a far stronger "positive action" than clicking a flag icon to change language.
- *Strictly necessary — if storage is disabled, does the functionality fail?* Yes, definitionally. A record-keeping app that cannot persist records is not merely degraded, it is inoperative. The entire requested service **is** the storage.

So the "strictly necessary for a service explicitly requested by the user" exemption in Art. 5(3) second sentence (and its Czech counterpart in the second sentence of § 89(3), "je-li to nezbytné pro potřeby poskytování služby informační společnosti, která je výslovně vyžádána účastníkem nebo uživatelem") appears to cover Zone A local storage. **On this reasoning no separate ePrivacy consent is required for storing records locally.**

Three important caveats, and one of them is a real limit:

1. **The WP 194 duration point does not transfer cleanly.** WP29 limited the UI-customization exemption to session or short-term storage because a user clicking a flag cannot be presumed to want the preference remembered indefinitely. Here the opposite is true: a longitudinal eczema diary is *worthless* unless records persist for months — persistence is the requested functionality, not a side effect. So the duration limit that constrained UI-customization cookies is inapplicable on its own logic. **UNSETTLED** but the reasoning is strong.
2. **Photos are the weakest point.** Camera access to *capture* a photo the mother deliberately takes is within the requested service. But if the app were ever to read pre-existing photos from the photo library, that is "gaining access to information already stored" and a different analysis applies — para 44's carve-out only holds while the information does not leave the device, and the OS permission prompt is *Apple's* consent mechanism, not the developer's. Keep capture-only; do not add library import without revisiting this.
3. **"Information society service" is a definitional stretch for a locally-functioning paid app.** The exemption is drafted for ISS providers. A one-time-purchase app that works offline is arguably not providing an ISS at all at the moment of local storage. If it is not an ISS, the exemption by its terms does not apply — but then the storage limb still applies with no exemption, which would be an absurd outcome (consent required to save a note the user just typed). This absurdity is itself an argument that the exemption must be read to cover it. **UNSETTLED** — flagged as a genuine doctrinal gap that no fetched source resolves. Relatedly, note that ePrivacy Art. 2 defines "user" as "any natural person using a **publicly available electronic communications service**, for private or business purposes, without necessarily having subscribed to this service" — a definition that fits awkwardly with a purely local app, and which the EDPB works around via the terminal-equipment route in para 15 rather than the user definition.

**Applying this to Zone B (my reasoning):** the exemption is much harder to sustain, and the analysis depends entirely on whether sync is mandatory — which is exactly the design lever in § 5.6. If sync is *mandatory and inseparable* from the product, a developer can argue it is part of the "clearly defined perimeter" of the service the mother requested, and that the app genuinely does not function without it (limb 2 satisfied by construction). If sync is *elective*, then by the developer's own design the app demonstrably works without it, limb 2 ("if disabled, the functionality will not be available") fails for the core service, and sync becomes a separate functionality requiring its own consent. **Note the perverse incentive this creates and do not mistake it for a recommendation: mandatory sync makes the ePrivacy exemption argument easier while making the GDPR "freely given" consent argument harder** (§ 5.6). The two regimes pull in opposite directions.

#### Does the developer's role differ between zones?

| | **Zone A — local only (SwiftData on device)** | **Zone B — synced to mother's iCloud (CloudKit private DB)** |
|---|---|---|
| ePrivacy **storage** limb (Art. 5(3)) | **Engaged** (EDPB 2/2023 paras 35–38, esp. 36 "regardless of who created or installed") | Engaged |
| ePrivacy **access** limb | **Not engaged** while info does not leave the device (para 44) | **Engaged** — information leaves the device |
| Art. 5(3) exemption available? | **Probably yes** — WP 194 CRITERION B, strong on both limbs (**UNSETTLED**, my reasoning) | **Weak** if sync is elective; arguable if truly inseparable (**UNSETTLED**) |
| Czech § 89(3) on a literal reading | **Not engaged** — no electronic communications network used | **Engaged** — network used |
| WP 202 "considerably limited" relief | **Applies** — no data made available outside the device | **Does not apply** — data leaves un-anonymised, un-aggregated |
| Third party involved | None | **Apple** (§ 5.3–5.4) |
| Art. 13(1)(e) recipients disclosure | Nothing to disclose | **Required** — Apple is a recipient |
| Chapter V transfer analysis | N/A | **Required** (§ 5.4) |
| Art. 28 processor contract | N/A | **Required if Apple is a processor** (§ 5.4) |
| Practical exposure | Low — design/transparency/security only | Materially higher — full controller duties over the synced set |

**The boundary is the sync, and it is the only boundary that carries real legal weight in this product.** Everything expensive in §§ 5.3–5.5 sits on the far side of it. That is the finding that makes § 5.6 a live and consequential design question rather than a cosmetic one.

---

### 5.3 The odd shape of the Apple relationship

**Takeaway.** The ADPLA asserts a controller→processor relationship in the developer's direction, but the underlying facts are unlike any processor arrangement in EDPB guidance: the developer never holds the data, never holds the credentials, cannot audit, cannot instruct, and cannot even see whether the data exists. Apple's own § 3.5 promises it will not access private-container data — which sits awkwardly with § 3.6's promise to act on the developer's instructions. The developer is cast as a controller who cannot control, with a processor he cannot direct.

The established finding on § 3.6 stands: Apple "will act as **Your agent**", handling Personal Data "only in accordance with the instructions and permissions from **You**", which is the Art. 4(8) formula ("processes personal data **on behalf of** the controller"). Read with EDPB 07/2020 paras 28–29, that contractual language is **evidence but not decisive** — "the terms of a contract are not decisive in all circumstances, as this would simply allow parties to allocate responsibility as they see fit."

But paras 28–29 also block the developer from using the ADPLA in reverse. He cannot rely on it to *establish* he is a controller and then complain, nor disclaim the role in his own EULA. Under EDPB 07/2020 para 12 the allocation "is not negotiable."

Three structural oddities are worth recording, because they are what makes this UNSETTLED rather than merely awkward:

1. **A processor the controller cannot instruct.** Art. 28(3)(a) requires processing "only on documented instructions from the controller". The developer issues no instructions to Apple about the mother's iCloud data; the ADPLA is a take-it-or-leave-it adhesion contract. EDPB 07/2020's "standardised cloud storage service" example anticipates exactly this and holds it does not prevent processor status:

> A large cloud storage provider offers its customers the ability to store large volumes of personal data. The service is completely standardised, with customers having little or no ability to customise the service. The terms of the contract are determined and drawn up unilaterally by the cloud service provider, provided to the customer on a "take it or leave it basis". Company X decides to make use of the cloud provider to store personal data concerning its customers. Company X will still be considered a controller, given its decision to make use of this particular cloud service provider in order to process personal data for its purposes. Insofar as the cloud service provider does not process the personal data for its own purposes and stores the data solely on behalf of its customers and in accordance with instructions, the service provider will be considered as a processor.

The load-bearing phrase is "**given its decision to make use of this particular cloud service provider**". The *choice of provider* is itself the exercise of control. The developer chose CloudKit. On this example, standardisation is no defence — and note the crucial factual difference: Company X stores "personal data concerning **its customers**" in **its own** account. Here the data sits in the **mother's** account, which the developer cannot access, close, or audit. **No fetched source addresses that inversion** (§ 5.7).

2. **§ 3.5 vs § 3.6.** As established, § 3.6 has no public/private carve-out while § 3.5 separately promises Apple "will not access or disclose any end user data stored in a private container". If Apple genuinely cannot read the private database, then in respect of that data Apple is closer to a sealed vault than a processor — yet § 3.6's agent language still formally applies. Both cannot be fully true at once in the ordinary Art. 28 sense. **UNSETTLED**, and it is Apple's drafting that creates the ambiguity, not the developer's.

3. **Apple is also a controller in its own right, for its own purposes.** iCloud is Apple's own consumer service governed by Apple's *own* privacy policy and iCloud terms with the mother directly. That relationship exists independently of the developer and predates the app. Under EDPB 07/2020 para 57 (citing *Fashion ID*), roles are assigned **per operation**:

> …an entity will be considered as joint controller with the other(s) only in respect of those operations for which it determines, jointly with others, the means and the purposes of the same data processing… If one of these entities decides alone the purposes and means of operations that precede or are subsequent in the chain of processing, this entity must be considered as the sole controller of this preceding or subsequent operation.

So Apple can simultaneously be (i) the developer's processor for CloudKit storage of app data and (ii) sole controller of its own account/infrastructure processing. That is coherent, and it means the developer's Art. 28 duties, if any, extend only to the app-data operations.

---

### 5.4 If Apple is the processor, what does the developer owe? Art. 28(3) walked

**Takeaway.** **ADPLA Attachment 4 § 3.6 does NOT satisfy Art. 28(3).** Three of the eight mandatory subparagraphs are substantively absent — (d) sub-processors, (g) deletion/return at end of processing — and (c)/(f) are materially narrower than the Regulation requires. The word "sub-processor" does not appear anywhere in the agreement, and there is no end-of-processing deletion or return clause for private data. This is Apple's gap, not the developer's, and the developer **cannot cure it**: he cannot negotiate the ADPLA, and Art. 28(9) requires the contract to be in writing. If the developer is the controller of synced data, he is in a position of **irreducible non-compliance with Art. 28** — and that, not the consent text, is the most serious finding in this section.

#### Art. 28(1) and (3), verbatim

> 1. Where processing is to be carried out on behalf of a controller, the controller shall use only processors providing sufficient guarantees to implement appropriate technical and organisational measures in such a manner that processing will meet the requirements of this Regulation and ensure the protection of the rights of the data subject.

> 3. Processing by a processor shall be governed by a contract or other legal act under Union or Member State law, that is binding on the processor with regard to the controller and that sets out the subject-matter and duration of the processing, the nature and purpose of the processing, the type of personal data and categories of data subjects and the obligations and rights of the controller. That contract or other legal act shall stipulate, in particular, that the processor: …

Also relevant, Art. 28(9): "The contract or the other legal act referred to in paragraphs 3 and 4 shall be in writing, including in electronic form."

And Art. 28(5), which is the developer's one plausible mitigation:

> Adherence of a processor to an approved code of conduct as referred to in Article 40 or an approved certification mechanism as referred to in Article 42 may be used as an element by which to demonstrate sufficient guarantees as referred to in [paragraphs 1 and 4].

Note the limits: ISO 27001/27018 are **not** Art. 42 approved certification mechanisms (which require approval by a supervisory authority or accredited body under the GDPR framework), and even a genuine Art. 42 certification is only "an element" toward Art. 28(1) "sufficient guarantees" — it does **not** substitute for the Art. 28(3) contract terms. So Apple's certifications help a little with 28(1) and not at all with 28(3).

Finally Art. 28(10), which matters if Apple oversteps:

> Without prejudice to Articles 82, 83 and 84, if a processor infringes this Regulation by determining the purposes and means of processing, the processor shall be considered to be a controller in respect of that processing.

#### Subparagraph-by-subparagraph

The ADPLA § 3.6 text relied on below is as established in the brief and confirmed on the current agreement (fetched from Apple's developer terms page; the agreement carries an internal date of **June 18, 2026**, and the dated filename `...-20250601-English.pdf` referenced in earlier research returns HTTP 404 — only the undated URL resolves).

| Art. 28(3) | Requirement | ADPLA Attachment 4 | Verdict |
|---|---|---|---|
| **(a)** | processes "only on documented instructions from the controller, including with regard to transfers of personal data to a third country" | § 3.6 "only in accordance with the instructions and permissions from You"; separate limb on EEA/Swiss transfers | **Present** — but "instructions" is fictional in substance: the developer issues none, and cannot |
| **(b)** | persons authorised are under confidentiality | § 3.6 preamble: authorised persons "have agreed to maintain confidentiality (whether through terms or under an appropriate statutory obligation)" | **Present** |
| **(c)** | "takes all measures required pursuant to Article 32" | § 3.6 "industry-standard measures to safeguard Personal Data during the transfer, processing and storage" | **Partial** — no reference to Art. 32; "industry-standard" is not the Art. 32 risk-calibrated standard. The same clause reserves that "Encrypted Personal Data may be stored at Apple's geographic discretion" |
| **(d)** | respects paras 2 and 4 conditions for **engaging another processor** | **Nothing.** "Sub-processor" / "sub-contractor" appears **nowhere** in the agreement — no list, no prior authorisation, no notice of change, no right to object, no flow-down of terms | **ABSENT** — and Apple's own documentation confirms third-party data centres are used, so the gap is live, not theoretical |
| **(e)** | assists with data-subject rights (Chapter III) | § 3.6 "reasonable means to manage any user access, deletion, or restriction requests" | **Present but weak** — no timeframe, no defined mechanism |
| **(f)** | assists with compliance with **Arts. 32 to 36** | § 3.6 covers Arts. 33–36; breach notice is limited to Personal Data "altered, deleted or lost as a result of any unauthorized access"; notification by "any reasonable means Apple selects" | **Partial and materially narrow** — omits Art. 32, and the breach trigger **excludes unauthorised disclosure/access without alteration**, i.e. the classic confidentiality breach, which is precisely the risk with infant health photos |
| **(g)** | "at the choice of the controller, deletes or returns all the personal data to the controller after the end of the provision of services … and deletes existing copies" | **Nothing** for private data. No end-of-processing deletion or return clause; "return" appears nowhere in Attachment 4. Attachment 4 § 1.2 states the opposite — end users "may continue to access their user-generated documents, private containers and files" after termination. Apple's reserved deletion right is scoped to **public** containers only | **ABSENT** |
| **(h)** | makes available all information necessary to demonstrate compliance and **allows for and contributes to audits, including inspections, by the controller or an auditor mandated by the controller** | § 3.6(d) provides Art. 28 compliance evidence, but with the express limitation that "Apple's ISO 27001 and 27018 certifications shall be considered sufficient for such required audit purposes" | **Present but capped** — contractually forecloses the controller-mandated audit that (h) requires. Not curable by Art. 28(5) (see above) |
| — | Contract must set out "subject-matter and duration … nature and purpose … type of personal data and categories of data subjects" | Not specified for the developer's processing; no Apple legal entity is even named as processor in § 3.6 ("Apple (and any applicable Apple Subsidiary for purposes of this Section 3.6)") | **Deficient** — the opening words of 28(3) are unmet |

**Score: (b) and (e) adequate; (a) and (h) present but hollow; (c) and (f) materially narrow; (d) and (g) absent; the 28(3) preamble unmet.** ADPLA Attachment 4 is a processor-flavoured clause, not an Art. 28(3) DPA.

#### Why this matters more than it appears

Art. 28(1) puts the duty on the **controller** to "use only processors providing sufficient guarantees". If the developer is the controller of synced data, then choosing CloudKit — whose terms omit 28(3)(d) and (g) entirely — is itself the compliance failure, and it is unfixable within the product: the ADPLA is non-negotiable, Apple will not sign a bespoke DPA with a solo developer, and there is no alternative sync backend that keeps data in the user's own account.

This produces a genuinely uncomfortable conclusion worth stating plainly for the human decision-maker: **the controller reading of synced data implies the product cannot be brought into full Art. 28 compliance while using CloudKit.** That is a strong practical argument that the controller reading is the wrong characterisation of the facts (a reductio), and simultaneously a strong argument for reducing exposure by other means (§ 5.6). It is not a reason to assume the favourable reading is correct.

#### Art. 13(1)(e) — recipients

> (e) the recipients or categories of recipients of the personal data, if any;

"Recipient" is defined broadly and expressly includes processors, per Art. 4(9):

> ‘recipient’ means a natural or legal person, public authority, agency or another body, to which the personal data are disclosed, whether a third party or not.

EDPB 07/2020 para 85 confirms recipient status is relational and can coexist with controller status:

> A recipient of personal data and a third party may well simultaneously be regarded as a controller or processor from other perspectives. For example, entities that are to be seen as recipients or third parties from one perspective, are controllers for the processing for which they determine the purpose and means.

So **Apple must be disclosed as a recipient in the privacy notice** under either the processor reading or the independent-controller reading. This obligation does not depend on resolving § 5.7. It is the one Apple-related duty that is unambiguous.

#### Art. 44+ — international transfers

> Any transfer of personal data which are undergoing processing or are intended for processing after transfer to a third country or to an international organisation shall take place only if, subject to the other provisions of this Regulation, the conditions laid down in this Chapter are complied with by the controller and processor, including for onward transfers…

Findings from Apple's first-party documentation:

- **Contracting entity.** Apple's terms bind the developer to Apple's Irish entity for EEA purposes; § 3.6 binds "Apple (and any applicable Apple Subsidiary for purposes of this Section 3.6)" **without naming any entity**, so the ADPLA never identifies which Apple legal person is the processor. An Irish controller/processor is inside the EEA, so the *contracting* layer is not itself a Chapter V transfer.
- **Third-party data centres, unnamed.** Apple's current support documentation states that iCloud content may be stored using third-party partners' servers but **no longer names them**. The historical article that named Google Cloud and Amazon S3 (`support.apple.com/en-us/HT202303`) now 301-redirects to <https://support.apple.com/en-us/102651>, whose current text refers only to third-party data centres. **NOT FOUND: any current Apple page naming its iCloud storage partners, and NOT FOUND: any published iCloud sub-processor list.** Searched: 102651, the Apple Platform Security guide (grepped for Google/Amazon/S3/Azure across all pages), the iCloud Terms, and the worldwide Privacy Policy. Apple does not currently publish the names.
- **Geographic discretion is contractual.** ADPLA § 3.6(f): "Encrypted Personal Data may be stored at Apple's geographic discretion." So the developer cannot pin storage location, cannot represent to the mother where her data sits, and cannot exclude a US transfer.
- **Transfer mechanism is stale on its face.** § 3.6(g) refers to "**Model Contract Clauses**/Swiss Transborder Data Flow Agreement", available "upon request if you believe that Personal Data is being transferred". "Standard Contractual Clauses" — the post-2021 terminology (Commission Implementing Decision (EU) 2021/914) — appears **nowhere** in the ADPLA. "Model Contract Clauses" is pre-2021 language for the now-repealed 2001/2004/2010 decisions. **UNSETTLED / arguably deficient:** the developer has no executed Art. 46(2)(c) instrument, only a promise of one on request, phrased conditionally.

Practical consequence: **if the developer is the controller of synced data, he cannot discharge Chapter V with confidence.** He cannot identify the sub-processors, cannot fix the location, and has no executed current SCCs. He can note that the EU–US Data Privacy Framework adequacy decision (July 2023) may cover transfers to DPF-certified US recipients, which would remove the need for SCCs for those transfers — but **UNVERIFIED** whether the relevant Apple US entity is DPF-certified for this data flow, and Apple's own terms do not invoke the DPF. This should be checked against the official DPF list before any reliance.

One mitigating technical fact, from Apple's developer documentation (<https://developer.apple.com/documentation/cloudkit/encrypting-user-data>): fields the developer explicitly marks as encrypted are encrypted to key material in the user's iCloud Keychain —

> CloudKit encrypts data with the key material in the user's iCloud Keychain. If the user loses access to iCloud Keychain, CloudKit can't access the key material that it previously used to encrypt the data, so iCloud can't decrypt it.

> The encrypted fields can't have indexes because the server can't read the fields.

This is a **developer-controllable** measure — unlike Advanced Data Protection, which as established is a user setting the developer cannot control, require, or detect. Using `encryptedValues` for the eczema fields and photo assets does not resolve the Art. 28(3) gaps (encrypted personal data is still personal data), but it is directly relevant to Art. 32 and materially reduces the practical risk of the transfer. Note also that Apple's asset documentation states CKAsset chunks are encrypted and "stored in the third-party services" — Apple tells developers directly that third parties are in the storage path.

---

### 5.5 What must the consent actually COVER?

> **Overlap with §4.7, deliberately kept.** §4.7 derives the consent-screen checklist from the *consent* rules; this subsection derives it again from the *device-boundary* rules, and the two arrive at overlapping but not identical lists — §5.5 adds the Apple/transfer items that only the boundary analysis surfaces. §6.3 is the merged version and is the one to build from.

**Takeaway — and this is a correction to the brief's premise.** The brief states that "if the developer is the controller of synced data, consent has to cover a transfer to Apple as a recipient." That is **not** what the EDPB says. **Processors do not need to be named in the consent.** Apple's disclosure is an Art. 13/14 privacy-notice obligation, not a consent-validity condition. The distinction matters practically: getting it wrong produces a bloated consent screen that is *less* likely to be valid, because burying a processor disclosure inside a consent request works against the specificity and clarity the EDPB requires.

EDPB Guidelines 05/2020 on consent under Regulation 2016/679 (v1.1, adopted 4 May 2020), fetched <https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf>

The minimum content list, para 64:

> For consent to be informed, it is necessary to inform the data subject of certain elements that are crucial to make a choice. Therefore, the EDPB is of the opinion that at least the following information is required for obtaining valid consent:
> i. the controller's identity,
> ii. the purpose of each of the processing operations for which consent is sought,
> iii. what (type of) data will be collected and used,
> iv. the existence of the right to withdraw consent,
> v. information about the use of the data for automated decision-making in accordance with Article 22 (2)(c) where relevant, and
> vi. on the possible risks of data transfers due to absence of an adequacy decision and of appropriate safeguards as described in Article 46.

And the decisive para 65:

> With regard to item (i) and (iii), the EDPB notes that in a case where the consent sought is to be relied upon by multiple (joint) controllers or if the data is to be transferred to or processed by other controllers who wish to rely on the original consent, these organisations should all be named. **Processors do not need to be named as part of the consent requirements**, although to comply with Articles 13 and 14 of the GDPR, controllers will need to provide a full list of recipients or categories of recipients including processors. To conclude, the EDPB notes that depending on the circumstances and context of a case, more information may be needed to allow the data subject to genuinely understand the processing operations at hand.

So the naming rule is: **name joint controllers and downstream controllers; do not clutter the consent with processors — put them in the notice.** Item (vi) is the exception that pulls Apple partly back in: to the extent synced data goes to a third country without adequacy or appropriate safeguards, the *risks* of that transfer must be surfaced **in the consent itself**. Given the § 5.4 finding that the developer has no executed current SCCs and cannot identify sub-processors or locations, item (vi) is engaged on a conservative reading.

Explicit consent, para 93 (Art. 9(2)(a) is the settled sole limb):

> The term explicit refers to the way consent is expressed by the data subject. It means that the data subject must give an express statement of consent. An obvious way to make sure consent is explicit would be to expressly confirm consent in a written statement.

Para 94 confirms an in-app affirmative statement suffices in the digital context:

> However, such a signed statement is not the only way to obtain explicit consent and, it cannot be said that the GDPR prescribes written and signed statements in all circumstances that require valid explicit consent. For example, in the digital or online context, a data subject may be able to issue the required statement by filling in an electronic form…

Granularity, paras 43–44:

> 43. Recital 43 clarifies that consent is presumed not to be freely given if the process/procedure for obtaining consent does not allow data subjects to give separate consent for personal data processing operations respectively (e.g. only for some processing operations and not for others) despite it being appropriate in the individual case. Recital 32 states, "Consent should cover all processing activities carried out for the same purpose or purposes. When the processing has multiple purposes, consent should be given for all of them".

> 44. If the controller has conflated several purposes for processing and has not attempted to seek separate consent for each purpose, there is a lack of freedom. This granularity is closely related to the need of consent to be specific… When data processing is done in pursuit of several purposes, the solution to comply with the conditions for valid consent lies in granularity, i.e. the separation of these purposes and obtaining consent for each purpose.

And para 61 on per-purpose information:

> Lastly, controllers should provide specific information with each separate consent request about the data that are processed for each purpose, in order to make data subjects aware of the impact of the different choices they have.

#### Concretely, what the consent text must name

Assuming the conservative (controller) reading, the explicit-consent statement must contain:

| # | Element | Source | Content for this product |
|---|---|---|---|
| 1 | Controller identity | 05/2020 para 64(i); Recital 42 | The developer's **real name and contact address** as a natural person. A solo natural-person controller cannot hide behind a trade name; Art. 4(7) expressly contemplates a natural person |
| 2 | That the data concern **the infant**, a third party, and are **health data** | para 64(iii); Art. 9(1) | Must be explicit that special-category data about the child is being recorded, and that the mother is consenting on the child's behalf (per the settled Czech Civil Code § 892(2) + § 876(3) basis) |
| 3 | The purpose, stated specifically | para 64(ii); WP 203 via fn. 30 | "Recording your meals and your child's skin condition so you can keep and review a diary." **Do not** write "to improve your child's health" or "for analysis" — v1 derives nothing, and a vague purpose fails specificity. The purpose statement must not overstate what the app does |
| 4 | The data types, itemised | para 64(iii) | Meals eaten by the mother; skin observations across nine body regions at four severity levels; **photographs of the child** — photos named separately and prominently, as the most intrusive category |
| 5 | That data are stored **on the device** | Art. 13; ePrivacy transparency | Plain statement of local storage |
| 6 | That data are **synced to the mother's own iCloud account**, and that this involves **Apple** | para 64(vi); Art. 13(1)(e) | Name Apple. Strictly, para 65 does not require naming a *processor* in the consent — but naming Apple here is advisable because sync is the single fact most likely to surprise the user, and because item (vi) transfer risks are engaged |
| 7 | That data **may be stored outside the EEA / in the United States**, and the associated **risks** | **para 64(vi)** — mandatory consent content | Required on a conservative reading given no executed current SCCs, undisclosed sub-processors, and Apple's contractual "geographic discretion". This is the one Apple-related item that genuinely belongs **in the consent** rather than only the notice |
| 8 | Right to withdraw, and that withdrawal is as easy as giving | para 64(iv); **Art. 7(3)** | Art. 7(3): "It shall be as easy to withdraw as to give consent." Must state *how* — and the mechanism must actually exist in the UI (§ 5.6) |
| 9 | **No** automated decision-making | para 64(v) | Item (v) is "where relevant" — not relevant in v1, and saying so affirmatively is a useful record that the app derives nothing (and supports the MDR Rule 11 position) |
| 10 | Separate consent for photos | paras 43–44, 61; Recital 43 | **Strongly advisable.** Photographs of an infant's skin are a materially different intrusion from a text log. Granularity means the mother should be able to keep a diary **without** photos. If photos are non-severable, that is a conditionality problem of the same shape as § 5.6 |

Not required in the consent, per para 65: a full sub-processor list. That belongs in the Art. 13 privacy notice as "recipients or categories of recipients" — which the developer can only satisfy at the *category* level ("Apple, as our cloud storage provider, and its data-centre providers"), because Apple does not publish the names (§ 5.4).

**One caution on scope.** Consent under Art. 9(2)(a) and consent under ePrivacy Art. 5(3) are distinct requirements with distinct legal bases, and WP 202 permits merging them in practice provided the user genuinely understands both:

> It is important to note the distinction between the consent required to place any information on and read information from the device, and the consent necessary to have a legal ground for the processing of different types of personal data. Though both consent requirements are simultaneously applicable, each based on a different legal basis, they are both subject to the conditions of having to be free, specific and informed… Therefore, the two types of consent can be merged in practice, either during installation or before the app starts to collect personal data from the device, provided that the user is made unambiguously aware of what he is consenting to.

WP 202 also warns that an App Store install click is **not** sufficient for the data-processing consent:

> Whilst such an action may, in some circumstances, fulfil the consent requirement of Article 5(3), it is unlikely to provide sufficient information in order to act as valid consent for the processing of personal data.

So the consent must be collected **in-app on first run**, not inferred from purchase or installation.

---

### 5.6 Does this create a design lever? (assessment only — not this ticket's call)

**Takeaway.** Yes, and it is the highest-leverage open decision in the whole analysis — but it is genuinely two-sided, and the two applicable regimes point in **opposite** directions. Mandatory sync strengthens the ePrivacy "strictly necessary for the service explicitly requested" argument while weakening the GDPR "freely given" argument. Elective sync does the reverse, and additionally creates a local-only mode that squarely attracts WP 202's "considerably limited" relief. There is a live contradiction with another ticket that settled sync as **mandatory with no in-app toggle**; the purpose here is to state precisely what each shape costs.

#### The governing texts

Art. 7(4):

> When assessing whether consent is freely given, utmost account shall be taken of whether, inter alia, the performance of a contract, including the provision of a service, is conditional on consent to the processing of personal data that is not necessary for the performance of that contract.

Recital 43, second sentence:

> Consent is presumed not to be freely given if it does not allow separate consent to be given to different personal data processing operations despite it being appropriate in the individual case, or if the performance of a contract, including the provision of a service, is dependent on the consent, despite such consent not being necessary for such performance.

EDPB 05/2020 para 32 — the escape hatch, and the single most important sentence for the mandatory-sync defence:

> Article 7(4) is only relevant where the requested data are not necessary for the performance of the contract, (including the provision of a service), and the performance of that contract is made conditional on the obtaining of these data on the basis of consent. **Conversely, if processing is necessary to perform the contract (including to provide a service), then Article 7(4) does not apply.**

But paras 34–36 set a demanding bar:

> 34. The choice of the legislator to highlight conditionality, amongst others, as a presumption of a lack of freedom to consent, demonstrates that the occurrence of conditionality must be carefully scrutinized. The term "utmost account" in Article 7(4) suggests that special caution is needed from the controller when a contract (which could include the provision of a service) has a request for consent to process personal data tied to it.

> 35. As the wording of Article 7(4) is not construed in an absolute manner, there might be very limited space for cases where this conditionality would not render the consent invalid. However, the word "presumed" in Recital 43 clearly indicates that such cases will be **highly exceptional**.

> 36. In any event, the burden of proof in Article 7(4) is on the controller.

And para 42 on bundling:

> …data subjects should be free to choose which purpose they accept, rather than having to consent to a bundle of processing purposes. In a given case, several consents may be warranted to start offering a service, pursuant to the GDPR.

#### The two shapes, side by side

| | **Sync MANDATORY (current settled position)** | **Sync ELECTIVE (opt-in toggle)** |
|---|---|---|
| GDPR "freely given" (Art. 7(4), Rec. 43) | **Weakest point.** Consent to Art. 9 health-data sync is a precondition of using a paid app. Defensible *only* if sync is genuinely "necessary to perform the contract" per para 32 — and paras 35–36 make that "highly exceptional" with the burden on the developer | **Strong.** The mother can use the app fully without sync; consent to sync is a real choice, so Art. 7(4) is not engaged for the core service |
| Granularity (paras 42–44, Rec. 43) | Bundles "keep a local diary" with "store my infant's health photos in the cloud" — two materially different operations under one consent | Separates them cleanly; each purpose gets its own consent |
| ePrivacy Art. 5(3) "explicitly requested / strictly necessary" | **Stronger.** If the service is *defined* as a synced diary, sync falls inside the requested perimeter and WP 194 limb 2 is satisfied by construction ("if disabled, the service will not work") | **Weaker for sync.** The developer's own design proves the app works without it, so sync is a separate functionality needing its own consent. (Local storage stays exempt either way) |
| WP 202 "considerably limited" responsibilities | **Unavailable.** Data always leaves the device, un-anonymised and un-aggregated — neither limb of WP 202's condition is met | **Available for the local-only population.** For users who never enable sync, "no personal data are processed and/or made available outside the device" is literally true |
| Art. 28 exposure (§ 5.4) | **Unavoidable and unfixable** for every user — the (d)/(g) gaps bite on 100% of the install base | **Confined** to users who opt in; zero Art. 28 surface for the rest |
| Chapter V transfer exposure | Applies to all users | Applies only to opt-in users |
| Consent items required (§ 5.5) | Items 6 and 7 mandatory for everyone | Items 6 and 7 attach only to the sync consent |
| Withdrawal mechanics (Art. 7(3)) | **Structurally problematic** — see below | Withdrawal = flip the toggle off. Clean |
| Product/UX cost | None; simplest implementation; no partial-state bugs; no silent data loss on device change | Real cost: two storage paths, migration when toggled, backup expectations, support burden |

#### The withdrawal problem with mandatory sync

Art. 7(3): "The data subject shall have the right to withdraw his or her consent at any time… **It shall be as easy to withdraw as to give consent.**"

If sync is mandatory and consent is the sole Art. 9 basis, then withdrawal of consent logically requires sync to stop — but there is no toggle, so the only available "withdrawal" is deleting the app or the data entirely. **UNSETTLED** whether "uninstall the app you paid for" satisfies "as easy to withdraw as to give". Giving consent was one tap on first run; withdrawing requires abandoning the purchased product and, if it is the only copy, losing the diary. That asymmetry is the strongest single argument against the mandatory shape, and it is independent of the Art. 7(4) conditionality argument. It should be weighed by whoever owns that decision.

Note the honest counter: if the app is *defined* as a cloud-synced diary, then per para 32 sync is "necessary to perform the contract", Art. 7(4) is disapplied, and the appropriate basis for the *sync operation itself* might be Art. 6(1)(b) contract — but **Art. 9 still requires a separate exception for the health data, and explicit consent is the settled sole limb.** Art. 6 and Art. 9 must both be satisfied; contract necessity under Art. 6(1)(b) cannot substitute for an Art. 9(2) exception. So the conditionality problem cannot be engineered away by recharacterising the Art. 6 basis. This is the crucial point: **the settled "Art. 9(2)(a) is the only open limb" input is what makes mandatory sync legally expensive.**

#### A third shape worth putting on the table

Neither ticket appears to have considered **mandatory sync + developer-side field encryption**. Using CloudKit `encryptedValues` for all eczema fields and photo assets (§ 5.4) keeps sync mandatory and the UX simple, while making the synced payload unreadable to Apple's servers by construction:

> The encrypted fields can't have indexes because the server can't read the fields.

This does not remove controllership, does not cure the Art. 28(3)(d)/(g) gaps, and does not make the data non-personal. But it materially strengthens Art. 32, reduces the practical severity of the Chapter V exposure, and is entirely within the developer's control — unlike Advanced Data Protection. If the mandatory decision holds, this is the mitigation to pair with it. Flagged for the deciding ticket, not decided here.

---

### 5.7 Controllership remains formally UNSETTLED — both readings, and what would settle it

**Takeaway.** After exhausting the EU-level primary sources and the Czech DPA's published output, controllership over the synced data is **UNSETTLED**, and the gap is clean rather than contested: no authority addresses a vendor who ships software, never receives the data, and never holds the credentials or the account. ÚOOÚ has published nothing on the question. The nearest published reasoning points in **both** directions.

#### Reading A — the developer IS the controller (conservative)

| Ground | Source |
|---|---|
| Determines three of four enumerated "essential means": which data, whose data, who has access | EDPB 07/2020 para 40 |
| Lack of access is no defence | 07/2020 paras 45 (1st sentence), 56; *Wirtschaftsakademie* C-210/16 §38; *Jehovah's Witnesses* C-25/17 §68 |
| Controllership read broadly "to avoid lacunae" | 07/2020 para 14 |
| An app developer determining purposes and means **is** the controller | WP 202 §3.3.1 |
| Using a cloud provider for external storage triggers full processor obligations | WP 202 §3.3.1 |
| Choosing a particular standardised provider is itself an exercise of control | 07/2020 "standardised cloud storage service" example |
| Apple's own terms cast Apple as the developer's **agent** on the developer's **instructions** | ADPLA Att. 4 § 3.6 vs Art. 4(8) |
| The mother's household exemption does not extend to the developer | WP 202 §3.3.1; Art. 2(2)(c) |
| Controllership is not negotiable or disclaimable | 07/2020 paras 12, 28–29 |

#### Reading B — the developer is NOT a controller (neither controller nor processor)

| Ground | Source |
|---|---|
| Para 45 is expressly about **outsourcing**; shipping a binary to a stranger is not outsourcing, and the mother is not the developer's service provider | 07/2020 para 45, text and Market research 1 example |
| The mother alone answers para 20's "who decided that the processing should take place for a particular purpose?" — the developer has no purpose in the data whatsoever (no analytics, telemetry, research, or training) | 07/2020 para 20 |
| *Jehovah's Witnesses* turned on the community pursuing **its own objective** through members' processing; absent here | 07/2020 para 56 |
| A "neither controller nor processor" status is expressly recognised | 07/2020 IT-consultant example |
| Content/conduit split: the provider is not controller of content it merely enables | 07/2020 telecom/e-mail example |
| Responsibilities "considerably limited" where nothing leaves the device | WP 202 §3.3.1 |
| The targeting/establishment criterion "might not be fulfilled if the data are only processed locally" | WP 202 fn. 10 |
| Paras 64–65 presuppose parties processing the **same** data on provider-run infrastructure; the developer processes none | 07/2020 paras 64–65 |
| Reductio: the controller reading implies unfixable Art. 28 non-compliance (§ 5.4), which suggests mischaracterised facts | Art. 28(1),(3); ADPLA gaps |

**Reading A is stronger for Zone B; Reading B is materially stronger for Zone A.** That asymmetry is the most defensible synthesis the sources support, and it is why § 5.2's two-zone frame should drive the compliance posture rather than a single global answer.

#### ÚOOÚ has published nothing on this

Searched `uoou.gov.cz` (note: `www.uoou.cz` now 301-redirects to `uoou.gov.cz`, and several legacy `uoou.cz/assets/File.ashx` PDF links still cited on live ÚOOÚ pages are dead):

| Question | Result |
|---|---|
| App developer as `správce` of on-device-only data | **NOT FOUND.** Never addressed in any methodology, opinion, FAQ, or inspection report |
| Controller/processor `metodika` | **NOT FOUND — no such methodology exists.** ÚOOÚ's published methodologies cover cameras, DPO, DPIA, and transfers |
| Cloud storage in the **user's own** account | **NOT FOUND.** All located cloud material concerns organisation–cloud contracts. The handbook treats a cloud provider as a typical processor; the inverted arrangement is unaddressed |
| Health data / explicit consent | **PARTIAL, generic only** — bare Art. 9(2) paraphrase, no interpretation |
| Children | Czech child threshold is **15** (Act 110/2019). Parental-consent material is limited to a 2012 inspection under the repealed Act 101/2000. Consistent with the settled input that Art. 8 does not apply here |
| § 89(3) competence | **ÚOOÚ claims the cookie question itself**, grounding competence in **§ 50(1) of Act 110/2019**, *not* Act 127/2005. § 89 is absent from ÚOOÚ's own published list of Act 127/2005 competences |

The § 89(3) competence position is worth recording verbatim, because it confirms the tension in the established findings rather than resolving it. From an ÚOOÚ freedom-of-information response (3 April 2025):

> problematika zpracování osobních údajů prostřednictvím souborů cookies je v České republice řešena Úřadem, neboť je ústředním správním úřadem pro oblast ochrany osobních údajů dle § 50 odst. 1 zákona č. 110/2019 Sb.

(*"the issue of processing personal data by means of cookies is dealt with in the Czech Republic by the Office, since it is the central administrative authority for personal data protection pursuant to § 50(1) of Act No. 110/2019 Coll."*)

So ÚOOÚ applies § 89(3) as the substantive standard while sourcing its jurisdiction from the GDPR adaptation act rather than from Act 127/2005 — whose § 3(1) assigns "Úřad" to ČTÚ. Both established findings hold, and the practical upshot is that **a developer cannot rely on the ČTÚ/ÚOOÚ competence split as a safe harbour**: ÚOOÚ asserts jurisdiction regardless. Its published cookie guidance is nonetheless framed exclusively around website operators and site visitors; the FAQ extends to local-storage objects and fingerprinting, but always in the context of a visitor's browser — **never a native app writing to its own local storage.**

#### What evidence would settle it

1. **An EDPB opinion or guideline addressing consumer software vendors** whose product processes data only on the buyer's own device/account. The clean way would be a worked example in a revision of Guidelines 07/2020, whose ~40 examples are all organisation-processes-third-parties.
2. **CJEU reference on a shipped-software vendor.** *Wirtschaftsakademie*, *Fashion ID* and *Jehovah's Witnesses* all involve a party pursuing its own objective through infrastructure it participates in operating. A reference on a vendor with no data, no account, and no purpose would be decisive.
3. **An express EDPB position on whether the Art. 5(3) "strictly necessary / explicitly requested" exemption covers local persistence by a native app** — the EDPB has twice expressly declined (2/2023 paras 4, 40), leaving § 5.2 as reasoning.
4. **A national DPA decision or FAQ on the user's-own-cloud-account pattern** — i.e. whether a vendor that never holds the credentials or the data is controller, processor, or neither. This is the precise gap; ÚOOÚ has nothing, and no other source located fills it.
5. **Apple publishing an iCloud sub-processor list and current SCCs in the ADPLA** would resolve much of § 5.4 without touching controllership. Its absence is Apple's choice and is currently un-curable by the developer.
6. **Clarification of ADPLA § 3.5 vs § 3.6** — whether Apple regards itself as a processor for private-database content it says it cannot read.

#### Practical posture that survives either reading

The two readings converge on almost identical action, which is the useful conclusion:

- Collect **explicit, granular, in-app consent** on first run covering §5.5 items 1–10. Valid under Reading A; harmless and good practice under Reading B.
- Publish an **Art. 13 privacy notice** naming Apple as a recipient (category level, since Apple does not publish sub-processors). Required under Reading A, and defensible transparency under Reading B.
- **Do not claim** the household exemption applies to the developer — WP 202 forecloses it.
- **Do not rely** on the Czech § 89(3) drafting gap — conforming interpretation and ÚOOÚ's asserted jurisdiction both cut against it.
- Use **`encryptedValues`** for eczema fields and photo assets: the one materially protective measure fully within the developer's control.
- **Document the reasoning** — including the "considerably limited" quote and the Art. 28 gap analysis — as the accountability record. Under Art. 28(1) and Art. 24 the developer must be able to show he assessed this; a documented, source-grounded assessment is itself the deliverable, and the unfixable ADPLA gaps are far more defensible when identified and reasoned about than when unnoticed.

> **Reminder:** not legal advice. The Art. 28 conclusion in § 5.4 (that CloudKit cannot be brought into full Art. 28(3) compliance) and the withdrawal problem in § 5.6 are the two findings most worth putting to a qualified Czech data-protection lawyer before shipping.

## 6. What this means concretely for first-run UX

**Takeaway: yes — there must be a consent gate, it must sit before the first record is written, and it must be a distinct affirmative act rather than a step in an onboarding flow. That much is settled by EDPB Guidelines 05/2020 para 90 (consent must precede processing) and Example 17 / para 81 (a distinct, performatively-worded act, not bundled with terms). What is *not* settled is the shape of the sync half of the screen, because that depends on the mandatory-vs-elective decision that is a separate ticket ([#705](https://github.com/jirigrill/eczema-helper/issues/705)). This section therefore specifies the part that is invariant across that decision in full, and specifies the sync half as two alternative layouts.**

_Not legal advice. This section is design derived from the primary sources quoted in §§4–5, and where it recommends rather than derives, it says so._

---

### 6.1 Is a consent gate required, and where does it sit?

**Required, and before the first write.** Three independent sources converge:

- **Guidelines 05/2020 para 90**: "consent must always be obtained before the controller starts processing personal data for which consent is needed." The first record the mother saves *is* the start of processing (§5.1's verb-walk: collection, recording, structuring, storage all occur at that moment).
- **Guidelines para 81**: consent "cannot be obtained through the same motion as agreeing to a contract or accepting general terms and conditions of a service." So it cannot ride on an onboarding "Continue".
- **WP 202 p. 14** (persuasive only): tapping Install in the App Store "is unlikely to provide sufficient information in order to act as valid consent for the processing of personal data."

The existing PWA first run is a single welcome screen carrying the feeding-stage picker, and writing the stage is the app's "seeded" signal (`src/routes/+page.svelte:1-30`). That is the screen the consent gate has to be reconciled with, and the reconciliation is not free: **the feeding-stage answer is itself personal data about the mother** (whether she is breastfeeding), and arguably health data about her. So the gate cannot sit *after* the feeding-stage picker either.

**Ordering, derived:**

| Step | Screen | Why here |
|---|---|---|
| 1 | Welcome / what this app is | Sets the "clearly defined perimeter" WP 194 asks for, and gives para 67's "average person" the context to judge the consent request |
| 2 | **Consent gate** | Before any personal data is captured — including the feeding stage |
| 3 | Feeding-stage picker | First actual data capture; now covered |
| 4 | Day view | — |

Steps 1 and 2 may be one scrollable screen provided the consent act itself is a distinct control at the end of it. They must not be one *motion*.

### 6.2 The refusal path — the question the design has to answer first

Example 17 requires "Yes **and** No check boxes", and WP 202 p. 14 requires that "an option to 'Cancel' or otherwise halt the installation must be available". So the screen needs a working decline. The hard question is what the app *does* on decline, and it has a real answer here rather than a fudge:

**On decline, the app must be usable in the sense that it does not pretend to work — and it must not record anything.** Since every function of the app is recording, declining leaves nothing to do. The honest design is a terminal state: a screen that says the diary cannot be kept without consent, offers to return to the consent screen, and links the privacy notice. Nothing is written to SwiftData.

This is uncomfortable but it is the configuration the EDPB itself illustrates as compliant. §4.4 established the point from Guidelines paras 99–102: para 32 disapplies Art. 7(4) where the data is necessary for the requested service, and Examples 19–20 show residual explicit consent operating validly where the health data is indispensable. **Total loss of function on refusal is not, on those examples, "detriment" under Recital 42** — though §4.8 records that no source addresses withdrawal of the processing that *is* the product, so this is settled in substance rather than in terms.

**What the decline path must not do:** it must not be a dead end with no way back (that converts refusal into a bricked purchase), must not nag repeatedly, and must not be visually weighted against the accept control. Guidelines para 79 rules out pre-ticked boxes; the same logic rules out a greyed-out decline.

**One product consequence worth naming for the owner:** a paid app whose decline path is "you cannot use this" invites refund requests. That is a commercial cost of the Art. 9 structure, not a compliance defect, and it is an argument for making the App Store listing state plainly that the app records health data about a child and requires consent — which is also the para 130 action from §3.2 (state that the app is offered to adults).

### 6.3 What the screen must say — the v1 text, item by item

§4.7 fixed the eight Tier-1 items and §5.5 added the two Apple-specific ones. Collapsed into the actual screen, with the source for each:

| # | Must appear | Source | Drafting note for this product |
|---|---|---|---|
| 1 | The developer's **real name** as a natural person, plus a contact email | para 64(i); Recital 42; Art. 13(1)(a) | A trading name alone fails Art. 13(1)(a). Art. 4(7) expressly contemplates a natural-person controller, so there is no entity to hide behind. A home address is not required if an email is given |
| 2 | That the records are **about the child**, and that the user is consenting **as the child's parent, on the child's behalf** | Derived from Civil Code § 892(2) + § 876(3) (§3.5); **not** in para 64, and **UNVERIFIED** against any EDPB source | Wording must not read "my data". "I am this child's parent and I consent, on their behalf, to…" |
| 3 | That this is **health data** about the child | para 64(iii); Art. 9(1) | Say it plainly. Do not euphemise as "wellness information" |
| 4 | The purpose, stated as **recording only** | para 64(ii); footnote 30 on vague purposes | "…so that you can keep and look back over a diary." **Never** "to find out what causes flare-ups" — that is the MDCG 2019-11 marketing tripwire the map's Notes warn about, and it would also overstate what v1 does, failing specificity |
| 5 | The data types, itemised | para 64(iii) | Meals the mother eats; skin observations across nine body regions at four severity levels; **photographs of the child's skin**, named separately; dates and times |
| 6 | That data is stored **on this device** | Art. 13; ePrivacy transparency | One sentence |
| 7 | That data is **copied to the user's own iCloud account**, naming **Apple** | Art. 13(1)(e); para 64(vi) | Strictly, para 65 does not require naming a *processor* in the consent — but sync is the single fact most likely to surprise, and item 8 pulls Apple in regardless |
| 8 | That data **may be stored outside the EEA**, and the **risk** that carries | **para 64(vi)** — mandatory consent content | Engaged on the conservative reading: §5.4 found no executed current SCCs in the ADPLA (only "Model Contract Clauses" on request), no published sub-processor list, and Apple's contractual "geographic discretion" |
| 9 | The right to **withdraw at any time**, stated *before* consent is given, with how | para 64(iv); **Art. 7(3) sentence 3** | Art. 7(3) requires the pre-disclosure specifically. Name the location: Settings |
| 10 | That there is **no backup and no export** in v1, and what that means | Art. 13(2)(a); the settled decision on [#683](https://github.com/jirigrill/eczema-helper/issues/683) | See §6.5 — this is a correction to the earlier drafts |
| 11 | Performative wording plus a real decline | Example 17 (para 96); footnote 38 | "I consent…", not "I understand that…" |

**Not on the screen** (Tier 2, privacy notice — para 72 authorises the layering, Example 13 confirms it): legal-basis citations, the recipients list, transfer mechanism detail, the full rights list, ÚOOÚ complaint route, retention criteria. Guidelines footnote 42 draws the line at controller identity and purposes — those two cannot be demoted.

**Register.** Para 67 sets the standard ("easily understandable for the average person and not only for lawyers"), para 70 requires assessing the audience, and para 82 expressly permits interruption: "it may be necessary that a consent request interrupts the use experience to some extent to make that request effective." The audience is a tired parent on a phone. The eleven items above must be readable without tapping into a sub-layer — which is a strong argument for short declarative sentences and a single expandable "more detail" link to the notice, rather than a wall.

**Language.** The iOS product is **English-first** (map Notes). The Czech-language requirement in the PWA does not carry over, and the earlier partial draft's "in Czech" instruction (§3.6.6 item 3) is wrong for this product. If the app is later localised into Czech, the consent text must be localised with it — para 67's "clear and plain language" is assessed in the language the user reads.

### 6.4 The sync half: two layouts, because the decision is open

[#705](https://github.com/jirigrill/eczema-helper/issues/705) decides whether sync is mandatory or elective, and it is blocked on this ticket. §5.6 sets out what each shape costs. Here is what each shape *looks like* on the first-run screen, so that ticket can choose with the UX in front of it.

**Layout A — sync mandatory (the currently settled position, from [#687](https://github.com/jirigrill/eczema-helper/issues/687)):** one consent covering recording *and* sync, with items 7 and 8 mandatory for every user. One checkbox, one purpose statement that names both operations. Simplest to build; no partial states.

Its cost on this screen is concrete and should not be glossed: there is **no toggle to withdraw against**. §5.6 found that if consent is the sole Art. 9 basis and sync cannot be switched off, the only available withdrawal is deleting the app or the data — and whether that satisfies Art. 7(3)'s "as easy to withdraw as to give" is **UNSETTLED**. Giving consent was one tap; withdrawing means abandoning a purchased product and, with no export and no backup ([#683](https://github.com/jirigrill/eczema-helper/issues/683)), losing the diary. That asymmetry is the strongest argument against Layout A and it is independent of the Art. 7(4) conditionality question.

**Layout B — sync elective:** two checkboxes on one screen. Checkbox 1 (required) covers local recording. Checkbox 2 (optional, default off) covers sync, carrying items 7 and 8 as its own purpose statement. Withdrawal of checkbox 2 is a Settings toggle — clean under Art. 7(3), and it is the granularity paras 43–44 and 61 ask for. It also makes WP 202's "considerably limited" relief (§5.1) available for the users who never turn sync on, and confines the unfixable Art. 28 exposure (§5.4) to those who do.

Note that Apple's own HIG sanctions the elective shape as a first-run all-or-nothing choice (recorded on #705), and that the CloudKit configuration must ship in release one either way — so "sync off" is a runtime state, not a build variant.

**What this section does not do:** it does not pick. §5.6 is explicit that the two applicable regimes pull in opposite directions — mandatory sync strengthens the ePrivacy Art. 5(3) "strictly necessary for the service explicitly requested" argument while weakening the GDPR "freely given" one. The decision is #705's.

**One recommendation that holds under either layout**, from §5.4: use CloudKit `encryptedValues` for the eczema fields and photo assets. It is the one materially protective measure fully within the developer's control (unlike Advanced Data Protection, which is a user setting), it cannot be retrofitted after first schema deployment, and it strengthens Art. 32 regardless of which layout ships. If Layout A wins, this is the mitigation to pair with it.

**Photos.** §5.5 item 10 recommends a separate consent for photographs, on paras 43–44 granularity grounds: a photograph of an infant's skin is a materially different intrusion from a text log, and the mother should be able to keep a diary without them. §4.8 records this as **UNVERIFIED** — prudent design, not a requirement any source imposes. It is cheap: photos are already optional per-frame in the product, so a third checkbox costs one boolean and makes the granularity argument considerably stronger. Recommended, not required.

### 6.5 What the screen must say about durability — a correction

Two settled decisions on this map change what the consent screen has to disclose, and the earlier drafts of §§3.6 and 4.6 do not reflect them:

1. **There is no export and no import in v1** ([#683](https://github.com/jirigrill/eczema-helper/issues/683), the owner's call against the recommendation, exposure accepted explicitly).
2. **CloudKit is sync, not backup** — no rollback, so a deletion by user or bug propagates everywhere; and three cases have no recovery path at all (signed out of iCloud, iCloud storage exhausted silently, accidental deletion).

**Consequences that must be corrected in the earlier sections rather than left standing:**

- §3.6.6 item 1 says to ship "a data export the mother can hand over" as the year-18 mitigation. **That does not exist in v1.** The deletable-at-child-granularity half of that item survives and is still required (Art. 17); the export half is declined. The honest v1 position is that the year-18 remedy is deletion, not portability. If the young adult at 18 wants a copy rather than deletion, v1 has nothing to give them — and Art. 20 portability is therefore a live gap, not merely unbuilt. That should be recorded as such.
- §4.6 step 4's disclosure gets heavier, not lighter. The pre-consent text must state that data already copied to iCloud stays in iCloud until deleted **and** that there is no backup and no way to get the records out of the app. A user who understands "no export" is materially better informed about what withdrawal costs her, which feeds Art. 13(2)(e) ("the consequences of failure to provide such data") and the "freely given" argument in §4.4.
- Art. 13(2)(a) retention disclosure remains "kept until you delete it; the developer holds no copy" (§4.7), which WP 202 p. 25 recognises as a class — but with no export, "until you delete it" is the *only* lifecycle the user has any control over.

**Deliberately not a v1 feature:** an export built solely to service the year-18 question. #683 settled that, and re-opening it on Art. 20 grounds is a scoping decision for the owner, not something this research should smuggle back in. It is flagged, not proposed.

### 6.6 What v1 must build — the engineering list

Everything below is derived from a source quoted in §§4–6, and each item names it.

**Must build:**

| # | Item | Source |
|---|---|---|
| 1 | A consent screen before the first write, including before the feeding-stage picker | para 90; §6.1 |
| 2 | Performative accept control + working decline, decline not visually disadvantaged | Example 17 (para 96); para 79; WP 202 p. 14 |
| 3 | The eleven Tier-1 disclosures of §6.3, readable without a sub-layer | para 64; para 67; para 82 |
| 4 | A reachable privacy notice carrying the Tier-2 items, linked from the consent screen | para 72; Art. 13 |
| 5 | **A durable consent record**: timestamp, the exact consent text version, and what was consented to | Art. 7(1); Art. 5(2); §3.6.6 item 2 |
| 6 | A withdrawal control in Settings, comparable taps to the consent | Art. 7(3); para 114; Example 22 (para 115) |
| 7 | On withdrawal, immediately offer and default to deletion of all data, local **and** CloudKit, executed in-app while the code can still reach both | paras 117, 119; Art. 17(1)(b); §4.6 |
| 8 | A standalone "delete all my data" control, available at all times, deleting at child granularity | Art. 17; §3.6.6 item 1 |
| 9 | An App Store listing and in-app statement that the app is offered to **adults** | para 130 — the EDPB's own route to putting Art. 8 out of scope (§3.2) |
| 10 | `encryptedValues` on eczema fields and photo assets, decided **before first schema deployment** | Art. 32; §5.4; irreversible per #693 findings |

**Must not build:**

| # | Item | Why |
|---|---|---|
| 11 | A second-parent consent flow, or asking the mother to declare the father agrees | § 876(3) already supplies the presumption; asking converts it into a user representation that may be false, and collects data the app does not need (Art. 5(1)(c)) — §3.5 |
| 12 | Collection of the child's identity or contact details to enable notification at 18 | Fails minimisation; the precise pattern para 145 warns against — §3.6.6 item 5 |
| 13 | An age-triggered re-consent flow at 15/16/18 | §3.6.4 is UNSETTLED and para 148's default is continuity; building it now encodes a guess into the schema — §3.6.6 item 4 |
| 14 | Any consent carried by the App Store purchase or an onboarding "Continue" | para 81; WP 202 p. 14 |
| 15 | A claimed clinical or diagnostic purpose anywhere in the consent text or listing | §2.3 — it would re-qualify the app under MDR Rule 11 and still fail Art. 9(2)(h) |

**Open, and owned elsewhere:**

| Item | Owner |
|---|---|
| Mandatory vs elective sync — Layout A or B | [#705](https://github.com/jirigrill/eczema-helper/issues/705) |
| Whether photos get their own checkbox | Product call; recommended in §6.4, UNVERIFIED as a requirement |
| Whether Art. 20 portability with no export is an accepted gap or a re-opening of #683 | Owner |
| Controllership of the synced copy | **UNSETTLED** (§5.7); the compliance posture in §5.7 survives either reading |

### 6.7 The one thing this section cannot resolve

The consent screen can be built correctly and the product still carries the finding from §5.4 that **if the developer is the controller of synced data, the ADPLA cannot be brought into full Art. 28(3) compliance** — (d) sub-processors and (g) end-of-processing deletion are absent, and the developer cannot negotiate the agreement. No first-run screen fixes that. It is the finding most worth putting to a qualified Czech data-protection lawyer, together with the Art. 7(3) withdrawal problem under Layout A (§5.6).

Recording it here rather than only in §5.4 because it is the thing a reader who skips to the UX section would otherwise miss: **the consent gate is the cheap part of this analysis, and it is not where the residual risk sits.**

---

_Not legal advice. §§6.1–6.3 are derived from quoted primary sources; §6.4's layouts and §6.6's engineering list are design recommendations built on that derivation, and the items marked UNVERIFIED or UNSETTLED are exactly that._
