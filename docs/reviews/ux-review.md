# UX/UI Audit Report: Eczema Tracker PWA

**Reviewer:** Senior UX/UI Designer (10+ years, healthcare PWAs, accessibility, parental tools)
**Date:** 25 March 2026
**Scope:** All documentation in `docs/` -- architecture, data models, and phases 0-8
**Target users:** Two parents (primarily the mother) tracking a breastfed newborn's atopic eczema via elimination diet. Czech-only UI. iPhone primary device.

---

## Executive Summary

The Eczema Tracker PWA documentation demonstrates an unusually thorough technical architecture for a personal project. The Ports & Adapters pattern, offline-first strategy, and E2E encryption scheme are well-reasoned and clearly documented. The data models are clinically thoughtful -- the stool tracking metadata (color, consistency, mucus, blood) reflects genuine pediatric practice.

However, the project has a significant imbalance: **the engineering documentation is production-grade while the UX documentation is almost entirely absent.** There are no wireframes, no user flow diagrams, no design system specification, no accessibility guidelines, and no emotional design considerations for what is fundamentally a tool used by stressed, sleep-deprived parents caring for a sick infant. The planned `ui-design.md` is deferred to Phase 1 and referenced as a prerequisite by every subsequent phase, making it a critical-path dependency with zero content defined.

The technical choices are sound for UX (offline-first, fast canvas charts, client-side PDF generation). But several user-facing flows carry meaningful UX risk: the dual-passphrase authentication (login password + encryption passphrase), the multi-step photo capture workflow with encryption overhead, and the absence of any onboarding sequence to guide overwhelmed parents through a complex setup process.

**Verdict: The UX foundation needs significant work before implementation begins, but this is addressable within the existing phase structure.** Phase 1's deferred `ui-design.md` must be treated as a first-class deliverable, not a checkbox. The findings below provide a concrete roadmap for what that document should contain.

---

## Findings by Impact

### Critical UX Gaps

These issues, if unaddressed, will result in user abandonment or fundamental usability failures.

---

#### C1. No UI Design Document Exists -- and Everything Depends on It

**Current state:** The README references `architecture/ui-design.md` with the note "created in Phase 1 after testing on real phone." Phase 1's Feature 12 describes creating this document. Phases 2, 3, and beyond list it as a prerequisite. Multiple UI decisions in Phase 2 (day detail view: page vs bottom sheet; meal composer: inline vs separate route; food grid layout: tabs vs scroll vs accordion) and Phase 3 (photo capture: wizard vs single page; gallery layout; photo detail: modal vs page) are explicitly deferred to this document.

**User impact:** Without this document, every implementation phase will require ad-hoc UI decisions that may not compose into a coherent experience. Different phases built by different contributors (or the same developer at different times) will produce inconsistent interaction patterns.

**Recommendation:** Elevate `ui-design.md` to a Phase 0.5 deliverable. Before any code, it should contain:
- A navigation flow diagram covering all screens and transitions
- Low-fidelity wireframes (even ASCII) for every screen listed in `project-structure.md`
- A decision log for each deferred UI question (bottom sheet vs page, wizard vs single page, etc.)
- A component inventory (button sizes, card patterns, spacing scale, typography scale)
- Touch target sizing standards (minimum 44x44pt per Apple HIG)
- Color palette with contrast ratios verified against WCAG AA
- One-handed reachability map for the bottom navigation bar on iPhone

---

#### C2. Dual-Password Burden: Login Password + Encryption Passphrase

**Current state:** Users must manage two separate secrets: a login password (min 8 chars, bcrypt-hashed) and an encryption passphrase (min 12 chars, PBKDF2-derived). The encryption passphrase is entered "once per session" after login. The passphrase modal appears on every app launch after authentication. Both parents must know both secrets.

**User impact:** This is a 3am-feeding-while-holding-a-crying-baby scenario. Requiring two separate password entries on every session start is a significant friction point. Parents who forget the passphrase permanently lose all photos -- by design, with no recovery. The documentation acknowledges this but treats it as a pure security decision without weighing the UX cost.

**Recommendation:**
1. After login, derive the encryption key automatically by combining the login password with a server-stored salt. This eliminates the second password entry while maintaining E2E encryption. The tradeoff (server admin who knows the password could derive the key) is acceptable for a 2-user self-hosted app.
2. If a separate passphrase is retained, provide a "remember on this device" option that stores the derived key in the platform keychain (Web Crypto `extractable: false` + IndexedDB, cleared on logout). This reduces daily friction to zero.
3. Add a passphrase hint feature (stored server-side, user-defined) as a safety net against permanent photo loss.
4. Consider moving passkeys/WebAuthn from Phase 8 to Phase 1 -- for a 2-user app on known devices, Face ID/Touch ID is the ideal primary auth method and would eliminate both passwords entirely.

---

#### C3. No Onboarding Flow Designed

**Current state:** The first-use experience consists of: register an account -> add a child -> set an encryption passphrase -> start using the app. There is no documentation of an onboarding wizard, tutorial, empty-state guidance, or progressive disclosure strategy. The settings page handles child creation, but there is no guided path from first launch to first useful action.

**User impact:** A parent downloading this app has just received a diagnosis of atopic eczema for their baby. They are stressed, possibly in a pediatrician's office, and need to start tracking immediately. Being confronted with a registration form, then a child form, then a cryptic passphrase setup (with a strength indicator and warnings about irrecoverability) is intimidating and off-putting.

**Recommendation:**
1. Design a 3-step onboarding wizard: (1) Create account + add child in one screen, (2) Brief explanation of what the app does with visuals, (3) Encryption passphrase setup with clear, non-technical Czech explanation of why it matters.
2. After onboarding, land on the calendar with a coach-mark overlay highlighting "Tap today to start logging foods."
3. Design encouraging empty states for every section (see finding S2).
4. Defer encryption passphrase setup until the user first attempts to take a photo -- do not block the food tracking workflow.

---

#### C4. Photo Capture Flow Has Too Many Steps for a Diaper-Change Scenario

**Current state:** Phase 3 describes the capture flow as: select photo type (skin/stool) -> open camera -> (optional ghost overlay loads) -> capture frame -> fill metadata form (body area + severity for skin; color + consistency + mucus + blood for stool) -> encrypt -> upload. For stool photos specifically, the metadata form requires selecting from 6 colors, 4 consistencies, and 2 toggles before saving.

**User impact:** Stool photos are taken during diaper changes -- a time-pressured, one-handed, messy situation. The mother is holding the baby with one hand and the phone with the other. A multi-field metadata form after capture is impractical. Even skin photos are often taken while the baby is fussy and uncooperative.

**Recommendation:**
1. Make metadata entry optional at capture time. Capture the photo immediately (one tap), then present metadata as an editable overlay that can be filled in later (or skipped entirely).
2. For stool photos: default to the most common values (yellow, soft, no mucus, no blood) and require only a single "confirm" tap for the typical case. Use a "flag as unusual" toggle that expands the full form only when needed.
3. For skin photos: remember the last-used body area as the default. Severity can default to the previous value for that area.
4. Consider a "quick capture" mode accessible from the home screen that skips type selection (infer from a "Skin" / "Stool" shortcut button on the gallery page or even the bottom nav).

---

### Significant Gaps

These issues will cause frustration or confusion but are unlikely to cause outright abandonment.

---

#### S1. Bottom Navigation Has Five Tabs -- Export and Analysis Are Buried

**Current state:** The bottom navigation has five tabs: Calendar, Food, Photos, Trends, Settings. The analysis history page is described in Phase 4 but has no tab -- it is accessed from the comparison view or presumably via a link. The export page (Phase 7) is also not in the tab bar. The Settings page handles children, notifications, encryption, and eventually passkeys -- it is overloaded.

**User impact:** Five tabs is the iOS maximum for comfortable use, which is correct. But the missing tabs for Export and Analysis mean these features require multiple taps to reach. The pediatrician export is a high-value, low-frequency action that may be hard to discover. Analysis history has no clear navigation path from the main app flow.

**Recommendation:**
1. Add an "Export" action to the Trends page (a button, not a tab) since users reviewing trends are the ones most likely to want to share with their doctor.
2. Add an "Analysis" section within the Photos tab (e.g., a tab within the photos page: Gallery | Compare | History).
3. Consider splitting Settings into a profile/account section (accessible from a header avatar) and a child/notification section (inline in the app). This is a common pattern in healthcare apps.

---

#### S2. Empty States and Error States Are Mentioned but Not Designed

**Current state:** Phase 5 mentions an empty state message for the trends dashboard: "Zadna data pro zvolene obdobi." Phase 7 mentions one for export. But most pages have no documented empty state. There is no documentation of what the calendar looks like before any food has been logged, what the gallery looks like before any photo has been taken, or what happens when the AI analysis returns an unexpected result.

**User impact:** Empty states are the first thing a new user sees. They set the emotional tone for the app. A blank white screen with no guidance is demoralizing. Error states (AI failure, network loss, decryption error) happen at emotionally charged moments and need careful, empathetic messaging.

**Recommendation:** Design empty states for every page:
- **Calendar (no food logs):** "Klepnete na dnesek a zaznamenejte prvni eliminaci." (Tap today and record your first elimination.) with a pointing hand illustration.
- **Gallery (no photos):** "Vyfotte prvni fotku pro sledovani zmem." (Take your first photo to start tracking changes.) with a camera icon.
- **Trends (insufficient data):** "Pro zobrazeni trendu je potreba alespon 7 dni dat." (At least 7 days of data are needed to show trends.) with a progress indicator showing how close they are.
- **AI analysis failure:** Avoid technical language. "Analyza se nepovedla. Muzete to zkusit znovu, nebo pokracovat bez ni." (Analysis did not succeed. You can try again or continue without it.)

---

#### S3. Notification UX Lacks Emotional Sensitivity

**Current state:** Phase 6 defines two notification messages: "Zaznamenala jsi dnes jidlo?" (Did you log food today?) and "Cas na kontrolni fotku" (Time for a check-up photo). The notification title is "Eczema Tracker." These are functional but clinical.

**User impact:** These parents are already stressed about their child's condition. A notification that feels like a task reminder from an authority figure can trigger guilt or anxiety, especially if the parent has been too exhausted to log consistently. The food reminder's question format ("Did you?") implies judgment.

**Recommendation:**
1. Reframe notifications as gentle encouragements, not questions:
   - Food: "Dnesni zaznam jidla pomuze lepe sledovat zmeny." (Today's food log helps track changes better.)
   - Photo: "Kontrolni fotka pomuze videt pokrok." (A check-up photo helps see progress.)
2. Add the child's name: "Emma: Cas na kontrolni fotku." This personalizes the notification and gives context when a parent sees it on a lock screen.
3. Consider a "snooze" option (remind me in 1 hour) rather than forcing the user to either act or dismiss.
4. Allow a "quiet hours" setting to prevent notifications during nighttime feeds when the parent is already awake but cannot act.

---

#### S4. Calendar Day Detail Navigation Pattern Is Undecided

**Current state:** Phase 2 explicitly defers the decision of whether tapping a calendar day opens a new page (`/calendar/[date]`) or a bottom sheet. This is listed as a "UI Decision -- Deferred to User Testing" with both approaches described. The food grid layout (tabs vs scroll vs accordion) is similarly undecided.

**User impact:** This is a core interaction that the user performs dozens of times per day. Getting it wrong means the most frequent action feels clunky. Both approaches have merit, but the decision affects the entire information architecture.

**Recommendation:** Based on experience with similar healthcare tracking apps on iPhone:
1. **Use a bottom sheet for the day detail view.** This keeps the calendar visible for context (the user can see what they did yesterday while editing today) and matches iOS native patterns (Reminders, Calendar). The sheet should be draggable to half-height (food status overview) and full-height (food grid + meals).
2. **Use tabs for the food grid + meal layout** ("Eliminace" / "Jidla"). This provides clear separation and avoids overwhelming scroll depth. Tabs are familiar and reduce cognitive load.
3. **Use a multi-step wizard for photo capture** (type -> camera -> metadata -> save). Each step fits on one screen, reducing scroll and keeping focus. Repeat users can flow through quickly since most steps have remembered defaults.

---

#### S5. Chart Accessibility and Mobile Readability Concerns

**Current state:** Phase 5 uses uPlot for canvas-based charts. The severity chart has a primary Y-axis (1-5) and secondary Y-axis (1-10) with multiple line series (solid, dashed, different colors). The food timeline uses colored bars. The combined view stacks both with shared scroll.

**User impact:** Canvas-based charts are inherently inaccessible to screen readers. Dual Y-axes on a 375px-wide mobile screen will be cramped. Color-coded trend badges (green/red/grey) and food category colors may be indistinguishable for colorblind users. The documentation mentions no alternative text or data table fallback.

**Recommendation:**
1. Provide a data table toggle below each chart ("Zobrazit jako tabulku" / Show as table) for accessibility and for users who prefer numbers.
2. Use pattern fills (dots, stripes, crosshatch) in addition to color for food timeline bars to support colorblind users.
3. On mobile, default to showing only the manual severity line (the most important metric). AI scores should be hidden behind a "Detail" toggle to avoid clutter.
4. Add ARIA labels to chart containers describing the general trend in text form (e.g., `aria-label="Trend zavaznosti za poslednich 30 dni: mirne zlepseni"`).
5. Consider replacing the dual Y-axis chart with two separate, stacked mini-charts. Dual axes are consistently misread by users in usability testing.

---

#### S6. Offline Indicator and Sync Status Are Not Designed

**Current state:** The offline strategy document is thorough on the technical side (Dexie tables, sync triggers, conflict resolution). The Phase 8 i18n file includes "Jste offline" and "Synchronizuji..." strings. But there is no documentation of how offline status is visually communicated to the user, where sync progress is shown, or how the user knows their data is safe when offline.

**User impact:** Parents need confidence that the data they entered while offline (potentially important medical observations) will not be lost. Without visible sync status, they may worry that offline entries "did not save."

**Recommendation:**
1. Design a persistent but subtle status indicator in the app header -- a small cloud icon that is green (synced), orange (syncing), or grey with a slash (offline).
2. On sync completion, show a brief toast: "Vsechna data synchronizovana." (All data synchronized.)
3. When creating data offline, show an inline indicator on the created item: "Ulozeno lokalne, bude synchronizovano." (Saved locally, will be synchronized.)
4. On the Settings page, add a "Sync status" section showing last sync time and count of pending items.

---

#### S7. No Design Consideration for Two-User Collaboration

**Current state:** Both parents share a single child context. The data model tracks `createdBy` on food logs and photos. But there is no UI documentation about how the app handles two parents using it simultaneously. There is no activity feed, no "last edited by" indicators, and no notification when the other parent makes a change.

**User impact:** When both parents are tracking, they need to know what the other has already logged to avoid duplicates (especially for food logs). A parent reviewing the day's data needs to trust that it is complete, not wonder whether the other parent also logged something they have not seen yet.

**Recommendation:**
1. Show the author's name (or initials) on food log entries and photos. "Pridala Mama" (Added by Mom) as a small label.
2. On the day detail view, show a "Last updated by [name] at [time]" line to indicate whether the other parent has contributed today.
3. Consider a simple activity feed on the calendar page showing recent changes: "Mama eliminovala mlecne vyrobky" (Mom eliminated dairy).

---

### Minor Gaps

These are polish items that improve the experience but are not blockers.

---

#### M1. Ghost Overlay UX Needs More Thought

**Current state:** Phase 3 describes a 30% opacity overlay of the previous photo on the live camera feed, with a toggle button labeled "Prekryv: zap/vyp." For first-time use, a static SVG silhouette is shown. The overlay decrypts asynchronously so the camera is usable immediately.

**User impact:** The ghost overlay is a genuinely clever feature for consistent photo framing. However, at 30% opacity over a live camera feed, the overlay may be hard to see in varying lighting conditions. The toggle label "Prekryv: zap/vyp" is technical.

**Recommendation:**
1. Allow opacity adjustment (a slider from 10% to 50%) rather than a fixed 30%.
2. Rename the toggle to something more intuitive: "Predchozi fotka" (Previous photo) with a ghost icon.
3. Add a brief tooltip on first use explaining the feature: "Porovnejte polohu s predchozi fotkou pro lepsi srovnani." (Compare position with the previous photo for better comparison.)

---

#### M2. Severity Slider 1-5 Scale Lacks Descriptive Labels

**Current state:** Phase 3 defines a 1-5 integer severity slider for skin photos. No verbal anchors are documented for what each number means.

**User impact:** Without labels, the severity scale is subjective and inconsistent. A "3" from one parent may be a "4" from the other. Over time, the same parent may shift their internal calibration, making trend data unreliable.

**Recommendation:** Add verbal anchors to each severity level:
1. Mirny (Mild) -- lehke zarudnuti (light redness)
2. Lehky (Light) -- viditelne zarudnuti, sucha kuze (visible redness, dry skin)
3. Stredni (Moderate) -- vyrazne zarudnuti, loupani (pronounced redness, peeling)
4. Tezky (Severe) -- intenzivni zarudnuti, praskliny (intense redness, cracking)
5. Velmi tezky (Very severe) -- mokvani, krvaceni (weeping, bleeding)

Display the label dynamically as the slider moves.

---

#### M3. PWA Manifest Name Is in English

**Current state:** The manifest in Phase 0 has `"name": "Eczema Tracker"` and `"short_name": "EczemaTrack"`. The app description is in English: "Track elimination diet for infant atopic eczema."

**User impact:** When the app is installed on the home screen, the name displays in English, breaking the Czech-only UI promise. On iOS, the name appears under the icon and in the app switcher.

**Recommendation:** Change to Czech:
- `"name": "Sledovani ekzemu"` or `"name": "Ekzem Tracker"` (mixing is acceptable if the brand identity uses "Tracker")
- `"short_name": "Ekzem"` (shorter is better for home screen labels)
- `"description": "Sledovani eliminacni diety pro atopicky ekzem kojence"`

---

#### M4. `user-scalable=no` in Viewport Meta Tag Hurts Accessibility

**Current state:** Phase 0, Step 22 specifies `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">`.

**User impact:** Disabling user zoom (`user-scalable=no`, `maximum-scale=1`) violates WCAG 1.4.4 (Resize Text). Users with low vision cannot zoom into the UI. While common in app-like PWAs, this is a healthcare app where users may need to zoom into medical photos.

**Recommendation:** Remove `maximum-scale=1` and `user-scalable=no`. Instead, use `user-scalable=yes` and `maximum-scale=5`. Prevent unwanted zoom on input focus using CSS (`font-size: 16px` on inputs) rather than disabling zoom entirely.

---

#### M5. No Loading State Design for Encryption-Heavy Operations

**Current state:** The documentation describes several operations with noticeable latency: PBKDF2 key derivation (600K iterations), photo encryption/decryption, gallery thumbnail decryption on scroll, and AI analysis. Phase 3 mentions a 2-second gallery load target and 1-second photo detail target. Phase 4 mentions "Analyzuji..." text.

**User impact:** PBKDF2 at 600K iterations can take 500ms-2s on mobile devices, during which the UI is blocked if run on the main thread. Gallery scrolling with per-thumbnail decryption can feel janky without careful loading state management.

**Recommendation:**
1. Run PBKDF2 in a Web Worker to avoid main-thread blocking. Show an animated lock icon during derivation.
2. For gallery thumbnails, use placeholder shimmer animations (skeleton screens) while decryption is in progress.
3. For AI analysis, show a progress indicator with estimated time remaining rather than just a spinner.
4. For photo detail view, show a blurred low-resolution preview (from the thumbnail) while the full image decrypts.

---

### Suggestions

These are enhancements that would elevate the experience beyond functional.

---

#### SG1. Add a "Quick Log" Widget to the Calendar Page

Rather than requiring the user to tap a day, then navigate to the food grid, then find the category, then toggle -- add a "Quick log" floating action button (FAB) on the calendar page. Tapping it shows a compact bottom sheet with recently-toggled foods for one-tap re-logging. This reduces the most common daily action from 4 taps to 2 taps.

---

#### SG2. Consider a "Today" Summary Dashboard as the Landing Page

The calendar is a good default, but consider a "Today" overview as the root page showing: today's elimination status, whether meals have been logged, when the last photo was taken, and any pending AI analysis. This gives an at-a-glance status that answers "What do I need to do today?" -- the primary question for a parent managing an elimination diet.

---

#### SG3. Add Haptic Feedback for Toggle Actions

When toggling food elimination status (the most frequent micro-interaction), add subtle haptic feedback using the Vibration API (`navigator.vibrate(10)`). This provides tactile confirmation that the toggle registered, which is important for one-handed use when the user cannot focus visually on the screen.

---

#### SG4. Design a "Pediatrician Mode" for Export Review

Before sharing the PDF/Google Doc with the pediatrician, offer a preview mode that shows the report as the doctor will see it. This builds confidence that the export looks professional and contains the right information. Add an option to include a personalized cover note in Czech.

---

#### SG5. Consider Dark Mode for Nighttime Use

Parents of newborns frequently use their phones at night during feedings. A bright white UI at 2am is harsh. Tailwind CSS 4 supports dark mode utilities natively. Design a dark mode variant with a toggle in Settings and auto-detection from the system preference. Prioritize the calendar, food logging, and photo gallery views.

---

#### SG6. Design for Emotional Context

This app is used during one of the most stressful periods of parenthood. Small touches matter:
- When the correlation algorithm detects improvement, show an encouraging message: "Vypada to, ze zmeny ve strave pomahaji!" (It looks like dietary changes are helping!)
- When severity is trending down, celebrate: "Skvelý pokrok za poslednich 7 dni." (Great progress over the last 7 days.)
- Avoid clinical, cold language in empty states and error messages. Use warmth and reassurance.

---

## Design System Assessment

**Current state:** The Tailwind CSS 4 configuration in Phase 0 defines seven custom colors: `primary`, `primary-light`, `surface`, `surface-dark`, `danger`, `success`, `warning`, `text`, `text-muted`. No typography scale, spacing scale, border-radius tokens, shadow tokens, or component patterns are defined. There is no mention of a design system beyond "Tailwind utility classes."

**Gap:** A design system is essential for consistency across 8 implementation phases. Without one, each phase will produce slightly different button sizes, card styles, spacing, and typography.

**Recommendation:** Define the following in Phase 0 (as part of the Tailwind config and a design system document):
- **Typography scale:** 5 sizes (xs, sm, base, lg, xl) with line heights. Base size: 16px for body, 14px for captions, 20px for headings. Use system fonts (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`) for maximum readability and Czech character support.
- **Spacing scale:** Use Tailwind's default 4px base (4, 8, 12, 16, 20, 24, 32, 48, 64).
- **Touch target minimum:** 44x44px (per Apple HIG). Enforce via a utility class.
- **Card pattern:** Define a standard card component with padding, border-radius, shadow, and background.
- **Button variants:** Primary (solid), secondary (outline), danger (red), ghost (no border). All with min-height 44px.
- **Modal/bottom sheet pattern:** Standard overlay with dimmed background, drag handle, snap points.
- **Color contrast:** Verify all text-on-background combinations meet WCAG AA (4.5:1 for normal text, 3:1 for large text). The current `primary: #4f7cac` on `surface: #f8f9fa` background yields a contrast ratio of approximately 3.8:1 -- this fails WCAG AA for normal text and needs to be darkened.

---

## Accessibility Assessment

**Current state:** Accessibility is not mentioned in any documentation. There are no ARIA attributes in any code examples, no color contrast requirements, no screen reader testing plans, no keyboard navigation considerations, and no reduced-motion media query usage.

**Recommendation:**
1. Add an "Accessibility" section to `ui-design.md` covering contrast ratios, focus indicators, screen reader labels, and reduced-motion support.
2. All interactive elements must have visible focus indicators (important for WebAuthn/passkey flows where keyboard navigation is common).
3. Photo gallery thumbnails need `alt` text describing the photo type, body area, date, and severity.
4. Charts need text alternatives (see finding S5).
5. The stool color picker (6 colored buttons) must include text labels, not rely on color alone to convey meaning.
6. Test with VoiceOver on iOS as part of each phase's E2E testing.

---

## Czech Language Considerations

**Current state:** Phase 8 creates a centralized `cs.ts` translation file. Phases 0-7 use inline Czech strings. Czech diacritics (hacky, carky) are used inconsistently in the documentation -- seed data lacks diacritics in some places (`Mlecne vyrobky` vs `Mlecne vyrobky` with proper diacritics), while the SQL seed example uses correct diacritics.

**Recommendation:**
1. Use proper Czech diacritics consistently in all documentation and seed data.
2. Create `cs.ts` in Phase 0 (not Phase 8) and use it from the start. Retrofitting translations across 7 phases is error-prone.
3. Czech text is typically 15-20% longer than English equivalents. Ensure all UI layouts accommodate longer strings (test with the longest labels like "Znovuzavedene" / "Synchronizovano").
4. Czech uses different plural forms (1, 2-4, 5+). The notification text "Cas na kontrolni fotku" is correct, but dynamic strings like "3 fotky" vs "5 fotek" vs "1 fotka" need plural-aware formatting. Add a simple pluralization helper.

---

## Final Verdict

**Is the UX design sufficient to begin implementation?**

**No -- but it is close.** The technical architecture is excellent and UX-friendly (offline-first, fast charts, client-side PDF). The data models reflect genuine clinical understanding. The phase structure is well-sequenced.

What is missing is the UX counterpart to the technical architecture. Specifically:

1. **Blocking:** `ui-design.md` must be created before Phase 1 implementation begins, containing wireframes, navigation flows, and design system basics. (The current plan creates it during Phase 1 -- this needs to be elevated to a prerequisite of Phase 1, not a deliverable of it.)

2. **Blocking:** The dual-passphrase authentication UX must be redesigned. The current approach will cause abandonment during first-use setup.

3. **Blocking:** The primary color (`#4f7cac`) fails WCAG AA contrast on the surface background. This must be fixed in the design system before components are built.

4. **High priority:** Onboarding flow, empty states, and emotional design should be designed before Phase 2, as they affect every subsequent page.

5. **Normal priority:** All other findings (notification tone, photo capture optimization, chart accessibility, offline indicators, collaboration UX) should be addressed within their respective phases.

The project is in an enviable position: the hardest technical decisions are already made and well-documented. Investing 1-2 weeks in UX design before implementation will pay significant dividends in user satisfaction and development efficiency. The deferred UI decisions in Phases 2 and 3 are the right questions to ask -- they just need answers before code is written, not during.

---

## Summary Table

| ID | Severity | Finding | Phase Affected |
|----|----------|---------|----------------|
| C1 | Critical | No UI design document exists | 0-8 (all) |
| C2 | Critical | Dual-password UX burden | 1, 3 |
| C3 | Critical | No onboarding flow | 1 |
| C4 | Critical | Photo capture too many steps | 3 |
| S1 | Significant | Export and Analysis navigation buried | 4, 7 |
| S2 | Significant | Empty/error states not designed | 2-7 |
| S3 | Significant | Notification tone lacks sensitivity | 6 |
| S4 | Significant | Calendar day detail pattern undecided | 2 |
| S5 | Significant | Chart accessibility concerns | 5 |
| S6 | Significant | Offline/sync status not designed | 2 (offline), 8 |
| S7 | Significant | No two-user collaboration UX | 2, 3 |
| M1 | Minor | Ghost overlay needs refinement | 3 |
| M2 | Minor | Severity slider lacks labels | 3 |
| M3 | Minor | PWA manifest in English | 0 |
| M4 | Minor | Viewport blocks user zoom | 0 |
| M5 | Minor | No loading state design | 3, 4 |
| SG1 | Suggestion | Quick log FAB | 2 |
| SG2 | Suggestion | Today summary dashboard | 2 |
| SG3 | Suggestion | Haptic feedback | 2 |
| SG4 | Suggestion | Pediatrician preview mode | 7 |
| SG5 | Suggestion | Dark mode | 0 (tokens), 8 (implementation) |
| SG6 | Suggestion | Emotional design touches | 5, 6 |
