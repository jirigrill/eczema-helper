# CloudKit `encryptedValues` with SwiftData — primary-source findings

Research date: 2026-08-14. All fetch dates below are 2026-08-14 unless stated.

Source tiers used: (T1) Apple developer documentation; (T1) Apple SDK headers and
`.swiftinterface` files shipped in Xcode 27.0 beta (build `27A5237l`), iOS 27.0 SDK —
these are the strongest available evidence because they are the actual shipped API surface;
(T1) Apple Support / Apple Platform Security; (T2) Apple WWDC session transcripts;
(T3) Apple developer forums — **not used**, see Gaps.

## Overview

The headline finding reverses the premise of the question. **SwiftData can express CloudKit
field encryption.** It has a first-class attribute option, `Schema.Attribute.Option.allowsCloudEncryption`,
available since iOS 17.0, applied as `@Attribute(.allowsCloudEncryption)`. Choosing encryption
therefore does **not** force dropping SwiftData and does not reach back into the persistence
architecture. This is verified both in Apple's documentation and by direct inspection of the
SwiftData `.swiftinterface` in the installed iOS 27.0 SDK.

The decision is nonetheless irreversible and must be made before first schema deployment:
Apple states in two places that a field's encryption state can never change once promoted to
production. Practically, for this app that means the free-text notes and the skin observation
levels are the fields where encryption buys something, photos are already encrypted whether you
ask or not, and the composite record name is the real leak — record names are permanently
server-visible plaintext, so a record name of the form `date:mealType:actor` publishes the child's
meal schedule to Apple's servers in the clear even if every field on the record is encrypted.

Two further points shape the risk picture. First, `.allowsCloudEncryption` affects only the
CloudKit copy of the data; Apple's header states plainly that it "does not affect the data in the
persistent store", so the on-device SQLite file is unprotected by this flag. Second, encrypted
CloudKit fields are only genuinely end-to-end encrypted when the user has Advanced Data Protection
enabled — and there is no API to detect or require ADP. Under default (standard) data protection,
Apple holds keys that can decrypt third-party CloudKit encrypted fields. Apple's own two documents
are in tension on this point; both are quoted in section 7.

Good news for implementation: because SwiftData `#Predicate` / `@Query` fetches execute locally
against the SQLite store rather than as server-side `CKQuery`, the "encrypted fields cannot be
queried or sorted" restriction does **not** degrade the app's local filtering and sorting.

---

## 1. Can SwiftData express CloudKit `encryptedValues`? — YES

**Answer: yes.** The mechanism is `Schema.Attribute.Option.allowsCloudEncryption`, used via the
`@Attribute` macro as `@Attribute(.allowsCloudEncryption)`.

Availability: **iOS 17.0**, iPadOS 17.0, Mac Catalyst 17.0, macOS 14.0, tvOS 17.0, visionOS 1.0,
watchOS 10.0, Swift 5.9 — i.e. present since SwiftData's first release, not new in iOS 26/27.

Documentation, verbatim abstract:

> `allowsCloudEncryption` — "Stores the property's value in an encrypted form."
> `static var allowsCloudEncryption: Schema.Attribute.Option { get }`

— <https://developer.apple.com/documentation/swiftdata/schema/attribute/option/allowscloudencryption>
(fetched 2026-08-14, via the documentation JSON endpoint
`https://developer.apple.com/tutorials/data/documentation/swiftdata/schema/attribute/option/allowscloudencryption.json`).
Listed among the options on <https://developer.apple.com/documentation/swiftdata/schema/attribute/option>
(fetched 2026-08-14).

Independently confirmed in the shipped SDK — the decisive citation, since it is the actual API
surface the compiler sees:

`/Applications/Xcode-beta.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS27.0.sdk/System/Library/Frameworks/SwiftData.framework/Modules/SwiftData.swiftmodule/arm64e-apple-ios.swiftinterface`
(Xcode 27.0, build `27A5237l`; module `-user-module-version 180`; inspected 2026-08-14), line 1078:

```swift
@available(swift 5.9)
@available(macOS 14, iOS 17, tvOS 17, watchOS 10, *)
public struct Option {
  public static var unique: ... { get }
  public static func transformable(by transformerType: ValueTransformer.Type) -> ...
  public static var externalStorage: ... { get }
  public static var allowsCloudEncryption: Schema.Attribute.Option { get }   // line 1078
  public static var preserveValueOnDeletion: ... { get }
  public static var ephemeral: ... { get }
  public static var spotlight: ... { get }
  @available(macOS 27, iOS 27, tvOS 27, watchOS 27, visionOS 27, *)
  public static var codable: ... { get }
}
```

The full option list for `Schema.Attribute.Option` is exactly: `unique`, `transformable(by:)` (two
overloads), `externalStorage`, `allowsCloudEncryption`, `preserveValueOnDeletion`, `ephemeral`,
`spotlight`, and `codable` (new in iOS 27). `allowsCloudEncryption` carries no availability
annotation of its own, so it inherits the enclosing `iOS 17` annotation.

`allowsCloudEncryption` is the **only** encryption-related symbol in the entire SwiftData module
interface: a case-insensitive grep for `encrypt` and `protect` across the whole
`.swiftinterface` returns exactly one hit, line 1078 (checked 2026-08-14). So there is no
alternative or supplementary SwiftData encryption mechanism.

`ModelConfiguration` has **no** encryption-related option. Its CloudKit surface is limited to
container selection: `cloudKitDatabase: ModelConfiguration.CloudKitDatabase` with cases
`.automatic`, `.none`, and `.private(_ privateDBName: String)`, plus
`cloudKitContainerIdentifier` (read-only). Verified in the same `.swiftinterface` (lines 19–48,
inspected 2026-08-14) and at
<https://developer.apple.com/documentation/swiftdata/modelconfiguration> (fetched 2026-08-14).
Encryption is therefore a **per-attribute** decision, never a container- or store-level switch.

Release notes: the SwiftData updates page lists changes for June 2024, June 2025 and June 2026 and
mentions **no** encryption changes in any of them (June 2026 covers `sectionBy` query macros, the
`codable` attribute option, `ResultsObserver`, and `HistoryObserver`).
<https://developer.apple.com/documentation/updates/swiftdata> (fetched 2026-08-14). This is
consistent with the feature having existed since iOS 17 and being unchanged through iOS 26/27.

WWDC: the SwiftData sessions "Build an app with SwiftData" (WWDC23 10154) and "What's new in
SwiftData" (WWDC24 10137) contain **zero** occurrences of the string "encrypt" in their published
transcripts (both fetched 2026-08-14). So `.allowsCloudEncryption` is documented but has never
been presented in a SwiftData session — which plausibly explains why it is widely believed absent.

## 2. Does Core Data / `NSPersistentCloudKitContainer` express it? — YES, and SwiftData mirrors the same flag

The Core Data property exists and is named exactly **`allowsCloudEncryption`** on
`NSAttributeDescription`. Introduced in **iOS 15.0** / macOS 12.0 / tvOS 15.0 / watchOS 8.0 —
the same OS version that introduced `CKRecord.encryptedValues`.

> "A Boolean value that determines whether to encrypt the attribute's value."
>
> `var allowsCloudEncryption: Bool { get set }`
>
> "Set this property to `true` to store the attribute's value in an encrypted form in iCloud. Only
> use this property with new attributes. Core Data doesn't support encrypting attributes that
> already exist in your CloudKit schema, or attributes that represent relationships between
> entities."
>
> "You can also set this property using the **Allow Cloud Encryption** attribute in the Attributes
> inspector of the Core Data model editor."
>
> Important: "Attributes can't change their encryption state after you promote them to your
> production CloudKit schema. If you choose to encrypt an attribute, it always remains that way."

— <https://developer.apple.com/documentation/coredata/nsattributedescription/allowscloudencryption>
(fetched 2026-08-14).

The SDK header adds a restriction the web documentation omits, and it matters a great deal for
this project. `NSAttributeDescription.h` line 69 and its comment block (lines 61–69), iOS 27.0 SDK,
inspected 2026-08-14:

```objc
/*
 * This property can be set to enable encryption-at-rest on data stored in CloudKit servers.
 *
 * There are several restrictions on how clients can use this property:
 *  1. Attributes to be encrypted must be new additions to the CloudKit schema. Attributes that
 *     already exist in the production schema cannot be changed to support encryption.
 *  2. Attributes cannot (ever) change their encryption state in the CloudKit schema. Once
 *     something is encrypted (or not) it will forever be so.
 *
 * Note: This property does not affect the data in the persistent store. Local file encryption
 * should continue to be managed by using NSFileProtection and other standard platform security
 * mechanisms.
 */
@property () BOOL allowsCloudEncryption API_AVAILABLE(macosx(12.0),ios(15.0),tvos(15.0),watchos(8.0));
```

Two things to carry forward: Apple's own framing is **"encryption-at-rest on data stored in
CloudKit servers"** — notably *not* the phrase "end-to-end" (relevant to section 7) — and the flag
has **no effect on the local store**. On-device protection remains a separate problem to be solved
with `NSFileProtection`, not with this flag.

**Does SwiftData surface it?** Yes — that is precisely what `.allowsCloudEncryption` is (section 1).
The linkage is structural, not coincidental: SwiftData sync is implemented *on* Core Data's
CloudKit mirroring.

> "SwiftData uses the `NSPersistentCloudKitContainer` class from Core Data to handle CloudKit
> synchronization. For more information about how your models become instances of `CKRecord`, see
> Reading CloudKit Records for Core Data."

— <https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices>
(fetched 2026-08-14).

Given identical option names on both layers and that shared implementation, the SwiftData option
almost certainly sets `NSAttributeDescription.allowsCloudEncryption` on the generated managed
object model. Apple does not state this mapping explicitly in any source I could find — the
inference is strong but **not directly documented**; see Gaps.

What it maps to in CloudKit: the mirrored `CD_`-prefixed field is created as an encrypted field
type. Apple documents the encrypted field types as surfaced in the CloudKit Console — "Encrypted
Double", "Encrypted String", "Encrypted Timestamp" and so on (section 5). The mirroring naming
convention (`CD_` prefix on record types and fields, `CD_entityName`, `CD_[attribute.name]`) is
documented at
<https://developer.apple.com/documentation/coredata/reading-cloudkit-records-for-core-data>
(fetched 2026-08-14). That page does **not** discuss encrypted fields specifically — see Gaps.

## 3. SwiftData / Core Data interop escape hatches; can you pre-create the CloudKit schema?

Since `.allowsCloudEncryption` exists, no escape hatch is needed for this decision. Recording what
is available anyway:

**Coexistence is documented and supported.** Apple ships a sample with three variants, including
"a coexistence version, where the sample app uses Core Data, and adds a widget extension that uses
SwiftData … a scenario where you might want to adopt SwiftData incrementally, or for certain
portions of your app."
— <https://developer.apple.com/documentation/coredata/adopting-swiftdata-for-a-core-data-app>
(fetched 2026-08-14; page platforms listed as iOS 27.0 / macOS 27.0 / Xcode 27.0).

**SwiftData explicitly hands you the Core Data stack for schema initialization.** The documented
procedure for creating the CloudKit development schema is to build an
`NSPersistentCloudKitContainer` over *the same store URL* as the `ModelConfiguration`, call
`initializeCloudKitSchema()`, then unload it before constructing the `ModelContainer`. Apple's own
code, verbatim from
<https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices>
(fetched 2026-08-14):

```swift
let config = ModelConfiguration()
#if DEBUG
try autoreleasepool {
    let desc = NSPersistentStoreDescription(url: config.url)
    let opts = NSPersistentCloudKitContainerOptions(containerIdentifier: "iCloud.com.example.Trips")
    desc.cloudKitContainerOptions = opts
    desc.shouldAddStoreAsynchronously = false
    if let mom = NSManagedObjectModel.makeManagedObjectModel(for: [Trip.self, Accommodation.self]) {
        let container = NSPersistentCloudKitContainer(name: "Trips", managedObjectModel: mom)
        container.persistentStoreDescriptions = [desc]
        container.loadPersistentStores { _, err in if let err { fatalError(err.localizedDescription) } }
        try container.initializeCloudKitSchema()
        if let store = container.persistentStoreCoordinator.persistentStores.first {
            try container.persistentStoreCoordinator.remove(store)
        }
    }
}
#endif
modelContainer = try ModelContainer(for: Trip.self, Accommodation.self, configurations: config)
```

`NSManagedObjectModel.makeManagedObjectModel(for:)` is the documented bridge from SwiftData model
types to a Core Data `NSManagedObjectModel`. This is an interesting hook: it yields an
`NSManagedObjectModel` whose `NSAttributeDescription`s are in principle inspectable and mutable
before schema initialization. Whether mutating `allowsCloudEncryption` on that derived model is
supported, or whether the mutation would survive into the `ModelContainer`'s own schema, is
**unverified** — and unnecessary given the native option. Listed in Gaps.

**Can you control or pre-create the CloudKit schema?** No — you initialize it *from* the model, and
existing containers are incompatible.

> "Apps using CloudKit cannot use Core Data with CloudKit with existing CloudKit containers. To
> fully manage all aspects of data mirroring, Core Data owns the CloudKit schema created from the
> Core Data model. Existing CloudKit containers aren't compatible with this schema."

— <https://developer.apple.com/documentation/coredata/mirroring-a-core-data-store-with-cloudkit>
(fetched 2026-08-14).

And in the SwiftData guidance, an Important callout:

> "For apps already using a production CloudKit schema, specify only containers that SwiftData or
> Core Data have managed previously. All other CloudKit containers are incompatible."

Plus the additive-only constraint:

> "CloudKit schemas are additive only, which means you're unable to delete model types or change
> existing model attributes after you promote a schema to production."

— both <https://developer.apple.com/documentation/swiftdata/syncing-model-data-across-a-persons-devices>
(fetched 2026-08-14).

So: hand-declaring the CloudKit schema and having SwiftData mirror into it is **not** supported. The
model is the source of truth; the schema is generated from it. This is what makes the encryption
decision pre-deployment and irreversible.

## 4. `CKAsset` encryption — automatic, and you cannot opt in via `encryptedValues`

**Verified: assets are encrypted by default, and it is mandatory rather than opt-in.** Apple's
wording, verbatim:

> "You can encrypt values of any data type that CloudKit supports, except `CKAsset`, which is
> **encrypted by default**, and `Reference`, which isn't encrypted so it remains available for
> server-side use."

— <https://developer.apple.com/documentation/cloudkit/ckrecord/encryptedvalues> (fetched 2026-08-14).
Identical text in `CKRecord.h` line ~419, iOS 27.0 SDK (inspected 2026-08-14).

And from the CloudKit article:

> "CloudKit encrypts `CKAsset` by default so you can't set it as a value for the `encryptedValues`
> property."

The mechanism, verbatim from the same article's "Use Assets" section:

> "When creating or updating a `CKRecord` that contains a `CKAsset`, CloudKit breaks up the asset's
> contents into chunks, and encrypts each chunk before storing it in the third-party services.
> CloudKit then encrypts the key for each chunk, which Apple maintains, with an asset key and
> stores the asset key on the relevant record."
>
> "CloudKit automatically stores the asset key in an encrypted field on the record in the private
> database, and by proxy, in the shared database. This means that CloudKit ultimately encrypts the
> asset data to a key in the user's iCloud Keychain."
>
> "CloudKit doesn't store the asset key in an encrypted field on the record in the public database
> because the record is accessible to anyone with access to that database."

— <https://developer.apple.com/documentation/cloudkit/encrypting-user-data> (fetched 2026-08-14).

So in the **private** database the asset key lands in an encrypted field, chaining asset data to the
user's iCloud Keychain. In the **public** database it does not. This app uses the private database,
so photos get the strong path automatically.

Corroborated at T2 by WWDC21 session 10086 "What's new in CloudKit" (transcript fetched 2026-08-14,
<https://developer.apple.com/videos/play/wwdc2021/10086/>):

> "CloudKit provides cryptographic protection for sensitive data stored in Apple-owned apps and
> services as well as all of your users' data stored in the form of CKAsset. These data are
> preprocessed and encrypted locally before it's sent to the CloudKit server for storage, and is
> decrypted locally upon retrieval. This encryption functionality uses key material that is stored
> in the iCloud Keychain belonging to the iCloud account signed in on the device."

and:

> "Note that because CKAsset field, as mentioned previously, already employs encryption by default,
> they cannot be set as an encryptedValue."

**Is "end-to-end" the right label?** Careful here. Apple's asset text says encryption is to "a key
in the user's iCloud Keychain", which sounds end-to-end, but the iCloud data security overview
places third-party CloudKit **assets** in the same ADP-conditional bucket as encrypted fields:
"third-party app data stored in iCloud Backup and CloudKit encrypted fields and assets are
end-to-end encrypted" *when you turn on Advanced Data Protection* (section 7). Read together: assets
are always encrypted, and become end-to-end encrypted with ADP. Photos are therefore never worse off
than encrypted fields, and require no action.

**Does it differ between hand-rolled CloudKit and SwiftData/Core Data-mirrored assets?** No source
distinguishes them for asset encryption, and the mechanism is server-side and framework-level, so
there is no plausible route for divergence. Not explicitly documented, though — listed in Gaps.

One mirroring detail that is documented and relevant, because it means **large text can silently
become an asset**:

> "All variable length attribute types—String, Binary Data, and Transformable—generate an additional
> field with a key in the form `CD_[attribute.name]_ckAsset`. If a field's value grows too large to
> store within the record size limit of 1MB, Core Data automatically converts the value to an
> external asset. Core Data transitions between the original field and its asset counterpart
> transparently during serialization."

— <https://developer.apple.com/documentation/coredata/reading-cloudkit-records-for-core-data>
(fetched 2026-08-14). Whether the `_ckAsset` companion field is itself created encrypted when the
source attribute has `allowsCloudEncryption` set is **unverified** — see Gaps. It is a real question
for long free-text notes, though assets carry default encryption regardless.

## 5. Cost of encrypted fields — confirmed restrictions

**No indexes; not usable in predicates or sort descriptors.** Confirmed, verbatim, in two Apple
sources.

Note on `CKRecord.encryptedValues`:

> "CloudKit doesn't support indexes on encrypted fields. Don't include encrypted fields in your
> predicate or sort descriptors when fetching records with `CKQuery` and `CKQueryOperation`."

— <https://developer.apple.com/documentation/cloudkit/ckrecord/encryptedvalues> (fetched 2026-08-14);
identical text at `CKRecord.h` line 421, iOS 27.0 SDK (inspected 2026-08-14).

Note in the CloudKit article, which also gives the reason and restates immutability:

> "The encrypted fields can't have indexes because the server can't read the fields. The encrypted
> fields also have to be newly introduced to an existing record or a new record. You can't convert
> existing unencrypted fields in the CloudKit schema."

— <https://developer.apple.com/documentation/cloudkit/encrypting-user-data> (fetched 2026-08-14).

**Supported field types.** From the same article:

> "This method of encryption and decryption applies to most of the `Record` value types, including
> `NSString`, `NSNumber`, `NSDate`, `NSData`, `CLLocation`, and `NSArray`. However, there's no
> encryption support for `Reference` objects because they need to be visible to the server. CloudKit
> encrypts `CKAsset` by default so you can't set it as a value for the `encryptedValues` property."

And more generally from `encryptedValues`: "You can encrypt values of any data type that CloudKit
supports, except `CKAsset` … and `Reference`". So the rule is: **everything except `CKRecord.Reference`
(never encryptable) and `CKAsset` (always encrypted, cannot be listed)**.

**`CKRecord.Reference` is never encrypted — but Core Data mirroring does not use references anyway.**
This is a useful interaction. Core Data stores relationships as plaintext foreign-key strings, not
`CKRecord.Reference`:

> "Core Data doesn't use CloudKit's native support for relationships, `Reference`, because this field
> limits the number of references to 750, and cannot represent many-to-many relationships. Core Data
> stores the relationship in CloudKit according to its cardinality."

One-to-one and one-to-many relationships "store the foreign key of the related object in the form
`CKRecord.recordID.recordName`"; many-to-many relationships create a separate `CDMR` record type
whose `CD_recordNames` field holds e.g.
`"CD_Post_F587C290-BC2F-441B-98FC-1357BA89C411:CD_Tag_215FA1E0-6A16-4A2B-BFA2-C13202BE6D50"`.
— <https://developer.apple.com/documentation/coredata/reading-cloudkit-records-for-core-data>
(fetched 2026-08-14).

Consequence: **the relationship graph is server-visible plaintext regardless of field encryption.**
Which meal a skin observation belongs to, and the shape/volume of the graph, is exposed via record
names in relationship fields and `CDMR` records. Core Data also refuses to encrypt relationship
attributes at all ("or attributes that represent relationships between entities", section 2).

**Other documented restrictions.**

- Public database excluded. "CloudKit doesn't allow encryption … on records that you store in the
  public database" (`encryptedValues`, fetched 2026-08-14). Private and shared databases support it;
  for the public database "account-based data encryption isn't necessary" per the article's database
  table. Not a constraint for this app.
- Irreversibility, restated in three places (article note; `encryptedValues` "Only encrypt new
  fields"; the Core Data Important callout and header comment).
- **Keychain-reset data loss** — the sharpest operational risk, and it applies to encrypted data
  generally. From the article: "CloudKit encrypts data with the key material in the user's iCloud
  Keychain. If the user loses access to iCloud Keychain, CloudKit can't access the key material that
  it previously used to encrypt the data, so iCloud can't decrypt it." The failure surfaces as
  `zoneNotFound` carrying `CKErrorUserDidResetEncryptedDataKey` in `userInfo`, and can arise from
  `CKFetchRecordsOperation`, `CKFetchRecordZonesOperation`, `CKFetchRecordZoneChangesOperation`,
  `CKModifyRecordZonesOperation`, `CKModifyRecordsOperation`. Apple: "When this error occurs, the
  data becomes permanently lost", and the app must delete the zones, recreate them, and re-upload
  locally cached data. Also from Apple Platform Security: "In the worst case of losing access to
  iCloud Keychain and all of its recovery mechanisms, the end-to-end encrypted data in CloudKit is
  lost. Apple can't help recover this data."
  (<https://support.apple.com/guide/security/icloud-encryption-sec3cac31735/web>, fetched 2026-08-14.)
  How `NSPersistentCloudKitContainer`/SwiftData surface or auto-handle this is **unverified** — Gaps.
- Account must be `available`: per WWDC21 10086, encryption operations need a valid logged-in
  account, checked via `CKContainer.accountStatus(completionHandler:)`; other states yield
  `CKErrorNotAuthenticated`, including `CKAccountStatusTemporarilyUnavailable` (new in iOS 15,
  confirmed at `CKContainer.h` line 157, iOS 27.0 SDK, inspected 2026-08-14).
- **Size**: no documented size difference or overhead for encrypted fields was found. Unverified — Gaps.

## 6. Record names, zone names, timestamps — permanently server-visible

**Record names.** There is no encryption facility for `CKRecord.ID.recordName`: it is part of the
record's identity, not its field data. `encryptedValues` is a key-value store over *fields* only
(`CKRecordKeyValueSetting`: `object(forKey:)`, `setObject(_:forKey:)`, `allKeys()`, `changedKeys()`
— <https://developer.apple.com/documentation/cloudkit/ckrecordkeyvaluesetting>, fetched 2026-08-14),
and `recordName` is a `get`-only `String` on `CKRecord.ID`
(<https://developer.apple.com/documentation/cloudkit/ckrecord/id/recordname>, fetched 2026-08-14;
`CKRecordID.h` line 71, iOS 27.0 SDK, inspected 2026-08-14). Nothing in the supported-encrypted-types
list refers to identity components.

That record names are server-readable is demonstrated rather than merely implied — the server
indexes, queries and joins on them:

> "When you create a record programmatically, iCloud creates a `recordName` metadata field in the
> corresponding record type. You add a `QUERYABLE` index to this field to enable searching for
> records by type in the CloudKit Database app and in code."

— <https://developer.apple.com/documentation/cloudkit/inspecting-and-editing-an-icloud-container-s-schema>
(fetched 2026-08-14). Since encrypted fields "can't have indexes because the server can't read the
fields", a field that *can* carry a `QUERYABLE` index is by definition server-readable.

Apple also explicitly invites meaningful names, with no privacy caveat attached:

> "A record ID object consists of a name string and a zone ID. The name string is an ASCII string
> that doesn't exceed 255 characters in length. When you create a record without specifying a record
> ID, the ID name string derives from a UUID and is, therefore, unique. When creating your own record
> ID objects, you can use names that have more meaning to your app or to the user, as long as each
> name is unique within the specified zone. For example, you might use a document name for the name
> string."

— <https://developer.apple.com/documentation/cloudkit/ckrecord/id> (fetched 2026-08-14).

> **FLAG — the proposed composite record name `date:mealType:actor` leaks the data it is meant to
> protect.** Record names are permanently server-visible plaintext, are ASCII-constrained, are
> indexable, and are additionally **copied into relationship fields and `CDMR` records as foreign
> keys** under Core Data mirroring (section 5). A name of the form `2026-08-14:breakfast:mother`
> publishes, in the clear, that the child ate breakfast on that date and who fed them — i.e. a
> complete feeding schedule and caregiver pattern for an infant — even if every field on the record
> is encrypted. The exposure is also **irreversible**: record names are immutable identity and
> CloudKit schemas are additive only. Recommendation: use opaque UUID record names (SwiftData's
> default behaviour — the mirroring examples show `CD_Post_UUID` /
> `CD_Post_F587C290-BC2F-441B-98FC-1357BA89C411`) and keep `date`, `mealType` and `actor` as
> ordinary encrypted attributes. Note the corollary that follows from section 9: because SwiftData
> queries run locally, nothing is lost by doing so — you do not need a meaningful record name for
> lookup or de-duplication.

**Zone names.** Also plaintext. `zoneName` is a plain readonly `NSString` with documented ASCII
constraints, described purely as an identifier:

> "zoneName: The name that identifies the record zone. Zone names consist of up to 255 ASCII
> characters, and don't start with an underscore."

— `CKRecordZoneID.h` lines 51–58, iOS 27.0 SDK (inspected 2026-08-14). No encryption facility exists
for it. For SwiftData/Core Data mirroring this is moot in practice: the zone is fixed and
Apple-chosen — "Core Data with CloudKit uses a specific record zone in the CloudKit private
database" (<https://developer.apple.com/documentation/coredata/mirroring-a-core-data-store-with-cloudkit>,
fetched 2026-08-14), shown throughout the mirroring docs as
`com.apple.coredata.cloudkit.zone:__defaultOwner__`. It carries no app data, so no leak.

**System timestamps.** `creationDate` is server-generated, which is dispositive — the server must
read and write it:

> "The time when CloudKit first saves the record to the server." … "The creation date reflects the
> time when CloudKit creates a record on the server with the current record's ID."

— <https://developer.apple.com/documentation/cloudkit/ckrecord/creationdate> (fetched 2026-08-14).
Metadata keys are queryable server-side: "Key names can include the names of the record's metadata
properties, such as `creationDate`"
(<https://developer.apple.com/documentation/cloudkit/ckquery>, fetched 2026-08-14) — again implying
plaintext, since encrypted fields cannot be queried.

Apple's user-facing confirmation that timestamps stay under standard protection even with ADP on:

> "Some metadata and usage information stored in iCloud remains under standard data protection, even
> when Advanced Data Protection is enabled. For example, dates and times when a file or object was
> modified are used to sort your information … This metadata is always encrypted, but the encryption
> keys are still stored by Apple."

— <https://support.apple.com/en-us/102651> (fetched 2026-08-14; page states "Published Date: January
05, 2026").

Practical consequence: **record creation/modification times are exposed regardless.** For this app
that means the *timing* of logging is observable even with everything encrypted. A user's own
domain-level date field, stored as an encrypted attribute, is a different thing from the system
timestamp and can be protected; the system timestamp cannot.

I did not find a single Apple sentence of the form "record names and zone names are never
encrypted". The conclusion above is assembled from the type surfaces, the indexability contrast, and
the queryability of metadata — strong, but a direct quotation does not appear to exist. Noted in Gaps.

## 7. E2EE vs standard data protection — the two sources, quoted

The tension is real, and it is a difference of framing plus one genuine ambiguity. Both sides:

**Side A — the developer documentation, which conditions E2EE on ADP.** From
`CKRecord.encryptedValues` (<https://developer.apple.com/documentation/cloudkit/ckrecord/encryptedvalues>,
fetched 2026-08-14; identical at `CKRecord.h` line 423, iOS 27.0 SDK, inspected 2026-08-14):

> "CloudKit encrypts the fields' values on-device before saving them to iCloud, and decrypts the
> values only after fetching them from the server. **When you enable Advanced Data Protection, the
> encryption keys are available exclusively to the record's owner** and, if the user shares the
> record, that share's participants."

The conditional clause is the crux: exclusivity of key access is granted *when ADP is enabled*, which
implies it does not hold otherwise. Consistent with this, the Core Data header calls the feature
"encryption-at-rest on data stored in CloudKit servers" — not end-to-end encryption (section 2).

**Side B — the CloudKit article, which describes it in unconditional end-to-end terms.** From
<https://developer.apple.com/documentation/cloudkit/encrypting-user-data> (fetched 2026-08-14):

> "CloudKit encrypts data with the key material in the user's iCloud Keychain. If the user loses
> access to iCloud Keychain, CloudKit can't access the key material that it previously used to
> encrypt the data, **so iCloud can't decrypt it**."

Taken alone this asserts Apple cannot decrypt, with no ADP qualifier — the defining property of E2EE.
WWDC21 10086 (T2, fetched 2026-08-14) reads the same way, and predates ADP entirely (ADP shipped
iOS 16.2, so a 2021 session cannot have been describing an ADP-conditional feature):

> "This encryption functionality uses key material that is stored in the iCloud Keychain belonging to
> the iCloud account signed in on the device."
>
> "Cryptographic protection adds another layer on top of account-based protection. Because even if an
> unauthorized party somehow bypasses the authorization, they cannot decrypt the data retrieved."

Note "an unauthorized party" — not "Apple".

**The tiebreaker — the iCloud data security overview settles it against Side A's reading.**
<https://support.apple.com/en-us/102651> (fetched 2026-08-14; "Published Date: January 05, 2026"),
section "Third-party app data", verbatim and complete:

> "Third-party app data stored in iCloud is always encrypted in transit and on server. **When you
> turn on Advanced Data Protection, third-party app data stored in iCloud Backup and CloudKit
> encrypted fields and assets are end-to-end encrypted.**"

This is unambiguous and directly on point: for third-party apps, CloudKit encrypted fields **and
assets** are end-to-end encrypted **when ADP is on**. Without ADP they are "encrypted in transit and
on server" — which the same page defines as Apple holding the keys:

> "Standard data protection is the default setting for your account. Your iCloud data is encrypted,
> the encryption keys are secured in Apple data centers so we can help you with data recovery, and
> only certain data is end-to-end encrypted."

Note also that this app's data does **not** inherit the "Health data" row of Apple's E2EE table. That
row covers Apple's own Health (HealthKit/iCloud Health sync), one of the 15 always-E2EE categories.
A third-party app writing eczema records to its own CloudKit container falls under "Third-party app
data", regardless of the data being health data in substance. This is a trap worth stating explicitly.

**Reconciliation.** Apple Platform Security explains the mechanism and dissolves most of the
apparent contradiction. CloudKit service keys come in two kinds
(<https://support.apple.com/guide/security/icloud-encryption-sec3cac31735/web>, fetched 2026-08-14):

> "CloudKit service keys are divided into two categories: end-to-end encrypted and
> available-after-authentication."
>
> "**End-to-end encrypted service keys**: For end-to-end encrypted iCloud services, the relevant
> CloudKit service private keys are never made available to Apple servers."
>
> "**Available-after-authentication service keys**: For other services, such as Photos and iCloud
> Drive, the service keys are stored in iCloud Hardware Security Modules in Apple data centers, and
> can be accessed by some Apple services. When a user signs in to iCloud on a new device and
> authenticates their Apple Account, these keys can be accessed by Apple servers without further
> user interaction or input."

So Side B is true as far as it goes — the data really is encrypted to key material rooted in the
user's iCloud Keychain, and the keychain-loss data-loss scenario is real — but under standard data
protection a third-party container's service key is *available-after-authentication*, so Apple can
obtain it. Under ADP it becomes end-to-end. Side B's "iCloud can't decrypt it" describes the
keychain-reset case, not the general threat model. **Treat Side A + the support article as
authoritative.**

**Can a developer detect or require ADP? — No.**

- A case-insensitive grep for `advancedDataProtection` across **every** framework header in the
  iOS 27.0 SDK (`$SDK/System/Library/Frameworks/`) returns **zero** matches (checked 2026-08-14).
- The only ADP mention anywhere in CloudKit's headers is the prose sentence in `CKRecord.h` line 423
  quoted above — documentation, not API.
- `CKAccountStatus` exposes only `couldNotDetermine`, `available`, `restricted`, `noAccount`, and
  `temporarilyUnavailable` — nothing about protection level (`CKContainer.h` lines 139–157, iOS 27.0
  SDK, inspected 2026-08-14).

There is therefore no supported way to detect ADP, gate features on it, or require it. ADP is also
user-controlled and revocable at any time: "You can turn off Advanced Data Protection at any time.
Your device will securely upload the required encryption keys to Apple servers, and your account will
once again use standard data protection" (<https://support.apple.com/en-us/102651>, fetched
2026-08-14). Absence of evidence in headers is strong here but is an argument from absence — flagged
in Gaps.

**Implication for this project.** Encrypting fields is a real improvement — a second cryptographic
layer beyond account-based access control, per the article's "Encryption adds another layer of
protection on top of account-based access control". It is *not* a guarantee that Apple cannot read
infant health records, and cannot be made into one, and must not be described to users as
end-to-end encryption.

## 8. Apple's guidance on which fields to encrypt — Health is named

**Health is explicitly named as an intended use case.** Verbatim:

> "Encryption adds another layer of protection on top of account-based access control, and is
> available for data that's sensitive or private to the user. CloudKit's encrypted fields allow you
> to optionally add that second layer of cryptographic protection by choosing which fields the system
> encrypts within a `CKRecord`."
>
> "**Use encrypted fields to offer data encryption to your users in your CloudKit-based apps, such as
> Photos, Notes, Health, Home, and so forth.** See the [iCloud data security overview] for more
> information."

— <https://developer.apple.com/documentation/cloudkit/encrypting-user-data> (fetched 2026-08-14). The
linked article is `https://support.apple.com/en-us/HT202303`, the legacy id that redirects to
`102651` — the same page quoted in section 7, i.e. Apple itself points developers at the
ADP-conditional statement.

So an app of this kind is squarely within the intended use case, and the selection criterion is
"data that's sensitive or private to the user".

**What to leave unencrypted, and why.** Apple gives no field-by-field guidance for Health apps. It
does give a mechanical rule with a stated reason, which is the whole of the documented guidance:

- `Reference` — must not be encrypted "because they need to be visible to the server" / "so it
  remains available for server-side use". Moot under Core Data mirroring, which does not use
  `Reference` (section 5).
- `CKAsset` — cannot be listed; already encrypted (section 4).
- Anything needed in a server-side `CKQuery` predicate or sort descriptor — cannot be encrypted,
  because indexes are impossible (section 5). **For this app this exclusion is vacuous**, since
  SwiftData queries run locally (section 9).

WWDC21 10086 adds the same principle at T2 — "Cryptographic protection should be used for data that
is sensitive or private to your users. Many CloudKit-backed apps within Apple take advantage of this
functionality with Photos and Notes as two examples" — and notes Apple offered it so developers avoid
"rolling your own cryptography".

Beyond that, Apple publishes no Health-specific field-selection guidance, no
minimise-what-you-encrypt advice, and no worked health example. Searches of the CloudKit
documentation set surfaced nothing further. Listed in Gaps.

**Applied to this app** (my analysis, not Apple's): the documented criterion — sensitive or private
to the user — covers skin observation levels per body region, free-text notes, and the meal/food ids,
all of which are health data about an identifiable infant. Photos need no decision. The real
decisions are (a) encrypt essentially every content attribute, since the local-query architecture
makes it nearly free, and (b) do **not** encode meaning in record names, which no amount of field
encryption can protect (section 6).

## 9. Does anything break? — local SwiftData queries vs server-side `CKQuery`

The distinction is the single most important practical finding, because it makes the documented cost
of encryption almost entirely irrelevant to this app.

**The restriction is scoped to `CKQuery`, by its own wording.** Apple's note names the API surfaces:

> "CloudKit doesn't support indexes on encrypted fields. Don't include encrypted fields in your
> predicate or sort descriptors **when fetching records with `CKQuery` and `CKQueryOperation`**."

— <https://developer.apple.com/documentation/cloudkit/ckrecord/encryptedvalues> (fetched 2026-08-14).
The reason given elsewhere is server-side: encrypted fields "can't have indexes **because the server
can't read the fields**" (<https://developer.apple.com/documentation/cloudkit/encrypting-user-data>,
fetched 2026-08-14). Both the restriction and its rationale concern the server evaluating the query.

**SwiftData fetches are local.** Verified by architecture rather than by a single quotable sentence:

- SwiftData is a persistence layer over a local store — "Combining Core Data's proven persistence
  technology and Swift's modern concurrency features … The framework handles storing the underlying
  model data, **and optionally, syncing that data across multiple devices**"
  (<https://developer.apple.com/documentation/swiftdata>, fetched 2026-08-14). Storage is primary;
  sync is an add-on.
- Core Data with CloudKit is explicitly a **mirroring** design: "Back user interfaces with a **local
  replica** of a CloudKit private database", and it "combines the benefits of local persistence with
  cloud backup and distribution"
  (<https://developer.apple.com/documentation/coredata/mirroring-a-core-data-store-with-cloudkit>,
  fetched 2026-08-14).
- Eligibility requires a SQLite store: "Apps adopting Core Data can use Core Data with CloudKit as
  long as the persistent store is an `NSSQLiteStoreType` store" (same page).
- `ModelContext` operates on that store, saving "changes to disk", with `@Query` performing fetches
  through it (<https://developer.apple.com/documentation/swiftdata/modelcontext>,
  <https://developer.apple.com/documentation/swiftdata/query>, both fetched 2026-08-14).
- Decisively, `.allowsCloudEncryption` "**does not affect the data in the persistent store**"
  (`NSAttributeDescription.h` line 67 comment, iOS 27.0 SDK, inspected 2026-08-14). The local SQLite
  column holds ordinary plaintext, so SQLite can index, filter and sort it exactly as before.

Since the local column is unencrypted and queries evaluate against it, encryption cannot affect local
query behaviour. Taking the specific concerns:

| Concern | Effect | Basis |
| --- | --- | --- |
| `#Predicate` / `@Query` filtering on encrypted attributes | **No effect.** Evaluated locally against SQLite, where values are plaintext. | Local-replica architecture; `allowsCloudEncryption` "does not affect the data in the persistent store". |
| Sorting in `@Query` / `SortDescriptor` | **No effect**, same reason. | As above. |
| `#Index` on an encrypted attribute | **Local index unaffected** (it is a SQLite index, "binary or R-tree"); the CloudKit-side field simply has no server index. | `#Index` docs, <https://developer.apple.com/documentation/swiftdata> (fetched 2026-08-14); CloudKit no-index note. |
| Relationship traversal | **No effect** — and relationships *cannot* be encrypted anyway. Traversal is local; the CloudKit representation is plaintext foreign keys / `CDMR` records. | Core Data: no encryption for "attributes that represent relationships between entities"; mirroring doc (both fetched 2026-08-14). |
| Server-side `CKQuery` on encrypted fields | **Breaks** — but this app never issues `CKQuery`; mirroring is handled by `NSPersistentCloudKitContainer`. | `encryptedValues` note. |
| CloudKit Console visibility / debuggability | **Degraded** — values not readable server-side; fields appear with an `Encrypted` type prefix. | Article: "The encrypted fields can't have indexes because the server can't read the fields"; WWDC21 10086 (below). |

**Console/debuggability specifics**, from WWDC21 10086 (T2, fetched 2026-08-14):

> "You can visualize the encrypted fields by going to the CloudKit database schema, just like for the
> regular fields." … "In the Console, all encrypted fields will be shown in the drop-down for record
> value data types. They will have the prefix 'encrypted' such as 'Encrypted Double,' 'Encrypted
> Timestamp,' to help you differentiate them from the unencrypted ones. You can also manage encrypted
> fields through the CloudKit Console directly, without any code change."

Corroborated in the article: "Using CloudKit console, add a new field to a new record type in your
development environment schema. Set the field type to the desired encrypted data type, such as
Encrypted Double or Encrypted String." So the **schema** stays inspectable; the **values** do not.
Note also that with ADP enabled, iCloud.com data access is disabled by default
(<https://support.apple.com/en-us/102651>, fetched 2026-08-14).

One extra consequence worth planning for: **querying by record type in the Console requires a
`QUERYABLE` index on `recordName`** — "To enable searching for records by type, you must first add an
index to a field on your record type"
(<https://developer.apple.com/documentation/cloudkit/inspecting-and-editing-an-icloud-container-s-schema>,
fetched 2026-08-14). With opaque UUID record names and all content fields encrypted, the Console will
show that records exist and how many, but not what they contain — which is the intended outcome, at
the cost of debuggability.

I found no Apple sentence explicitly stating "SwiftData predicates execute locally, not as `CKQuery`".
The conclusion follows from the mirroring/local-replica architecture, the SQLite store requirement,
and the "does not affect the data in the persistent store" guarantee. Confident, but assembled —
noted in Gaps.

---

## Gaps

Unverified items. Nothing above depends on any of these for its main conclusion unless stated.

1. **Documented mapping from SwiftData's `.allowsCloudEncryption` to
   `NSAttributeDescription.allowsCloudEncryption`.** Both exist with identical names and SwiftData
   sync runs on `NSPersistentCloudKitContainer`, but no Apple source states the mapping explicitly.
   Inference only. *(Does not affect Q1: the SwiftData option is documented and present in the SDK
   regardless of how it is implemented.)*
2. **Whether the SwiftData option carries the same "new attributes only / can never change" rules.**
   Documented for Core Data and for CloudKit generally; the SwiftData page for
   `allowsCloudEncryption` is a bare one-line stub with no discussion section. Prudent to assume the
   rules apply — they are enforced by CloudKit, below both frameworks.
3. **Whether the `CD_[attribute]_ckAsset` companion field is created encrypted when the source
   attribute is encrypted.** Relevant to long free-text notes that overflow the 1 MB record limit.
   Not documented. (Mitigated: assets carry default encryption.)
4. **Whether SwiftData/Core Data-mirrored assets and hand-rolled `CKAsset`s are encrypted
   identically.** No source distinguishes them; no source affirms equivalence either.
5. **A direct Apple statement that record names and zone names are never encryptable.** No such
   sentence found. Conclusion assembled from type surfaces, indexability, and metadata queryability
   (section 6). Confidence high; a single verbatim quotation appears not to exist.
6. **Existence of any private/undocumented ADP-detection API.** Verified absent from all public
   iOS 27.0 SDK framework headers — an argument from absence, though a strong one.
7. **A direct Apple statement that SwiftData `#Predicate`/`@Query` execute locally rather than as
   server-side `CKQuery`.** Not found as a single sentence; derived (section 9). Confidence high.
8. **How `NSPersistentCloudKitContainer`/SwiftData surface `CKErrorUserDidResetEncryptedDataKey`.**
   The raw CloudKit error and required recovery are documented, but not how the mirroring layer
   reports it or whether recovery is automatic. Operationally significant — the failure mode is
   permanent data loss.
9. **Size or performance overhead of encrypted fields.** No documented figures; no statement that
   overhead is zero.
10. **Whether mutating `allowsCloudEncryption` on the `NSManagedObjectModel` produced by
    `NSManagedObjectModel.makeManagedObjectModel(for:)` is supported or survives into the
    `ModelContainer`'s schema.** Untested and undocumented; unnecessary given the native option.
11. **Apple developer forum posts (T3).** Deliberately not cited: the forums search endpoint and
    `developer.apple.com/search` are not accessible programmatically from this environment (both
    returned errors or JS-only pages on 2026-08-14). No forum claims are relied upon anywhere above.
12. **Behaviour when a user has never enabled iCloud Keychain**, and whether encrypted-field writes
    fail or silently fall back. WWDC21 mentions account-status prerequisites but not this case.
13. **Empirical confirmation.** Nothing here was tested against a live CloudKit container. All
    findings are from documentation, SDK headers/`.swiftinterface`, and session transcripts. A
    development-environment schema dump would be the natural next verification step, particularly for
    gaps 1, 3 and 5.
