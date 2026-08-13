> [!WARNING]
> **INCOMPLETE — the research agent was stopped mid-run on 2026-08-13.**
> Sections 1–3.5 are drafted; **§3.6 was being revised and §4 was never written** when the run ended.
> Do not treat this as a finished analysis. See issue #694 for what remains, and for additional
> ePrivacy / ADPLA §3.6 findings from the same run that are not reflected in this file.

# Art. 9(2) GDPR — the lawful basis for processing this app's health data

**Research ticket:** [#694](https://github.com/jirigrill/eczema-helper/issues/694) · map [#672](https://github.com/jirigrill/eczema-helper/issues/672) · sibling [#680](https://github.com/jirigrill/eczema-helper/issues/680) (DPIA)
**Date:** 2026-08-13
**Subject:** the planned native iOS app — records an **infant's** atopic eczema (meals eaten by the breastfeeding mother, skin observations across nine regions at four severity levels, photos) for the child's **mother**. SwiftData locally, synced to the **user's own** iCloud account via **CloudKit private database**. No developer-operated backend. Paid app, sold internationally, English-first, by a **solo individual developer (natural person) established in the Czech Republic**. v1 records only — derives nothing, correlates nothing, instructs nothing.

> ⚠️ **This is not legal advice.** It is primary-source groundwork for a decision the owner makes, and it is not a substitute for a Czech data-protection lawyer. Every load-bearing claim below is quoted from regulation text, EDPB/WP29 guidance, a supervisory authority's own publication, or a national statute — with a URL. Where a question is genuinely unsettled, it says so instead of resolving it.

---

## Overview

**Art. 9(2)(a) explicit consent is the only open limb. That confirms the preliminary read — but the reason 9(2)(h) is closed is not the one that was assumed, and the child dimension is not governed by Art. 8 at all.**

- **All ten limbs walked (§2).** Nine are closed on the face of the text. Eight of them fail on an element the fact pattern cannot supply — an employment relationship, a not-for-profit body, public interest, a Union or Member State law basis. **9(2)(h) fails twice over**, and the first failure is the decisive one: it needs a basis in "Union or Member State law **or pursuant to contract with a health professional**", and there is none. Art. 9(3)'s professional-secrecy condition is a *second*, independent bar — so the DPIA's read was right in its conclusion but was citing the weaker of the two reasons.
- **9(2)(a) is genuinely open in the Czech Republic**, and this was checked rather than assumed. 9(2)(a) carries its own kill-switch — it does not apply "where Union or Member State law provide that the prohibition ... may not be lifted by the data subject". The Czech implementing act, **zákon č. 110/2019 Sb.**, contains **no such provision** and does not exercise Art. 9(4) to add conditions on health data in the private sector (§2.4). Verified by reading the full statute text, not a summary.
- **Art. 8 GDPR does not apply, and this is the most consequential finding (§3).** Art. 8 governs a *child consenting for themselves* to an information society service offered **"directly to a child"**. Here the service is offered to the **mother**, an adult, and she consents as the child's legal representative. The Czech age threshold — **15 years, § 7 of zákon č. 110/2019 Sb.**, quoted verbatim in §3.3 — is therefore a **red herring for this product**. It was worth establishing precisely so it can be ruled out rather than left hanging.
- **Once Art. 8 is out, GDPR is silent on proxy consent.** The phrase "parental responsibility" appears in the entire Regulation only three times — Recital 38, Art. 8, and Art. 40(2)(g) — all Art. 8 machinery. So the validity of the mother's consent falls to **national law**, here the Czech Civil Code (§3.5): **§ 892(1)** gives parents the right and duty to represent the child, **§ 892(2)** lets either parent act alone, and **§ 876(3)** creates a **rebuttable presumption** that a parent acting alone toward a good-faith third party acts with the other parent's agreement. **So the mother alone can validly consent — but by presumption, not by right.** The app should not ask her to assert that the other parent agrees; the presumption already does that work, and asking invites a false declaration.
- **The child grows up, and nothing in GDPR says what happens then.** Parental responsibility ends at full legal capacity — **§ 858(2) + § 30(1)** of the Civil Code, age 18. No primary source found addresses whether the parent's consent survives, must be renewed, or converts into the now-adult data subject's own. **Genuinely unsettled; stated as such.**
- **The local-first design does not remove the need for a basis, but it may change whose basis it is.** This sits on top of the unresolved controllership question from #680 §6 — which is *the* prior question and is still open.
- **For first-run UX (§6): yes, there must be a consent gate before the first record is written**, and it must be a distinct affirmative act, not bundled into an onboarding "Continue".

---

## 0. What is carried forward, not re-derived

From [#672](https://github.com/jirigrill/eczema-helper/issues/672) §7 and the DPIA research on [#680](https://github.com/jirigrill/eczema-helper/issues/680):

- Art. 9(1) health data applies; eczema photos qualify via the **health limb**, not biometrics (Recital 51).
- The Art. 30(5) SME record-keeping exemption **fails** for Art. 9 data.
- **Controllership is unresolved.** Whether the developer is a controller of data he never sees is not settled by any primary source found. #680 §6 sets out both readings. **This ticket does not resolve it either**, and §5 below explains why that matters here.

#680 §9 flagged this ticket's question as its own largest omission. This document answers it.

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

### 3.6 The child grows up — the least settled part of this document

The infant becomes an adult in eighteen years and becomes the person entitled to control this data. **§ 858(2)** is unambiguous that parental responsibility — and so the mother's power to represent the child — **ends at that point**. What happens to a consent she gave in year one is not addressed by any statute found.

The closest primary guidance is EDPB Guidelines 05/2020 **paragraphs 147–149**, verbatim:

> **147.** With regard to the data subject's autonomy to consent to the processing of their personal data and have full control over the processing, consent by a holder of parental responsibility or authorized by a holder of parental responsibility for the processing of personal data of children **can be confirmed, modified or withdrawn, once the data subject reaches the age of digital consent**.
>
> **148.** In practice, this means that **if the child does not take any action, consent given by a holder of parental responsibility … will remain a valid ground for processing**.
>
> **149.** After reaching the age of digital consent, **the child will have the possibility to withdraw the consent himself**, in line with Article 7(3). In accordance with the principles of fairness and accountability, **the controller must inform the child about this possibility**.

**Read carefully, this says three useful things:** the parent's consent does **not** automatically expire; inaction leaves it valid; and the child acquires a personal right of withdrawal, **which the controller has a duty to tell them about**.

**But its applicability here is uncertain, and that has to be said rather than glossed.** Paragraphs 147–149 sit inside section 7.1, "Children (Article 8)", and are keyed to "the **age of digital consent**" — the Art. 8 threshold, 15 in the Czech Republic. §3.2 concluded Art. 8 does not apply to this app. So:

- The **principle** — parental consent persists, transfers control to the child, and carries a duty to inform — is the best available guidance and is sensible to follow.
- The **trigger age** is doubtful. If Art. 8 does not apply, the "age of digital consent" is not obviously the right marker; Czech civil law would point to **18** (§ 30(1)), the age at which parental responsibility actually ends under § 858(2). The two ages differ by three years.
- **No source found resolves which applies to a non-Art.-8 service.** **GENUINELY UNSETTLED — recorded, not resolved.**

**Practical reading:** this is a real obligation but not a v1 engineering problem. The earliest it could bite is fifteen years out. What v1 should do is *not foreclose* it — keep the consent record durable and legible enough that the question can be answered later, rather than baking in an assumption now.

---
</content>
