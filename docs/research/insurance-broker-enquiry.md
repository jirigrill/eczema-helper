# Insurance broker enquiry pack

Prepared for [issue #771](https://github.com/jirigrill/eczema-helper/issues/771). This is the
material to send to a Czech specialty insurance broker — not a research document, and not an
answer. The research it rests on is
[`professional-indemnity-insurance.md`](professional-indemnity-insurance.md), banked for
[#681](https://github.com/jirigrill/eczema-helper/issues/681) on branch
`research/professional-indemnity-insurance`.

**Not legal, insurance or financial advice.** The letter below is a request for a quote; the
reading rules in §4 are the project's own decision logic, not a broker's opinion.

**Owner-only to send.** A quote needs a named individual's details and a broker conversation.
Everything up to the send is done here.

---

## Overview

A send-ready enquiry asking Czech insurance brokers one question documents cannot answer: **will an
insurer write software-liability cover for this product with a natural person as the policyholder?**

#681 surveyed the market and found that exactly one Czech wording treats software as a *výrobek*
(ČSOB VPP OIT 2020), that seven others cannot respond to a software defect at all, and that **no
insurer publishes eligibility for individuals**. That last gap is what this enquiry closes.

It matters because the owner has settled on **individual enrolment, no s.r.o.**, and with no legal
entity to absorb a claim, insurance is the sole mitigation. If cover turns out to be unavailable to
an individual, the settled corporate form is reopened — not by anyone's opinion, but by the market.
A written decline is therefore as useful a result as a quote.

The pack contains: the risk description to disclose in full (§2), the products to name and the nine
questions to ask in writing (§3), rules written **in advance** for reading whatever comes back (§4),
the letter itself in Czech with an English reference translation (§5), who to send it to (§6), and
the four things to bring back (§7).

---

## 0. What this enquiry is for, and what it is not

#681 surveyed the market from documents. It could not answer one thing, because **no Czech insurer
publishes eligibility for individuals**: whether an insurer will write this cover *for this person*.

So this is not a second market survey. It is the single question documents cannot answer, put to
the one party who can answer it. Re-surveying the market is out of scope.

**A written decline is a result, not a failure.** A documented "no Czech insurer writes this for an
individual" converts #681's unverified gap into a known fact, and forces the corporate-form
question honestly. Record whichever answer arrives.

---

## 1. Why this is urgent rather than eventual

The owner has settled the corporate form — **individual enrolment, no s.r.o. for v1** — knowingly,
against #681's lean and against App Store Guideline 5.1.1(ix)'s wording. That decision is sound
*given* the assumption that cover is obtainable. Two facts make the assumption shaky:

- With no legal entity to absorb a claim, **cover is the sole mitigation** — nothing else stands
  between a claim and the owner's personal assets.
- Whether cover is available **to an individual** is unverified.

Everything else deferred on the map waits harmlessly. This is a **feedback loop into a settled
decision**, and quotes have long lead times. Revisiting the corporate form after the app ships is
far more expensive than before, because enrolment, bundle id, container and signing all hang off it
([#768](https://github.com/jirigrill/eczema-helper/issues/768)).

---

## 2. What is being insured — state it plainly

The risk is unusual enough that a vague description will get a vague answer, and a quote obtained on
an incomplete description is worth little: § 2788 OZ puts a duty of truthful disclosure on the
applicant, and an underwriter who learns the health angle after binding has a non-disclosure
argument. Disclose all of it, up front.

| | |
|---|---|
| **Product** | A native iOS app, distributed worldwide via the App Store, paid, direct to consumers. |
| **What it records** | An infant's food intake and skin observations, including photographs — special-category data under Art. 9 GDPR. |
| **Who sells it** | An **individual** (OSVČ, natural person), not a company. This is the crux of the enquiry. |
| **Advice given** | **None.** See below — this is the strongest thing to bring. |
| **Where data lives** | Entirely in the **user's own iCloud** private database. The developer has no access at any point, and there is no backend server. |
| **Regulatory status** | Not a medical device; the app deliberately stays on the recording side of the MDCG 2019-11 boundary. |
| **Users** | Single child per install, no sharing, no clinician-facing export, no report. |

### 2.1 The no-advice point, in the project's own words

An underwriter will assume clinical decision-support software unless told otherwise. It is not, and
this is written into the product's constitution rather than being a description of current features:

- `DECISIONS.md` entry 5 in [`eczema-ios`](https://github.com/jirigrill/eczema-ios) — *"The app
  records; it never finds. Nothing is derived, anywhere."* *(Quoted as #771 states it; the iOS repo
  was not readable from this session, so re-check the wording before sending.)*
- [#734](https://github.com/jirigrill/eczema-helper/issues/734)'s `CAT-DERIVE-5` forbids the app
  conveying any allergen claim at all. *(The rule lives in #734's resolution comment, not its
  body — the map's Notes refer to it loosely in the plural.)*
- No user-facing string in the shipped predecessor makes any allergen or risk claim (measured).
- The elimination-protocol engine that *would* have derived conclusions is parked and out of scope
  for v1.

Bring this first. It is what distinguishes the product from the thing the underwriter will assume.

### 2.2 Do not oversell it — the honest weak points

The broker will find these anyway, and finding them later reads as concealment:

- The food/allergen catalog's provenance in the predecessor includes AI-generated mappings with no
  cited source. The English catalog is being freshly derived with citations, under a sign-off gate
  ([#702](https://github.com/jirigrill/eczema-helper/issues/702)) — say so, because the *review* is
  the coverage-relevant fact (see §4.4).
- The subject matter is an infant's health, which is the most sensitive framing available.
- Distribution includes the **USA and Canada**, the territories most insurers exclude.

---

## 3. The enquiry itself

### 3.1 Which products to name

Naming the products keeps the broker from proposing the generic package that #681 proved cannot
respond. Ask them to place, or explain why they cannot place:

| | Product | Why this one |
|---|---|---|
| 1 | **ČSOB Pojišťovna, VPP OIT 2020** (pojištění odpovědnosti — IT služby) | The **only** Czech wording found where software is a *výrobek* (čl. II(2)), and territory is „celý svět včetně USA a Kanady" (čl. VIII). |
| 2 | **Colonnade CZ, PI-IT** | Its proposal form rates mobile-app and AI-related development and asks for a „Zdravotnictví" client split. Territory generally **excludes** US/Canada — confirm. |
| 3 | **Allianz + ZPP-PO IT 1/18 rider** | Only with the rider; the base wording excludes software liability outright. US/Canada judgments excluded absolutely. |

Say explicitly that a **generic *pojištění odpovědnosti podnikatele* with the *odpovědnost za
výrobek* add-on is known not to answer this risk**, because eight of nine Czech wordings define
*výrobek* as a tangible thing and several exclude software by name. That one sentence saves a round
trip and signals the enquiry is informed.

### 3.2 The seven questions, in writing

These are #681 §7's, unchanged. Require **written** answers — an email reply is enough, a phone
call is not.

1. Will the insurer accept an **OSVČ natural person** as pojistník? If not, what entity form is
   required? *(the central question)*
2. Disclosed fully — consumer infant-health app, AI-derived allergen catalog, worldwide B2C App
   Store distribution — is it **within appetite**, and at what premium and limit?
3. Does the wording respond to an **anonymous consumer** claim, given it is drafted around a named
   client engagement?
4. Is **bodily injury** covered, excluded, or carved back for the insured's own software?
5. **Is an AI exclusion attached?** Do not bind without an answer.
6. How will the policy respond to a **PLD 2024/2853** strict-liability claim after **9 Dec 2026**
   (Czech transposition via a novela of zák. č. 89/2012 Sb.)? Is the insurer amending wordings?
7. Is **US/Canada** in territory, and are **US-court judgments** excluded?

Two more worth adding, both from #681's exclusion analysis:

8. Does the *harm from **information or advice*** exclusion (e.g. ČSOB ODP 2014 čl. IV.1 w)) appear
   in the quoted wording, and if so, how does the insurer read it against an app that records
   without advising?
9. Is there any **limit or sub-limit** for claims arising from special-category (health) data?

### 3.3 Ask for the wording before binding

Request the full **VPP/ZPP text plus every endorsement** for whatever is quoted, and read it for the
six exclusions #681 flagged as biting this app specifically: information/advice, App Store recall,
beta builds, defect known at inception, "works fine but not as advertised", and wrong-purpose use.
A quoted premium without the wording is not yet an answer.

---

## 4. How to read the answers — decided in advance

Written before the answers arrive, deliberately, so the reading is not fitted to whatever comes
back.

### 4.1 The one answer that reopens a settled decision

**If cover is unavailable to an individual — by eligibility rule or by appetite — the settled
position "professional indemnity insurance, no s.r.o." is not achievable as stated, and the
corporate form is reopened by the insurance market rather than by anyone's opinion.**

That must be said on the map explicitly, because it changes the *basis* of the individual-enrolment
decision. Whether to act on it is the owner's call — but it cannot be their call if nobody tells
them. Note too that Apple 5.1.1(ix) and the insurance market are **two independent pressures
pointing the same way**, which is a fact about the situation, not an argument for the s.r.o.

### 4.2 The three shapes an answer can take

| Answer | What it means |
|---|---|
| **Quote issued to a natural person** | The settled corporate form stands, and now stands on a verified assumption rather than a hopeful one. Bank the premium, limit and wording. |
| **"Legal entity required"** | §4.1 fires. Record it as a finding and put the corporate form back in front of the owner. |
| **"Within eligibility, outside appetite"** | §4.1 fires too, and is worth distinguishing: eligibility might be solved by an s.r.o., whereas appetite may not be — an s.r.o. that still cannot buy cover does not fix anything, so ask which of the two it is. |

### 4.3 Do not treat silence as a decline

Brokers do not always reply. Two or three non-replies are a fact about broker workload, not about
the market. Send to several in parallel (§6), and chase once before recording anything.

### 4.4 One finding that changes the build regardless of the answer

#681 established this and it holds independently of any quote: the *dolus eventualis* definitions of
intent in several Czech wordings, plus the known-defect-at-inception exclusions, mean the **catalog
sign-off gate is the evidence that the mappings were reviewed rather than knowingly shipped
unreviewed**. How the review is recorded is therefore coverage-relevant, not merely good practice —
a live input to [#702](https://github.com/jirigrill/eczema-helper/issues/702).

### 4.5 What no policy will ever cover

Do not read a quote as more comfort than it is. Structurally uninsurable, per #681 §6: regulatory
**fines** of any kind (outside § 2861 OZ, not *nahodilá* per § 2758), **intentional** harm
(§ 2799 OZ), the **defective product itself** and warranty, **smluvní pokuta**, **punitive
damages** (NS 20 Cdo 702/2021: „není vůbec přípustný"), **App Store removal** and the revenue behind
it, and the **cost of fixing the catalog and re-shipping**.

---

## 5. The letter — send this

Czech, because the broker and the wordings are Czech. Fill the four bracketed fields and send as the
body of an email; brokers reply to plain email more reliably than to contact forms. An English
reference translation follows in §5.1 — **send the Czech**.

> **Předmět:** Poptávka pojištění profesní odpovědnosti pro OSVČ — vývoj mobilní aplikace (IT)
>
> Dobrý den,
>
> obracím se na Vás s poptávkou pojištění odpovědnosti za újmu v souvislosti s poskytováním
> IT služeb. Předem uvádím všechny okolnosti, které považuji za podstatné pro posouzení rizika,
> abychom se vyhnuli nabídce, která by na toto riziko nedopadala.
>
> **Kdo pojištění poptává**
>
> Jsem **fyzická osoba podnikající (OSVČ)**, IČO [IČO], se sídlem [adresa]. Nejde o právnickou
> osobu a pro první verzi produktu se založení s. r. o. nezvažuje. **Právě to je jádro mé
> otázky** — potřebuji vědět, zda pojistitel takové pojištění fyzické osobě vůbec sjedná.
>
> **Co je předmětem pojištění**
>
> Vyvíjím a prodávám **nativní aplikaci pro iOS**, distribuovanou celosvětově přes App Store,
> placenou, přímo spotřebitelům (B2C). Nejde o dodávku softwaru na zakázku konkrétnímu klientovi.
>
> Aplikace slouží k **zaznamenávání** stravy kojence a stavu jeho kůže, včetně fotografií. Jde tedy
> o údaje o zdravotním stavu ve smyslu čl. 9 GDPR, a to u dítěte.
>
> Zdůrazňuji, co aplikace **nedělá**, protože to považuji za rozhodující pro posouzení rizika:
> **neposkytuje žádné rady, doporučení, hodnocení ani závěry.** Nevyhodnocuje souvislost mezi
> stravou a stavem kůže, neurčuje alergeny, nenavrhuje eliminační postup a nevytváří žádný výstup
> pro lékaře. Pouze zaznamenává, co uživatel zadá. Tento zákaz jakéhokoli odvozování je zakotven
> ve vývojové dokumentaci produktu jako závazné pravidlo, nikoli jako popis aktuálního stavu.
> Aplikace **není zdravotnickým prostředkem** a je záměrně navržena tak, aby zůstala na straně
> pouhého záznamu (viz vymezení v MDCG 2019-11).
>
> Veškerá data zůstávají **v iCloudu samotného uživatele**. Neprovozuji žádný server, k datům
> uživatelů nemám v žádném okamžiku přístup a žádná data ke mně neputují.
>
> Pro úplnost uvádím i to, co považuji za slabá místa: součástí aplikace je katalog potravin
> a alergenů. V předchozí verzi vznikla část tohoto katalogu bez doložených zdrojů. Nová
> anglická verze katalogu se sestavuje znovu, s citovanými zdroji a s formálním schválením před
> vydáním. Distribuce zahrnuje **USA a Kanadu**.
>
> **O jaké produkty mám zájem**
>
> Z veřejně dostupných pojistných podmínek jsem zjistil, že běžné pojištění odpovědnosti
> podnikatele včetně připojištění odpovědnosti za výrobek na tuto situaci **nedopadá**, protože
> osm z devíti podmínek, které jsem prostudoval, vymezuje výrobek jako hmotnou movitou věc
> a některé software vylučují výslovně. Prosím proto o posouzení zejména:
>
> 1. **ČSOB Pojišťovna, VPP OIT 2020** (odpovědnost při poskytování IT služeb) — podle čl. II(2)
>    se výrobkem rozumí i software a podle čl. VIII je územní rozsah celý svět včetně USA a Kanady;
> 2. **Colonnade, pojištění profesní odpovědnosti IT (PI-IT)**;
> 3. **Allianz** včetně připojištění ZPP-PO IT 1/18;
>
> případně jiného produktu, o kterém víte, že na popsané riziko dopadá.
>
> **Otázky, na které prosím o písemnou odpověď**
>
> 1. Sjedná pojistitel toto pojištění s **fyzickou osobou podnikající** jako pojistníkem? Pokud
>    ne, jakou právní formu vyžaduje?
> 2. Je popsané riziko — se všemi výše uvedenými okolnostmi — **v apetitu** pojistitele, a za
>    jaké pojistné a při jakém limitu?
> 3. Dopadá pojištění na nárok **anonymního spotřebitele**, když jsou podmínky psány pro dodávku
>    konkrétnímu klientovi?
> 4. Je **újma na zdraví** krytá, vyloučená, nebo výslovně zahrnutá pro vadu vlastního softwaru?
> 5. Je ke smlouvě připojena **výluka týkající se umělé inteligence**?
> 6. Jak bude pojištění reagovat na nárok podle **směrnice (EU) 2024/2853** po **9. 12. 2026**?
>    Upravuje pojistitel v této souvislosti své podmínky?
> 7. Je v územním rozsahu **USA a Kanada**, a jsou vyloučeny **rozsudky soudů USA**?
> 8. Obsahuje nabízené znění výluku újmy způsobené **informací nebo radou**, a jak ji pojistitel
>    vykládá u aplikace, která pouze zaznamenává?
> 9. Existuje **limit nebo sublimit** pro nároky související s údaji o zdravotním stavu?
>
> Prosím zároveň o zaslání **úplného znění pojistných podmínek včetně všech doložek** k tomu, co
> případně nabídnete.
>
> Pokud pojištění za těchto okolností sjednat nelze, budu velmi rád i za **písemné sdělení, že to
> možné není** — i to je pro mě potřebná informace.
>
> Děkuji za Váš čas.
>
> S pozdravem
> [jméno]
> [telefon] · [e-mail] · IČO [IČO]

### 5.1 English reference translation

For the owner's own checking, and for any non-Czech broker. **Not the version to send** to a Czech
broker.

> **Subject:** Professional liability enquiry for a sole trader — mobile app development (IT)
>
> Dear Sir or Madam,
>
> I am enquiring about liability insurance in connection with the provision of IT services. I set
> out below everything I consider material to the assessment of the risk, so as to avoid being
> offered cover that would not respond to it.
>
> **Who is seeking cover.** I am a **sole trader (OSVČ), a natural person**, business id [IČO],
> registered at [address]. This is not a legal entity, and forming a company is not contemplated for
> the first version of the product. **That is the crux of my question** — I need to know whether an
> insurer will write this cover for a natural person at all.
>
> **What is to be insured.** I develop and sell a **native iOS app**, distributed worldwide via the
> App Store, paid, direct to consumers. It is not bespoke software delivered to a particular client.
>
> The app **records** an infant's food intake and the condition of their skin, including
> photographs — health data within the meaning of Art. 9 GDPR, concerning a child.
>
> I want to stress what the app does **not** do, because I regard it as decisive for the assessment:
> **it gives no advice, recommendations, assessments or conclusions.** It does not evaluate any link
> between food and skin, does not identify allergens, does not propose an elimination protocol, and
> produces no output for a clinician. It records only what the user enters. This prohibition on any
> derivation is written into the product's development documentation as a binding rule, not as a
> description of the current state. The app is **not a medical device** and is deliberately designed
> to remain on the recording side of the boundary set out in MDCG 2019-11.
>
> All data remains **in the user's own iCloud**. I operate no server, I have no access to user data
> at any point, and no data reaches me.
>
> For completeness, the weak points as I see them: the app includes a food and allergen catalog, part
> of which, in an earlier version, was produced without documented sources. The new English catalog
> is being compiled afresh with cited sources and formal sign-off before release. Distribution
> includes the **USA and Canada**.
>
> **Which products I am interested in.** From publicly available policy wordings I have established
> that ordinary business liability insurance including the product-liability extension **does not
> respond** here, because eight of the nine wordings I examined define a product as a tangible
> movable thing and some exclude software expressly. I therefore ask you to consider in particular:
> **ČSOB Pojišťovna VPP OIT 2020** (software is a product under čl. II(2); territory worldwide
> including the USA and Canada under čl. VIII); **Colonnade PI-IT**; **Allianz** with the
> ZPP-PO IT 1/18 extension — or any other product you know responds to the risk described.
>
> **Questions on which I ask for a written answer** — the nine listed in §3.2 above.
>
> I also ask for the **full policy wording including all endorsements** for anything you may offer.
>
> If cover cannot be arranged in these circumstances, I would be glad of a **written statement that
> it is not possible** — that too is information I need.
>
> Thank you for your time. Yours faithfully, [name]

---

## 6. Who to send it to

Send to **several brokers in parallel**, not one at a time. Brokers do not always reply (§4.3), the
question is unusual enough to be set aside, and quotes have long lead times — serial enquiry could
burn months before the first answer.

A broker rather than an insurer direct: the eligibility question is exactly what a broker knows
without asking, and one of the three target products (Colonnade PI-IT) is broker-distributed.

These four were identified by #681 as Czech brokers placing this class. **Verify the current contact
route on each site before sending — the URLs below are from #681's research, and no contact address
in this pack has been confirmed by this session:**

| Broker | Evidence it places this class (per #681) |
|---|---|
| [Respect](https://www.respect.cz/cs/pojisteni-pro-firmy/tech) | A dedicated tech/IT liability page |
| [Renomia](https://www.renomia.cz/) | The largest Czech broker |
| [CEE Specialty](https://cee-specialty.eu/index.php/cs/odpovednost/pojisteni-profesni-odpovednosti-it) | A page specifically on IT professional liability |
| [nablbost.cz](https://www.nablbost.cz/pojisteni-pro-podnikatelske-profese/pojisteni-pro-it-firmy-a-it-specialisty) | A page for IT firms and IT specialists |

Worth adding the international brokers present in CZ (Marsh, Aon, WTW, Gallagher) if the four above
do not produce an answer — though a one-person OSVČ placement is small for them, which is itself a
reason to lead with the Czech specialists.

**On ČSOB specifically:** its VPP OIT 2020 is the one product where software is a *výrobek*, and
ČSOB Pojišťovna can also be approached **direct**. If the brokers stall, ask ČSOB itself — the
eligibility question (§3.2 Q1) is answerable by the insurer without any broker.

---

## 7. What to bring back, and where to put it

Four things, and fewer than four means the enquiry is not finished:

1. **The eligibility answer** — will an insurer contract with an OSVČ natural person for this? Yes,
   no, or which entity form is required.
2. **The appetite answer**, separately from eligibility (§4.2 explains why the two must not be
   merged).
3. **A premium and limit**, or a written decline. #681 found no Czech insurer publishes
   business-liability pricing, so this figure exists nowhere else. Do not budget on the ~10 000
   CZK/yr broker worked example it found — that was 2M CZK, Czech territory only.
4. **The wording and endorsements** for anything quoted, read against §3.3's six exclusions and
   checked for an AI exclusion.

Record the outcome on the ticket, and — **if cover proves unavailable to an individual** — say so
explicitly on the [map](https://github.com/jirigrill/eczema-helper/issues/672), per §4.1. A quote
that arrives cleanly needs only the ticket.

---

## 8. Out of scope for this enquiry

- **Re-surveying the market.** #681 did that.
- **The lawyer questions** ([#759](https://github.com/jirigrill/eczema-helper/issues/759)) — related,
  separately owned. Worth noting the lawyer's controllership answer may change *what needs insuring*,
  so if both are in flight, #759's answer is useful context for the broker. It is not a reason to
  wait: the eligibility question does not depend on it.
- **Deciding the corporate form.** This enquiry produces the input to that decision. The decision is
  the owner's.
- **Cyber / data-breach cover as a separate line.** With no server and no developer access to user
  data (§2), the first-party breach exposure this would answer is close to absent. If a broker offers
  a combined product that includes it, that is fine — but it is not what is being asked for, and
  should not displace the liability question.
