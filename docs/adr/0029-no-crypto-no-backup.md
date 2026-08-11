# 0029 — No crypto in the tree: the app has no backup and no encryption at rest

## Overview

The app keeps no backup of anything, and nothing it stores is encrypted. There
is one copy of the journal — the IndexedDB database on the one phone — and if
that phone is lost, wiped, or reset from the Settings screen, a multi-month
medical record is gone for good. Photos of the baby's skin sit in that database
as ordinary unencrypted blobs, exactly like every meal and every observation.

This was not always the plan. An earlier decision (the former ADR-0002) named an
encrypted manual export as the minimum acceptable backup, and the crypto needed
to build it — AES-256-GCM with a passphrase-derived key — was written and tested
up front. Nothing was ever built on top of it. The module sat in the tree for
months with no caller but its own test, while the documentation around it drifted
into describing protection that did not exist. So the module is deleted and the
plan is retired rather than left pending: encrypted export is not being built,
and neither is encryption at rest.

The cost is accepted deliberately, and it sets a boundary on who may use the app:
it stays on the developer's own phone. Handing it to anyone who would trust it
with three months of observations means building a backup first.

---

**Status:** Accepted
**Date:** 2026-08-11
**Supersedes:** the former ADR-0002 (encrypted manual export as the v1 backup
floor) and the former ADR-0005 (photos plaintext at rest, encryption-at-rest as a
hard release gate). Both files were removed in an earlier docs reshape; this ADR
is where their subject matter now lives.
**Amends:** [ADR-0001](0001-single-device-v1.md) — its Consequences section said a
backup story "must be designed" and that photos "can be encrypted at rest". Both
now read as the decisions recorded here.
**Issues:** [#438](https://github.com/jirigrill/eczema-helper/issues/438) (export
payload builder — to be closed as not planned when this lands), [#467](https://github.com/jirigrill/eczema-helper/issues/467)
(photo encryption at rest — closed `wontfix`).

## Context

`src/lib/crypto/encryption.ts` shipped in the Phase 0 scaffold: AES-256-GCM,
PBKDF2 at 600K iterations, random salt and IV per call, output framed as
`[salt][iv][ciphertext+tag]`. The primitives were sound and thoroughly tested.

They were also unreachable. Verified against the parent commit, the module's only
importer was its own test file:

```
$ git grep -nE "lib/crypto|from '\./encryption'" 706bec7 -- src tools vitest.config.ts
706bec7:src/lib/crypto/encryption.test.ts:3:import { decrypt, encrypt } from './encryption';
```

Two consumers were once expected, and both are gone:

- **Encrypted manual export (#438).** The former ADR-0002 called this the v1
  backup floor. The payload builder that would have produced a body for
  `encrypt()` to wrap was never written; the ADR file itself was removed in the
  docs reshape, leaving the tracker issue as the only record of the intent.
- **Photo encryption at rest (#467).** Closed `wontfix` as deprioritized.

Meanwhile the module's own doc comment claimed a scenario this app does not have:
"The encryption happens in the browser before upload, so the server only stores
opaque encrypted blobs." There is no server and no upload. Documentation
elsewhere had drifted the same way, citing a closed issue as a live release gate.
Dead crypto in the tree invited exactly this — the standing assumption that
something was protected when nothing was.

The alternative was to build #438 as its triage brief specified. Rejected: the
app is single-device by [ADR-0001](0001-single-device-v1.md) and single-user in
practice, so an export format — catastrophic to change once anyone holds saved
backups — would be designed for a user base of one, ahead of any demand for it.

## Decision

No cryptography ships in the application. `src/lib/crypto/` is deleted. Encrypted
manual export is not being built, and neither is encryption at rest.

"No crypto" here means **no application-level encryption**: no AES-256-GCM, no
PBKDF2, no key derivation, no `crypto.subtle`. It does not mean the Web Crypto
API is untouched — `src/lib/utils/uuid.ts` uses `crypto.randomUUID()` and
`crypto.getRandomValues()` for ID generation, and that stays.

Reintroducing either capability requires revising this ADR first.

## Consequences

- **There is no backup of any kind.** Losing the phone, replacing it, or tapping
  the Settings factory reset destroys the journal permanently. The reset stays
  gated behind a destructive confirm, which is now the only thing between one tap
  and total loss.
- **Every record is plaintext in IndexedDB**, photos included. Anyone with the
  unlocked phone has the medical record; device-level encryption and the screen
  lock are the whole of the protection.
- **The app stays on the developer's own phone.** This is the operative
  constraint, not a soft preference: a backup must exist before anyone else is
  asked to trust it with months of observations.
- **The security rules in
  [code-standards.md](../architecture/code-standards.md) no longer legislate
  encryption**, because there is none to legislate.
- **Reviving this is not a straight `git revert`.** The module is recoverable
  from history (last present at `706bec7`) and its primitives are still sound,
  but the one-shot `encrypt(data, passphrase)` shape re-derives the key on every
  call. That is fine for a single export blob and wrong for at-rest use, which
  needs a cached `CryptoKey`. Restoring the file gets the algorithms back, not a
  usable at-rest design.
- **A future backup need not be encrypted at all.** A plain unencrypted export to
  the device's own file system would already remove the total-loss failure mode;
  encryption was a property of the abandoned design, not a requirement that
  outlived it.
