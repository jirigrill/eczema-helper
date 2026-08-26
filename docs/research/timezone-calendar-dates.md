# Time zones, calendar dates, and instants — Apple-sourced findings

Research note for the eczema-helper → iOS port behavior spec (map issue
[#672](https://github.com/jirigrill/eczema-helper/issues/672)), written for
[#728](https://github.com/jirigrill/eczema-helper/issues/728) — *what date does a record show
under, once the phone has changed time zone?* — and landed as a document by
[#741](https://github.com/jirigrill/eczema-helper/issues/741).

**This note records findings only. It decides nothing.** `DAY-NAV-9` in `docs/spec/day-view.md` is
`OPEN`, and picking a policy is
[#728](https://github.com/jirigrill/eczema-helper/issues/728)'s job, judged against the prototype
handed over in [#742](https://github.com/jirigrill/eczema-helper/issues/742). Nothing below should
be read as a recommendation, including the sections that describe what other Apple frameworks chose.

## Overview

**Apple ships no zone-aware date type at any layer of this stack.** Foundation's `Date` is
documented as "a specific point in time, independent of any calendar or time zone"; Core Data has
exactly one date attribute type and it is not zone-aware; `CKRecord` has eight value types of which
`NSDate` is the only temporal one; the CloudKit wire form is epoch-milliseconds. So a wall-clock
calendar date — "the 5th of March", the thing a diary entry is actually filed under — **cannot be
stored as a `Date`**. It is a *rendering* of an instant through a `Calendar` and a `TimeZone`,
computed at read time. If it must survive travel, it has to be an explicit second field (§4).

Apple's own frameworks solve this by putting the zone *beside* the instant rather than inside it.
HealthKit has shipped `HKMetadataKeyTimeZone` since iOS 8 — an IANA zone **name**, in side-channel
metadata, with an explicit recommendation to store it for sleep analysis — and EventKit's
`EKCalendarItem.timeZone` is optional, where `nil` means a floating event (§4.9, §5.2). But those
are precedents, not prescriptions: **Apple nowhere states, as a general rule, that you should store
a `Date` plus a zone identifier** (gap 14), and **Apple gives no guidance at all on whether to
recompute or to fix an already-stored date when the user travels** (gap 15). That second gap is the
ticket's actual question, and it is ours to decide.

The mechanics of reading the current zone are counter-intuitive in one specific way.
`TimeZone.current` **is cached** and does not re-resolve on its own — the Swift documentation never
says so, but the property reads the same memoized slot ObjC documents as cached, and clearing it
requires `NSTimeZone.resetSystemTimeZone()`, which has no Swift entry point. More surprising:
**`TimeZone.autoupdatingCurrent` is not independently live** — it forwards to that same cached slot,
and appears fresh only because the system's zone-change notification invalidates it. The meaningful
distinction is between a *held* value and a *re-read* one, not between the two property names.
`Calendar.current` is documented not to track preference changes at all, and the ObjC header names
the consequence that bites: anything you *derived* from a calendar — a cached "start of today", a
day-grouping key — is stale the moment the zone changes (§2).

Three notifications are adjacent to this and only one is documented for a zone change:
`NSSystemTimeZoneDidChange`. `significantTimeChange` documents DST and midnight but **not** zone
change; `NSCalendarDayChanged` is indirect. **No ordering guarantee among them exists in any Apple
source**, so a handler must be idempotent and must re-read the zone rather than infer state from
which notification arrived first (§1). None of the three carries the **previous** zone — the
plumbing exists internally (swift-foundation's reset returns the old zone) but the public API
discards it, so an app that needs the previous zone must persist it itself (§7).

DST is the cheap local rehearsal of the same bug on a different channel: **a day is not always 24
hours** (measured: 25 h and 23 h in `Europe/Prague`, and 23.5 h in `Australia/Lord_Howe` — DST
offsets are not always whole hours). `Calendar.startOfDay(for:)` is documented safe across both
pathological branches — "if there were two midnights, it returns the first; if there was none, it
returns the first moment that did exist" — and both were confirmed by measurement (§6).

For driving a zone in a spike: **`simctl` has no time-zone facility on Xcode 27** — not merely
undocumented, absent, verified against the full subcommand list and a `strings` sweep of
CoreSimulator. The working lever is the `TZ` environment variable via `SIMCTL_CHILD_TZ`, which moves
every Foundation accessor consistently — but it is read once at first resolution, so it sets the
zone a process *starts* in and **cannot simulate a zone change mid-run** (§3).

The one gap that most matters for an end-to-end test is `UNVERIFIED`: whether changing the host
macOS zone delivers a live `NSSystemTimeZoneDidChange` into a running simulator process. Confirm it
manually before writing any spec rule that depends on the notification actually arriving (gap 27).

---

## Method and source provenance

**Standing rule for this document: cite or don't claim.** Every factual claim below carries a URL, an SDK header path, or a source-file path. Claims established by running code on this machine are labelled **MEASURED** and are explicitly *not* Apple contracts. Anything unsourced is in the Gaps section.

**Environment for all measurements:** Xcode 27.0 (build `27A5237l`), iOS 26.5 simulator (`iPhone 17 Pro`, runtime `23F77`), host zone `Europe/Prague`. Doc pages were fetched from Apple's DocC JSON API (`https://developer.apple.com/tutorials/data/documentation/<path>.json`) because the HTML pages are JS-rendered; the JSON is the same content the rendered page shows. SDK header quotes are from `iPhoneSimulator27.0.sdk`. swift-foundation quotes are at commit `767ff1c2e3a55385f44ccf28a83f21f3571cf3ea` (2026-08-21).

**Sources deliberately not used:** Apple developer forums. Per the map's standing rule, no forum
content was fetched or paraphrased, so **no claim in this document rests on a forum post** —
including any DTS answer (gap 30).

**Reproduction.** The measurement probes are Swift binaries built for the simulator and run via
`simctl spawn`; the commands are in the Appendix. The spike they were written alongside lives
outside this repo at `~/Developer/eczema-ios-spikes/timezone-728/` and is handed over by
[#742](https://github.com/jirigrill/eczema-helper/issues/742), which is where its fixture and
computed numbers are recorded.

---

## 1. Notifications on time-zone change

### 1.1 The three notifications, side by side

| | `NSSystemTimeZoneDidChange` | `UIApplication.significantTimeChangeNotification` | `NSCalendarDayChanged` |
|---|---|---|---|
| ObjC name | `NSSystemTimeZoneDidChangeNotification` | `UIApplicationSignificantTimeChangeNotification` | `NSCalendarDayChangedNotification` |
| Documented trigger | "when the time zone changes" | midnight, carrier time update, DST change | calendar day of the system changes |
| Zone change? | **Yes — this is the only one documented for it** | **Not documented** | Indirectly (day is defined relative to the current time zone) |
| DST? | Not documented | **Yes, documented** | Indirectly |
| Midnight? | No | **Yes, documented** | **Yes** |
| Framework | Foundation, iOS 2.0+ | UIKit | Foundation, iOS 8.0+ |
| `userInfo` | undocumented | documented **absent** | undocumented |

### 1.2 `NSSystemTimeZoneDidChangeNotification` — the zone-change signal

This is the **only** one of the three that Apple documents as firing on a time-zone change. Its entire documented description is one sentence.

Docs — https://developer.apple.com/documentation/foundation/nsnotification/name-swift.struct/nssystemtimezonedidchange, abstract in full:

> "A notification posted when the time zone changes."

There is no Discussion section on that page — the abstract is the whole documentation.

SDK header, `iPhoneSimulator27.0.sdk/System/Library/Frameworks/Foundation.framework/Headers/NSTimeZone.h:218-219`:

```objc
/// A notification posted when the time zone changes.
FOUNDATION_EXPORT NSNotificationName const NSSystemTimeZoneDidChangeNotification API_AVAILABLE(macos(10.5), ios(2.0), watchos(2.0), tvos(9.0));
```

The load-bearing cross-reference is on the `NSTimeZone.local` page, which tells you that this notification is *the* way to learn about zone changes — https://developer.apple.com/documentation/foundation/nstimezone/local:

> "Although the time zone obtained here automatically updates with the system, it provides no indication when system settings change. To receive notification of time zone changes, add an observer to the `NSSystemTimeZoneDidChange` notification by using the `addObserver(_:selector:name:object:)`."

Underneath, it is a CoreFoundation notification. `CoreFoundation.framework/Headers/CFTimeZone.h:91-92`:

```objc
CF_EXPORT
const CFNotificationName kCFTimeZoneSystemTimeZoneDidChangeNotification API_AVAILABLE(macos(10.5), ios(2.0), watchos(2.0), tvos(9.0));
```

And the Swift name is literally defined as that CF constant — `swift-corelibs-foundation/Sources/Foundation/NSTimeZone.swift:212-214`:

```swift
extension NSNotification.Name {
    public static let NSSystemTimeZoneDidChange = NSNotification.Name(rawValue: kCFTimeZoneSystemTimeZoneDidChangeNotification._swiftObject)
}
```

**Main-thread delivery: `NOT FOUND`.** Neither the doc page nor the header says anything about which thread or queue this is delivered on. Do not assume the main thread — observe with an explicit queue if it matters.

### 1.3 `UIApplicationSignificantTimeChangeNotification` — does *not* mention time zone

This is the trap. Every documented trigger is a clock event; **a time-zone change is not among them.**

Docs — https://developer.apple.com/documentation/uikit/uiapplication/significanttimechangenotification:

> Abstract: "A notification that posts when there's a significant change in time."
>
> Discussion: "The system posts this notification when, for example, there's a change to a new day (midnight), a carrier time update, or a change to, or from, daylight savings time. The notification doesn't contain a user info dictionary."

Two things to extract. First, the trigger list is **midnight / carrier time update / DST** — no zone change. Second, `userInfo` is documented as **absent**, so this notification definitively cannot carry a previous zone.

Note the list is prefixed "for example", so it is not stated to be exhaustive — but a zone change is nowhere asserted to be included either. Treat "does a bare zone change post this?" as `UNVERIFIED` (see Gaps).

The UIKit header comment is the same list, and is the tersest citation — `UIKit.framework/Headers/UIApplication.h:410`:

```objc
- (void)applicationSignificantTimeChange:(UIApplication *)application;        // midnight, carrier time update, daylight savings time change
```

The delegate method page adds the queueing/coalescing rule — https://developer.apple.com/documentation/uikit/uiapplicationdelegate/applicationsignificanttimechange(_:):

> "Examples of significant time changes include the arrival of midnight, an update of the time by a carrier, and the change to daylight savings time. The delegate can implement this method to adjust any object of the app that displays time or is sensitive to time changes."
>
> "Prior to calling this method, the app also posts a `significantTimeChangeNotification` notification to give interested objects a chance to respond to the change."
>
> "If your app is currently suspended, this message is queued until your app returns to the foreground, at which point it is delivered. **If multiple time changes occur, only the most recent one is delivered.**" (emphasis added)

That last sentence is the **only documented coalescing rule** across all three notifications, and the sentence before it is the **only documented ordering rule**: notification first, then the delegate method.

**Ordering caveat — the docs and the header contradict each other.** The doc page above says the notification is posted *prior to* the delegate call. But `UIApplication.h:569`, the comment governing the block of notification constants that includes `UIApplicationSignificantTimeChangeNotification` (line 577), says the opposite:

```objc
// These notifications are sent out after the equivalent delegate message is called
```

Do not depend on the relative order of the notification and the delegate callback. Pick one mechanism.

### 1.4 `NSCalendarDayChangedNotification`

Docs — https://developer.apple.com/documentation/foundation/nsnotification/name-swift.struct/nscalendardaychanged:

> Abstract: "A notification that is posted whenever the calendar day of the system changes, as determined by the system calendar, locale, and time zone."
>
> "If the the device is asleep when the day changes, this notification will be posted on wakeup. Only one notification will be posted on wakeup if the device has been asleep for multiple days."
>
> "There are no guarantees about the timeliness of when this notification will be received by observers. As such, you should not rely on this notification being posted or received at any precise time."

The abstract matters for this ticket: the day is defined **"as determined by the system calendar, locale, and time zone"** — so the definition of "which day it is" is itself zone-dependent.

The SDK header carries a longer, franker comment — `Foundation.framework/Headers/NSCalendar.h:671-685`:

```objc
// This notification is posted through [NSNotificationCenter defaultCenter]
// when the system day changes. Register with "nil" as the object of this
// notification. If the computer/device is asleep when the day changed,
// this will be posted on wakeup. You'll get just one of these if the
// machine has been asleep for several days. The definition of "Day" is
// relative to the current calendar (NSCalendar.currentCalendar) of the
// process and its locale and time zone. There are no guarantees that this
// notification is received by observers in a "timely" manner, same as
// with distributed notifications.

/// A notification posted whenever the calendar day of the system changes, as determined by the system calendar, locale, and time zone.
///
/// If the device is asleep when the day changes, this notification will be posted on wakeup. Only one notification will be posted on wakeup if the device has been asleep for multiple days.  There are no guarantees about the timeliness of when this notification will be received by observers.
FOUNDATION_EXPORT NSNotificationName const NSCalendarDayChangedNotification API_AVAILABLE(macos(10.9), ios(8.0), watchos(2.0), tvos(9.0));
```

Three facts only available in the header:
- **`object` is documented, sort of**: "Register with `nil` as the object of this notification." That instructs the observer side; it does not state what the poster passes.
- **Coalescing across multiple days is documented** — one notification on wake even after several days asleep.
- **It is explicitly likened to a distributed notification** for timeliness, i.e. best-effort. This is the reason not to hang correctness on it.

Critically, "Day" is defined against **`NSCalendar.currentCalendar`** — and `Calendar.current` is documented *not* to track preference changes (§2.4). So the notion of day used by this notification is tied to a calendar object whose freshness is itself a question.

### 1.5 Ordering and coalescing — summary

| Guarantee | Status |
|---|---|
| `significantTimeChange` notification before its delegate method | Documented, **but contradicted by the SDK header** (§1.3) |
| Multiple significant time changes while suspended → only most recent delivered | **Documented** (delegate page) |
| Multiple day changes while asleep → one `NSCalendarDayChanged` | **Documented** (header + docs) |
| Ordering *between* `NSSystemTimeZoneDidChange`, `significantTimeChange`, `NSCalendarDayChanged` | **`NOT FOUND`** — no Apple source states any |
| Coalescing of `NSSystemTimeZoneDidChange` | **`NOT FOUND`** |

Design consequence: because no inter-notification ordering is documented, a handler must be **idempotent** and must re-read the zone rather than infer state from which notification arrived first.

---
## 2. The cached zone

This is the single most consequential area for the ticket, and the documented behaviour is counter-intuitive: **`TimeZone.current` does not automatically re-resolve, and neither does `TimeZone.autoupdatingCurrent` in the way its name suggests.**

### 2.1 `NSTimeZone.system` is cached until you clear it — documented

https://developer.apple.com/documentation/foundation/nstimezone/system:

> "If the current system time zone cannot be determined, the GMT time zone is used instead."
>
> "If you access the `system` class property, its value is cached by the app and doesn't update if the user subsequently changes the system time zone. In order for the `system` property to reflect the new time zone, you must first call the `resetSystemTimeZone()` method to clear the cached value. Then, the next time you access the `system` property, it returns the current system time zone, and caches that value."
>
> "If you access the `system` class property, assign its value to a variable, and clear the cached value for the property by calling the `resetSystemTimeZone()` method, the object stored in the variable doesn't update to reflect the new system time zone. Contrast this behavior with that of the `local` class property, which returns a proxy object that always reflects the current system time zone."

The class-level overview says the same and is the crispest single quote — `Foundation.framework/Headers/NSTimeZone.h:24`:

> "You typically work with system time zones rather than creating time zones by identifier or by offset. The `system` class property returns the time zone currently used by the system, if known. **This value is cached once the property is accessed and doesn't reflect any system time zone changes until you call the `resetSystemTimeZone()` method.** The `local` class property returns an autoupdating proxy object that always returns the current time zone used by the system. You can also set the `default` class property to make your app run as if it were in a different time zone than the system."

Also from that header, `NSTimeZone.h:26-27`, worth recording because it bounds what a spike can do:

> "> Tip:
> > You can't use `NSTimeZone` APIs to change the time zone of the device or of other apps."

### 2.2 `NSTimeZone.local` is a live proxy — documented

https://developer.apple.com/documentation/foundation/nstimezone/local:

> Abstract: "An object that tracks the current system time zone."
>
> "Use this property when you want an object that always reflects the current system time zone. Contrast this behavior with that of the `system` class property, which has its value cached until you manually clear it by calling the `resetSystemTimeZone()` method."
>
> Important aside: "In macOS High Sierra and later, iOS 11 and later, tvOS 11 and later, and watchOS 4 and later, the `local` class property reflects the current system time zone, whereas previously it reflected the `default` time zone."

Header equivalent, `NSTimeZone.h:97-100`:

```objc
/// An object that tracks the current system time zone.
///
/// Use this property when you want an object that always reflects the current system time zone. Contrast this behavior with that of the `systemTimeZone` class property, which has its value cached until you manually clear it by calling ``resetSystemTimeZone``.
@property (class, readonly, copy) NSTimeZone *localTimeZone;
```

### 2.3 `resetSystemTimeZone()` — documented text, and two undocumented facts

https://developer.apple.com/documentation/foundation/nstimezone/resetsystemtimezone():

> Abstract: "Clears any time zone value cached for the `system` property."
>
> "If the app has cached the system time zone by accessing the `system` class property, this method clears that cached value. If you subsequently access the `system` class property, a new time zone object is created and cached."

Header, `NSTimeZone.h:85-88`:

```objc
/// Clears any time zone value cached for the `systemTimeZone` property.
///
/// If the app has cached the system time zone by accessing the `systemTimeZone` class property, this method clears that cached value. If you subsequently access `systemTimeZone`, a new time zone object is created and cached.
+ (void)resetSystemTimeZone;
```

**Undocumented fact 1 — there is no `TimeZone.resetSystemTimeZone()` in Swift.** The reset is reachable only through `NSTimeZone`. **MEASURED** — compiling `TimeZone.resetSystemTimeZone()` for `arm64-apple-ios26.0-simulator` fails:

```
error: type 'TimeZone' has no member 'resetSystemTimeZone'
```

In swift-foundation the Swift-level entry point is deliberately not public — `Sources/FoundationEssentials/TimeZone/TimeZone.swift:420`:

```swift
    internal static func resetSystemTimeZone() -> TimeZone? {
```

So iOS code must call `NSTimeZone.resetSystemTimeZone()`.

**Undocumented fact 2 — the reset clears the Locale and Calendar caches too.** `TimeZone.swift:420-425`:

```swift
    internal static func resetSystemTimeZone() -> TimeZone? {
        let oldTimeZone = TimeZoneCache.cache.reset()
        // Also reset the calendar cache, since the current calendar uses the current time zone
        LocaleNotifications.cache.reset()
        return oldTimeZone
    }
```

and `Sources/FoundationEssentials/Locale/Locale_Notifications.swift:27-32`:

```swift
    /// Make a new generation current, but no associated Locale.
    func reset() {
        LocaleCache.cache.reset()
        CalendarCache.cache.reset()
        _ = TimeZoneCache.cache.reset()
        _count.add(1, ordering: .relaxed)
    }
```

Note also that the internal API **returns the old zone** (`-> TimeZone?`) — the plumbing for a previous-zone value exists but is not surfaced (see §7).

**MEASURED: `resetSystemTimeZone()` does not itself post `NSSystemTimeZoneDidChange`.** Observing the notification, then changing `TZ` and calling reset, yields `notifs=0` while `TimeZone.current` does flip. So the reset is a cache operation, not an event. Do not expect your own reset to re-enter your observer.
### 2.4 Swift `TimeZone.current` / `autoupdatingCurrent` — thin docs, and a surprise

The Swift docs are far thinner than the ObjC ones, and this matters: **Apple does not document `TimeZone.current` as cached.**

https://developer.apple.com/documentation/foundation/timezone/current — abstract only, no Discussion:

> "The time zone currently used by the system."

https://developer.apple.com/documentation/foundation/timezone/autoupdatingcurrent:

> Abstract: "The time zone currently used by the system, automatically updating to the user's current preference."
>
> "If this time zone is mutated, then it no longer tracks the system time zone."
>
> "The autoupdating time zone only compares equal to itself."

Source shows they are the same cache slot. `TimeZone.swift:118-130`:

```swift
    /// The time zone currently used by the system.
    public static var current: TimeZone {
        TimeZone(inner: TimeZoneCache.cache.current._tz)
    }

    /// The time zone currently used by the system, automatically updating to the user's current preference.
    ///
    /// If this time zone is mutated, then it no longer tracks the system time zone.
    ///
    /// The autoupdating time zone only compares equal to itself.
    public static var autoupdatingCurrent: TimeZone {
        TimeZone(inner: TimeZoneCache.cache.autoupdatingCurrent)
    }
```

`TimeZoneCache.State.current()` is a memoizing getter — `TimeZone_Cache.swift:196-204`:

```swift
        mutating func current() -> TimeZone {
            if let currentTimeZone {
                return currentTimeZone
            } else {
                let newCurrent = findCurrentTimeZone()
                currentTimeZone = newCurrent
                return newCurrent
            }
        }
```

The comment on the stored property confirms this slot **is** ObjC's `systemTimeZone` — `TimeZone_Cache.swift:70-71`:

```swift
        // a.k.a. `systemTimeZone`
        private var currentTimeZone: TimeZone?
```

So the ObjC "cached until reset" contract (§2.1) governs Swift `TimeZone.current`, even though the Swift page never says so.

**The autoupdating proxy reads through the same cache** — `Sources/FoundationEssentials/TimeZone/TimeZone_Autoupdating.swift:13-30`:

```swift
/// A time zone which always reflects what the currently set time zone is. Aka `local` in Objective-C.
internal final class _TimeZoneAutoupdating : _TimeZoneProtocol, Sendable {
    ...
    var identifier: String {
        TimeZoneCache.cache.current.identifier
    }
    
    func secondsFromGMT(for date: Date = Date()) -> Int {
        TimeZoneCache.cache.current.secondsFromGMT(for: date)
    }
```

This is the surprise, and it is the key mechanical fact for the ticket: **`autoupdatingCurrent` is not independently live.** It forwards to `TimeZoneCache.cache.current`, the same memoized slot. It appears fresh only because the cache is invalidated when the system posts the zone-change notification — the cache registers for exactly that (`TimeZone_Cache.swift:67-69`):

```swift
            // On Darwin we listen for certain distributed notifications to reset the current TimeZone.
            _CFNotificationCenterInitializeDependentNotificationIfNecessary(CFNotificationName.cfTimeZoneSystemTimeZoneDidChange!.rawValue)
```

**MEASURED corroboration.** In a simulator process, changing `TZ` via `setenv` and *not* calling reset leaves **both** stale; only the explicit reset moves them:

```
[before]                          current=Europe/Prague     auto=Europe/Prague
[after setenv TZ=Pacific/Auckland, no reset]
                                  current=Europe/Prague     auto=Europe/Prague
[after setenv + resetSystemTimeZone]
                                  current=Pacific/Auckland  auto=Pacific/Auckland
```

Caveat: `setenv` is not the Settings-app path and does not post the system notification, which is precisely why nothing invalidated the cache. This measurement demonstrates the *caching*, not the behaviour of a real zone change. On a real device the notification fires and the cache is reset for you.

### 2.5 Does `Calendar.current` pick up a zone change?

**Documented: no, it does not track preference changes.**

https://developer.apple.com/documentation/foundation/calendar/current:

> Abstract: "The user's current calendar."
>
> "This calendar does not track changes that the user makes to their preferences."

https://developer.apple.com/documentation/foundation/calendar/autoupdatingcurrent:

> Abstract: "A calendar that tracks changes to user's preferred calendar."
>
> "If mutated, this calendar will no longer track the user's preferred calendar."
>
> Note: "The autoupdating Calendar will only compare equal to another autoupdating Calendar."

The **ObjC header is the better citation**, because it names the consequence that actually bites. `Foundation.framework/Headers/NSCalendar.h`:

> "/// A calendar that tracks changes to user's preferred calendar.
> /// Settings you get from this calendar do change as the user's settings change. **Note that if you cache values based on the calendar or related information those caches will of course not be automatically updated by the updating of the calendar object.**"

That is the rule to design against: the calendar object may update, but **anything you derived from it does not**. A cached "start of today" `Date`, or a cached day-grouping key, is stale the moment the zone changes.

Source, `Sources/FoundationEssentials/Calendar/Calendar.swift:448-462`:

```swift
    /// The user's current calendar.
    ///
    /// This calendar does not track changes that the user makes to their preferences.
    public static var current : Calendar {
        Calendar(inner: CalendarCache.cache.current)
    }

    /// A calendar that tracks changes to user's preferred calendar.
    ///
    /// If mutated, this calendar will no longer track the user's preferred calendar.
    ///
    /// - note: The autoupdating Calendar will only compare equal to another autoupdating Calendar.
    public static var autoupdatingCurrent : Calendar {
        Calendar(inner: CalendarCache.autoupdatingCurrent)
    }
```

`_CalendarAutoupdating` forwards per-access exactly as the TimeZone proxy does — `Calendar_Autoupdating.swift:37-44`:

```swift
    var timeZone: TimeZone {
        get {
            CalendarCache.cache.current.timeZone
        }
        set {
            fatalError("Copy the autoupdating calendar before setting values")
        }
    }
```

Note the setter: **mutating an autoupdating calendar traps.** You must copy before configuring.

A calendar constructed without an explicit zone resolves against `TimeZone.default`, not `.current` — `Sources/FoundationEssentials/Calendar/Calendar_Gregorian.swift:213`:

```swift
        self.timeZone = timeZone ?? .default
```

and `Sources/FoundationInternationalization/Calendar/Calendar_ICU.swift:69`:

```swift
        _timeZone = timeZone ?? TimeZone.default
```

`default` falls back to `current` unless explicitly set — `TimeZone_Cache.swift:206-212`:

```swift
        mutating func `default`() -> TimeZone {
            if let manuallySetDefault = defaultTimeZone {
                return manuallySetDefault
            } else {
                return current()
            }
        }
```

### 2.6 `NSTimeZone.default` as an in-app override

`NSTimeZone.h:90-95` documents it:

> "/// The default time zone for the current app.
> ///
> /// If no default time zone has been set, the current system time zone is used. If the current system time zone cannot be determined, the GMT time zone is used instead."

Setting it invalidates the derived caches — `TimeZone_Cache.swift:438-443`:

```swift
    func setDefault(_ tz: TimeZone?) {
        lock.withLock { $0.setDefaultTimeZone(tz) }

        // Reset any 'current' locales, calendars, time zones
        LocaleNotifications.cache.reset()
    }
```

**MEASURED — and the split is important for spike design.** Setting `NSTimeZone.default = America/Los_Angeles` moves the *Calendar* but not `TimeZone.current`/`system`:

```
[before]                       current=Europe/Prague  cal.current=Europe/Prague       system=Europe/Prague  default=Europe/Prague
[after NSTimeZone.default=LA]  current=Europe/Prague  cal.current=America/Los_Angeles system=Europe/Prague  default=America/Los_Angeles
```

Consistent with §2.5: `Calendar` resolves through `.default`, whereas `TimeZone.current` reports the *system* zone. So `NSTimeZone.default` is a usable in-app override for **calendar arithmetic and formatting**, but code that reads `TimeZone.current` directly will ignore it. No notification is posted (`notifs=0`, MEASURED).

Note this is an in-process override only — per `NSTimeZone.h:27`, "You can't use `NSTimeZone` APIs to change the time zone of the device or of other apps."

---
## 3. Driving the time zone in a spike

Verified locally on Xcode 27.0 (`27A5237l`) against a booted iOS 26.5 simulator.

### 3.1 `simctl` has no time-zone subcommand — verified

**MEASURED.** The full subcommand list from `xcrun simctl help` on Xcode 27.0 is:

```
addmedia, appinfo, boot, clone, create, delete, diagnose, erase,
get_app_container, getenv, help, icloud_sync, install, install_app_data, io,
keychain, launch, list, listapps, location, logverbose, openurl, pair,
pair_activate, pbcopy, pbpaste, pbsync, personalization, privacy, push,
reboot, rename, runtime, shutdown, spawn, status_bar, terminate, ui,
uninstall, unpair, upgrade
```

There is **no `timezone`, no `set_timezone`, and no `--timezone` flag**. Filtering the help output for `time|zone|tz` matches only `list`, `runtime`, and `upgrade` — i.e. incidental substring hits, nothing time-zone related.

Checked individually, none of the plausible candidates supports it:
- `simctl ui <device>` supports exactly three options — `appearance`, `increase_contrast`, `content_size`. No zone.
- `simctl status_bar override` can fake the **displayed** clock via `--time <string>` ("Set the date or time to a fixed value. If the string is a valid ISO date string it will also set the date on relevant devices") but that is a status-bar cosmetic override, not the process time zone.
- `simctl spawn` / `simctl launch` have no zone flag.

Corroborating: `strings` over `/Library/Developer/PrivateFrameworks/CoreSimulator.framework/Versions/A/CoreSimulator` (5470 strings) contains **zero** case-insensitive matches for `timezone`. Same for the `Simulator.app` binary. So there is no hidden/undocumented CoreSimulator zone facility to reach for.

**Conclusion: `NOT FOUND` — there is no documented or undocumented `simctl` way to set a simulator's time zone on Xcode 27.**

### 3.2 The `TZ` environment variable — works, and is the practical lever

This is the one that works, and it works because Foundation reads `TZ` when resolving the current zone. Documented in source, `TimeZone_Cache.swift:112`:

```swift
        /// Reads from environment variables `TZFILE`, `TZ` and finally the symlink pointed at by the C macro `TZDEFAULT` to figure out what the current (aka "system") time zone is.
        mutating func findCurrentTimeZone() -> TimeZone {
#if !NO_TZFILE
            if let tzenv = ProcessInfo.processInfo.environment["TZFILE"], let result = fixed(tzenv) {
                return TimeZone(inner: result)
            }

            if let tz = ProcessInfo.processInfo.environment["TZ"] {
```

Note the precedence: **`TZFILE` first, then `TZ`, then the `TZDEFAULT` symlink** (`/etc/localtime`). `TZFILE` is a second, less-known lever.

**MEASURED.** `simctl` forwards host env vars prefixed `SIMCTL_CHILD_` into the launched process (documented in `simctl help launch`: "If you want to set environment variables in the resulting environment, set them in the calling environment with a SIMCTL_CHILD_ prefix."). A Swift binary built for `arm64-apple-ios26.0-simulator` and spawned on the device reports:

```
$ xcrun simctl spawn <UDID> /tmp/tzprobe
[start] TimeZone.current=Europe/Prague  auto=Europe/Prague  Calendar.current.tz=Europe/Prague
NSTimeZone.system=Europe/Prague  NSTimeZone.local=Europe/Prague

$ SIMCTL_CHILD_TZ="Asia/Tokyo" xcrun simctl spawn <UDID> /tmp/tzprobe
[start] TimeZone.current=Asia/Tokyo  auto=Asia/Tokyo  Calendar.current.tz=Asia/Tokyo
TZ env = Asia/Tokyo
NSTimeZone.system=Asia/Tokyo  NSTimeZone.local=Asia/Tokyo
```

So `TZ` moves **every** Foundation accessor consistently — `TimeZone.current`, `autoupdatingCurrent`, `Calendar.current.timeZone`, `NSTimeZone.system`, `NSTimeZone.local`. For Xcode-run apps the equivalent is a `TZ` entry in the scheme's *Run → Arguments → Environment Variables*.

**Important limitation — `TZ` is read once, at first resolution.** It sets the zone the process *starts* in; it cannot simulate a zone change *during* a run, because changing `TZ` mid-process does nothing until the cache is reset (§2.4), and resetting posts no notification (§2.3). **MEASURED:**

```
[before]                                      current=Europe/Prague
[after setenv TZ=Pacific/Auckland, no reset]  current=Europe/Prague      <- unchanged
[after setenv + NSTimeZone.resetSystemTimeZone()]
                                              current=Pacific/Auckland
notifications observed on .NSSystemTimeZoneDidChange = 0
```

So `TZ` + `resetSystemTimeZone()` gives you a *state* change but **not** the notification your production code listens for.

`NOT FOUND` — Apple documentation for `TZ` as a supported iOS-app knob. `TZ` is a POSIX/libc convention; the only Apple-adjacent statement I found is the swift-foundation source comment above. Treat it as a **test-harness affordance, not a contract.**

### 3.3 In-app override: `NSTimeZone.default`

Documented (§2.6) and the only *documented* Apple API for making an app "run as if it were in a different time zone" — `NSTimeZone.h:24`: "You can also set the `default` class property to make your app run as if it were in a different time zone than the system."

Caveat from §2.6 (MEASURED): it moves `Calendar.current.timeZone` but **not** `TimeZone.current`. Usable for a spike only if all app code routes zone lookups through an injected `Calendar`/zone rather than reading `TimeZone.current` directly — which is the testable design anyway.

### 3.4 Changing the real device/simulator zone through the UI

The simulator inherits the host's zone via the standard symlink. **MEASURED**, inside the simulator:

```
$ xcrun simctl spawn <UDID> /bin/ls -la /etc/localtime
lrwxr-xr-x  1 root  wheel  39 Jul  1 11:22 /etc/localtime -> /var/db/timezone/zoneinfo/Europe/Prague
```

which matches the host's `/etc/localtime -> /var/db/timezone/zoneinfo/Europe/Prague`. There is no per-device zone setting in `device.plist` (it contains only `runtime`/`runtimePolicy` and similar).

`UNVERIFIED` — whether changing the **host** macOS zone (System Settings, or `sudo systemsetup -settimezone`) propagates a live `NSSystemTimeZoneDidChange` into an already-running simulator process. I could not test it: `systemsetup -settimezone` requires interactive sudo, unavailable in this environment. This is the one gap that matters for an end-to-end notification test, and it should be confirmed manually before writing a spec rule that depends on the notification actually arriving.

For a real device, Settings → General → Date & Time (turn off Set Automatically) is the path; no citation needed for the UI, and there is no API to do it — `NSTimeZone.h:27`: "You can't use `NSTimeZone` APIs to change the time zone of the device or of other apps."

### 3.5 Recommended spike shape (mechanics only, not a product recommendation)

| Goal | Mechanism | Status |
|---|---|---|
| Start the app in a chosen zone | `TZ` env var in the scheme / `SIMCTL_CHILD_TZ` | **MEASURED working** |
| Override zone for calendar math in-process | `NSTimeZone.default = ...` | Documented; **moves Calendar only** |
| Force a re-resolve after changing `TZ` | `NSTimeZone.resetSystemTimeZone()` | Documented; **posts no notification** |
| Unit-test day bucketing deterministically | inject an explicit `Calendar` with a set `timeZone` | no zone plumbing needed at all |
| Exercise the real notification path | change host macOS zone, app running | **UNVERIFIED — test manually** |

The last row is the only one requiring a physical/manual step; the first four are scriptable.

---
## 4. SwiftData / CloudKit storage

### 4.1 `Date` itself is zone-free — the foundational citation

https://developer.apple.com/documentation/foundation/date:

> Abstract: "A specific point in time, independent of any calendar or time zone."
>
> "A `Date` value encapsulates a single point in time, independent of any particular calendrical system or time zone. Date values represent a time interval relative to an absolute reference date."
>
> "The `Date` structure provides methods for comparing dates, calculating the time interval between two dates, and creating a new date from a time interval relative to another date. Use date values in conjunction with `DateFormatter` instances to create localized representations of dates and times and with `Calendar` instances to perform calendar arithmetic."
>
> "`Date` bridges to the `NSDate` class."

This is the root fact for the whole ticket: a `Date` **cannot** represent "the 5th of March" — only an instant. The calendar date is a *rendering* of that instant through a `Calendar` + `TimeZone`, computed at read time.

### 4.2 Core Data's attribute types — no zone-aware type exists

SwiftData is layered on Core Data, so Core Data's attribute-type set bounds what SwiftData can persist. The complete list, from https://developer.apple.com/documentation/coredata/nsattributetype:

> Overview: "Core Data supports the following attribute types, which differentiate between bit sizes to enable data-store independence. For some types, a scalar option is available."

The enumerated types are exactly:

```
binaryDataAttributeType   booleanAttributeType     compositeAttributeType
dateAttributeType         decimalAttributeType     doubleAttributeType
floatAttributeType        integer16AttributeType   integer32AttributeType
integer64AttributeType    objectIDAttributeType    stringAttributeType
transformableAttributeType undefinedAttributeType  URIAttributeType
UUIDAttributeType
```

**There is exactly one date type (`dateAttributeType`) and it is not zone-aware. There is no time-zone type, no "local date" type, and no wall-clock type.** A calendar date can therefore only be stored as one of: a `Date` (an instant), a `String`, or integer components.

### 4.3 How a `Date` reaches CloudKit

The decisive citation is Core Data's CloudKit attribute-mapping table — https://developer.apple.com/documentation/coredata/reading-cloudkit-records-for-core-data:

> "When you initialize a schema, Core Data creates fields for each of an entity's attributes, mapping the attribute name to a field with a key in the form `CD_[attribute.name]`. The field's type may vary between Core Data and CloudKit."

The relevant rows (Core Data type | `NSManagedObject` type | `CKRecord` type):

```
Date          | NSDate   | NSDate
String        | NSString | NSString or CKAsset
UUID          | NSUUID   | NSString
URI           | NSURL    | NSString
Binary Data   | NSData   | NSData or CKAsset
Undefined     | —        | not supported
Object ID     | —        | not supported
```

So `Date` → `NSDate` → `NSDate` with **no transformation and no companion field**. (Contrast `String`, which does get one: "All variable length attribute types—String, Binary Data, and Transformable—generate an additional field with a key in the form `CD_[attribute.name]_ckAsset`.")

Nothing anywhere in this chain carries a time zone.

### 4.4 `CKRecord` field value types — the complete list

The authoritative list is the set of `CKRecordValue` conformances in `CloudKit.framework/Headers/CKRecord.h:345-366`:

```objc
@interface NSString (CKRecordValue) <CKRecordValue>
@interface NSNumber (CKRecordValue) <CKRecordValue>
@interface NSArray (CKRecordValue) <CKRecordValue>
@interface NSDate (CKRecordValue) <CKRecordValue>
@interface NSData (CKRecordValue) <CKRecordValue>
@interface CKReference (CKRecordValue) <CKRecordValue>
@interface CKAsset (CKRecordValue) <CKRecordValue>
@interface CLLocation (CKRecordValue) <CKRecordValue>
```

**Eight types. The only temporal one is `NSDate` — an absolute instant (§4.1). There is no zone-aware CloudKit field type.** `CKRecord`'s own metadata dates are `NSDate` too (`CKRecord.h:208`, `:218`: `@property (nullable, readonly, copy) NSDate *creationDate;` / `*modificationDate;`).

`CKRecord.h:241` also bounds the set: "The value you provide must be an instance of one the data types in `CKRecord#Supported-Data-Types`. You receive an error if you use a data type that CloudKit doesn't support."

And note the schema-rigidity rule at `CKRecord.h:246`, relevant if a field's type is ever reconsidered:

> "If the type of the `object` parameter differs from the type of the object that's on the server, you encounter an error when you attempt to save this record to the server. For example, if the current value is an `NSString` object, you receive an error if you change the value to an `NSNumber` object and save the record."

i.e. you cannot later change a `Date` field to a `String` field in place.

### 4.5 A `String` field carries no calendar semantics

Confirmed by absence rather than by a positive statement: `NSString` appears in the `CKRecordValue` list (§4.4) with no date-related behaviour, and the CloudKit Web Services field-type table lists string and timestamp as separate, unrelated types. CloudKit performs **no** parsing, validation, or normalisation of a date-shaped string — it is opaque text. Storing `"2026-03-05"` in a `String` field is therefore lossless and zone-free by construction, but also entirely un-queryable *as a date* by CloudKit.

`NOT FOUND` — any Apple statement explicitly saying a `String` field has no calendar semantics. This is inference from the type list, and is flagged as such.

### 4.6 Wire encoding of a CloudKit timestamp

The CloudKit Web Services Reference documents the wire form. Per the `Types` page of https://developer.apple.com/library/archive/documentation/DataManagement/Conceptual/CloudKitWebServicesReference/, the field type is spelled **`Date/Time`** in the field-type table and **`TIMESTAMP`** in the schema language, and the value is transmitted as milliseconds since the UNIX epoch (1 January 1970, UTC).

Two naming corrections worth recording, because a spec draft may use the wrong token:
- **`NOT FOUND`** — the literal token `DATE_TIME` does not appear in the CloudKit Web Services Reference. Apple spells it `Date/Time` (field-type table) or `TIMESTAMP` (Schema Language).
- Epoch-milliseconds is zone-free by construction, consistent with §4.1–§4.4.

### 4.7 SwiftData + CloudKit — no date-specific constraint

`ModelConfiguration(cloudKitDatabase:)` is the SwiftData→CloudKit switch:

```swift
let config = ModelConfiguration(cloudKitDatabase: .private("iCloud.com.example.Trips"))
```

**`NOT FOUND`** — no documented date-specific constraint imposed by CloudKit-backed SwiftData. The general CloudKit-compatibility constraints (all attributes optional or defaulted, no unique constraints) apply to every attribute type and are not date-specific.

### 4.8 Bottom line for storage

Apple ships **no zone-aware date type at any layer of this stack**:

| Layer | Temporal type available | Zone-aware? |
|---|---|---|
| Foundation | `Date` | No — documented as "independent of any calendar or time zone" |
| Core Data | `dateAttributeType` (1 of 16 types) | No |
| SwiftData | `Date` (via Core Data) | No |
| CloudKit `CKRecord` | `NSDate` (1 of 8 value types) | No |
| CloudKit wire | `TIMESTAMP` / `Date/Time`, epoch-ms | No |

If a wall-clock calendar date must survive travel, it has to be represented **explicitly** — as a separate stored field — because no built-in type will carry it.

### 4.9 The sanctioned Apple precedent: HealthKit's zone metadata

This is the closest thing to Apple guidance for the ticket, and it is a real, decade-old API.

https://developer.apple.com/documentation/healthkit/hkmetadatakeytimezone:

> Abstract: "The user's time zone when the HealthKit object was created."
>
> "This key takes a string value compatible with the `NSTimeZone` class's `timeZoneWithName:` method. **For best results when analyzing sleep samples, it's recommended that you store time zone metadata with your sleep sample data.**"

Local header, `HealthKit.framework/Headers/HKMetadata.h:159-164`:

```objc
/*!
 @constant      HKMetadataKeyTimeZone
 @abstract      Represents the time zone that the user was in when the HKObject was created.
 @discussion    The expected value type is an NSString compatible with NSTimeZone's +timeZoneWithName:.
 */
HK_EXTERN NSString * const HKMetadataKeyTimeZone API_AVAILABLE(ios(8.0), watchos(2.0), macCatalyst(13.0), macos(13.0));
```

Four load-bearing details:
1. **The value is a `String` — an IANA zone *name***, not a numeric offset and not a `TimeZone` object. A name survives future changes to a region's offset rules; a stored offset does not.
2. **It lives in side-channel metadata.** Apple did **not** extend the sample's date type. `HKSample` keeps its zone-free `startDate`/`endDate` and the zone rides *alongside* them.
3. **Apple explicitly recommends storing it** for correct analysis — and the example given (sleep) is exactly the wall-clock-sensitive case.
4. **Available since iOS 8.0** — a stable, long-standing pattern.

A `grep -rn 'TimeZone'` across all of `HealthKit.framework/Headers/` returns hits on **only** `HKMetadataKeyTimeZone` (three lines, all inside its own doc comment). There is no second zone key, no offset key, and no wall-clock key anywhere in HealthKit.

So Apple's own answer, in the one framework where the problem demonstrably matters: **keep the instant zone-free, and store the IANA zone name as a separate string field next to it.**

---
## 5. Apple's guidance on calendar-date vs instant

### 5.1 The archived Date and Time Programming Guide

The clearest statements are in Apple's archived guide. It is archived, not current, but it is primary Apple documentation and nothing has replaced it.

**A `Date` cannot represent a day without a time.** This is the direct answer to "can we just store a date?": no. Verbatim from https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/DatesAndTimes/Articles/dtDates.html:

> "`NSDate` is one of the fundamental Cocoa value objects. A date object represents an invariant point in time. **Because a date is a point in time, it implies clock time as well as a day, so there is no way to define a date object to represent a day without a time.** To understand how Cocoa handles dates, you must consider `NSCalendar` and `NSDateComponents` objects as well." (emphasis added)

And from the same page, on why that is desirable for storage but insufficient for display:

> "As absolute points in time, date objects are meaningful across locales, timezones, and calendars."

**Time zones are a presentation layer over absolute time** — https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/DatesAndTimes/DatesAndTimes.html: time zones present an absolute time as a wall-clock time. The absolute time is the stored truth; the wall clock is derived.

**For a zone-independent date, store components plus a calendar reference.** This is the closest Apple comes to endorsing "store the calendar date itself", and note it says *components + a calendar*, **not** a `Date`. Verbatim from https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/DatesAndTimes/Articles/dtTimeZones.html:

> "If you need to create a date that is independent of timezone, you can store the date as an `NSDateComponents` object—as long as you store some reference to the corresponding calendar. In iOS, `NSDateComponents` objects can contain a calendar, a timezone, and a date object. You can therefore store the calendar along with the components. If you use the `date` method of the `NSDateComponents` class to access the date, make sure that the associated timezone is up-to-date."

**The anchored-vs-floating distinction, in Apple's own words and examples** — same page, quoted verbatim because this is the exact axis the ticket turns on:

> "Time zones play an important part in determining when dates take place. Consider a simple calendar application that keeps track of appointments. For example, say you live in Chicago and you have a dentist appointment coming up at 10:00 AM on Tuesday. You will be in New York for Sunday and Monday, however. When you created that appointment it was done with the mindset of an absolute time. That time is 10:00 AM Central Time; when you go to New York, the time should be presented as 11:00 AM because you are in a different time zone, but it is the same absolute time. On the other hand, if you create an appointment to wake up and exercise every morning at 7:00 AM, you do not want your alarm to go off at 1:00 PM simply because you are on a business trip to Dublin—or at 5:00 AM because you are in Los Angeles. `NSDate` objects store dates in absolute time."

So: the **dentist appointment** is anchored (same instant, re-presented in the new zone's wall clock), and the **morning exercise** is floating (same local wall clock, therefore a different instant). A diary entry recording "what happened on the 5th" behaves like the *floating* case for its date label, while its timestamp is anchored — which is precisely why one `Date` field cannot express both.

Note the final clause of the components quote — "make sure that the associated timezone is up-to-date" — which is Apple flagging the staleness hazard of §2.

**Zone change and DST are one hazard class** — `DatesAndTimes.html` treats DST transitions and user relocation together as the same category of problem. See §6.

**Use the provided calendrical methods** — https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/DatesAndTimes/Articles/dtCalendricalCalculations.html: the framework methods handle DST and leap-year corner cases; do not do arithmetic by adding seconds. (Leap seconds are ignored, as the system tracks NTP.)

### 5.2 EventKit: Apple's shipping model for a floating record

`EKCalendarItem.timeZone` is the concrete API precedent — https://developer.apple.com/documentation/eventkit/ekcalendaritem/timezone. The zone is **optional**, and a `nil` zone means a *floating* event; you set the zone when the wall-clock time matters. So EventKit's model is: a `Date` plus a **separate, nullable** `TimeZone` — structurally the same shape as HealthKit's metadata key (§4.9).

### 5.3 WWDC

**WWDC23 session 10052** is the usable citation. Its transcript states the two operative rules: do date math via `Calendar`/`DateComponents` rather than by adding intervals, or DST will surprise you; and when creating an event whose zone matters, set the event's time zone explicitly ("be sure to set that as well").

Corrections to the ticket's premise, both verified:
- **`NOT FOUND` — WWDC 2022 session 110372 "Solutions to common date and time challenges" does not exist.** That URL redirects to the WWDC22 index, and no date/time session appears among the WWDC22 sessions.
- **`NOT FOUND` — WWDC 2013 session 227 is unreachable.** The WWDC13 index renders no sessions; pre-2014 videos appear to have been removed. I could not confirm or quote it.
- **`NOT FOUND` — there is no dedicated Apple dates/times session in 2020–2026**, checked against each year's index and the full `all-videos` catalogue.

### 5.4 What Apple does *not* say

Three explicit gaps, all of which a prior agent's claims apparently over-reached on:

1. **`NOT FOUND` — no Apple statement anywhere that you should store a `Date` plus a separate `TimeZone` identifier as a general rule.** The strongest primary sources are indirect: the archived guide's "components + calendar reference" sentence (§5.1), EventKit's optional-`timeZone` model (§5.2), HealthKit's `HKMetadataKeyTimeZone` recommendation (§4.9), and the WWDC23 "set that as well" line (§5.3). Those are precedents and analogies; **the general prescription is not Apple's words.** Do not attribute it to Apple in the spec.
2. **`NOT FOUND` — no Apple guidance on whether to recompute or to fix an already-stored date when the user changes zone.** The dentist/exercise passage frames the distinction but prescribes nothing. This is a **product decision**, not something Apple decides for us.
3. **`NOT FOUND` — the HIG is silent on time zones.** ~90 HIG topics were enumerated and 40 fetched and grepped; the only "time zone" hit is a watchOS label API note. There is no HIG time-zone page, no standalone date-pickers page, and nothing about presenting a date recorded in another zone.

Also **`NOT FOUND`**: any Apple documentation of Journal.app's or Health.app's own date behaviour. HealthKit's metadata key (§4.9) is an API, not a statement about app behaviour.

---

## 6. DST as the near case

### 6.1 Are a DST transition and a zone crossing the same class of event?

**Partly, and the distinction is sharp in the notification layer.**

- **Documented as one hazard class in prose.** The archived guide (https://developer.apple.com/library/archive/documentation/Cocoa/Conceptual/DatesAndTimes/DatesAndTimes.html) treats DST transitions and user relocation together as the same category of problem: both change the mapping between an absolute instant and a wall-clock reading.
- **Documented as *different* in the notification layer.** `UIApplication.significantTimeChangeNotification` lists DST but **not** zone change (§1.3); `NSSystemTimeZoneDidChange` covers zone change and does not mention DST (§1.2). They are separate signals.

Consequence for the spec: DST is the *cheap, local, guaranteed-to-happen* rehearsal of the zone-crossing bug — same failure mode, different notification. Any day-bucketing logic that survives a zone crossing also survives DST, but the two need separate tests because they arrive on different channels.

Related, and worth noting because it is easy to conflate: the system clock changing is a *third* signal again — `NSSystemClockDidChange` — and, per §1, a zone change is documented on `NSSystemTimeZoneDidChange` only.

### 6.2 A day is not always 24 hours

**MEASURED**, using explicit zone-pinned `Calendar`s on the iOS 26.5 simulator:

| Case | Zone | Date | `dateInterval(of: .day)` duration |
|---|---|---|---|
| Fall back | `Europe/Prague` | 2026-10-25 | **25.0 h** |
| Spring forward | `Europe/Prague` | 2026-03-29 | **23.0 h** |
| Half-hour DST | `Australia/Lord_Howe` | 2026-10-04 | **23.5 h** |

The Lord Howe row matters: DST offsets are **not always whole hours**, so a 30-minute shift is real and any assumption of hour-granularity is wrong.

`Calendar.dateInterval(of:for:)` is the documented way to get this right — https://developer.apple.com/documentation/foundation/calendar/dateinterval(of:for:):

> Abstract: "Returns the starting time and duration of a given calendar component that contains a given date."

It returns a **computed** duration, so it never assumes 86400.

`NOT FOUND` — no Apple *reference-doc* prose stating that a day may be 23 or 25 hours. That fact appears only as a swift-foundation source comment (in `Calendar_Enumerate.swift`) and is demonstrable by measurement, as above. Cite the measurement, not a doc page.

### 6.3 `Calendar.startOfDay(for:)` — documented safe, and verified

This is the load-bearing API for a day view, and Apple **does** document its DST behaviour. https://developer.apple.com/documentation/foundation/calendar/startofday(for:):

> Abstract: "Returns the first moment of a given Date, as a Date."
>
> Return value: "The first moment of the given date."
>
> Discussion: "For example, pass in `Date()`, if you want the start of today. **If there were two midnights, it returns the first. If there was none, it returns the first moment that did exist.**" (emphasis added)

Both branches of that sentence are explicit, which makes `startOfDay(for:)` **safe to rely on across DST** — it is documented, not merely observed.

**MEASURED confirmation of the harder branch** (midnight does not exist). `America/Havana` moves 00:00 → 01:00 on 2026-03-08, so there is no midnight:

```
Havana 2026-03-08 startOfDay = 2026-03-08T05:00:00Z
  local wall clock = 2026-03-08 01:00:00 GMT-4
```

It correctly returned 01:00 local — "the first moment that did exist" — rather than failing or producing 00:00 of the wrong day.

And the fall-back branch, `Europe/Prague` 2026-10-25 (two midnights): `startOfDay` returned `2026-10-24T22:00:00Z`, the **first** midnight, and the following day's start was `2026-10-25T23:00:00Z` — 25 hours later, as expected.

### 6.4 `date(byAdding: .day, value: 1)` preserves wall-clock time, not elapsed time

Documented behaviour is thin, but the mechanism is explicit in source, and this is the correct semantics for a "next day" button.

swift-foundation `Sources/FoundationEssentials/Calendar/Calendar_Gregorian.swift` (~lines 2495-2517):

```swift
// No need for normal gmt-offset adjustment because the revelant bits are handled above individually
// We do have to adjust DST offset when the new date crosses DST boundary, such as adding an hour to dst transitioning day
if newOffset != prevOffset {
    newDateInWholeSecond = newDateInWholeSecond + Double(prevOffset - newOffset)
    ...
}
// If the new date falls in the repeated hour during DST transition day, rewind it back to the first occurrence of that time
if amount > 0, let interval = timeZoneTransitionInterval(at: newDateInWholeSecond, timeZone: timeZone) {
    newDateInWholeSecond = newDateInWholeSecond - interval.duration
}
```

i.e. adding `.day` **keeps the wall clock and absorbs the offset change** — which is why the absolute delta can be 23 or 25 hours.

**MEASURED**, `Europe/Prague` across spring-forward, starting from a true start-of-day:

```
startOfDay(2026-03-28) = 2026-03-27T23:00:00Z
+1 day                 = 2026-03-28T23:00:00Z   elapsed = 24.0 h
  +1day wall clock     = 2026-03-29 00:00:00 GMT+1
```

Here it landed exactly on the next local midnight (24 h elapsed, because the transition falls later on the 29th). The general rule stands: **the wall clock is preserved, the elapsed interval varies.** For a day view, adding `.day` to a `startOfDay` and re-normalising with `startOfDay` is the robust idiom.

Two further documented DST facts, useful when matching times rather than days:
- `Calendar.RepeatedTimePolicy` / `Calendar.MatchingPolicy` document that repeated times exist (2:00–3:00 twice) and skipped times exist (no 2:37).
- `Calendar.dates(byMatching:)` documents that a backward search through a repeated time yields the first match, "where 'first' is defined from the point of view of searching forwards."

`NOT FOUND` — `date(byAdding:value:to:wrappingComponents:)` documentation does not mention DST or the 23/25-hour effect. That behaviour is source-only, as quoted above.

---

## 7. Which zone was the previous zone?

**Answer: the app is not told. It must record the zone itself.**

### 7.1 Nothing documented carries a previous zone

| Notification | `object` | `userInfo` | Previous zone? |
|---|---|---|---|
| `NSSystemTimeZoneDidChange` | **`NOT FOUND`** | **`NOT FOUND`** (page has no Discussion at all) | No |
| `significantTimeChangeNotification` | `NOT FOUND` | **documented as absent** | **Definitively no** |
| `NSCalendarDayChanged` | observer told to register with `nil`; poster's object `NOT FOUND` | **`NOT FOUND`** | No |

The `significantTimeChange` row is the only *positive* documented statement, and it is a negative result — https://developer.apple.com/documentation/uikit/uiapplication/significanttimechangenotification: "The notification doesn't contain a user info dictionary." So that notification structurally **cannot** convey a previous zone.

For the other two, Apple documents neither `object` nor `userInfo`. Note this silence is meaningful: `NSSystemClockDidChange` *does* document both, so the omission on `NSSystemTimeZoneDidChange` is a real documentation gap rather than a house style.

### 7.2 The underlying transport cannot carry a payload

This is the structural reason, and it is documented. `NSSystemTimeZoneDidChange` is defined as the CoreFoundation notification `kCFTimeZoneSystemTimeZoneDidChangeNotification` (§1.2). CoreFoundation's own header states the limitation for the Darwin notify transport — `CoreFoundation.framework/Headers/CFNotificationCenter.h:45-51`:

```objc
CF_EXPORT CFNotificationCenterRef CFNotificationCenterGetDarwinNotifyCenter(void);
// The Darwin Notify Center is based on the <notify.h> API.
// For this center, there are limitations in the API. There are no notification "objects",
// "userInfo" cannot be passed in the notification, and there are no suspension behaviors
// (always "deliver immediately"). Other limitations in the <notify.h> API as described in
// that header will also apply.
// - In the CFNotificationCallback, the 'object' and 'userInfo' parameters must be ignored.
```

`UNVERIFIED` — whether `NSSystemTimeZoneDidChange` specifically travels via the Darwin notify center as opposed to the local center. The posting site is closed-source: an exhaustive grep of both swift-foundation and swift-corelibs-foundation finds only the *name declaration* (`NSTimeZone.swift:213`), never a `post`. So treat "no payload" as **documented-absent plus structurally likely**, not as a proven mechanism.

### 7.3 The old zone exists internally but is not surfaced

swift-foundation's internal reset **returns** the previous zone — `Sources/FoundationEssentials/TimeZone/TimeZone.swift:420-425`:

```swift
    internal static func resetSystemTimeZone() -> TimeZone? {
        let oldTimeZone = TimeZoneCache.cache.reset()
        // Also reset the calendar cache, since the current calendar uses the current time zone
        LocaleNotifications.cache.reset()
        return oldTimeZone
    }
```

and the cache captures it — `TimeZone_Cache.swift:95-103`:

```swift
        mutating func reset() -> TimeZone? {
            let oldTimeZone = currentTimeZone
            currentTimeZone = nil
            ...
            return oldTimeZone
        }
```

But the **public** API discards it: `+[NSTimeZone resetSystemTimeZone]` returns `void` (`NSTimeZone.h:88`), and there is no Swift entry point at all (§2.3). swift-corelibs-foundation throws the value away explicitly — `Sources/Foundation/NSTimeZone.swift`: `let _ = TimeZone._resetSystemTimeZone()`.

**Design consequence, stated as a fact rather than a recommendation:** an app that needs to know the previous zone must persist the zone identifier itself (e.g. alongside each record, per §4.9's HealthKit pattern) and diff it on notification. There is no supported way to recover it from the system after the fact.

---
## 8. Gaps — `NOT FOUND` and `UNVERIFIED`

Everything in this list is something the spec must **not** assert as an Apple fact.

### 8.1 `NOT FOUND` — Apple documents nothing on these

**Notifications**
1. `object` and `userInfo` of `NSSystemTimeZoneDidChange`. The doc page has no Discussion section at all. (Notably `NSSystemClockDidChange` *does* document both, so this is a genuine gap.)
2. `object` and `userInfo` of `NSCalendarDayChanged`. The header tells the *observer* to register with `nil`; it never says what the poster passes.
3. `object` of `significantTimeChangeNotification` (its `userInfo` **is** documented absent).
4. **Main-thread / queue delivery for `NSSystemTimeZoneDidChange` and `NSCalendarDayChanged`.** Undocumented for both. Only the suspended-app queueing case is documented, and only for `significantTimeChange`.
5. **Any ordering guarantee among the three notifications.** None exists in any Apple source.
6. Coalescing behaviour of `NSSystemTimeZoneDidChange` (day-change and significant-time-change coalescing *are* documented).
7. The **posting site** for all three. Closed-source; absent from exhaustive greps of both swift-foundation and swift-corelibs-foundation, and from `CFTimeZone.c`.
8. Rules for when a previous-zone value would be non-nil — the internal plumbing exists (§7.3) but is undocumented and unexposed.

**Storage**
9. SwiftData's / Core Data's **on-disk** encoding of a date. Apple documents the type as `NSDate` and stops. Any claim about a SQLite column or `timeIntervalSinceReferenceDate` seconds is empirical observation of the current SDK, **not** documented behaviour.
10. The token **`DATE_TIME`** appears nowhere in the CloudKit Web Services Reference. Apple spells it `Date/Time` (field-type table) or `TIMESTAMP` (Schema Language). If a spec draft says `DATE_TIME`, that name is not Apple's.
11. Any explicit Apple statement that a CloudKit `String` field has no calendar semantics. §4.5 is inference from the type list.
12. Any date-specific constraint imposed by SwiftData + CloudKit beyond the general CloudKit-compatibility rules.
13. Any CloudKit Console/Dashboard doc page enumerating field types with per-type semantics.

**Guidance**
14. **Any Apple statement that you should store a `Date` plus a separate `TimeZone` identifier as a general rule.** This is the most important gap. The available primary sources are indirect precedents only — HealthKit's `HKMetadataKeyTimeZone`, EventKit's optional `timeZone`, the archived guide's "components + calendar reference" sentence. **Do not attribute the general prescription to Apple.**
15. **Any Apple guidance on recomputing vs. fixing a stored date when the user travels.** The archived guide's dentist/exercise passage frames the distinction and prescribes nothing. This is ours to decide.
16. **The HIG is silent on time zones**, and on presenting a date recorded in another zone. ~90 topics enumerated, 40 fetched and grepped; the only "time zone" hit is a watchOS label API note. There is no HIG time-zone page and no standalone date-pickers page.
17. Any documentation of **Journal.app's or Health.app's** own date/zone behaviour.
18. **WWDC 2022 session 110372 "Solutions to common date and time challenges" does not exist** — the URL redirects to the WWDC22 index and no such session appears in it.
19. **WWDC 2013 session 227 is unreachable** — pre-2014 videos appear removed; the WWDC13 index renders no sessions. Cannot confirm or quote.
20. **No dedicated Apple dates/times session exists in 2020–2026**, verified against each year's index plus the full `all-videos` catalogue.

**DST**
21. No **reference-doc prose** stating a day may be 23 or 25 hours. Source comment + measurement only.
22. `date(byAdding:value:to:wrappingComponents:)` docs do not mention DST or the 23-hour effect. Source-only.
23. `Calendar.nextDate(after:matching:)` rendered docs do not mention DST; the DST semantics live in the two policy enums and in `enumerateDates` doc comments.

**Tooling**
24. **No `simctl` time-zone facility on Xcode 27** — verified against the full subcommand list, the `ui`/`launch`/`spawn`/`status_bar` sub-help pages, and a `strings` sweep of `CoreSimulator` and `Simulator.app` (zero `timezone` matches). Not merely undocumented — absent.
25. **No Apple documentation of `TZ` as a supported iOS-app knob.** It works (§3.2, MEASURED) and is described in a swift-foundation source comment, but it is a POSIX convention. Treat it as a test-harness affordance, not a contract.

### 8.2 `UNVERIFIED` — could not be tested or confirmed here

26. **Whether a bare time-zone change posts `UIApplicationSignificantTimeChange`.** Its documented triggers are midnight / carrier update / DST only, but the list is prefixed "for example" and so is not stated to be exhaustive. Worth measuring on device before relying on either answer.
27. **Whether changing the host macOS zone delivers a live `NSSystemTimeZoneDidChange` into a running simulator process.** Untestable here — `systemsetup -settimezone` needs interactive sudo. **This is the gap that most matters for an end-to-end test**; confirm manually before writing a spec rule that depends on the notification actually arriving.
28. **Whether `NSSystemTimeZoneDidChange` travels via the Darwin notify center** (which structurally cannot carry a payload, §7.2) or the local center. Posting site is closed-source.
29. Whether the `.day`-arithmetic and `date(from:)` paths resolve a repeated hour identically. Source shows the wrapping branch uses `dstRepeatedTimePolicy: .latter` while `date(from:)` defaults to `.former` — a real asymmetry, not chased down further.

### 8.3 Sources deliberately not used

30. **Apple developer forums: not attempted.** Per the standing rule for this effort, no forum content was fetched or paraphrased, so **no claim in this document rests on a forum post** — including any DTS answer. If DTS guidance is wanted, it must be gathered separately and with a working URL.

### 8.4 Two corrections to common assumptions

Recorded explicitly because both are easy to get wrong and both were verified:

- **`resetSystemTimeZone()` does not post a notification** (MEASURED, §2.3). It is a cache operation.
- **There is no `TimeZone.resetSystemTimeZone()` in Swift** (MEASURED — compile error, §2.3). Only `NSTimeZone.resetSystemTimeZone()`.

And one more, the most surprising mechanical finding:

- **`TimeZone.autoupdatingCurrent` is not independently live.** It forwards to the same memoized `TimeZoneCache.cache.current` slot as `TimeZone.current` (§2.4, source-quoted). It appears fresh only because the system's zone-change notification invalidates that shared cache. The meaningful distinction is between a **held** value and a **re-read** one, not between the two property names.

---

## Appendix: reproduction

The measurements in this document came from Swift binaries built for the simulator and run via `simctl spawn`:

```bash
xcrun --sdk iphonesimulator swiftc -target arm64-apple-ios26.0-simulator probe.swift -o /tmp/probe
xcrun simctl spawn <UDID> /tmp/probe                        # host zone
SIMCTL_CHILD_TZ="Asia/Tokyo" xcrun simctl spawn <UDID> /tmp/probe   # overridden zone
```

Apple doc pages were read as DocC JSON, since the HTML is JS-rendered and returns only a title to a plain fetch:

```bash
curl -s "https://developer.apple.com/tutorials/data/documentation/foundation/calendar/startofday(for:).json"
```

That JSON endpoint is the reliable way to quote Apple docs verbatim in this repo's research, and is worth reusing.
