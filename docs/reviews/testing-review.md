# QA/Testing Audit Report: Eczema Tracker PWA

**Reviewer:** Senior QA Engineer / Test Architect
**Date:** 2026-03-25
**Scope:** All documentation in `docs/` -- architecture docs and phase docs (0-8)
**Project state:** Documentation only, no code implemented yet

---

## Executive Summary

The Eczema Tracker PWA documentation is unusually thorough for a pre-implementation project. Every phase document includes a dedicated "Test Suite" section with unit tests, integration tests, E2E/manual tests, and regression checks. The hexagonal architecture (Ports & Adapters) is inherently testable, with clean port interfaces that are straightforward to mock. The chosen test stack (Vitest + @testing-library/svelte + Playwright) is well-suited to the project.

However, the documentation reveals several testing gaps that range from critical to minor. The most significant are: (1) no dedicated test infrastructure document or overall test strategy, (2) no CI/CD pipeline definition, (3) no cross-device/cross-browser test matrix, (4) incomplete offline and sync conflict test coverage, (5) no test data factory or fixture strategy, and (6) no guidance for testing camera/media hardware in automated pipelines.

**Verdict:** The test specifications per phase are strong enough to begin implementation, but an overarching test strategy document and CI pipeline definition should be created before or during Phase 0 to avoid accumulating test debt. The identified gaps are addressable and none are blockers for starting development.

---

## Findings by Priority

### Critical Gap

#### CG-1: No Overall Test Strategy Document

**Current coverage:** Each phase document defines its own tests. The tech stack doc (`tech-stack.md`) names the tools (Vitest, @testing-library/svelte, Playwright). CLAUDE.md references "Vitest + @testing-library/svelte for unit/component tests, Playwright for E2E."

**Gap analysis:** There is no `docs/architecture/testing-strategy.md` or equivalent document that defines:
- The testing pyramid targets (e.g., 70% unit / 20% integration / 10% E2E).
- Where each test type runs (Node.js via Vitest? Browser via Playwright? Both?).
- How tests interact with the database (dedicated test DB? Transaction rollback? In-memory?).
- Test naming and file location conventions.
- What constitutes a passing test gate before merging.
- Coverage thresholds (line, branch, statement).
- How to run the full test suite locally vs in CI.
- Mock vs real dependency boundaries.

**Recommendation:** Create `docs/architecture/testing-strategy.md` as part of Phase 0 or immediately before it. Define the pyramid, conventions, database strategy, and CI gate criteria. This becomes the single reference for all test decisions and prevents ad-hoc inconsistencies across phases.

---

#### CG-2: No CI/CD Pipeline Definition

**Current coverage:** None. No mention of GitHub Actions, GitLab CI, or any automated test runner in any document. The deployment doc covers manual `docker compose up` and `git pull` workflows.

**Gap analysis:** Without a CI pipeline, tests become an honor system. Regressions will creep in as later phases modify shared infrastructure (Dexie schema, port interfaces, API routes). For a personal project this is less severe than for a team project, but the documentation's own regression checklists (present in every phase) imply an expectation of automated verification.

**Recommendation:** Add a CI pipeline definition to Phase 0 or Phase 1. Minimum viable pipeline:
1. `npx tsc --noEmit` -- type check.
2. `npx vitest run` -- unit and integration tests.
3. `npm run build` -- verify the build succeeds.
4. Optionally: `npx playwright test` for critical E2E paths.

Even a local script (`scripts/test-all.sh`) that runs these steps sequentially would be a significant improvement over nothing.

---

### Major Gap

#### MG-1: No Test Data Factory or Fixture Strategy

**Current coverage:** Each test case describes creating test data inline (e.g., "Register a user, create a child, create food logs..."). Integration tests in Phase 1 repeat user registration + login boilerplate across 18+ test cases.

**Gap analysis:** Without shared test factories, every integration and E2E test will contain duplicated setup code. This makes tests fragile (changing the User schema requires updating dozens of tests) and slow to write. The data models are complex -- 13+ entity types with foreign key relationships, and photos require encryption setup.

**Recommendation:** Create a `tests/factories/` directory as part of Phase 0 scaffold with:
- `createTestUser(overrides?)` -- returns a registered user with session cookie.
- `createTestChild(userId, overrides?)` -- returns a child linked to the user.
- `createTestFoodLog(childId, overrides?)` -- returns a food log entry.
- `createTestPhoto(childId, overrides?)` -- returns an encrypted photo with metadata.
- `createTestAnalysis(childId, photo1Id, photo2Id, overrides?)` -- returns an analysis result.
- `seedFoodCategories()` -- ensures seed data exists.
- `getAuthenticatedClient(user)` -- returns a fetch wrapper with session cookie.

This dramatically reduces test boilerplate and makes the data model changes manageable.

---

#### MG-2: Offline and Sync Conflict Testing Is Under-Specified

**Current coverage:** Phase 2 includes manual E2E tests for basic offline mode (toggle offline in DevTools, create data, go online, verify sync). Phase 3 has "Offline capture" and "Offline sync" manual tests. The offline strategy doc defines the sync engine, conflict resolution (last-write-wins), and triggers.

**Gap analysis:**
1. **No automated offline tests.** All offline testing is manual (DevTools offline toggle). Service worker behavior, Dexie-to-server sync, and conflict resolution are untested at the unit/integration level.
2. **Conflict resolution has no test cases.** The offline strategy doc describes last-write-wins by `updatedAt`, but no phase document includes a test case where two users edit the same record and verify which version wins.
3. **Sync failure recovery is untested.** What happens when a sync push to the server returns 500? 413 (payload too large for a photo)? Connection timeout mid-upload? The `SyncEngine` code outline has a `try/finally` but no retry logic tests.
4. **IndexedDB quota exhaustion is not addressed.** Storing encrypted photo blobs in Dexie could exceed storage limits on some devices. No test for this scenario.
5. **Service worker update flow is untested.** The PWA uses `registerType: 'autoUpdate'` but no test verifies that a new service worker activates correctly without breaking cached data.

**Recommendation:**
- Add unit tests for `SyncEngine.pushPendingChanges()` and `SyncEngine.pullServerChanges()` with mocked network responses (success, 500, timeout, partial failure).
- Add an integration test for the conflict scenario: two clients modify the same `FoodLog`, both push; verify the server has the expected winner.
- Add a unit test for `syncedAt` state transitions (null -> timestamp on success, stays null on failure).
- Add a manual test for service worker update (deploy a new version, verify existing cached pages update).
- Document expected behavior for IndexedDB quota pressure (evict full-size blobs, keep thumbnails, surface a Czech-language warning).

---

#### MG-3: No Cross-Device/Cross-Browser Test Matrix

**Current coverage:** The tech stack doc lists minimum browser versions (iOS Safari 16.4+, Android Chrome 120+). The deployment doc explains real-device testing via mkcert. Phase 8 has spot-check tests for iPhone SE and iPhone 15 Pro Max. But no formal test matrix exists.

**Gap analysis:** The app targets a specific matrix:
- iPhone Safari (primary -- PWA installed to home screen)
- Android Chrome (secondary)
- Desktop Chrome/Firefox (development/admin)

There is no document that defines:
- Which features are tested on which device/browser combinations.
- Whether Playwright's WebKit engine is considered equivalent to real iOS Safari testing (it is not, especially for PWA features, camera, and Web Push).
- How many physical devices are in the test fleet.
- Whether BrowserStack or similar is planned for broader coverage.

**Recommendation:** Add a test matrix table to the testing strategy doc. At minimum:

| Feature | iPhone Safari (real) | Android Chrome (real) | Playwright Chromium | Playwright WebKit |
|---|---|---|---|---|
| PWA install | Manual | Manual | N/A | N/A |
| Camera capture | Manual | Manual | N/A | N/A |
| Web Push | Manual | Manual | N/A | N/A |
| Food tracking | Manual + E2E | Manual | E2E | E2E |
| Encryption round-trip | Manual | Manual | Unit | Unit |
| Offline sync | Manual | Manual | N/A | N/A |
| PDF export | Manual | Manual | E2E | N/A |

This clarifies what can be automated vs what requires physical devices.

---

#### MG-4: Camera and Media Testing Has No Automation Strategy

**Current coverage:** Phase 3 lists 15 E2E/manual tests for camera functionality, ghost overlay, photo capture, gallery, and comparison. All are manual.

**Gap analysis:** Camera-related features (getUserMedia, canvas resize, ghost overlay rendering) are inherently difficult to automate. However, several sub-operations are testable:
- Image resize/compression (`resizeImage`, `compressJpeg`, `createThumbnail`) -- these are tested in Phase 3 unit tests. Good.
- Ghost overlay logic (find most recent photo of same type/area, decrypt thumbnail) -- not tested as a unit.
- Camera permission handling (granted, denied, unavailable) -- not tested.
- The `CameraCapture.svelte` component itself -- no component test exists.

**Recommendation:**
- The image utility unit tests (Phase 3) are well-specified. Keep those.
- Add component tests for `CameraCapture.svelte` using a mocked `getUserMedia` (return a static video stream). Test: renders video element, calls getUserMedia with `facingMode: 'environment'`, handles permission denied, calls capture callback on button press.
- Add a unit test for ghost overlay photo selection logic (given a set of photos, returns the most recent matching type + body area).
- Accept that full camera E2E testing must remain manual on real devices.

---

#### MG-5: AI Integration Testing Strategy Is Incomplete

**Current coverage:** Phase 4 has 12 unit tests for `ClaudeVisionAnalyzer` (response parsing, error handling) and 9 integration tests for the analysis results API. Tests use mocked API responses.

**Gap analysis:**
1. **No test fixtures for Claude API responses.** The tests describe expected behavior ("valid API response with correct JSON") but do not provide sample fixture files. When Claude's response format changes (it will), having baseline fixtures makes regression detection trivial.
2. **No contract test against the real Claude API.** While mocking is correct for CI, there should be at least one smoke test that hits the real API to verify the prompt still produces parseable output. This could run manually or on a schedule.
3. **Server-side proxy (`POST /api/analyze`) testing is incomplete.** The integration tests for analysis results cover `POST /api/analysis` (storing results) but not `POST /api/analyze` (the proxy). How is the proxy tested? With a mocked Claude API? The phase doc describes the server-side code but no integration test specifically for the proxy route.
4. **Memory safety of the proxy is untested.** The docs emphasize that "photos are held in memory only during the request." No test verifies that photo data is not retained (difficult but could be approximated by checking response timing or memory profiling).
5. **The encryption doc and Phase 4 have a discrepancy about the AI call path.** The encryption doc says "browser sends decrypted images directly to Claude Vision API" (client-side), but the Phase 4 implementation (and auth-overview.md) correctly describes a server proxy. This inconsistency should be fixed in the encryption doc; it could cause a tester to write tests for the wrong architecture.

**Recommendation:**
- Create `tests/fixtures/claude-responses/` with sample JSON responses (valid skin, valid stool, malformed, markdown-wrapped, extra fields, missing fields).
- Add an integration test for `POST /api/analyze` with a mocked Anthropic API endpoint (using MSW or a local HTTP mock).
- Fix the encryption doc's AI analysis diagram to match the server proxy architecture.
- Add a periodic manual test: send a real pair of photos to Claude and verify the response parses correctly.

---

### Minor Gap

#### mG-1: Encryption Testing Could Be More Thorough

**Current coverage:** Phase 3 specifies 9 unit tests for the encryption module: round-trip, wrong passphrase, determinism, different salts, salt length, IV length, IV uniqueness, empty buffer, large payload performance. This is solid.

**Gap analysis:**
- **AAD (Additional Authenticated Data) is not tested.** The encryption doc describes AAD as `childId + ":" + photoId` bound to the ciphertext. No test verifies that decryption with mismatched AAD fails. (Phase 3's encrypt/decrypt code sketch does not include AAD, while the architecture encryption doc does. This is an implementation discrepancy that needs resolution.)
- **Key non-extractability is not tested.** The `deriveKey` function sets `extractable: false`. A test should verify that `crypto.subtle.exportKey('raw', key)` throws.
- **Cross-session key consistency is not tested.** A test should derive a key, encrypt data, then in a new derivation call with the same passphrase+salt, decrypt the data. (Test 3 partially covers this but describes "identical ciphertext when IV is fixed," which tests determinism, not the practical round-trip across sessions.)
- **Passphrase strength validation has no test.** The acceptance criteria require a 12-character minimum, but no unit test verifies this.

**Recommendation:** Add the following tests to the encryption test suite:
- Encrypt with AAD, decrypt with same AAD succeeds.
- Encrypt with AAD, decrypt with different AAD fails with `OperationError`.
- Encrypt with AAD, decrypt without AAD fails.
- `deriveKey` returns a non-extractable key.
- Passphrase validation rejects strings shorter than 12 characters.
- Passphrase strength indicator returns correct level for weak/medium/strong inputs.

---

#### mG-2: Performance Testing Is Ad-Hoc

**Current coverage:** Scattered performance requirements exist:
- Phase 3: "Gallery page loads within 2 seconds on 4G," "Photo detail decrypts within 1 second."
- Phase 5: "Dashboard loads within 3 seconds for 90 days of data."
- Phase 7: "PDF generation under 10 seconds for 30 days with 10 photos," "Memory does not spike above 200MB."
- Phase 3: "5 MB encryption completes within 2 seconds."

**Gap analysis:** These are good targets but:
1. **No performance test runner or benchmarking tool is identified.** How are the 2-second and 3-second thresholds measured? Manual stopwatch? Lighthouse? Playwright's performance timing API?
2. **No baseline measurement methodology.** "4G connection" is vague -- what throttling profile? Chrome DevTools "Good 3G" vs "Regular 4G"?
3. **No regression detection.** Without automated perf benchmarks, a slow regression in encryption or gallery rendering will not be caught until manual testing.
4. **Encryption overhead for bulk operations is not tested.** Decrypting 50 thumbnails for the gallery is a bulk operation. The per-photo 1-second target is fine, but what is the aggregate gallery render time with 50+ photos?

**Recommendation:**
- Define throttling profiles in the test strategy doc (e.g., "4G = Chrome DevTools Fast 3G profile").
- Use Playwright's `page.evaluate(() => performance.now())` for automated timing of critical paths.
- Add a benchmark test: decrypt N thumbnails, measure total time, assert under threshold.
- Consider running Lighthouse CI as part of the pipeline for PWA score, performance score, and accessibility score.

---

#### mG-3: Security Testing Beyond Encryption Is Missing

**Current coverage:** The encryption doc has a thorough threat model. Auth-overview.md documents bcrypt rounds, session cookie flags, rate limiting, and CSRF protection. The Nginx config includes security headers.

**Gap analysis:** No phase document includes security-focused test cases for:
- **SQL injection:** The postgres.js tagged template API prevents injection by design, but no test explicitly attempts injection (e.g., `email: "'; DROP TABLE users; --"`).
- **XSS:** No test verifies that user-supplied `notes` fields in food logs or custom meal item names are properly escaped in the UI.
- **CSRF:** SvelteKit checks the `Origin` header automatically, but no test verifies this behavior.
- **Session fixation:** No test verifies that a new session ID is generated on login (not reusing a pre-existing cookie value).
- **Rate limiting:** The Nginx config defines rate limits but no test verifies they work (5 req/min for auth, 30 req/min for API).
- **Auth bypass:** No test attempts to access `POST /api/analyze` with a forged session cookie or expired session.

**Recommendation:** Add a security test section to the testing strategy or to Phase 8 (polish). Include:
- An integration test that sends SQL injection payloads via API inputs and verifies no data leakage or errors.
- A component test that renders user-supplied HTML in `notes` fields and verifies it is escaped.
- An integration test that sends a POST without an `Origin` header and verifies rejection.
- An integration test that uses an expired session cookie and verifies 401.
- A manual test for rate limiting (send 6 rapid login attempts, verify 429 on the 6th).

---

#### mG-4: Accessibility Testing Is Not Addressed

**Current coverage:** None. No document mentions WCAG, screen readers, or accessibility testing.

**Gap analysis:** While this is a personal app for two users, the testing documentation should at minimum acknowledge accessibility basics:
- Touch target sizes (the deployment doc mentions this in the context of UX, but no test).
- Color contrast for the severity indicators (red/yellow/green dots).
- `aria-label` on icon-only buttons (the bottom nav tabs, camera capture button).
- Keyboard navigation on desktop.

**Recommendation:** Add a lightweight accessibility checklist to Phase 8 or the testing strategy:
- All interactive elements have `aria-label` or visible text.
- Color is not the only indicator for status (the dot tiers also vary in position/size, not just color).
- Touch targets are at least 44x44px (Apple HIG guideline).
- Run `axe-core` or Lighthouse accessibility audit once and fix critical issues.

---

#### mG-5: Google Doc Export Testing Is Heavily Mocked

**Current coverage:** Phase 7 specifies 11 unit tests for the Google Docs adapter with mocked Google API, plus 9 integration tests for the OAuth flow and export endpoints.

**Gap analysis:** The Google API integration is inherently difficult to test end-to-end. The mocking strategy is appropriate. However:
- **No test for token refresh failure.** What happens when the stored refresh token is revoked by the user from Google's side? The adapter should handle 401 from Google gracefully.
- **No test for Drive quota limits.** Google Drive has upload limits. No test for what happens when the upload fails due to quota.
- **No test for partial export failure.** What if 3 of 5 photo uploads succeed but the 4th fails? Is the document created without the missing photo? Is it rolled back?
- **The privacy notice test is only E2E.** AC-22 requires a privacy notice before first Google export. No component test for the confirmation dialog.

**Recommendation:**
- Add unit tests for refresh token expiration (adapter receives 401, surfaces a "reconnect Google" message).
- Add a unit test for partial photo upload failure (strategy: skip failed photos and continue, or abort with error).
- Add a component test for the Google export privacy notice dialog.

---

#### mG-6: Push Notification Testing on iOS Is Inherently Limited

**Current coverage:** Phase 6 includes iOS-specific E2E tests: detect installed vs non-installed PWA, show appropriate UI, verify push works in standalone mode. The `ios-detection.ts` utility has 3 unit tests.

**Gap analysis:**
- **iOS push notifications cannot be automated.** This is a platform limitation, not a documentation gap. The manual tests are appropriate.
- **No test for notification payload size limits.** Web Push has a ~4KB payload limit. No test ensures payloads stay within limits.
- **No test for notification permission revocation.** What happens when the user revokes notification permission in iOS settings? The app should detect this and update the UI.
- **Timezone handling for reminders is untested.** The cron scheduler uses `HH:MM` time matching but does not account for the server timezone vs user timezone. If the server is in UTC and the user is in CET (UTC+1), the 20:00 reminder fires at 19:00 local time.

**Recommendation:**
- Add a unit test for notification payload size (serialize the payload and assert `JSON.stringify(payload).length < 4000`).
- Add a unit test for the `checkSubscription()` function when the subscription is null (permission revoked).
- Document the timezone assumption (server and users in the same timezone) or implement timezone-aware scheduling with a test.

---

#### mG-7: Dexie Schema Migration Testing Is Absent

**Current coverage:** Phase 0 defines the initial Dexie schema (version 1). No phase addresses what happens when the schema needs to change.

**Gap analysis:** As features are added across phases, the Dexie schema may need modifications (new tables, new indexes, column additions). Dexie supports versioned schemas with upgrade functions, but:
- No test verifies that opening a Dexie database at version N with existing version N-1 data performs the migration correctly.
- No test for downgrade scenarios (user visits with a newer cached app version, then reverts).
- The `trackingPhotos` table gains stool-specific fields in Phase 3 that did not exist in Phase 0. How is this migration handled?

**Recommendation:**
- Add a section to the testing strategy doc about Dexie schema versioning.
- For each schema version bump, write a migration test: create a DB at version N-1, populate with test data, open at version N, verify data is preserved and new indexes work.

---

### Enhancement

#### E-1: Test Documentation Format Is Inconsistent

**Current coverage:** Phases 0-2 use markdown tables for test cases. Phases 3-4 use a mix of tables and prose. Phases 5-8 use numbered prose lists.

**Recommendation:** Standardize on one format. The table format from Phase 0-2 is the most scannable:

| # | Test Case | Details |
|---|---|---|
| 1 | Description | Assertions |

---

#### E-2: No Visual Regression Testing

**Current coverage:** None.

**Gap analysis:** The app has significant visual components: calendar grid, food category icons, severity badges, photo gallery, trend charts. A layout regression (e.g., Tailwind class conflict after an upgrade) would be caught only by manual review.

**Recommendation:** Consider adding Percy, Playwright visual comparisons, or screenshot-based regression tests for critical views (calendar, gallery, trends dashboard). This is a "nice to have" for a personal app but valuable for rapid iteration.

---

#### E-3: No Load/Stress Testing for Server API

**Current coverage:** Phase 0 has a test for "5 concurrent PostgreSQL connections." No other load testing is mentioned.

**Gap analysis:** With only 2 users, load testing is not critical. However, photo upload (encrypted blobs up to ~5MB) and AI analysis (proxying large payloads to Claude) could cause issues under specific conditions (e.g., both parents uploading photos simultaneously while a background sync pushes queued entries).

**Recommendation:** A single manual test is sufficient: simulate both parents uploading photos simultaneously and verify no errors. This does not need automation for a 2-user app.

---

#### E-4: No Test for Database Backup Integrity

**Current coverage:** Phase 8 specifies a "Full backup and restore cycle" integration test. The backup script creates encrypted dumps.

**Gap analysis:** The test covers the happy path (backup, wipe, restore, verify). It does not cover:
- Restoring a backup from a different schema version (e.g., restoring a Phase 4 backup into a Phase 6 schema).
- Verifying encrypted backup file integrity (decrypt + decompress without errors).
- Testing the backup retention cleanup (7 daily + 4 weekly).

**Recommendation:** The Phase 8 backup script unit tests (items 5-6) partially address retention. Add a test that attempts to decrypt and decompress a backup file and verifies it contains valid SQL.

---

## Testability Assessment of Architecture

### Strengths

1. **Hexagonal architecture is highly testable.** Every domain service depends on port interfaces, not concrete adapters. Unit tests can use mock implementations (e.g., `InMemoryRepository`, `MockAnalyzer`, `NoopNotificationService`). The architecture doc explicitly calls out testability as a design goal.

2. **Clear domain/adapter separation.** Domain services (`FoodTrackingService`, `PhotoDiaryService`, `AnalysisService`, `ExportService`) contain pure business logic with no I/O. These are trivially testable with Vitest.

3. **Typed error hierarchy.** The `DomainError` → `DecryptionError` / `NetworkError` / `RateLimitError` / `ValidationError` hierarchy makes error condition testing explicit and type-safe.

4. **Port interfaces are well-defined and mockable.** `DataRepository` has 20+ methods with typed parameters and return values. `EczemaAnalyzer` has 2 methods. `PhotoStorage` has 5 methods. `NotificationService` has 5 methods. All of these are straightforward to mock.

5. **Offline-first design with explicit sync state.** The `syncedAt` field on `FoodLog` and `TrackingPhoto` provides a clear signal for testing sync behavior: null = pending, timestamp = synced.

### Weaknesses

1. **Client/server split complicates integration testing.** SvelteKit runs code in two contexts. The adapter factory creates different adapters for server vs client. Testing the full stack requires either a running SvelteKit server or careful test environment setup. No document addresses this.

2. **Encryption key availability in tests.** Test scenarios involving encrypted photos require a valid CryptoKey. Tests need a helper to derive a test key from a known passphrase and salt. This is not addressed.

3. **Dexie.js testing in Node.js.** Dexie requires IndexedDB, which is not natively available in Node.js. The Phase 0 Dexie tests imply running in a browser-like environment (e.g., `fake-indexeddb`). This dependency is not documented.

---

## Summary of Test Case Counts by Phase

| Phase | Unit Tests | Integration Tests | E2E/Manual Tests | Regression Checks |
|---|---|---|---|---|
| 0 - Scaffold | 12 | 3 | 4 scripts | 10 baseline |
| 1 - Auth | 9 | 18 | 4 scripts | 10 |
| 2 - Food Tracker | 37 | 12 | 6 scripts | (uses Phase 0/1) |
| 3 - Photo Diary | 22 | 7 | 15 scenarios | 6 |
| 4 - AI Analysis | 19 | 9 | 8 scenarios | 7 |
| 5 - Trends | 22 | 5 | 12 scenarios | 8 |
| 6 - Notifications | ~18 | 5 | 6 scenarios | 6 |
| 7 - Export | ~18 | 7 | 6 scenarios | (uses all prior) |
| 8 - Deploy | 6 | 5 | 7 scenarios | 9 |
| **Total** | **~163** | **~71** | **~68** | **~56** |

This is a healthy distribution. The ratio of unit to integration to E2E tests roughly follows the testing pyramid.

---

## Final Verdict

**Is the test strategy sufficient to begin implementation?**

**Yes, with caveats.** The per-phase test specifications are comprehensive and actionable. The architecture is designed for testability. The testing tools are well-chosen.

Before or during Phase 0, address these items:

1. **Create `docs/architecture/testing-strategy.md`** -- overall strategy, pyramid, conventions, database approach, mock boundaries, coverage targets. (Critical)
2. **Add CI pipeline** -- at minimum a script that runs type-check + unit tests + build. (Critical)
3. **Create test data factories** -- shared helpers for creating users, children, food logs, photos, analyses. (Major)
4. **Define the cross-device test matrix** -- what is manual, what is automated, what browsers/devices. (Major)
5. **Fix the encryption doc AI analysis path discrepancy** -- server proxy, not client-direct. (Minor but could cause confusion)
6. **Add `fake-indexeddb` or equivalent to Phase 0 dependencies** -- Dexie tests need it. (Minor)

None of these are blockers. The project can start Phase 0 implementation and address these items incrementally. The existing test specifications in the phase docs provide more than enough guidance for a developer to write tests alongside the implementation.
