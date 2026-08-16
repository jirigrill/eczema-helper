# Can a SwiftData app observe CloudKit sync failure?

Spike findings. **Yes — route 1 works.** `NSPersistentCloudKitContainer.eventChangedNotification` is delivered to an observer registered with `object: nil`, and the notification's `object` is the `NSPersistentCloudKitContainer` that SwiftData built — the reference SwiftData never yields through its own API. Capturing it makes the full, documented Core Data event surface reachable, including the after-the-fact event request.

Measured, not read: **Xcode 27.0 (build 27A5237l)**, iOS 26.0 simulator target (iPhone 17, iOS 26.5 runtime), Swift 6 language mode, on 2026-08-16. Every claim below is an observation from a run; where a question could not be reached, it is listed as an open gap rather than inferred.

**Method.** Xcode is installed but no Apple ID is signed into it, and `eczema-ios` is docs-only, so the probes are hand-assembled simulator app bundles: `swiftc` against the iPhoneSimulator SDK, an `Info.plist`, ad-hoc `codesign`, then `simctl install` / `launch`. Findings are written to a file in the app's Documents directory and read back from the host with `simctl get_app_container` — no pbxproj, no generator (XcodeGen cannot read Xcode 26+ projects per [#699](https://github.com/jirigrill/eczema-helper/issues/699)). Sources are in the ticket's working directory; the runner is `run.sh`, the per-case matrix `run_cases.sh`.

---

## The answer to the ticket

**Route 1 works, so routes 2 and 3 are not needed.** No parallel read-only Core Data stack, and no reopening of the SwiftData decision — handoff §2 stands untouched.

Observed on the first run that retained the container:

```
[  0.017] observer registered (object: nil) BEFORE any container exists
[  0.018] building ModelConfiguration with cloudKitDatabase: .private(iCloud.jirigrill.eczema)
[  0.069] ModelContainer init RETURNED OK
[  0.081] saved 3 Notes
[  0.111] *** EVENT #1 RECEIVED ***
[  0.116]   note.object type = Optional(NSPersistentCloudKitContainer)
[  0.117]   type=setup succeeded=false
[  0.117]   identifier=933963F5-6ABB-4B8D-A526-7FDE89F10859 storeIdentifier=F6D6C5AB-…
[  0.143]   start=2026-08-16 09:53:58 +0000 end=nil (in flight)
[  0.144]   error=nil
```

Three things are established by that trace:

1. **The notification is delivered with `object: nil`.** Apple's sample passes `object: container`; a SwiftData app has no container to pass. Observing with `nil` receives it anyway.
2. **`note.object` is the container itself.** This is the stronger result. The gap recorded as gap 15 in `cloudkit-unavailable-behavior.md` was that Apple "never documents … how to obtain a reference to it". The notification hands it over.
3. **Registering before the container works, and is what a real app must do** — see the ordering gap below.

### Capturing the container unlocks the documented API

Casting `note.object` to `NSPersistentCloudKitContainer` and retaining it gives a normal Core Data container. Observed:

```
  >>> CAPTURED NSPersistentCloudKitContainer from note.object
  >>> name=default stores=1
  >>> viewContext=NSManagedObjectContext
  >>> EVENT REQUEST OK: NSPersistentCloudKitContainerEventResult
  >>> resultType=0
  >>> fetched 0 historical event(s)
```

So `NSPersistentCloudKitContainerEventRequest.fetchEvents(after:)` **executes** on the captured container's `viewContext`. It returned 0 events because it was issued during the very first setup event, before any had completed — not because the channel is unavailable. That the request runs at all matters, because the SwiftData-native route does not exist:

**`ModelContext.fetchHistory` cannot express the event request.** Its signature is `fetchHistory<T>(_ descriptor: HistoryDescriptor<T>) throws -> [T] where T: HistoryTransaction`, and `NSPersistentCloudKitContainerEventRequest` is not convertible to `HistoryDescriptor<T>`. This is a compile error, not a runtime one:

```
error: cannot convert value of type 'NSPersistentCloudKitContainerEventRequest'
       to expected argument type 'HistoryDescriptor<T>'
```

The practical consequence: **the notification is the only entry point.** An app that never observes the notification never obtains the container, and therefore cannot reach the after-the-fact channel either. The two documented channels are not independent for a SwiftData app — one is the key to the other.

Also worth recording for the spec: `NSPersistentCloudKitContainerEvent` is spelled `NSPersistentCloudKitContainer.Event` in Swift; the old name is a compile error with a fix-it.

### The shape of an event, as observed

| Field | Observed |
| --- | --- |
| `type` | `.setup` on first launch, as `.setup`/`.import`/`.export` |
| `succeeded` | `false` while in flight — see below |
| `endDate` | **`nil` while in flight**, non-nil when terminal. Not optional-typed on `startDate`, which is a plain `Date` |
| `identifier` | per-event UUID string |
| `storeIdentifier` | per-store UUID string, distinct from `identifier` |
| `error` | `nil` on the in-flight event |

**`succeeded == false` does not mean failure.** On the in-flight event, `endDate` is `nil` and `succeeded` is `false` — the event has not finished, so it has not succeeded *yet*. Any sync-health indicator that reads `succeeded` without first checking `endDate != nil` will report a failure on every single launch, during normal healthy setup. This is the single most dangerous detail in this note: it turns "no indicator" into "an indicator that cries wolf", which #687's fallback reasoning explicitly rates as worse than none.

**Rule for the spec:** treat an event as a verdict only when `endDate != nil`. Until then it is in progress.

---

## What could not be reached, and why

**The simulator cannot carry iCloud entitlements under ad-hoc signing.** This is the ceiling on the whole spike, and it is a toolchain fact worth recording because it will recur for anyone running a probe this way.

`com.apple.developer.icloud-*` are restricted entitlements. Signed ad-hoc (`codesign -s -`), an app carrying any of them is refused at launch by SpringBoard:

```
The request was denied by service delegate (SBMainWorkspace).
… FBProcessExit code 64 "The process failed to launch"
… NSPOSIXErrorDomain Code=163
```

Established by bisection, one key at a time: an empty entitlements dict launches; `get-task-allow` alone launches; `com.apple.developer.icloud-container-environment` **alone** does not; nor does `icloud-services`, nor `icloud-container-identifiers`, nor those plus a fabricated `application-identifier` and `team-identifier`. A real provisioning profile is required, which requires an Apple ID signed into Xcode — not yet done ([#676](https://github.com/jirigrill/eczema-helper/issues/676) closed with the Developer Program active but no signing identity minted, and `~/Library/Developer/Xcode/UserData` holds no profiles).

Without the entitlement, CloudKit's own setup path aborts the process:

```
Significant issue at CKContainer.m:748: In order to use CloudKit, your process must
have a com.apple.developer.icloud-services entitlement.
```

as `EXC_BREAKPOINT` in `-[PFCloudKitContainerProvider containerWithIdentifier:options:]`, reached from `-[NSCloudKitMirroringDelegate _performSetupRequest:]`. The abort lands at **t≈0.14s**, *after* the in-flight `.setup` event is posted at t≈0.11s. That ordering is why route 1 is answerable at all here — and it is what makes the following questions unanswerable without a profile:

1. **Which `CKError` codes actually arrive in `Event.error`.** No terminal event was ever produced, so no error was observed. `quotaExceeded` / `notAuthenticated` reaching the app remains **unverified** — exactly as the ticket framed it. Apple types the field only as `(any Error)?`.
2. **Whether an observer registered *after* the container still receives events.** Probed directly (`probe_late.swift`, registering at t=0.5s); the process was already dead. **Unanswered, and it matters**: a real app builds its container in `@main`/`init` and typically subscribes from a view or service created later. If setup events are spent by then, the first and most diagnostic event is missed. Until measured, the spec should require registration **before** the `ModelContainer` is created.
3. **Whether one logical initial sync emits one `.import` event or many** — #713 item 5. One `.setup` event was seen; no `.import` ever ran. **Unanswered.**
4. **Whether the notification is posted on a background queue**, and whether it can arrive concurrently. The observer here was called on the CloudKit worker thread, but with only one event that is not a general result.

**Neither the fallback nor route 3 is triggered.** #687's "no indicator, plus a spec note that sync health is undetectable" is not needed: sync health *is* observable. And route 3 (Core Data instead of SwiftData) never comes into play, so nothing goes back to the owner.

---

## #713 items 1–4: CloudKit-unsupported model features

Run in the same sitting, as [#713](https://github.com/jirigrill/eczema-helper/issues/713) asked. These are **schema-validation** questions: the verdict is reached at store load, before CloudKit is contacted, so the missing entitlement does not obstruct them. Each case ran in its own process (a passing schema goes on to hit the entitlement abort, which would truncate any later case in a shared run), mirrored and local-only, seven cases, fourteen runs.

**The headline: none of these is a silent no-op.** Every unsupported feature is rejected at `ModelContainer` init, with an explicit reason — the dangerous case #713 feared does not occur here.

| # | Feature | Mirrored | Local-only |
| --- | --- | --- | --- |
| control | plain model | succeeds | succeeds |
| 1 | `@Attribute(.unique)` | **throws** | succeeds |
| 1 | `#Unique<T>([\.code])` macro | **throws** | succeeds |
| 2 | `@Relationship(deleteRule: .deny)` | **throws** | succeeds |
| 3 | `@Relationship(deleteRule: .noAction)` | **succeeds** | succeeds |
| 4 | non-optional attribute, no default | **throws** | succeeds |
| 4b | non-optional to-one relationship | **throws** | succeeds |

The Core Data validation text, verbatim from the system log of each run:

- `.unique` — "CloudKit integration does not support unique constraints. The following entities are constrained: UniqueNote: code"
- `#Unique` macro — same message, naming `UniqueMacroNote: code`. **Both spellings are rejected**; the macro is not a way around it.
- `.deny` — "The following relationships are configured with unsupported delete rules: DenyParent:children - Deny". This is the item #713 called "the genuinely unsourced one". It is now sourced by observation.
- non-optional attribute — "CloudKit integration requires that all attributes be optional, or have a default value set. The following attributes are marked non-optional but do not have a default value: RequiredAttr: mandatory"
- non-optional relationship — "CloudKit integration requires that all relationships be optional, the following are not: ReqRelChild: parent"

**Item 3 (`.noAction`) is the one that passes.** It is accepted under mirroring with no error and no warning. Given Apple never mentions `.noAction` in a mirroring context, "accepted" is the observation; whether it *behaves* correctly across devices is a different question this spike did not test, and it should not be assumed. `.noAction` leaves dangling references by design, so an app choosing it takes on the cleanup itself.

**Item 4 is settled, correcting the record.** #691 left it unverified whether a required *attribute* is rejected; the community claim was that only relationships are constrained. It is rejected — and the message shows why the community version was half-right: what mirroring requires is optional **or defaulted**. A non-optional `var title: String = ""` is fine (every control model here uses that shape); a non-optional attribute *without* a default is not. That distinction is the actionable form of the rule.

### The error SwiftData gives you is useless on its own

Every mirrored rejection surfaces to Swift as the same opaque value:

```
SwiftDataError(_error: SwiftData.SwiftDataError._Error.loadIssueModelContainer,
               _explanation: nil)
```

`domain=SwiftData.SwiftDataError code=1`, `localizedDescription` = "The operation couldn't be completed. (SwiftData.SwiftDataError error 1.)", **`userInfo` is empty** — no `NSLocalizedFailureReason`, no `NSUnderlyingError`. All five distinct validation failures above are indistinguishable through the thrown error. The precise reason exists only in the unified log, emitted by Core Data (`com.apple.coredata:error` → "Store failed to load", then `com.apple.swiftdata:DataStore` → "Unresolved error loading container").

Consequences worth carrying into the spec and the CI setup:

- **A schema mistake of this class cannot be diagnosed from a crash report or an error message alone** — it requires the device/simulator log. An agent or developer seeing only `SwiftDataError error 1` has no path to the cause.
- It is a **launch-time, total** failure: the container does not load, so the app has no store at all. There is no partial-degradation mode to design around; it is caught on first run of a bad build.
- It argues for a **spec-derived test that builds the real schema with mirroring enabled** in CI. That test needs no iCloud entitlement and no account — validation happens before CloudKit is contacted — so it is free to run, and it is the only cheap guard against shipping a schema that cannot load.
