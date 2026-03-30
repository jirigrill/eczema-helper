# Test Coverage Map

This document tracks what is tested, with which test type, and identifies gaps. Update after adding/modifying tests.

**Last updated:** 2026-03-30

---

## Coverage Summary

| Layer | Tests | Files | Coverage Status |
|-------|-------|-------|-----------------|
| Unit | 10 files | 50+ test cases | ✅ Good |
| Integration | 6 files | 50+ test cases | ✅ Good |
| E2E | 4 files | 17+ test cases | ✅ Good |

---

## Phase 0: Foundation

### Features & Test Coverage

| Feature | Unit | Integration | E2E | Status |
|---------|------|-------------|-----|--------|
| **Domain Models** | ✅ `models.test.ts` | - | - | ✅ |
| - FoodLog action types | ✅ | - | - | ✅ |
| - TrackingPhoto discriminated union | ✅ | - | - | ✅ |
| - AnalysisResult discriminated union | ✅ | - | - | ✅ |
| - All models have id field | ✅ | - | - | ✅ |
| **Dexie.js Local DB** | ✅ `dexie-db.test.ts` | - | - | ✅ |
| - Database opens | ✅ | - | - | ✅ |
| - All 9 tables exist | ✅ | - | - | ✅ |
| - Compound index works | ✅ | - | - | ✅ |
| **Czech Translations** | ✅ `cs.test.ts` | - | - | ✅ |
| - All required keys present | ✅ | - | - | ✅ |
| - No empty values | ✅ | - | - | ✅ |
| **Encryption Stubs** | ✅ `encryption.test.ts` | - | - | ✅ |
| - encrypt throws not implemented | ✅ | - | - | ✅ |
| - decrypt throws not implemented | ✅ | - | - | ✅ |
| **PostgreSQL Connection** | - | ✅ `docker-postgres.test.ts` | - | ✅ |
| - Container reachable | - | ✅ | - | ✅ |
| - Table creation works | - | ✅ | - | ✅ |
| - Connection pool handles concurrency | - | ✅ | - | ✅ |
| **PWA Manifest** | - | - | Manual | ⚠️ Manual only |
| **App Shell Navigation** | - | - | Manual | ⚠️ Manual only |
| **Login Page UI** | - | - | ✅ `auth.spec.ts` | ✅ |

---

## Phase 1: Authentication & Child Management

### Features & Test Coverage

| Feature | Unit | Integration | E2E | Status |
|---------|------|-------------|-----|--------|
| **Password Hashing** | ✅ `auth.test.ts` | - | - | ✅ |
| - hashPassword returns bcrypt hash | ✅ | - | - | ✅ |
| - hashPassword produces unique hashes | ✅ | - | - | ✅ |
| - hashPassword handles empty string | ✅ | - | - | ✅ |
| - verifyPassword succeeds with correct | ✅ | - | - | ✅ |
| - verifyPassword fails with incorrect | ✅ | - | - | ✅ |
| **Session Management** | ✅ `session.test.ts` | ✅ `auth-api.test.ts` | - | ✅ |
| - shouldRunSessionCleanup returns boolean | ✅ | - | - | ✅ |
| - Cleanup threshold ~1% | ✅ | - | - | ✅ |
| - Session expiration | - | ✅ | - | ✅ |
| - cleanupExpiredSessions removes expired | - | ✅ | - | ✅ |
| **Rate Limiting** | - | ✅ `rate-limit.test.ts` | - | ✅ |
| - Allows attempts under threshold | - | ✅ | - | ✅ |
| - Locks account after 5 failed attempts | - | ✅ | - | ✅ |
| - Blocks even correct password when locked | - | ✅ | - | ✅ |
| - Resets counter after successful login | - | ✅ | - | ✅ |
| - Generic error for non-existent email | - | ✅ | - | ✅ |
| **Audit Logging** | - | ✅ `audit-log.test.ts` | - | ✅ |
| - Logs successful registration | - | ✅ | - | ✅ |
| - Logs successful login | - | ✅ | - | ✅ |
| - Logs failed login attempt | - | ✅ | - | ✅ |
| - Logs logout | - | ✅ | - | ✅ |
| - Logs child creation | - | ✅ | - | ✅ |
| - Logs child update | - | ✅ | - | ✅ |
| - Logs child deletion | - | ✅ | - | ✅ |
| - Never logs passwords | - | ✅ | - | ✅ |
| - Includes IP address | - | ✅ | - | ✅ |
| **Auth Store** | ✅ `auth.test.ts` | - | - | ✅ |
| - User starts as null | ✅ | - | - | ✅ |
| - User can be set/reset | ✅ | - | - | ✅ |
| - Loading state | ✅ | - | - | ✅ |
| - isAuthenticated derived | ✅ | - | - | ✅ |
| **Food Log Store** | ✅ `food-log.test.ts` | - | - | ✅ |
| - Logs array management | ✅ | - | - | ✅ |
| - Selected date defaults to today | ✅ | - | - | ✅ |
| - Date can be changed | ✅ | - | - | ✅ |
| **Photos Store** | ✅ `photos.test.ts` | - | - | ✅ |
| - Photos array management | ✅ | - | - | ✅ |
| - Filter defaults to all | ✅ | - | - | ✅ |
| - Filtered derived (all/skin/stool) | ✅ | - | - | ✅ |
| - Updates when photos/filter change | ✅ | - | - | ✅ |
| **Children Store** | ✅ `children.test.ts` | - | - | ✅ |
| - selectedChild returns first by default | ✅ | - | - | ✅ |
| - selectedChild returns matching ID | ✅ | - | - | ✅ |
| - selectedChild null when empty | ✅ | - | - | ✅ |
| - selectedChild fallback on invalid ID | ✅ | - | - | ✅ |
| - setChildren updates array | ✅ | - | - | ✅ |
| - setActiveChildId updates state | ✅ | - | - | ✅ |
| - localStorage persistence | ✅ | - | - | ✅ |
| **Auth API: Register** | - | ✅ `auth-api.test.ts` | ✅ `auth.spec.ts` | ✅ |
| - Creates user, returns 201 | - | ✅ | - | ✅ |
| - Rejects duplicate email (409) | - | ✅ | - | ✅ |
| - Rejects short password (400) | - | ✅ | - | ✅ |
| - Rejects invalid email (400) | - | ✅ | - | ✅ |
| - Sets session cookie | - | ✅ | - | ✅ |
| - E2E: Register redirects to calendar | - | - | ✅ | ✅ |
| **Auth API: Login** | - | ✅ `auth-api.test.ts` | ✅ `auth.spec.ts` | ✅ |
| - Returns session cookie | - | ✅ | - | ✅ |
| - Rejects invalid credentials (401) | - | ✅ | ✅ | ✅ |
| - Rejects non-existent user (401) | - | ✅ | - | ✅ |
| - E2E: Login with valid credentials | - | - | ✅ | ✅ |
| - E2E: Login shows Czech error message | - | - | ✅ | ✅ |
| **Auth API: Logout** | - | ✅ `auth-api.test.ts` | ✅ `logout.spec.ts` | ✅ |
| - Clears session cookie | - | ✅ | - | ✅ |
| - E2E: Logout redirects to login | - | - | ✅ | ✅ |
| **Route Protection** | - | - | ✅ `auth-guard.spec.ts` | ✅ |
| - /calendar protected | - | - | ✅ | ✅ |
| - /settings protected | - | - | ✅ | ✅ |
| - /food protected | - | - | ✅ | ✅ |
| - Authenticated redirect from /login | - | - | ✅ | ✅ |
| **Children API: GET** | - | ✅ `children-api.test.ts` | - | ✅ |
| - Returns empty array for new user | - | ✅ | - | ✅ |
| - Returns created children | - | ✅ | - | ✅ |
| **Children API: POST** | - | ✅ `children-api.test.ts` | ✅ `children.spec.ts` | ✅ |
| - Creates child, returns 201 | - | ✅ | - | ✅ |
| - Rejects missing name (400) | - | ✅ | - | ✅ |
| - Rejects invalid birth date (400) | - | ✅ | - | ✅ |
| - Requires authentication (401) | - | ✅ | - | ✅ |
| - E2E: Add child visible in settings | - | - | ✅ | ✅ |
| - E2E: Success message shown | - | - | ✅ | ✅ |
| - E2E: Single-child constraint | - | - | ✅ | ✅ |
| **Children API: PUT** | - | ✅ `children-api.test.ts` | ✅ `children.spec.ts` | ✅ |
| - Updates child name | - | ✅ | ✅ | ✅ |
| - Rejects cross-user access (403) | - | ✅ | - | ✅ |
| - E2E: Edit form pre-populated | - | - | ✅ | ✅ |
| **Children API: DELETE** | - | ✅ `children-api.test.ts` | ✅ `children.spec.ts` | ✅ |
| - Removes child | - | ✅ | - | ✅ |
| - Rejects cross-user access (403) | - | ✅ | - | ✅ |
| - E2E: Confirmation dialog | - | - | ✅ | ✅ |
| **Seed Data** | - | ✅ `seed-data.test.ts` | - | ✅ |
| - Food categories seeded (≥13) | - | ✅ | - | ✅ |
| - Food sub-items seeded (≥50) | - | ✅ | - | ✅ |
| - Sub-items reference valid categories | - | ✅ | - | ✅ |
| - Dairy category has 8 sub-items | - | ✅ | - | ✅ |
| - Categories have Czech names/icons | - | ✅ | - | ✅ |
| - Category slugs are unique | - | ✅ | - | ✅ |

---

## Test Files Reference

### Unit Tests (`src/lib/**/*.test.ts`)

| File | Tests | What it covers |
|------|-------|----------------|
| `domain/models.test.ts` | 15 | TypeScript domain model types, discriminated unions |
| `adapters/dexie-db.test.ts` | 3 | IndexedDB schema, tables, compound indexes |
| `i18n/cs.test.ts` | 2 | Czech translation completeness |
| `crypto/encryption.test.ts` | 2 | Encryption stubs throw "not implemented" |
| `server/auth.test.ts` | 5 | Password hashing with bcrypt |
| `server/session.test.ts` | 3 | Session cleanup probability logic |
| `stores/auth.test.ts` | 6 | Auth store: user, loading, isAuthenticated |
| `stores/children.test.ts` | 7 | Children store: selection, persistence |
| `stores/food-log.test.ts` | 5 | Food log store: logs array, selected date |
| `stores/photos.test.ts` | 9 | Photos store: photos array, filter, derived filtered |

### Integration Tests (`tests/integration/**/*.test.ts`)

| File | Tests | What it covers |
|------|-------|----------------|
| `docker-postgres.test.ts` | 3 | PostgreSQL connectivity, table ops, connection pool |
| `auth-api.test.ts` | 9 | Register, login, logout API endpoints |
| `children-api.test.ts` | 13 | Children CRUD, auth guards, cross-user isolation |
| `seed-data.test.ts` | 6 | Food categories/sub-items seed integrity |
| `rate-limit.test.ts` | 5 | Login throttling, account lockout, counter reset |
| `audit-log.test.ts` | 9 | Security event logging, password exclusion, IP capture |

### E2E Tests (`e2e/**/*.spec.ts`)

| File | Tests | What it covers |
|------|-------|----------------|
| `auth.spec.ts` | 3 | Registration flow, login flow, error display |
| `auth-guard.spec.ts` | 4 | Route protection, authenticated redirects |
| `logout.spec.ts` | 1 | Logout clears session, redirects |
| `children.spec.ts` | 9 | Child CRUD UI, forms, confirmation dialogs |

---

## Gaps & Recommendations

### Remaining Gaps (Low Priority)

| Area | Gap | Priority | Recommended Test Type |
|------|-----|----------|----------------------|
| Request correlation IDs | Not tested | Low | Integration |
| PostgreSQL adapter | `postgres.ts` mapper methods untested | Low | Unit (would need DI refactor) |
| Logger | `logger.ts` untested | Low | Unit |
| App shell navigation | Only manual | Low | E2E |

### Security Tests (Deferred to Phase 8)

Per `testing-strategy.md`, these are scheduled for Phase 8:
- SQL injection
- XSS prevention
- CSRF protection
- Session fixation
- Auth bypass attempts

---

## Running Tests

```bash
# All tests
just test

# Unit & integration only
bun run test

# E2E only
bun run test:e2e

# E2E with UI
bun run test:e2e:ui

# Full check (type-check + tests + build + lint)
just check
```

---

## Updating This Document

After adding or modifying tests:
1. Add the test to the appropriate table above
2. Update the coverage status (✅ / ⚠️ / ❌)
3. Remove from "Gaps" section if addressed
4. Update "Last updated" date
