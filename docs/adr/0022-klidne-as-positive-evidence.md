# ADR-0022 — Merged into ADR-0021

**Status:** Merged — content lives in [ADR-0021](0021-regional-severity-skin-observation.md) as the "Amendment — klidné as positive evidence (2026-06-29)" section.
**Date:** 2026-06-29 (original) · 2026-06-30 (merged)

This ADR was originally filed separately because it landed a week after ADR-0021 with its own PR (#382, issue #379). On review (2026-06-30) the two ADRs covered a single topic — the shape and semantics of the per-region skin-observation primitive — and were folded into one.

**Where the content moved:**

- *Klidné is positive evidence; every save witnesses all nine regions* → ADR-0021, "Amendment — klidné as positive evidence" section.
- *`canSave = true` always* → same section.
- *`loggedRegions` derivation removed* → same section.
- *Consequences (storage cost, backward compatibility, test asymmetry)* → same section.

This file is kept as a tombstone so the ADR number is not reused and existing inbound links resolve to a redirect rather than 404.

## References

- [ADR-0021](0021-regional-severity-skin-observation.md) — Per-region severity is the skin observation primitive (now the single source for both the shape decision and the klidné-as-evidence amendment)
- Issue #379 — fix(skin): klidné regions should persist as positive evidence
- PR #382 — original implementation
