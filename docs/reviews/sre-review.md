# SRE Audit Report: Eczema Tracker PWA

**Date:** 2026-03-25
**Reviewer:** SRE Review (12+ years production experience)
**Scope:** All documentation in `docs/` -- architecture, deployment, data models, encryption, auth, offline strategy, API routes, and phases 0-8
**Project State:** Documentation only -- no code implemented yet

---

## Executive Summary

The Eczema Tracker PWA documentation is remarkably thorough for a personal project. The architecture is well-considered (Ports & Adapters), the deployment model is clear (Docker Compose + Nginx + Let's Encrypt), and critical concerns like E2E encryption for medical photos, offline-first data, and backup strategy are all addressed. The documentation quality exceeds what most production teams produce.

That said, several gaps exist that would be expected in a production-grade system, even a personal one. The most critical concern is the absence of structured application logging and any form of alerting -- the system can fail silently for extended periods. Database migration strategy during deployments needs more thought. The CI/CD pipeline is entirely undocumented, relying on manual `git pull && docker compose build` commands. And while backup scripts exist, the backup verification and off-site strategy is marked "optional" when it should be mandatory for a system holding irreplaceable medical data.

**Overall verdict: The infrastructure and ops design is sufficient to begin implementation.** The identified gaps are addressable incrementally during development phases. None of the findings block starting Phase 0. The most important items to address before production deployment (Phase 8) are structured logging, alerting, backup verification, and off-site backup promotion from optional to required.

---

## Findings by Priority

### P0 -- Critical

#### F1: No Structured Application Logging

**Current state:** The deployment doc mentions `docker logs eczema-app` and Docker log rotation (max 10MB, 3 files). Phase 8 mentions server logs should not contain plaintext photos or passwords. No further logging strategy exists.

**Gap:** There is no structured logging framework specified. No log levels (info, warn, error). No request logging with correlation IDs. No way to trace a failed sync operation, a decryption failure, or a Claude API timeout back to a specific user action. When the cron job silently fails at 3 AM, nobody will know until a user complains about missing notifications.

**Recommendation:**
- Specify a structured logging library (e.g., `pino` -- lightweight, JSON output, works well with Node.js).
- Define log levels: ERROR for failures, WARN for degraded operations (e.g., Claude API rate limit), INFO for significant events (user login, photo upload, sync complete), DEBUG for development.
- Add request-level correlation IDs via SvelteKit hooks so that all log entries for a single request can be traced.
- Log to stdout/stderr (Docker captures this). Ship to a lightweight log aggregator if needed later.
- Explicitly document what must NEVER be logged: passwords, passphrase material, decrypted photo data, session tokens, API keys.

---

#### F2: No Alerting or External Monitoring

**Current state:** A health check endpoint (`GET /api/health`) exists and is polled by Docker's internal healthcheck. A disk space monitoring script runs daily and logs to `/var/log/eczema-monitor.log`. No external alerting is configured.

**Gap:** If the VPS goes down, the Docker daemon crashes, or the app enters a crash loop, nobody is notified. The disk space script writes to a log file that nobody reads. The health check restarts the container but does not alert on repeated failures. For a personal app, this might seem acceptable -- but this app tracks a newborn's medical condition, and silent data loss (e.g., unsynced food logs because the server was down for a week) would be damaging.

**Recommendation:**
- Add an external uptime monitor (free tier of UptimeRobot, Hetrix, or similar) that pings `GET /api/health` every 5 minutes and sends email/push alerts on failure.
- Modify the disk space script to send a push notification via the app's own Web Push infrastructure (the docs mention this possibility but do not implement it).
- Add a simple alerting mechanism for backup failures: if `backup-db.sh` exits non-zero, send an alert. A cron `MAILTO` to a real email address is the simplest approach.

---

### P1 -- High

#### F3: Off-Site Backup is "Optional" -- Should Be Mandatory

**Current state:** The backup strategy specifies daily encrypted PostgreSQL dumps (30-day retention) and daily rsync of photo blobs, both on the same VPS. Off-site backup via `rclone` is described but marked "Optional."

**Gap:** If the VPS disk fails, is compromised, or the hosting provider has an incident, both the primary data and its backups are lost simultaneously. The encrypted photos are irreplaceable (lost passphrase = unrecoverable by design, lost data = unrecoverable by physics). Food log data and analysis results are also gone. For medical tracking data of a child, single-point-of-failure for backups is unacceptable.

**Recommendation:**
- Promote off-site backup from "optional" to mandatory. At minimum, weekly rsync/rclone of `/backups/` to an off-site location (Hetzner Storage Box at ~3 EUR/month, Backblaze B2 free tier, or even a second cheap VPS).
- Add a backup verification step: after the weekly off-site sync, restore the latest DB dump to a temporary database and run a `SELECT COUNT(*)` on key tables. Log the result.
- Document the full disaster recovery procedure: provision a new VPS, restore from off-site backup, reconfigure DNS, validate data integrity.

---

#### F4: No CI/CD Pipeline Documented

**Current state:** The deployment update procedure in `deployment.md` is: `cd /opt/eczema-tracker && git pull origin main && docker compose build app && docker compose up -d app`. Phase 8 mentions a `scripts/deploy.sh` file but does not show its contents. No CI/CD pipeline is documented.

**Gap:** Manual deployment is error-prone. There is no automated testing before deployment. A broken build can be pushed to production. Database migrations are run manually (`docker exec eczema-app node build/migrate.js`). There is no rollback procedure.

**Recommendation:**
- At minimum, document a `deploy.sh` script that: (1) runs `npm run build` and `npx tsc --noEmit` locally before pushing, (2) SSHes to the VPS, (3) pulls the latest code, (4) builds the Docker image, (5) runs migrations, (6) restarts the app container, (7) runs a health check to verify the deployment.
- Consider a simple GitHub Actions workflow: on push to `main`, run `npm ci && npm run build && npx tsc --noEmit && npm test`. This catches type errors and test failures before they reach production.
- Document a rollback procedure: keep the previous Docker image tagged, so `docker compose up -d` with the old image is a one-command rollback.

---

#### F5: Database Migration Strategy During Deployment Has a Gap

**Current state:** Migrations are sequential SQL files run by a custom `scripts/migrate.ts` runner. The deployment doc says to run migrations via `docker exec`. Migrations must be idempotent.

**Gap:** There is no discussion of:
- What happens if a migration fails halfway (partial schema state).
- How to handle migrations that require downtime (e.g., adding a NOT NULL column to a populated table).
- Whether migrations run before or after the new app version starts (the current process starts the new app, then runs migrations -- this can cause errors if the new code expects columns that do not exist yet).
- Transaction wrapping for migrations.

**Recommendation:**
- Run migrations BEFORE starting the new app version. The deploy script should: (1) pull code, (2) build image, (3) run migrations against the running PostgreSQL container (without restarting the app), (4) restart the app container.
- Wrap each migration in a transaction (`BEGIN; ... COMMIT;`). If any statement fails, the entire migration rolls back.
- For a personal app, this is sufficient. No need for zero-downtime migrations.

---

#### F6: Claude API Circuit Breaker / Timeout Not Specified

**Current state:** The Claude Vision adapter handles HTTP 429 (rate limit) and network errors. The server proxy forwards the request to `api.anthropic.com` and streams the response back. No timeout, circuit breaker, or retry logic is documented.

**Gap:** If the Claude API is slow or unresponsive, the server proxy will hold the connection open indefinitely, tying up a Node.js event loop slot. Photos (potentially several MB each as base64) are held in server memory for the duration. Multiple concurrent slow requests could exhaust memory. There is no circuit breaker to stop sending requests to a known-failing API.

**Recommendation:**
- Set a request timeout on the Claude API call (e.g., 60 seconds). If exceeded, return a timeout error to the client.
- Limit concurrent analysis requests (e.g., max 2 simultaneous Claude API calls). Queue additional requests or return "busy" status.
- Implement a simple circuit breaker: after N consecutive failures (e.g., 3), stop sending requests for M minutes and return an error immediately. Reset on success.
- Consider streaming the response back to the client instead of buffering it entirely in server memory.

---

### P2 -- Medium

#### F7: Session Cleanup is Vaguely Defined

**Current state:** The auth overview says expired sessions are cleaned up "periodically" via "server-side cron or on each request with probabilistic check." No implementation is specified.

**Gap:** Without explicit cleanup, the sessions table will grow indefinitely. For a 2-user app, this is not a disk space concern, but stale sessions increase query time for the session validation that runs on every request.

**Recommendation:**
- Add session cleanup to the existing cron infrastructure. Since `node-cron` is already running every minute for notifications (Phase 6), add a daily task: `DELETE FROM sessions WHERE expires_at < NOW()`.
- Alternatively, add it to the daily backup cron: run `docker exec eczema-postgres psql -U eczema -d eczema -c "DELETE FROM sessions WHERE expires_at < NOW()"` before the backup.

---

#### F8: No Resource Limits on Docker Containers

**Current state:** Docker Compose configurations specify `restart: unless-stopped` but no memory or CPU limits.

**Gap:** A memory leak in the Node.js app (e.g., from holding decrypted photos in memory during analysis) could consume all VPS memory, causing the PostgreSQL container to be OOM-killed. On a 1 GB VPS (the minimum spec), this is a real risk.

**Recommendation:**
- Add resource limits to the app container: `deploy: resources: limits: memory: 512M` (or `mem_limit: 512m` for Compose v2). This ensures the app is killed before it starves PostgreSQL.
- Add a memory limit to PostgreSQL as well: `mem_limit: 256m` with appropriate `shared_buffers` configuration.
- Monitor memory usage via the health check endpoint (add `memoryUsage: process.memoryUsage().rss` to the health response).

---

#### F9: Sync Conflict Resolution is Simplistic

**Current state:** Offline strategy uses last-write-wins by `updatedAt` timestamp. No conflict log. Acceptable for 2 users.

**Gap:** The document correctly identifies this as acceptable for 2 users. However, there is no handling of clock skew between devices. If one parent's phone has a clock that is 5 minutes ahead, their writes will always win regardless of actual ordering. Also, there is no mention of what happens if the same record is created offline on two devices (duplicate UUIDs are extremely unlikely but duplicate logical records -- e.g., both parents log the same food elimination -- are possible).

**Recommendation:**
- Use server-side timestamps for conflict resolution instead of client-side `updatedAt`. When a record is pushed from Dexie to the server, the server sets `updatedAt = NOW()`. The push order determines the winner.
- For duplicate logical records (same food elimination logged by both parents), add a unique constraint or deduplication check on `(child_id, date, category_id, action)` in the food_logs table.
- Document this decision explicitly in the offline strategy.

---

#### F10: Photo Upload Has No Size Validation on Server

**Current state:** Nginx sets `client_max_body_size 10M`. Client-side compression targets max 1920px JPEG at 80% quality. No server-side validation of the uploaded blob size or content.

**Gap:** A malicious or buggy client could send a 10MB blob on every request. While the blobs are encrypted (so content-type validation is impossible), size validation is still possible and important. Repeatedly uploading maximum-size blobs could fill the disk faster than the estimated 35-65 MB/month.

**Recommendation:**
- Add server-side validation in `POST /api/photos`: reject blobs larger than 5MB (encrypted JPEG at 80% quality from a 1920px image should be well under 3MB).
- Track per-user upload volume (could be a simple daily counter) and add a reasonable rate limit (e.g., max 50 photos per day).
- The Nginx `client_max_body_size 10M` is fine as a first line of defense, but the app should enforce its own tighter limit.

---

#### F11: No Graceful Shutdown Handling

**Current state:** The Dockerfile CMD is `node build`. Docker sends SIGTERM on `docker stop`. No signal handling is documented.

**Gap:** If the app is in the middle of processing a photo upload or running a database migration when Docker sends SIGTERM, the operation will be interrupted. SvelteKit's adapter-node does handle SIGTERM by default, but the PostgreSQL connection pool needs to be drained, the cron job needs to be stopped, and any in-flight photo uploads should complete.

**Recommendation:**
- Document that the Node.js process should handle SIGTERM: stop accepting new requests, drain the connection pool (postgres.js `sql.end()`), stop the cron job, then exit.
- Set `stop_grace_period: 30s` in Docker Compose to give in-flight requests time to complete.
- Verify that SvelteKit's adapter-node handles this correctly out of the box (it does in most configurations).

---

#### F12: IndexedDB Storage Quota Not Addressed

**Current state:** Dexie.js stores encrypted photo blobs locally in IndexedDB. The offline strategy mentions "evicting full-size blobs if device storage is low."

**Gap:** Browser storage quotas vary wildly. Safari limits IndexedDB to ~1GB per origin. Chrome is more generous but can evict data under storage pressure. There is no mechanism to detect approaching the quota limit, no user-visible indicator, and no graceful degradation when the quota is exceeded.

**Recommendation:**
- Use `navigator.storage.estimate()` to check available storage and display a warning when usage exceeds 80% of the quota.
- Implement an eviction strategy: thumbnails are always kept; full-size blobs are evicted LRU-first when storage pressure is detected.
- Request persistent storage via `navigator.storage.persist()` after PWA installation to reduce the risk of browser-initiated eviction.

---

### P3 -- Low

#### F13: No Database Connection Pooling Configuration Guidance

**Current state:** The PostgreSQL connection pool is configured as `{ max: 10, idle_timeout: 30, connect_timeout: 10 }` in `db.ts`.

**Gap:** For a 1 GB VPS running both the app and PostgreSQL, 10 connections is likely fine. However, there is no guidance on tuning this for the production environment. PostgreSQL's default `max_connections` is 100, but on a small VPS with limited memory, each connection consumes ~5-10MB.

**Recommendation:**
- Add a comment in the deployment doc: for a 1GB VPS, set PostgreSQL `max_connections = 30` and the app pool `max = 5`. This leaves room for direct psql access and the migration runner.
- No action needed now -- this is a deployment-time tuning concern.

---

#### F14: Let's Encrypt Certificate Renewal Verification

**Current state:** The deployment doc correctly sets up certbot with a systemd timer and mentions `certbot renew --dry-run` for testing. The timer runs twice daily.

**Gap:** While certbot auto-renewal is well-documented, there is no verification that Nginx actually picks up the renewed certificate. The doc mentions that certbot's `--deploy-hook` reloads Nginx, but does not verify this is configured.

**Recommendation:**
- Add to the deployment checklist: after initial certbot setup, verify the deploy hook exists: `certbot certificates` should show the renewal configuration. Run `certbot renew --dry-run` and verify Nginx reloads.
- Consider adding a simple cron check: `openssl s_client -connect eczema.example.com:443 2>/dev/null | openssl x509 -noout -enddate` and alert if the certificate expires within 14 days.

---

#### F15: No WAL Archiving for PostgreSQL

**Current state:** Backups use `pg_dump` (logical dump) daily.

**Gap:** `pg_dump` provides point-in-time recovery to the last backup only. If the database is corrupted or data is accidentally deleted at 14:00, the daily 03:00 backup loses up to 11 hours of data.

**Recommendation:**
- For a personal app with 2 users, daily `pg_dump` is likely sufficient. The data volume is tiny and can be recreated from the two phones' Dexie.js caches in many cases.
- If more granular recovery is desired later, enable WAL archiving with `archive_mode = on` and `archive_command` to copy WAL files to the backup directory. This enables point-in-time recovery to any moment.
- This is not critical for Phase 8 but worth noting for future enhancement.

---

#### F16: Backup Encryption Uses Deprecated OpenSSL Flag

**Current state:** The backup script uses `openssl enc -aes-256-cbc -salt -pbkdf2`.

**Gap:** This is functional but uses a key file (`backup.key`) stored on the same server as the backups. If the server is compromised, the attacker has both the encrypted backups and the decryption key. Additionally, AES-CBC without explicit iteration count uses OpenSSL's default (which has varied across versions).

**Recommendation:**
- For the on-server backups, this is defense-in-depth and acceptable. The real protection is the off-site backup.
- For off-site backups, consider GPG encryption with a key whose private half is NOT stored on the server (only the public key). Phase 8 mentions a GPG key pair but the backup script uses OpenSSL instead.
- Add `-iter 100000` to the OpenSSL command to explicitly set the PBKDF2 iteration count.

---

#### F17: Docker Compose Version Field is Deprecated

**Current state:** `docker-compose.yml` uses `version: "3.8"`.

**Gap:** Docker Compose V2 (which is required per the tech stack doc) ignores the `version` field entirely. It generates a deprecation warning but functions correctly. Minor cosmetic issue.

**Recommendation:**
- Remove the `version: "3.8"` line from both `docker-compose.yml` and `docker-compose.dev.yml`. Docker Compose V2 determines the format automatically.

---

#### F18: Health Check Endpoint Could Be More Comprehensive

**Current state:** `GET /api/health` returns `{ status, database, photoStorage, timestamp }`.

**Gap:** The health check does not verify:
- That the cron scheduler is running (notifications could silently stop).
- Available disk space (photos could fill the disk).
- Memory usage (OOM approaching).
- Pending sync queue depth (if many records are stuck unsynced, something is wrong).

**Recommendation:**
- Expand the health check to include: `diskFreeBytes`, `memoryUsageMB`, `cronRunning: boolean`, `pendingSyncCount` (number of records with `synced_at IS NULL` older than 1 hour).
- Keep the basic check fast (under 100ms). Use a separate `/api/health/detailed` endpoint for the extended checks if needed.

---

#### F19: No Rate Limiting on Photo Upload Endpoint

**Current state:** Nginx rate-limits `/api/auth/*` at 5 req/min and `/api/*` at 30 req/min. Photo uploads (`POST /api/photos`) fall under the general `/api/*` limit.

**Gap:** 30 photo uploads per minute is extremely generous. Each upload involves writing an encrypted blob to disk (potentially 2-3 MB) and a database insert. A misbehaving client could upload 30 photos per minute, consuming ~90 MB of disk per minute.

**Recommendation:**
- Add a dedicated Nginx rate limit zone for photo uploads: `limit_req_zone $binary_remote_addr zone=photos:10m rate=5r/m;` and apply it to `location /api/photos`.
- This is unlikely to be hit in normal usage (a user taking 5 photos per minute would be unusual) but provides protection against bugs or abuse.

---

#### F20: Cron Job Runs Inside the App Container

**Current state:** The notification cron runs via `node-cron` inside the SvelteKit app process. The backup cron runs via system crontab on the host.

**Gap:** If the app container crashes or restarts, the `node-cron` scheduler resets. If the app takes 30 seconds to restart (which is the Docker health check `start_period`), any reminders due during that window are missed. There is no catch-up mechanism.

**Recommendation:**
- For a personal app, missing an occasional reminder during a restart is acceptable.
- If this becomes an issue, the scheduler could record the last successful check time and catch up on missed windows at startup.
- The backup cron correctly runs on the host, not in the container, which is the right pattern.

---

## Summary Table

| ID | Priority | Finding | Phase to Address |
|----|----------|---------|-----------------|
| F1 | P0 | No structured application logging | Phase 0 (setup pino) |
| F2 | P0 | No alerting or external monitoring | Phase 8 (deploy) |
| F3 | P1 | Off-site backup should be mandatory | Phase 8 (deploy) |
| F4 | P1 | No CI/CD pipeline documented | Phase 0 or Phase 8 |
| F5 | P1 | Database migration ordering during deploy | Phase 1 (first migration) |
| F6 | P1 | Claude API lacks timeout/circuit breaker | Phase 4 (AI analysis) |
| F7 | P2 | Session cleanup not implemented | Phase 1 (auth) |
| F8 | P2 | No Docker resource limits | Phase 8 (deploy) |
| F9 | P2 | Sync conflict uses client timestamps | Phase 2b (offline sync) |
| F10 | P2 | No server-side photo size validation | Phase 3 (photo diary) |
| F11 | P2 | No graceful shutdown handling | Phase 8 (deploy) |
| F12 | P2 | IndexedDB storage quota not addressed | Phase 3 (photo diary) |
| F13 | P3 | DB pool tuning guidance missing | Phase 8 (deploy) |
| F14 | P3 | TLS renewal verification | Phase 8 (deploy) |
| F15 | P3 | No WAL archiving | Future enhancement |
| F16 | P3 | Backup encryption key on same server | Phase 8 (deploy) |
| F17 | P3 | Docker Compose version field deprecated | Phase 0 (scaffold) |
| F18 | P3 | Health check could be more comprehensive | Phase 8 (deploy) |
| F19 | P3 | No dedicated rate limit for photo uploads | Phase 3 or Phase 8 |
| F20 | P3 | Cron missed windows during restart | Phase 6 (notifications) |

---

## Positive Observations

These aspects of the design are well-done from an SRE perspective and deserve recognition:

1. **Health checks with dependency verification.** The `GET /api/health` endpoint checks both database connectivity and photo storage accessibility. Docker healthchecks are configured with appropriate intervals, timeouts, and start periods. The app container waits for PostgreSQL readiness via `depends_on: condition: service_healthy`.

2. **Defense in depth for secrets.** Environment variables are properly segregated (server-only vs. client-safe). The Claude API key never reaches the client. Google OAuth refresh tokens are encrypted at rest. Session cookies use `HttpOnly`, `Secure`, `SameSite=Lax`. The `.env` file is gitignored. Rotation procedures are documented for every secret.

3. **Network security.** PostgreSQL is on an internal Docker network, not exposed to the host on production. The app binds to `127.0.0.1:3000` (not `0.0.0.0`), so only Nginx can reach it. Nginx security headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) are well-configured.

4. **Photo storage architecture.** E2E encryption means a server compromise does not expose medical images. Photos are stored as flat files on the filesystem (easy to backup with rsync), not in the database (which would bloat pg_dump). The directory structure (`{childId}/{date}/{photoId}.enc`) is human-navigable.

5. **Disk usage estimation.** The deployment doc includes a realistic estimate (~35-65 MB/month) and concludes that 20 GB would last 25+ years. This demonstrates thoughtful capacity planning.

6. **Multi-stage Docker build.** The Dockerfile uses a builder stage and a production stage, producing a smaller image without dev dependencies. A non-root user (`appuser`) is created for the production stage.

7. **Offline-first design.** The Dexie.js sync engine with push-then-pull ordering, debounced push after mutations, and multiple sync triggers (online event, periodic poll, visibility change, manual pull-to-refresh) is well-designed for reliability.

8. **Registration lockdown.** The `REGISTRATION_ENABLED=false` flag prevents unauthorized account creation after the two parents register. Simple and effective.

---

## Final Verdict

**The infrastructure and operations design is sufficient to begin implementation.**

The documentation is exceptionally detailed for a personal project. The two P0 findings (structured logging and alerting) should be incorporated early -- logging in Phase 0 and alerting in Phase 8 -- but neither blocks starting development. The P1 findings (off-site backup, CI/CD, migration ordering, API circuit breaker) should be addressed in their respective phases before going to production.

The design is deliberately simple (single VPS, Docker Compose, filesystem storage) which is appropriate for a 2-user personal app. This simplicity is a feature, not a limitation -- it reduces operational surface area and makes the system easier to reason about, debug, and maintain.

Begin implementation with confidence. Address the findings incrementally as each phase is built.
