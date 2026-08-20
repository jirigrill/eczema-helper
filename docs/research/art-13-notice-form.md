# Art. 13 privacy notice — form, language, versioning, and what must not be disclosed

Research for the iOS product's Art. 13 privacy notice. Scope: the *form* of the notice, not its
substantive content (lawful basis and recipients are settled elsewhere — see
`docs/research/art-9-lawful-basis.md` and `docs/research/gdpr-dpia-assessment.md`).

**Retrieved 2026-08-20.** Every quote below carries its source URL and that fetch date. Anything
not traceable to a primary source is labelled **NOT FOUND**, **UNVERIFIED**, or **UNSETTLED** in
place, per the repo's standing rule: regulatory claims require primary sources.

**This is not legal advice.** It is a record of what primary sources say, assembled by a developer
for a developer. It is not a substitute for advice from a qualified Czech data-protection lawyer,
and the controllership question it rests on is itself formally **UNSETTLED**.

## Overview

Five questions, five answers in plain language.

1. **Form.** Art. 12(1) sets the standard — "concise, transparent, intelligible and easily
   accessible form, using clear and plain language". The authoritative gloss for a mobile app is
   WP260 rev.01 (EDPB-endorsed), and it is unusually concrete: **the notice must be available from
   the App Store listing before download, and in-app afterwards, "never more than 'two taps
   away'"**. That is the only numeric figure in the guidance, and it is framed as "one way to meet
   this requirement", not as the rule itself. The rule is that the user "should not have to seek out
   the information". A link suffices — but only a clearly-labelled, visibly-placed one. The notice
   must also be specific to this app, not a generic company policy. **WP260 is silent on offline
   availability** — a real gap, and it cuts in the app's favour rather than against it.
2. **Language.** No primary source requires Czech. The trigger throughout is **targeting**, not
   establishment: WP260 requires translation "where the controller targets data subjects speaking
   those languages", and GDPR Recital 23 treats language as evidence of targeting. An English-only
   app not offered to Czech users is not reached. Czech consumer law is a separate, weaker question
   — see the Czech section for exactly what was and was not found.
3. **Versioning.** **No primary source requires a version number or a date on the notice.** The
   word "version" does not appear in the GDPR at all, nor in WP260. But EDPB 05/2020 para 108 does
   require the *consent record* to retain "a copy of the information that was presented to the data
   subject at that time", and says pointing at the current site configuration "would not be
   sufficient". So: versioning is not mandated, but retaining the exact text shown is — and
   versioning is the ordinary way to achieve that. WP260 separately requires **active notification**
   of substantive changes, and says telling users to "regularly check" the notice is "not only
   insufficient but also unfair".
4. **Disclosing the Art. 28 gap. Do not put it in the privacy notice.** This is the sharp answer
   and it is a negative one: nothing in Art. 13(1) or (2) reaches a processor-contract deficiency,
   and **NOT FOUND** — no EDPB or WP29 guidance requires a controller to confess its own
   non-compliance to data subjects. The distinction the decision turns on is textual and clean:
   Art. 30(4) sends the record of processing "to the supervisory authority on request", whereas
   Arts. 12–14 govern what goes to the data subject. The Art. 28 gap belongs in the internal
   accountability file, and the *facts* it concerns (Apple as recipient, US transfer, no deletion
   guarantee) belong in the notice — but the legal characterisation "this contract fails Art. 28(3)"
   does not. Note the EDPB is blunt that accepting non-compliant terms is not excused by weak
   bargaining power, so the underlying exposure is real; it is simply not a transparency problem.
5. **Apple and the DPF.** Settled, and the answer overturns the framing: **Apple Inc. is not on
   the DPF list at all.** There is no certification to characterise — no status, no date, no HR/
   non-HR split. Three unrelated companies carry "Apple" in their names. This is consistent with
   Apple's own ADPLA, which names "Model Contract Clauses" and never mentions the DPF or Privacy
   Shield. So the DPF is simply not the transfer mechanism here, and the notice should not imply it
   is.

---

## Method and source provenance

Two fetch obstacles are worth recording, because they affect reproducibility.

**EUR-Lex is behind an AWS WAF JavaScript challenge.** Every `eur-lex.europa.eu` URL for
CELEX:32016R0679 (HTML, PDF, XML renditions) returned `HTTP 202` with either an empty body or a
2,038-byte `challenge.js` interstitial reading "In order to continue, we need to verify that you're
not a robot." The GDPR text used here therefore comes from the **EU Publications Office Cellar**
content-negotiation endpoint, which is equally official:

```
https://publications.europa.eu/resource/celex/32016R0679?language=eng
```

An `Accept-Language: eng` header is mandatory — without it Cellar returns
`Invalid content type CONTENT_STREAM for WORK ['cellar:3e485e15-11bd-11e6-ba9a-01aa75ed71a1']
without language`. The returned document self-identifies as `L_2016119EN.01000101.xml`,
"Official Journal of the European Union", "L 119/1", dated `4.5.2016` — i.e. the OJ as published.

**WP260 rev.01** was retrieved from the European Commission's own article29 newsroom document
endpoint, `https://ec.europa.eu/newsroom/article29/redirection/document/51025` (1,128,922 bytes,
30+ pages). Its cover page reads `17/EN`, `WP260 rev.01`, "Guidelines on transparency under
Regulation 2016/679", "Adopted on 29 November 2017", "As last Revised and Adopted on 11 April 2018".

**WP260's status is not merely advisory.** EDPB Endorsement 1/2018, retrieved from
<https://www.edpb.europa.eu/sites/default/files/files/news/endorsement_of_wp29_documents_en_0.pdf>
(fetched 2026-08-20), states that the EDPB "endorses the Article 29 Working Party documents as
following:" and lists at item 2 "Guidelines on transparency under Regulation 2016/679, WP260
rev.01". So WP260 is EDPB-endorsed guidance, "[w]ithout prejudice to any future revision as
appropriate".

---

## 1. Art. 12(1) form and accessibility — what the notice's format must satisfy

### 1.1 The Regulation, verbatim

All GDPR quotes in this document: <https://publications.europa.eu/resource/celex/32016R0679?language=eng>,
fetched **2026-08-20** (see Method above on why not eur-lex.europa.eu).

**Article 12(1):**

> 1. The controller shall take appropriate measures to provide any information referred to in
> Articles 13 and 14 and any communication under Articles 15 to 22 and 34 relating to processing to
> the data subject in a concise, transparent, intelligible and easily accessible form, using clear
> and plain language, in particular for any information addressed specifically to a child. The
> information shall be provided in writing, or by other means, including, where appropriate, by
> electronic means. When requested by the data subject, the information may be provided orally,
> provided that the identity of the data subject is proven by other means.

**Article 12(7):**

> 7. The information to be provided to data subjects pursuant to Articles 13 and 14 may be provided
> in combination with standardised icons in order to give in an easily visible, intelligible and
> clearly legible manner a meaningful overview of the intended processing. Where the icons are
> presented electronically they shall be machine-readable.

Note "**may**" in 12(7) — icons are optional. The Commission never adopted the Art. 12(8) delegated
act specifying icons, so there is no prescribed icon set to comply with.

Two recitals gloss the standard. **Recital 39**:

> The principle of transparency requires that any information and communication relating to the
> processing of those personal data be easily accessible and easy to understand, and that clear and
> plain language be used.

**Recital 58**:

> The principle of transparency requires that any information addressed to the public or to the data
> subject be concise, easily accessible and easy to understand, and that clear and plain language
> and, additionally, where appropriate, visualisation be used. Such information could be provided in
> electronic form, for example, when addressed to the public, through a website.

### 1.2 WP260 rev.01 — the operative guidance

All WP260 quotes: <https://ec.europa.eu/newsroom/article29/redirection/document/51025>, fetched
**2026-08-20**. Paragraph numbers are the document's own.

**"Easily accessible" — the definition, para 11.** This is the load-bearing passage:

> 11. The "easily accessible" element means that the data subject should not have to seek out the
> information; it should be immediately apparent to them where and how this information can be
> accessed, for example by providing it directly to them, by linking them to it, by clearly
> signposting it or as an answer to a natural language question (for example in an online layered
> privacy statement/ notice, in FAQs, by way of contextual pop-ups which activate when a data
> subject fills in an online form, or in an interactive digital context through a chatbot interface,
> etc. These mechanisms are further considered below, including at paragraphs 33 to 40).

**On the recalled "hunt" wording:** the word "hunt" does **not** appear anywhere in WP260 (0
occurrences). The actual phrases are "should not have to **seek out** the information" (para 11) and
"must not have to actively **search** for information" (para 33). The recollection was substantively
right, verbally wrong.

**The mobile-app example, para 11 (unnumbered example box immediately following).** This is the most
directly applicable text in any primary source, and it contains the only numeric figure:

> Every organisation that maintains a website should publish a privacy statement/ notice on the
> website. A direct link to this privacy statement/ notice should be clearly visible on each page of
> this website under a commonly used term (such as "Privacy", "Privacy Policy" or "Data Protection
> Notice"). Positioning or colour schemes that make a text or link less noticeable, or hard to find
> on a webpage, are not considered easily accessible.
>
> For apps, the necessary information should also be made available from an online store prior to
> download. Once the app is installed, the information still needs to be easily accessible from
> within the app. One way to meet this requirement is to ensure that the information is never more
> than "two taps away" (e.g. by including a "Privacy"/ "Data Protection" option in the menu
> functionality of the app). Additionally, the privacy information in question should be specific to
> the particular app and should not merely be the generic privacy policy of the company that owns
> the app or makes it available to the public.
>
> WP29 recommends as a best practice that at the point of collection of the personal data in an
> online context a link to the privacy statement/ notice is provided or that this information is
> made available on the same page on which the personal data is collected.

Four operative requirements for this app, and one non-requirement:

| # | Requirement | Status in WP260 |
|---|---|---|
| 1 | Available from the App Store listing **before download** | "should also be made available" |
| 2 | Easily accessible **in-app after install** | "still needs to be easily accessible" |
| 3 | Never more than **"two taps away"** | explicitly "**One way** to meet this requirement" — an example, not the rule |
| 4 | **Specific to this app**, not a generic company policy | "should not merely be the generic privacy policy" |
| 5 | Link at the point of collection | "recommends as a **best practice**" — not mandatory |

Requirement 3 is the answer to "does it specify a maximum number of taps/clicks": **yes, a figure of
two taps appears, but it is offered as a sufficient illustration rather than as the binding test.**
The binding test is para 11's "should not have to seek out the information". A design at three taps
is not automatically non-compliant, but it forfeits the safe harbour of the worked example, and the
controller then carries the argument.

**Does a link suffice, or must the text be present? — para 33.** A link suffices, and WP260 says so
in terms, because the operative verb "provide" is satisfied by actively directing:

> 33. Both Articles 13 and 14 refer to the obligation on the data controller to "provide the data
> subject with all of the following information..." The operative word here is "provide". This means
> that the data controller must take active steps to furnish the information in question to the data
> subject or to actively direct the data subject to the location of it (e.g. by way of a direct link,
> use of a QR code, etc.). The data subject must not have to actively search for information covered
> by these articles amongst other information, such as terms and conditions of use of a website or
> app. The example at paragraph 11 illustrates this point. As noted above at paragraph 17, WP29
> recommends that the entirety of the information addressed to data subjects should also be
> available to them in one single place or one complete document (e.g. whether in a digital form on a
> website or in paper format) which can be easily accessed should they wish to consult the entirety
> of the information.

Two constraints ride along with the link. First, the notice must be **differentiated from the terms
of use** — para 8: "This information should be clearly differentiated from other non-privacy related
information such as contractual provisions or general terms of use." Second, notwithstanding any
layering, the **whole notice must exist in one place**. Para 17:

> However, the entirety of the information addressed to data subjects should also be available to
> them in one single place or one complete document (whether in a digital or paper format) which can
> be easily accessed by a data subject should they wish to consult the entirety of the information
> addressed to them.

**Layered notices — paras 35 and 36.** Layering is recommended, with an explicit warning against
faking it with nested pages:

> 35. In the digital context, in light of the volume of information which is required to be provided
> to the data subject, a layered approach may be followed by data controllers where they opt to use a
> combination of methods to ensure transparency. WP29 recommends in particular that layered privacy
> statements/ notices should be used to link to the various categories of information which must be
> provided to the data subject, rather than displaying all such information in a single notice on the
> screen, in order to avoid information fatigue. Layered privacy statements/ notices can help resolve
> the tension between completeness and understanding, notably by allowing users to navigate directly
> to the section of the statement/ notice that they wish to read. It should be noted that layered
> privacy statements/ notices are not merely nested pages that require several clicks to get to the
> relevant information. The design and layout of the first layer of the privacy statement/ notice
> should be such that the data subject has a clear overview of the information available to them on
> the processing of their personal data and where/ how they can find that detailed information within
> the layers of the privacy statement/ notice. It is also important that the information contained
> within the different layers of a layered notice is consistent and that the layers do not provide
> conflicting information.

What belongs in the first layer — para 36:

> 36. As regards the content of the first modality used by a controller to inform data subjects in a
> layered approach (in other words the primary way in which the controller first engages with a data
> subject), or the content of the first layer of a layered privacy statement/ notice, WP29 recommends
> that the first layer/ modality should include the details of the purposes of processing, the
> identity of controller and a description of the data subject's rights. (Furthermore this information
> should be directly brought to the attention of a data subject at the time of collection of the
> personal data e.g. displayed as a data subject fills in an online form.) The importance of providing
> this information upfront arises in particular from Recital 39. While controllers must be able to
> demonstrate accountability as to what further information they decide to prioritise, WP29's position
> is that, in line with the fairness principle, in addition to the information detailed above in this
> paragraph, the first layer/ modality should also contain information on the processing which has the
> most impact on the data subject and processing which could surprise them. Therefore, the data
> subject should be able to understand from information contained in the first layer/ modality what
> the consequences of the processing in question will be for the data subject (see also above at
> paragraph 10).

For this app, para 36's "processing which could surprise them" is not a throwaway: **mandatory
CloudKit sync with no opt-out, of a named infant's health data and photographs, is exactly the kind
of fact that belongs in the first layer**, not buried in a recipients paragraph.

### 1.3 Before download vs in-app — answered above, corroborated by WP202

WP260 para 11's example settles it: "the necessary information **should also be made available from
an online store prior to download**", and in-app it "**still needs to be easily accessible**". Both,
not either.

This is corroborated by an earlier, more app-specific WP29 document: **Opinion 02/2013 on apps on
smart devices, WP 202** (`00461/13/EN`), retrieved from
<https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2013/wp202_en.pdf>,
fetched **2026-08-20**. Section 3.7.2 "The form of the information":

> The essential scope of information about data processing must be available to the users before app
> installation, via the app store. Secondly, the relevant information about the data processing must
> also be accessible from within the app, after installation.

and:

> It is unacceptable that the users be placed in a position where they would have to search the web
> for information on the app data processing policies instead of being informed directly by the app
> developer or other data controller.

WP202 also anticipated the layered approach for small screens:

> Of course, there are limitations to the amount of information that can be presented on a small
> screen, but this is no excuse to not adequately inform end users. [...] The Working Party sees
> benefits in the use of layered notices as detailed by WP29 in Opinion 10/2004, where the initial
> notice to the user contains the minimum information required by the EU legal framework, and further
> information is available through links to the whole privacy policy. The information should be
> presented directly on screen, easily accessible and highly visible.

**Status caveat, important:** WP202 predates the GDPR (it construes Directive 95/46/EC and the
ePrivacy Directive), and **it is NOT in the EDPB's Endorsement 1/2018 list** — I checked; the
endorsement enumerates 16 documents and WP 202 is not among them (0 occurrences of "202"). Treat
WP202 as persuasive historical context, not as endorsed GDPR guidance. WP260 carries the point on its
own, so nothing here depends on WP202.

### 1.4 Offline availability — NOT FOUND

**NOT FOUND.** WP260 says nothing about the notice being available without a network connection.
Verified by exhaustive term search over the extracted text: `offline` — 1 occurrence, and it is
para 38's "offline/ non-digital context (i.e. a real-world environment such as person-to-person
engagement or telephone communications)", i.e. a channel distinction, not connectivity. `network` —
1 occurrence, para 691's "cameras, network" in a list of data-capturing devices. `internet
connection` — 0 occurrences. The GDPR itself: `offline` — **0 occurrences**.

So there is **no primary-source requirement that the notice render without connectivity.** Reasoning
(mine, not the sources'): a remote-only notice sits uneasily with para 11's "should not have to seek
out the information" if the app is usable offline while the notice is not, but no source says so, and
I will not claim it. Bundling the notice text in the app binary is cheap and forecloses the argument.

---

## 2. Language

### 2.1 The GDPR itself imposes no natural-language requirement

Term search over the OJ text: `language` appears **7 times** in the entire Regulation. Every
occurrence is either "clear and plain language" (Art. 12(1), Art. 7(2), Art. 34(2), Recitals 39, 42,
58) or Recital 23's targeting test. **There is no provision requiring any particular national
language.** "Clear and plain" is a register requirement, not a language requirement.

The one place the GDPR discusses choice of language is **Recital 23**, and it does so as an *evidence*
question — whether a controller is targeting the Union — not as a notice-form duty:

> Whereas the mere accessibility of the controller's, processor's or an intermediary's website in the
> Union, of an email address or of other contact details, or the use of a language generally used in
> the third country where the controller is established, is insufficient to ascertain such intention,
> factors such as the use of a language or a currency generally used in one or more Member States with
> the possibility of ordering goods and services in that other language, or the mentioning of
> customers or users who are in the Union, may make it apparent that the controller envisages offering
> goods or services to data subjects in the Union.

Recital 23 is about Art. 3(2) territorial scope, so it is not directly in point for a CZ-established
controller (who is caught by Art. 3(1) establishment regardless of language). It matters here only
because it shows the drafters' consistent instinct: **language tracks who you are addressing, not
where you are sitting.**

### 2.2 WP260 on language and translation — the test is targeting

WP260 para 13 (same URL and fetch date as §1.2), final parenthesis:

> Where the information is translated into one or more other languages, the data controller should
> ensure that all the translations are accurate and that the phraseology and syntax makes sense in the
> second language(s) so that the translated text does not have to be deciphered or re-interpreted. (A
> translation in one or more other languages should be provided where the controller targets data
> subjects speaking those languages.)

The word "targets" carries **footnote 15**, which supplies the indicia:

> 15 For example, where the controller operates a website in the language in question and/or offers
> specific country options and/or facilitates the payment for goods or services in the currency of a
> particular member state then these may be indicative of a data controller targeting data subjects of
> a particular member state.

This is the decisive finding for question 2. **The obligation to translate is triggered by targeting
speakers of a language, not by the controller's place of establishment.** An English-only app, with no
Czech localisation, no CZ country option, and no CZK pricing, meets none of footnote 15's indicia for
Czech. On WP260's test, an English-only notice is the correct notice.

Note the corollary, which is a live risk rather than a comfort: **if the app is ever localised to
Czech, or offered with CZK pricing, or marketed to Czech users, footnote 15 is satisfied and a Czech
translation becomes required.** The App Store's per-storefront availability and localisation settings
are therefore compliance-relevant configuration, not just marketing.

### 2.3 Czech law — is there a Czech-language requirement?

#### zákon č. 110/2019 Sb. — NOT FOUND

**NOT FOUND.** The Czech GDPR adaptation act imposes no language requirement on a controller's
information notice to data subjects. Searched for `jazyk`, `český jazyk`, `česky`, `překlad` across the
act; the general Art. 13 methodology contains no language rule. The act adapts matters such as the
child-consent age and supervisory procedure, not notice form.

#### ÚOOÚ guidance — FOUND, but narrower than the framing assumes

This is where my initial expectation was **wrong and had to be corrected**, so it is recorded carefully.
ÚOOÚ *has* published a language requirement and *has* fined on it — but the trigger is the **language the
service is offered in**, not the controller's establishment.

**ÚOOÚ cookies FAQ**, <https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies>, fetched
**2026-08-20** (HTTP 200), verbatim:

> „Tuto informační povinnost je potřeba plnit přístupným a srozumitelným způsobem za použití jednoduchých
> jazykových prostředků. Požadavek přístupného a srozumitelného způsobu tedy nelze považovat za splněný,
> pokud se k informacím musí návštěvník dostávat složitě „proklikáváním" přes řadu stránek, **nebo pokud
> na webových stránkách v českém jazyce (tedy určených pro česky mluvící návštěvníky) není informace o
> zpracování osobních údajů prostřednictvím cookies uveřejněna rovněž v českém jazyce**."

English gloss: the accessible-and-intelligible requirement is not met if the visitor must reach the
information by laborious click-through across many pages, **or if, on a website in the Czech language
(i.e. one intended for Czech-speaking visitors), the cookies processing information is not also
published in Czech**.

Note the parenthesis does the work: `„(tedy určených pro česky mluvící návštěvníky)"` — "i.e. intended
for Czech-speaking visitors". **This is a targeting test, identical in structure to WP260 footnote 15.**
It also independently corroborates the click-through point from WP260 paras 11 and 33.

**ÚOOÚ Annual Report 2023**, p. 18, <https://uoou.gov.cz/media/vyrocni-zpravy/vz2023-elektronicka-verze.pdf>,
fetched **2026-08-20** — confirming this is enforced, not merely advisory:

> „Případy, které Úřad **trestal**, zahrnovaly jednak situace, kdy správce některý z cookies souborů
> neuvedl vůbec, informace o cookies souborech nebyly úplné, jak vyžaduje čl. 13 obecného nařízení, **nebo
> nebyly v českém jazyce, což bylo v rozporu s požadavky čl. 12 odst. 1 obecného nařízení**. V jednom
> případě byly informace o 58 cookies souborech uvedeny v anglickém jazyce."

Gloss: cases the Office **penalised** included information not being in Czech, contrary to **Art. 12(1)
GDPR**. In one case, information on 58 cookies was given in English.

Same report, p. 20, states the principle in general terms:

> „**4) Pokud web cílí i na zahraniční klientelu, je nutné plnit informační povinnost i v příslušném
> jazyce.** Pokud nabízí webová stránka jazykovou mutaci, například z toho důvodu, že cílí na zahraniční
> klientelu, je nutné uvést všechny potřebné informace týkající se zpracování osobních údajů i v
> příslušném jazyce."

Gloss: if a website also targets foreign clientele, the information obligation must be met **in the
relevant language** too; if the site offers a language version because it targets foreign clientele, all
necessary information must be given in that language as well.

Also relevant, **ÚOOÚ press release, 30 June 2022**,
<https://uoou.gov.cz/media-publikace/tiskove-zpravy/cookies-listy-vykazuji-radu-nedostatku-1>, fetched
**2026-08-20**, lists among the main deficiencies found in inspections:

> „**Informace o cookies v cizím jazyce**" ("cookie information in a foreign language")

**What remains NOT FOUND:** no ÚOOÚ document states that a Czech-**established** controller must publish
its Art. 13 notice in Czech. Every instance located is (a) **cookies-specific**, and (b) **conditional on
the language the service is offered in / whom it targets**.

**Assessment (my reasoning, not quoted law):** ÚOOÚ's test cuts *in this app's favour*. The FAQ triggers
on „webových stránkách v českém jazyce"; the report triggers on offering a `jazyková mutace`. An
English-only UI with an English-only notice is internally consistent — there is no Czech-language surface
whose notice is missing. The penalised pattern was the inverse: Czech-facing sites with English cookie
information. Two risks to flag honestly: the rule is grounded in **Art. 12(1) GDPR**, not Czech statute,
so it is not defeated by the 110/2019 Sb. negative and it travels with the processing regardless; and
**if the app ever ships Czech localisation, the notice must follow into Czech** — that is squarely within
the quoted rule and is the single most actionable point in this section. Extending the cookies rule to a
non-cookies app notice is my inference from ÚOOÚ's generic Art. 12 reasoning; ÚOOÚ has not said it.

#### zákon č. 634/1992 Sb. o ochraně spotřebitele — FOUND, but it does not reach a privacy notice

Source: <https://www.zakonyprolidi.cz/cs/1992-634>, fetched **2026-08-20**. **Labelling note:**
zakonyprolidi.cz is a well-regarded **private** publisher, not the official collection; the official
source is e-sbírka / sbirka.gov.cz. The provision below was located in the consolidated text there.

There **is** a Czech-language provision, and it is **§ 11(1)** — the only occurrence of the phrase
`v českém jazyce` in the entire Act:

> „**§ 11** (1) Prodávající musí zajistit, aby informace uvedené v § 9 až 10a, 12, 13, § 16 odst. 1 a 3
> a § 19 a v § 1811 odst. 2 písm. b) a § 1820 odst. 1 písm. a) občanského zákoníku, **jsou-li poskytovány
> písemně, byly poskytnuty v českém jazyce**."

Gloss: the seller must ensure that the information specified in §§ 9–10a, 12, 13, § 16(1) and (3), § 19,
and in § 1811(2)(b) and § 1820(1)(a) of the Civil Code, **if provided in writing, is provided in the Czech
language**.

**The decisive feature is that § 11(1) is a closed enumeration, and a data-protection notice is not in
it.** What the cross-referenced provisions cover:

| Provision | Subject-matter |
|---|---|
| § 9 | instructions for use and maintenance, and hazards from misuse — "písemný návod" |
| § 10–10a | product labelling (materials, weight, dimensions) |
| § 12, § 13 | price information; conditions for warranty claims |
| § 16(1),(3) | receipts / proof of purchase |
| § 19 | complaint-handling procedure |
| Civil Code § 1811(2)(b), § 1820(1)(a) | pre-contractual identity/characteristics disclosures |

So the language duty attaches to **product instructions, labelling, pricing, receipts and complaints
handling** — consumer-transaction documents. **NOT FOUND:** no provision of 634/1992 Sb. imposes a Czech
-language requirement on a privacy notice or on GDPR Art. 13 information. The GDPR is not among the
cross-referenced instruments, and Art. 12(1) has its own (language-neutral) standard.

**MY REASONING (not quoted law) — would it reach an English-only app not marketed in CZ?**

Three independent reasons to think not, each of which I flag as inference:

1. **Subject-matter mismatch.** Even for a seller squarely within the Act, § 11(1)'s list does not
   include a privacy notice. The Art. 13 notice is not a `návod`, a label, a price, a receipt, or a
   complaints procedure.
2. **Territorial/market reality.** Consumer-protection duties attach to selling or offering to consumers
   on the Czech market. An app not offered on the Czech storefront and not marketed in CZ is not being
   offered to Czech consumers. I did **not** locate and quote the Act's scope provision in a form I am
   willing to rely on, so treat this limb as **UNVERIFIED** rather than settled.
3. **Trader status.** Whether a solo natural person distributing a **free** app is a `prodávající`
   within the Act at all is doubtful — the Act is built around sale of `výrobky` and paid `služby`. I did
   not obtain a clean quote of the § 2 definitions, so this is likewise **UNVERIFIED**.

Bottom line: consumer law is a **weaker** hook than the ÚOOÚ/Art. 12(1) route in §2.3, and on the
enumeration point it clearly does not reach a privacy notice. But limbs 2 and 3 rest on my reading rather
than on quoted scope and definition provisions, and that gap is recorded in `## Gaps`.

#### Czech versioning requirement — NOT FOUND

**NOT FOUND.** No Czech provision located requires a privacy notice to carry a version number or date, or
to retain superseded versions. Consistent with the GDPR-level negative in §3.1.

---

## 3. Versioning the notice

**Headline: no primary source requires a version identifier or a date on the notice. But the consent
record must retain a copy of the text that was actually shown.** Those two findings pull in different
directions and the practical resolution is versioning — by inference, not by mandate.

### 3.1 The negative results, stated precisely

| Source | Term searched | Result |
|---|---|---|
| GDPR (OJ L 119/1) | `version` | **0 occurrences** in the entire Regulation |
| WP260 rev.01 | `version` | **0 occurrences** |
| WP260 rev.01 | `previous version`, `archiv*` | `archiv*` hits are all the Art. 89 research/archiving exemption; **no notice-archiving requirement** |
| EDPB 05/2020 | `version` | 6 occurrences, **all** referring to the guidelines' own version history ("Version 1.1", "Version history") or para 1090's "standard versions" of eyewear — **never** a notice version identifier |

So: **NOT FOUND** — no requirement to put a version number or a "last updated" date on an Art. 13
notice, and **NOT FOUND** — no requirement to publish or retain an archive of superseded notices.

### 3.2 Art. 5(2) and Art. 7(1) — the demonstrability hooks, verbatim

**Article 5(2):**

> 2. The controller shall be responsible for, and be able to demonstrate compliance with, paragraph 1
> ('accountability').

**Article 7(1):**

> 1. Where processing is based on consent, the controller shall be able to demonstrate that the data
> subject has consented to processing of his or her personal data.

Neither says how. **Article 24(1)** likewise speaks only of "appropriate technical and organisational
measures to ensure and to be able to demonstrate that processing is performed in accordance with this
Regulation."

### 3.3 EDPB Guidelines 05/2020 on consent — the closest thing to a versioning rule

Source: <https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf>,
fetched **2026-08-20**. Cover: "Guidelines 05/2020 on consent under Regulation 2016/679", "Version 1.1",
"Adopted on 4 May 2020" (version history: v1.0 adopted 4 May 2020; v1.1, 13 May 2020, "Formatting
corrections"). Note the older `/sites/default/files/files/file1/...` path for this PDF now **404s** —
cite the `/system/files/...` path.

**Para 108** is the operative passage, and it does *not* say "version" — it says "a copy of the
information":

> 108. For instance, the controller may keep a record of consent statements received, so he can show
> how consent was obtained, when consent was obtained and the information provided to the data subject
> at the time shall be demonstrable. The controller shall also be able to show that the data subject
> was informed and the controller´s workflow met all relevant criteria for a valid consent. The
> rationale behind this obligation in the GDPR is that controllers must be accountable with regard to
> obtaining valid consent from data subjects and the consent mechanisms they have put in place. For
> example, in an online context, a controller could retain information on the session in which consent
> was expressed, together with documentation of the consent workflow at the time of the session, and a
> copy of the information that was presented to the data subject at that time. It would not be
> sufficient to merely refer to a correct configuration of the respective website.

Three things to extract. (1) "**the information provided to the data subject at the time shall be
demonstrable**" — mandatory phrasing ("shall"). (2) "**a copy of the information that was presented to
the data subject at that time**" — framed as an example ("could retain"), but it is the only worked
illustration given. (3) "**It would not be sufficient to merely refer to a correct configuration of the
respective website**" — a pointer to today's live notice is expressly inadequate.

Retention limit, **para 107**:

> After the processing activity ends, proof of consent should be kept no longer then strictly
> necessary for compliance with a legal obligation or for the establishment, exercise or defence of
> legal claims, in accordance with Article 17(3)(b) and (e).

("no longer then" is the document's own typo, preserved.)

When consent must be re-obtained, **para 110**, and the refresh best practice, **para 111**:

> 110. There is no specific time limit in the GDPR for how long consent will last. How long consent
> lasts will depend on the context, the scope of the original consent and the expectations of the data
> subject. If the processing operations change or evolve considerably then the original consent is no
> longer valid. If this is the case, then new consent needs to be obtained.

> 111. The EDPB recommends as a best practice that consent should be refreshed at appropriate
> intervals. Providing all the information again helps to ensure the data subject remains well informed
> about how their data is being used and how to exercise their rights.

Note the trigger in para 110 is **the processing changing**, not the notice's wording changing. A
re-worded notice describing identical processing does not invalidate consent. **NOT FOUND**: no source
says a wording-only change requires re-consent.

### 3.4 WP260 on changes to the notice — active notification required, publication is not enough

WP260 **para 29** (same URL/date as §1.2). This is emphatic and directly contradicts the common
"we may update this policy, please check back" formula:

> 29. Being accountable as regards transparency applies not only at the point of collection of
> personal data but throughout the processing life cycle, irrespective of the information or
> communication being conveyed. This is the case, for example, when changing the contents of existing
> privacy statements/ notices. The controller should adhere to the same principles when communicating
> both the initial privacy statement/ notice and any subsequent substantive or material changes to
> this statement/ notice. Factors which controllers should consider in assessing what is a substantive
> or material change include the impact on data subjects (including their ability to exercise their
> rights), and how unexpected/ surprising the change would be to data subjects. Changes to a privacy
> statement/ notice that should always be communicated to data subjects include inter alia: a change
> in processing purpose; a change to the identity of the controller; or a change as to how data
> subjects can exercise their rights in relation to the processing. Conversely, an example of changes
> to a privacy statement/ notice which are not considered by WP29 to be substantive or material include
> corrections of misspellings, or stylistic/ grammatical flaws. Since most existing customers or users
> will only glance over communications of changes to privacy statements/ notices, the controller should
> take all measures necessary to ensure that these changes are communicated in such a way that ensures
> that most recipients will actually notice them. This means, for example, that a notification of
> changes should always be communicated by way of an appropriate modality (e.g. email, hard copy
> letter, pop-up on a webpage or other modality which will effectively bring the changes to the
> attention of the data subject) specifically devoted to those changes (e.g. not together with direct
> marketing content), with such a communication meeting the Article 12 requirements of being concise,
> transparent, intelligible, easily accessible and using clear and plain language. References in the
> privacy statement/ notice to the effect that the data subject should regularly check the privacy
> statement/notice for changes or updates are considered not only insufficient but also unfair in the
> context of Article 5.1(a). Further guidance in relation to the timing for notification of changes to
> data subjects is considered below at paragraph 30 to 31.

**So the answer to "re-consent, notification, or merely publication" is: active, dedicated
notification for substantive or material changes — and publication alone is expressly condemned.**
Re-consent is not required by WP260 as such; it becomes required only via EDPB 05/2020 para 110, when
the *processing* changes considerably.

Timing, **para 30**:

> 30. The GDPR is silent on the timing requirements (and indeed the methods) that apply for
> notifications of changes to information that has previously been provided to a data subject under
> Article 13 or 14 [...] If the change to the information is indicative of a fundamental change to the
> nature of the processing (e.g. enlargement of the categories of recipients or introduction of
> transfers to a third country) or a change which may not be fundamental in terms of the processing
> operation but which may be relevant to and impact upon the data subject, then that information should
> be provided to the data subject well in advance of the change actually taking effect and the method
> used to bring the changes to the data subject's attention should be explicit and effective.

And **para 31**, which matters for question 4 as well:

> However, compliance with transparency requirements does not "whitewash" a situation where the changes
> to the processing are so significant that the processing becomes completely different in nature to
> what it was before. WP29 emphasises that all of the other rules in the GDPR, including those relating
> to incompatible further processing, continue to apply irrespective of compliance with the transparency
> obligations.

### 3.5 What this means in practice (my reasoning, not the sources')

Nothing *requires* a version identifier. But para 108 requires the exact information text shown at
consent time to be demonstrable, and forbids relying on the current configuration. For an app that
takes Art. 9(2)(a) explicit consent on first run, the cheapest way to satisfy that is: give each notice
revision an immutable identifier, store the revision text in the app bundle (it ships with the binary
anyway), and record the identifier alongside the consent timestamp on-device. A dated "in effect from"
line on the notice is not mandated but is near-free and makes para 29 change-notification auditable.

**A structural caveat specific to this app:** the developer never receives the data, and the consent
record lives on the mother's device. So the Art. 7(1) "be able to demonstrate" duty is discharged
against records the developer cannot read and cannot produce to ÚOOÚ. That tension is **UNSETTLED** and
is downstream of the unresolved controllership question; no source consulted here addresses
demonstrating consent when the controller holds no copy of the record.

---

## 4. Must the notice disclose the controller's own Art. 28 compliance gap?

**Answer: no source requires it, and the structure of the Regulation points the other way. Do not put
the legal characterisation in the notice. Do disclose the underlying facts.**

### 4.1 Art. 13(1) and (2) — the complete list, verbatim

> 1. Where personal data relating to a data subject are collected from the data subject, the
> controller shall, at the time when personal data are obtained, provide the data subject with all of
> the following information:
>
> (a) the identity and the contact details of the controller and, where applicable, of the controller's
> representative;
>
> (b) the contact details of the data protection officer, where applicable;
>
> (c) the purposes of the processing for which the personal data are intended as well as the legal
> basis for the processing;
>
> (d) where the processing is based on point (f) of Article 6(1), the legitimate interests pursued by
> the controller or by a third party;
>
> (e) the recipients or categories of recipients of the personal data, if any;
>
> (f) where applicable, the fact that the controller intends to transfer personal data to a third
> country or international organisation and the existence or absence of an adequacy decision by the
> Commission, or in the case of transfers referred to in Article 46 or 47, or the second subparagraph
> of Article 49(1), reference to the appropriate or suitable safeguards and the means by which to
> obtain a copy of them or where they have been made available.
>
> 2. In addition to the information referred to in paragraph 1, the controller shall, at the time when
> personal data are obtained, provide the data subject with the following further information necessary
> to ensure fair and transparent processing:
>
> (a) the period for which the personal data will be stored, or if that is not possible, the criteria
> used to determine that period;
>
> (b) the existence of the right to request from the controller access to and rectification or erasure
> of personal data or restriction of processing concerning the data subject or to object to processing
> as well as the right to data portability;
>
> (c) where the processing is based on point (a) of Article 6(1) or point (a) of Article 9(2), the
> existence of the right to withdraw consent at any time, without affecting the lawfulness of processing
> based on consent before its withdrawal;
>
> (d) the right to lodge a complaint with a supervisory authority;
>
> (e) whether the provision of personal data is a statutory or contractual requirement, or a requirement
> necessary to enter into a contract, as well as whether the data subject is obliged to provide the
> personal data and of the possible consequences of failure to provide such data;
>
> (f) the existence of automated decision-making, including profiling, referred to in Article 22(1) and
> (4) and, at least in those cases, meaningful information about the logic involved, as well as the
> significance and the envisaged consequences of such processing for the data subject.

**Walking the list against an Art. 28(3) deficiency:** none of (1)(a)–(f) or (2)(a)–(f) reaches the
adequacy of the controller–processor contract. The nearest neighbours, and why each falls short:

| Subpara | Reaches the Art. 28 gap? | Why |
|---|---|---|
| 13(1)(e) recipients | **Partly — the fact, not the defect** | Requires disclosing Apple as recipient / category of recipient. Says nothing about the quality of the contract with that recipient. |
| 13(1)(f) third-country transfers | **Partly — the mechanism, not the defect** | Requires the transfer mechanism and "the means by which to obtain a copy" of the safeguards. This is the one subparagraph that requires disclosing something contractual, and it is about Art. 46/47 transfer safeguards, **not** Art. 28(3) processor terms. |
| 13(2)(a) retention | **Partly — the period, not the cause** | "kept until you delete it; the developer holds no copy" is the disclosure. That Art. 28(3)(g) provides no deletion-on-termination guarantee is the *reason* the period is indefinite, but (2)(a) asks for the period/criteria, not the reason. |
| 13(2)(d) right to complain | No | Requires naming the right, not supplying grounds. |

Note **13(1)(f)** is genuinely engaged here and should not be conflated with the Art. 28 question: it
requires stating the transfer mechanism and how to get a copy of the safeguards. Given §5 below (no
DPF certification; ADPLA names only "Model Contract Clauses" available "upon request"), 13(1)(f)
compliance is itself awkward — the developer must describe a mechanism whose text he has not been
given. That is a **separate** finding from the Art. 28(3) gap and is arguably the more exposed one,
because unlike Art. 28 it *does* map onto an express Art. 13 disclosure duty.

### 4.2 Is there guidance requiring self-disclosure of non-compliance? — NOT FOUND

**NOT FOUND**, and the expectation in the brief is confirmed rather than refuted.

Searches over WP260 rev.01: `non-compliance` — **0 occurrences**. `infringement` — 1 occurrence, and
it is in the Annex table describing Art. 77's right to complain to a supervisory authority "in the
Member State [...] of an alleged infringement of the GDPR", i.e. the data subject's remedy, not the
controller's confession. `Article 28` — **0 occurrences**; WP260 does not discuss processor contracts
at all. `processor` appears only incidentally.

No EDPB or WP29 instrument located in this research requires a controller to tell data subjects that
its own processing arrangements fall short of the GDPR. The GDPR's only mandatory
tell-the-data-subject-bad-news duty is **Art. 34** personal data breach communication, which is a
security-incident duty, triggered by a breach as defined in Art. 4(12) — not by a contractual
deficiency.

**The nearest passages that do exist**, and each stops short:

WP260 **para 10** — Art. 5(1)(a) requires *more* than the bare Art. 13 enumeration, but what it
requires is consequences, not confessions:

> In particular, for complex, technical or unexpected data processing, WP29's position is that, as well
> as providing the prescribed information under Articles 13 and 14 (dealt with later in these
> guidelines), controllers should also separately spell out in unambiguous language what the most
> important consequences of the processing will be: in other words, what kind of effect will the
> specific processing described in a privacy statement/ notice actually have on a data subject? In
> accordance with the principle of accountability and in line with Recital 39, data controllers should
> assess whether there are particular risks for natural persons involved in this type of processing
> which should be brought to the attention of data subjects.

This is the strongest "more than the list" statement in the guidance, and it is the one that does real
work here — see §4.4.

WP260 **para 42** — voluntary disclosure of internal compliance artefacts is encouraged but expressly
optional:

> data controllers may consider publication of the DPIA (or part of it), as a way of fostering trust in
> the processing operations and demonstrating transparency and accountability, although such publication
> is not obligatory.

WP260 **para 68** — the one place WP260 requires disclosing something adverse to the data subject, and
it concerns a *statutory* restriction, not the controller's own breach:

> Consistent with this, and in line with principle of fairness, the data controller should also inform
> data subjects that they are relying on (or will rely on, in the event of a particular data subject
> right being exercised) such a national legislative restriction to the exercise of data subject rights,
> or to the transparency obligation, unless doing so would be prejudicial to the purpose of the
> legislative restriction. As such, transparency requires data controllers to provide adequate upfront
> information to data subjects about their rights and any particular caveats to those rights which the
> controller may seek to rely on, so that the data subject is not taken by surprise at a purported
> restriction of a particular right when they later attempt to exercise it against the controller.

Para 68's structure is instructive by analogy: the duty is to disclose **caveats to the data subject's
rights**, "so that the data subject is not taken by surprise" when exercising them. Reasoning (mine):
to the extent the Art. 28(3)(g) gap means the developer cannot guarantee erasure propagates out of
Apple's infrastructure, that *is* a practical caveat on the Art. 17 right — and para 68's logic would
favour disclosing the **practical limitation**, while still not requiring the legal
characterisation. This is inference from an analogous passage, not a holding.

### 4.3 Internal accountability record vs user-facing transparency — the distinction, sourced

This is what the decision turns on, and the cleanest authority is the Regulation's own text: the
accountability instruments are addressed **to the supervisory authority**, the transparency
instruments **to the data subject**.

**Article 30(3) and (4)** — the record of processing activities:

> 3. The records referred to in paragraphs 1 and 2 shall be in writing, including in electronic form.
>
> 4. The controller or the processor and, where applicable, the controller's or the processor's
> representative, shall make the record available to the supervisory authority on request.

**There is no counterpart obligation to make the Art. 30 record available to data subjects.** The
audience is named, and it is the regulator. By contrast Arts. 12–14 are addressed throughout to "the
data subject". Art. 24(1) speaks of measures "to ensure and to be able to demonstrate that processing
is performed in accordance with this Regulation" without naming any audience at all.

The contrast is sharpened by **Article 26(2)**, which shows that when the drafters *did* want an
internal arrangement surfaced to data subjects, they said so expressly:

> 2. The arrangement referred to in paragraph 1 shall duly reflect the respective roles and
> relationships of the joint controllers vis-à-vis the data subjects. The essence of the arrangement
> shall be made available to the data subject.

**EDPB Guidelines 07/2020 on the concepts of controller and processor**, version 2.1 (adopted 7 July
2021), retrieved from
<https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf>,
fetched **2026-08-20**, makes the audience distinction explicit at **para 181** — and note it
enumerates Art. 30(4) as the "upon request" model precisely to contrast it:

> 181. The way such information shall be made available to the data subject is not specified. Contrary
> to other provisions of the GDPR (such as Article 30(4) for the record of processing or Article 40(11)
> for the register of approved codes of conduct), Article 26 does not indicate that the availability
> should be "upon request" nor "publicly available by way of appropriate means". Therefore, it is up to
> the joint controllers to decide the most effective way to make the essence of the arrangement
> available to the data subjects [...]

And **para 6**, on what accountability is:

> 6. The GDPR, in Article 5(2), explicitly introduces the accountability principle which means that:
> − the controller shall be responsible for the compliance with the principles set out in Article 5(1)
> GDPR; and that − the controller shall be able to demonstrate compliance with the principles set out in
> Article 5(1) GDPR.

**Para 9** names the direction of accountability — towards supervisory authorities:

> Both controllers and processors can be fined in case of non-compliance with the obligations of the
> GDPR that are relevant to them and both are directly accountable towards supervisory authorities by
> virtue of the obligations to maintain and provide appropriate documentation upon request, co-operate
> in case of an investigation and abide by administrative orders.

**Conclusion on the distinction:** the Art. 28(3) gap is an accountability and lawfulness problem,
owed to ÚOOÚ and documented internally. It is not a transparency problem owed to the data subject.
Disclosing it in the notice is neither required nor, on WP260 para 8's "clearly differentiated" and
para 34's concision logic, obviously helpful — it would displace information the user actually needs.

### 4.4 What the notice must say anyway — the facts, not the characterisation

Reasoning (mine, grounded in the quoted passages, not a holding):

- **Required by 13(1)(e)**: Apple as recipient/category of recipient.
- **Required by 13(1)(f)**: the third-country transfer and its mechanism — engaged and awkward, see §5.
- **Required by 13(2)(a)**: the retention position as already settled.
- **Required by WP260 para 10 + para 36**: the *consequences* — that sync is mandatory with no toggle,
  that data goes to the mother's iCloud, and, candidly, that deletion from the device cannot be
  guaranteed to purge every copy from Apple's infrastructure. This last is the practical face of the
  Art. 28(3)(g) gap, and it is disclosable as a **fact about what happens to the data**, which is
  squarely within para 10's "most important consequences" and para 68's "caveats to those rights".
- **Not required, and better omitted**: the sentence "Apple's ADPLA does not satisfy Art. 28(3)(d) and
  (g)". That is a legal conclusion about the developer's compliance posture. It belongs in the internal
  accountability file and, if the developer chooses, in his ÚOOÚ enquiry.

### 4.5 A finding that cuts against the developer, recorded because it is adverse

Guidelines 07/2020 **para 110** is directly on point for a solo developer facing Apple's non-negotiable
terms, and it is unhelpful to him:

> 110. The fact that the contract and its detailed terms of business are prepared by the service
> provider rather than by the controller is not in itself problematic and is not in itself a sufficient
> basis to conclude that the service provider should be considered as a controller. Also, the imbalance
> in the contractual power of a small data controller with respect to big service providers should not
> be considered as a justification for the controller to accept clauses and terms of contracts which are
> not in compliance with data protection law, nor can it discharge the controller from its data
> protection obligations. The controller must evaluate the terms and in so far as it freely accepts them
> and makes use of the service, it has also accepted full responsibility for compliance with the GDPR.

And **para 103**, that an incomplete Art. 28(3) contract is itself an infringement:

> 103. Since the Regulation establishes a clear obligation to enter into a written contract, where no
> other relevant legal act is in force, the absence thereof is an infringement of the GDPR. Both the
> controller and processor are responsible for ensuring that there is a contract or other legal act to
> govern the processing. [...] The absence of such update, in order to bring a previously existing
> contract in line with the requirements of the GDPR, constitutes an infringement of Article 28(3).

Preceded by **para 102**'s remedy, which is the one avenue that exists:

> all the minimum required content, it must be supplemented with a contract or another legal act that
> includes the missing elements.

**So the honest position is:** "cannot cure it, non-negotiable" is not a defence the EDPB recognises.
The exposure is real and sits with the developer. But it is exposure to ÚOOÚ on Art. 28, **not** a
disclosure duty under Art. 13. Two different problems; conflating them would put a legal admission in
front of users while doing nothing to fix the underlying gap.

---

## 5. EU–US Data Privacy Framework — is Apple certified?

**Settled, and the answer inverts the question: Apple Inc. is NOT on the EU–US DPF participant list at
all.** There is no certification, so there is no status, no effective date, and no HR / non-HR coverage
to report. The prior **UNVERIFIED** flag is resolved to a definite negative.

### 5.1 How the primary source was reached

<https://www.dataprivacyframework.gov/list> serves only a JavaScript shell — its HTML contains no
participant data, which is why a plain page fetch appears empty and must not be read as "no results".
The underlying API host is hardcoded in the site's own bundle
`https://www.dataprivacyframework.gov/assets/index-DSetjnOG.js` as `https://dpfapi.azurewebsites.net/api`.

**Dataset vintage, confirmed from the list's own endpoint** (fetched **2026-08-20**):

```
GET https://dpfapi.azurewebsites.net/api/participants/filemodified
→ Thursday, August 20, 2026 6:00 AM EST
```

i.e. the list as published that same morning — not a stale cache.

**The authoritative artefact used is the official downloadable participant list**, obtained via the
same endpoint the site's own download button calls (fetched **2026-08-20**):

```
POST https://dpfapi.azurewebsites.net/api/downloadfile
body {"FileName":"DataPrivacyFrameworkParticipantsList.xlsx","FileSizeKB":3600,
      "FileType":"xlsx","Id":0,"Guid":"DataPrivacyFrameworkParticipantsList.xlsx"}
→ HTTP 200, 1,453,530 bytes, Microsoft Excel 2007+
```

The workbook's column headers, read directly from `xl/sharedStrings.xml`, are:

```
Public Display Name | Legal Name | Install Date | Usage End Date | Inactive Start Date |
Framework | Status | HR Data | Non-HR Data | Street | City | State | Postal Code |
Covered Entities | Industries | Privacy Policies | Public Link
```

So the list **does** carry exactly the `HR Data` / `Non-HR Data` fields the question asks about. They
simply have no Apple Inc. row to populate.

### 5.2 The negative result, made auditable

Case-insensitive search for `apple` across all 42,398 unique strings in the official workbook returns
**8 matches, none of which is Apple Inc.**:

| String matched | What it is |
|---|---|
| `Berry Appleman & Leiden LLP` | immigration law firm; "Appleman" is a surname |
| `Good Apple` / `Good Apple Publishing, LLC` | advertising/media company, Lakeville CT |
| `SP & Big Apple Inc.` | tourist attractions, Manhattan NY |
| `Appleton` | city name (Appleton, WI) in address fields |
| `3 Apple Hill Dr`, `6 Applewood Common` | street addresses |
| `Luvata Appleton LLC,...` | a covered-entity name |

No entry for Apple Inc., and no Cupertino-based Apple entity. **A separate caution worth recording for
anyone re-running this check:** the site's own search endpoint is unreliable for negatives — a search
for `Apple` returns zero records even though `Berry Appleman & Leiden LLP` and `Good Apple` demonstrably
exist in the data and do match on substring. So a "no results" screenshot from the search box would not
be sound evidence. The full-list enumeration and the official XLSX are what make this negative solid,
and they agree.

### 5.3 Relevance — the DPF is not the transfer mechanism here anyway

Even had Apple been certified, it would not be the operative mechanism, because Apple's own agreement
does not invoke it. **Apple Developer Program License Agreement**, retrieved from
<https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-English.pdf>
(linked from <https://developer.apple.com/terms/>), fetched **2026-08-20**; document code `LYL255`,
dated **August 18, 2026**, 130 pages.

Term counts across the whole agreement: `Data Privacy Framework` — **0**. `Privacy Shield` — **0**.
`Standard Contractual Clauses` — **0**. `Model Contract Clauses` — **1**.

The sole transfer-mechanism clause is **Attachment 4, § 3.6(g)**:

> (g) ensure that where Personal Data, arising in the context of this Agreement, is transferred from the
> EEA or Switzerland it is only to a third country that ensures an adequate level of protection or using
> the Model Contract Clauses/Swiss Transborder Data Flow Agreement which will be provided to You upon
> request if you believe that Personal Data is being transferred.

Two consequences for the Art. 13 notice:

1. **Do not describe Apple as DPF-certified, or the transfer as adequacy-based.** It is not, on both the
   Commerce Department list and Apple's own drafting.
2. **Art. 13(1)(f) is engaged and awkward.** It requires "reference to the appropriate or suitable
   safeguards and the means by which to obtain a copy of them or where they have been made available".
   The ADPLA supplies a mechanism name and a conditional route to a copy — "provided to You upon request
   **if you believe** that Personal Data is being transferred" — but does not annex the clauses. So the
   notice can honestly say: transfers rely on Model Contract Clauses, obtainable from Apple on request.
   Whether that satisfies 13(1)(f)'s "means by which to obtain a copy" when the developer himself has
   not been given the text is **UNSETTLED** and, as noted in §4.1, is arguably a sharper exposure than
   the Art. 28(3) gap because it maps onto an express Art. 13 duty.


---

## Gaps

Every negative and unresolved point, collected. **NOT FOUND** = searched a primary source that would
have said it, and it does not. **UNVERIFIED** = could not obtain or confirm from a primary source.
**UNSETTLED** = sources conflict, or none addresses the question.

### NOT FOUND

| # | Claim searched for | Where searched |
|---|---|---|
| 1 | Notice must be available **without a network connection** | WP260 (`offline` 1 hit = non-digital channel; `network` 1 hit = cameras; `internet connection` 0); GDPR (`offline` 0) |
| 2 | Notice must carry a **version identifier** | GDPR (`version` **0 occurrences**); WP260 (`version` **0**); EDPB 05/2020 (6 hits, all the guidelines' own version history) |
| 3 | Notice must carry a **date / "last updated"** | GDPR; WP260; EDPB 05/2020 — no such requirement |
| 4 | Controller must **retain or publish superseded versions** | WP260 (`archiv*` hits are all the Art. 89 research exemption) |
| 5 | A **wording-only** change to the notice requires re-consent | EDPB 05/2020 para 110 — trigger is processing that "change[s] or evolve[s] considerably" |
| 6 | Controller must **disclose its own GDPR non-compliance** to data subjects | WP260 (`non-compliance` **0**; `Article 28` **0**); EDPB 05/2020; Guidelines 07/2020. Nearest are WP260 paras 10, 42, 68 — none requires self-disclosure |
| 7 | Art. 30 record of processing must be shown to **data subjects** | Art. 30(4) names only "the supervisory authority on request"; Guidelines 07/2020 para 181 confirms the contrast |
| 8 | Any GDPR provision requiring a **particular national language** | GDPR — `language` appears 7 times, all "clear and plain language" or Recital 23 targeting |
| 9 | **zákon č. 110/2019 Sb.** requires a Czech-language notice | searched `jazyk`, `český jazyk`, `česky`, `překlad` |
| 10 | ÚOOÚ requires a Czech-**established** controller to publish in Czech | every ÚOOÚ instance found is cookies-specific and conditional on targeting |
| 11 | **634/1992 Sb.** imposes Czech language on a **privacy notice** | § 11(1) is a closed enumeration; GDPR/privacy notices are not in it |
| 12 | Any Czech **versioning** requirement | 110/2019 Sb.; 634/1992 Sb. |
| 13 | **Apple Inc.** on the EU–US DPF participant list | official XLSX, 42,398 strings, 8 `apple` matches, none Apple Inc. |
| 14 | DPF / Privacy Shield invoked in Apple's ADPLA | 130-page ADPLA: `Data Privacy Framework` 0, `Privacy Shield` 0, `Standard Contractual Clauses` 0 |
| 15 | A **numeric maximum** taps/clicks as a binding rule | WP260 gives "two taps" but explicitly as "**One way** to meet this requirement" |
| 16 | The word **"hunt"** in WP260 | 0 occurrences — actual wording is "seek out" (para 11) and "actively search" (para 33) |

### UNVERIFIED

1. **634/1992 Sb. territorial scope (§ 1).** I did not obtain a quotable scope provision, so the claim
   "does not apply to an app not offered on the Czech market" rests on my reading, not on quoted text.
2. **634/1992 Sb. `prodávající` / `podnikatel` definitions (§ 2).** Not quoted. Whether a solo natural
   person distributing a free app is a trader under the Act is therefore unconfirmed.
3. **Pre-March-2024 wording of the ÚOOÚ cookies FAQ.** Wayback returned 429/503, so the ÚOOÚ position
   cannot be dated earlier than the June 2022 press release.
4. **Third-party discovery of ÚOOÚ material.** `WebSearch` was unavailable/erroring during this research;
   ÚOOÚ coverage rests on site search plus a sitemap crawl, so an unindexed ÚOOÚ document could have been
   missed.
5. **EUR-Lex as the citation host.** The GDPR text here is from the EU Publications Office Cellar
   endpoint because EUR-Lex is behind an AWS WAF challenge. The text self-identifies as OJ L 119/1 and is
   equally official, but it was **not** verified against a rendering fetched from `eur-lex.europa.eu`.
   The original OJ text was used; the consolidated version endpoint 404'd.

### UNSETTLED

1. **Controllership.** Carried forward from prior research and untouched here. Everything in this document
   assumes the developer is a controller with Art. 13 duties; if that is wrong, the analysis reframes.
2. **Demonstrating consent when the controller holds no copy of the record.** Art. 7(1) and EDPB 05/2020
   para 108 assume the controller can produce the record. Here the consent record lives on the mother's
   device and the developer cannot read or produce it. No source consulted addresses this.
3. **Art. 13(1)(f) compliance where the safeguards text has not been supplied.** The ADPLA promises Model
   Contract Clauses "upon request if you believe that Personal Data is being transferred". Whether
   pointing at that satisfies "the means by which to obtain a copy of them" is unresolved — and this is
   arguably a sharper exposure than the Art. 28(3) gap, because unlike Art. 28 it maps onto an express
   Art. 13 duty.
4. **Whether the ÚOOÚ cookies-language rule extends to a non-cookies app notice.** ÚOOÚ's reasoning is
   generic Art. 12(1), which would travel; but every published instance is cookies. Extension is my
   inference.
5. **Offline notice availability.** No source requires it (Gap 1), but no source excuses it either where
   the app itself works offline. Bundling the text is cheap insurance.

---

## Sources

All fetched **2026-08-20**.

**Primary legislation**

- Regulation (EU) 2016/679 (GDPR), OJ L 119/1, 4.5.2016 —
  <https://publications.europa.eu/resource/celex/32016R0679?language=eng>
  (EU Publications Office Cellar; requires an `Accept-Language: eng` header. `eur-lex.europa.eu` returned
  HTTP 202 + an AWS WAF JavaScript challenge for every rendition of CELEX:32016R0679.)
- zákon č. 110/2019 Sb., o zpracování osobních údajů — searched; no language provision.
- zákon č. 634/1992 Sb., o ochraně spotřebitele — <https://www.zakonyprolidi.cz/cs/1992-634>
  (**private publisher**; official source is e-sbírka / sbirka.gov.cz).

**EDPB / WP29 guidance**

- WP29, *Guidelines on transparency under Regulation 2016/679*, **WP260 rev.01**, `17/EN`, adopted
  29 November 2017, as last revised and adopted 11 April 2018 —
  <https://ec.europa.eu/newsroom/article29/redirection/document/51025>
- EDPB, **Endorsement 1/2018** (endorsing WP260 rev.01 at item 2) —
  <https://www.edpb.europa.eu/sites/default/files/files/news/endorsement_of_wp29_documents_en_0.pdf>
- EDPB, *Guidelines 05/2020 on consent under Regulation 2016/679*, Version 1.1, adopted 4 May 2020 —
  <https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf>
  (the older `/sites/default/files/files/file1/...` path for this PDF now **404s**)
- EDPB, *Guidelines 07/2020 on the concepts of controller and processor in the GDPR* —
  <https://www.edpb.europa.eu/system/files/documents/2023-10/EDPB_guidelines_202007_controllerprocessor_final_en.pdf>
- WP29, *Opinion 02/2013 on apps on smart devices*, **WP 202**, `00461/13/EN` —
  <https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2013/wp202_en.pdf>
  (**pre-GDPR and NOT in the EDPB Endorsement 1/2018 list** — persuasive context only)

**ÚOOÚ (Czech DPA)**

- Cookies FAQ — <https://uoou.gov.cz/verejnost/qa-otazky-a-odpovedi/cookies>
- Výroční zpráva 2023 (pp. 18, 20) — <https://uoou.gov.cz/media/vyrocni-zpravy/vz2023-elektronicka-verze.pdf>
- Press release, 30 June 2022 —
  <https://uoou.gov.cz/media-publikace/tiskove-zpravy/cookies-listy-vykazuji-radu-nedostatku-1>
  (note: the `/novinky/vse/...` path for this release **404s**)

**EU–US Data Privacy Framework**

- Participant list (JS shell; no data in HTML) — <https://www.dataprivacyframework.gov/list>
- Site JS bundle, source of the API host — <https://www.dataprivacyframework.gov/assets/index-DSetjnOG.js>
- List vintage — `GET https://dpfapi.azurewebsites.net/api/participants/filemodified`
  → "Thursday, August 20, 2026 6:00 AM EST"
- Official participant list workbook — `POST https://dpfapi.azurewebsites.net/api/downloadfile`
  with `{"FileName":"DataPrivacyFrameworkParticipantsList.xlsx","FileSizeKB":3600,"FileType":"xlsx","Id":0,"Guid":"DataPrivacyFrameworkParticipantsList.xlsx"}`
  → 1,453,530 bytes, 42,398 shared strings

**Apple**

- Apple Developer Program License Agreement, doc `LYL255`, dated 18 August 2026, 130 pp. —
  <https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-English.pdf>
  (linked from <https://developer.apple.com/terms/>)
