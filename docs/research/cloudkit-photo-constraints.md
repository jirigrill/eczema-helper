# CloudKit photo storage constraints — Apple primary sources

**Date:** 2026-08-13
**Issue:** [#679](https://github.com/jirigrill/eczema-helper/issues/679) (research). Feeds the photo-pipeline decision, [#684](https://github.com/jirigrill/eczema-helper/issues/684) — this document does **not** make that decision.
**Scope:** the planned native iOS app (SwiftUI + SwiftData + CloudKit private database), not the SvelteKit PWA.

## Overview

The planned iOS app stores `SkinPhoto = { id, observationId, region, capturedAt, blob }` —
nine body regions per observation, one observation per day, indefinitely. Today's PWA keeps
raw camera JPEGs (2–5 MB) as IndexedDB `Blob`s with no compression, no resize, no size cap
and no quota-error handling. This document establishes, from Apple's own published material,
what CloudKit will and will not tolerate.

Four numbers do most of the constraining:

1. **1 MB** — maximum CKRecord size, excluding asset fields. A 2–5 MB JPEG cannot ride in a
   record field; it must become a `CKAsset`.
2. **~750 KB** — the per-attribute size at which Core Data promotes a variable-length
   attribute to a `CD_<attr>_ckAsset` field (WWDC19, below). Below it, the blob travels
   inline and consumes the 1 MB record budget.
3. **5 GB** — the free iCloud tier. **Private-database data counts against the user's iCloud
   quota, not the developer's.** At today's uncompressed sizes the app would consume
   ~11.5 GB/year and exhaust a free iCloud account in under six months.
4. **50 MB** — maximum asset file size, published only in *archived* (2016) CloudKit Web
   Services documentation. Apple's current native-framework docs restate no asset size limit.

And two absences matter as much as the numbers: **Apple provides no sync-progress API**, and
**Apple documents no compression, resizing, size-capping, or deduplication behaviour at all** —
those are entirely the app's job.

### Source discipline

Every claim below carries a URL to an Apple-owned page. Where Apple publishes no figure this
document says so explicitly rather than guessing. Non-Apple material appears only in §6b,
which is fenced off and marked as requiring verification by measurement. Forum posts are cited
only with the responder's Apple badge stated, and unbadged posts are named as not-Apple.

---

## 1. `CKAsset` semantics and limits

### What an asset is, and when to use one

[`CKAsset`](https://developer.apple.com/documentation/cloudkit/ckasset) — *"An external file that
belongs to a record."*

> "Use assets to incorporate external files into your app's records, such as photos, videos,
> and binary files. Alternatively, use assets when a field's value is more than a few kilobytes
> in size."

> "CloudKit stores an asset's data separately from a record that references it, but maintains
> an association with that record. When you save a record that has an asset, CloudKit saves
> both the record and the asset to the server. Similarly, when you fetch the record, the server
> returns the record and the asset."

> "CloudKit stores only an asset's data. If you require its filename, or any other file-system
> metadata, use one or more separate fields on the record to store it."

[`CKRecord`](https://developer.apple.com/documentation/cloudkit/ckrecord) is explicit that a blob
does not belong in a data field:

> "To ensure the speed of fetching and saving records, the data that a record stores must not
> exceed 1 MB. Assets don't count toward this limit, but all other data types do."

and on the `NSData` field type: *"Don't use data objects for storing large binary data files;
use a `CKAsset` instead."*

Archived [CloudKit Quick Start — Using Asset and Location Fields](https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/CloudKitQuickStart/AddingAssetsandLocations/AddingAssetsandLocations.html):

> "You can store large data files in CloudKit using the Asset field type. Assets are owned by
> the associated record, and CloudKit handles garbage collection for you. CloudKit also
> efficiently uploads and downloads assets."

### Published size limits

Source: [CloudKit Web Services Reference — Data Size Limits](https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/CloudKitWebServicesReference/PropertyMetrics.html)
(*"These are the limits on the size of data sent to and from the CloudKit server."*).
**Caveat:** this is the HTTP Web Services limit set, in Apple's `library/archive`, *Updated
2016-06-13*. Apple's current native docs do not restate an asset size maximum.

| Property | Value |
| --- | --- |
| Maximum number of operations in a request | 200 |
| Maximum number of records in a response | 200 |
| Maximum number of tokens in a request | 200 |
| Maximum record size (not including Asset fields) | 1 MB |
| **Maximum file size of an Asset field** | **50 MB** |
| Maximum number of source references to a single target where the action is delete self | 750 |

Current-framework per-operation guidance, from
[`CKError.Code.limitExceeded`](https://developer.apple.com/documentation/cloudkit/ckerror/code/limitexceeded):

> "The server can change its limits at any time, but the following are general guidelines:
> - 400 items (records or shares) per operation
> - 2 MB per request (not counting asset sizes)
>
> If your app receives `limitExceeded`, it must split the operation in half and try both
> requests again."

[TN3164](https://developer.apple.com/documentation/technotes/tn3164-debugging-the-synchronization-of-nspersistentcloudkitcontainer)
adds: 1 MB record size limit **excluding CKAsset fields**, **256 fields** per record type,
**1000 record zones** per container.

### Lifecycle

[`CKAsset.init(fileURL:)`](https://developer.apple.com/documentation/cloudkit/ckasset/init(fileurl:)) —
`init(fileURL: URL)`, non-optional; *"You must provide a file URL, and it must not be `nil`."*

> "After saving an asset to the server, CloudKit doesn't delete the file at the specified URL.
> If you no longer need the file, you must delete it yourself. When you subsequently download a
> record that contains an asset, CloudKit downloads its own copy of the asset data to the local
> device and provides you with a URL to that file."

> "You can assign only one record to the asset that this method returns. If you want multiple
> records to point to the same file, you must create separate assets for each one."

> "Important: CloudKit saves only the contents of the file and doesn't save the filename or any
> file-related metadata."

**Staging area is not durable storage** — the single most easily-missed constraint:

> "When you fetch a record that contains an asset, CloudKit stores the asset's data in a staging
> area accessible to your app. Use the asset's `fileURL` property to access its staged location.
> The system regularly deletes files in the staging area to reclaim disk space. To avoid this
> behavior, move the data into your app's container as soon as you fetch it."

[`CKAsset.fileURL`](https://developer.apple.com/documentation/cloudkit/ckasset/fileurl) is
`URL?` — optional:

> "Note: If a modify operation fails with a `serverRecordChanged` error, CloudKit doesn't
> download assets for the copy of the server's record that's accessible using the error's
> `serverRecord` property. In this scenario, `fileURL` is `nil` for all of that record's asset
> fields."

**Lazy fetch:** *"If you don't require the asset when retrieving records, use the operation's
`desiredKeys` property to exclude the field."*

**Deletion is by orphaning, not deletion:**

> "If you no longer require an asset that's on the server, you don't delete it. Instead, orphan
> the asset by setting any fields that contain the asset to `nil` and then saving the record.
> CloudKit periodically deletes orphaned assets from the server."

### Throttling

[`CKError.Code.requestRateLimited`](https://developer.apple.com/documentation/cloudkit/ckerror/code/requestratelimited):

> "Check for a `CKErrorRetryAfterKey` key in the `userInfo` dictionary of any CloudKit error
> that you receive… Use the value of the `CKErrorRetryAfterKey` key as the number of seconds to
> wait before retrying this operation."

[`CKErrorRetryAfterKey`](https://developer.apple.com/documentation/cloudkit/ckerrorretryafterkey):
*"CloudKit adds this key to the error's `userInfo` dictionary when the error code is
`serviceUnavailable` or `requestRateLimited`."*

---

## 2. Private database quota

### Whose storage it is

[`CKContainer.privateCloudDatabase`](https://developer.apple.com/documentation/cloudkit/ckcontainer/privateclouddatabase):

> "The user's private database is only available if the device has an iCloud account. Only the
> user can access their private database, by default. They own all of the database's content and
> can view and modify that content. Data in the private database isn't visible in the developer
> portal.
>
> **Data in the private database counts toward the user's iCloud storage quota.**
>
> If there isn't an iCloud account on the user's device, this property still returns a database,
> but any attempt to use it results in an error."

By contrast, [`publicCloudDatabase`](https://developer.apple.com/documentation/cloudkit/ckcontainer/publicclouddatabase):
*"Data in the public database counts toward your app's iCloud storage quota."*

**Consequence:** every photo this app stores is charged to the mother's personal iCloud
allowance. The developer pays nothing for storage — and correspondingly has no lever to fix it
when it runs out.

### The free tier, and what the app would consume

[What you can do with iCloud storage](https://support.apple.com/guide/icloud/about-icloud-storage-mm3d17a80e23/icloud):
**"When you set up iCloud, you get 5 GB of free storage."** Paid tiers per
[iCloud+ plans and pricing](https://support.apple.com/en-us/108047): 50 GB, 200 GB, 2 TB, 6 TB,
12 TB.

**Derived arithmetic** (mine, not Apple's) — 9 photos/day × 365 days = **3,285 photos/year**:

| Per-photo size | Year 1 | Year 3 | Year 5 |
| --- | --- | --- | --- |
| 150 KB | 0.47 GB | 1.41 GB | 2.35 GB |
| 250 KB | 0.78 GB | 2.35 GB | 3.92 GB |
| 400 KB | 1.25 GB | 3.76 GB | 6.27 GB |
| 750 KB | 2.35 GB | 7.05 GB | 11.75 GB |
| 1 MB | 3.13 GB | 9.39 GB | 15.66 GB |
| 3.5 MB (today's raw capture) | **10.96 GB** | 32.9 GB | 54.8 GB |

Against a 5 GB free allowance — which the user is also using for device backups and iCloud
Photos — raw capture exhausts the tier in **under six months**. Even 400 KB/photo consumes a
quarter of the free tier in year one.

### What happens when the user is full

[`CKError.Code.quotaExceeded`](https://developer.apple.com/documentation/cloudkit/ckerror/code/quotaexceeded)
— *"An error that occurs when saving a record exceeds the user's storage quota."*

> "**In the private database**: The user doesn't have enough iCloud storage. Prompt the user to
> go to iCloud settings to manage their storage."

General user-facing effects, [Manage your iCloud storage](https://support.apple.com/en-us/108922):
when out of storage, the device won't back up to iCloud, new photos and videos won't upload to
iCloud Photos, and iCloud apps won't stay up to date across devices.

**Apple does not publish** whether CloudKit mirroring stalls, retries, or backs off after
`.quotaExceeded`, nor whether local data is retained. The only case where Apple explicitly says
"don't delete cached data" is `.accountTemporarilyUnavailable`.

### No iCloud account

[`CKAccountStatus`](https://developer.apple.com/documentation/cloudkit/ckaccountstatus):

| Case | Apple's description |
| --- | --- |
| `available` | "The user's iCloud account is available." |
| `couldNotDetermine` | "CloudKit can't determine the status of the user's iCloud account." |
| `noAccount` | "The device doesn't have an iCloud account." |
| `restricted` | "The system denies access to the user's iCloud account." |
| `temporarilyUnavailable` | "The user's iCloud account is temporarily unavailable." |

[`accountStatus(completionHandler:)`](https://developer.apple.com/documentation/cloudkit/ckcontainer/accountstatus(completionhandler:)):
*"Call this method before accessing the private database to determine whether that database is
available. While your app is running, use the `CKAccountChanged` notification to detect account
changes."*

### Developer-side quota

Apple's current public statement is one number, from
[CloudKit — iCloud — Apple Developer](https://developer.apple.com/icloud/cloudkit/):

> "Store private data securely in your users' iCloud accounts for limitless scale as your user
> base grows, and get up to 1PB of storage for your app's public data."

**Apple does not publish** the per-tier developer quota table (asset storage, database storage,
data transfer, requests/sec, per-user scaling) anywhere in current documentation. Figures
circulating as "40 requests/sec, 2 GB transfer, 10 GB assets scaling per user" appear only in
**unbadged** developer-forum posts, e.g. [thread 715649](https://developer.apple.com/forums/thread/715649),
whose participants are not Apple engineers and are themselves noting the pricing pages were
removed. **This document does not assert those numbers.** For a private-database-only app the
question is moot anyway.

---

## 3. SwiftData / `NSPersistentCloudKitContainer` and large binary attributes

### `@Attribute(.externalStorage)` is a *local disk* decision, not a CloudKit one

This is the most consequential correction in this document, because the intuitive assumption is
wrong.

Apple's entire reference text for the option is one sentence
([`Schema.Attribute.Option.externalStorage`](https://developer.apple.com/documentation/swiftdata/schema/attribute/option/externalstorage)):

> "Stores the property's value as binary data adjacent to the model storage."

The Core Data equivalent,
[`allowsExternalBinaryDataStorage`](https://developer.apple.com/documentation/coredata/nsattributedescription/allowsexternalbinarydatastorage):

> "If this value is `true`, the corresponding attribute **may** be stored in a file external to
> the persistent store itself."

**Apple does not document a size threshold for `.externalStorage`.** No byte figure appears in
the SwiftData or Core Data reference. The only Apple-side statement is from a **DTS Engineer**
(Developer Technical Support, not a Frameworks Engineer) on
[forum thread 756644](https://developer.apple.com/forums/thread/756644):

> "Checking the 'Allows External Storage' option allows Core Data to store the attribute data in
> external files when the data size is over a certain limit… (2MB or so but can change)"

Treat that as informal and explicitly unstable. Note that 2–5 MB JPEGs sit right on that
boundary — some would externalize, some would not, and neither is guaranteed.

### What actually produces a `CKAsset`

The documented trigger is the **1 MB record size limit**, not the `.externalStorage` flag.
[Reading CloudKit Records for Core Data](https://developer.apple.com/documentation/coredata/reading-cloudkit-records-for-core-data):

> "All variable length attribute types—String, Binary Data, and Transformable—generate an
> additional field with a key in the form `CD_[attribute.name]_ckAsset`. **If a field's value
> grows too large to store within the record size limit of 1MB, Core Data automatically converts
> the value to an external asset.** Core Data transitions between the original field and its
> asset counterpart transparently during serialization. When inspecting a CloudKit record
> directly, check the length of the original field's value; if it is zero, look in the asset
> field."

The published type-mapping table on that page gives **Binary Data → `NSData` or `CKAsset`**.

The threshold is named in [WWDC19 session 202, *Using Core Data With CloudKit*](https://developer.apple.com/videos/play/wwdc2019/202/):

> "…this is how we implement asset externalization. Here you can see that we have both a
> `CD_content` field and a `CD_content_CKAsset`. This allows us to store strings that are
> arbitrarily large. Anywhere from simple kilobytes all the way up to hundreds of megabytes or
> even gigabytes in length. … if one of them grows to be very large, **approximately larger than
> 750 kilobytes**, or if the total size of the record exceeds CloudKit's maximum 1 megabyte
> limit, you'll begin to see asset fields… If you're consuming our records on your own, then
> you'll need to check both places to see whether or not a value has been set for a specific
> attribute."

**Apple nowhere documents a link between `.externalStorage` and CKAsset promotion.** On
[forum thread 751617](https://developer.apple.com/forums/thread/751617) an **Apple Staff /
Frameworks Engineer** answers a related question with *"This is generally true. However you can
enable CloudKit temporarily to run the validator against your model. If the `ModelContainer`
initializes the model is compatible… If the container throws an error you'll need to make
changes."* — that endorses the ModelContainer-init validator; it does not assert that
`.externalStorage` syncs. The affirmative "it works great" reply in the same thread is from an
unbadged community member.

**Practical reading for #684:** a photo blob above ~750 KB lands in `CD_blob_ckAsset` whatever
`.externalStorage` says. A blob *below* ~750 KB rides inline in the record and eats the 1 MB
record budget shared with every other field on that record.

### Model constraints CloudKit imposes

[Creating a Core Data Model for CloudKit](https://developer.apple.com/documentation/coredata/creating-a-core-data-model-for-cloudkit):

| Element | Limitation (verbatim) |
| --- | --- |
| Entities | "Unique constraints aren't supported." |
| Attributes | "`Undefined` and `objectID` attribute types aren't supported." |
| Relationships | "All relationships must be optional… All relationships must have an inverse, in case the records synchronize out of order. CloudKit doesn't support the Deny deletion rule." |
| Configurations | "Entities in a configuration must not have relationships to entities in another configuration." |

[Syncing model data across a person's devices](https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices)
— *"SwiftData uses the `NSPersistentCloudKitContainer` class from Core Data to handle CloudKit
synchronization."* — restates it for SwiftData: `unique` cannot be enforced; relationships must
be optional and have inverses; the `deny` delete rule is unsupported. Requires the **iCloud
(CloudKit)** capability and **Background Modes → Remote notifications**.

Schema is **additive only**:

> "CloudKit schemas are additive only, which means you're unable to delete model types or change
> existing model attributes after you promote a schema to production."

This bites the existing domain model directly: `CONTEXT.md`'s cascade-delete and
meal-slot-uniqueness invariants cannot be enforced by the store under CloudKit. They become
application-layer obligations.

### What Apple does *not* handle

Searched the SwiftData and Core Data references, the CloudKit schema-mapping article, TN3163 and
TN3164. **Apple documents no framework behaviour for any of these:**

- **Compression** — no mention anywhere. Entirely the app's job.
- **Image resizing / thumbnailing** — not a framework feature.
- **Size caps or byte budgets** — only the 1 MB record limit, which the framework routes around
  via CKAsset promotion. No documented cap on total store size.
- **Quota management** — no hook on `NSPersistentCloudKitContainer`. `.quotaExceeded` is only
  reachable via `Event.error`.
- **Conflict resolution policy** — **Apple does not name last-writer-wins or any other merge
  policy for `NSPersistentCloudKitContainer`.** Do not assume one. What Apple *does* document is
  a view-consistency technique: pin `viewContext` with `setQueryGenerationFrom(.current)`
  ([Syncing a Core Data Store with CloudKit](https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit)).
- **Deduplication** — not a framework feature; the framework cannot enforce `unique` at all.
- **Post-production schema migration** — manual. Apple's three documented strategies (new store +
  new container; additive fields; a `version` attribute plus predicate filtering) are on the
  Core Data model page.

### SwiftData surfaces no sync errors

There is **no** SwiftData symbol for CloudKit sync events, status, progress, or errors.
`SwiftDataError` / `DataStoreError` cover local store failures; `HistoryObserver` tells you data
*arrived*, not whether sync succeeded. To observe sync at all you must drop to Core Data:

- [`NSPersistentCloudKitContainer.eventChangedNotification`](https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer/eventchangednotification) (iOS 14+)
- [`NSPersistentCloudKitContainer.Event`](https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainer/event) —
  `type` (`.setup` / `.import` / `.export`), `identifier`, `storeIdentifier`, `succeeded`,
  `startDate`, `endDate?`, `error?`
- [`NSPersistentCloudKitContainerEventRequest`](https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontainereventrequest) for history

TN3164 sanctions this route and pairs it with `NSPersistentStoreRemoteChange`. But **Apple
documents no supported way to keep a live `NSPersistentCloudKitContainer` alongside a live
SwiftData `ModelContainer`** purely for event observation — Apple's own sample unloads the store
first, and TN3164 documents the failure: *"CloudKit setup failed because there is another
instance of this persistent store actively syncing with CloudKit in this process."*

**This is an open architectural problem for #684**, not a solved one.

---

## 4. Sync behaviour: metered connections, background sync, initial sync

### The app has no control over sync timing

TN3164 states it flatly:

> "The system determines when synchronization occurs — there is no API for apps to configure
> timing."

[`CKOperation.Configuration`](https://developer.apple.com/documentation/cloudkit/ckoperation/configuration-swift.class)
does expose `allowsCellularAccess` (*"A Boolean value that indicates whether operations that use
this configuration can send data over the cellular network"*), `qualityOfService`,
`timeoutIntervalForRequest`, `timeoutIntervalForResource` and `isLongLived` — but **Apple
publishes no Discussion text and no default value** for `allowsCellularAccess` or
`qualityOfService`. (`isDiscretionary` is a `URLSessionConfiguration` property, not a CloudKit
one.)

More to the point: [`NSPersistentCloudKitContainerOptions`](https://developer.apple.com/documentation/coredata/nspersistentcloudkitcontaineroptions)
has exactly two members — `containerIdentifier` and `databaseScope`. **There is no API on
`NSPersistentCloudKitContainer` to set a `CKOperation.Configuration`, cellular access, QoS, or
any network policy.** If the app needs to say "don't upload 30 MB of photos over cellular," it
cannot, short of abandoning mirroring for hand-written CloudKit.

### Low Power Mode does throttle mirroring; Low Data Mode is undocumented

[TN3163](https://developer.apple.com/documentation/technotes/tn3163-understanding-the-synchronization-of-nspersistentcloudkitcontainer)
names three throttle classes applied by `dasd`:

| Policy | Apple's description |
| --- | --- |
| Activity Group Policy | too many concurrent activities; "expires when preceding activity finishes (typically quick)" |
| ActivityRateLimitPolicy | "Applied when app frequently does too many activities. **Can last hours.** Common scenario: populating large dataset in short timeframe." |
| Low Power Mode Policy | "Applied in low energy mode. Lasts until battery recovers or device connects to power. **No API to change behavior.**" |

Apple's [Energy Efficiency Guide — Low Power Mode](https://developer.apple.com/library/archive/documentation/Performance/Conceptual/EnergyGuide-iOS/LowPowerMode.html)
(archived): in Low Power Mode iOS may *"Pause discretionary and background activities, including
networking"*, and advises apps to *"disable syncs and backups"*. Query via
[`ProcessInfo.isLowPowerModeEnabled`](https://developer.apple.com/documentation/foundation/processinfo/islowpowermodeenabled).

**Whether CloudKit mirroring honours Low Data Mode: Apple does not document this.** The
URLSession-level knobs — [`allowsConstrainedNetworkAccess`](https://developer.apple.com/documentation/foundation/urlsessionconfiguration/allowsconstrainednetworkaccess)
(Low Data Mode) and [`allowsExpensiveNetworkAccess`](https://developer.apple.com/documentation/foundation/urlsessionconfiguration/allowsexpensivenetworkaccess)
(*"iOS 13 considers most cellular networks and personal hotspots expensive"*) — are documented for
`URLSession` only, and Apple never connects them to CloudKit mirroring.

**The effect of the iOS Settings → iCloud per-app toggle** on a mirrored store is likewise not
covered on developer.apple.com.

### Background sync

Per [Setting up Core Data with CloudKit](https://developer.apple.com/documentation/coredata/setting-up-core-data-with-cloudkit):
the iCloud → CloudKit capability *"also adds push notifications that notify your app when remote
content changes"*, and Background Modes → Remote notifications is required so *"CloudKit [can]
silently notify your app when new content is available."* Entitlement
[`com.apple.developer.icloud-services`](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.icloud-services).

The subscription is created for you — TN3163 shows the mirroring delegate receiving pushes for
`com.apple.coredata.cloudkit.private.subscription`. You do not author a `CKDatabaseSubscription`.
(For reference, [`CKDatabaseSubscription`](https://developer.apple.com/documentation/cloudkit/ckdatabasesubscription):
*"Because the system coalesces notifications, don't rely on them for specific changes. CloudKit
can omit data to keep the payload size under the APNs size limit."*)

Cadence, from [Syncing a Core Data Store with CloudKit](https://developer.apple.com/documentation/coredata/syncing-a-core-data-store-with-cloudkit):

> "Generally, you can expect data to synchronize a local change **within about a minute** of the
> change. Core Data also occasionally syncs CloudKit data in scenarios such as when the app
> hasn't synced in a long time."
> "Push notifications may get dropped or deferred, so don't rely on them for testing."

TN3163's import triggers: *"Initial synchronization: First app launch after installation;
Periodic checks: At app activation; Push notifications: When notified of database changes
(private/shared databases); Polling: For public databases (every 30 minutes in development, up
to 24 hours in production)."*

`BGTaskScheduler` is **not** part of the mirroring path — Apple never mentions it in any Core
Data + CloudKit document. If used anyway,
[Choosing background strategies for your app](https://developer.apple.com/documentation/backgroundtasks/choosing-background-strategies-for-your-app)
documents that *"the system decides the best time to launch your background task, and provides
your app up to 30 seconds of background runtime"* for app refresh, and that background pushes
more frequent than three per hour are rate limited.

### What the user perceives during a large initial sync

**There is no progress API.** No percentage, no byte count, no records-remaining, no ETA — not
in `NSPersistentCloudKitContainer`, `NSPersistentCloudKitContainerOptions`, `Event`,
`EventRequest`, or anywhere in SwiftData.

The only observable signal is `NSPersistentCloudKitContainer.Event`, at the resolution of
*type / startDate / endDate (nil ⇒ in flight) / succeeded / error*. That supports a spinner and
an error message. It does not support a progress bar. Counting locally-arrived rows via
`HistoryObserver` gives a numerator with no denominator, because the remote total is not exposed.

Apple's documented guidance for large datasets, TN3163/TN3164:

> "Avoid populating large datasets quickly to prevent rate limit throttles"; "Populate in batches
> or lazily"; "Use local stores initially, then gradually migrate to CloudKit-backed store."
> "Redesign your workflow to make fewer changes over longer time frames."
> "`NSPersistentCloudKitContainer` may import data while your app is launching. If relaunching
> causes synchronization, the system intentionally deferred those imports in the previous
> session."
> "When data doesn't synchronize immediately, the system is intentionally deferring it."

Apple's own scale demo is instructive: in
[WWDC22 session 10119](https://developer.apple.com/videos/play/wwdc2022/10119/) the generator
builds *"60 posts with 11 image attachments each"* — described as ~10 GB — specifically to expose
memory and time problems, and the recommended response is Instruments profiling,
`managedObjectIDResultType` fetches, and periodic context resets. That is the same shape as this
app's day-view list.

A related risk, **community-reported and not Apple-confirmed**: [forum thread 759345](https://developer.apple.com/forums/thread/759345)
(FB14323934, no Apple reply) claims iOS 18 began prefetching `.externalStorage` attributes in
list queries, taking an app from 100 MB to >1 GB. Unverified — but it is exactly the failure mode
a "list of observations" query would hit, so day-view fetches should be designed not to touch
`blob`.

---

## 5. Error surfaces the app must handle

All from [`CKError.Code`](https://developer.apple.com/documentation/cloudkit/ckerror/code).

| Case | Apple's abstract | Apple's documented handling |
| --- | --- | --- |
| [`.quotaExceeded`](https://developer.apple.com/documentation/cloudkit/ckerror/code/quotaexceeded) | "An error that occurs when saving a record exceeds the user's storage quota." | Private DB: "The user doesn't have enough iCloud storage. Prompt the user to go to iCloud settings to manage their storage." |
| [`.partialFailure`](https://developer.apple.com/documentation/cloudkit/ckerror/code/partialfailure) | "An error that occurs when an operation completes with partial failures." | "Examine the specific item failures… inspect the userInfo `CKPartialErrorsByItemIDKey` to see per-item errors. Note that in a custom zone, the system processes all items in an operation atomically. As a result, you may get a `batchRequestFailed` error for all other items in an operation that don't cause an error." |
| [`.limitExceeded`](https://developer.apple.com/documentation/cloudkit/ckerror/code/limitexceeded) | "An error that occurs when a request's size exceeds the limit." | "400 items per operation; 2 MB per request (not counting asset sizes)… it must **split the operation in half** and try both requests again." |
| [`.requestRateLimited`](https://developer.apple.com/documentation/cloudkit/ckerror/code/requestratelimited) | "An error that occurs when CloudKit rate-limits requests." | "Use the value of the `CKErrorRetryAfterKey` key as the number of seconds to wait before retrying." |
| [`.zoneBusy`](https://developer.apple.com/documentation/cloudkit/ckerror/code/zonebusy) | "An error that occurs when the server is too busy to handle the record zone operation." | "Try the operation again in a few seconds… **increase the delay time exponentially** for each subsequent retry… Check for a `CKErrorRetryAfterKey` key." |
| [`.networkUnavailable`](https://developer.apple.com/documentation/cloudkit/ckerror/code/networkunavailable) | "An error that occurs when the network is unavailable." | "You can retry network failures immediately, but have your app implement a backoff period so that it doesn't attempt the same operation repeatedly… monitor for network reachability and wait to reissue the operation." |
| [`.networkFailure`](https://developer.apple.com/documentation/cloudkit/ckerror/code/networkfailure) | "An error that occurs when a network is available, but CloudKit is inaccessible." | Same discussion text as `.networkUnavailable`. |
| [`.serviceUnavailable`](https://developer.apple.com/documentation/cloudkit/ckerror/code/serviceunavailable) | "An error that occurs when CloudKit is unavailable." | No Discussion published. Handling implied by `CKErrorRetryAfterKey`, which is attached for this code. |
| [`.accountTemporarilyUnavailable`](https://developer.apple.com/documentation/cloudkit/ckerror/code/accounttemporarilyunavailable) | "An error that occurs when the user's iCloud account is temporarily unavailable." | "**Don't delete any cached data and don't enqueue any additional CloudKit operations.**… Use the `CKAccountChanged` notification to listen for future account status changes, and retry the operation after the status becomes `available`." |
| [`.serverRecordChanged`](https://developer.apple.com/documentation/cloudkit/ckerror/code/serverrecordchanged) | "An error that occurs when CloudKit rejects a record because the server's version is different." | Three copies in `userInfo` (`…ClientRecordKey`, `…ServerRecordKey`, `…AncestorRecordKey`). "**Your app needs to merge all changes into the record for the `CKRecordChangedErrorServerRecordKey` key**… Merging into either of the other two copies results in another conflict error." |
| [`.notAuthenticated`](https://developer.apple.com/documentation/cloudkit/ckerror/code/notauthenticated) | "An error that occurs when CloudKit cannot authenticate the user." | **No Discussion published.** |
| [`.changeTokenExpired`](https://developer.apple.com/documentation/cloudkit/ckerror/code/changetokenexpired) | "An error that occurs when the change token expires." | **No Discussion published.** |
| [`.assetFileNotFound`](https://developer.apple.com/documentation/cloudkit/ckerror/code/assetfilenotfound) | "An error that occurs when the system can't find the specified asset." | **No Discussion published.** |
| [`.assetFileModified`](https://developer.apple.com/documentation/cloudkit/ckerror/code/assetfilemodified) | "An error that occurs when the system modifies an asset while saving it." | **No Discussion published.** |
| [`.assetNotAvailable`](https://developer.apple.com/documentation/cloudkit/ckerror/code/assetnotavailable) | "An error that occurs when the system can't access the specified asset." | **No Discussion published.** |
| `.batchRequestFailed` | "An error that occurs when the system rejects the entire batch of changes." | Referenced by `.partialFailure` (custom-zone atomicity). |

[`CKPartialErrorsByItemIDKey`](https://developer.apple.com/documentation/cloudkit/ckpartialerrorsbyitemidkey):
*"The value of this key is a dictionary that maps an item ID to an error… if you receive a
partial error when modifying a record, the ID is an instance of `CKRecord.ID`."*

**Under SwiftData, none of these reach the app directly.** They arrive only as
`NSPersistentCloudKitContainer.Event.error`, and only if the app has arranged to observe those
events — see §3's open problem.

---

## 6. Apple's guidance on image compression

### 6a. Apple primary sources

**Apple recommends HEIC outright.** [`UIImage.heicData()`](https://developer.apple.com/documentation/uikit/uiimage/heicdata())
(iOS 17+):

> "Returns HEIC data representing the image, or nil if such a representation could not be
> generated. **HEIC is recommended for efficiently storing all kinds of images**, including those
> with high dynamic range content."

**Apple's published HEIF-vs-JPEG claim.** [Using HEIF or HEVC media on Apple devices](https://support.apple.com/en-us/116944):

> "HEIF and HEVC offer better compression than JPEG and H.264, so they use less storage space on
> your devices and iCloud Photos, while preserving the same visual quality."

That page publishes **no ratio**. The numeric claim comes from
[WWDC17 session 513, *High Efficiency Image File Format*](https://developer.apple.com/videos/play/wwdc2017/513/):

> "With HEVC we see an average of 2X compression compared to JPEG containing the same visual
> quality."

Capture-format support (same support page): HEIF/HEIC capture requires iPhone 7 or later / iPad
(6th gen) or later; Settings → Camera → Formats → **High Efficiency** vs **Most Compatible**
(*"All new photos and videos will now use JPEG or H.264 format"*).

Type identifier: [`UTType.heic`](https://developer.apple.com/documentation/uniformtypeidentifiers/uttype-swift.struct/heic)
= `public.heic`, conforming to `public.heif-standard` → `UTTypeImage`. iOS 14+.

**Compression quality semantics.**
[`kCGImageDestinationLossyCompressionQuality`](https://developer.apple.com/documentation/imageio/kcgimagedestinationlossycompressionquality):

> "If present, the value associated with this key must be a `CFNumberRef` data type in the range
> `0.0` to `1.0`. A value of `1.0` specifies to use lossless compression if destination format
> supports it. A value of `0.0` implies to use maximum compression."

[`UIImage.jpegData(compressionQuality:)`](https://developer.apple.com/documentation/uikit/uiimage/jpegdata(compressionquality:)):

> "The quality of the resulting JPEG image, expressed as a value from `0.0` to `1.0`. The value
> `0.0` represents the maximum compression (or lowest quality) while the value `1.0` represents
> the least compression (or best quality)."

Note the asymmetry: at 1.0, ImageIO will use *lossless* compression if the destination format
supports it. For HEIC that is a meaningfully different outcome from JPEG at 1.0.

**Downscaling — Apple's documented path is ImageIO, not UIImage drawing.**
[`kCGImageSourceThumbnailMaxPixelSize`](https://developer.apple.com/documentation/imageio/kcgimagesourcethumbnailmaxpixelsize):
*"The maximum width and height of a thumbnail image, specified in pixels. If this key is not
specified, the width and height of a thumbnail is not limited and thumbnails may be as big as the
image itself."*
[`kCGImageSourceCreateThumbnailFromImageAlways`](https://developer.apple.com/documentation/imageio/kcgimagesourcecreatethumbnailfromimagealways):
*"If you set the value of this key to `kCFBooleanTrue`, the image source creates the thumbnail
from the full image, subject to the limit specified by `kCGImageSourceThumbnailMaxPixelSize`. If
you don't specify a maximum pixel size, the image source creates the thumbnail using the image's
full size, which in most cases is not desirable."*

[WWDC18 session 416, *iOS Memory Deep Dive*](https://developer.apple.com/videos/play/wwdc2018/416/):

> "The most important thing about images to remember is that the memory use is related to the
> dimensions of the image, not its file size."

Apple's worked example: a 2048 × 1536 file occupying **590 KB on disk** costs **~10 MB** decoded
(2048 × 1536 × 4 bytes sRGB). On drawing via `UIImage` to downscale:

> "If we actually use UIImage to draw, it's a little bit less performant due to internal
> coordinate space transforms. And, as we saw earlier, it would decompress the entire image in
> the memory."

The session's recommended path is `CGImageSourceCreateThumbnailAtIndex` with
`kCGImageSourceThumbnailMaxPixelSize` — a streaming API that allocates only for the result.

**Capture format.** [`AVCapturePhotoSettings.format`](https://developer.apple.com/documentation/avfoundation/avcapturephotosettings/format):

> "This dictionary must contain a value for either the `kCVPixelBufferPixelFormatTypeKey` (to
> request an uncompressed format) or `AVVideoCodecKey` (to request a compressed format such as
> JPEG) key, but not both. … If this dictionary has the `AVVideoCodecKey` key, the value for that
> key must be listed in the photo output's `availablePhotoCodecTypes` array."

So HEVC/HEIC capture is requested via `AVVideoCodecKey` = `.hevc`, gated on
[`availablePhotoCodecTypes`](https://developer.apple.com/documentation/avfoundation/avcapturephotooutput/availablephotocodectypes)
(*"The compression codecs this capture output currently supports for photo capture"*).
[`photoQualityPrioritization`](https://developer.apple.com/documentation/avfoundation/avcapturephotosettings/photoqualityprioritization)
trades photo quality against delivery speed.

**CloudKit-specific image guidance.** Beyond `CKAsset`'s *"use assets when a field's value is more
than a few kilobytes in size"* and `CKRecord`'s *"Don't use data objects for storing large binary
data files; use a `CKAsset` instead"*, plus the `desiredKeys` advice for skipping asset download,
**Apple publishes no image-pipeline guidance specific to CloudKit** — no recommended resolution,
no recommended quality setting, no thumbnail-plus-full-asset pattern in reference documentation.

**Health/medical photo capture guidance: none exists.** Apple's
[HealthKit HIG](https://developer.apple.com/design/human-interface-guidelines/healthkit/) covers
Health icon usage, terminology and privacy; it says nothing about photo capture or image fidelity
for clinical comparison. **Apple publishes no guidance on lossy compression where diagnostic or
comparative visual detail matters.** That judgement is unsupported by Apple sources and must be
made on other grounds.

### 6b. NON-PRIMARY — indicative size figures, NEEDS VERIFICATION BY MEASUREMENT

⚠️ **Everything in this subsection is non-Apple and unverified.** Apple publishes no
file-size-versus-resolution-versus-quality table. The figures below are drawn from commercial
format-conversion marketing pages ([digital-photography-school.com](https://digital-photography-school.com/jpeg-vs-heic/),
[heicpix.com](https://heicpix.com/blog/heic-vs-jpg/), [reformatly.com](https://reformatly.com/resources/heic-vs-jpg-size),
[xconvert.com](https://www.xconvert.com/blog/heic-vs-jpg-iphone-photos)) — SEO content, not
measurement reports. **Do not treat any number here as a fact. Measure on-device before #684
picks a target.**

Consensus of those sources: HEIC is **40–50% smaller than JPEG at equivalent visual quality**;
a native 12 MP iPhone HEIC is **~1.5–3 MB**, its JPEG equivalent **~3–7 MB**. This is broadly
consistent with Apple's own "average of 2X compression" claim from WWDC17 513, which is the only
figure in this document with an Apple source.

Indicative encoded sizes for a typical photographic scene — **all NEEDS VERIFICATION**:

| Long edge | JPEG q0.9 | JPEG q0.8 | JPEG q0.7 | JPEG q0.6 | HEIC q0.8 | HEIC q0.6 |
| --- | --- | --- | --- | --- | --- | --- |
| 4032 (12 MP) | ~4 MB | ~2.5 MB | ~1.8 MB | ~1.4 MB | ~1.3 MB | ~0.7 MB |
| 2048 | ~1.1 MB | ~700 KB | ~500 KB | ~380 KB | ~360 KB | ~200 KB |
| 1600 | ~700 KB | ~440 KB | ~310 KB | ~240 KB | ~230 KB | ~125 KB |
| 1280 | ~450 KB | ~290 KB | ~200 KB | ~155 KB | ~150 KB | ~80 KB |
| 1024 | ~300 KB | ~185 KB | ~130 KB | ~100 KB | ~95 KB | ~55 KB |

**Content dependence is large and cuts in this app's favour.** A skin close-up is
low-spatial-frequency — large areas of similar tone — and compresses substantially better than a
detailed outdoor scene. It also means the artefacts that lossy compression introduces (blocking,
chroma smearing) land precisely on the signal the app exists to record: subtle redness and
texture. That tension is #684's to resolve, not this document's.

**Derived arithmetic (mine, not Apple's; arithmetic is exact, inputs are not):** 3,285 photos/year.

| Candidate target | Per photo | Year 1 | Year 5 | % of free 5 GB tier after 1 yr |
| --- | --- | --- | --- | --- |
| 1024 px HEIC q0.6 | ~55 KB | 0.17 GB | 0.86 GB | 3% |
| 1280 px HEIC q0.8 | ~150 KB | 0.47 GB | 2.35 GB | 9% |
| 1600 px HEIC q0.8 | ~230 KB | 0.72 GB | 3.60 GB | 14% |
| 2048 px HEIC q0.8 | ~360 KB | 1.13 GB | 5.64 GB | 23% |
| 2048 px JPEG q0.8 | ~700 KB | 2.19 GB | 10.97 GB | 44% |
| No pipeline (today) | ~3.5 MB | 10.96 GB | 54.8 GB | **219%** |

Note where ~750 KB (the CKAsset promotion threshold, §3) falls in that table: every candidate
except unprocessed capture and 2048 px JPEG sits *below* it, meaning the blob would ride inline
in the CKRecord and compete for the 1 MB record budget rather than becoming an asset. #684 should
decide deliberately which side of that line it wants to be on.

---

## What Apple does not publish

Recorded so a later reader does not mistake absence of a figure for an unsearched question.

1. **Current maximum CKAsset file size.** The only Apple figure is **50 MB**, in *archived*
   CloudKit Web Services documentation last updated 2016-06-13. Current native-framework docs
   restate no asset size maximum.
2. **Developer-side quota tiers** — asset storage, database storage, transfer, requests/sec,
   per-user scaling. Only "up to 1PB… for your app's public data" is published. Numbers in
   circulation come from unbadged forum posts.
3. **CloudKit pricing / overage rates.** Not on any reachable Apple page.
4. **Numeric rate-limit thresholds** before `.requestRateLimited`. The error and retry mechanism
   are documented; no threshold number is.
5. **`.externalStorage` size threshold.** No byte figure in SwiftData or Core Data reference.
   Only a DTS Engineer's informal "2MB or so but can change".
6. **Whether `.externalStorage` affects CloudKit serialization at all.** Apple documents CKAsset
   promotion as driven by the 1 MB record limit and never connects the two features.
7. **Conflict resolution / merge policy for `NSPersistentCloudKitContainer`.** No Apple statement
   names last-writer-wins or any other policy.
8. **Whether CloudKit mirroring honours Low Data Mode.** Low Power Mode throttling *is*
   documented (TN3163); Low Data Mode is not mentioned in any mirroring document.
9. **Effect of the iOS Settings → iCloud per-app toggle** on a mirrored store.
10. **Any sync-progress API.** None exists; `Event` start/end/succeeded is the ceiling.
11. **Sync-loop behaviour and local-data retention after `.quotaExceeded`.**
12. **Recommended handling for `.changeTokenExpired`, `.notAuthenticated`, `.assetFileNotFound`,
    `.assetFileModified`, `.assetNotAvailable`** — abstract only, no Discussion.
13. **Asset staging-area retention period** — "regularly deletes" with no duration.
14. **Orphaned-asset deletion latency** — "periodically deletes" with no interval.
15. **Total private-database size limit.** Only per-record (1 MB excl. assets), per-record-type
    (256 fields) and per-container (1000 zones) are documented, in TN3164.
16. **A supported way to run a live `NSPersistentCloudKitContainer` alongside a live SwiftData
    `ModelContainer`** for sync-event observation.
17. **Image-pipeline guidance specific to CloudKit**, and **any guidance on lossy compression
    where clinical or comparative visual detail matters.**
18. **File-size-versus-resolution-versus-quality figures** for HEIC or JPEG. §6b is non-primary
    and requires measurement.

---

## Constraints #684 must decide within

Not decisions — the boundaries inside which the decision has to sit.

1. A 2–5 MB blob **cannot** live in a CKRecord field; the 1 MB record limit forces the asset
   path. Below ~750 KB the blob rides inline instead and competes for that same 1 MB budget.
   Both sides of that line are viable; the choice is deliberate.
2. **Storage is the user's, and is 5 GB by default.** Uncompressed capture exhausts it in under
   six months. A pipeline is not an optimisation, it is a precondition.
3. `.quotaExceeded` in the private database is **unfixable by the developer**. The only sanctioned
   response is to prompt the user toward iCloud settings — and under SwiftData that error is only
   reachable via `NSPersistentCloudKitContainer.Event.error`, which SwiftData does not expose and
   Apple documents no supported way to observe alongside a live `ModelContainer`.
4. **No control over sync timing, cellular use, or QoS** under mirroring. If "don't upload photos
   on cellular" is a requirement, mirroring cannot deliver it.
5. **No progress API.** A large first sync can only be surfaced as an indeterminate spinner.
6. **Fetches must be able to avoid the blob** (`desiredKeys` on the CloudKit side; not touching
   `blob` in day-view queries locally). Apple's own 10 GB scale demo and the community
   `.externalStorage` prefetch report both point at list queries as the failure mode.
7. **CloudKit cannot enforce the domain's uniqueness or cascade-delete invariants.** `unique` is
   unsupported, the `deny` delete rule is unsupported, relationships must be optional with
   inverses. `CONTEXT.md`'s invariants become application-layer obligations.
8. **The CloudKit schema is additive-only once promoted to production.** The `SkinPhoto` shape is
   effectively permanent; a later pipeline change cannot rewrite the field, only add one.
9. **Assets are orphaned, not deleted**, and CloudKit reclaims them on an unpublished schedule.
   "Delete the photo" is not immediate storage relief for the user.
10. Every size figure in §6b is unverified. **Measure on-device before choosing a target.**
