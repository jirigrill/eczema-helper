# App Store Privacy Nutrition Labels and an app's own CloudKit private database

Research for [issue #775](https://github.com/jirigrill/eczema-helper/issues/775) on the wayfinder
map [#672](https://github.com/jirigrill/eczema-helper/issues/672). Gates the App Store Connect
submission metadata for the planned native iOS app (SwiftUI + SwiftData + CloudKit private
database, no backend, no analytics, no third-party SDKs).

**Retrieved 2026-08-31.** Every claim below is traced to an Apple-authored page with a URL. Apple's
pages carry no "last updated" stamp; where a page has been dated by Apple, the date is given.
Anything not traceable to an Apple source is labelled **UNVERIFIED** in place.

## Overview

**The core question has a primary-source answer, and the answer is that the app may declare
"Data Not Collected" — but the answer is derived from Apple's definition of "collect" rather than
stated by Apple about CloudKit.**

Three findings do the work:

1. **Apple defines "collect" as an access condition, not a location condition.** The definition is
   *"transmitting data off the device in a way that allows **you and/or your third-party partners
   to access it**"*. A CloudKit private database transmits data off the device, so the first limb is
   met; but the developer cannot access private-database content — Apple's own CloudKit
   documentation says *"Data in the private database isn't visible in the developer portal"* — so
   the second limb is not. On the definition's own terms this is not collection.
2. **CloudKit private database appears nowhere in Apple's label guidance.** "CloudKit" occurs
   exactly once on the App Privacy Details page, and in the opposite direction to the question
   asked: it is about *data Apple collects about your app*, with the sentence *"You are not
   responsible for disclosing data collected by Apple."* The words "iCloud", "encrypt", "private
   database" and "end-to-end" do not occur on that page at all. There is no carve-out naming
   iCloud, and no clause requiring disclosure of it either. **The silence cuts both ways.**
3. **The closest thing to an Apple ruling is an Apple consumer FAQ about Apple's own apps**, and it
   supports non-disclosure of cloud-backed data *when the backup is outside the app*. Apple says
   Photos and Messages *"don't declare the data types that are backed up in their privacy
   information section"* while iMovie, which backs up *inside* the app, does. This app's sync is
   inside the app, so **the analogy runs against us** — see §6, which is why the recommendation
   below is not a bare "Data Not Collected".

**Recommended declaration: declare, do not claim "Data Not Collected".** Not because Apple's
definition demands it, but because (a) the label is cheap to be wrong in the conservative direction
and expensive to be wrong in the permissive direction, (b) 5.1.3(ii) is unsettled
([#675](https://github.com/jirigrill/eczema-helper/issues/675)) and a "Data Not Collected" label is
an affirmative public statement a reviewer can contradict, and (c) the iMovie analogy is the only
Apple text that addresses in-app cloud backup at all and it points at declaring. Detail in §7.

**Over-declaring is close to costless and fully reversible.** Apple states plainly: *"You may
update your answers at any time, and you do not need to submit an app update in order to change
your answers."* This is the opposite of the Privacy Policy URL, where Apple says *"Any changes to
the URLs releases with your next app version"* — the asymmetry #709 asked about is confirmed in
Apple's own text (§8).

**What stays unanswered:** whether Apple's *reviewers* treat an app's own CloudKit private database
as collection. Apple has never written it down in either direction. §9 states the residual risk and
what would resolve it.

---

## 1. Sources used, and their status

| Source | URL | Role |
| --- | --- | --- |
| App privacy details on the App Store | <https://developer.apple.com/app-store/app-privacy-details/> | **The primary text.** Defines "collect", the data types, optional disclosure, linkage, tracking, and the additional guidance. |
| Manage app privacy (App Store Connect Help) | <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy> | The mechanics: the "no data" path, publishing, editing after the fact. |
| App privacy (ASC Help reference) | <https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy> | Property reference; confirms Privacy Policy URL required, Privacy Choices URL optional. |
| App Review Guidelines | <https://developer.apple.com/app-store/review/guidelines/> | 2.3 Accurate Metadata; 5.1.1 (privacy policy content); 5.1.3(ii). |
| CKContainer.privateCloudDatabase | <https://developer.apple.com/documentation/cloudkit/ckcontainer/privateclouddatabase> | Developer-visibility of private-database data. |
| Encrypting user data (CloudKit) | <https://developer.apple.com/documentation/cloudkit/encrypting-user-data> | Key material lives in the user's iCloud Keychain. |
| Describing data use in privacy manifests | <https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests> | The manifest counterpart of the label. |
| Privacy information for Apple apps (Apple Support) | <https://support.apple.com/en-us/102399> | The cloud-backup FAQ. Reached from <https://support.apple.com/kb/HT211970>. |
| Apple's own labels index | <https://www.apple.com/privacy/labels/> | Where the literal string "Data Not Collected" is used in production. |

Two URL notes, so this is reproducible:

- `https://developer.apple.com/support/app-privacy-on-the-app-store/` **301-redirects** to
  `https://developer.apple.com/app-store/app-privacy-details/`. They are one page.
- `https://developer.apple.com/help/app-store-connect/manage-app-privacy/...` paths **404**. The
  live path is `.../help/app-store-connect/manage-app-information/manage-app-privacy`. Any secondary
  write-up citing the old path is citing a dead URL.

---

## 2. "Collect", verbatim

Both statements are from <https://developer.apple.com/app-store/app-privacy-details/>, retrieved
2026-08-31.

The **primary definition**, under the heading *Data collection*:

> "Collect" refers to transmitting data off the device in a way that allows you and/or your
> third-party partners to access it for a period longer than what is necessary to service the
> transmitted request in real time.

The **second definition**, under *Additional guidance*, heading *"You collect data to service a
request but do not retain it after servicing the request."*:

> "Collect" refers to transmitting data off the device and storing it in a readable form for longer
> than the time it takes you and/or your third-party partners to service the request. For example,
> if an authentication token or IP address is sent on a server call and not retained, or if data is
> sent to your servers then immediately discarded after servicing the request, you do not need to
> disclose this in your answers in App Store Connect.

Apple gives the term two definitions, and **they are not identical**. That matters here, so both are
parsed.

### 2.1 The primary definition has two limbs

Read as a test, the primary definition requires:

- **(a) transmission off the device** — and
- **(b) in a way that allows *you and/or your third-party partners* to access it** — for
- **(c) longer than real-time servicing of the request.**

Against a CloudKit private database:

| Limb | Met? | Why |
| --- | --- | --- |
| (a) off-device transmission | **Yes** | CloudKit is a network service. The record leaves the device. |
| (b) access by *you* or *your third-party partners* | **No** | The developer has no read path to private-database content (§4). Apple is not a "third-party partner" as Apple defines that term (§2.3). |
| (c) longer than real time | **Yes** | It is durable storage by design. |

The definition is conjunctive — "off the device **in a way that allows** … to access it". Limb (b)
failing is sufficient to fail the test. **On the primary definition, this app does not collect.**

The load-bearing word is **"allows you … to access"**. Apple could have written "transmitting data
off the device" full stop, and did not. It could have written "off the device to a server" and did
not — it wrote an access condition. That is the reading on which "Data Not Collected" stands or
falls.

### 2.2 The second definition is weaker for us

The *Additional guidance* restatement drops the access clause and substitutes **"storing it in a
readable form"**:

> "Collect" refers to transmitting data off the device and **storing it in a readable form** for
> longer than the time it takes you and/or your third-party partners to service the request.

Two problems.

1. **"Readable" is unqualified — readable by whom is not stated.** Health-diary records in CloudKit
   are readable *by the user*, on any of her devices; that is the whole point of sync. If "readable
   form" means "not discarded, not hashed away", the data qualifies and this definition is met.
   With CloudKit encrypted fields (`encryptedValues`, decided in
   [#714](https://github.com/jirigrill/eczema-helper/issues/714)) the records are **not** readable
   by Apple's servers or by the developer, which is a genuine distinction — but Apple's text does
   not say that is the relevant reader.
2. **It appears under a heading about ephemeral request servicing**, so it is arguably scoped to
   that scenario rather than offered as a general redefinition. That reading is favourable to us but
   is **inference, not Apple's statement.**

**Consequence:** the two definitions do not agree on this app. The primary one says "not collected";
the *Additional guidance* one, read literally and out of its heading's context, may say "collected".
This is the single strongest argument against a bare "Data Not Collected" label, and it is internal
to Apple's own page.

### 2.3 "Third-party partners" excludes Apple

Immediately after the primary definition:

> "Third-party partners" refers to analytics tools, advertising networks, third-party SDKs, or other
> external vendors whose code you've added to your app.

CloudKit is a first-party Apple framework, not a vendor SDK the developer added. So Apple's own
access to the data — whatever it is — is not routed into the developer's disclosure duty via the
"third-party partners" limb. This is reinforced by the *Additional guidance* entry at §3.2:
*"You are not responsible for disclosing data collected by Apple."*

### 2.4 The on-device carve-out does not apply, and it is instructive that it does not

Under *Additional guidance*, heading *"You use location, device identifiers, and other sensitive
data, but only on device, and the data is never sent to a server."*:

> Data that is processed only on device is not "collected" and does not need to be disclosed in your
> answers. If you derive anything from that data and send it off device, the resulting data should
> be considered separately.

**This carve-out does not cover us.** CloudKit sync means the data is not "only on device". Anyone
citing this passage for a CloudKit-syncing app is citing the wrong passage.

Note what this shows about the structure of Apple's thinking: the on-device carve-out is written as
a *location* rule ("never sent to a server"), while the primary definition is written as an *access*
rule. Apple has not reconciled the two, and the gap between them is exactly where an app's own
CloudKit private database sits.

---

## 3. "Data Not Collected": where the phrase actually lives

### 3.1 It is not developer-facing wording

**The string "Data Not Collected" does not appear on the App Privacy Details page at all.** Nor does
it appear in App Store Connect Help. It is the *consumer-facing* rendering of a developer answer.

The developer-facing wording is a radio button. From
<https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy>,
under *Answering app privacy questions*:

> 4. In the dialog that appears, indicate whether you or your third-party partners collect data from
>    your app.
> 5. If the answer is no, select **"No, we do not collect data from this app"** and then click Save.
>    You don't need to answer any further questions.
> 6. If the answer is yes, select "Yes, we collect data from this app" and then click Next.
> 7. Select all of the data you or your third-party partners collect from this app and click Save.

So the declaration is **binary at the top level**: one dialog, one yes/no, and "no" terminates the
questionnaire. There is no "stored in the user's own iCloud" option, no third path, and no free-text
field in which to explain the CloudKit architecture. That structural fact is itself part of the
answer to #775: **Apple's form does not offer the nuance the question is about.**

The consumer rendering is visible in production on <https://www.apple.com/privacy/labels/>, where
apps such as Activity Monitor, Chess, Terminal and Disk Utility carry:

> Data Not Collected
>
> The developer does not collect any data from this app.

The machine token behind it on that page is `DATA_NOT_COLLECTED`. Note the consumer sentence is an
*absolute* claim — "does not collect **any** data from this app" — which is what makes it a
reputational and review-surface statement rather than a neutral omission (§7.4).

### 3.2 What Apple says the label is *for*

From the App Privacy Details page, *Data collection*:

> The purpose of the label is to help your customers understand what data is collected from your app
> and how it is used. To complete that, you'll need to know the types of data that you and/or your
> third-party partners collect from your app before answering the questions in App Store Connect.
> **Keep in mind that even if you collect the data for reasons other than analytics or advertising,
> it still needs to be declared.** For example, if you collect data solely for the purpose of app
> functionality, declare the data on your label and indicate that it is only being used for that
> purpose.

**This passage forecloses one tempting argument.** "The data is only used to make the app work, not
to profile anyone" is *not* a ground for non-disclosure. Apple names that exact case and says declare
it, tagging the purpose as App Functionality. So if the CloudKit write is collection at all, the
record-only, no-analytics nature of this app buys nothing on the label — it only changes the
*purpose* answer.

And from *Answering app privacy questions*:

> You need to identify all of the data you or your third-party partners collect, unless the data
> meets all of the criteria for optional disclosure listed below.
>
> Your app's privacy practices should follow the App Review Guidelines and all applicable laws.

The CloudKit guidance, in full, under *Additional guidance*, heading *"You use Apple frameworks or
services, such as MapKit, CloudKit, or App Analytics."*:

> If you collect data about your app from Apple frameworks or services, you should indicate what data
> you collect and how you use it. You are not responsible for disclosing data collected by Apple.

**This is the only occurrence of "CloudKit" on the page.** It is about the developer collecting data
*about the app* via Apple services — the App Analytics case — and it does not address storing user
content in a private database. It is not a carve-out for CloudKit storage, and it is not a
requirement to declare it. It is orthogonal.

### 3.3 The words that do not appear at all

Measured on the fetched HTML of <https://developer.apple.com/app-store/app-privacy-details/>,
2026-08-31:

| Term | Occurrences |
| --- | --- |
| `iCloud` | **0** |
| `encrypt` (any form) | **0** |
| `private database` | **0** |
| `end-to-end` | **0** |
| `Data Not Collected` | **0** |
| `CloudKit` | 1 (the App Analytics-flavoured passage in §3.2) |
| `on device` | 2 (the carve-out at §2.4, and the tracking carve-out) |

**Answering #775's second bullet directly: no, the CloudKit private database does not appear in
Apple's label guidance.** Neither does iCloud, in any form. There is no carve-out for data the
developer cannot read and no carve-out for data residing in the user's own iCloud — and equally, no
sentence requiring their disclosure. Apple's label documentation simply does not contemplate the
architecture.

### 3.4 The privacy manifest says the same thing, with the same gap

<https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests>:

> Declare the data collected by your app or by third-party SDKs. Record the categories of data that
> your app or third-party SDK collects about the person using the app, and the reasons it collects
> the data.

and

> The privacy report is organized in a similar way to Privacy Nutrition Labels. Refer to this report
> when you provide your app's privacy details in App Store Connect.

The manifest is downstream of the same "collects" concept and adds no definition of its own. It also
notes *"Your app's privacy manifest file doesn't need to cover data collected by third-party SDKs
that your app links to"* — irrelevant here, since this app links none. **The manifest introduces no
new obligation and no new carve-out for this question.** Its practical relevance: whatever is
declared in App Store Connect should match `NSPrivacyCollectedDataTypes`, so the two artefacts must
be decided together.

---

## 4. The developer cannot access the data — Apple's own statements

Limb (b) of the primary definition (§2.1) turns on developer access. Apple states the position in
the CloudKit documentation rather than in the label documentation.

From <https://developer.apple.com/documentation/cloudkit/ckcontainer/privateclouddatabase>:

> The user's private database is only available if the device has an iCloud account. **Only the user
> can access their private database, by default.** They own all of the database's content and can
> view and modify that content. **Data in the private database isn't visible in the developer
> portal.** Data in the private database counts toward the user's iCloud storage quota.

From <https://developer.apple.com/documentation/cloudkit/ckdatabase>:

> Each of your app's users has access to the three separate databases: A public database that's
> accessible to all users of your app. **A private database that's accessible only to the user of the
> current device.** A shared database that's accessible only to the user of the current device, which
> contains records that other iCloud users share with them.

From <https://developer.apple.com/documentation/cloudkit/encrypting-user-data>:

> CloudKit encrypts data with the key material in the user's iCloud Keychain. If the user loses
> access to iCloud Keychain, CloudKit can't access the key material that it previously used to
> encrypt the data, **so iCloud can't decrypt it.**

and, listing which databases support encryption:

> Use encrypted fields to offer data encryption to your users in your CloudKit-based apps, such as
> Photos, Notes, **Health**, Home, and so forth.

Three things follow.

1. **"Accessible only to the user of the current device"** and **"isn't visible in the developer
   portal"** are Apple's own words and are precisely the negation of the label definition's
   *"allows you … to access it"*. This is as close as the primary sources come to answering #775, and
   it is a strong textual fit — but note it is a *conjunction of two documents*, not a single Apple
   sentence about labels.
2. With `encryptedValues` enabled — which
   [#714](https://github.com/jirigrill/eczema-helper/issues/714) decided for every attribute the
   platform can encrypt, plus app-side encryption of photo bytes — **Apple cannot read the payload
   either.** So the "readable form" wording of the second definition (§2.2) is also not met as to
   Apple or the developer; only as to the user.
3. **The `Health` mention is the same double-edged fact recorded in
   `docs/research/app-store-5-1-3-cloudkit.md`.** Apple naming Health among the app categories that
   should use CloudKit encrypted fields presupposes health data living in CloudKit. It is evidence
   that Apple does not regard this architecture as forbidden. It says nothing about labels.

**Limits of this section, stated plainly.** None of these pages is label guidance. Apple has never
written "data stored in your app's CloudKit private database is not collected for privacy-label
purposes." The inference from `privateCloudDatabase` to the label definition is *ours*, and a
reviewer is not bound by it.

---

## 5. Which data types would apply, if it is collection

Verbatim from the *Types of data* list at <https://developer.apple.com/app-store/app-privacy-details/>.

**Health & Fitness**

> Health
>
> Health and medical data, including but not limited to data from the Clinical Health Records API,
> HealthKit API, Movement Disorder API, or health-related human subject research **or any other user
> provided health or medical data**

> Fitness
>
> Fitness and exercise data, including but not limited to the Motion and Fitness API

**Sensitive Info**

> Sensitive Info
>
> Such as racial or ethnic data, sexual orientation, **pregnancy or childbirth information**,
> disability, religious or philosophical beliefs, trade union membership, political opinion, genetic
> information, or biometric data

**User Content** (relevant sub-types)

> Photos or Videos
>
> The user's photos or videos

> Other User Content
>
> Any other user-generated content

**Identifiers**

> User ID
>
> Such as screen name, handle, account ID, assigned user ID, customer number, or other user- or
> account-level ID that can be used to identify a particular user or account

### 5.1 Health is unavoidable if anything is declared

*"any other user provided health or medical data"* is a catch-all with no API anchor. Skin-condition
observations and a symptom diary for an infant are user-provided health data on any reading. **If the
app declares anything at all, it declares Health.** There is no version of this app that syncs a
skin diary and declares only, say, User Content.

This matches the finding already recorded in `docs/research/app-store-5-1-3-cloudkit.md` — that
Apple's privacy-label glossary makes this data health data regardless of which API produced it.

### 5.2 Sensitive Info is *not* clearly triggered — and the ticket's premise needs correcting

#775 states that Apple's Sensitive Info type *"expressly enumerates 'pregnancy or childbirth
information'"*. That is accurate as a quotation. But the inference does not follow for this app's
actual data.

The app records, per `CONTEXT.md`: **the mother's meals**, and **the infant's skin observations with
photos**. It does not record pregnancy status, due dates, birth details, or childbirth events. The
domain premise — a breastfed newborn — is *contextual*, not a stored field. Nothing in the schema is
pregnancy or childbirth information.

Two counter-arguments, both weaker but neither empty:

- **Inference.** A diary of a breastfeeding mother's diet arguably discloses that she has recently
  given birth, i.e. it is childbirth information by implication. Apple's text says "Such as … pregnancy
  or childbirth information" without saying whether inferable status counts. **Apple has not
  addressed inference for this data type.** UNANSWERED.
- **The infant's disability/condition.** Atopic eczema is a medical condition; the list includes
  "disability". Whether a chronic skin condition in an infant is "disability" for this purpose is
  **not stated by Apple.** UNANSWERED.

**Recommendation on Sensitive Info: do not declare it, on the current schema.** The schema contains
no field of any enumerated kind, and Health already covers the medical substance. Declaring Sensitive
Info would be declaring a data type the app does not hold, which is its own kind of inaccuracy under
Guideline 2.3. **But this becomes a live call the moment any pregnancy, due-date, or birth-date field
is added** — and note the infant's date of birth is a plausible future field for age-based display.
Flag it to whichever ticket introduces such a field.

### 5.3 Photos or Videos, and Other User Content

Photos of the infant's skin are unambiguously *"the user's photos or videos"*. They are also health
data in substance; the two declarations are not exclusive, and Apple's form allows both.

Free-text notes fall under a specific piece of *Additional guidance*, heading *"Your app includes
free-form text fields or voice recordings, and users can save any type of information they want
through those mediums, including names and health data."*:

> Mark "Other User Content" to represent generic free form text fields and "Audio Data" for voice
> recordings. **You're not responsible for disclosing all possible data that users may manually enter
> in the app through free-form fields or voice recordings.** However, **if you ask a user to input a
> specific data type into a text field, such as their name or email, or if you have a feature that
> enables users to upload a particular media type, such as photos or videos, then you'll need to
> disclose the specific type of data.**

The second sentence is the one that binds. This app **does** ask for specific data types — a skin
observation is a purpose-built health input, and the photo attachment is a purpose-built media
feature. So the free-form safe harbour does not shield the health substance; it only covers whatever
incidental content a mother types into a notes box. **If declaring, declare Health and Photos or
Videos specifically, plus Other User Content for free-text notes.**

### 5.4 User ID — almost certainly not

The app has no accounts. `CONTEXT.md` and [ADR-0001](../adr/0001-single-device-v1.md) record a
single-device, no-auth design; the iOS product adds CloudKit sync but not an app-level account. The
iCloud identity belongs to Apple's authentication, not to a developer-assigned ID, and per §3.2 the
developer is *"not responsible for disclosing data collected by Apple."* **Do not declare User ID or
Device ID.** UNVERIFIED as to whether CloudKit's per-container user record ID (`CKUserIdentity` /
`userRecordID`) would be considered a developer-held account-level ID; if the app ever persists or
transmits that value for its own purposes, revisit.

### 5.5 Nothing else applies

No location (no location APIs), no contacts, no browsing or search history off-device, no purchases
(UNVERIFIED pending a monetisation decision — free with no IAP would keep this empty; any paid tier
brings Apple's own payment collection, which §3.2 exempts), no diagnostics (no analytics SDK, and
Apple-collected crash data is Apple's per §3.2), no advertising data, no tracking of any kind.

### 5.6 Linkage: if declared, it is Linked to the User

From *Data linked to the user*:

> You'll need to identify whether each data type is linked to the user's identity (via their account,
> device, or other details) by you and/or your third-party partners. Data collected from an app is
> often linked to the user's identity, unless specific privacy protections are put in place before
> collection to de-identify or anonymize it, such as:
>
> - Stripping data of any direct identifiers, such as user ID or name, before collection.
> - Manipulating data to break the linkage and prevent re-linkage to real-world identities.
>
> Additionally, in order for data not to be linked to a particular user's identity, you must avoid
> certain activities after collection:
>
> - You must not attempt to link the data back to the user's identity.
> - You must not tie the data to other datasets that enable it to be linked to a particular user's
>   identity.
>
> Note: "Personal Information" and "Personal Data", as defined under relevant privacy laws, are
> considered linked to the user.

**The final Note decides it.** The diary is personal data under GDPR — that is the settled premise of
`docs/research/art-9-lawful-basis.md` and the DPIA — and Apple says personal data is *considered*
linked to the user. Additionally, a private database is *by construction* scoped to one iCloud
account, so no de-identification exists. **Any declared type is "Data Linked to You". There is no
credible "Not Linked" story here**, and attempting one would be the most likely single cause of a
metadata rejection.

### 5.7 Purpose: App Functionality only

From *Data use*:

> App Functionality
>
> Such as to authenticate the user, enable features, prevent fraud, implement security measures,
> ensure server up-time, minimize app crashes, improve scalability and performance, or perform
> customer support

Sync exists to enable the feature. Nothing here is Analytics (Apple: *"Using data to evaluate user
behavior…"*), Product Personalization, Third-Party Advertising, or Developer's Advertising or
Marketing. **App Functionality, and nothing else.**

### 5.8 Tracking: unambiguously no

From *Tracking*:

> "Tracking" refers to linking data collected from your app about a particular end-user or device,
> such as a user ID, device ID, or profile, with Third-Party Data for targeted advertising or
> advertising measurement purposes, or sharing data collected from your app about a particular
> end-user or device with a data broker.

No third-party data, no advertising, no data broker, no SDKs. **Not used for tracking. No
AppTrackingTransparency prompt is needed** — which also means no ATT-related review surface.

### 5.9 The optional-disclosure route is closed

From *Optional disclosure*, the four criteria (all must be met):

> - The data is not used for tracking purposes…
> - The data is not used for Third-Party Advertising, your Advertising or Marketing purposes, or for
>   Other Purposes…
> - **Collection of the data occurs only in infrequent cases that are not part of your app's primary
>   functionality, and which are optional for the user.**
> - The data is provided by the user in your app's interface, it is clear to the user what data is
>   collected, the user's name or account name is prominently displayed in the submission form
>   alongside the other data elements being submitted, and the user affirmatively chooses to provide
>   the data for collection each time.
>
> **Data types must meet all criteria in order to be considered optional for disclosure.** If a data
> type collected by your app meets some, but not all, of the above criteria, it must be disclosed in
> App Store Connect.

The app clears the first two and **fails the third outright**: logging meals and skin observations
*is* the primary functionality. Apple's own example confirms the intended narrowness: *"Examples of
data that may not need to be disclosed include data collected in optional feedback forms or customer
service requests that are unrelated to the primary purpose of the app."* The fourth also fails —
there is no per-submission affirmative choice and no displayed account name.

The other two optional routes are equally closed: **Regulated Financial Services** is inapplicable,
and **Health Research Disclosure** requires *"an informed consent form (ICF) as part of a health
research study that has been reviewed and approved by an institutional review board or ethics review
board"* — this app is not research (which also keeps 5.1.3(iii)–(iv) inapplicable, consistent with
#675).

**So there is no partial exit.** The app either declares these types in full or declares that it does
not collect. This is the fork #775 identified, and Apple's optional-disclosure machinery offers no
middle path.

---

## 6. The one Apple text that addresses in-app cloud backup

This is the most important source found that is not the App Privacy Details page, and it was not
anticipated by #775.

From **Apple Support, "Privacy information for Apple apps"**,
<https://support.apple.com/en-us/102399> (reached via <https://support.apple.com/kb/HT211970>, which
is the link Apple's own product pages use), under *Frequently asked questions about privacy
information for Apple apps*:

> **Why do some Apple apps that allow you to back up your data to the cloud list that data in the
> privacy information section, while others do not?**
>
> The privacy information section is designed to give you transparency into data that is collected as
> part of using the app. Some Apple apps, for example Photos and Messages, **give you the choice to
> back up app data outside of the app. These apps don't declare the data types that are backed up in
> their privacy information section.** Other Apple apps, for example iMovie, **give you the choice to
> back up inside the app. These apps do declare the data types that are backed up in their privacy
> information section.** You can control which apps are backing up to iCloud on your iPhone in
> Settings > [your name] > iCloud > iCloud Backup.

### 6.1 Why this matters

This is the **only Apple-authored text located that draws a line between cloud-stored app data that
must be declared and cloud-stored app data that need not be.** And the line it draws is not the
developer-access line of §2 — it is **inside the app vs. outside the app**:

| Backup mechanism | Apple's example | Declared? |
| --- | --- | --- |
| Outside the app (system iCloud Backup, user-controlled in Settings) | Photos, Messages | **No** |
| Inside the app (the app offers cloud storage as a feature) | iMovie | **Yes** |

**This app's CloudKit sync is inside the app.** It is a feature of the app, enabled by the app's
container, not the system-wide iCloud Backup toggle. **On this test, the app is on the iMovie side of
the line, and declares.**

Note the FAQ's framing sentence too: *"designed to give you transparency into data that is collected
as part of using the app."* Sync-as-a-feature is data movement that happens *as part of using the
app*, not as part of a separate system backup the user opted into elsewhere.

### 6.2 How much weight this carries

Honest limits, stated because the standing preference demands it:

- It is **Apple-authored and current** (the article was published 2024-09-16 per Apple's own date
  line on the page as fetched), and it is the article Apple links from its labels index — so it is a
  primary source in good standing.
- It is **about Apple's own apps**, not third-party apps, and it is a **consumer FAQ**, not developer
  guidance. It does not purport to state the developer rule.
- iMovie's cloud storage is **iCloud Drive / iMovie's own library sync**, not necessarily a CloudKit
  private database with encrypted fields; the mechanisms differ in confidentiality even if both are
  "inside the app". Whether that difference matters to the rule is **UNANSWERED**.
- Apple is in a different position from a third-party developer: for Apple's own apps, Apple *is* the
  cloud operator, so "collected by the developer" is trivially satisfied in a way it is not for us.
  **This is the strongest reason to discount the analogy** — and it cuts genuinely both ways, because
  it means the iMovie precedent may be explained entirely by Apple's dual role rather than by an
  inside/outside rule.

**Net:** it does not settle the developer rule, but it is the only Apple text pointing at the
question, and it points toward declaring. Combined with §2.2's "readable form" wording, the
conservative recommendation in §7 has two independent Apple-textual supports rather than none.

### 6.3 Precedent from shipping apps is not usable here

`docs/research/app-store-5-1-3-cloudkit.md` records that live App Store apps sync
reproductive-health and infant data to the user's own iCloud, some carrying "Data Not Collected"
labels. That observation is repeated here for continuity but is **not primary source material for
what Apple requires** — a shipped label is a developer's assertion that passed review, and review
passing is not an Apple ruling. Per the map's standing preference, it is evidence about risk, not
about rules. It is also **UNVERIFIED** in this document: no specific app's label was re-checked as
part of this research.

---

## 7. Recommended declaration

### 7.1 The recommendation

**Answer "Yes, we collect data from this app" and declare the following.**

| Data type | Declare? | Linked to user | Purpose | Tracking |
| --- | --- | --- | --- | --- |
| **Health & Fitness → Health** | **Yes** | Linked | App Functionality | No |
| **User Content → Photos or Videos** | **Yes** | Linked | App Functionality | No |
| **User Content → Other User Content** | **Yes**, if free-text notes ship | Linked | App Functionality | No |
| Health & Fitness → Fitness | No | — | — | — |
| **Sensitive Info** | **No** — on the current schema (§5.2) | — | — | — |
| Identifiers → User ID / Device ID | No (§5.4) | — | — | — |
| Contact Info (any) | No | — | — | — |
| Location (any) | No | — | — | — |
| Financial Info / Purchases | No (§5.5) | — | — | — |
| Diagnostics (any) | No | — | — | — |
| Usage Data (any) | No | — | — | — |
| Contacts, Browsing History, Search History, Surroundings, Body, Other Data | No | — | — | — |

Mirror the same three types in the app's privacy manifest (`NSPrivacyCollectedDataTypes`) with
`NSPrivacyCollectedDataTypeLinked = true`, `NSPrivacyCollectedDataTypeTracking = false`, and
`NSPrivacyCollectedDataTypePurposeAppFunctionality` (§3.4).

**Nothing is used for tracking. No ATT prompt.**

### 7.2 Why not "Data Not Collected", given §2 says the app does not collect

Because the label question and the *risk* question have different answers, and only one of them is
decided by the definition.

The §2.1 reading is genuinely good — Apple wrote an access test, and §4 shows the developer has no
access. If the only consideration were "what does the definition say", the answer would be **Data Not
Collected**. Four things override it:

1. **Apple's page contradicts itself (§2.2).** The *Additional guidance* restatement substitutes
   "storing it in a readable form" for the access clause. A reviewer quoting that sentence is quoting
   Apple, and we would have no counter beyond "we think that sentence is scoped to its heading."
2. **The only Apple text about in-app cloud storage points the other way (§6).** iMovie declares.
3. **The declaration is an absolute public claim (§3.1).** The consumer label reads *"The developer
   does not collect any data from this app."* For an app that unmistakably moves a health diary to a
   server, that sentence looks false to a lay reader even if it is technically defensible. That is
   reputational exposure with no upside.
4. **5.1.3(ii) is unsettled and adjacent.** #675 concluded the clause's reach over an app's own
   CloudKit private database will stay unsettled through to submission, and
   [#685](https://github.com/jirigrill/eczema-helper/issues/685) ruled out asking App Review. A "Data
   Not Collected" label creates a *second* place a reviewer can open the same argument — and this one
   with a metadata-accuracy hook (Guideline 2.3) attached. **Declaring collapses the two exposures
   into one.** It removes the label as an attack surface and leaves only the 5.1.3(ii) question that
   is unavoidable anyway.

**These are separate questions and #775 was right to insist on that.** The definition question has an
answer ("not collected", on the primary definition). The recommendation is nonetheless to declare,
because the label is not a place to be clever for zero gain — and §7.3 shows the gain really is zero.

### 7.3 Why over-declaring costs nothing

Enumerated, so this is checkable:

- **No functional cost.** The label does not gate any API, entitlement, or capability. No declaration
  triggers a permission prompt or a review requirement. (By contrast, ATT and required-reason APIs do
  have functional consequences — and neither is engaged here.)
- **No reversibility cost.** Apple: *"You may update your answers at any time, and you do not need to
  submit an app update in order to change your answers."* (§8)
- **No accuracy violation.** Declaring Health for an app that stores health data is accurate on any
  reading. Guideline 2.3 penalises inaccuracy, not conservatism. The one place over-declaring *would*
  be inaccurate is declaring a type the app does not hold — hence the recommendation against Sensitive
  Info (§5.2) and User ID (§5.4). **"Conservative" means declaring what you hold, not declaring
  everything.**
- **A regulatory alignment benefit.** The GDPR Art. 13 notice
  (`docs/research/art-13-notice-form.md`) and the Art. 9 analysis
  (`docs/research/art-9-lawful-basis.md`) already treat this as special-category health data. A label
  saying "no data collected" beside a privacy notice describing health-data processing is an
  **inconsistency a regulator or a reviewer could pick up.** Declaring keeps the two artefacts
  telling one story. This is the strongest affirmative argument for declaring and it is independent of
  anything Apple says about labels.

The only real cost is **presentational**: the product page will show a "Health" chip under Data
Linked to You. For an app whose entire premise is a health diary, that is not a surprise to any
prospective user.

### 7.4 The reasoning that survives a reviewer disagreeing

#775 asked for this specifically. The recommendation is designed so that **both readings lead to
compliance**:

- If the reviewer thinks CloudKit private-database writes are collection → the app has declared them,
  correctly typed, correctly linked, correct purpose. Nothing to fix.
- If the reviewer thinks they are not collection → the app has over-declared. Apple has no rule
  against over-declaring, and the label is editable at will if we later want to narrow it.

**"Data Not Collected" has no such property**: it is correct under one reading and a metadata
inaccuracy under the other. The asymmetry is the whole argument.

**If a reviewer instead challenges the declaration as inconsistent with 5.1.3(ii)** — i.e. "you have
just told us you store personal health information in iCloud" — that is the #675 problem arriving,
and it arrives regardless of the label, since the app's own privacy notice and its sync feature
disclose the architecture anyway. The drafted App Review query in #675's comment becomes appeal
material. **Note this honestly as a cost of declaring: it is the one respect in which declaring is
worse than not, and it is why the trade-off in §7.2 is a judgement rather than a deduction.** The
judgement rests on §7.3: labels are free to change, appeals over an inaccurate label are not free,
and a reviewer who wants to raise 5.1.3(ii) does not need the label's help to notice a sync feature.

---

## 8. Are labels editable after submission? Yes — and the contrast with the policy URL is confirmed

#775's fourth bullet. Apple's text is explicit.

From <https://developer.apple.com/app-store/app-privacy-details/>, *Answering app privacy questions*:

> You're responsible for keeping your responses accurate and up to date. If your practices change,
> update your responses in App Store Connect. **You may update your answers at any time, and you do
> not need to submit an app update in order to change your answers.**

From <https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy>,
*Updating app privacy responses*:

> 3. To edit existing responses, on the right, click on the data type you'd like to update your
>    responses for.
> 4. Update your responses, then click Publish. **Your updated responses will be published on your
>    app's product page after you click Publish.**

And on adding or removing types:

> Updates to data types will be published after you click Publish. If you select new data types, you
> must complete their setup by responding to the questions in each data type section before
> publishing.

> - If you removed an existing data type, click Publish. **Your responses to this data type will be
>   removed from your app's product page.**

So both directions work, and take effect on Publish rather than on a release.

**The contrast #709 cared about, in Apple's own words.** From the same page, *Entering privacy policy
information*:

> A privacy policy URL is required for all apps, while a user privacy choices URL is optional. The
> URLs for your iOS app and macOS app platform and the text for your tvOS app platform can be updated
> if your app is in an editable app status.

> **Any changes to the URLs releases with your next app version.**

| Artefact | Change mechanism |
| --- | --- |
| **Privacy label answers** | Editable **at any time**; publish immediately; **no app update required** |
| **Privacy Policy URL** | Editable only in an editable app status; **ships with the next app version** |

**This confirms the asymmetry #775 asked us to establish.** The label is the *cheapest* piece of
privacy metadata to get wrong and fix; the policy URL is not. It is a further reason to spend the
conservatism budget on the label (§7.3) rather than hedging it.

Two attached obligations, both from Apple:

- **Publishing is an attestation.** Per the ASC Help publish step: *"A dialog appears confirming that
  you agree that your responses are accurate, comply with the App Review Guidelines and applicable
  law, and that you will promptly update your responses if your data practices change."*
- **Answers are app-level, not version-level, and cross-platform.** *"Responses are provided at the
  app level and should accurately represent your app's data practices across all platforms. You should
  answer in the most comprehensive and inclusive way if your app collects more data on one platform
  than another."* The instruction to answer *most comprehensively and inclusively* is itself mild
  Apple support for the conservative choice.
- One wrinkle to respect: Apple twice says *"If your app is currently available on the App Store, make
  sure your responses reflect the data collected only from that app version."* So the label describes
  the **shipped** version. Do not pre-declare types for unshipped features; add them as they ship
  (which the at-any-time editability makes easy).

### 8.1 Adjacent requirements confirmed while here

- **Privacy Policy URL is mandatory.** ASC Help reference,
  <https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy>:
  *"Privacy Policy URL — A URL that links to your company's privacy policy. **This is required for all
  apps.**"* Consistent with Guideline 5.1.1(i) (*"All apps must include a link to their privacy policy
  in the App Store Connect metadata field and within the app in an easily accessible manner"*) and with
  #709's conclusion.
- **Privacy Choices URL is optional.** *"A publicly accessible URL where users can learn more about
  their privacy choices for your app and how to manage them. For example, a webpage where users can
  access their data, request deletion, or make changes. **This is optional.**"* Worth noting for
  `docs/research/settings-data-deletion.md`: deletion is handled in-app, so this URL is not needed —
  but it exists as a surface if a hosted deletion page is ever wanted.
- **Labels are required to submit at all.** *"This information is required to submit new apps and app
  updates to the App Store."*
- **Guideline 2.3 Accurate Metadata expressly covers privacy information:** *"make sure all your app
  metadata, **including privacy information**, your app description, screenshots, and previews
  accurately reflect the app's core experience and remember to keep them up-to-date with new
  versions."* This is the enforcement hook that makes a wrong label a rejectable defect rather than a
  cosmetic one — and it is why the direction of any error matters (§7.4).

---

## 9. What is answered, what is not

### 9.1 Answered from primary sources

| Question | Answer | Source |
| --- | --- | --- |
| How does Apple define "collect"? | Two definitions, quoted in §2; the primary one is an **access** test, not a location test | App Privacy Details |
| Is there a "Data Not Collected" developer option? | Yes, worded *"No, we do not collect data from this app"*; selecting it ends the questionnaire | ASC Help |
| Does the CloudKit private database appear in label guidance? | **No.** "CloudKit" appears once, about Apple-collected app data; "iCloud", "encrypt", "private database" appear zero times | App Privacy Details (§3.3) |
| Is there a carve-out for data the developer cannot read? | **Only for payment info**, nowhere generalised | App Privacy Details (§3.2) |
| Is there a carve-out for on-device-only data? | Yes, but it requires the data **never be sent to a server** — does not cover CloudKit sync | App Privacy Details (§2.4) |
| Can the developer read private-database content? | **No** — *"Only the user can access their private database"*, *"isn't visible in the developer portal"* | CloudKit docs (§4) |
| Does Health & Fitness → Health cover a hand-typed skin diary? | **Yes** — *"any other user provided health or medical data"* | App Privacy Details (§5.1) |
| Is Sensitive Info triggered? | **Not on the current schema** — no enumerated field is stored | App Privacy Details + `CONTEXT.md` (§5.2) |
| Would declared types be Linked to the user? | **Yes** — personal data is *"considered linked to the user"*, and a private DB is single-account by construction | App Privacy Details (§5.6) |
| Is any of this tracking? | **No** | App Privacy Details (§5.8) |
| Is optional disclosure available? | **No** — fails the primary-functionality criterion | App Privacy Details (§5.9) |
| Are labels editable after submission? | **Yes, at any time, with no app update** | App Privacy Details + ASC Help (§8) |
| Is the policy URL editable the same way? | **No** — *"Any changes to the URLs releases with your next app version"* | ASC Help (§8) |
| Does Apple say anything about in-app cloud backup and declaring? | **Yes, once**, and it says the inside-the-app case **does** declare (iMovie) | Apple Support 102399 (§6) |

### 9.2 Unanswered — no primary source exists in either direction

State these as unanswered; do not infer.

1. **Whether Apple treats an app's own CloudKit private database as "collection" for label purposes.**
   Apple has never written it. The §2.1 access reading says no; the §2.2 "readable form" wording and
   the §6 iMovie analogy say yes. **Apple has not reconciled its own two definitions of "collect", and
   this app sits exactly in the gap.** This is the same structural silence #675 found on 5.1.3(ii) —
   and #775 was right that the two are independent questions, because the label definition is an
   *access* test while 5.1.3(ii) is a *location* prohibition. **They can be answered differently and
   Apple has answered neither.**
2. Whether encrypted fields (`encryptedValues`) change the label answer. Apple's label guidance never
   mentions encryption (§3.3). It ought to matter to the "readable form" test; Apple does not say it
   does.
3. Whether the §6 inside/outside-the-app distinction is a rule for third-party developers or an
   artefact of Apple being its own cloud operator.
4. Whether *inferable* pregnancy/childbirth status counts as Sensitive Info (§5.2).
5. Whether an infant's chronic skin condition is "disability" for Sensitive Info (§5.2).
6. Whether CloudKit's `userRecordID` counts as a developer-held User ID if the app never persists it
   (§5.4).

### 9.3 What would resolve item 1

Only a written App Review or Apple Developer Support answer. **[#685](https://github.com/jirigrill/eczema-helper/issues/685)
ruled out asking**, so on this map item 1 stays open through to submission — exactly as #675
concluded for 5.1.3(ii). The mitigation is the same one §7.4 builds: **choose the declaration whose
failure mode is over-disclosure rather than misstatement**, and rely on Apple's at-will editability to
correct course.

Because asking is ruled out, the recommendation in §7 should be read as **final for this effort**, not
provisional pending clarification.

---

## 10. Consequences for other work on the map

- **`docs/research/app-store-5-1-3-cloudkit.md` (#675) is unaffected but now has a sibling.** Its
  conclusion stands. This document's §2 adds one thing #675 did not have: Apple's label definition of
  "collect" is an *access* test, so the label question is not merely the 5.1.3(ii) question restated —
  **it has its own text and its own (favourable) reading**, even though it too lacks an Apple ruling.
- **The Art. 13 notice (`art-13-notice-form.md`, #736/#758) and the label must agree.** §7.3 makes this
  an argument for declaring. If the notice describes health-data processing, the label should not say
  "no data collected". Whoever finalises either artefact should read both.
- **The Sensitive Info call is schema-dependent (§5.2).** Any ticket adding a pregnancy, due-date, or
  infant-date-of-birth field re-opens it.
- **Monetisation is unsettled and touches §5.5.** Free-with-no-IAP keeps Purchases empty; anything else
  needs a re-check (though Apple-collected payment data is exempt per §3.2).
- **The privacy manifest is a build artefact, not just metadata (§3.4).** Declaring in App Store
  Connect implies a matching `NSPrivacyCollectedDataTypes`; that belongs in the iOS repo's build
  configuration, not here.
- **No ADR is warranted in this repo.** This repo is frozen for code and the decision constrains the
  iOS product, not this one. The recommendation belongs in the iOS repo's submission checklist. This
  document is research, filed alongside the other `docs/research/` artefacts by the map's convention.

---

## Appendix A: reproducing the fetches

```bash
# The primary text (note: /support/app-privacy-on-the-app-store/ 301s here)
curl -sL https://developer.apple.com/app-store/app-privacy-details/

# ASC Help — the live path. The /manage-app-privacy/manage-app-privacy variant 404s.
curl -sL https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy

# CloudKit developer-visibility statements (JSON API renders reliably)
curl -s https://developer.apple.com/tutorials/data/documentation/cloudkit/ckcontainer/privateclouddatabase.json
curl -s https://developer.apple.com/tutorials/data/documentation/cloudkit/encrypting-user-data.json
curl -s https://developer.apple.com/tutorials/data/documentation/bundleresources/describing-data-use-in-privacy-manifests.json

# The cloud-backup FAQ (HT211970 redirects here)
curl -sL https://support.apple.com/en-us/102399

# "Data Not Collected" in production; DATA_NOT_COLLECTED appears 36x
curl -sL https://www.apple.com/privacy/labels/

# Guidelines 2.3, 5.1.1, 5.1.3
curl -sL https://developer.apple.com/app-store/review/guidelines/
```

Apple's developer pages carry **no "Last updated" stamp**; revisions are announced only via
<https://developer.apple.com/news/>. Support article 102399 shows a published date of 2024-09-16.
Re-verify before submission.
