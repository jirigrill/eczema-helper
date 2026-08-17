# Can a SwiftData app observe CloudKit sync failure?

Spike findings. **Yes — route 1 works.** `NSPersistentCloudKitContainer.eventChangedNotification` is delivered to an observer registered with `object: nil`, and the notification's `object` is the `NSPersistentCloudKitContainer` that SwiftData built — the reference SwiftData never yields through its own API. Capturing it makes the full, documented Core Data event surface reachable, including the after-the-fact event request.

Measured, not read: **Xcode 27.0 (build 27A5237l)**, iOS 26.0 simulator target (iPhone 17, iOS 26.5 runtime), Swift 6 language mode, on 2026-08-16. Every claim below is an observation from a run; where a question could not be reached, it is listed as an open gap rather than inferred.

**Some sections are documentation, not measurement, and say so in place:** the `endDate != nil` rule is corroborated from Apple's WWDC22 session and sample code, the delivery-queue question is answered from the iOS 27 SDK, and the "no sync-complete signal" section rests on two Apple staff forum answers. They were added on 2026-08-17 after the entitlement ceiling below proved the remaining questions unmeasurable on this machine. Everything else is a run.

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

**This rule is Apple's own, not an inference from our one run.** Established after the fact from primary sources, which matters because the rule was originally derived from a single in-flight `.setup` event:

- WWDC22 session 10119, "Optimize your use of Core Data and CloudKit", verbatim: *"In the notification handler block, I verify that the incoming event is of the correct type for the specific store this expectation is for, and that it's finished by checking `endDate` is not equal to `nil`."*
- Apple's sample `SynchronizingALocalStoreToTheCloud` (`CoreDataCloudKitDemoUnitTests/Test Cases/TestLargeDataGenerator.swift`) filters on `(event.type == eventType) && (event.storeIdentifier == store.identifier) && (event.endDate != nil)`.

Apple's predicate is three-part, and the two clauses beyond `endDate` are load-bearing for the same reason: **the notification fires for event types you did not ask for, and for every store**. A handler must match on `type` and `storeIdentifier` as well, or it will act on an unrelated operation. That the `endDate != nil` clause exists in Apple's own test code is independent proof that the notification is posted for events that have not finished — the start/end pair we observed is the designed behaviour, not an artefact of the aborted run.

### The notification is posted from a background serial queue

Gap 4 below is closed by Apple documentation rather than by measurement. The iOS 27 message-based restatement of the same notification, `NSPersistentCloudKitContainer.EventChangedMessage`, is documented as *"Posted when a CloudKit event occurs on the CloudKit private serial queue."* Its declaration in the shipped SDK (`iPhoneOS27.0.sdk/…/CoreData.swiftmodule/arm64e-apple-ios.swiftinterface`) reads:

```swift
@available(macOS 27.0, iOS 27.0, tvOS 27.0, watchOS 27.0, visionOS 27.0, *)
extension NSPersistentCloudKitContainer {
  public struct EventChangedMessage: NotificationCenter.AsyncMessage {
    public typealias Subject = NSPersistentCloudKitContainer
    public let event: NSPersistentCloudKitContainer.Event
  }
}
```

Two things follow. First, **`Subject = NSPersistentCloudKitContainer` is a type-level confirmation of the route-1 result above** — Apple's own model of this notification is that its subject *is* the container, which is why `note.object` yields one. Second, the handler runs off the main actor, so a sync-health indicator must hop to `@MainActor` before touching UI or observable state. Events are serialised on one queue, so concurrent delivery is not a concern, but main-thread delivery must not be assumed.

`EventChangedMessage` is iOS 27+ and beta; the `NSNotification`-based channel this spike measured remains the one to build on for an iOS 26 deployment target.

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
3. **Whether one logical initial sync emits one `.import` event or many** — #713 item 5. One `.setup` event was seen; no `.import` ever ran, so this is **not measured here**, and Apple never states a count. But the question turns out to be the wrong one to ask, and two Apple staff answers say why — see below.
4. ~~**Whether the notification is posted on a background queue**~~ — **closed from documentation**, see above: the CloudKit private serial queue. Serial, so not concurrent; not the main thread, so a `@MainActor` hop is required.

**Where these answers came from.** Items 1–2 remain blocked on a provisioning profile. Item 3 was pursued as a documentation question after the entitlement ceiling made it unmeasurable. Item 4 is answered outright. The searches behind items 3–4 were exhaustive of Apple's public surface: reference docs carry abstracts only, with **zero** Discussion prose on any event symbol, so the substantive material exists solely in session transcripts, sample code, forum answers and the SDK headers.

### There is no "sync is complete" signal, and an `.import` event is not one

The interesting part of item 3 is not the count. Two Apple staff answers, both Accepted, define what a single `.import` event does and does not mean — and together they close off the state a sync-health indicator would most want to show.

**What a successful `.import` does mean** — Frameworks Engineer (Apple Staff), [thread 744709](https://developer.apple.com/forums/thread/744709), "CloudKit Sync Complete Event/Notification", Jan '24:

> When you get a successful `.import` event your device is "current" with whats in iCloud. You can then use a fetch request to identify / check for interesting data.
>
> Note that "current" here is caught-up-to the iCloud server, it doesn't imply anything about the state of other devices.

**What it does not mean** — DTS Engineer (Apple Staff), [thread 763876](https://developer.apple.com/forums/thread/763876), "SwiftData & CloudKit: getting info about current updates", Sep '24:

> Note that `eventChangedNotification` tells you the state of an individual `export` or `import` event, and not that the whole Core Data store is synchronized with the CloudKit server (or not), because there may have new changes happening on the CloudKit server while the event is being handled.

Read together: a terminal `.import` is a statement about **one operation, one store, and one moment** — the device was caught up to the server as of that event. It is not a statement about the store as a whole, nor about other devices, and it can be stale the instant it arrives. That the DTS answer is specifically about **SwiftData** matters here, since it is the same configuration this spike measured.

So the count is moot: even if a first import were exactly one event, that event still would not mean "synced". **The spec must not offer a "fully synced" or "first sync done" state** — no documented API can report it. What is honestly derivable is narrower and still useful: *last successful import finished at T*, *an operation is in flight*, and *the last operation failed with E*. #687's indicator should be scoped to those three.

Corroborating the "many" reading, without settling a number: TN3163 describes imports as separately-throttled *activities* with distinct database-level, per-zone and push-triggered variants, which implies several per logical catch-up — but it never mentions the Event API, so mapping mirroring requests onto `Event.identifier` would be inference. WWDC statements bracket the same way: a private-database import is *"a single request against the CloudKit server, which brings down all of the changed records"* (WWDC20 session 10650), yet WWDC22 10119 shows a first-time import as something you *"watch the table view populate"* through, with attachments arriving *"incrementally"*.

**One citation to avoid.** The widely-quoted line that the container *"sends a notification when an event starts, and another when it ends"* ([thread 701564](https://developer.apple.com/forums/thread/701564)) is a **non-Apple developer's code comment**, not an Apple statement — it is easily mistaken for one in search results. The start/end pair is real, but the support for it is Apple's own sample code and this spike's run, cited above; not that thread.

Also worth noting for error handling: per TN3163, **persisted** events are lossy — they *"will only include the domain / code of the original error"*. An error inspected later via `fetchEvents(after:)` carries less than the same error seen live in the notification, which argues for capturing error detail at notification time rather than relying on the historical channel.

**The ceiling is the signing identity, not the Simulator.** Worth stating plainly, because "CloudKit doesn't work in the Simulator" is a common belief and it is false — it would otherwise look as though gaps 1–2 could never be closed without a physical device. Verified on this machine, against the booted iOS 26.5 runtime:

- `xcrun simctl icloud_sync <device>` is a shipping subcommand ("Trigger iCloud sync on a device").
- The full iCloud daemon stack is running in the simulator: `com.apple.cloudd`, `bird`, `akd`, `accountsd`, `apsd`.
- The runtime root ships the sign-in UI and prefs panes — `AppleIDSetupUIService.app`, `iCloud.app`, `PreferenceBundles/iCloudPreferences.bundle`, `AccountSettings/{AppleAccountSettings,CloudKitSettings}.bundle` — and `CloudKit.framework` itself.
- `cloudd` and `CloudKit.framework` contain **no simulator gating** for account or sync paths. What simulator-specific degradations exist are narrow and unrelated: *"secureDeviceId not available on simulator"*, *"Piggybacking is not supported on Simulator"* (AuthKit), *"Not marking %@ as purgeable (not supported on simulator)"* (CloudKit).
- A sibling probe measured `CKAccountStatus == .noAccount` **with no error** — CloudKit initialises correctly and is merely waiting for a sign-in.

Apple's own release notes confirm signing in is a supported flow: the Xcode 11 notes carry a known issue scoped to iOS ≤13 runtimes on Catalina (*"Logging into iCloud on impacted simulators will result in `bird` terminating and relaunching in a cycle"*, workaround *"Log out of iCloud in impacted simulators"*) — a version-scoped bug, not a blanket absence.

**Apple's documentation contradicts itself on push, and the stale side is the one people quote.** Simulator Help's "Test iCloud" page still says *"Synchronization must be triggered manually as Simulator does not support Push notifications"* — while, in the same breath, instructing you to *"Sign in to iCloud on the simulated device"* and use Debug > Trigger iCloud Sync. So even the page cited as evidence against Simulator CloudKit tells you to sign in and sync; iCloud was never the unsupported part. That page is Xcode-11-era — its companion "Differences" page still calls Metal "provided only as stubs", long since false.

The Xcode 14 release notes reverse the push limitation outright: *"Simulator now supports remote notifications in iOS 16 when running in macOS 13 on Mac computers with Apple silicon or T2 processors. Simulator supports the Apple Push Notification Service Sandbox environment."* Apple never updated the help pages to match, and no WWDC session announced it — the release note is the only announcement, so the contradiction stands unreconciled on Apple's side. Practical consequence for a two-device sync probe: push-driven sync should work on this hardware, but if a change does not arrive, reach for `xcrun simctl icloud_sync` before concluding CloudKit is broken. Two simulators must be booted separately and signed into the same test Apple ID, and Apple "strongly encourage[s]" a throwaway ID for this.

So the path to closing gaps 1–2 is: mint a signing identity, sign with a real profile, sign in to iCloud inside the simulator. No hardware needed. At the time of writing no account is signed in on either booted device (`Accounts3.sqlite` holds only `local` rows).

**Retrieval note for whoever picks this up:** `developer.apple.com` HTML is bot-walled to `curl` (it returns a "Security Verification" page), but the DocC JSON API is not — fetch `https://developer.apple.com/tutorials/data/documentation/<path>.json`. There is no standalone Simulator release-notes document; Simulator notes live under a `Simulator` heading inside each Xcode release note. `help.apple.com` serves normally to a browser UA.

**Neither the fallback nor route 3 is triggered.** #687's "no indicator, plus a spec note that sync health is undetectable" is not needed: sync health *is* observable — though only in the narrower sense established above, as per-operation outcomes rather than a whole-store "synced" state. And route 3 (Core Data instead of SwiftData) never comes into play, so nothing goes back to the owner.

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
