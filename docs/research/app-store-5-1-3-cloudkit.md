# App Store 5.1.3(ii) and an app's own CloudKit private database

Research for [issue #675](https://github.com/jirigrill/eczema-helper/issues/675). Gates the sync
layer of the planned native iOS app ([issue #672](https://github.com/jirigrill/eczema-helper/issues/672),
§6 of the pinned handoff).

**Retrieved 2026-08-13.** All primary sources are cited with URLs. Anything not traceable to an
Apple-authored source is labelled **UNVERIFIED** in place.

## Overview

**The question is unsettled, and that is the finding.** Apple has never publicly stated whether
"may not store personal health information in iCloud" reaches a third-party app's own CloudKit
private database.

Two Apple-authored inputs point in opposite directions and have never been reconciled:

- The clause itself is **unqualified** — it says "in iCloud," names no API, and Apple's own privacy
  label glossary defines health data to explicitly include "any other user provided health or
  medical data." On plain text it covers CloudKit.
- Apple's **CloudKit encryption documentation** names "Health" among the app categories developers
  should use CloudKit encrypted fields for. On plain text that presupposes health data in CloudKit.

There is no Apple forum answer, no WWDC statement, and no documentation note resolving the conflict.
A developer asked exactly this question on Apple's own forums in 2020 and got **zero replies**.

Three consequences for the iOS transition:

1. **The fallback is not better.** The clause's "iCloud" wording covers the iCloud Drive ubiquity
   container as squarely as it covers CloudKit. Swapping storage mechanism does not reduce the
   textual exposure.
2. **Shipping precedent is real and current** — live App Store apps sync reproductive-health and
   infant data to the user's own iCloud, some with "Data Not Collected" privacy labels. Precedent
   is not permission, but it is evidence that this is not a routine auto-rejection.
3. **Only a written App Review answer resolves it.** §5 below drafts that query.

---

## 1. The clause, verbatim

Retrieved **2026-08-13** from <https://developer.apple.com/app-store/review/guidelines/>, confirmed
by two independent fetch paths returning identical text. The page carries **no "Last updated"
stamp**; Apple announces revisions only via <https://developer.apple.com/news/>.

### 5.1.3 Health and Health Research

Preamble:

> Health, fitness, and medical data are especially sensitive and apps in this space have some
> additional rules to make sure customer privacy is protected:

**(i)**

> Apps may not use or disclose to third parties data gathered in the health, fitness, and medical
> research context—including from the Clinical Health Records API, HealthKit API, Motion and
> Fitness, MovementDisorder APIs, or health-related human subject research—for advertising,
> marketing, or other use-based data mining purposes other than improving health management, or for
> the purpose of health research, and then only with permission. Apps may, however, use a user's
> health or fitness data to provide a benefit directly to that user (such as a reduced insurance
> premium), provided that the app is submitted by the entity providing the benefit, and the data is
> not shared with a third party. You must disclose the specific health data that you are collecting
> from the device.

**(ii)** — *the clause in question*

> Apps must not write false or inaccurate data into HealthKit or any other medical research or
> health management apps, and may not store personal health information in iCloud.

**(iii)**

> Apps conducting health-related human subject research must obtain consent from participants or, in
> the case of minors, their parent or guardian. Such consent must include the (a) nature, purpose,
> and duration of the research; (b) procedures, risks, and benefits to the participant; (c)
> information about confidentiality and handling of data (including any sharing with third parties);
> (d) a point of contact for participant questions; and (e) the withdrawal process.

**(iv)**

> Apps conducting health-related human subject research must secure approval from an independent
> ethics review board. Proof of such approval must be provided upon request.

5.1.3 ends at (iv). There is no (v).

### Surrounding context

Parent section **5.1 Privacy** opens:

> Protecting user privacy is paramount in the Apple ecosystem, and you should use care when handling
> personal data to ensure you've complied with privacy best practices, applicable laws, and the terms
> of the Apple Developer Program License Agreement, not to mention customer expectations. More
> particularly:

Siblings are **5.1.1 Data Collection and Storage** (sub-clauses (i)–(x); (ix) is the regulated-fields
clause that says healthcare apps "should be submitted by a legal entity, not an individual
developer") and **5.1.2 Data Use and Sharing** (sub-clauses (i)–(vii)). Neither mentions iCloud
storage of health data. **5.1.2(vi)** names health APIs but only to forbid marketing/ad/data-mining
use:

> Data gathered from the HomeKit API, HealthKit, Clinical Health Records API, MovementDisorder APIs,
> ClassKit or from depth and/or facial mapping tools (e.g. ARKit, Camera APIs, or Photo APIs) may not
> be used for marketing, advertising or use-based data mining, including by third parties.

### Textual scoping analysis

This is a reading of the text, not an Apple statement.

- **The preamble is app-scoped, not API-scoped:** "apps *in this space*" — any health app, HealthKit
  or not.
- **(i) is API-anchored but non-exhaustive** ("including from …").
- **(ii) is not standalone.** It is a single sentence with one subject ("Apps") and two conjuncts.
  The first conjunct defines the category as "HealthKit or any other medical research or health
  management apps." The iCloud prohibition hangs off that same subject. So it is bound to the
  category *health management apps* — **broader than HealthKit, narrower than "all apps."** An
  infant eczema tracker is squarely a health management app.
- **(ii) names no API.** It says "in iCloud," not "HealthKit data in iCloud" and not "CloudKit."
- **(iii)–(iv) are research-only** and do not apply to a record-only consumer app.
- (ii) is the shortest and least-elaborated clause in 5.1.3 and is **elaborated nowhere else in the
  guidelines.**

The "HealthKit-adjacent context" hypothesis from the handoff document is therefore **only partly
supported**: (ii) sits in a section whose other clauses lean HealthKit/research, but its own subject
is expressly *"or any other … health management apps."* The text does not confine it to HealthKit.

### Revision history

| Date | Apple news post | Touched 5.1.x? |
|---|---|---|
| 2026-06-08 | [a233fmpw](https://developer.apple.com/news/?id=a233fmpw) | No |
| 2026-02-06 | [d75yllv4](https://developer.apple.com/news/?id=d75yllv4) | No |
| 2025-11-13 | [ey6d8onl](https://developer.apple.com/news/?id=ey6d8onl) | 5.1.1(ix), 5.1.2(i) — **not** 5.1.3 |
| 2025-05-01 | [9txfddzf](https://developer.apple.com/news/?id=9txfddzf) | No |
| 2019-06-03 | [06032019j](https://developer.apple.com/news/?id=06032019j) | **5.1.3(i)** — added the direct-benefit carve-out |

No announced revision since at least May 2025 touched 5.1.3. The last located change to 5.1.3 is the
2019 edit to **(i)**; clause **(ii)** appears unmodified since before then.
**UNVERIFIED:** the 2019–2025 news archive was not exhaustively enumerated, so "(ii) unchanged since
2019" is an inference from a non-exhaustive sample, not a verified negative.

---

## 2. What Apple has said (and has not)

### 2a. Apple documentation naming Health as a CloudKit use case — the strongest counter-signal

<https://developer.apple.com/documentation/cloudkit/encrypting-user-data>, Overview, verbatim:

> Encryption adds another layer of protection on top of account-based access control, and is
> available for data that's sensitive or private to the user. CloudKit's encrypted fields allow you
> to optionally add that second layer of cryptographic protection by choosing which fields the system
> encrypts within a CKRecord.
>
> Use encrypted fields to offer data encryption to your users in your CloudKit-based apps, such as
> Photos, Notes, **Health**, Home, and so forth.

Apple's CloudKit documentation lists **Health** among the app kinds for which developers should use
encrypted fields. It is genuinely ambiguous whether "Photos, Notes, Health, Home" enumerates Apple's
own first-party apps as exemplars or app *categories* a developer might build — **Apple does not
say.** This is the single best piece of evidence that health data in a developer CloudKit container
is contemplated by Apple, and it is not conclusive.

### 2b. Apple's privacy-label glossary defines health data broadly, not by API

<https://developer.apple.com/app-store/app-privacy-details/>, verbatim:

> Health — Health and medical data, including but not limited to data from the Clinical Health
> Records API, HealthKit API, Movement Disorder API, or health-related human subject research **or
> any other user provided health or medical data**

This cuts **against** the "5.1.3(ii) means HealthKit-derived data only" reading. Apple's own working
definition of health data explicitly reaches user-entered data. Meals and skin observations typed by
a parent are health data under this definition.

Also verbatim, on what "collect" means:

> "Collect" refers to transmitting data off the device in a way that allows you and/or your
> third-party partners to access it for a period longer than what is necessary to service the
> transmitted request in real time.

> Data that is processed only on device is not "collected" and does not need to be disclosed in your
> answers. If you derive anything from that data and send it off device, the resulting data should be
> considered separately.

**Important gap:** that page **never names CloudKit or iCloud.** The widespread industry position
that CloudKit private-DB data is "not collected" rests entirely on inferring from *"in a way that
allows you … to access it"* — the developer cannot read a private database. That inference is
reasonable and is what the market does, but it is **not an Apple statement**. Treat "CloudKit private
DB ⇒ Data Not Collected" as **UNVERIFIED as official guidance**.

### 2c. CloudKit's own documentation imposes no data-class restrictions

- <https://developer.apple.com/icloud/cloudkit/> — "Store private data securely in your users' iCloud
  accounts…"; "Protected privacy. Develop, analyze, and debug your apps without exposing your users'
  personally identifiable data."; "Encrypted data. Configure fields in private CloudKit databases to
  be encrypted…". Notably it does **not** verbatim state that the developer cannot read private
  databases.
- <https://developer.apple.com/documentation/cloudkit/deciding-whether-cloudkit-is-right-for-your-app>
  — no mention of health, regulated data, HIPAA, or restricted data types. Same for the CloudKit
  framework landing page.

### 2d. HealthKit documentation is silent on iCloud

<https://developer.apple.com/documentation/healthkit> and its "Protecting user privacy" page state
"The user's device stores all HealthKit data locally" and never mention iCloud, CloudKit, or 5.1.3.

Apple's security guide, <https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web>:

> Health data can be stored in iCloud. End-to-end encryption for Health data requires iOS 12 or later
> and two-factor authentication. Otherwise, the user's data is still encrypted in storage and
> transmission but isn't encrypted end-to-end.

The third-party restrictions listed on that page cover advertising and privacy-policy requirements
only — **no iCloud storage ban appears there.**

### 2e. The closest thing to an Apple staff answer — and it dodges the guideline

Apple Developer Forums [thread 749027](https://developer.apple.com/forums/thread/749027), "HealthKit
SwiftData sync", reply from an account marked **Engineer (Apple)**, May 2024:

> HealthKit data is already available on all a user's logged-in devices …, there should be no need
> for you to store & sync a copy of it, generally.

Framed as **redundancy, not prohibition.** The engineer had an open invitation to cite 5.1.3(ii) and
did not. That is weak evidence in both directions and should not be over-read.

### 2f. The question was asked on Apple's forums and never answered

Apple Developer Forums [thread 653141](https://developer.apple.com/forums/thread/653141) — a
developer asks precisely whether "may not store personal health information in iCloud" prohibits
`NSPersistentCloudKitContainer` for a health metric. **Zero replies.**

App Review does not staff the developer forums, so an authoritative public answer is structurally
unlikely to appear there.

### 2g. WWDC — encryption framed by sensitivity, never by guideline permission

- WWDC21 "What's new in CloudKit", <https://developer.apple.com/videos/play/wwdc2021/10086/>:
  "Cryptographic protection should be used for data that is sensitive or private to your users." No
  mention of Health or 5.1.3.
- WWDC23 "What's new in privacy", <https://developer.apple.com/videos/play/wwdc2023/10053/>: "By
  adopting CloudKit, you can end-to-end encrypt data stored in CloudKit by your app whenever someone
  enables Advanced Data Protection… make sure to use encrypted data types for all fields in your
  CloudKit schema." No mention of Health or 5.1.3.

### 2h. A plausible technical rationale Apple never states

<https://support.apple.com/guide/security/icloud-data-security-overview-sec973254c5f/web>:

> Advanced Data Protection also automatically protects CloudKit fields that third-party developers
> choose to mark as encrypted, and all CloudKit assets.

Health is listed among the categories whose service keys are never uploaded to Apple servers — i.e.
Apple's **own** Health iCloud sync is end-to-end encrypted under *standard* protection. A third-party
CloudKit private database is end-to-end encrypted only if the developer marks fields encrypted
**and** the user has enabled Advanced Data Protection. That asymmetry is a coherent rationale for
5.1.3(ii). **Apple never states it as the rationale** — this is our inference and is **UNVERIFIED**.

### 2i. Explicitly NOT found

Searched across developer.apple.com forums (HealthKit, CloudKit, App Review, Privacy tags),
developer documentation, WWDC video transcripts, and support.apple.com security guides:

- **No** Apple staff interpretation of 5.1.3(ii) against CloudKit, anywhere.
- **No** Apple documentation stating health data is permitted in a developer CloudKit private DB.
- **No** Apple documentation stating it is forbidden, beyond the guideline sentence itself.
- **No** WWDC session addressing the interaction.
- **No** Apple definition of "personal health information" in the App Review Guidelines.

Numerous third-party write-ups (SDK vendor blogs, Medium posts, StackOverflow answers) assert
confidently that "CloudKit is iCloud, therefore health data is banned." **None cite an Apple source
beyond the guideline text.** They are excluded here as **UNVERIFIED**.

---

## 3. Shipping precedent

Precedent is evidence about App Review *behaviour*, not about the rule. An app on the store proves
review did not block it; it does not prove review would not block it next time, and Apple's
guidelines note that enforcement is discretionary.

No app examined uses the word **"CloudKit"** in its App Store description. They all say "iCloud" /
"your own iCloud" / "private iCloud". Whether a given listing means CloudKit private DB, the ubiquity
container, or plain iCloud Backup **is not determinable from the listing** — `NSPersistentCloudKitContainer`
usage is inferred throughout and never stated. Flagged **UNVERIFIED** for every entry.

### Bloom Private — Period & Cycle Tracker (strongest analog)

<https://apps.apple.com/us/app/private-period-cycle-tracker/id6755919025> · Health & Fitness · live

> We don't have servers. We couldn't read your data even if we wanted to.
>
> Premium users can sync across devices using their own secure iCloud—we never touch it.
>
> 100% local storage with AES-256 encryption

Privacy label: **"The developer does not collect any data from this app."** Wording: **sync**, not
backup. Reproductive health is unambiguously personal health information, and this shipped with a
full "Data Not Collected" label.

### BabyRo — Simple Baby Tracker (closest structural match to our app)

<https://apps.apple.com/us/app/babyro-simple-baby-tracker/id6760269041>

> Your data stays on your device with optional private iCloud syncing. You can export everything as a
> CSV file for sharing with your pediatrician.

Privacy label: **"The developer does not collect any data from this app."** Wording: **sync**.
Infant logs + optional iCloud + CSV export is exactly the shape planned here.

### Trace — Symptom Tracker (the backup-framing precedent)

<https://apps.apple.com/app/trace-symptom-tracker/id6756234011> · Health & Fitness · actively updated

App Store description:

> Activate the optional private iCloud **Backup** to securely restore your data if you change phones
> or reinstall the app.
>
> No servers, your data stays on your iPhone. No accounts, no sign-up required. No tracking, your
> health data is never collected or sold.

Own site, <https://www.trace.care/private-symptom-tracker/>:

> Trace has no backend that stores health data. There is nothing to hack, subpoena or sell.
>
> The only optional backup is to your own personal Apple iCloud account — off by default, controlled
> by you, and never visible to us.
>
> Health entries stay on your device by default, with optional private iCloud sync.

Privacy label: *Data Not Linked to You → Usage Data, Product Interaction*. No Health & Fitness
declared. **Note the split framing:** the **App Store-facing** copy says "**Backup**… off by
default"; the marketing site says "sync". `trace.care/privacy-policy/` returns 404 — **UNVERIFIED**.

### Symptom Tracker: My Health

<https://apps.apple.com/us/app/symptom-tracker-my-health/id6759116566> · Health & Fitness

> Your health information stays on your device unless you choose to sync it through iCloud or export
> a report.

Privacy label: *Data Not Linked to You → Usage Data*. Wording: **sync**.

### Baby Tracker — Newborn Log (Nighp Software) — mixed precedent

<https://apps.apple.com/us/app/baby-tracker-newborn-log/id779656557> · category **Medical**

> Works with iCloud or Dropbox for secure, cloud-based auto backup. Sync data among multiple devices
> for all caregivers…

FAQ, <https://nighp.com/babytracker/FAQ.html>:

> Baby Tracker will never collect or send your data to our server. If you use backup or sync
> functionality, your data will be send to your own iCloud or Dropbox account.

Privacy label: *Data Used to Track You → Identifiers*; *Data Not Linked to You → Device ID,
advertising data, product interaction*. **No health data declared** despite logging feeds, weight,
growth, and photos. **Caveat:** Nighp also operates its own "Baby Tracker Server" sync which *does*
collect records and photos, so this is not a clean local-only precedent. Uses **both** "backup" and
"sync".

### Health Connected — the only listing using CloudKit vocabulary

<https://apps.apple.com/us/app/-/id1504006981> · Health & Fitness

> iCloud **shared database** is used to sync the health record from the patient's device to the
> doctor's device.
>
> No third party databases (only iCloud), no analytical / ad frameworks, developers have no access to
> your health data.

"shared database" is `CKDatabase` vocabulary. Privacy label: "has not provided details about its
privacy practices" — useless as label precedent. **Stale:** v2.1, dated 2020-10-05. Legacy, not
current-review evidence.

### Not precedent (checked and excluded)

**Bearable** and **mySymptoms Food Diary** run their **own servers**, not CloudKit — not relevant.
**Gentler Streak** keeps health data local via HealthKit and only puts *photo metadata* in private
iCloud. **Eczema Tracker**, **EczemaWise**, **Migraine Buddy** were not verified.

### What precedent shows

1. Health/infant data does reach the store with optional iCloud sync, currently, including two apps
   with full **"Data Not Collected"** labels.
2. The **backup vs. sync** framing distinction shows up in the wild: the app that thought hardest
   about it (Trace) chose "**Backup**, off by default" for its App Store-facing copy. Opt-in backup
   framing appears to be the more conservative review posture.
3. Nobody has a primary-source exemption. They ship and pass.

---

## 4. Privacy-label consequence

Under Apple's definition (§2b), the app's data **is** Health data. Whether it is "collected" turns
on the developer's inability to access a CloudKit private database — a reasonable reading of
"in a way that allows you … to access it," but **UNVERIFIED** as Apple guidance because the App
Privacy page never names iCloud or CloudKit. Two live precedent apps (Bloom Private, BabyRo) declare
**Data Not Collected** with iCloud sync of health data. Whichever answer App Review gives on 5.1.3(ii)
should also be used to settle the label.

---

## 5. Drafted App Review query

**Channel:** App Store Connect → Contact Us → App Review → guideline question, i.e.
<https://developer.apple.com/contact/app-store/?topic=guideline>. That URL 302-redirects to Apple ID
sign-in, confirming it is a developer-authenticated form; the exact on-page field labels could not be
retrieved and are **UNVERIFIED**. Requires an active Apple Developer Program membership, so this is
gated on enrolment (handoff §7b).

**Why it is phrased this way.** Boilerplate deflection ("please review the guidelines") is the
default response to an open-ended interpretation question. The draft therefore: states a concrete
technical architecture rather than asking an abstract legal question; asks a **binary** question with
two named options; pre-empts the two obvious deflections (HealthKit, and "read the guideline") by
naming them; cites Apple's own contradicting documentation so a reviewer cannot resolve it by
restating the clause; and explicitly says the answer determines whether a feature is built, which
frames it as a pre-submission blocker rather than idle curiosity.

Do **not** soften it into "is this allowed?" — that invites "submit and find out."

---

> **Subject:** Guideline 5.1.3(ii) — scope of "may not store personal health information in iCloud" for an app's own CloudKit private database
>
> Hello,
>
> I am preparing a new iOS app and need a written interpretation of Guideline 5.1.3(ii) before I
> build its storage layer. I would rather resolve this now than submit a binary that has to be
> rearchitected after review.
>
> **The app.** A record-keeping app for parents tracking an infant's atopic eczema. The parent
> manually records meals, skin observations, and photos of affected skin. The app is record-only: it
> makes no diagnosis, gives no advice, derives no correlations, and issues no instructions. It will be
> submitted in the Health & Fitness category.
>
> **The architecture in question.** SwiftData backed by `NSPersistentCloudKitContainer`, writing to
> the **private database of the app's own CloudKit container**, in the user's own iCloud account.
> Sensitive fields would be marked encrypted via CloudKit encrypted fields. I operate no server, and
> I have no ability to read the contents of a user's private database. The app does **not** read from
> or write to HealthKit, the Clinical Health Records API, the Motion & Fitness API, or the
> MovementDisorder API. None of the data originates from an Apple health API — all of it is entered
> by the user in my app.
>
> **My question, and it is a binary one.** Does Guideline 5.1.3(ii)'s prohibition on storing personal
> health information in iCloud:
>
> **(A)** apply to this architecture — i.e. an app's own CloudKit private database counts as "iCloud"
> for the purposes of 5.1.3(ii), and I must not sync this data; or
>
> **(B)** not apply to this architecture — i.e. 5.1.3(ii) governs data obtained from HealthKit and
> the other health APIs named in 5.1.3(i), and user-entered health data in a developer's own CloudKit
> private database is permitted.
>
> I am asking because Apple's published materials appear to point both ways and I cannot resolve the
> conflict from the documentation:
>
> - Guideline 5.1.3(ii) says "iCloud" without qualification and names no API.
> - Apple's CloudKit documentation, "Encrypting user data"
>   (developer.apple.com/documentation/cloudkit/encrypting-user-data), states: "Use encrypted fields
>   to offer data encryption to your users in your CloudKit-based apps, such as Photos, Notes,
>   **Health**, Home, and so forth" — which reads as contemplating health data in a developer's
>   CloudKit container.
> - Apple's App Privacy Details page defines the Health data type to include "any other user provided
>   health or medical data," i.e. not limited to HealthKit-sourced data.
>
> **If the answer is (A)**, I have two follow-up questions that determine my fallback design:
>
> 1. Does the same prohibition extend to the app's **iCloud Drive ubiquity container**
>    (`com.apple.developer.ubiquity-container-identifiers`), which is likewise "iCloud"?
> 2. Is a **user-initiated export** — the user explicitly saving an encrypted archive of their own
>    data into their own iCloud Drive via the Files app or the share sheet — permitted under
>    5.1.3(ii)?
>
> **Why this matters and cannot be deferred.** My users are parents of infants with a chronic skin
> condition, recording months of daily observations that they show to a dermatologist. If they delete
> and reinstall the app, that record is lost — iCloud Backup only restores during device setup, so it
> does not cover reinstall. Durable storage in the user's own iCloud is the only mechanism that
> protects this data. If 5.1.3(ii) forbids it, I need to know before I build it, and I need to tell my
> users their records are device-only.
>
> A written answer of (A) or (B) is what I need. I understand you cannot pre-approve an app; I am not
> asking for pre-approval, only for the scope of this one clause.
>
> Thank you,
> [name] · [Team ID] · [app name if a record exists in App Store Connect]

---

**When the answer arrives, record it.** It settles a decision that gates architecture, so it belongs
in `docs/adr/` as a new ADR (and would amend ADR-0001 and ADR-0029, both of which this transition
already contradicts). Paste the response verbatim — a paraphrase of an App Review answer is worth
much less than the answer.

**If Apple deflects** (a boilerplate "please refer to the guidelines" reply is a realistic outcome),
that is itself the answer to record: the clause is unresolvable in advance, and the decision becomes
a risk call rather than a compliance one. In that case the escalation path is a resubmission of the
same query, then App Review Board escalation after an actual rejection — the Board reviews decisions,
not hypotheticals, so it cannot be used pre-emptively.

---

## 6. Fallback assessment — what survives delete-and-reinstall if the answer is (A)

The requirement (handoff §2): data must survive **Delete App followed by reinstall** on the same
device and Apple Account — not merely device loss.

| Mechanism | Survives delete + reinstall | Fits ~100s MB of photos | Apple-documented | 5.1.3(ii) exposure |
|---|---|---|---|---|
| CloudKit private DB | Yes | Yes | Yes | **The question** |
| iCloud Drive ubiquity container | Yes in practice | Yes | **Lifecycle UNVERIFIED** | Same as CloudKit |
| User export to Files / iCloud Drive | Yes, user-dependent | Yes | Yes | Arguably lower (see below) |
| `NSUbiquitousKeyValueStore` | Likely | **No — 1 MB cap** | Limits yes, lifecycle no | Same as CloudKit |
| iCloud Backup | **No** | n/a | Yes | n/a |
| Keychain | Yes in practice | **No** | Explicitly non-contractual | n/a |
| App Group container | **No** | n/a | Forum-only | n/a |
| Offload App | Yes — but it is not a Delete | Yes | Yes | n/a |

### The critical finding: the fallback carries the same textual risk

5.1.3(ii) says **"in iCloud."** It names no API. CloudKit, the ubiquity container,
`NSUbiquitousKeyValueStore`, and iCloud Backup are all iCloud. Nothing in the guidelines narrows the
clause to CloudKit. **If CloudKit private DB is ruled out by 5.1.3(ii), the app's own ubiquity
container is ruled out by the same words.** Switching mechanism does not buy compliance — which is
why follow-up question 1 in the draft query exists.

**UNVERIFIED:** Apple publishes no interpretive note distinguishing the ubiquity container from
CloudKit for 5.1.3(ii), and no definition of "personal health information" in the guidelines.

### Per-mechanism detail

**iCloud Backup — does not solve the problem.** Confirms the handoff's premise. Backup includes "app
data for the apps that you've downloaded on your device"
([HT108770](https://support.apple.com/en-us/108770)), but restore is a whole-device setup operation:
"If you already set up your device, you need to erase all of its content before you can use these
steps to restore from your backup"
([HT118105](https://support.apple.com/en-us/118105)). There is no per-app restore. Trap in the same
article: setting up as new and backing up "will overwrite your previously saved iCloud backups."

**Offload vs. Delete.** [HT108429](https://support.apple.com/en-us/108429): offloading "frees up
storage used by the app, but keeps its documents and data"; deleting "removes the app and its related
data." Offload is not a strategy — the stated scenario is an explicit Delete.

**iCloud Drive ubiquity container — works, but Apple never documents the deletion lifecycle.**
Apple documents the container's structure ([Designing for Documents in
iCloud](https://developer.apple.com/library/archive/documentation/General/Conceptual/iCloudDesignGuide/Chapters/DesigningForDocumentsIniCloud.html):
"Place files in the `Documents` subdirectory of an iCloud container to make them visible to the user
and make it possible for the user to delete them individually"), the Info.plist keys
(`NSUbiquitousContainerIsDocumentScopePublic`, "Defaults to `NO`" —
[Cocoa Keys](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CocoaKeys.html)),
and sandbox extension ([`url(forUbiquityContainerIdentifier:)`](https://developer.apple.com/documentation/foundation/filemanager/url(forubiquitycontaineridentifier:))).
Strongest indirect evidence that the data outlives the app —
[Apple iCloud User Guide](https://support.apple.com/guide/icloud/keep-third-party-app-data-up-to-date-mm62d92d6b3e/icloud):
"You can always see how much storage the third-party app is using, **and delete the data if you're no
longer using the app.**" That affordance only makes sense if app deletion does not remove it.
**UNVERIFIED:** no Apple doc states the container survives app deletion, and no Apple doc describes
any "also delete iCloud data?" prompt in the Delete App flow.

**User-driven export — the guideline-cleanest option, and the weakest guarantee.** Files the user
explicitly saves into their own iCloud Drive or shares out are user documents, not app container
data; nothing in the delete-app flow touches them. Guideline 2.5.15 already expects file pickers to
surface "items from the Files app and the user's iCloud documents." *Our reading* — **UNVERIFIED as
Apple's position** — is that the user placing their own exported document in their own Files is
materially different from the app storing PHI in iCloud, which is why it is follow-up question 2.
Cost: it only works if the user actually does it, on a schedule.

**`NSUbiquitousKeyValueStore` — unusable.**
[Docs](https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore): "no more than
1024 keys"; "The total amount of available storage space for all values is 1 megabyte." At best a
tiny pointer.

**Keychain — explicitly non-contractual.** Apple DTS (Quinn),
[forums thread 36442](https://developer.apple.com/forums/thread/36442): "All versions of iOS prior to
10.3 beta preserve keychain items when an app is deleted… This was most definitely an implementation
detail of the original iOS keychain. **Our keychain documentation has never specified what would
happen in this case.**" iOS 10.3 beta deleted them and the change was rolled back before GM; "I don't
think it would surprise anyone if the 10.3 behaviour returned at some point in the future." Usable
only for a small key or container pointer, and even that is not guaranteed.

**App Group container — no.** Apple DTS in [thread 720458](https://developer.apple.com/forums/thread/720458)
and [thread 43481](https://developer.apple.com/forums/thread/43481): group containers are reference
counted and removed when the last app referencing the group is removed. **UNVERIFIED in official
documentation** — forum-only.

### Recommended posture if the answer is (A)

1. **Local-first SwiftData** as the system of record (already the plan).
2. **Encrypted user-initiated export** — a single archive file the user saves to Files/iCloud Drive,
   plus the CSV/PDF export already planned for GDPR Art. 20 portability. Add matching **import**;
   without import, export does not satisfy the reinstall requirement.
3. **Prompt the user to export on a schedule** and surface time-since-last-export prominently. This
   is the honest cost of (A): durability becomes the user's responsibility, and the UI has to say so.
4. **Say it plainly in the App Store description and onboarding** — "your records live on this device;
   export regularly." Under PLD (EU) 2024/2853 Art. 6(1)(c), destruction or corruption of data is
   compensable damage (handoff §7), so a silent data-loss mode is a liability surface, not just a UX
   one.

### Independent of the answer

Handoff §6 already flags this and it remains required either way: the private database is entirely
inaccessible when the user is not signed into iCloud (`CKAccountStatus.noAccount`). Local-only
operation plus export must be a supported mode, not a crash path — which means the (A) fallback has
to be built regardless of the answer. **That is the practical scheduling conclusion: build the
local-first + export path first; it is unblocked, and the sync layer layers on top of it.**

---

## Sources

Apple, primary:

- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) — 5.1, 5.1.1, 5.1.2, 5.1.3, 2.5.2, 2.5.15
- [App Privacy Details](https://developer.apple.com/app-store/app-privacy-details/)
- [CloudKit — Encrypting user data](https://developer.apple.com/documentation/cloudkit/encrypting-user-data)
- [CloudKit product page](https://developer.apple.com/icloud/cloudkit/) · [Deciding whether CloudKit is right for your app](https://developer.apple.com/documentation/cloudkit/deciding-whether-cloudkit-is-right-for-your-app)
- [HealthKit](https://developer.apple.com/documentation/healthkit)
- [Protecting access to users' health data](https://support.apple.com/guide/security/protecting-access-to-users-health-data-sec88be9900f/web) · [iCloud data security overview](https://support.apple.com/guide/security/icloud-data-security-overview-sec973254c5f/web)
- [What does iCloud back up?](https://support.apple.com/en-us/108770) · [Restore from a backup](https://support.apple.com/en-us/118105) · [Check storage](https://support.apple.com/en-us/108429) · [Keep third-party app data up to date](https://support.apple.com/guide/icloud/keep-third-party-app-data-up-to-date-mm62d92d6b3e/icloud)
- [Designing for Documents in iCloud](https://developer.apple.com/library/archive/documentation/General/Conceptual/iCloudDesignGuide/Chapters/DesigningForDocumentsIniCloud.html) · [Cocoa Keys](https://developer.apple.com/library/archive/documentation/General/Reference/InfoPlistKeyReference/Articles/CocoaKeys.html) · [File System Programming Guide](https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/FileSystemOverview/FileSystemOverview.html)
- [`NSUbiquitousKeyValueStore`](https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore) · [`url(forUbiquityContainerIdentifier:)`](https://developer.apple.com/documentation/foundation/filemanager/url(forubiquitycontaineridentifier:)) · [Configuring app groups](https://developer.apple.com/documentation/xcode/configuring-app-groups)
- Forums: [653141](https://developer.apple.com/forums/thread/653141) (unanswered) · [749027](https://developer.apple.com/forums/thread/749027) (Apple engineer) · [36442](https://developer.apple.com/forums/thread/36442) (Quinn, keychain) · [720458](https://developer.apple.com/forums/thread/720458) · [43481](https://developer.apple.com/forums/thread/43481)
- WWDC: [WWDC21 10086](https://developer.apple.com/videos/play/wwdc2021/10086/) · [WWDC23 10053](https://developer.apple.com/videos/play/wwdc2023/10053/)
- News: [a233fmpw](https://developer.apple.com/news/?id=a233fmpw) · [d75yllv4](https://developer.apple.com/news/?id=d75yllv4) · [ey6d8onl](https://developer.apple.com/news/?id=ey6d8onl) · [9txfddzf](https://developer.apple.com/news/?id=9txfddzf) · [06032019j](https://developer.apple.com/news/?id=06032019j)

Third-party app listings (precedent, §3): [Bloom Private](https://apps.apple.com/us/app/private-period-cycle-tracker/id6755919025) · [BabyRo](https://apps.apple.com/us/app/babyro-simple-baby-tracker/id6760269041) · [Trace](https://apps.apple.com/app/trace-symptom-tracker/id6756234011) + [trace.care](https://www.trace.care/private-symptom-tracker/) · [Symptom Tracker: My Health](https://apps.apple.com/us/app/symptom-tracker-my-health/id6759116566) · [Baby Tracker](https://apps.apple.com/us/app/baby-tracker-newborn-log/id779656557) + [FAQ](https://nighp.com/babytracker/FAQ.html) · [Health Connected](https://apps.apple.com/us/app/-/id1504006981)

Not legal advice.
