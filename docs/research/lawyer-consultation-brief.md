# Consultation brief for a Czech data-protection lawyer

Prepared for [issue #759](https://github.com/jirigrill/eczema-helper/issues/759). This is the
material to put in front of a named, qualified adviser at a paid consultation — not a research
document, and not an answer. Everything here is drawn from work already banked on the
[iOS map](https://github.com/jirigrill/eczema-helper/issues/672); citations are reproduced so the
adviser can check them without reading the tracker.

**Read this first, whoever engages the adviser.** Three questions go in, and four deliverables come
out. Getting fewer than four back means the consultation is not finished.

---

## 0. Correction to the premise of #759

#759 says the ÚOOÚ route "was tried; that did not produce an answer." That is not what happened.
[#692](https://github.com/jirigrill/eczema-helper/issues/692) closed as **not sent, by owner
decision** — its resolution comment: *"The owner has decided the enquiry is **not needed**. No
letter was sent to ÚOOÚ, and none will be under this ticket … That bar is unmet **by decision, not
by failure** — the draft was finished and verified."*

Two consequences:

1. The controllership question is unanswered because **nobody asked**, not because asking failed.
   The lawyer consultation is therefore not a fallback after a dead end — it is the first attempt
   to get an answer from anyone.
2. **The ÚOOÚ letter remains sendable as-is**, needing only a signature block. It lives at
   `docs/research/uoou-enquiry-controllership-cs.md` (send this one), with an English reference
   translation alongside and verified channel instructions in
   `docs/research/uoou-enquiry-how-to-send.md`. All 14 of its quotations were verified against the
   primary PDFs. The adviser may well recommend sending it; it costs a stamp, and ÚOOÚ is the sole
   interlocutor under Art. 56(6).

The letter is also, in substance, **most of this brief already** — it states the facts, tables
Readings A/B/C on controllership, and asks the Art. 30 recipients and Apple-as-processor questions.
Hand it to the adviser as an annex rather than re-explaining the problem.

---

## 1. The facts the adviser needs

**The product.** An iOS application (SwiftUI + SwiftData + CloudKit) that lets a parent record what
a breastfed infant and the breastfeeding mother ate, how the infant's skin looked across nine body
regions, and photographs of affected skin. It is **paid**, distributed **worldwide** on the App
Store, and in English.

**It only records.** No evaluation, no correlation of food against skin condition, no diagnosis, no
recommendation, no profiling, no AI at runtime, no analytics. The settled product rule is *"The app
records; it never finds. Nothing is derived, anywhere."* This matters legally: it is the reason the
product stays clear of the MDCG 2019-11 medical-device tripwire, and 70-odd written rules exist to
hold that line.

**The data.** Data concerning health under Art. 9(1). The data subject is an **infant**; the mother
enters the data. Apple's own privacy-label taxonomy separately classes *"pregnancy or childbirth
information"* as Sensitive Info.

**Where it sits.** On the mother's device, mirrored to the **private database of the app's own
CloudKit container**, which resides in **her** iCloud account and consumes **her** iCloud storage
quota. Sync is **mandatory — there is no toggle** ([#705](https://github.com/jirigrill/eczema-helper/issues/705)).
There is **no export** ([#683](https://github.com/jirigrill/eczema-helper/issues/683)). Every
encryptable field is encrypted, and photo bytes are encrypted by the app itself
([#714](https://github.com/jirigrill/eczema-helper/issues/714)).

**What the developer has.** Nothing. No server, no ads, no tracking, no telemetry carrying content,
no crash reports containing user content. Per Apple's documentation, private-database content is not
visible in the developer portal and only the user can reach it. The developer does not determine
where the data physically resides — Apple does.

**What the developer determines.** The record structure (what a meal is, what a skin observation is,
the nine regions, the severity levels), that the data syncs to iCloud specifically, and that data is
retained until the user deletes it. The user cannot vary any of these; she can use the app or not.

**The corporate form — decided, and load-bearing.** The owner is enrolled as an **individual natural
person; no s.r.o. for v1**. This was chosen *against* the lean of
[#681](https://github.com/jirigrill/eczema-helper/issues/681) and against the wording of App Store
Guideline 5.1.1(ix). It removes the entity that would otherwise absorb a claim. Per #681's research,
**nothing in Czech law limits a natural person's liability for damage they cause; the estate
answers.** So the controllership answer is *more* consequential under this form, not less.

**The liability backdrop, verified in #681.** Generic Czech product liability largely cannot respond:
software is not a *výrobek* in **8 of 9** wordings examined (ČSOB VPP ODP 2014 čl. IV.8(e) excludes
„výrobky, majícími povahu **věci nehmotné**" expressly). **Exactly one** Czech wording found covers
software as a product with worldwide territory (ČSOB VPP OIT 2020: „výrobkem … se rozumí i
**software**"). **No insurer publishes eligibility for natural persons**, so whether the owner is
insurable at all is unverified. And **PLD (EU) 2024/2853** makes defective-product liability
**strict**, with software a product, from **9 Dec 2026** — Art. 5(1) gives *"any natural person who
suffers damage caused by a defective product"* a claim. (Placing insurance is
[#771](https://github.com/jirigrill/eczema-helper/issues/771), not this consultation.)

---

## 2. Question 1 — controllership

**Is the developer a controller of data he never sees?**
Left `UNSETTLED` by [#692](https://github.com/jirigrill/eczema-helper/issues/692) and
[#694](https://github.com/jirigrill/eczema-helper/issues/694) §5.7.

State the three readings rather than asking an open question — this is what got the ÚOOÚ letter its
shape, and it pre-empts a restatement of the problem back at us:

- **Reading A** — the mother is the controller; the developer supplies only the means and is not a
  controller of that content. The GDPR still applies to him (Recital 18), but not in that role.
- **Reading B** — the developer is a sole or joint controller of every installation's content,
  because he determines the essential means; having no access is irrelevant to the role.
- **Reading C** — the developer is a **processor** (EDPB 07/2020 fn 29). Then: *whose* processor, and
  how is Art. 28(3) satisfiable, when the only other actor is a user whose own processing is excluded
  from scope by Art. 2(2)(c)?

**Why it is genuinely hard — the sources pull apart.** Do not let the adviser resolve it on intuition
("obviously the mother is the controller"); the guidance says otherwise:

| Source | Cuts toward |
|---|---|
| **EDPB 07/2020 ¶45**: *"It is not necessary that the controller actually has access to the data … is to be regarded as controller even though he or she will never have actual access"* — restated flatly in the executive summary (p. 3) | B |
| **EDPB 07/2020 fn 29 to ¶65** (p. 21): a system provider not determining purposes/means *"should be considered as a **processor**"* — no "outside the scheme" option offered | C |
| **EDPB 07/2020 ¶68**: provider is a processor *"in the absence of any purpose of its own"*; mere commercial benefit is not a purpose | C |
| **Art. 2(2)(c) + Recital 18 final sentence**: the Regulation *"applies to controllers or processors which provide the means"* — presupposes the role rather than assigning it | circular |
| **WP 202 (apps on smart devices) §3.3.1**: developer responsibilities *"considerably limited if no personal data are processed and/or made available outside the device"* — but that limits the **extent of obligations, not the role**, and it is a Directive-era opinion | partial A |
| **CNIL Recommandation, délib. 2025-024**: *"Le RGPD n'est pas applicable au logiciel fourni"* — but expressly conditioned on no sharing with the publisher's servers *"ni avec ceux du fournisseur du système d'exploitation"* and, for health apps, storage *"uniquement locale, sans connexion extérieure"*. **CloudKit is Apple's servers, so this is refuted for this app, not merely unhelpful.** | — |
| **EDPB 01/2020 (connected vehicles) ¶74–75**: out of scope only *"without the transfer of personal data to a data controller or data processor"*, then ¶75 reasserts application to means-providers | circular |

**ÚOOÚ has no published position** on app developers or on-device processing (both Q&A trees and the
sitemap were searched). **No primary source addresses a vendor whose product processes data solely on
the user's own device and in the user's own cloud account with the OS provider.**

**The pivot to press.** Every favourable source turns on the developer having **no purpose of his
own** — which is true today. Ask the adviser to confirm that reading, and to state what would flip
it. #694's finding is that the local zone and the synced zone differ: WP 202's *"considerably
limited"* relief attaches to the local zone and **switches off at the sync boundary**. Reading A is
stronger for the synced zone, Reading B for the local one.

**And the question that decides it, from the ÚOOÚ letter's Q5:** does syncing into the **user's own
account with the OS provider** count as storage on the device, or as a connection to external
servers that takes the app out of the purely-local case?

---

## 3. Question 2 — Art. 28(3) is irreducible

[#694](https://github.com/jirigrill/eczema-helper/issues/694) found the processor-contract
requirement **cannot be drafted away**. Not a wording problem: the obligation stands, or the
relationship is mischaracterised.

**The finding, verbatim from #694's resolution:** *"ADPLA Attachment 4 § 3.6 does not satisfy Art.
28(3). (d) sub-processors and (g) end-of-processing deletion are substantively **absent** —
'sub-processor' appears nowhere in the agreement, and § 1.2 states the opposite of (g) for private
data — while (c)/(f) are materially narrower and (h) contractually forecloses the controller-mandated
audit it requires. **The developer cannot cure it**: non-negotiable agreement, Art. 28(9) requires
writing. No executed current SCCs either (the ADPLA still says 'Model Contract Clauses'), and no
published iCloud sub-processor list."*

**The wrinkle that makes it more than a gap.** ADPLA Attachment 4 §3.6 casts Apple as *"**Your
agent** for the processing, storage and handling of any such Personal Data"*, handling it *"only in
accordance with the instructions and permissions from **You**"* — but its trigger addresses the case
where ***You* store** personal data in iCloud. In a private-database architecture the **user's**
device writes into the **user's own** account. Meanwhile §3.5 has Apple undertaking not to access
private-container contents, and §1.2 confirms user data outlives the developer's relationship with
Apple. Toward the end user, Apple is itself a controller (Apple Distribution International Ltd.).

**So the question is who the counterparty is.** If Apple is a processor here, Art. 28(3) points at a
party that does not negotiate. If Apple is not a processor, the whole analysis needs restating. Ask
for both branches.

**Two related, already-verified facts to save the adviser time:** **Apple Inc. is not on the DPF
participant list at all** (checked against the official 42,398-entry workbook — there is no status to
verify), and [#709](https://github.com/jirigrill/eczema-helper/issues/709) settled that this gap
stays **internal**: Art. 30(4) sends the record to the supervisory authority, Arts. 12–14 to the data
subject, and nothing in Art. 13 requires a controller to disclose a processor-contract deficiency to
data subjects. The privacy notice therefore discloses the **facts** (Apple as recipient,
sub-processors at category level, storage at Apple's discretion, no verified adequacy safeguard) and
not the **characterisation**. Confirm that split holds.

---

## 4. Question 3 — the Art. 7(3) withdrawal problem (#759 omits this; it belongs here)

#759 carries two questions. **#694's resolution names three**, its last line: *"Two things to put to
a qualified Czech lawyer before shipping: that Art. 28 conclusion, and the **Art. 7(3) withdrawal
problem under mandatory sync** (§5.6)."*
[#737](https://github.com/jirigrill/eczema-helper/issues/737) independently records the same
question, plus **Recital 42 detriment on refusal**, as being for a Czech data-protection lawyer.
Same adviser, same sitting, no extra fee — include it.

**The problem.** Giving consent is one tap. Withdrawing it means **abandoning a purchased app and
losing the diary entirely**, because #705 left no sync toggle and #683 left no export. Art. 7(3)
third sentence requires withdrawal to be as easy as giving it.

**What the app already does about it, and why that may not be enough.** `CONSENT-SAY-9` requires the
withdrawal right to be stated **with its cost** — that withdrawing destroys the diary — and
`CONSENT-SAY-10` forbids the screen implying withdrawal is free. That sentence is *the only
mitigation available in the app*. Ask whether disclosure cures the Art. 7(3) defect or merely
documents it, and whether the terminal decline state (refusal is total, non-punitive, no degraded
read-only mode) is compatible with **Recital 42**'s no-detriment requirement.

Two further inputs the adviser should see: **Art. 8 is out on two independent grounds**, so proxy
consent falls to the Czech Civil Code — **§ 892(2) + § 876(3): the mother alone can consent, by
rebuttable presumption** — and the **trigger age is `UNSETTLED`**, with 18 taken as a stated
position rather than a finding. Worth confirming, since it is a Czech civil-law question and this is
a Czech adviser.

---

## 5. What to come away with — four deliverables

1. **A written answer on controllership** — which of Readings A/B/C, with reasoning that survives
   EDPB 07/2020 fn 29.
2. **A written answer on what Art. 28(3) requires of an individual developer in this arrangement**,
   covering both branches (Apple is / is not a processor).
3. **The Art. 30 record of processing — unconditionally.** Art. 30 attaches to *processing*, not to
   risk level, so a finding that no DPIA is mandatory does **not** discharge it. Its content depends
   on the controllership answer (a record has to name the controller), which is why it rides on this
   consultation. Note the open sub-question from the ÚOOÚ letter's Q2: what goes in the
   **Art. 30(1)(d) "categories of recipients"** field — is Apple a recipient, or is there no
   recipient at all, when the data travels only into the user's own account?
4. **A DPIA, or a recorded finding that none is mandatory** — on the adviser's reasoning, not on
   [#680](https://github.com/jirigrill/eczema-helper/issues/680)'s inconclusive count. #680 scored
   **1** critical characteristic against ÚOOÚ's threshold of **2**, but also found the answer does not
   turn on that list at all — it turns on controllership. Also unresolved and worth asking (ÚOOÚ
   letter Q1): for characteristic 4, *"processing on a large scale"*, are data subjects counted as
   those whose data the developer holds — **zero** — or aggregated across all installations? That one
   quantity decides whether Art. 35 bites.

**Where the answer is recorded:** `eczema-ios/docs/spec/DECISIONS.md`. It constrains not-yet-built
work and reversing it would be expensive and non-obvious.

**Ask for the answer in writing, and dated.** #681 found that *how* a review is documented bears on
whether insurance cover responds. An undated verbal opinion is worth much less than the same opinion
on letterhead.

---

## 6. Why now, not at submission

Unlike Guidelines 5.1.1(ix) and 5.1.3(ii) — which
[#685](https://github.com/jirigrill/eczema-helper/issues/685) knowingly deferred to a live submission
with no fallback — these questions **shape text that must exist before the build**.

[#758](https://github.com/jirigrill/eczema-helper/issues/758) is drafting the **eleven Tier-1 consent
disclosures** and the **~1,500-word Art. 13 notice**, and every one of those texts has to say who is
processing what. #758 is written to be **true under either controllership answer**, with the passages
that would change flagged in place — but it cannot be *finalised* until the answer exists. And per
#709, the **privacy-policy URL is not editable without a version submission**: Apple's editability
table leaves `Editable` blank for it (the same class as the app **Name**), and Help states the
consequence — *"Any changes to the URLs releases with your next app version."*

There is also a schema deadline in the neighbourhood: the notice's version identifier is a persisted
consent-record field, so it is gated by [#730](https://github.com/jirigrill/eczema-helper/issues/730)'s
schema promotion, which is **additive-only and unbackfillable**.

---

## 7. Annexes — hand these over

| Artifact | What it is |
|---|---|
| `docs/research/uoou-enquiry-controllership-cs.md` | The unsent ÚOOÚ letter — the fullest existing statement of the controllership question, with Readings A/B/C and 14 verified quotations. **Start here.** |
| `docs/research/uoou-enquiry-controllership-en.md` | English reference translation of the same |
| `docs/research/uoou-enquiry-how-to-send.md` | Verified channel, framing, and seven citation hazards, if the adviser recommends sending it |
| `docs/research/art-9-lawful-basis.md` | The Art. 9(2)(a) analysis; §5.4 is the Art. 28 finding, §5.6 the withdrawal problem, §5.7 controllership |
| `docs/research/gdpr-dpia-assessment.md` | #680's DPIA assessment and the ÚOOÚ threshold scoring |
| `docs/research/professional-indemnity-insurance.md` | #681's liability and insurance findings, incl. PLD 2024/2853 |
| `docs/research/art-13-notice-form.md`, `privacy-notice-hosting.md` | #709/#736 — the notice's settled form and hosting |
| `docs/research/app-store-5-1-3-cloudkit.md` | The unsettled Apple-guideline question about health data in iCloud |
| `eczema-ios/docs/spec/consent.md` | The 51 `CONSENT-*` rules, incl. `CONSENT-SAY-9`/`-10` |

Also mention: **sync is mandatory with no toggle** (#705), **every encryptable field is encrypted and
photo bytes are encrypted by the app** (#714). Those two facts change the risk picture and an adviser
who assumes a normal server-backed app will get the analysis wrong.

---

## 8. What is out of scope for this consultation

- **Filing anything with ÚOOÚ** as an action of this ticket. The adviser may *recommend* sending the
  drafted letter — that is a valid outcome and §0 explains why it is still live — but the consultation
  is not a filing exercise.
- **The App Review questions** (5.1.3(ii), 5.1.1(ix)). #685 settled that these surface at first
  submission. Note that 5.1.3(ii) — *"may not store personal health information in iCloud"* — is
  genuinely unsettled against Apple's own contradicting documentation, but it is **Apple's** question,
  not a lawyer's.
- **Obtaining insurance.** [#771](https://github.com/jirigrill/eczema-helper/issues/771) owns it;
  #681 found the instrument may not exist. Do not spend consultation time pricing cover.
- **Czech-language versions of anything user-facing.** The product is English-only, and #709 verified
  no primary source requires otherwise (the trigger is targeting, not establishment).

---

## 9. One caution on framing

The ÚOOÚ letter deliberately says *"I am not asking for legal advice."* **Invert that here.** Legal
advice on a specific arrangement, from a named professional whose answer can be relied on, is exactly
what is being purchased — that is the whole reason this ticket exists rather than another research
pass. Keep the letter's *rigour* (facts first, readings tabled, sources quoted) and drop its
*hedging*.

Equally: do not let the consultation collapse into a compliance-audit quote for the whole product.
Three questions, four deliverables. Anything broader is a separate engagement.
