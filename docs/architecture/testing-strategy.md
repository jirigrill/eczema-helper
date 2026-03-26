# Testing Strategy

This document defines the overall testing approach for the Eczema Tracker PWA: test pyramid targets, conventions, database strategy, mock boundaries, and CI pipeline.

---

## Test Pyramid

| Layer             | Target % | Tool                | Runs In                       |
| ----------------- | -------- | ------------------- | ----------------------------- |
| Unit tests        | ~55%     | Vitest              | Node.js                       |
| Integration tests | ~25%     | Vitest + PostgreSQL | Node.js + Docker              |
| E2E tests         | ~15%     | Playwright          | Chromium/WebKit               |
| Manual tests      | ~5%      | Real devices        | iPhone Safari, Android Chrome |

Approximate total: ~300 tests across all phases.

---

## Conventions

### File Naming and Location

- Unit tests: `src/lib/**/*.test.ts` (co-located with source)
- Integration tests: `tests/integration/**/*.test.ts`
- E2E tests: `tests/e2e/**/*.spec.ts`
- Test fixtures: `tests/fixtures/`
- Test factories: `tests/factories/`

### Test Naming

Use descriptive "should" format:

```typescript
describe('FoodTrackingService', () => {
  it('should return cumulative elimination state for a given date', async () => { ... });
  it('should throw ValidationError for invalid date format', async () => { ... });
});
```

---

## Database Strategy

### Unit Tests

- No database access. Domain services tested with mock adapters (`InMemoryRepository`).
- Dexie tests use `fake-indexeddb` package.

### Integration Tests

- Use a dedicated test PostgreSQL database via Docker.
- Each test file wraps operations in a transaction and rolls back after each test.
- Connection string: `DATABASE_URL_TEST` env var.

### Seed Data

- Food categories seeded once per test suite via a shared `seedFoodCategories()` helper.

---

## Mock Boundaries

| Port                  | Unit Tests                        | Integration Tests                         |
| --------------------- | --------------------------------- | ----------------------------------------- |
| `DataRepository`      | `InMemoryRepository` mock         | Real `PostgresRepository`                 |
| `EczemaAnalyzer`      | `MockAnalyzer` (returns fixtures) | `MockAnalyzer` (real API tested manually) |
| `PhotoStorage`        | In-memory ArrayBuffer store       | Real filesystem via temp directory        |
| `NotificationService` | `NoopNotificationService`         | `NoopNotificationService`                 |

---

## Test Data Factories

Create shared helpers in `tests/factories/`:

```typescript
// tests/factories/index.ts
export function createTestUser(overrides?: Partial<User>): User { ... }
export function createTestChild(userId: string, overrides?: Partial<Child>): Child { ... }
export function createTestFoodLog(childId: string, overrides?: Partial<FoodLog>): FoodLog { ... }
export function createTestPhoto(childId: string, overrides?: Partial<TrackingPhoto>): TrackingPhoto { ... }
export function createTestAnalysis(photo1Id: string, photo2Id: string, overrides?: Partial<AnalysisResult>): AnalysisResult { ... }
export async function createAuthenticatedClient(user?: User): Promise<{ fetch: typeof fetch; user: User }> { ... }
export async function seedFoodCategories(db: DataRepository): Promise<void> { ... }
```

---

## CI Pipeline

Minimum viable pipeline (run before every push to main):

```bash
#!/bin/bash
set -euo pipefail

bunx tsc --noEmit          # Type check
bunx vitest run             # Unit + integration tests
bun run build              # Build verification
```

Extended pipeline (Phase 8, GitHub Actions):

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: eczema_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1
        with: { bun-version: latest }
      - run: bun install --frozen-lockfile
      - run: bunx tsc --noEmit
      - run: bunx vitest run
      - run: bun run build
```

---

## Coverage Thresholds

| Metric            | Target |
| ----------------- | ------ |
| Line coverage     | 70%    |
| Branch coverage   | 60%    |
| Function coverage | 75%    |

Configure in `vitest.config.ts`:

```typescript
coverage: {
  provider: 'v8',
  thresholds: { lines: 70, branches: 60, functions: 75 }
}
```

---

## Cross-Device Test Matrix

| Feature               | iPhone Safari (real) | Android Chrome (real) | Playwright Chromium  | Playwright WebKit |
| --------------------- | -------------------- | --------------------- | -------------------- | ----------------- |
| PWA install           | Manual               | Manual                | N/A                  | N/A               |
| Camera capture        | Manual               | Manual                | N/A                  | N/A               |
| Web Push              | Manual               | Manual                | N/A                  | N/A               |
| Food tracking         | Manual + E2E         | Manual                | E2E                  | E2E               |
| Encryption round-trip | Manual               | Manual                | Unit                 | Unit              |
| Offline sync          | Manual               | Manual                | N/A                  | N/A               |
| PDF export            | Manual               | Manual                | E2E                  | N/A               |
| Photo gallery         | Manual               | Manual                | E2E                  | E2E               |
| AI analysis           | Manual               | Manual                | Integration (mocked) | N/A               |

---

## Performance Testing

Define throttling profiles:

- **"4G"**: Chrome DevTools "Fast 3G" profile (1.6 Mbps down, 750 Kbps up, 562ms RTT)
- **"WiFi"**: No throttling

Key performance budgets:
| Operation | Target | Measurement |
|-----------|--------|-------------|
| Gallery load (30 thumbnails) | < 2s on 4G | Playwright `performance.now()` |
| Photo detail decrypt | < 1s | Playwright `performance.now()` |
| Dashboard load (90 days) | < 3s on WiFi | Playwright `performance.now()` |
| PDF generation (30 days, 10 photos) | < 10s | Vitest benchmark |
| 5 MB encryption | < 2s | Vitest benchmark |

---

## Security Testing Checklist

Include in Phase 8 polish:

- [ ] SQL injection: send `'; DROP TABLE users; --` via API inputs, verify no data leakage
- [ ] XSS: render user-supplied `notes` field, verify HTML is escaped
- [ ] CSRF: send POST without Origin header, verify rejection
- [ ] Session fixation: verify new session ID generated on login
- [ ] Expired session: use expired cookie, verify 401
- [ ] Auth bypass: access protected endpoint with forged cookie, verify 401
- [ ] Rate limiting: send 6 rapid login attempts, verify 429 on the 6th

---

## Accessibility Testing

Lightweight checklist per phase:

- [ ] All interactive elements have `aria-label` or visible text
- [ ] Color is not the sole status indicator (use icons/patterns alongside color)
- [ ] Touch targets are at least 44x44px
- [ ] Run Lighthouse accessibility audit, fix critical issues
- [ ] Test with VoiceOver on iPhone for key flows (login, food log, photo gallery)
