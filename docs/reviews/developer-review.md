# Developer Audit Report: Eczema Tracker PWA

**Reviewer:** Senior Full-Stack Developer (15+ years, SvelteKit/TypeScript/PostgreSQL/PWA specialist)
**Date:** 2026-03-25
**Scope:** All documentation in `docs/` directory (architecture, data models, phases 0-8)
**Verdict:** The specification is **sufficient to begin implementation**, with caveats noted below.

---

## Executive Summary

This is an exceptionally well-documented project for a personal app. The architecture documentation covers tech stack rationale, hexagonal architecture with concrete port/adapter interfaces, complete PostgreSQL schema with TypeScript mappings, encryption design, offline strategy, API routes, deployment, and nine phased implementation plans with step-by-step code, acceptance criteria, and test suites.

The documentation is implementation-ready for Phases 0-6. Phases 7-8 have minor gaps but are still actionable. The hexagonal architecture is well-applied for this problem domain. The data model is complete and internally consistent. The offline-first strategy is pragmatic for the two-user scenario.

Key strengths: discriminated union usage, explicit port interfaces, complete SQL schema, realistic conflict resolution for the use case, thorough encryption design with threat model.

Key risks: some inconsistencies between documents that will cause confusion during implementation, missing Dexie schema for encrypted blobs, no batch sync API despite referencing one, and the encryption module evolves across documents in conflicting ways.

---

## Findings by Severity

### BLOCKER

#### B1: Encryption Module API Inconsistency Across Documents

**Current state:** Three different API signatures exist for the encryption module across the documentation:

1. `docs/architecture/encryption.md` defines `encrypt(data, key, aad?) -> ArrayBuffer` with IV prepended to ciphertext, and `decrypt(data, key, aad?) -> ArrayBuffer` where the first 12 bytes are the IV.
2. `docs/architecture/ports-and-adapters.md` references encrypt/decrypt with AAD parameter (`childId:photoId`).
3. `docs/phases/phase-3-photo-diary.md` Step 1 defines `encrypt(data, key) -> { iv, ciphertext }` and `decrypt(ciphertext, iv, key)` with separate IV parameter. No AAD parameter at all.

**What's missing:** A single canonical encrypt/decrypt API. The Phase 3 implementation steps (which a developer will follow) contradict the architecture doc (which describes the intended design).

**Recommendation:** Align Phase 3 Step 1 with `encryption.md`. The architecture doc's approach (IV prepended, AAD supported) is the better design. Update Phase 3 to use the same signature: `encrypt(data, key, aad?) -> ArrayBuffer` and `decrypt(data, key, aad?) -> ArrayBuffer`. The separate-IV approach in Phase 3 is error-prone (developer must manually pair IVs with ciphertexts).

---

#### B2: Missing Dexie Schema for Encrypted Photo Blobs

**Current state:** The Dexie schema in Phase 0 (Step 8) declares tables for metadata (`trackingPhotos`) but does not include a table for storing the actual encrypted photo blobs locally. The offline strategy document (Section 6) states "On photo capture: The encrypted blob is stored in Dexie immediately" and "Thumbnails (320px, encrypted) are always kept locally."

**What's missing:** A Dexie table (or explicit IndexedDB usage pattern) for storing encrypted ArrayBuffer blobs alongside metadata. The `trackingPhotos` table only stores metadata fields. There is no `photoBlobs` or `encryptedBlobs` table in the schema.

**Recommendation:** Add a `photoBlobs` Dexie table: `'id, photoId, type'` where `type` is `'full' | 'thumbnail'` and the record stores the encrypted ArrayBuffer. Alternatively, store the blob directly on the `trackingPhotos` record as an unindexed field (Dexie supports this). Document the chosen approach in the Dexie schema definition.

---

### MAJOR GAP

#### M1: No Batch Sync API Endpoint

**Current state:** The offline strategy document (Section 7) references `POST /api/food-logs/batch` in the `SyncEngine.pushPendingChanges()` code sketch. The API routes document (`api-routes.md`) defines no batch endpoint -- only individual `POST /api/food-logs`. Phase 2's food log store code (Step 13) also does individual fetches/puts, not batch operations.

**What's missing:** Either a batch sync endpoint or a documented strategy for syncing N records individually. For photos, individual uploads make sense (large blobs). For food logs and meals (small JSON), individual POSTs for each unsynced record would be chatty and slow on poor mobile connections.

**Recommendation:** Add `POST /api/sync` as a dedicated endpoint that accepts `{ foodLogs: FoodLog[], meals: Meal[], mealItems: MealItem[] }` and returns merged results. Alternatively, add `POST /api/food-logs/batch` and `POST /api/meals/batch`. Document the batch size limit and error handling (partial success).

---

#### M2: PhotoStorage Port Interface Inconsistency

**Current state:** The `PhotoStorage` port is defined differently in two places:

1. `docs/architecture/ports-and-adapters.md` defines `upload(encryptedBlob, metadata) -> { blobRef }`, `download(blobRef) -> ArrayBuffer`, etc.
2. `docs/phases/phase-3-photo-diary.md` (Key Code Patterns section) redefines it as `save(photo) -> string`, `getMetadata(childId) -> PhotoMeta[]`, `getBlob(photoId) -> ArrayBuffer`, `getThumbnail(photoId) -> ArrayBuffer`, `getPendingUploads() -> EncryptedPhoto[]`, `markUploaded(photoId) -> void`.

The Phase 3 version is more complete (includes pending upload tracking for offline sync) but has a completely different method naming.

**What's missing:** A single canonical port definition.

**Recommendation:** Use the Phase 3 version as the canonical interface since it includes offline sync concerns, but reconcile the naming. Update `ports-and-adapters.md` to match. The architecture doc's `upload/download/delete` naming is cleaner; consider merging: keep `upload`/`download`/`delete` names but add `getPendingUploads()`/`markUploaded()`.

---

#### M3: Encryption AI Analysis Flow Contradicts Architecture

**Current state:** The encryption document (`encryption.md`, AI Analysis section) states: "Browser sends decrypted images directly to Claude Vision API... NOTE: The server never handles decrypted photos during analysis."

However, the CLAUDE.md, tech-stack.md, auth-overview.md, and Phase 4 implementation all describe a **server-side proxy** pattern where the client sends decrypted photos to `POST /api/analyze`, and the server forwards them to Claude. The Phase 4 code explicitly implements this proxy.

**What's missing:** The `encryption.md` AI Analysis flow diagram is stale/incorrect.

**Recommendation:** Update `encryption.md` Section "AI Analysis" to describe the server proxy pattern. The client sends decrypted photos to `POST /api/analyze`, the server forwards to Claude with the API key, and the server discards photos from memory after the response. This matches the actual design in all other documents.

---

#### M4: TrackingPhoto Field Name Mismatch Between TypeScript and PostgreSQL Mapping

**Current state:** The TypeScript `TrackingPhoto` interface has `encryptedBlobRef: string` and `thumbnailRef?: string`. The PostgreSQL schema has `encrypted_blob_path TEXT` and `encrypted_thumb_path TEXT`. The mapping table in `data-models.md` documents this: `encryptedBlobRef -> encrypted_blob_path` and `thumbnailRef -> encrypted_thumb_path`.

The semantic mismatch (`Ref` vs `path`) is documented but will cause confusion. More importantly, the `PhotoStorage` port in `ports-and-adapters.md` returns `{ blobRef: string }` from `upload()`, while the server API stores `encrypted_blob_path`. The adapter must bridge this naming gap.

**What's missing:** Explicit note in the PostgresRepository adapter documentation that this mapping requires care, and that the `blobRef` returned by the PhotoStorage port is the same value stored as `encrypted_blob_path` in PostgreSQL.

**Recommendation:** Either rename the TypeScript field to `encryptedBlobPath` for consistency, or add explicit mapping notes in the Phase 3 implementation steps where the adapter is built.

---

#### M5: Missing Meal CRUD in DataRepository Port

**Current state:** The `DataRepository` port in `ports-and-adapters.md` has methods for users, children, food categories, food logs, photos, analysis results, push subscriptions, and reminder configs. It does **not** include any methods for `Meal` or `MealItem` entities.

**What's missing:** Repository methods like `getMealsForDate(userId, date)`, `createMeal(meal)`, `getMealItems(mealId)`, `createMealItem(item)`, `deleteMeal(id)`, etc.

**Recommendation:** Add Meal and MealItem methods to the `DataRepository` port interface in `ports-and-adapters.md`. Phase 2b requires these for the meal logging feature.

---

#### M6: Session Sliding Window Updates on Every Request

**Current state:** The session validation in `hooks.server.ts` (Phase 1, Step 7) extends the session expiry on **every authenticated request**: `UPDATE sessions SET expires_at = ... WHERE id = ...`. For a mobile app with multiple API calls per page load, this means a database write on every single request.

**What's missing:** Throttling strategy for session extension.

**Recommendation:** Only extend the session if it is within some threshold of expiring (e.g., less than 15 days remaining). This reduces write amplification from "every request" to "once per ~15 days of active use." Add this optimization note to the Phase 1 implementation steps.

---

#### M7: No `updatedAt` Trigger or Application-Level Update

**Current state:** The PostgreSQL schema has `updated_at TIMESTAMPTZ DEFAULT now()` on most tables, but there is no `ON UPDATE` trigger defined. The `DEFAULT now()` only sets the value on `INSERT`, not on `UPDATE`.

**What's missing:** Either a PostgreSQL trigger (`CREATE TRIGGER ... BEFORE UPDATE ... SET NEW.updated_at = now()`) or explicit documentation that the application layer must set `updated_at` on every UPDATE query. The offline sync strategy depends on `updatedAt` for conflict resolution (last-write-wins).

**Recommendation:** Add a reusable trigger function in the initial migration:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
```
Apply it to all mutable tables. This prevents bugs where a developer forgets to set `updated_at` in an UPDATE query, which would break sync.

---

### MINOR GAP

#### m1: `analysis_results` Table Missing `updatedAt`

**Current state:** The `analysis_results` PostgreSQL table has only `created_at`, no `updated_at`. The TypeScript `AnalysisResultBase` interface also lacks `updatedAt`. Analysis results are treated as immutable, which is reasonable.

**What's missing:** This is fine for the current design, but the offline sync strategy uses `updatedAt` for delta sync. If analysis results are synced to Dexie, the pull query `WHERE updated_at > lastSyncTimestamp` would not work for this table.

**Recommendation:** Add `updated_at TIMESTAMPTZ DEFAULT now()` to `analysis_results` for consistency. Even if results are immutable, it allows the sync engine to use a uniform strategy across all tables.

---

#### m2: Phase 2 Svelte 5 Runes Mixed with Svelte 4 Syntax

**Current state:** Phase 0 and Phase 1 consistently use Svelte 5 runes (`$state`, `$derived`, `$effect`) in `.svelte.ts` modules. Phase 2's CalendarHeader component example (Step 3) uses `export let` props -- Svelte 4 syntax. The CalendarGrid assembly (Step 11) uses `$calendarStore` with Svelte 4 store auto-subscription syntax.

**What's missing:** Consistent Svelte 5 conventions across all phase docs. Since the project targets Svelte 5 (confirmed in tech-stack.md), all component examples should use Svelte 5 idioms: `let { year, month } = $props()` instead of `export let year`.

**Recommendation:** Update Phase 2 component examples to use Svelte 5 props syntax. This prevents confusion when a developer copies the code patterns.

---

#### m3: Missing `sort_order` Usage in FoodSubItem TypeScript Interface

**Current state:** The PostgreSQL `food_sub_items` table has a `sort_order INT DEFAULT 0` column. The TypeScript `FoodSubItem` interface does not include a `sortOrder` field. The TypeScript-to-PostgreSQL mapping table in `data-models.md` also omits this mapping.

**What's missing:** `sortOrder: number` on the `FoodSubItem` TypeScript interface, and the corresponding entry in the mapping table. Same issue exists for `FoodCategory` (`sort_order` in SQL, no `sortOrder` in TS).

**Recommendation:** Add `sortOrder: number` to both `FoodCategory` and `FoodSubItem` TypeScript interfaces. Add the mappings to the mapping table. The UI needs this to render categories and sub-items in the correct order.

---

#### m4: Docker Compose `version` Key Deprecated

**Current state:** `docker-compose.yml` in `deployment.md` starts with `version: "3.8"`. Docker Compose V2 (which is required per tech-stack.md: Docker 24+) ignores the `version` key and prints a deprecation warning.

**What's missing:** Nothing functionally broken, but it generates noise.

**Recommendation:** Remove the `version: "3.8"` line from the production `docker-compose.yml`. The dev compose file in Phase 0 correctly omits it.

---

#### m5: Missing `api/analyze` Route in API Routes Document

**Current state:** `api-routes.md` lists `POST /api/analyze` under "AI Analysis (Phase 4)" and `POST /api/analysis` as separate endpoints. However, the Phase 4 implementation creates the server proxy at `src/routes/api/analyze/+server.ts` while the routes doc lists the path as `/api/analyze`.

The SvelteKit file-based routing means `src/routes/api/analyze/+server.ts` maps to `/api/analyze` (correct). But the project structure doc (`project-structure.md`) does not list this route -- it only shows `api/photos/+server.ts`, `api/children/+server.ts`, etc.

**What's missing:** The `/api/analyze` route in the project structure directory tree.

**Recommendation:** Add `api/analyze/+server.ts` and `api/analysis/+server.ts` (or `api/analysis/[id]/+server.ts`) to the project structure document.

---

#### m6: Push Subscription Schema Divergence Between Phase 1 and Phase 6

**Current state:** Phase 1 creates the `push_subscriptions` table as part of the initial schema migration (`001_initial_schema.sql`) with columns: `id, user_id, endpoint, p256dh, auth, created_at`. Phase 6 defines a new migration with columns: `id, user_id, endpoint, p256dh_key, auth_key, user_agent, created_at, updated_at` plus a `UNIQUE` constraint on `endpoint`.

The column names differ (`p256dh` vs `p256dh_key`, `auth` vs `auth_key`), Phase 6 adds `user_agent` and `updated_at`, and Phase 6 adds the `UNIQUE` constraint.

**What's missing:** Acknowledgment that Phase 6's migration is an ALTER or a replacement of the Phase 1 schema. Since Phase 1 already creates the table, Phase 6 should only add the missing columns and constraints.

**Recommendation:** Update Phase 6 to use `ALTER TABLE` instead of `CREATE TABLE`, or document that the Phase 1 initial schema should be updated to include the Phase 6 columns from the start (since Phase 1 creates all tables upfront). The latter is cleaner -- update `001_initial_schema.sql` to include the Phase 6 column names and constraints.

---

#### m7: `reminder_configs` Schema Divergence Between Phase 1 and Phase 6

**Current state:** Same issue as m6. Phase 1 creates `reminder_configs` with `PRIMARY KEY (user_id, child_id)` and no `id` column. Phase 6 redefines it with an `id UUID PRIMARY KEY`, `UNIQUE(user_id, child_id)`, `last_photo_notification_at`, `created_at`, and `updated_at` columns.

**Recommendation:** Same as m6 -- reconcile the Phase 1 initial schema to match the Phase 6 design.

---

#### m8: No Logging Convention Defined

**Current state:** The notification cron in Phase 6 uses `console.log('[NotificationCron] ...')` and `console.error('[NotificationCron] Error...')`. No other document defines a logging convention.

**What's missing:** A project-wide logging strategy: structured vs unstructured, log levels, prefix conventions, whether to use a library (e.g., `pino`), and what to never log (passwords, API keys, decrypted photo data).

**Recommendation:** Add a "Logging Conventions" section to `ports-and-adapters.md` or a new `docs/architecture/logging.md`. At minimum: use `console.error` for errors, `console.warn` for warnings, `console.log` for info; prefix with `[ModuleName]`; never log secrets, passwords, or photo data. Consider `pino` for production (JSON structured logging).

---

#### m9: Google Doc Export Data Inconsistency

**Current state:** Phase 7's `ExportService.aggregateData()` code references `this.db.photos` (not `this.db.trackingPhotos`), `this.db.severityRatings` (table does not exist in the Dexie schema), and `this.db.analyses` (should be `this.db.analysisResults`).

**What's missing:** Correct table name references in the Phase 7 code examples.

**Recommendation:** Update the Phase 7 code to use the canonical Dexie table names: `this.db.trackingPhotos`, `this.db.analysisResults`. Severity ratings are stored on the `trackingPhotos` records (`severityManual` field), not in a separate table.

---

#### m10: Missing `POST /api/sync` or Delta Sync API

**Current state:** The offline strategy describes delta sync via `GET /api/sync?since={lastSync}` in the `SyncEngine.pullServerChanges()` sketch. No such endpoint exists in `api-routes.md`.

**What's missing:** A sync endpoint that returns all records updated since a given timestamp, across all relevant tables.

**Recommendation:** Add `GET /api/sync?since=ISO_TIMESTAMP&childId=X` to the API routes document. Response should include arrays of updated `foodLogs`, `meals`, `mealItems`, `trackingPhotos` (metadata only), and `analysisResults`. This is essential for the offline-first architecture.

---

#### m11: Missing `_migrations` Table in Schema

**Current state:** The migration runner (`scripts/migrate.ts`) described in Phase 1 creates a `_migrations` tracking table. This table is not documented in `data-models.md` or the initial schema migration.

**What's missing:** The `_migrations` table DDL in the migration docs, and a note that it is created automatically by the migration runner.

**Recommendation:** Add a brief note in `data-models.md` under a "System Tables" section: `_migrations` tracks executed migration files and is managed by the migration runner.

---

#### m12: `FoodCategory.subItems` Field is Computed, Not Stored

**Current state:** The TypeScript `FoodCategory` interface includes `subItems: FoodSubItem[]`. The PostgreSQL `food_categories` table does not have this column -- sub-items are in a separate table joined via `category_id`. The mapping table in `data-models.md` does not list `subItems` because it is not a direct column mapping.

**What's missing:** A note that `subItems` is populated by the repository adapter via a JOIN, not stored as a column.

**Recommendation:** Add a comment in the TypeScript interface: `subItems: FoodSubItem[]; // Populated via JOIN, not stored as a column`. This prevents confusion when implementing the adapter.

---

### NITPICK

#### n1: Duplicate Row in docs/README.md

**Current state:** The Architecture Documentation table lists `auth-overview.md` twice (rows 6 and 7 are identical).

**Recommendation:** Remove the duplicate row.

---

#### n2: `ui-design.md` Referenced But Not Created

**Current state:** Multiple documents reference `docs/architecture/ui-design.md` as a document to be created during Phase 1. The README lists it with "(created in Phase 1 after testing on real phone)". This is intentional -- it is a Phase 1 deliverable.

**Recommendation:** No action needed, but note that Phase 2 and Phase 3 depend on decisions documented in `ui-design.md`. If Phase 1 does not produce this document, subsequent phases will have ambiguous UI decisions.

---

#### n3: WebAuthn Data Model Missing

**Current state:** Phase 8 lists WebAuthn/Passkeys as an optional feature, but no TypeScript interface or PostgreSQL table is defined for storing WebAuthn credentials (public key, credential ID, counter, etc.).

**Recommendation:** Since it is marked optional, this is acceptable. If implemented, add a `webauthn_credentials` table and corresponding TypeScript interface in Phase 8 steps.

---

#### n4: Hardcoded IP in Caddyfile Examples

**Current state:** Caddyfile examples use `192.168.1.42` as a hardcoded IP. Both Phase 0 and deployment docs mention replacing it, but the actual config files shown in code blocks contain the hardcoded value.

**Recommendation:** Use a placeholder like `${LAN_IP}` and add a comment reminding the developer to substitute their actual IP.

---

#### n5: Node.js `node_modules` Copied in Dockerfile

**Current state:** The Phase 0 Dockerfile copies `node_modules` in the production stage but also runs `npm ci --omit=dev`. The deployment doc's Dockerfile copies `node_modules` from the builder stage (which includes devDependencies). Phase 8's Dockerfile correctly runs a separate `npm ci --omit=dev` in the production stage.

**Recommendation:** Standardize on Phase 8's approach: `COPY package.json package-lock.json` then `npm ci --omit=dev` in the production stage. Do not copy `node_modules` from the builder stage.

---

#### n6: Czech Diacritics Missing in Some Seed Data Docs

**Current state:** The seed data section in `data-models.md` lists category names without diacritics in the heading text ("Mlecne vyrobky") but with diacritics in the SQL example ("Mlecne vyrobky"). The seed SQL uses proper diacritics. Some sub-item names in the documentation tables lack diacritics that appear in the SQL.

**Recommendation:** Ensure all Czech text in documentation uses proper diacritics for accuracy. The SQL is correct; update the documentation table headings to match.

---

## Evaluation Summary by Category

### 1. Architecture Clarity (Rating: Excellent)

The hexagonal architecture is well-defined with clear layer boundaries. Port interfaces are concrete (not generic CRUD), adapter swapping is documented with code examples, and the dependency flow is explicit. The dual wiring pattern (server via `event.locals`, client via factory) correctly addresses SvelteKit's split execution model. Error handling is layered (DomainError hierarchy, API error format, UI toast pattern).

### 2. Data Model Completeness (Rating: Good, with gaps)

TypeScript interfaces and PostgreSQL schema are thorough and internally consistent. The mapping table is comprehensive. Gaps: missing `sortOrder` in TS interfaces, missing Meal methods in DataRepository port, `subItems` computed field undocumented, `_migrations` table undocumented.

### 3. API Design (Rating: Good, with gaps)

RESTful routes are well-structured with clear auth requirements, request/response shapes, and error codes. Rate limiting is specified at the Nginx level. Gaps: missing batch sync endpoint, missing `/api/sync` delta endpoint, missing `/api/analyze` in project structure.

### 4. SvelteKit Specifics (Rating: Good)

Route structure uses groups, layouts, and server routes correctly. The `(app)` route group for auth guards is well-applied. Server vs client code separation is documented. Load functions and form actions are mentioned but not always shown in detail. One concern: some phase docs use Svelte 4 syntax mixed with Svelte 5 runes.

### 5. Offline-First Implementation (Rating: Good, with critical gap)

The Dexie schema, sync triggers, conflict resolution, and caching strategy are well-designed for the two-user scenario. Last-write-wins is pragmatic and appropriate. Gaps: no Dexie table for encrypted photo blobs, no batch sync API, no delta sync API endpoint.

### 6. TypeScript Strictness (Rating: Excellent)

Discriminated unions for `AnalysisResult` and `TrackingPhoto` types are well-designed. Strict mode is configured. Types are used throughout port interfaces with proper `Omit<>` for creation methods. The `Trend` type union is clean.

### 7. Phase Implementation Steps (Rating: Very Good)

Phases 0-6 have detailed step-by-step instructions with code snippets that are close to copy-pasteable. Each phase has acceptance criteria, file manifests, and test suites. Phase 7 and 8 are slightly less detailed but still actionable. The encryption module inconsistency (B1) is the main risk for implementation confusion.

### 8. Dependencies & Versions (Rating: Good)

Minimum versions are specified for all major dependencies. No specific npm package versions are pinned in the docs (e.g., `dexie@4.x` not `dexie@4.0.1`), which is acceptable for a documentation-only stage. `node-cron` and `web-push` are mentioned in Phase 6 but not listed in Phase 0's `npm install` step.

### 9. Missing Technical Specs (Rating: Fair)

Gaps identified: no logging convention, no structured error logging, no migration rollback strategy (only forward migrations), no performance budgets beyond "loads within 2-3 seconds", no rate limiting strategy at the application level (only Nginx), no CORS configuration documentation.

### 10. Code Organization (Rating: Excellent)

The project structure is thoroughly documented with explanations for every directory and file. Naming conventions are consistent (kebab-case files, PascalCase components, camelCase functions). Import patterns use the `$lib` alias consistently. The separation between `lib/server/` (server-only) and `lib/domain/` (shared) is clear.

---

## Final Verdict

**Is the technical specification sufficient to begin implementation?** **Yes.**

The documentation is among the most thorough pre-implementation specs I have seen for a project of this scope. A competent developer can begin coding Phase 0 immediately and progress through Phase 6 with high confidence. The blockers identified (B1, B2) should be resolved before starting Phase 3, as they affect the encryption and offline photo storage -- core features that are difficult to retrofit.

**Priority resolution order:**

1. **B1** (encryption API inconsistency) -- resolve before Phase 3
2. **B2** (missing Dexie blob table) -- resolve before Phase 3
3. **M3** (encryption doc AI flow) -- fix documentation accuracy
4. **M7** (updatedAt trigger) -- add to Phase 1 migration
5. **M5** (missing Meal methods in DataRepository) -- add before Phase 2b
6. **M1** (batch sync API) -- design before Phase 2b
7. **M2** (PhotoStorage port inconsistency) -- resolve before Phase 3
8. **M6** (session extension throttling) -- add to Phase 1

All other findings are minor and can be addressed as each phase is implemented.
