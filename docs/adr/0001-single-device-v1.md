# 0001 — Single-device, single-actor architecture

## Overview

The whole app runs on one phone — the mother's — and nowhere else. There are no accounts, no login, no syncing between devices, and no server storing anyone's data; everything lives in the browser's local storage on that one phone. This is a deliberate choice, not a limitation we'll casually lift.

The reason is the protocol itself: it's a breastfeeding elimination diet, where the mother eats, allergens pass through breastmilk, and the baby reacts — so the person doing both the eating and the logging is the mother. Letting a second parent log from their own phone would demand a server, accounts, login, and machinery to reconcile simultaneous edits, and it would make us the custodian of a family's sensitive medical data under privacy law. That cost dwarfs the modest convenience gained.

The one carefully-bounded exception: when the app later asks an AI to *suggest* a schedule change, it may reach a thin online relay that holds no user data and stores nothing. So "no server" more precisely means "no server that holds your data" — everything of yours still lives only on the phone.

---

**Status:** Accepted
**Date:** 2026-05-11

> **Amendment (ADR-0027, 2026-07-25):** The "single-**actor**" half of this ADR's
> title is retired. Meals are now dual-actor (`mother` + `baby`) over a single
> mirrored schedule — see [ADR-0027](0027-dual-actor-mirrored-schedule.md). This
> is **not** a reversal of the single-*device* decision: still one phone, one
> journal, no accounts, no sync, no server holding user data. The
> GDPR-controller and multi-device-sync reasoning below is unchanged.

> **Amendment (ADR-0026, 2026-07-05):** An LLM schedule proposer (tracked in [PRD #423](https://github.com/jirigrill/eczema-helper/issues/423)) is reached through a **stateless edge-function BFF** (prompt + schema + key only,
> no storage bindings, client-redacted payloads). "No server" is refined to **"no
> server *holding user data*"** — the BFF is PII-free in transit and at rest, so
> the GDPR-controller and multi-device-sync reasoning below is **unchanged**;
> user data still lives only in IndexedDB on the mother's phone. Connectivity
> becomes **operation-tiered** (reads / deterministic mutations / event logging /
> export stay offline; only proposal *generation* is online). The BFF is an
> unauthenticated proxy to a paid key and therefore requires **endpoint-abuse
> protection** (origin allowlist, per-`device_id` rate limit, attestation, hard
> spend cap). Multi-device sync remains rejected.

## Context

The app is described as "single-child, two-parent". A two-parent household
could mean either parent logs from their own phone (mirrored across
devices) or that one parent logs on their device and the other simply
asks.

The protocol the app supports is a breastfeeding-era elimination diet:
the mother eats, allergens transit through breastmilk, the baby reacts.
The actor doing the eating-and-logging is therefore the mother.

Supporting two devices with mirrored data requires: a server (or P2P
sync), identity, auth, conflict resolution on concurrent writes, and a
key-exchange mechanism so an end-to-end encryption key can reach the
second device without ever existing in plaintext on the server. All of
this for medical data subject to GDPR.

## Decision

The app is single-device. All data lives in IndexedDB (via Dexie) on
one phone — the mother's. No server. No accounts. No sync.

If the co-parent needs visibility, an export (PDF / share sheet) can be
added later — also useful for the pediatrician.

## Consequences

- No auth layer, no server hosting, no GDPR-as-controller burden for a
  user database. The app is a local journal; the user holds the data.
- Device loss = data loss unless a backup mechanism exists. A backup /
  export story must be designed *before* the first user trusts the app
  with three months of medical observations. (Tracked in [#438](https://github.com/jirigrill/eczema-helper/issues/438).)
- Photos can be encrypted at rest with a passphrase-derived key without
  needing to design a multi-device key-distribution scheme.
- IDs in the schema can be locally-generated UUIDs without coordination.
  No vector clocks, no last-write-wins logic, no merge UI.
- Retrofitting sync later means a real migration: stable IDs are fine,
  but conflict resolution and key distribution become design problems
  the first time two devices write to the same record.
