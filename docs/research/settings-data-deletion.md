# Settings, data deletion, and `NSUbiquitousKeyValueStore` — Apple-sourced findings

Research note for the eczema-helper → iOS port behavior spec (map issue
[#716](https://github.com/jirigrill/eczema-helper/issues/716), "Write the settings spec section").

**Scope of the app being specced:** iOS, SwiftUI + SwiftData + CloudKit **private database**, mandatory
always-on sync (no toggle), `encryptedValues` from release one. No export, no import, no backup, no PDF.
No accounts of its own — only the system iCloud account. One setting (a feeding-stage enum) lives in
`NSUbiquitousKeyValueStore`, outside the SwiftData/CloudKit store. An in-app "delete all my data" control
is already decided to ship.

**Sourcing rule applied here:** primary sources only. Primary = Apple developer documentation, Apple
support pages, the App Store Review Guidelines, the Human Interface Guidelines, SDK headers on this
machine, Apple sample code, WWDC transcripts. Blogs, StackOverflow and forum posts are not primary and
are not cited. Apple Developer Forums were not used: search surfaced several threads on zone deletion
(77005, 81768, 105752, 120256, 133213), but none was identifiable as an Apple-engineer answer from
search metadata alone, and those pages are frequently behind bot protection. Where a claim could not be
sourced it is marked **NOT FOUND** with a note on what was searched.

**All web fetches: 2026-08-19.** Header reads are from the iOS 27.0 SDK shipped in
`/Applications/Xcode-beta.app` (`Foundation.framework/Headers/NSUbiquitousKeyValueStore.h`).

This note records findings only. It makes no recommendation about what the product should do.

---

## Summary of findings

- **A.** A KVS write with no iCloud account **succeeds and stays local** — Apple states this in the class
  documentation and header. Reads return the local value; there is essentially **no error surface**
  (getters return `nil`/zero, setters return `void`, only `synchronize()` returns a Bool and its
  documented failure example is a missing entitlement, not a missing account). The `restricted`
  (MDM/parental-controls) case is **NOT FOUND** for KVS specifically; MDM can disable key-value sync via
  `allowCloudDocumentSync`, but Apple does not document what the API then does. **Prior conclusion that
  KVS absence is unfalsifiable is CONFIRMED**: nothing distinguishes "key was never set" from "not
  downloaded yet".
- **B.** Guideline 5.1.1(v) is scoped to apps that **support account creation**. An app with no accounts
  of its own is **out of scope**. Apple's supporting page never mentions iCloud, CloudKit or
  device-local data. But see the contradiction in **§B.3**: a *different* Apple page imposes a softer
  obligation that does bite.
- **C.** Users can delete an app's iCloud data from **Settings > [your name] > iCloud > Manage Account
  Storage**, and Apple's own `CKError.Code.userDeletedZone` — "An error that occurs when the user
  deletes a record zone using the Settings app" — confirms this deletes **record zones**. Whether
  uninstalling the app removes CloudKit data is **NOT FOUND in either direction** — a strong negative,
  since Apple's dedicated delete-an-app support article mentions iCloud only to link to a separate
  Backup article. KVS-on-uninstall: **NOT FOUND**.
- **D.** Apple has a first-party recipe: *Responding to Requests to Delete Data* —
  `fetchAllRecordZones` on the private database, then `CKModifyRecordZonesOperation` deleting every
  zone. SwiftData has `ModelContainer.deleteAllData()`, documented as permanent — but its doc says
  "the app's persistent storage" and says **nothing about CloudKit**. Deletion is **not verifiably
  complete**: no API answers "is this user's data gone everywhere", and Apple describes sync as a
  natural-cadence background process ("similar to the water cycle").
- **E.** HIG gives a clear, sourced pattern for an uncommon un-undoable destructive action (alert,
  specific verb, Cancel, no default button) and `ButtonRole.destructive` is documented for exactly this.
  There is **no** Apple guidance on whether a reset control belongs in-app or in Settings. A **Settings
  bundle cannot express an action at all** — the schema has only eight specifier types, none a button.
  Apple sample code **does** demonstrate delete-all (SwiftData `SwiftDataAnimals`, and the CloudKit
  delete article).
- **F.** What to show after the wipe is **NOT FOUND** — a strong negative across the whole current HIG.
  The "don't quit programmatically" guidance exists and is quotable, but survives only in an
  **archived 2012 Technical Q&A (QA1561)**; it is absent from the current HIG.

**Two contradictions with the prompt's premises are flagged in §B.3 and §D.5. Read those.**

---

## A. `NSUbiquitousKeyValueStore` when iCloud is unavailable

### A.1 Writes succeed and persist locally — documented

Both the SDK header on this machine and the published class documentation carry the same sentence:

> When you write a new value, the iCloud key-value store saves it in memory initially and writes it to
> disk asynchronously later. **If the device doesn't have an active Apple account, the changes remain
> only on the current device.** When the person signs into their account, the system forwards any
> changes to the iCloud server and reconciles the values there with the local ones.

— `NSUbiquitousKeyValueStore.h`, iOS 27.0 SDK, `/Applications/Xcode-beta.app/Contents/Developer/Platforms/IPhoneOS.platform/Developer/SDKs/iPhoneOS27.0.sdk/System/Library/Frameworks/Foundation.framework/Headers/NSUbiquitousKeyValueStore.h`, read 2026-08-19; identical text at
<https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore> (fetched 2026-08-19).

Apple's archived iCloud Design Guide states it more bluntly still:

> **Key-value storage is effectively always available.** If a device is not attached to an account,
> changes created on the device are pushed to iCloud as soon as the device is attached to the account.

— *iCloud Fundamentals*, Table 1-1 ("Detecting availability" row),
<https://developer.apple.com/library/archive/documentation/General/Conceptual/iCloudDesignGuide/Chapters/iCloudFundametals.html>
(fetched 2026-08-19). **ARCHIVED** (served under `/library/archive/`).

The same archived guide also notes the flip side, which matters for a signed-out-then-signed-in device:

> If the current iCloud account becomes unavailable while your app is running or in the background, your
> app must remove references to user-specific iCloud files and data and to reset or refresh user
> interface elements that show that data.

— same page.

### A.2 Reads return the last known local value, not `nil`

The header types every getter as nullable and documents `objectForKey:` as:

> The object associated with `aKey`, or `nil` if the key isn't present.

— `NSUbiquitousKeyValueStore.h`, iOS 27.0 SDK, read 2026-08-19.

Combined with A.1 (values written while signed out "remain only on the current device") the reading is:
a read returns whatever is in the local in-memory/on-disk copy. There is **no documented sentence**
saying "reads fail when signed out", and no documented "unavailable" sentinel distinct from `nil`.
Scalar getters (`longLongForKey:`, `doubleForKey:`, `boolForKey:`) are non-optional and therefore
cannot express absence at all.

### A.3 Error surface: essentially none

The full documented error surface of the class, from the header and class page:

- Every setter returns `void`. There is no error parameter, no throwing variant, no completion handler.
- `synchronize()` is the only method returning a status:
  > Synchronizes the in-memory keys and values with the ones stored in iCloud. Returns `YES` if the
  > in-memory and iCloud keys are synchronized, or `NO` if an error occurred.

  — header, read 2026-08-19. The published discussion gives exactly one worked failure example, and it
  is not about accounts:
  > **Return Value:** … this method returns `false` if the app doesn't have the required entitlements to
  > access the iCloud key-value store.

  — <https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore/synchronize()>
  (fetched 2026-08-19).
- Quota/size violations, and only those, produce a notification:
  > If you exceed any of the prescribed limits during a write operation, the operation fails and the
  > system doesn't add the keys or values to the store. If a key string exceeds the maximum length, the
  > system raises an exception. If a write operation would exceed your app's quota, the system posts
  > `didChangeExternallyNotification` … with the change reason set to
  > `NSUbiquitousKeyValueStoreQuotaViolationChange`.

  — header, read 2026-08-19.
- `synchronize()` explicitly does **not** force a network round-trip:
  > Don't rely on keys and values being available on the person's other devices immediately. This method
  > doesn't force the system to write new keys and values to iCloud. Instead, it notifies iCloud that new
  > keys and values are available. iCloud determines the best time to retrieve those keys and synchronize
  > them with the person's other devices. Typically, iCloud limits updates to several times per minute.

  — synchronize() page, fetched 2026-08-19.

**There is no documented error case for "signed out" or "restricted".** The four change-reason constants
are `ServerChange`, `InitialSyncChange`, `QuotaViolationChange`, `AccountChange` — none is an error, and
`AccountChange` is documented only as "A constant that indicates the current Apple account changed."
(header, read 2026-08-19).

### A.4 The `restricted` case (MDM / parental controls)

**NOT FOUND for `NSUbiquitousKeyValueStore`.** Searched: the class page, `default`, `synchronize()`, the
SDK header in full, the archived iCloud Design Guide, and the archived *Storing Preferences in iCloud*
chapter. None mentions restrictions, supervision, MDM, Screen Time or parental controls.

What *is* documented is that MDM can disable the mechanism:

> **`allowCloudDocumentSync`** — If `false`, the system disables **document and key-value syncing** to
> iCloud. Requires a supervised device in iOS 13 and later, and Shared iPad doesn't support it. Support
> for this restriction on unsupervised devices and with Managed Apple Accounts is deprecated.

— <https://developer.apple.com/documentation/devicemanagement/restrictions> (fetched 2026-08-19 via the
page's backing JSON). Availability iOS 5+.

Note the neighbouring key is *not* the relevant one, despite the name:

> **`allowCloudKeyValueSync`** — If `false`, the system disables **iCloud Keychain** synchronization.

— same page. This key concerns Keychain, not `NSUbiquitousKeyValueStore`, despite reading as though it
were about KVS. Worth recording so nobody mis-cites it later.

Apple documents the restriction's effect on *syncing*, but **nowhere documents what the KVS API returns
or does on a restricted device**. `CKAccountStatus.restricted` — the CloudKit-side analogue — is
documented only as "The system denies access to the user's iCloud account."
(<https://developer.apple.com/documentation/cloudkit/ckaccountstatus>, fetched 2026-08-19), and
`CKAccountStatus` has no counterpart in Foundation's KVS API: **KVS exposes no account-status query at
all.**

### A.5 Can an app distinguish "never set" from "not downloaded yet"? — No. Prior conclusion CONFIRMED.

There is no such signal. The evidence:

1. Getters return `nil` (or a zero scalar) for both cases, with no discriminator — §A.2.
2. The only initial-sync signal is a notification, and it fires **only if you write during the
   download**, not on read:
   > The system downloads the existing keys and values from iCloud when someone logs into a device using
   > their Apple account. **If you try to write a key and value to the iCloud data store while this
   > initial download is in progress**, the system generates the `didChangeExternallyNotification`
   > notification with this key. Schedule the write operations after a delay to give the system time to
   > download the data and ensure the local copies match the truth in iCloud.

   — `NSUbiquitousKeyValueStoreInitialSyncChange`,
   <https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestoreinitialsyncchange>
   (fetched 2026-08-19). Note this is a *write-time* signal, so a read-only app never sees it.
3. There is no "has finished initial sync" property, no completion callback, and no timestamp on the
   store. Searched the header in full and the class page's whole topic list.

**So: an app that reads a KVS key and gets `nil` cannot tell whether the user never set it, whether the
value exists in iCloud but hasn't landed yet, or whether sync is disabled by MDM. The prior project
conclusion — that KVS absence is unfalsifiable — is confirmed, and is a documented property of the API
rather than a gap in our research.**

Apple's documented mitigation for exactly this is to keep a local shadow copy — which is architecturally
significant given the feeding-stage enum lives *only* in KVS today:

> The key-value store is not a replacement for preferences or other local techniques for saving the same
> data. The purpose of the key-value store is to share data between apps, but if iCloud is not enabled or
> is not available on a given device, you still might want to keep a local copy of the data. … If you are
> using the key-value store to share preferences, one approach is to store the actual values in the user
> defaults database and synchronize them using the key-value store. … By doing this, your user defaults
> database always contains the correct configuration values. The iCloud key-value store simply becomes a
> mechanism for ensuring that the user defaults database has the most recent changes.

— *Storing Preferences in iCloud*,
<https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/UserDefaults/StoringPreferenceDatainiCloud/StoringPreferenceDatainiCloud.html>
(fetched 2026-08-19). **ARCHIVED.**

### A.6 One further constraint on what may be stored in KVS

> **Important:** Don't store personal or sensitive information in the key-value store. The system stores
> the information on disk in an **unencrypted** format. Store personal or sensitive information in the
> person's Keychain instead.

— header, read 2026-08-19; identical on the class page. Recorded because the rest of this app's data is
`encryptedValues`-protected and the KVS setting is deliberately not.

---

## B. App Store Review Guideline 5.1.1(v)

### B.1 The current text, verbatim

> **(v) Account Sign-In:** If your app doesn't include significant account-based features, let people use
> it without a login. **If your app supports account creation, you must also offer account deletion
> within the app.** Apps may not require users to enter personal information to function, except when
> directly relevant to the core functionality of the app or required by law. If your core app
> functionality is not related to a specific social network (e.g. Facebook, WeChat, Weibo, X, etc.), you
> must provide access without a login or via another mechanism. Pulling basic profile information,
> sharing to the social network, or inviting friends to use the app are not considered core app
> functionality. The app must also include a mechanism to revoke social network credentials and disable
> data access between the app and social network from within the app. An app may not store credentials or
> tokens to social networks off of the device and may only use such credentials or tokens to directly
> connect to the social network from the app itself while the app is in use.

— <https://developer.apple.com/app-store/review/guidelines/> §5.1.1(v) (fetched 2026-08-19).

### B.2 Scope: account *creation*. This app is out of scope.

The obligation is conditioned on a single clause — "**If your app supports account creation**". The
supporting page repeats the same scoping in its opening line:

> Starting June 30, 2022, apps submitted to the App Store **that support account creation** must also let
> users initiate deletion of their account within the app. Deleting an account removes the account from
> the developer's records, along with any data associated with the account that the developer isn't
> legally required to maintain.

— <https://developer.apple.com/support/offering-account-deletion-in-your-app/> (fetched 2026-08-19).

Two of that page's nine FAQ items probe the edge of "account creation", and both extend it only to
*developer-side* accounts:

> **My app automatically creates an account for the user. Do I need to include an option to initiate
> account deletion?** Yes. Users should have the option to delete automatically generated accounts
> (sometimes called "guest" accounts) and the data associated with those accounts.

> **If my app links out to the default web browser for account creation, does it still need to offer
> account deletion within the app?** Yes.

— same page. Neither reaches an app that creates no account of any kind and holds data only in the
user's own iCloud private database.

**Strong negative:** the "Offering account deletion in your app" page — read in full, all nine FAQ items —
**never mentions iCloud, CloudKit, on-device storage, or data held in the user's own account.** The word
"developer's records" in the definition of what deletion removes points the other way entirely: an app
with no backend has no records to remove. Guideline 5.1.1 as a whole (subsections (i)–(x), read in full)
mentions iCloud exactly once, in an unrelated place — 5.1.3(ii) on health data ("may not store personal
health information in iCloud"). CloudKit is not mentioned anywhere in the guidelines.

**Conclusion: 5.1.1(v) does not bind this app.**

### B.3 ⚠️ CONTRADICTION — a different Apple page *does* impose an obligation, and it includes export

5.1.1(v) is not the only Apple rule in this area, and the prompt's framing (that the question is whether
5.1.1(v) applies) misses the one that actually reaches a CloudKit app with no accounts:

> **Responding to Requests to Delete Data** — Provide options for users to delete their CloudKit data
> from your app.
>
> If your app stores data in CloudKit on behalf of your users, **give them a simple way to delete their
> data.**

— <https://developer.apple.com/documentation/cloudkit/responding-to-requests-to-delete-data>
(fetched 2026-08-19). This is *developer documentation*, not a review guideline, so its enforcement
status is weaker — but it is conditioned on "stores data in CloudKit", which this app does, and it is
Apple's only on-point statement.

And its sibling page states an obligation the product has explicitly ruled out:

> **Providing User Access to CloudKit Data** — Provide users access to the data your app stores on their
> behalf.
>
> **User data in CloudKit belongs to the user. For this reason, apps that integrate with CloudKit need to
> provide users with a way to view and export their data.**

— <https://developer.apple.com/documentation/cloudkit/providing-user-access-to-cloudkit-data>
(fetched 2026-08-19; verified against the page's backing JSON, quoted verbatim).

**This directly contradicts the "no export, ever" premise.** Recorded as a finding, not a
recommendation. Notes on how far it goes:

- It is developer documentation, not the App Store Review Guidelines. It is **not** in the guidelines;
  I read 5.1.1 in full and searched for "export" — no export obligation appears there. So it is not,
  on this evidence, a review gate.
- The page's own method is a *report*, not a file: "Use each field's keys and values to give users an
  accessible report of the data your app stores in CloudKit." It also notes: "If your app uses CloudKit
  subscriptions to maintain an on-device copy of user data, you can use that copy to generate the report
  rather than querying CloudKit." Whether an on-screen report satisfies "export" is not stated —
  **NOT FOUND**.
- 5.1.1(i) separately requires the *privacy policy* to "Explain its data retention/deletion policies and
  describe how a user can revoke consent and/or request deletion of the user's data" (guidelines page,
  fetched 2026-08-19). That does apply, and is satisfiable in prose.

---

## C. The system-level deletion path

### C.1 Deleting an app's iCloud data from Settings

Apple documents the navigation path generically — the worked examples are Apple's own features, not a
third-party app:

> Open the Settings app, tap your name, then tap iCloud.
> Tap Storage or Manage Account Storage.
> Tap Contact Images, then tap **Delete Data from iCloud**.

— <https://support.apple.com/en-us/108922> ("Manage your iCloud storage on your Apple device"), fetched
2026-08-19. The same three-step shape is repeated for FaceTime. macOS equivalent: Apple menu > System
Settings > [your name] > iCloud > Manage.

That third-party apps appear in this list, and that deletion is offered for them:

> Below the graph, you see a list of apps and features and how much iCloud storage they use. The apps and
> features that use the most storage are at the top of the list. You can tap an app or feature for more
> information.

— <https://support.apple.com/guide/icloud/check-your-icloud-storage-on-any-device-mm039c13d410/icloud>
(fetched 2026-08-19).

> Regardless of whether or not you can see the data in iCloud Drive, **you can always see how much storage
> the third-party app is using, and delete the data if you're no longer using the app.**

— <https://support.apple.com/guide/icloud/icloud-party-apps-mm62d92d6b3e/icloud> (fetched 2026-08-19).

The storage category a CloudKit private database falls into:

> **Documents (or Docs):** Files and information stored in iCloud Drive, as well as data from other apps
> that aren't listed above — for example, Notes, Reminders, Health, and third-party apps.

— check-your-icloud-storage page, fetched 2026-08-19.

### C.2 What it deletes: record zones — confirmed by an Apple error code

The strongest developer-side evidence of the mechanism is an error code whose entire abstract describes
it:

> **`CKError.Code.userDeletedZone`** — An error that occurs when **the user deletes a record zone using
> the Settings app**.

— <https://developer.apple.com/documentation/cloudkit/ckerror/code/userdeletedzone> (fetched 2026-08-19).
Abstract only; the page has no Discussion and no recovery guidance.

So Apple's own model of the Settings affordance is **zone deletion in the app's private database**.
Because SwiftData / Core Data mirror into a single custom zone — Apple's own record dumps show the zone
name `com.apple.coredata.cloudkit.zone`:

> `<CKRecord: 0x7fbae9e19510; recordID=CD_Post_UUID: (com.apple.coredata.cloudkit.zone:__defaultOwner__), values={ "CD_entityName" = Post; }, recordType=CD_Post>`

— <https://developer.apple.com/documentation/coredata/reading-cloudkit-records-for-core-data> (fetched
2026-08-19) — a Settings-side deletion wipes this app's entire mirrored store.

**Is it available for every app using CloudKit? NOT FOUND as an explicit statement.** Apple says "always"
for third-party apps (mm62d92d6b3e, above), but no Apple page enumerates the conditions — e.g. whether an
app must exceed a storage threshold to get its own deletable row rather than being folded into
"Documents"/"Others". Searched: 108922, 118225, iCloud User Guide mm039c13d410 and mm62d92d6b3e, and
developer.apple.com/documentation/cloudkit.

### C.3 Does deleting the app remove its CloudKit data? — NOT FOUND, in either direction

This is a **strong negative** and the most important gap in section C. Apple's dedicated support article
on deleting apps says nothing about iCloud or CloudKit data at all:

> **Before you get started** — Cancel any in-app subscriptions that you don't need. If you delete an app,
> it doesn't automatically cancel in-app subscriptions. …
> **How to delete an app** — Touch and hold the app. Tap Remove App. Tap Delete App, then tap Delete to
> confirm. …
> **Learn how to delete app data from your iCloud backup**

— <https://support.apple.com/en-us/101550> ("Delete apps on your iPhone or iPad", published
2025-12-18), fetched 2026-08-19.

Note what the last line is: the only iCloud pointer Apple offers is a link to a *separate* action about
iCloud **Backup** — i.e. deletion is not presented as implied by uninstall. The iPhone User Guide is
similarly silent for third-party apps, and its one statement is scoped to built-ins:

> When you remove a **built-in** app from your iPhone, you also remove any related user data and
> configuration files.

— <https://support.apple.com/guide/iphone/remove-or-delete-apps-iph248b543ca/ios> (fetched 2026-08-19).

**The prompt asked: "If Apple documents that CloudKit data survives app deletion, that is the key fact —
source it precisely." Apple does not document it, either way.** What exists is four pieces of indirect
evidence pointing at survival:

1. The third-party-apps guide frames deletion as a separate deliberate action taken "if you're no longer
   using the app" (mm62d92d6b3e).
2. Apple documents a distinct explicit action for iCloud *Backup* app data and says it is that action
   that removes the data: "When you confirm that you want to Turn Off, it turns off iCloud Backup for
   that app and removes all of its information from iCloud." (<https://support.apple.com/en-us/108922>,
   fetched 2026-08-19).
3. Turning iCloud off for an app is documented as non-destructive: "When you turn off iCloud for an app,
   the app no longer connects with iCloud, so your data exists only on your device."
   (<https://support.apple.com/en-us/118225>, published 2026-03-27, fetched 2026-08-19).
4. Apple instructs developers to build their own deletion affordance (§D.1) — which would be redundant if
   uninstall sufficed.

For spec purposes, the accurate statement is: *Apple nowhere documents uninstall as deleting CloudKit
private-database data, and Apple's own developer guidance presupposes that it does not.* That is an
inference, and should be labelled as one.

### C.4 Does deleting the app remove `NSUbiquitousKeyValueStore` data? — NOT FOUND

Read the full class Overview at
<https://developer.apple.com/documentation/foundation/nsubiquitouskeyvaluestore> (fetched 2026-08-19) and
the full SDK header. Both cover the sync model, the quotas, the App Store +
`com.apple.developer.ubiquity-kvstore-identifier` entitlement requirement, and offline behavior — and say
**nothing** about app deletion or store removal. Also searched the support pages in C.1–C.3; none
mentions KVS lifecycle on uninstall.

### C.5 Account-level deletion, and "Reset Encrypted Data"

- **privacy.apple.com** is account-level only, not per-app: "Delete your Apple Account — and the data
  associated with it — permanently." (<https://support.apple.com/en-us/102283>, fetched 2026-08-19; tool
  at <https://privacy.apple.com/account>). No per-app CloudKit-container deletion.
- **iCloud data security overview** describes the end-to-end-encrypted categories and recovery but not a
  per-app reset: "End-to-end encrypted data can be decrypted only on your trusted devices where you're
  signed in to your Apple Account. No one else can access your end-to-end encrypted data — not even
  Apple…" (<https://support.apple.com/en-us/102651>, fetched 2026-08-19).
- **The literal support-page button label "Reset Encrypted Data": NOT FOUND.** Search surfaced 102441,
  101265 and 109016 as candidates; the exact string was not confirmed in a fetched page body, so it is not
  asserted here. The developer-side counterpart *is* solidly sourced — see §D.4.

---

## D. What the app can delete programmatically, and the failure modes

### D.1 Apple's documented "delete all my CloudKit data" recipe

Apple has a first-party article that is precisely this. It is the anchor citation:

> **Responding to Requests to Delete Data** — Provide options for users to delete their CloudKit data from
> your app.
>
> If your app stores data in CloudKit on behalf of your users, give them a simple way to delete their
> data.
>
> To be sure that you delete all of a user's data that your app stores in CloudKit, cross-reference the
> list of containers your app has access to in Xcode and assemble a list of those containers' identifiers.

— <https://developer.apple.com/documentation/cloudkit/responding-to-requests-to-delete-data> (fetched
2026-08-19). Its prescribed shape is **zone deletion, not record deletion**:

```swift
for container in containers {
    container.privateCloudDatabase.fetchAllRecordZones { zones, error in
        guard let zones = zones, error == nil else {
            print("Error fetching zones.")
            return
        }

        let zoneIDs = zones.map { $0.zoneID }
        let deletionOperation = CKModifyRecordZonesOperation(recordZonesToSave: nil,
                                                             recordZoneIDsToDelete: zoneIDs)

        deletionOperation.modifyRecordZonesCompletionBlock = { _, deletedZones, error in
            guard error == nil else {
                let error = error!
                print("Error deleting records.", error)
                return
            }
            print("Records successfully deleted in this zone.")
        }

        container.privateCloudDatabase.add(deletionOperation)
    }
}
```

— same page, verbatim. Note it uses the older completion-block form.

The individual APIs, each carrying the same warning:

> **`CKDatabase.deleteRecordZone(withID:)`** — Deletes a specific record zone.
> **Warning: Deleting a record zone is a permanent action that deletes every record in that zone. You
> can't restore a deleted record zone.**
> This method throws an error if the request fails, such as when **the zone does not exist on the
> server**, the network is unavailable or the device doesn't have an active iCloud account.

— <https://developer.apple.com/documentation/cloudkit/ckdatabase/deleterecordzone(withid:)> (fetched
2026-08-19).

> **`CKDatabase.modifyRecordZones(saving:deleting:)`** — [same warning verbatim] … the returned tuple
> includes any individual record zone errors.

— <https://developer.apple.com/documentation/cloudkit/ckdatabase/modifyrecordzones(saving:deleting:)>
(fetched 2026-08-19).

> **`CKModifyRecordZonesOperation`** — After you create one or more record zones, use this operation to
> save those zones to the database. **You can also use the operation to delete record zones and their
> records.**

— <https://developer.apple.com/documentation/cloudkit/ckmodifyrecordzonesoperation> (fetched 2026-08-19).

> **`recordZoneIDsToDelete`** — The IDs of the record zones to **delete permanently** from the database. …
> The record zones must all target the same database.

— <https://developer.apple.com/documentation/cloudkit/ckmodifyrecordzonesoperation/recordzoneidstodelete>
(fetched 2026-08-19).

**May the default zone be deleted? NOT FOUND — Apple neither permits nor forbids it in words.** What
Apple does say is that `fetchAllRecordZones` returns it:

> An array of fetched record zones… When present, the array **contains at least one record zone, the
> default zone**.

— <https://developer.apple.com/documentation/cloudkit/ckdatabase/fetchallrecordzones(completionhandler:)>
(fetched 2026-08-19) — meaning Apple's own sample above passes the default zone's ID to
`recordZoneIDsToDelete` without comment and without documenting the result. Read in full and found no
statement either way: `CKRecordZone`, `CKRecordZone.default()`, `CKModifyRecordZonesOperation`,
`CKDatabase`, and the archived CloudKit Web Services `zones/modify` reference
(<https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/CloudKitWebServicesReference/ModifyZones.html>),
all fetched 2026-08-19. Practically this does not bite a SwiftData app, which mirrors into
`com.apple.coredata.cloudkit.zone`, not the default zone (§C.2).

**`NSPersistentCloudKitContainer`-level route: NOT FOUND.** Enumerated every topic on
<https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer> (fetched 2026-08-19).
Its API surface is `canUpdateRecord`/`canDeleteRecord`/`canModifyManagedObjects`, the sharing APIs,
`initializeCloudKitSchema(options:)`, and the `Event`/`EventRequest`/`EventResult`/`eventChangedNotification`
observability set. **There is no method that wipes the mirrored CloudKit data.**

### D.2 SwiftData's "delete everything"

**There is no `ModelContext.deleteAllData`.** The "Deleting models" section of
<https://developer.apple.com/documentation/swiftdata/modelcontext> (fetched 2026-08-19) contains exactly
`deletedModelsArray`, `delete(_:)`, and `delete(model:where:includeSubclasses:)`.

> **`delete(model:where:includeSubclasses:)`** — Removes each model satisfying the given predicate from the
> persistent storage during the next save operation.
> **Warning: If you don't provide a predicate, the context will remove all models of the specified type
> from the persistent storage.**

— <https://developer.apple.com/documentation/swiftdata/modelcontext/delete(model:where:includesubclasses:)>
(fetched 2026-08-19).

The delete-everything affordance exists, but on **`ModelContainer`**:

> **`ModelContainer.deleteAllData()`** — Removes all persisted model data from the app's persistent storage.
> **Warning: After you call this method, the container immediately deletes all data from the app's
> persistent storage. This deletion is permanent and cannot be undone.**

— <https://developer.apple.com/documentation/swiftdata/modelcontainer/deletealldata()> (fetched
2026-08-19). That is the entire documentation: two sentences.

**Crucially: it says "the app's persistent storage" — local — and says nothing whatsoever about CloudKit.
Whether `deleteAllData()` propagates a deletion to the CloudKit private database is NOT FOUND.** Searched
the `deleteAllData()` page, the `ModelContainer` overview, and
<https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices> in full;
the syncing article covers capabilities, schema limits and dev-schema initialization only, and never
mentions deletion, `deleteAllData()`, or zone removal.

Also note **`ModelContainer.erase()`** appears in the topic list with an **empty abstract and no
discussion** — Apple ships it undocumented
(<https://developer.apple.com/documentation/swiftdata/modelcontainer/erase()>, fetched 2026-08-19). Not a
basis for a spec.

Apple *does* ship a sample demonstrating delete-all — see §E.4.

### D.3 Resurrection from another device or a not-yet-synced peer

Apple documents the race and tells you to defend the UI against it, using deletion as the worked example:

> Consider what happens if a user deletes a record from their phone. This change uploads to CloudKit, and
> later downloads to a laptop and an iPad. **The iPad's current view may still show the record if the UI
> hasn't updated with the changes yet.** The user taps on the now-deleted record, which is no longer
> available in the store. This may lead to inconsistent representation of the record, such as missing
> data, in your UI. For this reason, you need to isolate the current view from changes to the store…

— <https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit> (fetched
2026-08-19). The documented mitigation is query generations
(`try? persistentContainer.viewContext.setQueryGenerationFrom(.current)`) — i.e. **UI isolation, not a
guarantee against re-upload from a stale peer.** Whether an offline peer holding unsynced local records
can re-populate a deleted zone is **NOT FOUND**; Apple does not address it.

Related documented weaknesses of the sync model:

> The framework doesn't immediately synchronize changes, meaning **CloudKit is unable to support the
> `deny` delete rule.**

> The iCloud servers **don't guarantee atomic processing of relationship changes** … CloudKit processes
> changes in an indeterminate order.

— <https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices>
(fetched 2026-08-19).

### D.4 When the zone disappears server-side

> **`CKError.Code.zoneNotFound`** — An error that occurs when the specified record zone doesn't exist.

— <https://developer.apple.com/documentation/cloudkit/ckerror/code/zonenotfound> (fetched 2026-08-19).
That abstract is the entire page. **No Discussion, no recovery guidance — a strong negative.**

The "Reset Encrypted Data" discriminator *is* documented:

> **`CKErrorUserDidResetEncryptedDataKey`** — The key that determines whether CloudKit deletes a record
> zone because of a user action.
>
> An `NSNumber` that represents a Boolean value you use to determine whether a user action causes CloudKit
> to delete a record zone. **CloudKit adds this key to the error's `userInfo` dictionary when the error
> code is `CKError.Code.zoneNotFound`.**

— <https://developer.apple.com/documentation/cloudkit/ckerroruserdidresetencrypteddatakey> (fetched
2026-08-19).

So the documented discrimination is: on `zoneNotFound`, inspect
`userInfo[CKErrorUserDidResetEncryptedDataKey]` to tell "the user reset their encrypted data" from "the
zone is simply gone". **Apple documents the signal but prescribes no recovery procedure** — no
"re-create the zone and re-upload" instruction appears on any of these pages. NOT FOUND, and a real gap.

Its companion, for a Settings-initiated deletion, is `CKError.Code.userDeletedZone` (§C.2) — also
abstract-only.

**What the local SwiftData/Core Data store does when its server-side zone vanishes: NOT FOUND.**
Searched the Core Data CloudKit syncing article, `NSPersistentCloudKitContainer`,
`NSPersistentCloudKitContainer.Event`,
<https://developer.apple.com/documentation/coredata/accessing-data-when-the-store-changes>, and the
SwiftData syncing article. **None mentions `zoneNotFound`, `userDeletedZone`, or zone deletion at all.**
The only guidance in that neighbourhood is generic:

> Most errors, like those that result from a network failure or a user not being signed in, are transient
> and don't require action. … If you observe persistent errors that don't automatically recover, file a
> bug.

— syncing-a-core-data-store-with-cloudkit, fetched 2026-08-19.

Two further codes worth recording for an error taxonomy:

> **`partialFailure`** — Examine the specific item failures… inspect the `userInfo`
> `CKPartialErrorsByItemIDKey` to see per-item errors. Note that **in a custom zone, the system processes
> all items in an operation atomically.** As a result, you may get a `batchRequestFailed` error for all
> other items…

— <https://developer.apple.com/documentation/cloudkit/ckerror/code/partialfailure> (fetched 2026-08-19).
Since a SwiftData store lives in a custom zone, per-item failures cascade.

> **`changeTokenExpired`** — An error that occurs when the change token expires.

— <https://developer.apple.com/documentation/cloudkit/ckerror/code/changetokenexpired> (fetched
2026-08-19). Abstract only.

### D.5 ⚠️ Is deletion verifiably complete? — No, and Apple says so about sync generally

**There is no documented API or signal that confirms deletion has completed across a user's devices.**
Apple describes sync as eventually consistent on an unspecified cadence:

> The tasks that send changes to the cloud and receive remote changes in the local store happen on the
> system in the background. You don't need to add any code to your project to synchronize records across
> devices. **It can be helpful to think of this process as similar to the water cycle. Water evaporates up
> and rains down on a natural cadence.** Similarly, changes move from Core Data up to CloudKit and across
> to other devices on a natural rhythm within the system event loop.
>
> **Generally, you can expect data to synchronize a local change within about a minute of the change.**
> Core Data also occasionally syncs CloudKit data in scenarios such as when the app hasn't synced in a
> long time.

> Push notifications may get dropped or deferred, so **don't rely on them** for testing.

— <https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit> (fetched
2026-08-19). This is consistent with the prior project finding recorded in
`docs/research/swiftdata-cloudkit-event-observability.md` that CloudKit has no sync-complete signal.

For direct CloudKit calls the only completion available is per-operation, not per-account:
`modifyRecordZones(saving:deleting:)` "throws an error if the request fails… otherwise, the returned tuple
includes any individual record zone errors" (§D.1). **Deletion is documented as best-effort in the sense
that Apple supplies no verification affordance.**

Apple's regulatory-facing guidance is consistent with non-immediate deletion, though it is written for
the account case:

> **Does account deletion need to be immediate and automatic?** No. If your process for account deletion
> is manual or otherwise takes time to complete, this is acceptable. Inform the user how long it will take
> to delete the account and provide a confirmation when the deletion has been completed.

— <https://developer.apple.com/support/offering-account-deletion-in-your-app/> (fetched 2026-08-19).

**Note against the prompt's premise "there is no rollback":** that is true of the product's design, and
Apple's own wording agrees on permanence ("This deletion is permanent and cannot be undone",
`ModelContainer.deleteAllData()`; "Deleting a record zone is a permanent action… You can't restore a
deleted record zone", `deleteRecordZone(withID:)`). But permanence and *completeness* are different
properties, and Apple guarantees only the first.

---

## E. Conventions

### E.1 HIG on destructive and irreversible actions

**Alerts** — <https://developer.apple.com/design/human-interface-guidelines/alerts> (fetched 2026-08-19).
The load-bearing line:

> Avoid displaying alerts for common, undoable actions, even when they're destructive. For example, you
> don't need to alert people about data loss every time they delete an email or file because they do so
> with the intention of discarding data, and they can undo the action. In comparison, **when people take
> an uncommon destructive action that they can't undo, it's important to display an alert in case they
> initiated the action accidentally.**

On button titles:

> Avoid using OK as the default button title unless the alert is purely informational. The meaning of "OK"
> can be unclear even in alerts that ask people to confirm that they want to do something. … **A specific
> button title like "Erase," "Convert," "Clear," or "Delete" helps people understand the action they're
> taking.**

> Create succinct, logical button titles. Aim for a one- or two-word title that describes the result of
> selecting the button. … Always use "Cancel" to title a button that cancels the alert's action.

On whether to apply the destructive *style* — note this cuts **against** a red button for a
deliberately-chosen wipe:

> Use the destructive style to identify a button that performs a destructive action **people didn't
> deliberately choose**. For example, when people deliberately choose a destructive action — such as Empty
> Trash — the resulting alert doesn't apply the destructive style to the Empty Trash button because the
> button performs the person's original intent. … In contrast, people appreciate an alert that draws their
> attention to a button that can perform a destructive action they didn't originally intend.

> If there's a destructive action, include a Cancel button to give people a clear, safe way to avoid the
> action. … Note that you don't want to make a Cancel button the default button. **If you want to
> encourage people to read an alert and not just automatically press Return to dismiss it, avoid making
> any button the default button.**

Alerts hold "up to three buttons". Alert vs action sheet:

> Use an action sheet — not an alert — to offer choices related to an intentional action. … Although an
> alert can also help people confirm or cancel an action that has destructive consequences, it doesn't
> provide additional choices related to the action.

**Action sheets** — <https://developer.apple.com/design/human-interface-guidelines/action-sheets>
(fetched 2026-08-19):

> If necessary, provide a Cancel button that lets people reject an action that might destroy data. …
> A SwiftUI confirmation dialog includes a Cancel button by default.

> Make destructive choices visually prominent. Use the destructive style for buttons that perform
> destructive actions, and place these buttons at the top of the action sheet where they tend to be most
> noticeable.

(Also: "Not supported in visionOS". The page maps action sheets to SwiftUI `confirmationDialog`.)

**Buttons** — <https://developer.apple.com/design/human-interface-guidelines/buttons> (fetched
2026-08-19):

> Destructive. The button performs an action that can result in data destruction.

> A button's role can have additional effects on its appearance. For example, a primary button uses an
> app's accent color, whereas a destructive button uses the system red color.

> **Don't assign the primary role to a button that performs a destructive action**, even if that action is
> the most likely choice. Because of its visual prominence, people sometimes choose a primary button
> without reading it first.

**Feedback** — <https://developer.apple.com/design/human-interface-guidelines/feedback> (fetched
2026-08-19):

> **Warn people when they initiate a task that can cause data loss that's unexpected and irreversible.**
> In contrast, don't warn people when data loss is the expected result of their action. …

> When it makes sense, confirm that a significant action or task has completed. … It's generally best to
> reserve this type of confirmation for activities that are sufficiently important — because people
> typically expect their action or task to succeed, they only need to know when it doesn't.

**iCloud** — <https://developer.apple.com/design/human-interface-guidelines/icloud> (fetched 2026-08-19).
The closest Apple gets to "tell them the delete propagates to other devices":

> **Warn about the consequences of deleting a document.** When someone deletes a document in an app that
> supports iCloud, the document is removed from iCloud and all other devices too. Show a warning and ask
> for confirmation before performing the deletion.

**Modality** — <https://developer.apple.com/design/human-interface-guidelines/modality> (fetched
2026-08-19): "When necessary, help people avoid data loss by getting confirmation before closing a modal
view."

**Managing accounts** — <https://developer.apple.com/design/human-interface-guidelines/managing-accounts>
(fetched 2026-08-19). Account-scoped, so it does not literally bind an account-free app, but it is the
nearest documented delete-flow convention:

> If you help people create an account within your app or game, you must also help them delete it, not
> just deactivate it.

> **Provide a clear way to initiate account deletion within your app or game.** … Make the link easy to
> discover — for example, **don't bury it in your Privacy Policy or Terms of Service pages.**

> **Tell people when account deletion will complete, and notify them when it's finished.** Because it can
> sometimes take a while to fully delete an account, it's essential to keep people informed about the
> status of the deletion process so they know what to expect.

**SwiftUI `ButtonRole.destructive`** —
<https://developer.apple.com/documentation/swiftui/buttonrole/destructive> (fetched 2026-08-19). The
clearest primary sanction for `.destructive` on a wipe-all button:

> A role that indicates a destructive button. **Use this role for a button that deletes user data, or
> performs an irreversible operation.** A destructive button signals by its appearance that the user
> should carefully consider whether to tap or click the button.

**`confirmationDialog`** —
<https://developer.apple.com/documentation/swiftui/view/confirmationdialog(_:ispresented:titlevisibility:actions:)>
(fetched 2026-08-19). Apple's own example is an erase flow (`Button("Empty Trash", role: .destructive)`),
and:

> All actions in a confirmation dialog will dismiss the dialog after the action runs. The default button
> will be shown with greater prominence. … The system may reorder the buttons based on their role and
> prominence. … In regular size classes in iOS, the system renders confirmation dialogs as a popover…

**Strong negatives in the HIG:**

- **"Undo and redo"** (<https://developer.apple.com/design/human-interface-guidelines/undo-and-redo>,
  fetched 2026-08-19) — read in full. **No** guidance on destructive or irreversible actions, and no
  statement that irreversible actions warrant extra confirmation because undo is unavailable.
- **"Privacy"** (<https://developer.apple.com/design/human-interface-guidelines/privacy>, fetched
  2026-08-19) — read in full, all sections. **No guidance about letting people delete their data, no
  data-reset guidance, and no mention of a delete-all control.** Apple's privacy HIG is entirely about
  *collection and access*, never *erasure*.

**Note a genuine divergence in Apple's own material:** the Alerts HIG says the destructive style is for
actions people *didn't* deliberately choose (Empty Trash precedent), yet Apple's SwiftData sample and the
`confirmationDialog` reference both use `.destructive` on deliberately-chosen erase confirmations. Both
are Apple, and they point different ways.

### E.2 Where a data-reset control belongs — NOT FOUND

**Settings** — <https://developer.apple.com/design/human-interface-guidelines/settings> (fetched
2026-08-19). Apple draws a line, but by **frequency of change**, not destructiveness:

> When necessary, you can provide a custom settings area within your app or game to offer general settings
> that affect your overall experience… If you need to offer settings that affect only a specific task, you
> can provide these options within the task itself…

> **General settings.** Put general, infrequently changed settings in your custom settings area. …

> **Task-specific options.** When possible, prefer letting people modify task-specific options without
> going to your settings area. …

> **System settings.** Add only the most rarely changed options to the system-provided Settings app. If it
> makes sense to add your app's or game's settings to the system-provided Settings app, consider providing
> a button that opens it directly from your interface.

> Minimize the number of settings you offer.

**Key negative:** the page's entire vocabulary is "options", "settings", "adjust", "customize". It says
**nothing about actions, commands, or destructive operations** in either a custom settings area or the
system Settings app. **Apple does not say where a data-reset control belongs. NOT FOUND.**

The only Apple text pointing anywhere is indirect: Managing accounts' "Provide a clear way to initiate
account deletion **within your app or game**" and "don't bury it" (§E.1), plus CloudKit's "give them a
**simple way** to delete their data" (§D.1). Both lean in-app. Labelled here as inference, not Apple text.

### E.3 Settings bundles — still a mechanism, but cannot express an action

**Documentation status: archived only.** The two substantive Apple documents are both under
`/library/archive/` and both return HTTP 200:

- *Preferences and Settings Programming Guide*, "Implementing an iOS Settings Bundle" —
  <https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/UserDefaults/Preferences/Preferences.html>
  (fetched 2026-08-19). Page chrome reads "Documentation Archive"; footer "Copyright © 2013 Apple Inc. …
  Updated: 2013-10-22". It does **not** carry the explicit red "Retired Document" banner some archive
  docs carry — its retirement signal is the archive path, chrome, and date.
- *Settings Application Schema Reference* —
  <https://developer.apple.com/library/archive/documentation/PreferenceSettings/Conceptual/SettingsApplicationSchemaReference/Introduction/Introduction.html>
  (fetched 2026-08-19). Footer "Copyright © 2016 Apple Inc. … Updated: 2016-12-12".

**No current (non-archive) `developer.apple.com/documentation` page for `Settings.bundle` was found**, and
the current HIG never uses the term "Settings bundle".

The archived guide's recommendation (2013 text — treat as stale):

> The Settings bundle is generally the preferred mechanism for displaying preferences. However, games and
> other apps that contain configuration options or other frequently accessed preferences might want to
> present them inside the app instead.

> If you are creating an iOS app, you can use a Settings bundle to present preferences, but you should do
> so **only for settings the user changes infrequently.**

— <https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/UserDefaults/AboutPreferenceDomains/AboutPreferenceDomains.html>
(fetched 2026-08-19). Table 1-1: frequently changed → custom UI; infrequently changed → Settings bundle.

**Control types, verified from the actual schema reference.** "Organization of This Document" enumerates
exactly eight element types:

> Group Element (`PSGroupSpecifier`) … Child Pane Element (`PSChildPaneSpecifier`) … Toggle Switch Element
> (`PSToggleSwitchSpecifier`) … Slider Element (`PSSliderSpecifier`) … Title Element
> (`PSTitleValueSpecifier`) … Text Field Element (`PSTextFieldSpecifier`) … Multi Value Element
> (`PSMultiValueSpecifier`) … Radio Group Element (`PSRadioGroupSpecifier`).

— Settings Application Schema Reference, fetched 2026-08-19. The programming guide's Table 4-1 matches,
and adds "The group type does not represent a configurable preference."

**There is no action or button specifier.** Every control writes a value into the defaults database — the
guide states "The system apps save the corresponding values to the defaults database so that your app can
retrieve them at runtime." **An action-triggering button is not expressible in a Settings bundle.** A
"reset" could only be faked as a toggle the app polls on next launch — which additionally means Settings
would show something that looks like a *setting*, the destruction would happen later and invisibly, and
Settings.app cannot present the app's confirmation alert.

**Is a destructive action in a Settings bundle sanctioned anywhere? NOT FOUND — and it is not
representable.** Searched: the archived Preferences and Settings Programming Guide (all chapters), the
Settings Application Schema Reference, and the current HIG Settings page.

### E.4 Apple sample code demonstrating delete-all — FOUND, two hits

**1. SwiftData — "Deleting persistent data from your app"** —
<https://developer.apple.com/documentation/swiftdata/deleting-persistent-data-from-your-app> (fetched
2026-08-19). Sample code (`SwiftDataAnimals.zip`), iOS 17.0+.

> It shows three ways to remove data stored in a SwiftData model container: Swiping to delete · Deleting
> with confirmation · **Deleting all**

Apple's own confirmation pattern in that sample is an alert whose destructive button **restates the
object**:

```swift
.alert("Delete \(animal.name)?", isPresented: $isDeleting) {
    Button("Yes, delete \(animal.name)", role: .destructive) {
        delete(animal)
    }
}
```

> Deleting all items of a particular model type is less common in data driven apps, but there may be times
> when having this option is helpful.

> To delete all persistent data from your app and not just data of a certain model type, use the
> `ModelContainer` method `deleteAllData()`.

Caveat worth recording: the sample's delete-all path is a **"reload sample data"** developer affordance,
and its error branch calls `fatalError(error.localizedDescription)` — not a shape to copy for a shipping
user-facing wipe. And per §D.2, `deleteAllData()`'s CloudKit propagation is undocumented.

**2. CloudKit — "Responding to Requests to Delete Data"** — see §D.1. Current documentation, not archived.

**NOT FOUND:** no Apple sample demonstrates the *combined* SwiftData-store-wipe + CloudKit-zone-delete +
post-wipe-app-state flow, and no sample shows what the UI does after the store is destroyed. Searched the
SwiftData sample-code articles, `ModelContainer` API docs, the CloudKit delete-data article,
"Syncing model data across a person's devices", and Backyard Birds
(<https://developer.apple.com/documentation/swiftui/backyard-birds-sample>) — Backyard Birds has no
reset/delete-all flow.

### E.5 Is there an authoritative convention? — partly, and narrower than the question assumes

**Authoritative and directly applicable:** alert (not action sheet) for an uncommon un-undoable
destructive action; a specific verb, never "OK"; always Cancel; no default button; `.destructive` is
documented for "deletes user data, or performs an irreversible operation"; CloudKit says "give them a
simple way to delete their data"; Feedback says warn on unexpected+irreversible loss and confirm
completion of significant tasks; iCloud HIG says warn that a delete propagates to other devices.

**No authoritative convention exists for:** whether the control lives in-app or in a Settings bundle
(§E.2, §E.3), and anything in §F.1. Those are unsourced product decisions.

---

## F. After the wipe — what Apple says about app state

### F.1 What to present after destroying the store — NOT FOUND (strong negative)

Read in full:

- <https://developer.apple.com/design/human-interface-guidelines/launching> (fetched 2026-08-19) — covers
  launch speed, launch screens, orientation. Its only state-related line points the *opposite* way:
  > Restore the previous state when your app restarts so people can continue where they left off. Avoid
  > making people retrace steps to reach their previous location…
- <https://developer.apple.com/design/human-interface-guidelines/onboarding> (fetched 2026-08-19) —
  onboarding should be "fast, fun, and optional"; "If you let people skip the tutorial when they first
  launch your app or game, don't present it again on subsequent launches…". Nothing about re-entering
  onboarding after a data reset.
- <https://developer.apple.com/design/human-interface-guidelines/loading> (fetched 2026-08-19) — contains
  no occurrence of delete / reset / first-run / relaunch / restart.

All 93 page slugs in the current HIG (foundations, patterns, components, inputs, technologies) were
enumerated: **there is no page named "quitting", "terminating", "data management", "reset" or similar.**

The closest applicable primary text is Feedback's "confirm that a significant action or task has
completed" and Managing accounts' "notify them when it's finished" (both §E.1). **What the app shows
afterwards is undocumented by Apple.**

### F.2 Apple discourages programmatic termination — quotable, but ARCHIVED

**Technical Q&A QA1561, "How do I programmatically quit my iOS application?"** —
<https://developer.apple.com/library/archive/qa/qa1561/_index.html> (fetched 2026-08-19, HTTP 200).
**ARCHIVED / RETIRED.** It carries an explicit retirement banner:

> **Important:** This document is no longer being updated. For the latest information about Apple SDKs,
> visit the documentation website.

Footer: "Copyright © 2012 Apple Inc. … Updated: 2012-04-09". Revision history: "2012-04-09 Updated to more
strongly discourage the exit function, and include best practices for debugging."

The text:

> **Q:** How do I programmatically quit my iOS application?
>
> **A:** There is no API provided for gracefully terminating an iOS application. In iOS, the user presses
> the Home button to close applications. Should your application have conditions in which it cannot
> provide its intended function, the recommended approach is to display an alert for the user that
> indicates the nature of the problem and possible actions the user could take — turning on WiFi, enabling
> Location Services, etc. **Allow the user to terminate the application at their own discretion.**
>
> **Warning: Do not call the `exit` function.** Applications calling `exit` will appear to the user to
> have crashed, rather than performing a graceful termination and animating back to the Home screen.
> Additionally, data may not be saved, because `-applicationWillTerminate:` and similar
> `UIApplicationDelegate` methods will not be invoked if you call `exit`. If during development or testing
> it is necessary to terminate your application, the `abort` function, or `assert` macro is recommended.

("the user presses the Home button" is 2012-era phrasing; the guidance survives the hardware change, the
wording does not.)

**Current HIG: NOT FOUND.** The old iOS HIG "Don't Quit Programmatically" section does **not** exist in
the current HIG — verified by enumerating all 93 current HIG slugs and by full-text reading Launching,
Loading, Onboarding, Feedback, Alerts, Settings and Privacy. **The prohibition survives today only in a
2012 archived Technical Q&A.** That is a weak documentary footing and worth stating plainly in the spec.

<https://developer.apple.com/documentation/uikit/uiapplication> (fetched 2026-08-19) is current and exists,
but no current API-reference page restating the don't-terminate warning was located; there is no public
`UIApplication` API to terminate an iOS app (`NSApplication.terminate(_:)` is macOS-only). The
API-reference sweep was not exhaustive, so treat "no current restatement" as inconclusive rather than a
confirmed negative.

---

## Could not source

| # | Question | Status | What was searched |
|---|---|---|---|
| A.1 | Documented KVS read/write behavior under `restricted` (MDM/parental controls) | **NOT FOUND** | KVS class page, `default`, `synchronize()`, full SDK header, archived iCloud Design Guide, archived *Storing Preferences in iCloud*. MDM key `allowCloudDocumentSync` disables key-value sync but Apple never states the API's behavior. |
| A.2 | Any signal distinguishing "key never set" from "not yet downloaded" | **NOT FOUND (strong negative)** | Full header + class page topic list; `InitialSyncChange` is write-triggered only. Confirms the prior "unfalsifiable" conclusion. |
| A.3 | Any KVS error surface for account unavailability | **NOT FOUND (strong negative)** | Setters return `void`; `synchronize()`'s one documented failure example is a missing entitlement. |
| B.1 | Any statement in the guidelines or the account-deletion support page about apps without accounts, or about CloudKit/iCloud-stored data | **NOT FOUND (strong negative)** | Guidelines §5.1.1(i)–(x) read in full; all nine FAQ items of the support page read in full. Neither mentions iCloud, CloudKit, or account-free apps. |
| B.3 | Whether an on-screen report satisfies the CloudKit "view and export" instruction | **NOT FOUND** | *Providing User Access to CloudKit Data*, read in full. |
| C.1 | Which CloudKit apps get their own deletable row in Manage Account Storage vs being folded into "Documents"/"Others" | **NOT FOUND** | 108922, 118225, iCloud User Guide mm039c13d410 and mm62d92d6b3e, developer.apple.com/documentation/cloudkit. |
| C.3 | Whether CloudKit private-DB data survives app deletion | **NOT FOUND, either direction (strong negative)** | support.apple.com 101550 (Apple's dedicated delete-an-app article — mentions iCloud only to link to a *Backup* article), 108922, 118225, iPhone User Guide iph248b543ca, iCloud User Guide mm62d92d6b3e, mm039c13d410. |
| C.4 | Whether app deletion removes `NSUbiquitousKeyValueStore` data | **NOT FOUND** | Full class Overview + SDK header; app lifecycle never discussed. |
| C.5 | The literal support-page label "Reset Encrypted Data" | **NOT FOUND** | Candidates 102441, 101265, 109016 surfaced by search; exact string not confirmed in a fetched body, so not asserted. |
| D.1 | Whether the CloudKit **default zone** may be deleted | **NOT FOUND** | `CKDatabase`, `CKRecordZone`, `CKRecordZone.default()`, `CKModifyRecordZonesOperation`, `recordZoneIDsToDelete`, archived Web Services `zones/modify`. Apple's own sample includes it implicitly and does not comment. |
| D.1 | An `NSPersistentCloudKitContainer`-level "wipe cloud data" route | **NOT FOUND (strong negative)** | Every topic on the `NSPersistentCloudKitContainer` page enumerated. |
| D.2 | Whether `ModelContainer.deleteAllData()` propagates to CloudKit | **NOT FOUND** | Its two-sentence page, the `ModelContainer` overview, and the SwiftData syncing article in full. |
| D.2 | `ModelContainer.erase()` semantics | **NOT FOUND** | Symbol exists; documentation page has an empty abstract and no discussion. |
| D.3 | Whether an offline peer with unsynced records can repopulate a deleted zone | **NOT FOUND** | Core Data CloudKit syncing article, SwiftData syncing article. |
| D.4 | Recovery guidance for `zoneNotFound` / `userDeletedZone` | **NOT FOUND (strong negative)** | Both pages are abstract-only, no Discussion. `CKErrorUserDidResetEncryptedDataKey` documents detection only. |
| D.4 | What the local SwiftData/Core Data store does when its server-side zone vanishes | **NOT FOUND (strong negative)** | Core Data CloudKit syncing article, `NSPersistentCloudKitContainer`, its `Event` types, "Accessing data when the store changes", SwiftData syncing article — none mentions zone deletion at all. |
| D.5 | Any API confirming deletion completed across all devices | **NOT FOUND** | CloudKit, Core Data and SwiftData documentation. Consistent with the prior finding that CloudKit has no sync-complete signal. |
| E.2 | Whether a data-reset control belongs in-app or in the Settings app | **NOT FOUND (strong negative)** | Full HIG "Settings" page. Apple's split is by change-frequency and speaks only of options/preferences, never actions. |
| E.3 | Any sanction for a destructive action in a Settings bundle | **NOT FOUND — and not representable** | Archived Preferences and Settings Programming Guide (all chapters), Settings Application Schema Reference (8 specifier types, none an action), current HIG Settings. |
| E.3 | A current (non-archive) Apple doc for `Settings.bundle` | **NOT FOUND** | developer.apple.com/documentation search; current HIG never uses the term. |
| E.1 | HIG "Undo and redo" guidance on destructive/irreversible actions | **NOT FOUND (strong negative)** | Page read in full — entirely about predicting/showing undo results and gestures. |
| E.1 | HIG "Privacy" guidance on letting users delete their data | **NOT FOUND (strong negative)** | Page read in full, all sections — guidance is about collection/access, never erasure. |
| E.4 | An Apple sample combining SwiftData wipe + CloudKit zone delete + post-wipe UI | **NOT FOUND** | SwiftData sample articles, `ModelContainer` refs, CloudKit delete-data article, syncing article, Backyard Birds. |
| F.1 | What to present after destroying the store | **NOT FOUND (strong negative)** | HIG Launching, Onboarding, Loading in full; all 93 current HIG slugs enumerated. |
| F.2 | "Don't Quit Programmatically" in the **current** HIG | **NOT FOUND** | All 93 current HIG slugs enumerated; 7 candidate pages full-read. Survives only in archived QA1561 (2012). |
| F.2 | A current API-reference restatement of the `exit()` warning | **Inconclusive** | `UIApplication` checked (current, exists); API reference not exhaustively swept. Do not cite as a negative. |

**Apple Developer Forums:** not cited anywhere in this note. Search surfaced several relevant threads
(47564, 53434, 97922, 120256, 133213, 724933 on KVS; 77005, 81768, 105752 on zone deletion), but none was
identifiable as an Apple-engineer answer from search metadata alone, and those pages are frequently behind
bot protection.
