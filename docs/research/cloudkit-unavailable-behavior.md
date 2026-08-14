# CloudKit unavailable — documented behavior (SwiftData + `NSPersistentCloudKitContainer`, private database)

Research note. Scope: a SwiftUI + SwiftData app syncing to the CloudKit **private** database via SwiftData's managed sync (which wraps `NSPersistentCloudKitContainer`), targeting iOS 26, with **no export/import and no backup** — sync is the only durability mechanism.

**Sourcing rule applied here:** every claim below is either (a) quoted/paraphrased from Apple developer documentation, an Apple WWDC session transcript, Apple release notes, the App Store Review Guidelines, or the Human Interface Guidelines — each with a URL; or (b) explicitly listed in the final "Gaps" section as undocumented. Where a widely-repeated community belief could not be confirmed in an Apple source, it is called out as such rather than asserted. Apple Developer Forums were not usable as a source for this note: the forum pages are behind bot protection and returned a "Security Verification" interstitial rather than post content, so no forum post (Apple-engineer or otherwise) is cited.

**Date of research:** 2026-08-14.

---

## Q1. Signed out of iCloud (`CKAccountStatus.noAccount`) — does the container still work locally?

**Documented: the store is local-first and remains usable; CloudKit is a mirror on top of it.**

- `NSPersistentCloudKitContainer` is "A container that encapsulates the Core Data stack in your app, and **mirrors** select persistent stores to a CloudKit private database", and it "is a subclass of `NSPersistentContainer` capable of managing both CloudKit-backed and noncloud stores." The CloudKit relationship is described as mirroring an otherwise-normal local store, not as a remote-backed store. — https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer
- The feature's own overview frames it as local persistence plus cloud distribution: "Core Data with CloudKit combines the benefits of local persistence with cloud backup and distribution… Back user interfaces with a local replica of a CloudKit private database." — https://developer.apple.com/documentation/coredata/mirroring-a-core-data-store-with-cloudkit
- WWDC19: "NSPersistentCloudKitContainer provides your application with a local replica. A complete mirror if you will of the … CloudKit database that backs it. And, it also implements a robust scheduling and error recovery event loop so that your application doesn't have to worry about any operations." — https://developer.apple.com/videos/play/wwdc2019/202/
- **Errors from being signed out are explicitly characterized as transient and requiring no action:** "Most errors, like those that result from a network failure **or a user not being signed in**, are transient and don't require action." — https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit
- WWDC20, contrasting private vs public database: "in the private database this is super straightforward. If you're signed out, you can't do anything. If you're signed in, you can do everything." This is a statement about **CloudKit-side actions** (what you can do against the private database), in a session whose subject is that the *public* database differs; it is not a statement that the local store fails to load. — https://developer.apple.com/videos/play/wwdc2020/10650/
- For CloudKit generally: "CloudKit relies on the presence of the network and, optionally, a valid iCloud account. A valid iCloud account is only necessary when you want to save data that is specific to a single user." — https://developer.apple.com/documentation/cloudkit
- SwiftData side: `ModelContainer` "mediates between its associated model contexts and your app's underlying persistent storage… Additionally, **if your app's entitlements include CloudKit**, the container automatically handles syncing the persisted storage across devices." Syncing is presented as an additive behavior conditioned on entitlements, not as a precondition for the container. — https://developer.apple.com/documentation/swiftdata/modelcontainer

**Guidance on configuring the container differently when signed out: not documented.** Apple documents `cloudKitDatabase: .none` only for a different purpose — opting out of automatic sync in apps that already use CloudKit and whose existing schema is incompatible ("Disable automatic sync in apps already using CloudKit… Specifying `none` overrides any automatically discovered identifiers and disables SwiftData's automatic iCloud sync"). There is **no** Apple guidance recommending that an app detect `noAccount` and construct a `.none` configuration instead. — https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices

**Caveat — what is NOT documented.** No Apple source states in so many words "the `ModelContainer` initializer succeeds when `CKAccountStatus == .noAccount`". The conclusion above is the consistent implication of the mirroring/local-replica model plus the explicit "user not being signed in → transient, no action required" line, but the literal initializer-level guarantee is absent from the documentation. Notably, SwiftData's `ModelContainer` initializers are throwing, and `SwiftDataError` has a `loadIssueModelContainer` case that Apple does not document a cause list for (https://developer.apple.com/documentation/swiftdata/swiftdataerror). See Gaps.

---

## Q2. Detecting account state

**`CKContainer.accountStatus` — both forms are documented, on the same page.**

```swift
func accountStatus(completionHandler: @escaping @Sendable (CKAccountStatus, (any Error)?) -> Void)
func accountStatus() async throws -> CKAccountStatus
```

"Determines whether the system can access the user's iCloud account… Call this method before accessing the private database to determine whether that database is available. While your app is running, use the `CKAccountChangedNotification` notification to detect account changes, and call this method again to determine the status of the new account." — https://developer.apple.com/documentation/cloudkit/ckcontainer/accountstatus(completionhandler:)

**`CKAccountChangedNotification` / `NSNotification.Name.CKAccountChanged`** — "A notification that a container posts when the status of an iCloud account changes." Discussion: "**Create an instance of `CKContainer` to receive this notification.** The container posts the notification using an arbitrary queue. Use the `accountStatus(completionHandler:)` method to obtain the account's status." Two load-bearing details: you must have instantiated a `CKContainer` for the notification to be delivered, and the callback is not on the main queue. — https://developer.apple.com/documentation/cloudkit/ckaccountchangednotification

**All five states are distinguishable** — `CKAccountStatus` is "Constants that indicate the availability of the user's iCloud account" (https://developer.apple.com/documentation/cloudkit/ckaccountstatus):

| Case | Apple's documented meaning | Availability |
|---|---|---|
| `available` | "The user's iCloud account is available." | iOS 8.0+ |
| `noAccount` | "The device doesn't have an iCloud account." | iOS 8.0+ |
| `restricted` | "The system denies access to the user's iCloud account." | iOS 8.0+ |
| `couldNotDetermine` | "CloudKit can't determine the status of the user's iCloud account." | iOS 8.0+ |
| `temporarilyUnavailable` | "The user's iCloud account is temporarily unavailable." | iOS 15.0+ |

**What `restricted` means concretely — documented:** "Your app can't access the user's iCloud account due to restrictions that **Parental Controls or Mobile Device Management** impose." — https://developer.apple.com/documentation/cloudkit/ckaccountstatus/restricted

Apple does not name "Screen Time" in this API's documentation; it says Parental Controls and MDM. The related error `CKError.Code.managedAccountRestricted` — "An error that occurs when CloudKit rejects a request due to a managed-account restriction… The system restricts CloudKit access for this account. **This is a nonrecoverable error.**" — https://developer.apple.com/documentation/cloudkit/ckerror/managedaccountrestricted

**`temporarilyUnavailable` carries explicit behavioral instructions (iOS 15+), and they matter for a no-backup app:** "You receive this account status when the user's iCloud account is available, but isn't ready to support CloudKit operations. **Don't delete any cached data** and don't enqueue any CloudKit operations after receipt of this account status. Instead, use the [`CKAccountChangedNotification`] notification to listen for when the status changes to [`available`]." — https://developer.apple.com/documentation/cloudkit/ckaccountstatus/temporarilyunavailable

**Anything newer in iOS 17–26?** For the *account-status* API surface: no. `accountStatus` and `CKAccountChangedNotification` remain the documented mechanism, and `CKAccountStatus` gained no cases after `temporarilyUnavailable` (iOS 15). What *was* added in iOS 17 is a richer account-change signal, but only for **`CKSyncEngine`** — not for `NSPersistentCloudKitContainer`/SwiftData: `CKSyncEngineAccountChangeEvent` (iOS 17+), with `changeType`, `previousUser`, and `currentUser`. — https://developer.apple.com/documentation/cloudkit/cksyncengineaccountchangeevent · https://developer.apple.com/documentation/cloudkit/cksyncengineaccountchangetype

The SwiftData "updates" page lists the framework's notable additions for June 2024 / June 2025 / June 2026 and contains **nothing** about iCloud account state, sync-error observation, or sync status. — https://developer.apple.com/documentation/updates/swiftdata

**Not documented:** any SwiftData-native API for account status. There is no `ModelContainer`/`ModelContext` property or notification for iCloud availability; an app must use CloudKit's `CKContainer` directly. See Gaps.

---

## Q3. Data written while signed out, then signing in — is pre-existing local data exported? (the crux)

This is the question with the weakest documentation. Splitting it into the three sub-claims:

### 3a. Does `NSPersistentCloudKitContainer` export pre-existing local rows, or only changes made after CloudKit setup?

**Documented, but only indirectly and only for the "add CloudKit to an existing Core Data app" case.** Apple documents the migration path from a local-only Core Data app to a CloudKit-mirrored one as a **one-line change** with no data-migration, re-insert, or "touch every row" step:

> "If you want to add Core Data with CloudKit to an app that already uses Core Data, you need to modify both your project's configuration and some of its code… `NSPersistentContainer` supports only local persistent stores. To add the ability to sync a local store to a CloudKit database, replace `NSPersistentContainer` with the subclass `NSPersistentCloudKitContainer`."
> — https://developer.apple.com/documentation/coredata/setting-up-core-data-with-cloudkit

> "you can add CloudKit functionality to your existing Core Data applications by changing **as little as one line of code**."
> — WWDC19, https://developer.apple.com/videos/play/wwdc2019/202/

An existing Core Data app that swaps in `NSPersistentCloudKitContainer` necessarily has a store already full of rows that predate CloudKit setup. Apple presents this as the supported, documented path and never instructs the developer to migrate or re-save that pre-existing data. The strong implication is that the mirroring delegate exports the pre-existing store contents. **But Apple never states this explicitly**, and never uses language such as "initial export" or "the container exports all existing objects on first setup."

**The nearest Apple statement about a first-time bulk operation is about import, not export**, and it appears in a WWDC session about testing:

> "Back in my test, I add a new container to import the data that was just exported. This technique uses a trick. It creates a new instance of NSPersistentCloudKitContainer with empty store files. This allows the test to take advantage of NSPersistentCloudKitContainer's **first-time import** to explore what happens when all of this data is downloaded by a device."
> — WWDC22, https://developer.apple.com/videos/play/wwdc2022/10119/

So Apple documents a "first-time import" (server → empty local store) by name. It does not document a symmetric named "first-time export" for a pre-populated local store.

**What Apple documents about export mechanics** is change-driven, keyed on context saves:

> "First, the user creates, updates, or deletes a managed object… **When its managed object context saves changes to the store**, Core Data creates a background task for the system to convert the `NSManagedObject` to a `CKRecord`. The system executes the task, creating the record and uploading it to CloudKit."
> — https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit

Read strictly, that describes only post-setup saves. It neither confirms nor denies a backfill of rows saved before the store had a CloudKit configuration. **The specific scenario in this research question — rows written while signed out, then an iCloud sign-in occurs, with the store CloudKit-configured the whole time — is not addressed anywhere in Apple's documentation.** See Gaps. (Note this scenario is materially *easier* than the "swap a local store to CloudKit later" case, because the store was created with a CloudKit configuration from the start; the mirroring metadata and history tracking are in place from day one. But "easier" is inference, not documentation.)

### 3b. The history-tracking requirement

**Persistent history tracking is off by default** — "Persistent history tracking is off by default." (https://developer.apple.com/documentation/coredata/nspersistenthistorytrackingkey), and it is enabled per-store-description with `NSPersistentHistoryTrackingKey` (https://developer.apple.com/documentation/coredata/consuming-relevant-store-changes).

Apple's CloudKit sample code and WWDC sessions consistently set it on CloudKit-backed store descriptions:

```swift
privateStoreDescription.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
privateStoreDescription.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)
```
— WWDC21, https://developer.apple.com/videos/play/wwdc2021/10015/

WWDC20 describes these as the routine accompaniment to CloudKit setup: "we create a new instance of NSPersistentStoreDescription and customize it with the normal cloudKitContainerOptions - things like **history tracking and remote change notifications**." — https://developer.apple.com/videos/play/wwdc2020/10650/

**However:** the claim frequently repeated in the community — that a CloudKit-backed store *fails to load* / throws unless `NSPersistentHistoryTrackingKey` is `true` — is **not stated in any Apple documentation page reviewed**. Neither `NSPersistentHistoryTrackingKey`, `NSPersistentCloudKitContainer`, `NSPersistentCloudKitContainerOptions`, `NSPersistentStoreDescription`, nor "Setting Up Core Data with CloudKit" documents history tracking as a hard, enforced precondition with a stated failure mode. Treat "required" as strongly-implied best practice that is *not* documented as an enforced error. See Gaps.

**Relevance to a SwiftData app:** this is largely moot for SwiftData in normal use, because SwiftData configures the underlying `NSPersistentCloudKitContainer` itself — the app never sets store-description options. Apple documents SwiftData's history feature set separately (`fetchHistory(_:)`, `HistoryObserver`) with no mention of a CloudKit precondition. — https://developer.apple.com/documentation/updates/swiftdata

### 3c. Swapping a store from local-only to CloudKit-backed later

**Not documented as a supported transition with defined data semantics.** What Apple *does* document is adjacent and cautionary:

- Configurations let you split local-only and cloud stores, but "Entities in a configuration must not have relationships to entities in another configuration" — i.e. the local/cloud split is a **schema-partitioning** decision, not a runtime toggle. — https://developer.apple.com/documentation/coredata/creating-a-core-data-model-for-cloudkit
- For SwiftData, changing which CloudKit container is used is constrained: "**For apps already using a production CloudKit schema, specify only containers that SwiftData or Core Data have managed previously. All other CloudKit containers are incompatible.**" — https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices
- The documented way to move users to a different container is a **new store**, not a re-pointing of the existing one: "Migrate users to a completely new store, using `NSPersistentCloudKitContainerOptions` to associate the new store with a new container." — https://developer.apple.com/documentation/coredata/creating-a-core-data-model-for-cloudkit

Apple documents no answer to "if I ship v1 with `cloudKitDatabase: .none` and v2 with `.automatic`, what happens to the v1 rows?" See Gaps. **For this app, the practical implication is to ship the CloudKit configuration from the first release** rather than relying on an undocumented later promotion.

---

## Q4. Signing out, or switching to a different Apple ID, with data present

**For `NSPersistentCloudKitContainer` / SwiftData: undocumented.** No Apple documentation page or WWDC session reviewed states what happens to the mirrored local store when the user signs out of iCloud or signs into a different Apple ID. Specifically absent: whether the framework deletes the local mirror, leaves it in place, or partitions it per-account; and whether the app is notified. There is no documented "on account change, do X" guidance for `NSPersistentCloudKitContainer`, and no deduplication or reset guidance for it. See Gaps.

**By deliberate contrast, Apple documents this thoroughly for `CKSyncEngine` (iOS 17+)** — a different API this app is not using, but the only place Apple states its position on the semantics:

> "The sync engine automatically listens for account changes, and it sends this event when the user signs in or out. **It's your responsibility to react appropriately to this change and update your local persistence.** When the logged-in account changes, the sync engine resets its internal state. This means that it clears any pending database or record zone changes that you may have added. Note that it's possible the account changes multiple times while your app is quit. If this happens, you only receive one account change event representing the transition between the last known state and the current state."
> — https://developer.apple.com/documentation/cloudkit/cksyncengineaccountchangeevent

Per change type:

- **`signIn`** — "If your app has locally-stored data when `CKSyncEngine` notifies it about the device signing in to an iCloud account, perform one of the following actions: Keep the local data separate from any remote data / Merge the local data with the account's remote data / Delete the local data / **Prompt the account's owner to make the decision**." — https://developer.apple.com/documentation/cloudkit/cksyncengineaccountchangetype/signin
- **`signOut`** — "You should delete any locally-stored data for the previous account." — https://developer.apple.com/documentation/cloudkit/cksyncengineaccountchangetype/signout
- **`switchAccounts`** — "You should delete any locally-stored data for the previous account." — https://developer.apple.com/documentation/cloudkit/cksyncengineaccountchangetype/switchaccounts

Two things follow. First, Apple's *stated position on the problem domain* is that sign-in-with-local-data is an application-level decision with four legitimate resolutions (including asking the user) — i.e. Apple does not consider "silently merge" the single correct answer. Second, Apple places the deletion duty on the **app**, not the framework, in the one API where it speaks at all. Whether `NSPersistentCloudKitContainer` performs any of this itself is not documented — and because SwiftData gives the app no account-change event, an app cannot implement the `CKSyncEngine` guidance under SwiftData without wiring up `CKContainer`/`CKAccountChangedNotification` by hand.

**Related documented signal (CloudKit level, about zone loss rather than sign-out):** `CKErrorUserDidResetEncryptedDataKey` — "An `NSNumber` that represents a Boolean value you use to determine whether a user action causes CloudKit to delete a record zone. CloudKit adds this key to the error's `userInfo` dictionary when the error code is `CKError.Code.zoneNotFound`." — https://developer.apple.com/documentation/cloudkit/ckerroruserdidresetencrypteddatakey · https://developer.apple.com/documentation/cloudkit/ckerror/zonenotfound

This documents that a **user action can cause the server-side zone to be deleted** (e.g. resetting encrypted data), surfacing as `zoneNotFound`. For a sync-as-only-durability app this is a real data-loss path, but Apple does not document how SwiftData surfaces or recovers from it.

---

## Q5. Quota exhausted / sync failure visibility

### 5a. Is there a documented way to observe sync errors?

**At the Core Data level: yes, fully documented.** `NSPersistentCloudKitContainer` exposes an event stream (all iOS 14.0+):

- `eventChangedNotification` — "A notification that contains details about an event in a persistent CloudKit container." (`class let eventChangedNotification: NSNotification.Name`) — https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer/eventchangednotification
- `eventNotificationUserInfoKey` — "The user info dictionary key for the persistent CloudKit container event." — https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer/eventnotificationuserinfokey
- `NSPersistentCloudKitContainer.Event` — "An object that represents activity in a persistent CloudKit container", with properties `type`, `identifier`, `storeIdentifier`, `succeeded`, `startDate`, `endDate`, and **`error` — "An error that indicates why an operation fails."** — https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer/event · https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer/event/error
- `NSPersistentCloudKitContainer.EventType` — `.setup`, `.import`, `.export`. — https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer/eventtype
- Events are also fetchable after the fact rather than only observed live, via `NSPersistentCloudKitContainerEventRequest` (`fetchEvents(after:)`, `fetchForEvents()`) and `NSPersistentCloudKitContainerEventResult`. — https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainereventrequest

Apple's own WWDC22 sample code confirms the notification-observation pattern, including reading the event out of `userInfo`:

```swift
let expectation = self.expectation(
    forNotification: NSPersistentCloudKitContainer.eventChangedNotification,
    object: container
) { notification in
    let userInfoKey = NSPersistentCloudKitContainer.eventNotificationUserInfoKey
    let event = notification.userInfo![userInfoKey]
    return (event.type == eventType) && (event.storeIdentifier == store.identifier) && (event.endDate != nil)
}
```
— https://developer.apple.com/videos/play/wwdc2022/10119/

### 5b. Can a **SwiftData** app reach that notification?

**Undocumented — and this is the significant gap for this app.** Apple documents that "SwiftData uses the `NSPersistentCloudKitContainer` class from Core Data to handle CloudKit synchronization" (https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices), which establishes that such a container exists under the hood. But:

- Apple never documents that `eventChangedNotification` is posted for the container SwiftData creates, nor how to obtain a reference to it. The notification's documented use in Apple's sample passes `object: container` — a container object a SwiftData app never holds. Observing with `object: nil` is not documented as supported.
- SwiftData exposes **no** sync-status or sync-error surface of its own. `SwiftDataError` enumerates fetch, configuration, container, context, migration, and schema errors — nothing CloudKit- or sync-related. — https://developer.apple.com/documentation/swiftdata/swiftdataerror
- The SwiftData updates page (through June 2026) adds no sync observability. — https://developer.apple.com/documentation/updates/swiftdata
- The only debugging avenue Apple documents for mirroring problems is out-of-band and developer-only, not in-app: the `com.apple.CoreData.CloudKitDebug` launch argument and `log stream` predicates on `cloudd` / `com.apple.coredata`. — https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit

Net: a pure SwiftData app has **no documented way to detect that sync is failing**. Apple's documented stance is the opposite of surfacing errors — "Most errors, like those that result from a network failure or a user not being signed in, are transient and don't require action" and "If you observe persistent errors that don't automatically recover, **file a bug**." — https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit

### 5c. Which `CKError` codes signal quota exhaustion and account problems?

- **`CKError.Code.quotaExceeded`** — "An error that occurs when saving a record exceeds the user's storage quota." Discussion, per database scope: "**In the private database: The user doesn't have enough iCloud storage. Prompt the user to go to iCloud settings to manage their storage.**" — https://developer.apple.com/documentation/cloudkit/ckerror/quotaexceeded
- **`CKError.Code.notAuthenticated`** — "An error that occurs when the user is unauthenticated." — https://developer.apple.com/documentation/cloudkit/ckerror/notauthenticated
- **`CKError.Code.managedAccountRestricted`** — "CloudKit rejects a request due to a managed-account restriction… This is a nonrecoverable error." — https://developer.apple.com/documentation/cloudkit/ckerror/managedaccountrestricted

Apple documents explicitly that private-database data is charged to the user's quota: "Data in the private database counts toward the user's iCloud storage quota." (whereas public-database data counts against the app's container quota) — https://developer.apple.com/documentation/cloudkit/ckcontainer

**Are those codes surfaced in `NSPersistentCloudKitContainer.Event.error`?** Not documented. `Event.error` is typed only as `(any Error)?` with the description "An error that indicates why an operation fails"; Apple does not document that it contains a `CKError`, nor enumerate which codes can appear. The mapping from `CKError.Code` to what an app observes through the mirroring event stream is nowhere stated. See Gaps.

### 5d. Does the app learn when the user's 5 GB iCloud storage is full, and can it read remaining quota?

- **`quotaExceeded` is the documented signal, and it is reactive**: it arises "when **saving a record** exceeds the user's storage quota" — i.e. after a write attempt fails, not in advance. — https://developer.apple.com/documentation/cloudkit/ckerror/quotaexceeded
- **There is no documented API to read the user's remaining or total iCloud quota. Confirmed as you suspected.** `CKContainer`'s documented surface covers container creation, the three databases, container identifier, account status, application permissions, operation queueing, user discovery, long-lived operations, and container metadata — **no storage/quota/space query**. — https://developer.apple.com/documentation/cloudkit/ckcontainer
- Apple's only guidance in this area is normative, not programmatic: "**Respect iCloud storage space.** iCloud is a finite resource for which people pay. Use iCloud to store information people create and understand, and avoid using it for app resources or content you can regenerate." — https://developer.apple.com/design/human-interface-guidelines/icloud

For a SwiftData app the situation compounds: even the reactive `quotaExceeded` signal has no documented delivery path into the app (see 5b).

---

## Q6. Apple guidance on messaging a signed-out user, and on requiring iCloud sign-in

### 6a. HIG — there is direct, quotable guidance, and it argues against alarming the user

> "**Make sure your app behaves appropriately when iCloud is unavailable.** If someone manually turns off iCloud or turns on Airplane Mode, **you don't need to display an alert notifying them iCloud is unavailable.** However, it may still be helpful to **unobtrusively** let people know that changes they make won't be available on other devices until they restore iCloud access."
> — https://developer.apple.com/design/human-interface-guidelines/icloud

Also relevant from the same page:

> "Make it easy to use your app with iCloud. People turn on iCloud in Settings and expect apps to work with it automatically. **If you think people might want to choose whether to use iCloud with your app, show a simple option the first time your app opens that provides a choice between using iCloud for all data or not at all.**"

> "A fundamental aspect of iCloud is transparency. People don't need to know where content resides. They can just assume they're always accessing the latest version."

> "**Warn about the consequences of deleting a document.** When someone deletes a document in an app that supports iCloud, the document is removed from iCloud and all other devices too. Show a warning and ask for confirmation before performing the deletion." (Written for documents, but the underlying propagation fact holds for mirrored records.)

The HIG's framing is: sync unavailability is an *unobtrusive status*, not a blocking alert; a one-time all-or-nothing choice is the sanctioned place for an explicit iCloud decision. Note the tension for a no-backup app: the HIG's "you don't need to display an alert" assumes iCloud is a convenience layer over data that is safe locally. It gives no guidance for the case where sync is the *only* durability mechanism — see Gaps.

### 6b. App Store Review Guidelines — may an app block core functionality behind iCloud sign-in?

The guidelines contain **no clause naming iCloud or Apple ID sign-in as a gate on functionality**. Every occurrence of "iCloud" in the guidelines was checked; the relevant ones are 2.5.15 (file pickers should include iCloud documents), 4.10 (you may not monetize iCloud storage), and 5.1.3(ii) (health data in iCloud — see below). None concerns requiring sign-in.

The account/registration rule that *does* apply is **5.1.1(v) Account Sign-In**, quoted in full:

> "**(v) Account Sign-In:** If your app doesn't include significant account-based features, let people use it without a login. If your app supports account creation, you must also offer account deletion within the app. **Apps may not require users to enter personal information to function, except when directly relevant to the core functionality of the app or required by law.** If your core app functionality is not related to a specific social network (e.g. Facebook, WeChat, Weibo, X, etc.), you must provide access without a login or via another mechanism. Pulling basic profile information, sharing to the social network, or inviting friends to use the app are not considered core app functionality. The app must also include a mechanism to revoke social network credentials and disable data access between the app and social network from within the app. An app may not store credentials or tokens to social networks off of the device and may only use such credentials or tokens to directly connect to the social network from the app itself while the app is in use."
> — https://developer.apple.com/app-store/review/guidelines/

Reading: 5.1.1(v) is written about **app accounts** (account creation, account deletion, credentials, social networks) — an iCloud sign-in is a device/system state, not an account the app creates, and the clause does not name it. So the guidelines neither explicitly permit nor explicitly prohibit gating core functionality on iCloud being signed in. The clause's *spirit* — "If your app doesn't include significant account-based features, let people use it without a login" — plus the HIG's "you don't need to display an alert" both point away from a hard iCloud gate. But **this is interpretation, not a quotable prohibition.** See Gaps.

### 6c. One clause that *is* directly load-bearing for this app's domain

> "**(ii)** Apps must not write false or inaccurate data into HealthKit or any other medical research or health management apps, and **may not store personal health information in iCloud.**"
> — App Store Review Guidelines 5.1.3 Health and Health Research, https://developer.apple.com/app-store/review/guidelines/

This is a flat prohibition on storing personal health information in iCloud, in the Health and Health Research section. An eczema/elimination-diet tracker recording an infant's symptoms, skin observations, and photographs is plausibly within "personal health information". Apple does not define the term in the guidelines, does not scope the clause to HealthKit-sourced data only, and does not carve out CloudKit private database or end-to-end-encrypted storage. **Anyone designing CloudKit sync for this app should treat 5.1.3(ii) as a live review risk and resolve it before building**, since it bears on whether CloudKit sync is permissible at all here — not merely on how to message it. Apple's guidance on the boundary is absent; see Gaps.

---

## Q7. Undo / trash — server-side recovery of deleted records in the private database

**Confirmed: no such API. Apple documents no recovery window, no trash, and no "recently deleted" for custom CloudKit record zones.**

- `CKDatabase`'s complete documented API surface — fetching records, querying records, modifying records, fetching/modifying record zones, fetching/modifying subscriptions, fetching database and record-zone changes — contains **no** restore, undelete, trash, or recently-deleted operation. Deletion operations (`delete(withRecordID:)`, `deleteRecord(withID:)`, `modifyRecords(saving:deleting:)`, `delete(withRecordZoneID:)`) have no documented recoverable counterpart. — https://developer.apple.com/documentation/cloudkit/ckdatabase
- The CloudKit framework's own topic index (Schemas, Records, Sharing, Privacy, Errors, etc.) lists no backup, restore, snapshot, or versioning facility for record data. — https://developer.apple.com/documentation/cloudkit
- **Zone-level backup/restore: not documented as existing.** `CKRecordZone` is documented only as "A database partition that contains related records" — a partitioning primitive, with no backup/restore/point-in-time semantics. — https://developer.apple.com/documentation/cloudkit
- Deletion in the mirrored model is documented as **propagating**, with no safety net: "Consider what happens if a user deletes a record from their phone. This change uploads to CloudKit, and later downloads to a laptop and an iPad." — https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit
- SwiftData likewise documents no undo/trash/recovery for synced models; its history API (`fetchHistory(_:)`, `HistoryChange`, `HistoryDelete`) is a **local change-tracking** feature for observing transactions, not a server-side recovery mechanism, and Apple documents `deleteHistory(_:)` for *pruning* it. — https://developer.apple.com/documentation/updates/swiftdata

**Distinguishing the three things that are easy to conflate:**

1. **CloudKit Console / CloudKit Database app — developer tooling, not user recovery.** "The CloudKit Database app is a web-based tool for developers to manage their iCloud containers… view and edit your test data during development or debugging." Apple warns: "**Don't use the CloudKit Database app as a general data editor.** Although you can create, modify, and delete records using CloudKit Dashboard, the intent of this functionality is to help you debug your schema during the design phase." It also cannot generally reach end users' private data — only "If you develop using the same iCloud account to store private data, you can also use the CloudKit Database app to inspect and edit private data." — https://developer.apple.com/documentation/cloudkit/managing-icloud-containers-with-cloudkit-database-app
2. **iCloud.com "Recover deleted files" — scoped to iCloud Drive/first-party data, not custom record zones.** Apple's iCloud User Guide places "Delete and recover files / Recover deleted files / Permanently remove deleted files" under the **iCloud Drive** section of its contents, alongside separate per-app recovery entries for Contacts ("Restore contacts"), Calendars ("Restore your calendars and events"), and Notes ("Delete and recover notes"). There is no equivalent entry for third-party CloudKit containers or custom record zones. — https://support.apple.com/guide/icloud/welcome/icloud (guide contents; note that individual deep links into this guide are unstable and redirect to the guide root, so the section titles above are cited from the guide's own navigation rather than a per-page URL)
3. **iCloud Backup — a device-snapshot mechanism, documented as covering *files* your app creates, not your CloudKit records.** "the device's owner can use iCloud Backup to store a snapshot of their device, including files that your app creates." — https://developer.apple.com/documentation/cloudkit/deciding-whether-cloudkit-is-right-for-your-app

**And a documented path by which server data can vanish without app action:** `CKErrorUserDidResetEncryptedDataKey` marks a `zoneNotFound` error as caused by the user resetting encrypted data — i.e. CloudKit deleted the record zone because of a user action. — https://developer.apple.com/documentation/cloudkit/ckerroruserdidresetencrypteddatakey

**Corollary for this app:** with no export/import and no backup, an accidental delete (or a user-initiated encrypted-data reset) has **no documented recovery path at all**. Any undo must be built in the app — e.g. soft-delete (a `deletedAt` field, filtered out of queries) so that "delete" is a synced state change rather than a record removal. Apple's own guidance points the same way in spirit: for CloudKit-backed content, "Show a warning and ask for confirmation before performing the deletion." — https://developer.apple.com/design/human-interface-guidelines/icloud

---

## Gaps — Apple does not document this

Everything in this list was searched for in Apple developer documentation, WWDC transcripts (2019 202/230, 2020 10650/10017, 2021 10015, 2022 10119, 2023 10188), iOS 26 release notes, the HIG, and the App Store Review Guidelines, and **not found**. Nothing here should be asserted as behavior without empirical testing on-device.

**Q1 — signed-out container initialization**
1. No explicit statement that `ModelContainer(for:configurations:)` **succeeds** when `CKAccountStatus == .noAccount`. Local-first operation is the consistent implication of the mirroring model plus the "user not being signed in → transient" line, but the initializer-level guarantee is not written down.
2. No documented cause list for `SwiftDataError.loadIssueModelContainer`, so it cannot be ruled out that CloudKit-related conditions can surface there.
3. No guidance recommending a different container configuration (e.g. `.none`) when signed out. `.none` is documented only for schema-incompatibility opt-out.

**Q2 — account state**
4. No SwiftData-native API for iCloud account status or availability; an app must reach for `CKContainer` directly. Apple does not document that pairing, or where in a SwiftData app's lifecycle to do it.
5. Whether merely *having* a SwiftData CloudKit-backed container causes `CKAccountChangedNotification` to be delivered is not documented — the notification's docs require the app to instantiate a `CKContainer` itself.

**Q3 — initial export of pre-existing local data (the crux; largely undocumented)**
6. **The core question is unanswered:** whether rows created while signed out are uploaded once an account becomes available. Apple documents a named "first-time import" (server → empty store) but no symmetric first-time/backfill **export** for a pre-populated store. The export mechanism is documented only as save-triggered.
7. No documented statement that adopting `NSPersistentCloudKitContainer` on an existing populated store exports the pre-existing rows — only that the swap is a one-line change with no migration step prescribed (strong implication, not documentation).
8. History tracking as a **hard requirement**: not documented. No Apple page states that a CloudKit-backed store fails to load or throws without `NSPersistentHistoryTrackingKey`. The widely-repeated community claim that it is mandatory could not be confirmed in an Apple source. (Apple's samples always set it; treat as best practice.)
9. Local-only → CloudKit-backed promotion of an existing store (e.g. `.none` in v1, `.automatic` in v2): no documented data semantics, no documented support statement. Apple's documented container-change path is migration to a *new store*.
10. Whether `NSPersistentCloudKitContainer` distinguishes "records not yet exported" from "records exported" in any app-visible way (a pending/unsynced count or flag) — no such API is documented.

**Q4 — sign-out and Apple ID switch (undocumented for this stack)**
11. What happens to the mirrored local store on iCloud sign-out under `NSPersistentCloudKitContainer`/SwiftData: delete, retain, or partition — undefined in the documentation.
12. Same for signing into a **different** Apple ID: no documented behavior, and no documented deduplication or reset guidance for `NSPersistentCloudKitContainer`. (Apple documents this *only* for `CKSyncEngine`, which places the duty on the app.)
13. No account-change event is documented for SwiftData, so the `CKSyncEngine`-style guidance ("delete local data for the previous account") has no documented hook in a SwiftData app.
14. How SwiftData surfaces or recovers from a server-side zone loss (`zoneNotFound` / `CKErrorUserDidResetEncryptedDataKey`) — not documented.

**Q5 — sync failure visibility (undocumented for SwiftData specifically)**
15. Whether `NSPersistentCloudKitContainer.eventChangedNotification` **fires for the container SwiftData creates internally**, and how to observe it without a container reference (`object: nil` is not documented as supported). This is the single most consequential gap for a no-backup app.
16. Whether `Event.error` contains a `CKError`, and which `CKError.Code` values can appear there — the type is only `(any Error)?` and no code list is given. So `quotaExceeded` / `notAuthenticated` are documented as CloudKit codes but **not** documented as observable through the mirroring event stream.
17. No documented API for the user's total or remaining iCloud storage quota — **confirmed absent** from `CKContainer`'s documented surface. The only signal is the reactive, post-write-failure `quotaExceeded`.
18. No documented in-app sync status/health surface in SwiftData at all (no "last synced", no pending-changes count, no error state).

**Q6 — messaging and review**
19. No HIG or review guidance for the case where **sync is the only durability mechanism**. The HIG's "you don't need to display an alert when iCloud is unavailable" presumes iCloud is a convenience over locally-safe data; the no-backup case is not addressed.
20. Whether gating core functionality on an iCloud sign-in is permitted: **not addressed**. No guideline names iCloud/Apple ID sign-in as a functionality gate; 5.1.1(v) is written about app-created accounts. Neither explicitly permitted nor prohibited.
21. Guideline 5.1.3(ii) prohibits storing "personal health information" in iCloud, but Apple does not define the term, does not scope it to HealthKit-sourced data, and provides no CloudKit-private-database or encryption carve-out. The boundary as applied to a symptom/diet tracker is undocumented — **a live review risk to resolve before building CloudKit sync for this app.**

**Q7 — recovery**
22. No documented server-side recovery, deleted-record retention window, trash, or zone-level backup/restore for the private database — confirmed absent from `CKDatabase` and the CloudKit framework index. (Documented absence, i.e. answered "no", rather than merely unaddressed; but note Apple never affirmatively says "there is no recovery" either.)
23. Whether any internal retention exists server-side that Apple support or the developer could reach for a user — not documented, and not exposed by any API.

### Bottom line for a no-export, no-backup design

The three findings that most constrain the design, all of them gaps rather than reassurances: (a) whether data written while signed out is ever uploaded is **not documented** (#6); (b) a SwiftData app has **no documented way to observe that sync is failing**, including quota exhaustion (#15, #16, #17); and (c) there is **no server-side recovery for deleted records** (Q7), so undo must be local soft-delete. Add the domain-specific risk that App Store Review 5.1.3(ii) forbids storing personal health information in iCloud (#21). Anything relying on #6 or #15 should be verified by device testing and treated as unsupported until then.
