# Privacy notice: App Store obligations and hosting

Research for the Art. 13 GDPR privacy notice of the native iOS app
([issue #672](https://github.com/jirigrill/eczema-helper/issues/672)). The app is SwiftUI +
SwiftData + CloudKit private database, recording an infant's eczema and the breastfeeding
mother's meals.

**Retrieved 2026-08-20.** Every quote below carries its source URL and the fetch date. Anything
not traceable to an Apple-authored (or, for §4, GitHub-authored) source is labelled
**NOT FOUND** or **UNVERIFIED** in place, and repeated in [§Gaps](#gaps).

> **Not legal advice, and not Apple's official position.** This document reports what Apple and
> GitHub have written down, verbatim, with citations. It does not interpret those texts as
> counsel would, and Apple has not reviewed or endorsed any reading of its documents recorded
> here. Where Apple is silent, this document says so rather than filling the gap by inference.
> App Review outcomes are decided case by case by Apple, not by this document.

## Overview

Five findings, in plain language:

1. **The App Store Connect privacy policy URL is required for every app, it is localizable per
   App Store language, and it is _not_ in the "editable anytime" class.** Apple's own
   editability table marks it `Required` and `Localized` but leaves the `Editable` column blank —
   the same class as the app **Name**. App Store Connect Help states it outright: "Any changes to
   the URLs releases with your next app version." So a URL swap is a version-gated operation, not
   a live metadata edit. This is the single most consequential finding for the notice's hosting
   design: **the URL must be one you can keep stable for the app's lifetime**, because changing
   it costs a submission. Changing the *content behind* the URL costs nothing.
2. **"Easily accessible" is never defined.** Apple states the in-app link requirement in
   5.1.1(i) and never elaborates — no tap count, no location, no settings-screen rule. The
   closest analogue Apple has written is its *account deletion* guidance ("Make the account
   deletion option easy to find in your app. Typically, it's included in the app's account
   settings."), which is about a different obligation and cannot be cited as privacy-policy
   guidance.
3. **Whether embedded in-app text satisfies 5.1.1(i) is NOT FOUND in Apple's documentation.**
   5.1.1(i) says "a link." Apple's Developer Program License Agreement separately says the policy
   may be provided "in Your Application, on the App Store, and/or on Your website" — a broader
   formulation — but Apple nowhere reconciles the two, and nowhere states that embedded text
   discharges the guideline. Offline reachability: also **NOT FOUND**.
4. **Nutrition labels and the privacy policy are two separate obligations**, both required to
   submit, with opposite editability rules (labels: update anytime, no app update needed;
   policy URL: next version). Apple requires each to be accurate, and requires the app's privacy
   practices to "follow the App Review Guidelines and all applicable laws" — but a
   *label-vs-policy text consistency* rule, stated as such, is **NOT FOUND**.
5. **GitHub Pages on a private repo requires a paid plan, and a *privately published* site
   requires GitHub Enterprise Cloud** — which would defeat the purpose, since a privately
   published site is only readable by people with repo access. The workable configuration is a
   **private repo publishing a public site** (GitHub Pro or above). HTTPS is automatic on
   `github.io`. There is **no uptime SLA**: GitHub's ToS disclaims that the service will be
   "uninterrupted, timely, secure, or error-free," and Pages carries an explicit "not intended
   for … your online business" usage limit plus soft bandwidth and rate limits.

The rest of this document is the evidence.

---

## 1. The App Store Connect privacy policy URL field — its mechanics

### 1.1 Is the field mandatory for all apps?

**Yes, for iOS. Apple says so in three places.**

From App Store Connect Help, *App privacy* (Reference → App information),
<https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy>,
fetched 2026-08-20:

> **Privacy Policy URL** — A URL that links to your company's privacy policy. This is required for
> all apps.

From App Store Connect Help, *Manage app privacy*,
<https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy>,
fetched 2026-08-20:

> You're required to provide a privacy policy URL for your iOS app platform and privacy policy
> text for your tvOS app platform. Offering a privacy choices URL is optional.

and, further down the same page:

> A privacy policy URL is required for all apps, while a user privacy choices URL is optional.

From App Store Connect Help, *App information* (Reference → App information),
<https://developer.apple.com/help/app-store-connect/reference/app-information/app-information>,
fetched 2026-08-20:

> **Privacy Policy URL** — A URL that links to your company's privacy policy. Required for iOS and
> macOS apps. If your app has a tvOS platform, the text of your privacy policy in the Apple TV
> Privacy Policy field is required.

Note the platform split: **iOS and macOS take a URL; tvOS takes pasted text.** Apple thus does have
a documented "embedded text instead of a URL" mode — but only for tvOS. Nothing extends it to iOS
(see §2.2).

And from the App Store Review Guidelines, guideline 5.1.1(i) Privacy Policies,
<https://developer.apple.com/app-store/review/guidelines/> (page states "Last Updated: June 8,
2026"), fetched 2026-08-20:

> All apps must include a link to their privacy policy in the App Store Connect metadata field and
> within the app in an easily accessible manner.

Binding contractual backing, from the Apple Developer Program License Agreement (PDF),
§3.3.3(C) "Disclosures to Users", p. 23,
<https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-English.pdf>,
fetched 2026-08-20:

> You must provide a privacy policy in Your Application, on the App Store, and/or on Your website
> explaining Your collection, use, disclosure, sharing, retention, and deletion of user or device
> data.

The same agreement lists the policy as delivered metadata, Schedule 1 §2.1, p. ~117:

> Metadata You deliver to Apple under this Schedule 1 will include: (i) the title and version
> number of each of the Licensed Applications; … (v) Your privacy policy; …

### 1.2 Must the URL be HTTPS? Must it be publicly reachable?

**Publicly reachable: yes, Apple says "publicly accessible."** From *App privacy details on the
App Store*, section "Privacy links",
<https://developer.apple.com/app-store/app-privacy-details/>, fetched 2026-08-20:

> **Privacy Policy (Required):** The URL to your publicly accessible privacy policy.

The same page's framing of the pair:

> By adding the following links on your product page, you can help users easily access your app's
> privacy policy and manage their data in your app.

"Publicly accessible" is Apple's own phrase; it is the strongest documented statement against a
login- or paywall-gated policy page. Apple does not further define the term, and does not
separately say "no login" or "no paywall" in words.

**HTTPS: NOT FOUND.** No Apple page reviewed states that the privacy policy URL must use HTTPS.
Searched: the Review Guidelines (full text), *App privacy*, *App information*, *Manage app
privacy*, *Required, localizable, and editable properties*, *App privacy details on the App
Store*, *User privacy and data use*, and the App Store Connect API `appInfoLocalization`
attributes reference. The field is typed only as `string` in the API
(<https://developer.apple.com/documentation/appstoreconnectapi/appinfolocalization/attributes-data.dictionary>,
fetched 2026-08-20, lists `privacyPolicyUrl`, `privacyPolicyText`, `privacyChoicesUrl` as
`string`). Use HTTPS regardless — GitHub Pages gives it for free (§4) — but do not claim Apple
requires it.

**Functional at submission: yes, via guideline 2.1.** From the App Store Review Guidelines,
guideline 2.1 App Completeness (a), same URL and fetch date:

> Submissions to App Review, including apps you make available for pre-order, should be final
> versions with all necessary metadata and fully functional URLs included; placeholder text, empty
> websites, and other temporary content should be scrubbed before submission.

### 1.3 Can the URL be changed without submitting a new app version? — **No.**

**This is the key finding.** The authoritative list is App Store Connect Help,
*Required, localizable, and editable properties*,
<https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties>,
fetched 2026-08-20. Its lead paragraph, verbatim:

> The tables below show the app and version properties required for App Store submission. The
> tables also indicate the properties that can be localized and edited at any time without
> submitting a new version of your app.

So the `Editable` column means exactly "editable at any time without submitting a new version."
The **App privacy** table on that page reads (checkmarks rendered as `figure class="icon
icon-checkcircle"` elements with `alt="Required"` / `alt="Localized"` / `alt="Editable"`; a blank
cell means no mark):

| Property | Required | Localized | Editable |
| --- | --- | --- | --- |
| Privacy Policy URL | ✓ | ✓ | *(blank)* |
| Privacy Choices URL | *(blank)* | ✓ | *(blank)* |
| Data Types | ✓ | *(blank)* | ✓ |

**The comparison the assessment asked for.** From the **App information** table on the same page:

| Property | Required | Localized | Editable |
| --- | --- | --- | --- |
| Name | ✓ | ✓ | *(blank)* |
| Subtitle | *(blank)* | ✓ | *(blank)* |
| License Agreement | *(blank)* | ✓ | ✓ |
| Primary Language | ✓ | *(blank)* | ✓ |
| Digital Services Act (DSA) Status | ✓ | *(blank)* | ✓ |

**Privacy Policy URL sits in the same class as Name** — required, localizable, *not* editable
without a new version. It is **not** in the "editable anytime" class that holds License Agreement,
Primary Language, DSA Status, Tax Category, or Data Types (the nutrition labels).

Apple states the consequence in prose too. From *Manage app privacy*, section "Entering privacy
policy information",
<https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy>,
fetched 2026-08-20 — the last line of the procedure, verbatim:

> Any changes to the URLs releases with your next app version.

and, earlier in the same section:

> The URLs for your iOS app and macOS app platform and the text for your tvOS app platform can be
> updated if your app is in an editable app status.

**"Editable app status" excludes a live app.** From App Store Connect Help,
*App and submission statuses*,
<https://developer.apple.com/help/app-store-connect/reference/app-information/app-and-submission-statuses>,
fetched 2026-08-20:

> If an app status indicates as editable below, you can edit app metadata when the app has this
> status.

Statuses that page marks editable: Prepare for Submission, Ready for Review, Invalid Binary,
Waiting for Review, Accepted, Waiting for Export Compliance, Rejected, Metadata Rejected,
Developer Rejected. Statuses **not** marked editable include **Ready for Distribution**, described
on that page as:

> Your app has been accepted and is ready for distribution.

— i.e. the status of a live app. Also non-editable: In Review, Pending Developer Release,
Processing for Distribution, Pending Apple Release.

**Practical reading.** For a live app, the field can be typed into only after a new version record
exists, and the new value ships when that version is released. Two operational consequences:

- **Editing the *content* at a stable URL is free and instant** — Apple's field points at a URL and
  Apple does not archive what is behind it (§5.2). Revising the notice text is a hosting operation,
  not an App Store operation.
- **Moving the URL costs a submission.** Pick a URL you can hold for the app's lifetime. This
  argues for a URL whose stability does not depend on repo visibility, repo name, or account plan
  (§4).

**UNVERIFIED:** whether App Store Connect's UI physically greys the field out on a live app, or
accepts a value that then sits pending until the next release. Apple's wording ("can be updated if
your app is in an editable app status" vs. "Any changes to the URLs releases with your next app
version") is compatible with either. Not resolvable from documentation; would need an actual App
Store Connect account to observe. Note that for two other properties Apple *does* spell out the
pending-until-submission behaviour explicitly (footnote 4 on the same properties page: "Can be
entered at any time, but will be submitted for review with the next version submission." — applied
to Availability in the Republic of Korea and Availability in China mainland), and it did **not**
attach that footnote to Privacy Policy URL.

### 1.4 Localization per territory / language

**Localizable per language, and Apple documents it as part of the per-language metadata set.**
The properties table marks Privacy Policy URL `Localized` (§1.3). From *Manage app privacy*,
same URL and fetch date:

> Note: You can localize the privacy policy URLs and text in all of the languages your app is
> available in.

From App Store Connect Help, *Localize app information*,
<https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information>,
fetched 2026-08-20 — the privacy policy URL is named as one of the two shared-metadata fields
entered per language:

> Enter the app name and privacy policy URL for the language or locale, then on the top right, click
> Save.

The App Store Connect API confirms the field lives on the *localization* entity, not the app:
`privacyPolicyUrl` is an attribute of `AppInfoLocalization`
(<https://developer.apple.com/documentation/appstoreconnectapi/appinfolocalization/attributes-data.dictionary>,
fetched 2026-08-20).

**Is a separate URL per localization *required*?** No. Apple documents the fallback behaviour for
localized metadata generally, from *Localize app information*, same URL and fetch date:

> For example, if you select English as the primary language for your app in App Store Connect, and
> it's the only language you provide, your app metadata will appear in English in all App Store
> countries or regions. … If no localization matches a user's language setting, the next most
> relevant localization is used. In other countries or regions, your metadata displays in the
> primary language (English in this example).

So one URL under the primary language suffices for App Store mechanics; per-language URLs are
*permitted*, not *demanded*. Note this is Apple's general localized-metadata rule and Apple does
not restate it specifically for the privacy policy URL — but the field is part of that same
localized metadata set, per the quote above.

Localization is by **language/locale, not by territory**: the supported set is listed at
<https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations>
(fetched 2026-08-20), which includes **Czech**, and states:

> Your app's metadata appears to the customers, and you can localize it in the following languages
> and locales: Arabic, Bangla, Catalan, Chinese (Simplified), Chinese (Traditional), Croatian,
> Czech, Danish, Dutch, English (Australia), … Ukrainian, Urdu, Vietnamese.

Caveat, same page:

> Note: The language displayed to users may vary based on their device and system settings.

**Not an Apple point, flagged for the assessment:** GDPR Art. 12(1) has its own intelligibility
requirement independent of what Apple's field permits. Out of scope for this document — no Apple
source addresses it.

### 1.5 Does Apple validate the URL at submission?

**Whether Apple's systems programmatically fetch and resolve the URL: NOT FOUND.** No Apple page
reviewed describes automated validation of the privacy policy URL (no "we will check that your URL
resolves", no documented validation error). The API types it as a plain `string`.

**But broken links are a documented rejection cause, and Apple lists it among the most common.**
From Apple's App Review page, section "Avoiding common issues" → "Broken links",
<https://developer.apple.com/app-store/review/>, fetched 2026-08-20 (rendered with a headless
browser; the page is JavaScript-driven and returns an empty body to plain fetches):

> **Broken links** — All links in your app must be functional. A link to user support with
> up-to-date contact information and a link to your privacy policy is required for all apps. View
> guideline 2.1 and guideline 5.1.

The same page also lists a dedicated privacy-policy rejection bucket:

> **Privacy policy issues** — Make sure your privacy policy adheres to guideline 5.1 and:
>
> - Identifies the data the app collects, how it collects that data, and all uses of that data.
> - Confirms that any third party with whom the app shares user data provides the same or equal
>   protection of user data as stated in the app's privacy policy.
> - Explains your data retention and deletion policies and describes how a user can revoke consent
>   and/or request deletion of their data.

And the guideline those point at, 5.1.1(i) in full (Review Guidelines, fetched 2026-08-20):

> All apps must include a link to their privacy policy in the App Store Connect metadata field and
> within the app in an easily accessible manner. The privacy policy must clearly and explicitly:
>
> - Identify what data, if any, the app/service collects, how it collects that data, and all uses of
>   that data.
> - Confirm that any third party with whom an app shares user data (in compliance with these
>   Guidelines)—such as analytics tools, advertising networks and third-party SDKs, as well as any
>   parent, subsidiary or other related entities that will have access to user data—will provide the
>   same or equal protection of user data as stated in the app's privacy policy and required by
>   these Guidelines.
> - Explain its data retention/deletion policies and describe how a user can revoke consent and/or
>   request deletion of the user's data.

Plus guideline 2.1(a)'s "fully functional URLs" (quoted in §1.2). Taken together: Apple does not
document a machine check, but a human reviewer following Apple's own published checklist is
directed to click the link. Treat a non-resolving policy URL as a live rejection risk, and do not
claim it is caught automatically.

**Note on the three mandated policy contents.** All three bullets bear directly on this app: it
must identify what it collects (eczema observations, meals, photos), confirm third-party protection
(the relevant third party is Apple itself, via CloudKit), and explain retention/deletion and how to
revoke consent. The third bullet overlaps the settings data-deletion work already recorded in
`docs/research/settings-data-deletion.md`.

---

## 2. The in-app requirement

### 2.1 Does Apple elaborate on "easily accessible" in-app? — **No.**

**NOT FOUND.** Searched, all fetched 2026-08-20:

- **App Store Review Guidelines** (<https://developer.apple.com/app-store/review/guidelines/>,
  full text, 95 KB extracted). The phrase "easily accessible" occurs exactly **twice** in the entire
  document. Once in 5.1.1(i) about the privacy policy (quoted above), and once in 5.1.1(ii)
  Permission, about a different obligation:

  > Apps must also provide the customer with an easily accessible and understandable way to withdraw
  > consent.

  Neither occurrence is defined. No tap count, no screen, no location.
- **Human Interface Guidelines → Privacy**
  (<https://developer.apple.com/design/human-interface-guidelines/privacy>, rendered headless).
  The phrase **"privacy policy" does not appear on the page at all** (other than in Apple's own
  site footer link). The page's "Best practices" section covers data minimization, transparency,
  on-device processing, and purpose strings — nothing about where to put a policy link. Its only
  App Store Connect statement is:

  > When you submit a new or updated app, you must provide details about your privacy practices and
  > the privacy-relevant data you collect so the App Store can display the information on your
  > product page. (You can manage this information at any time in App Store Connect.)

  — which is about the **nutrition labels**, not the policy (see §3.1 for why the parenthetical
  does not transfer to the policy URL).
- **Human Interface Guidelines → Settings**
  (<https://developer.apple.com/design/human-interface-guidelines/settings>, rendered headless):
  no mention of privacy policy or legal links.
- **App Review page** (<https://developer.apple.com/app-store/review/>): says the in-app link must
  be functional (§1.5); says nothing about its placement.
- **User privacy and data use** (<https://developer.apple.com/app-store/user-privacy-and-data-use/>):
  no placement guidance for the policy link.

**The nearest Apple analogue, explicitly labelled as _not_ privacy-policy guidance.** Apple has
written down what "easy to find" means for a *different* in-app obligation — account deletion under
5.1.1(v). From *Offering account deletion in your app*,
<https://developer.apple.com/support/offering-account-deletion-in-your-app/>, fetched 2026-08-20:

> - Make the account deletion option easy to find in your app. Typically, it's included in the app's
>   account settings.
> - …
> - If people need to visit a website to finish deleting their account, include a link directly to the
>   page on your website where they can complete the process.

This is **about account deletion, not the privacy policy.** Apple has not said the same of the
policy link. Cite it only as an analogue and label it as such; do not present "in Settings" as an
Apple requirement for the privacy policy. (It is, however, where this app's notice link is likely
to go anyway — that is a design choice, not a sourced obligation.)

### 2.2 Does embedded in-app text satisfy the "link … within the app" requirement?

**NOT FOUND.** Apple has not written down an answer either way.

What Apple *has* written, and why it does not resolve the question:

- **5.1.1(i) says "a link."** Verbatim: "All apps must include a link to their privacy policy in the
  App Store Connect metadata field and within the app in an easily accessible manner." The word
  "link" is used once and governs both placements grammatically. Apple never says whether a screen
  of text counts as "a link."
- **The ADPLA uses a broader formulation.** §3.3.3(C), p. 23, fetched 2026-08-20: "You must provide
  a privacy policy **in Your Application**, on the App Store, and/or on Your website…" (emphasis
  added). "In Your Application" with "and/or" reads permissively — but this is the *contract*, not
  the *review guideline*, and Apple nowhere states that satisfying the ADPLA satisfies 5.1.1(i).
  **Apple has never reconciled the two texts.** Do not treat the ADPLA phrasing as an
  interpretation of the guideline.
- **Apple accepts pasted policy text — but only on tvOS.** From *App information*, fetched
  2026-08-20: "Required for iOS and macOS apps. If your app has a tvOS platform, the text of your
  privacy policy in the Apple TV Privacy Policy field is required." And the API exposes both
  `privacyPolicyUrl` and `privacyPolicyText`. That Apple built a text-not-URL path *and scoped it to
  tvOS* is a fact worth recording; it is **not** a statement that embedded text works for iOS, and
  it concerns the App Store Connect field, not the in-app surface.
- **One ADPLA passage requires in-app viewing — for a case that does not apply here.** Schedule 1
  §3.6, p. 118, fetched 2026-08-20, on periodical-content auto-renewing subscriptions: developers
  must act "in strict compliance with Your publicly posted Privacy Policy, a copy of which must be
  **readily viewed and is consented to in Your Licensed Application**." This is the only Apple text
  found that requires the policy to be viewable *inside* the app — and it is conditional on
  periodical subscription content, which this app has none of. Noted for completeness; not
  applicable.

**Do not reason past this gap.** A design that embeds the full notice *and* also offers an outbound
link to the same text at the App Store Connect URL satisfies the literal wording of 5.1.1(i) under
any reading, and needs no interpretive claim about Apple's intent. That is an engineering
recommendation, not a sourced Apple position.

### 2.3 Is there Apple guidance on the policy being reachable offline / without a network?

**NOT FOUND.** No Apple source reviewed addresses offline reachability of the privacy policy. The
string "offline" does not appear in the Review Guidelines in connection with privacy or the policy.
The Review Guidelines, HIG Privacy, HIG Settings, App Review, App privacy details, User privacy and
data use, and all App Store Connect Help pages listed in §6 are silent.

Adjacent facts, neither of which is offline guidance:

- Apple requires links to be "functional" (guideline 2.1(a) and the App Review "Broken links"
  entry) — a statement about the link working, not about it working without a network.
- Apple's HIG Privacy page recommends on-device processing generally ("Process data on the device
  where possible"), which is about *user data*, not about *policy text*.

So: Apple neither requires nor blesses an offline-readable notice. If the app ships the notice text
in the bundle, that is a GDPR Art. 12(1) accessibility choice and a robustness choice, and cannot
be attributed to Apple.

---

## 3. Privacy nutrition labels vs the privacy policy

### 3.1 Two separate obligations? — **Yes, and Apple keeps them separate throughout.**

They are separate fields, separately required, with **opposite editability rules**.

**Separate fields, both required.** From the *Required, localizable, and editable properties*
App privacy table (§1.3): `Privacy Policy URL` and `Data Types` are distinct rows, both marked
Required, and only `Data Types` is marked Editable.

**Labels are required to submit.** From *App privacy details on the App Store*,
<https://developer.apple.com/app-store/app-privacy-details/>, fetched 2026-08-20:

> You'll need to provide information about your app's privacy practices, including the practices of
> third-party partners whose code you integrate into your app, in App Store Connect. This
> information is required to submit new apps and app updates to the App Store.

**Labels can be changed anytime; the policy URL cannot.** This is the sharpest documented contrast.
Same page, section "Answering app privacy questions", fetched 2026-08-20:

> You're responsible for keeping your responses accurate and up to date. If your practices change,
> update your responses in App Store Connect. **You may update your answers at any time, and you do
> not need to submit an app update in order to change your answers.**

(emphasis added) — against *Manage app privacy*'s "Any changes to the URLs releases with your next
app version" (§1.3). Confirmed by the properties table marking `Data Types` Editable and
`Privacy Policy URL` not.

The same asymmetry is echoed in the HIG, <https://developer.apple.com/design/human-interface-guidelines/privacy>,
fetched 2026-08-20 — note the parenthetical applies to the *labels*, which is what that sentence is
about:

> When you submit a new or updated app, you must provide details about your privacy practices and the
> privacy-relevant data you collect so the App Store can display the information on your product
> page. (You can manage this information at any time in App Store Connect.)

**Does the label page substitute for or constrain the policy's content?** No substitution is
documented; Apple lists both as required and specifies the policy's mandatory contents separately
in 5.1.1(i) (three bullets, §1.5). Apple does describe the *policy* as a place to add detail the
label cannot carry — from *App privacy details on the App Store*, "Additional guidance", under "You
collect different types of data from users depending on whether the user is a child, whether they
are a free or paid user, whether they opt in, where they live, or for some other reason", fetched
2026-08-20:

> Please disclose all data collected from your app, unless it meets all of the criteria outlined in
> the Optional Disclosure section. You may use the Privacy Choices or Privacy Policy links to provide
> additional detail about how your data collection practices may vary.

That positions the policy as *supplementary* to the label, not substitutive.

### 3.2 Is there a documented consistency requirement between labels and policy?

**A rule stated as "the label must match the policy": NOT FOUND.** Apple never writes that sentence.

What Apple *does* require, each separately:

- **The label must be accurate and current.** *App privacy details on the App Store*, fetched
  2026-08-20: "You're responsible for keeping your responses accurate and up to date. If your
  practices change, update your responses in App Store Connect." Repeated in *Manage app privacy*
  (fetched 2026-08-20) as a Note: "You're responsible for keeping your responses accurate and up to
  date. If your practices change, update your responses in App Store Connect."
- **The app's privacy practices must follow the Guidelines and law.** *App privacy details on the App
  Store*, fetched 2026-08-20: "Your app's privacy practices should follow the App Review Guidelines
  and all applicable laws."
- **Publishing labels requires an accuracy attestation.** From *Manage app privacy*, fetched
  2026-08-20, describing the publish dialog:

  > A dialog appears confirming that you agree that your responses are accurate, comply with the App
  > Review Guidelines and applicable law, and that you will promptly update your responses if your
  > data practices change.

- **Metadata generally, privacy information included, must be accurate.** Review Guidelines, lead-in
  to 2.3 Accurate Metadata, fetched 2026-08-20:

  > Customers should know what they're getting when they download or buy your app, so make sure all
  > your app metadata, including privacy information, your app description, screenshots, and previews
  > accurately reflect the app's core experience and remember to keep them up-to-date with new
  > versions.

**Reading, labelled as inference not citation:** each artefact must independently be accurate about
the same underlying practices, which makes a label/policy contradiction a failure of at least one of
them. Apple does not say this. **UNVERIFIED** as an Apple position; treat the two consistency
obligations as separate-but-converging, and keep the two artefacts in sync as a matter of engineering
discipline rather than because Apple demanded it in words.

**Relevant to this app specifically.** Apple addresses CloudKit in the label guidance — from *App
privacy details on the App Store*, "Additional guidance", under "You use Apple frameworks or
services, such as MapKit, CloudKit, or App Analytics", fetched 2026-08-20:

> If you collect data about your app from Apple frameworks or services, you should indicate what data
> you collect and how you use it. You are not responsible for disclosing data collected by Apple.

And the label's "Health" data type is defined broadly — same page, "Types of data" → "Health &
Fitness", fetched 2026-08-20:

> **Health** — Health and medical data, including but not limited to data from the Clinical Health
> Records API, HealthKit API, Movement Disorder API, or health-related human subject research or any
> other user provided health or medical data

Also relevant, "Sensitive Info" — same page, same fetch date:

> **Sensitive Info** — Such as racial or ethnic data, sexual orientation, **pregnancy or childbirth
> information**, disability, religious or philosophical beliefs, trade union membership, political
> opinion, genetic information, or biometric data

(emphasis added). Apple's definition of "collect" bounds all of this — same page, same fetch date:

> "Collect" refers to transmitting data off the device in a way that allows you and/or your
> third-party partners to access it for a period longer than what is necessary to service the
> transmitted request in real time.

Whether writing to the developer's own CloudKit private database counts as the developer
"collecting" is exactly the open question already recorded in
`docs/research/app-store-5-1-3-cloudkit.md`. Not re-litigated here; the label wording above is
supplied so that document's analysis can reuse the verbatim definitions.

---

## 4. Hosting options — factual checks only

### 4.1 GitHub Pages and private repositories

**Pages works from a private repository, but only on a paid plan.** From GitHub Docs,
*What is GitHub Pages?*,
<https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages>,
fetched 2026-08-20, under "Who can use this feature?":

> GitHub Pages is available in public repositories with GitHub Free and GitHub Free for
> organizations, and in public and private repositories with GitHub Pro, GitHub Team, GitHub
> Enterprise Cloud, and GitHub Enterprise Server. See GitHub's plans.

That same sentence appears verbatim on
<https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site>,
<https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https>,
and <https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages>
(all fetched 2026-08-20).

**So for a solo developer: GitHub Free + private repo = no Pages. GitHub Pro (paid) + private repo =
Pages works.** GitHub's plans page confirms the split — from
<https://docs.github.com/en/get-started/learning-about-github/githubs-plans>, fetched 2026-08-20,
GitHub Free for personal accounts lists:

> GitHub Pages in public repositories

while GitHub Pro adds, among "Advanced tools and insights in private repositories":

> GitHub Pages

**Critical distinction — a *private repo* still yields a *public site*.** From
*Configuring a publishing source*, fetched 2026-08-20, a Warning box:

> GitHub Pages sites are publicly available on the internet, even if the repository for the site is
> private (if your plan or organization allows it). If you have sensitive data in your site's
> repository, you may want to remove the data before publishing.

The same Warning appears verbatim on the HTTPS page (fetched 2026-08-20). **This is the
configuration that fits the requirement** — Apple wants a "publicly accessible" URL (§1.2) and a
private repo publishing a public site delivers exactly that.

**Privately *published* sites require GitHub Enterprise Cloud and would break the Apple
requirement.** From GitHub Docs, *Changing the visibility of your GitHub Pages site*,
<https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site>,
fetched 2026-08-20:

> With access control for GitHub Pages, you can restrict access to your project site by publishing the
> site privately. A privately published site can only be accessed by people with read access to the
> repository the site is published from.

and:

> Note: To publish a GitHub Pages site privately, your organization must use GitHub Enterprise Cloud.

Echoed on the plans page (fetched 2026-08-20): "To publish a GitHub Pages site privately, you need to
have an organization account. Additionally, your organization must use GitHub Enterprise Cloud."

A privately published site is unusable here: Apple requires the URL be publicly accessible, and a
private site is readable only by people with repo read access. **Repo visibility is therefore
orthogonal to the policy URL's reachability** — the repo can be private (on Pro or above) while the
notice stays world-readable. That answers the undecided-visibility concern: private repo does not
force a hosting change, it only forces a plan change.

### 4.2 GitHub Pages HTTPS

**HTTPS is automatic on `github.io`, and enforceable on custom domains.** From GitHub Docs,
*Securing your GitHub Pages site with HTTPS*,
<https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https>,
fetched 2026-08-20:

> All GitHub Pages sites, including sites that are correctly configured with a custom domain, support
> HTTPS and HTTPS enforcement.

and:

> GitHub Pages sites created after June 15, 2016, and using github.io domains are served over HTTPS
> automatically.

Enforcement for custom domains is a setting ("Under 'GitHub Pages,' select **Enforce HTTPS**"), with
certificates from Let's Encrypt:

> If the check is successful, GitHub queues a job to request a TLS certificate from Let's Encrypt.

Privately published sites get HSTS too — from *Changing the visibility…*, fetched 2026-08-20:

> We automatically secure every subdomain of *.pages.github.io with a TLS certificate, and enforce
> HSTS to ensure that browsers always serve the page over HTTPS.

**Caveat GitHub itself states**, from the HTTPS page and repeated on *GitHub Pages limits*, fetched
2026-08-20:

> GitHub Pages sites shouldn't be used for sensitive transactions like sending passwords or credit card
> numbers.

Not a problem for a static notice — it is a read-only document with no form submission.

### 4.3 GitHub Pages uptime / SLA

**There is no uptime or SLA commitment. GitHub disclaims availability explicitly.** From the GitHub
Terms of Service, §O "Disclaimer of Warranties",
<https://docs.github.com/en/site-policy/github-terms/github-terms-of-service>, fetched 2026-08-20
(page states "Effective date: April 27, 2026"):

> GitHub provides the Website and the Service "as is" and "as available," without warranty of any kind.
> Without limiting this, we expressly disclaim all warranties, whether express, implied or statutory,
> regarding the Website and the Service including without limitation any warranty of merchantability,
> fitness for a particular purpose, title, security, accuracy and non-infringement.

> GitHub does not warrant that the Service will meet your requirements; that the Service will be
> uninterrupted, timely, secure, or error-free; … that the Service will be available at any particular
> time or location; …

**And Pages carries documented usage limits including an explicit commercial-use restriction.** From
GitHub Docs, *GitHub Pages limits*,
<https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits>,
fetched 2026-08-20:

> GitHub Pages is not intended for or allowed to be used as a free web-hosting service to run your
> online business, e-commerce site, or any other website that is primarily directed at either
> facilitating commercial transactions or providing commercial software as a service (SaaS).

> GitHub Pages sites are subject to the following usage limits:
>
> - You can only create one user or organization site for each account on GitHub.
> - GitHub Pages source repositories have a recommended limit of 1 GB. …
> - Published GitHub Pages sites may be no larger than 1 GB.
> - GitHub Pages deployments will timeout if they take longer than 10 minutes.
> - GitHub Pages sites have a soft bandwidth limit of 100 GB per month.
> - GitHub Pages sites have a soft limit of 10 builds per hour. This limit does not apply if you build
>   and publish your site with a custom GitHub Actions workflow.
> - In order to provide consistent quality of service for all GitHub Pages sites, rate limits may
>   apply. … If your request triggers rate limiting, you will receive an appropriate response with an
>   HTTP status code of 429, along with an informative HTML body.

> If your site exceeds these usage quotas, we may not be able to serve your site, or you may receive a
> polite email from GitHub Support suggesting strategies for reducing your site's impact on our
> servers…

**Assessment-relevant reading, flagged as inference:** a privacy notice is not a commercial
transaction or SaaS, so the commercial restriction on its face does not bite; the volume limits are
far above what a single static page would consume. **UNVERIFIED** whether GitHub would view hosting
the notice for a *distributed app* as within the restriction — GitHub has not written on the point,
and this document does not guess. The absence of an SLA is the harder fact: if the URL is
unreachable, Apple's "fully functional URLs" expectation (guideline 2.1(a), §1.2) is at risk and the
URL cannot be swapped without a version submission (§1.3). Those two facts compound.

**Non-primary note, labelled as such:** GitHub publishes a live status page and historical incident
record at <https://www.githubstatus.com/>. That is an operational dashboard, **not** a contractual
SLA, and was not fetched for this document. Do not cite it as a commitment.

### 4.4 Apple documentation on hosting requirements for the policy URL

**NOT FOUND.** No Apple source reviewed imposes any hosting requirement on the privacy policy URL —
no requirement that it be on a domain you control, no prohibition on third-party or free hosting, no
first-party-domain rule, no requirement that it match the app's support or marketing URL domain.

Apple's total specification of the target, assembled from every statement located:

- "A URL that links to your company's privacy policy." (*App privacy*, fetched 2026-08-20)
- "The URL to your **publicly accessible** privacy policy." (*App privacy details on the App Store*,
  fetched 2026-08-20)
- It must be functional (guideline 2.1(a); App Review "Broken links", both fetched 2026-08-20).
- Typed as `string` in the App Store Connect API (fetched 2026-08-20).

That is all. Searched for hosting/domain constraints across: the Review Guidelines (full text),
*App privacy*, *App information*, *Manage app privacy*, *Required, localizable, and editable
properties*, *App privacy details on the App Store*, *User privacy and data use*, the App Review
page, and the Apple Developer Program License Agreement (full PDF, all "privacy polic" occurrences
inspected). Nothing.

The ADPLA's §3.3.3(C) is if anything the opposite of a hosting constraint — "in Your Application, on
the App Store, and/or on **Your website**" contemplates a website but does not say whose
infrastructure serves it.

**So `<owner>.github.io/<repo>` is not documented as disqualified.** But note the stability
interaction from §1.3: a default Pages URL embeds the account name and repo name, and both are
things that can change. A custom domain decouples the URL from GitHub's namespace and from repo
naming, which matters precisely because moving the URL costs a version submission. That is an
engineering observation, not an Apple requirement.

---

## 5. Versioning a privacy notice

### 5.1 Does Apple require or document versioning of the privacy policy?

**No — NOT FOUND.** As predicted. No Apple source reviewed requires a version number, an effective
date, a "last updated" line, a changelog, or any change-notification mechanism for the privacy
policy.

Searched, all fetched 2026-08-20: the Review Guidelines (full text — 5.1.1(i)'s three mandated
contents, quoted in §1.5, do not include versioning or dating), *App privacy*, *App information*,
*Manage app privacy*, *Required, localizable, and editable properties*, *App privacy details on the
App Store*, *User privacy and data use*, the App Review page, and the ADPLA (§3.3.3(C) and Schedule 1
§2.1 both quoted in §1.1 — neither mentions versioning).

What Apple *does* require is currency, and only of the **nutrition labels** and metadata generally,
not of the policy document:

- "You're responsible for keeping your responses accurate and up to date. If your practices change,
  update your responses in App Store Connect." (*App privacy details on the App Store*, about label
  responses)
- "…make sure all your app metadata, including privacy information … accurately reflect the app's core
  experience and remember to keep them up-to-date with new versions." (Review Guidelines, 2.3
  lead-in)

Neither is a versioning requirement for the policy text.

**Note the contrast with GDPR.** Art. 13 has no versioning requirement as such either, but Art. 12(1)
transparency and Art. 5(2) accountability make a dated, retained history of notice versions the
practical way to evidence what a data subject was told and when. That obligation, if it exists, comes
from the Regulation and from the controller's own accountability posture — **not** from Apple.
Sourcing it to Apple would be wrong.

### 5.2 Does Apple record or archive the policy URL's *content* at submission time?

**NOT FOUND — and there is affirmative reason to believe it does not, for iOS.** No Apple source
states that Apple fetches, snapshots, archives, or retains a copy of the privacy policy page's
content.

The mechanism argues against it: for iOS and macOS the field stores a **URL**, not text (§1.1). Apple
holds a pointer. The one place Apple demonstrably holds the *content* is **tvOS**, where the field is
`privacyPolicyText` — from *Manage app privacy*, fetched 2026-08-20: "If your app includes a tvOS
platform, enter the text of your privacy policy in the Apple TV Privacy Policy field." An iOS-only app
gives Apple nothing but the URL.

Corollaries, stated plainly because they matter for the assessment:

- **Editing the content behind a stable URL is invisible to Apple's records.** There is no App Store
  archive of what the notice said at submission. Nothing on Apple's side to point at later.
- **Therefore the developer is the only party retaining the notice's history.** If evidencing "what
  the notice said on date X" matters — and under GDPR accountability it plausibly does — that record
  has to be kept locally. Version-controlling the notice in the repo, with commit dates, produces
  exactly that record as a side effect. **That is an engineering recommendation, not an Apple or
  GDPR citation.**
- **The App Store product page does show the label responses** ("Your responses will be published on
  your product page on the App Store", *Manage app privacy*, fetched 2026-08-20) — but that is the
  labels, and Apple documents no historical archive of those either.

**UNVERIFIED:** whether App Review internally screenshots or caches the policy page during review for
its own case records. Apple does not document its internal review artefacts, and this is not
observable from outside. Do not assume either way.

---

## Gaps

Everything that came back **NOT FOUND** or **UNVERIFIED**. Each is a place where no primary source
exists, and where a confident claim would be a fabrication.

### NOT FOUND — Apple has not written it down

| # | Question | Section |
| --- | --- | --- |
| G1 | Whether the privacy policy URL must use **HTTPS**. Apple says "publicly accessible" but never says HTTPS; the API types the field as a plain `string`. | §1.2 |
| G2 | Whether Apple **programmatically validates / fetches** the URL at submission. Broken links are a documented *rejection* cause, which is not the same as documented automated validation. | §1.5 |
| G3 | Any elaboration of what **"easily accessible" in-app** means — no tap count, no screen, no location, no settings rule. The phrase occurs twice in the whole Review Guidelines and is undefined both times. HIG Privacy does not contain the phrase "privacy policy" at all. | §2.1 |
| G4 | Whether **embedded in-app text** satisfies "a link … within the app." 5.1.1(i) says "link"; the ADPLA says "in Your Application"; Apple has never reconciled them. The one pasted-text field Apple built is scoped to tvOS. | §2.2 |
| G5 | Any guidance on the policy being reachable **offline / without a network**. Complete silence across every source reviewed. | §2.3 |
| G6 | A stated **consistency requirement between nutrition labels and policy text**. Apple requires each to be accurate, separately; it never writes "these must match." | §3.2 |
| G7 | Any **hosting requirement** for the policy URL — no domain-you-control rule, no ban on third-party or free hosting, no domain-match rule. | §4.4 |
| G8 | Any **versioning requirement** for the privacy policy — no version number, effective date, "last updated" line, changelog, or change-notification obligation. | §5.1 |
| G9 | Any Apple mechanism that **archives the policy URL's content** at submission. For iOS, Apple stores a URL, not text. | §5.2 |

### UNVERIFIED — could not be settled from documentation

| # | Item | Section |
| --- | --- | --- |
| U1 | Whether App Store Connect's UI **greys out** the policy URL field on a live app, or accepts a value that sits pending until the next release. Apple's two statements are compatible with either. Would need an actual App Store Connect account to observe. Notably, Apple *does* spell out pending-until-submission behaviour for two other properties via footnote, and did not attach that footnote here. | §1.3 |
| U2 | Whether the label/policy consistency inference (a contradiction between them must mean at least one is inaccurate) is Apple's position. It is *this document's* inference from two separately-sourced accuracy duties, and is labelled as such. | §3.2 |
| U3 | Whether **GitHub** would consider hosting a distributed app's privacy notice to fall within the Pages "not intended … to run your online business" restriction. GitHub has not written on the point. | §4.3 |
| U4 | Whether **App Review internally** screenshots or caches the policy page for its own case records. Apple does not document internal review artefacts; not observable externally. | §5.2 |
| U5 | GitHub's **operational uptime history** was not fetched. <https://www.githubstatus.com/> exists but is a dashboard, not a contractual SLA. Non-primary, uncited. | §4.3 |

### Facts that exist but must not be over-read

- The **account-deletion "easy to find … typically in the app's account settings" guidance is about
  account deletion**, not the privacy policy (§2.1). It is an analogue only. Citing it as
  privacy-policy placement guidance would misattribute it.
- The **ADPLA's "in Your Application, on the App Store, and/or on Your website"** is contract
  language, not an interpretation of guideline 5.1.1(i) (§2.2).
- The **HIG's "You can manage this information at any time in App Store Connect"** parenthetical is
  about the **nutrition labels**, and does not transfer to the policy URL — which explicitly cannot
  be managed at any time (§3.1 vs §1.3).
- The **tvOS `privacyPolicyText` field** shows Apple *can* accept pasted policy text, but Apple scoped
  it to tvOS and it concerns the App Store Connect field, not the in-app surface (§2.2).
- **ADPLA Schedule 1 §3.6's** in-app "readily viewed" requirement is conditional on periodical
  auto-renewing subscription content, which this app does not have (§2.2).

---

## 6. Sources

All fetched **2026-08-20**. Apple and GitHub sources are primary; anything else is labelled
non-primary in place. Pages marked *(headless)* are JavaScript-driven and return an empty body to a
plain HTTP fetch — they were rendered in a headless browser to read the text.

### Apple — primary

| Source | URL |
| --- | --- |
| App Store Review Guidelines (states "Last Updated: June 8, 2026") | <https://developer.apple.com/app-store/review/guidelines/> |
| App Review — "Avoiding common issues" *(headless)* | <https://developer.apple.com/app-store/review/> |
| ASC Help — Required, localizable, and editable properties | <https://developer.apple.com/help/app-store-connect/reference/app-information/required-localizable-and-editable-properties> |
| ASC Help — App privacy (Reference) | <https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy> |
| ASC Help — App information (Reference) | <https://developer.apple.com/help/app-store-connect/reference/app-information/app-information> |
| ASC Help — Manage app privacy | <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy> |
| ASC Help — App and submission statuses | <https://developer.apple.com/help/app-store-connect/reference/app-information/app-and-submission-statuses> |
| ASC Help — Localize app information | <https://developer.apple.com/help/app-store-connect/manage-app-information/localize-app-information> |
| ASC Help — App Store localizations (Czech listed) | <https://developer.apple.com/help/app-store-connect/reference/app-information/app-store-localizations> |
| ASC Help — View and edit app information | <https://developer.apple.com/help/app-store-connect/create-an-app-record/view-and-edit-app-information> |
| ASC Help — Create a new version | <https://developer.apple.com/help/app-store-connect/update-your-app/create-a-new-version> |
| App privacy details on the App Store | <https://developer.apple.com/app-store/app-privacy-details/> |
| User privacy and data use | <https://developer.apple.com/app-store/user-privacy-and-data-use/> |
| Offering account deletion in your app | <https://developer.apple.com/support/offering-account-deletion-in-your-app/> |
| HIG — Privacy *(headless)* | <https://developer.apple.com/design/human-interface-guidelines/privacy> |
| HIG — Settings *(headless)* | <https://developer.apple.com/design/human-interface-guidelines/settings> |
| ASC API — `AppInfoLocalization.Attributes` *(headless)* | <https://developer.apple.com/documentation/appstoreconnectapi/appinfolocalization/attributes-data.dictionary> |
| Apple Developer Program License Agreement (PDF, full text) | <https://developer.apple.com/support/downloads/terms/apple-developer-program/Apple-Developer-Program-License-Agreement-English.pdf> |
| Apple Developer — Terms and Conditions index | <https://developer.apple.com/support/terms/> |

### GitHub — primary

| Source | URL |
| --- | --- |
| What is GitHub Pages? | <https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages> |
| About GitHub Pages | <https://docs.github.com/en/pages/getting-started-with-github-pages/about-github-pages> |
| Configuring a publishing source for your GitHub Pages site | <https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site> |
| Securing your GitHub Pages site with HTTPS | <https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https> |
| Changing the visibility of your GitHub Pages site | <https://docs.github.com/en/pages/getting-started-with-github-pages/changing-the-visibility-of-your-github-pages-site> |
| GitHub Pages limits | <https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits> |
| GitHub's plans | <https://docs.github.com/en/get-started/learning-about-github/githubs-plans> |
| GitHub Terms of Service (states "Effective date: April 27, 2026") | <https://docs.github.com/en/site-policy/github-terms/github-terms-of-service> |

### Non-primary — mentioned, not cited as authority

| Source | Why it appears | Status |
| --- | --- | --- |
| <https://www.githubstatus.com/> | Named in §4.3 only to say an operational dashboard exists and is **not** an SLA. Not fetched, not relied on. | Non-primary, uncited |

### Related documents in this repo

- `docs/research/app-store-5-1-3-cloudkit.md` — the unresolved question of whether 5.1.3(ii)'s
  "iCloud" reaches an app's own CloudKit private database. §3.2 above supplies Apple's verbatim
  "Health", "Sensitive Info", and "collect" label definitions for reuse there.
- `docs/research/settings-data-deletion.md` — 5.1.1(i)'s third mandated content (retention/deletion,
  revoking consent) overlaps that work.
- `docs/research/gdpr-dpia-assessment.md` — the Art. 13 notice this research feeds.
