# Product Audit Report: Eczema Tracker PWA

**Date:** 2026-03-25
**Reviewer role:** Senior Product Manager (12+ years consumer health apps)
**Scope:** Full documentation review of `docs/` directory (architecture + phases 0-8)

---

## Executive Summary

The Eczema Tracker PWA is a well-conceived, thoughtfully documented personal health application. The problem space (elimination diet tracking for infant eczema) is genuine and underserved by existing apps. The documentation is unusually thorough for a personal project -- architecture decisions are justified, data models are complete, phase docs have acceptance criteria and test suites, and the encryption scheme is sound.

However, the product definition has several areas that need attention before coding begins. The most critical issue is that **the app does not become meaningfully usable until Phase 3 is complete** (photo diary), with the true value proposition (correlations) not arriving until Phase 5. For a time-sensitive use case (infant eczema peaks at 2-6 months), this creates real risk that the child outgrows the condition before the app delivers value. Additionally, the Google Doc export (Phase 7) adds significant OAuth complexity that is overkill for a personal app, and several data model assumptions deserve scrutiny.

**Verdict: The product definition is sufficient to begin implementation**, but I recommend addressing the "Must-Fix" items below before starting Phase 0, and the "Should-Fix" items before their respective phases.

---

## Findings by Priority

### MUST-FIX BEFORE CODING

#### MF-1: Time-to-Value Is Too Long for a Time-Sensitive Condition

**Analysis:** The app does not become usable for its primary purpose (tracking elimination diet effectiveness) until Phase 2a is complete, which is the 4th implementation unit (after Phase 0, Phase 1, and Phase 2a). The photo comparison feature arrives in Phase 3, AI analysis in Phase 4, and the correlation dashboard -- the app's unique differentiator -- in Phase 5.

Infant eczema triggered by breast milk allergens typically peaks between 2-6 months of age. Many families begin elimination diets at 6-8 weeks. If implementation takes 2-3 weeks per phase, the core value proposition (food-eczema correlation) does not arrive until 10-15 weeks after starting development. If the child is already 2 months old when development begins, they could be 5+ months old before the correlation feature works.

**Recommendation:**
- Reorder to deliver food tracking (Phase 2a) immediately after auth (Phase 1). This is already the current order and is correct.
- Consider shipping Phase 2a as the "MVP launch" and using it on a real phone while continuing development. The simple act of logging eliminations and seeing them on a calendar already provides value.
- Defer Phase 2b (meal logging) entirely until after Phase 5. Meal data is explicitly documented as "contextual display" that does not drive correlations. It adds significant complexity (MealComposer, MealItemPicker, free-text entries, copy-from-yesterday) without advancing the core value loop.
- Move a simplified correlation view into Phase 3 or Phase 4 -- even a basic "days since elimination" counter per food category would help parents without waiting for the full chart dashboard.

---

#### MF-2: Encryption Passphrase UX Creates a Daily Friction Point

**Analysis:** The encryption design requires entering a separate passphrase on every session start (distinct from the login password). For a health app used 1-3 times daily by sleep-deprived new parents, this is a significant usability hurdle. The documentation acknowledges this by planning passkeys in Phase 8, but that is far too late.

The passphrase prompt blocks access to the photo gallery, which is one of the most frequently accessed features. Parents will be entering two credentials (password + passphrase) multiple times a day, on a phone, often one-handed while holding a baby.

**Recommendation:**
- Evaluate whether the session could keep the derived CryptoKey alive for the duration of the 30-day sliding session (stored securely in the browser, not just in-memory JavaScript). The `CryptoKey` object from Web Crypto API is non-extractable by default, which provides some protection.
- Alternatively, prompt for the passphrase once per device rather than once per session, storing the salt and a passphrase-verification token in IndexedDB.
- At minimum, document this UX decision explicitly and plan the passkey integration for Phase 3 (alongside the photo diary) rather than Phase 8. If passkeys are not feasible that early, consider caching the key for the session duration in a way that survives page refreshes (e.g., via a `SessionStorage`-backed approach for the key material).

---

#### MF-3: The Encryption Doc and Auth Doc Contradict on AI Photo Flow

**Analysis:** The encryption doc (encryption.md) states under "AI Analysis":
> "Browser sends decrypted images directly to Claude Vision API" and "The server never handles decrypted photos during analysis."

But the auth doc (auth-overview.md) and the Phase 4 implementation explicitly describe a server-side proxy pattern:
> "Client decrypts photos locally in the browser, sends them to `POST /api/analyze`. Server forwards to Claude Vision API."

The CLAUDE.md, tech-stack.md, and Phase 4 all consistently describe the server proxy approach. The encryption.md's AI Analysis flow diagram is outdated and contradicts the rest of the documentation.

**Recommendation:** Update `docs/architecture/encryption.md` section "AI Analysis" to reflect the server proxy pattern documented everywhere else. The current text misleads any reader about the trust boundary.

---

#### MF-4: Missing Timestamp for "Current Elimination State" Derivation

**Analysis:** The data model defines food elimination state as derived from "the most recent action for each food category." The `FoodLog` entity tracks per-day events, but the `getCurrentEliminationState` repository method has no date parameter -- it presumably looks at the latest action across all time.

This creates a problem: if a mother eliminates dairy on March 1 and reintroduces it on March 15, what is the state on March 10? The current model looks at the latest action (reintroduced on March 15) and would incorrectly show dairy as reintroduced on March 10. The calendar dot calculation and food grid rendering both depend on accurately knowing the state on a specific date.

The Phase 2 food tracking domain service (`getFoodStatus`) does filter by date, but it only checks logs *on that specific date*, not the cumulative state up to that date. If no log exists for March 10, the food shows as "neutral" even though it was eliminated on March 1.

**Recommendation:**
- Redefine `getFoodStatus` to compute cumulative state: "the most recent FoodLog action for this category on or before the given date." This is the semantically correct interpretation of an elimination timeline.
- Add a `date` parameter to `getCurrentEliminationState` in the repository port.
- Update the calendar dot calculation to use cumulative state, not single-day state.

---

### SHOULD-FIX

#### SF-1: Google Doc Export (Phase 7) Is Over-Engineered

**Analysis:** Phase 7 introduces Google OAuth2 with Drive + Docs API integration, including refresh token encryption at rest, resumable uploads, and document update semantics. This is a substantial feature (OAuth flows, token management, Drive API, Docs API with inline images) for a personal app where the alternative (PDF export, already planned) covers the same use case.

The stated benefit is "shareable with the pediatrician via a link." But a PDF can be shared via email, AirDrop, or messaging apps -- all of which Czech parents already use to communicate with their pediatricians. Google Docs adds: (1) a Google account dependency, (2) privacy concerns (photos uploaded to Google Drive), (3) significant implementation effort, and (4) ongoing maintenance (OAuth token refresh, API changes).

**Recommendation:**
- Cut Google Doc export from the initial build entirely. Keep it as a "Future Enhancement" in the docs.
- The PDF export is sufficient and more privacy-friendly (photos never leave the client).
- If sharing is important, add a "Share via..." button that uses the Web Share API to share the PDF file directly. This is already planned in Phase 7 and takes minutes to implement.
- If Google Doc export is truly needed later, it can be added as a Phase 9.

---

#### SF-2: Stool Tracking Feels Bolted On

**Analysis:** The stool tracking feature was added to the `TrackingPhoto` entity as additional nullable fields (stoolColor, stoolConsistency, hasMucus, hasBlood). While the unified entity avoids a second table, the AI analysis for stool uses a completely different prompt, different result schema (`StoolAnalysisResult`), and different clinical significance than skin photos.

More importantly, the correlation algorithm in Phase 5 uses only `manualSeverity` (which is a skin-specific field) for computing severity averages. Stool quality changes are not incorporated into the correlation detection at all. This means:
- Parents track stool photos and metadata
- AI analyzes stool changes
- But correlations ("dairy elimination led to better stools") are never surfaced automatically

The stool timeline chart in Phase 5 is mentioned briefly ("1b. Stool quality timeline") but the correlation algorithm does not use stool data.

**Recommendation:**
- Either extend the correlation algorithm to include stool quality metrics (e.g., green stool = higher "severity equivalent"), or clearly document that stool correlation is manual/visual only and not part of the automated detection.
- Consider adding a simple "stool quality score" (1-5) analogous to the skin severity score, which the correlation engine could consume.

---

#### SF-3: No Data Migration or Schema Evolution Strategy Beyond Migrations

**Analysis:** The migration system is well-designed for PostgreSQL (sequential numbered SQL files, idempotent). However, the Dexie.js local database also has a schema that evolves across phases, and there is no documented strategy for:
- What happens when a user upgrades the PWA and the Dexie schema version changes
- How to handle data in IndexedDB that predates a schema change
- Whether a full re-sync from server is required after a schema upgrade

Dexie.js does support schema versioning (`this.version(N).stores(...)`) with upgrade hooks, but this is only briefly shown in Phase 0 with `version(1)`. No subsequent phases mention bumping the Dexie version or writing upgrade hooks.

**Recommendation:** Add a section to the offline strategy doc or a dedicated doc covering Dexie schema evolution, including:
- When to bump the version number
- How to write upgrade hooks for data transforms
- Whether to trigger a full re-sync after schema changes

---

#### SF-4: Missing "Undo" for Accidental Food Log Actions

**Analysis:** The food toggle cycles through neutral -> eliminated -> reintroduced -> neutral. On a touch screen, accidental taps are common. An accidental elimination or reintroduction creates a `FoodLog` record with a timestamp, which then affects:
- The calendar dot display
- The correlation algorithm's detection windows
- The AI analysis context (food changes between photo dates)

There is no undo, no confirmation dialog for food toggles, and deleting a food log entry requires navigating through the API. A single accidental tap on "reintroduce dairy" could create a false signal in the correlation engine days later.

**Recommendation:**
- Add a brief toast with an "Undo" action (3-5 second window) after each food toggle.
- Alternatively, add a confirmation dialog for reintroduction events specifically, since those have larger clinical significance than eliminations.

---

#### SF-5: Body Area List Inconsistency Between Docs

**Analysis:** The TrackingPhoto model in data-models.md defines body areas as: `'face' | 'arms' | 'legs' | 'torso' | 'hands' | 'other'`. Phase 3 repeats this list. But Phase 8's Czech translation file lists: `face, arms, legs, torso, hands, feet, neck, scalp` -- eight areas instead of six, with different items (feet, neck, scalp instead of other).

Phase 7's PDF builder uses yet another list: `face, arms, legs, torso, hands, feet, neck, scalp` matching Phase 8 but not the data model.

**Recommendation:** Reconcile body area lists across all docs. The expanded list (8 areas) from Phase 8 is clinically more useful for infant eczema (scalp cradle cap, neck folds are common sites). Update the data model and Phase 3 to match.

---

#### SF-6: Correlation Algorithm Has No Confounding Variable Awareness

**Analysis:** The correlation algorithm detects "severity improved within 5-14 days of eliminating food X" and marks it as a potential trigger. However, if three foods are eliminated simultaneously (common in aggressive elimination diets), all three will be flagged equally. The documentation acknowledges this in test case #7 ("Both detected; algorithm does not attempt to distinguish which food caused improvement") but does not surface this limitation to users.

For a parent, seeing "Dairy elimination correlated with improvement" and "Wheat elimination correlated with improvement" and "Egg elimination correlated with improvement" all at once is confusing and could lead to incorrect reintroduction decisions.

**Recommendation:**
- When multiple eliminations overlap in their response windows, add a callout like "Pozor: Bylo eliminovano vice potravin soucasne. Nelze urcit, ktera zpusobila zlepseni." (Warning: Multiple foods were eliminated simultaneously. Cannot determine which one caused the improvement.)
- Consider recommending a sequential elimination strategy in the app's onboarding or help text.

---

#### SF-7: No Guidance on When to Start or What a "Normal" Timeline Looks Like

**Analysis:** The app tracks what happens but provides no guidance on:
- How long to wait before concluding an elimination "worked" (the algorithm uses 5-14 days, but users don't see this)
- What a typical elimination diet timeline looks like
- When it's reasonable to start reintroduction
- What severity scores mean in practice

For first-time parents dealing with infant eczema, the app assumes significant prior knowledge about elimination diets.

**Recommendation:**
- Add a simple onboarding flow or help section explaining the elimination diet process in Czech
- Show the algorithm's window (5-14 days) in the UI, e.g., "Cekejte alespon 5-14 dni po eliminaci na vyhodnoceni" (Wait at least 5-14 days after elimination to evaluate)
- Consider adding a "recommended next step" based on current state (e.g., "Dairy eliminated 12 days ago, no improvement detected. Consider reintroducing and trying eggs next.")

---

### NICE-TO-HAVE

#### NH-1: No Account Deletion or Data Export (GDPR)

**Analysis:** Even for a personal app, there is no documented way to:
- Delete an account and all associated data
- Export all personal data in a portable format
- Handle the scenario where the child outgrows eczema and the parents want to archive or purge the data

The `DELETE /api/children/[id]` cascades to food logs and photos, but there is no "delete my entire account" endpoint or UI.

**Recommendation:** Add an account deletion feature to the Settings page (Phase 1 or Phase 8) that:
- Deletes all children, food logs, photos (both server files and DB records), analysis results, sessions, and the user record
- Provides a data export option before deletion (JSON dump of all structured data)

---

#### NH-2: No Rate Limiting on Photo Upload

**Analysis:** The Nginx rate limiting covers auth endpoints (5/min) and general API endpoints (30/min), but photo uploads are large multipart requests that could consume significant server resources. A malicious or buggy client could upload hundreds of encrypted blobs.

**Recommendation:** Add a separate rate limit for `POST /api/photos` (e.g., 10 uploads/min) and a per-user daily upload quota (e.g., 50 photos/day).

---

#### NH-3: PDF Export Could Be Very Large

**Analysis:** The PDF embeds decrypted photos as base64 images. A 30-day report with 30 photos at ~500KB each means ~15MB of photo data, which becomes ~20MB in base64. The pdfmake library processes this entirely in the browser's memory.

**Recommendation:**
- Add a photo count/size warning when the estimated PDF size exceeds 10MB
- Consider offering a "with thumbnails only" option for smaller PDFs
- The acceptance criterion says "under 10 seconds" but should also specify a maximum photo count or file size expectation

---

#### NH-4: No Mechanism for Second Parent to Link to Existing Child

**Analysis:** The data model supports multiple parents per child via `user_children`, and the auth doc mentions both parents sharing the encryption passphrase. But there is no documented flow for:
- Parent B registering and linking to the same child that Parent A created
- Sharing the child without sharing the password

The implicit assumption is both parents share one account, but the data model has a full many-to-many relationship.

**Recommendation:** Add a "Link partner" flow:
- Parent A generates an invite code or link
- Parent B registers and enters the code to link to the existing child
- Both parents share the encryption passphrase out-of-band (already documented)

Or simplify: document that both parents share a single account with the same login credentials, and remove the multi-user complexity from the data model.

---

### OBSERVATIONS

#### OB-1: The Architecture Is Over-Engineered (Intentionally) and That Is Fine

The Ports & Adapters architecture with full port interfaces, adapter factories, and dependency injection is unusual for a 2-user personal app. However, the documentation explicitly justifies this as (a) a learning exercise, (b) enabling future adapter swaps (SQLite, GPT-4V, S3), and (c) improved testability. Given that these benefits are clearly understood and the overhead is in design time rather than runtime, this is a reasonable choice.

---

#### OB-2: Phase 1 UI Design Review Is a Smart Decision

Deferring UI decisions (bottom sheet vs. page, meal composer layout, gallery layout) to real-device testing in Phase 1 is excellent product practice. This avoids designing in a vacuum and ensures the app feels right on an iPhone before committing to patterns used in Phases 2-7.

---

#### OB-3: The Offline-First Strategy Is Well-Thought-Out

Last-write-wins conflict resolution is appropriate for a 2-user app. The sync triggers (online event, 60s poll, app focus, post-mutation debounce) cover real-world usage patterns. The documentation correctly identifies that photo blobs need special handling (Dexie for thumbnails, optional full-size caching with eviction).

---

#### OB-4: Seed Data Coverage Is Good but Missing One Common Allergen

The 12 food categories cover the major allergens, but sesame (sezam) is notably absent. Sesame is a recognized top allergen in the EU (Regulation 1169/2011) and is relevant for breastfeeding elimination diets. The "Other" category can cover it, but a dedicated category would be more useful.

---

#### OB-5: The Test Suites Are Uncommonly Thorough

Each phase includes unit tests, integration tests, E2E/manual tests, and regression checks. The test cases cover edge cases (empty arrays, boundary values, cross-user access). This level of test planning before code exists is unusual and will pay dividends during implementation.

---

#### OB-6: README Has a Duplicate Link

The docs/README.md architecture table has `auth-overview.md` listed twice (lines 39-40 in the original). Minor doc issue.

---

## Summary Table

| Priority | ID | Finding | Phase Affected |
|----------|-----|---------|----------------|
| Must-Fix | MF-1 | Time-to-value too long; defer meal logging | Phase 2b, Phase 5 |
| Must-Fix | MF-2 | Encryption passphrase UX is daily friction | Phase 3, Phase 8 |
| Must-Fix | MF-3 | Encryption doc contradicts server proxy pattern | Architecture docs |
| Must-Fix | MF-4 | Food status derivation is day-specific, not cumulative | Phase 2, data models |
| Should-Fix | SF-1 | Google Doc export is over-engineered | Phase 7 |
| Should-Fix | SF-2 | Stool data not used in correlation algorithm | Phase 5 |
| Should-Fix | SF-3 | No Dexie schema evolution strategy | Offline strategy doc |
| Should-Fix | SF-4 | No undo for accidental food toggles | Phase 2 |
| Should-Fix | SF-5 | Body area list inconsistency across docs | Phase 3, Phase 7, Phase 8 |
| Should-Fix | SF-6 | Correlation needs confounding variable warning | Phase 5 |
| Should-Fix | SF-7 | No user guidance on elimination diet process | Phase 2 or onboarding |
| Nice-to-Have | NH-1 | No account deletion / data export | Phase 8 |
| Nice-to-Have | NH-2 | No rate limiting on photo uploads | Phase 3 |
| Nice-to-Have | NH-3 | PDF export could be very large | Phase 7 |
| Nice-to-Have | NH-4 | No flow for second parent to link to child | Phase 1 |
| Observation | OB-1 | Architecture over-engineering is intentional | -- |
| Observation | OB-2 | Deferred UI decisions are smart | Phase 1 |
| Observation | OB-3 | Offline-first strategy is solid | -- |
| Observation | OB-4 | Sesame missing from allergen categories | Phase 1 seed data |
| Observation | OB-5 | Test suites are thorough | -- |
| Observation | OB-6 | README has duplicate link | docs/README.md |

---

## Final Verdict

**Is the product definition sufficient to begin implementation? Yes, with caveats.**

The documentation is among the most thorough I have seen for a personal project. The problem is real, the user scenarios are grounded (parents tracking a baby's eczema), and the technical architecture is sound. The phase breakdown is logical and each phase has clear acceptance criteria.

However, four issues should be addressed before writing code:

1. **Fix the food status derivation logic** (MF-4) -- this is a data model correctness issue that affects the core value of the app.
2. **Update the encryption doc** (MF-3) -- a 10-minute fix that prevents confusion during implementation.
3. **Plan the passphrase UX carefully** (MF-2) -- this will determine whether the app is pleasant to use daily.
4. **Decide on meal logging deferral** (MF-1) -- removing Phase 2b from the initial build sequence saves 1-2 weeks and gets to correlations faster.

With these addressed, implementation can begin confidently with Phase 0.
