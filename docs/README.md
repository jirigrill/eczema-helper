# Eczema Tracker PWA

A personal progressive web application for tracking a breastfed newborn's atopic eczema through an elimination diet. The mother removes suspected trigger foods from her diet and gradually reintroduces them while the app correlates dietary changes with the child's eczema severity and stool quality over time, using AI-powered photo analysis. Designed for a single child.

## What the App Does

1. **Food Elimination Tracking** -- Log which foods are eliminated from the mother's diet and when they are reintroduced, organized by allergen category.
2. **Meal Logging** -- Record what the mother actually ate each day (e.g., "lunch: pork, potato, baked milk"), providing detailed dietary context alongside elimination tracking.
3. **Photo Diary with E2E Encryption** -- Take standardized photos of the child's skin (eczema tracking) and stool (diaper photos for food intolerance indicators), encrypted client-side before upload so the server never sees plaintext medical images.
4. **AI-Powered Photo Comparison** -- Compare two photos (skin or stool) side-by-side and get an automated assessment using Claude Vision API -- eczema trend for skin, color/consistency changes for stool.
5. **Trends and Correlations** -- Visualize eczema severity and stool quality over time alongside food changes and meal data to identify potential triggers.
6. **Push Notifications** -- Reminders to log food changes and take periodic photos.
7. **Pediatrician Export** -- Generate a PDF report (offline, client-side) or a Google Doc (online, with inline photos uploaded to Google Drive). Both contain elimination timeline, meal log, photo progression, severity charts, and AI analysis summaries. The Google Doc can be shared with the pediatrician via a link.

## Users

- **Both parents** -- Full access (shared account with shared encryption passphrase)
- **Pediatrician** -- Receives PDF export only (no app access)

## Technical Summary

- **UI Language:** Czech
- **Primary device:** iPhone (PWA installed to home screen), also works on Android
- **Hosting:** Local Docker on dev laptop (mkcert HTTPS, LAN-accessible) for development; self-hosted VPS with own domain for production
- **Architecture:** Ports & Adapters (Hexagonal) -- swappable AI providers, storage backends, and notification channels
- **Scope:** Single child (no multi-child support currently)

**Current implementation status:** Phase 0 (scaffold) and Phase 1 (auth) complete. Phase 2a (calendar + food elimination tracking) in development. See phase docs for details.

---

## Architecture Documentation

| Document | Description |
|---|---|
| [architecture/code-overview.md](architecture/code-overview.md) | **High-level code explanation for non-TypeScript developers** |
| [architecture/user-personas.md](architecture/user-personas.md) | Target users, goals, context of use, UX implications |
| [architecture/tech-stack.md](architecture/tech-stack.md) | Technology choices and rationale |
| [architecture/ports-and-adapters.md](architecture/ports-and-adapters.md) | Architecture pattern and layer diagram |
| [architecture/project-structure.md](architecture/project-structure.md) | Full directory tree with explanations |
| [architecture/data-models.md](architecture/data-models.md) | TypeScript interfaces and PostgreSQL schema |
| [architecture/encryption.md](architecture/encryption.md) | E2E encryption flow and key management |
| [architecture/auth-overview.md](architecture/auth-overview.md) | Passwords, sessions, API keys, OAuth tokens, env vars |
| [architecture/offline-strategy.md](architecture/offline-strategy.md) | Offline-first architecture, Dexie sync, conflict resolution |
| [architecture/api-routes.md](architecture/api-routes.md) | Complete API endpoint reference (all methods, auth, request/response) |
| [architecture/deployment.md](architecture/deployment.md) | Local dev (Docker + mkcert) and production VPS deployment |
| [architecture/testing-strategy.md](architecture/testing-strategy.md) | Test pyramid, conventions, database strategy, mock boundaries, CI pipeline |
| [architecture/test-coverage-map.md](architecture/test-coverage-map.md) | What is tested, with which test type, and where gaps exist |
| [architecture/ui-design.md](architecture/ui-design.md) | UI wireframes, navigation flow, design system, mobile UX conventions |

## Implementation Phases

| Phase | Document | Description |
|---|---|---|
| 0 | [phases/phase-0-scaffold.md](phases/phase-0-scaffold.md) | Project scaffold and dev environment |
| 1 | [phases/phase-1-auth.md](phases/phase-1-auth.md) | Authentication, child management, UI design review |
| 2a | [phases/phase-2-food-tracker.md](phases/phase-2-food-tracker.md) | Calendar + food elimination tracking + server API |
| 2b | [phases/phase-2-food-tracker.md](phases/phase-2-food-tracker.md) | Meal logging + copy-from-yesterday + offline sync |
| 3 | [phases/phase-3-photo-diary.md](phases/phase-3-photo-diary.md) | Photo diary (skin + stool) with E2E encryption |
| 4 | [phases/phase-4-ai-analysis.md](phases/phase-4-ai-analysis.md) | AI-powered photo analysis via server proxy (skin + stool) |
| 5 | [phases/phase-5-trends.md](phases/phase-5-trends.md) | Trends and correlation dashboard (uPlot charts) |
| 6 | [phases/phase-6-notifications.md](phases/phase-6-notifications.md) | Push notifications and reminders |
| 7 | [phases/phase-7-export.md](phases/phase-7-export.md) | Pediatrician export (PDF + Google Doc) |
| 8 | [phases/phase-8-deploy.md](phases/phase-8-deploy.md) | Polish, passkeys/WebAuthn, production deployment |
