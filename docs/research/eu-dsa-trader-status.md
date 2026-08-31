# EU DSA trader status: a free iOS app by a Czech individual

Research resolving [#776](https://github.com/jirigrill/eczema-helper/issues/776). Scope: the owner is enrolled in the Apple Developer Program as an **individual** in the Czech Republic and distributes a **free** app with no monetisation. Question: is that person a "trader" under the Digital Services Act, and what must be declared in App Store Connect at first submission?

**This document is research, not legal advice.** Apple says the same of its own page (quoted below). Where no primary source answers a question, this document says **unanswered** rather than inferring.

## Overview

- Declaring **trader** publishes the individual's **address, phone number and email address on the public App Store product page** in all 27 EU territories. For an individual with no business premises that is a **home-address disclosure**, unless a P.O. Box is used — Apple explicitly permits an "Address or P.O. Box", with supporting documentation. **Primary-sourced.**
- A trader status declaration is **mandatory**. Apple's Upcoming Requirements page states apps without trader status **are removed from the App Store in the EU** until it is provided and verified. **Primary-sourced.**
- **Non-trader is a defensible answer** for a hobbyist free app: Apple's own guidance says "if you're a hobbyist and you developed your app with no intention of commercializing it, you may not be considered a trader." The declaration is a self-assessment; Apple states it "can't determine whether you're a trader." **Primary-sourced.**
- It is **not a one-way door**: trader status is settable per app and can be changed later in App Store Connect. Whether already-published contact details can subsequently be *un*-published is **unanswered** by primary sources. **Partly primary-sourced.**

---

## 1. What a trader declaration publishes (highest value)

**Source:** Apple, App Store Connect Help — *Manage European Union Digital Services Act trader requirements*, <https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/> (retrieved 2026-08-31).

Verbatim:

> Articles 30 and 31 of the Digital Services Act (DSA) require Apple to verify and display trader contact information for all traders distributing apps on the App Store in the European Union (EU). This includes an address, phone number, and email address that you provide to Apple for the purpose of posting on your App Store product page in accordance with the DSA. Once verified, Apple will publish this information on your App Store product page when your app is distributed in any of the 27 territories of the EU. Even if you don't distribute apps in the EU, you'll still need to declare a trader status.

The required fields differ by account type. Verbatim:

> **Individuals:** You'll need to enter the following for display on your App Store product pages:
>
> - Address or P.O. Box
> - Phone number
> - Email address
>
> This information is for display purposes only and won't impact the information associated with your Apple Developer Program membership.

On the trader/non-trader choice itself, verbatim:

> 1. "This is a trader account." You'll need to enter contact information for display on your App Store product pages. Continue to step 5.
> 2. "This is not a trader account." You won't need to provide any contact information. Click Done.

**So, plainly: yes.** Declaring trader as an individual publishes a postal address, a phone number and an email address on the public App Store listing. The developer *name* appears on an App Store listing regardless of trader status (it is the seller/developer name), so the incremental disclosure from declaring trader is the **address, phone and email**.

Apple also requires, for all traders:

> **All traders:** You'll need to provide payment account details, if you haven't already entered them in App Store Connect. You'll also be asked to certify that you only offer products or services that comply with the applicable rules of EU law.

**The P.O. Box option is real but documented, not free.** Verbatim, from the verification steps:

> You'll need to provide a current document that verifies your business name and address. Acceptable documents include business or legal records. If you're displaying an alternate address, such as a P.O. Box, you'll also need to provide documentation that reflects your association with this alternate address (for example, a receipt or bill).

Apple verifies the email and phone by two-factor authentication:

> 6. Validate the email address you provided using two-factor authentication.
>
> 7. Validate the phone number you provided on the previous screen using two-factor authentication. […] If you're using a phone number that can't receive two-factor authentication codes, you can request manual verification.

One optional extra public field exists:

> Under the Digital Services Act, you have the option to provide a Labels and Markings URL to display labels or markings required by European Union law. This URL will be visible on your App Store product pages for apps where you have identified as a trader.

### Interaction with #758 and GDPR Art. 13(1)(a)

The privacy notice's `<DEVELOPER NAME>` / `<CONTACT EMAIL>` placeholders and the App Store trader block are **two different legal surfaces**: GDPR Art. 13(1)(a) requires "the identity and the contact details of the controller"; DSA Art. 30/31 requires trader contact information on the listing. Nothing in either instrument requires the two to be *identical strings* — that is not a primary-sourced requirement and is not claimed here.

As a practical matter they name the same natural person, because there is no s.r.o. ([#681](https://github.com/jirigrill/eczema-helper/issues/681) / [#771](https://github.com/jirigrill/eczema-helper/issues/771)). If trader status is declared, a divergence between the published trader email and the privacy notice's controller email would be publicly visible and hard to justify. **Recommendation, not a legal finding: use the same email on both surfaces.** Whether Art. 13(1)(a) requires a *postal* address for the controller is out of scope here — see `docs/research/art-13-notice-form.md`.

If **non-trader** is declared, the tension largely disappears: no address, phone or email is published on the listing, and the privacy notice remains the only place the owner is identified.

## 2. Apple's statement of the requirement, and the consequence of not declaring

**Source:** Apple Developer — *Upcoming Requirements*, <https://developer.apple.com/news/upcoming-requirements/> (retrieved 2026-08-31). Two entries bear on this.

*DSA trader status required for apps in the EU* — since **February 17, 2025** (anchor `?id=02172025a`), verbatim:

> Apps without trader status will be removed from the App Store in the European Union (EU) until trader status is provided and verified in order to comply with the Digital Services Act.

*DSA trader status required for app updates in the EU* — since **October 16, 2024** (anchor `?id=10162024a`), verbatim:

> Your trader status is required to submit app updates for apps distributed on the App Store in the European Union (EU), in order to comply with the Digital Services Act.

The App Store Connect Help page states the same requirement from the submission side, verbatim:

> If you haven't already confirmed your trader status, next time you submit a new app in App Store Connect you'll be asked to disclose whether or not you're a trader in connection with the DSA in order to stay compliant across territories when distributing on the App Store. You'll need to confirm your trader status if you have at least one app on the App Store in the EU that qualifies you as a trader.

And, importantly for this project, verbatim:

> Even if you don't distribute apps in the EU, you'll still need to declare a trader status.

**Reading of the two together.** The mandatory item is *declaring a status* — trader **or** non-trader. The removal consequence quoted above attaches to apps "without trader status", i.e. to an **undeclared** state, not to declaring "not a trader". Apple provides "This is not a trader account" as a first-class option that requires no contact information, so choosing it is not the same as failing to declare. **Caveat:** Apple's wording "until trader status is provided and verified" is ambiguous in isolation about whether a non-trader declaration satisfies it; the reading above rests on the existence of the non-trader option in the same flow, not on an explicit Apple sentence saying "declaring non-trader avoids removal". That explicit sentence is **unanswered** by the sources found.

There is one documented consequence of declaring non-trader, verbatim:

> If you're not a trader, consumers in the EU will be informed that consumer rights stemming from applicable consumer protection laws won't apply to contracts between you and them.

For a free app with no purchase and no monetisation, there is no consumer contract of sale for that notice to undercut. Apple does not describe any other functional restriction on non-trader apps in the reviewed pages.

**Required role in App Store Connect:** "Account Holder or Admin" for both the account-level and per-app flows. The owner holds both roles, so this is not a blocker.

## 3. Is "non-trader" defensible for a free app by an individual?

### The regulation text

**Trader definition — DSA Art. 3, point (f).** Quoted verbatim *from Apple's own help page*, which reproduces it (the EUR-Lex HTML could not be retrieved in this session; see "Sources and limits"):

> The DSA defines a trader as "any natural person, or any legal person irrespective of whether privately or publicly owned, who is acting, including through any person acting in his or her name or on his or her behalf, for purposes relating to his or her trade, business, craft or profession."

The operative phrase is **"for purposes relating to his or her trade, business, craft or profession"** — it is a *purpose* test about the person's activity, not a test of whether money changes hands. Note the issue's phrasing "commercial, industrial, craft or professional activity" is the **Consumer Rights Directive** formulation; the DSA's own wording is "trade, business, craft or profession". They point the same way.

**Art. 30 scope condition.** Art. 30(1) is addressed to "Providers of online platforms allowing consumers to conclude distance contracts with traders", and requires the platform to collect, "where applicable to the trader": (a) "name, address, telephone number and email address"; (b) a copy of the identification document or electronic identification; (c) "the payment account details of the trader"; (d) trade-register details and registration number, where the trader is registered; (e) "a self-certification by the trader committing to only offer products or services that comply with the applicable rules of Union law". Source: <https://www.eu-digital-services-act.com/Digital_Services_Act_Article_30.html> — a secondary reproduction of the text, **not** EUR-Lex. Treat items (a)–(e) as reliable in substance (they map exactly onto the fields Apple collects, including the payment account details and the self-certification) but verify against EUR-Lex before relying on the wording.

This scope condition is the substantive point in the owner's favour: a **free app with no monetisation involves no distance contract for the supply of goods or services against payment**. Whether that alone puts the app outside Art. 30 is a legal conclusion this research does not reach — **unanswered**, and exactly the kind of question the lawyer consultation brief (`docs/research/lawyer-consultation-brief.md`) exists to put to a professional.

### Apple's own self-assessment guidance — the strongest primary source

From the same App Store Connect Help page, verbatim:

> To determine if you're a trader, you should consider a range of non-exhaustive and non-exclusive factors (see those listed on page 2 in the EC's Guidance), which may include:
>
> - Whether you make revenue as a result of your app, for example if your app includes In-App Purchases, or if it's a paid or ad-sponsored app — especially if you're transacting in large volumes;
> - Whether you engage in commercial practices towards consumers, including advertising, or promoting products or services;
> - Whether you're registered for VAT purposes; and
> - Whether you develop your app in connection with your trade, business, craft, or profession—meaning that you're acting in a professional/business capacity. You're unlikely to be a trader for EU law purposes if you're acting "for purposes which are outside your trade, business, craft, or profession." For example, if you're a hobbyist and you developed your app with no intention of commercializing it, you may not be considered a trader.

Also verbatim:

> Regardless of whether you're an individual developer or organization, if you have a legal status associated with a business activity, that would suggest you may be a trader.

> You must assess whether you're a trader for EU law purposes. […] Apple can't determine whether you're a trader.

> The material contained herein is informational, general in nature, and does not constitute legal advice. If you're uncertain about your status as a trader, consult with your legal advisor.

### Applying the four factors to this app

| Apple's factor | This app |
| --- | --- |
| Revenue from the app (IAP, paid, ads) | **No.** Free, no IAP, no ads, no monetisation of any kind. |
| Commercial practices toward consumers | **No.** No advertising, no product or service promoted. |
| Registered for VAT | **No** — no s.r.o., no business registration ([#681](https://github.com/jirigrill/eczema-helper/issues/681)). Confirm the owner holds no CZ *IČO* / trade licence (*živnostenský list*) for any related activity. |
| Developed in connection with a trade/business/profession | **No.** Built for the owner's own child; not connected to the owner's employment. |

All four point to non-trader, and Apple's hobbyist example is close to a direct match. **On this evidence, "non-trader" is a defensible declaration** — with the standing caveat that the assessment is the owner's own and Apple disclaims giving legal advice.

**If Apple or a regulator disagrees later.** No primary source found states what Apple does on disagreement, and Apple states it cannot make the determination itself. The one documented lever is the removal mechanism quoted in §2, which is stated for *missing* trader status, not for a contested non-trader declaration. **Unanswered**: whether a wrongly-declared non-trader status leads to app removal, an account-level action, or a DSA enforcement route via the CZ Digital Services Coordinator. Do not assume a specific consequence.

**One caveat worth stating.** Apple's factor list mentions "especially if you're transacting in large volumes", and the EC Guidance Apple points to (page 2) was not retrieved in this session — the factor list here is Apple's paraphrase of it, not the Guidance itself. **Unanswered:** the EC Guidance's own wording.

## 4. Is the declaration a one-way door if the app is later monetised?

**No, not architecturally.** Verbatim from the App Store Connect Help page:

> **Note:** You'll still have the option to turn off your trader status for specific apps later.

> You'll then have the option to turn off or specify your trader status for each specific app that you distribute.

> If you need to change your trader status for one or more of your individual apps, you can do so.
>
> 1. In Apps, select your app from the list.
> 2. In the left sidebar, click App Information.
> 3. Scroll to the App Store Regulations and Permits section.
> 4. Under Digital Services Act, click Edit.
> 5. In the pop-up window, change your trader status for that app. If you're declaring yourself a trader for the first time, you'll need to enter and verify your contact information that displays on your app's App Store product page.

So the status is **per-app and editable in both directions**, and switching from non-trader to trader later is an explicitly supported path — including the first-time contact-information entry and verification. Monetising the app later (IAP, paid, ads) would flip the first of Apple's four factors and, on Apple's own reasoning, would make trader status the likely correct answer at that point. That is a **later, reversible step, not a decision foreclosed now**.

**Two things remain unanswered:**

1. Whether contact information already **published** on a product page can be fully un-published by switching an app back to non-trader — the help page describes changing the status, not the fate of the previously verified and displayed details. Assume, conservatively, that **publishing an address is not cleanly reversible**.
2. Whether Apple re-verifies or retains the submitted address documentation after a switch back to non-trader.

## Practical conclusion for the pre-submission gate ([#769](https://github.com/jirigrill/eczema-helper/issues/769))

1. **Declare a status — you cannot skip the field.** Apple asks at first submission and undeclared apps are removed from the EU App Store.
2. **"This is not a trader account" is the well-supported answer for the app as it exists today**: free, no IAP, no ads, no VAT registration, no business connection, hobbyist origin. It requires no contact information and therefore publishes **no home address**.
3. **Confirm the two facts the declaration rests on** before submitting: no CZ *IČO* / trade licence covering this activity, and no intent to monetise at launch.
4. **If [#771](https://github.com/jirigrill/eczema-helper/issues/771) forces an s.r.o.** for insurance, revisit this immediately — Apple's own wording is that "if you have a legal status associated with a business activity, that would suggest you may be a trader", and an organisation account publishes the D-U-N-S address instead of a personal one.
5. **If monetisation is ever added**, switch the app to trader and expect to publish address, phone and email. Prefer a P.O. Box or a company address over the home address at that point, and note Apple requires documentation linking you to an alternate address.

## Sources and limits

| Source | Type | Used for |
| --- | --- | --- |
| [App Store Connect Help — Manage EU DSA trader requirements](https://developer.apple.com/help/app-store-connect/manage-compliance-information/manage-european-union-digital-services-act-trader-requirements/) | **Primary** (Apple) | §1 published fields, trader definition, self-assessment factors, §4 reversibility |
| [Apple Developer — Upcoming Requirements](https://developer.apple.com/news/upcoming-requirements/) (`?id=02172025a`, `?id=10162024a`) | **Primary** (Apple) | §2 requirement and EU-removal consequence |
| [eu-digital-services-act.com — Art. 30](https://www.eu-digital-services-act.com/Digital_Services_Act_Article_30.html) | **Secondary** reproduction | Art. 30(1) scope condition and items (a)–(e) — verify against EUR-Lex |

**Retrieval failures in this session, to redo if the wording matters:** EUR-Lex CELEX:32022R2065 (HTML and ELI URLs both returned empty via the available fetch tooling), and the European Commission Guidance on the trader-status factors that Apple cites. Both should be quoted from source before any of §3's regulation wording is relied on in a legal filing or lawyer brief. The Apple quotations are complete and were retrieved directly.

Retrieved 2026-08-31.
