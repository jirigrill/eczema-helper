# Issue tracker

**Tracker:** GitHub Issues (jirigrill/eczema-helper)

**CLI:** `gh` (GitHub CLI)

**External PRs as triage surface:** No. Collaborator PRs are not triaged through the same labels as issues.

## How skills use this

- `to-issues`: Files new issues via `gh issue create`
- `triage`: Reads issues, applies labels, moves through states
- `to-prd`: Converts issues to spec documents
- `qa`: Files bugs and feature requests as issues

## Issue lifecycle

Issues move through these states via labels (see `docs/agents/triage-labels.md`):

1. **Incoming** — issue is filed
2. **`needs-triage`** — maintainer needs to evaluate
3. **`needs-info`** or **`ready-for-agent`** — depends on clarity
4. **`ready-for-human`** or **`wontfix`** — final disposition

All state changes are label-driven. No custom fields or projects required.

## Querying

Common queries for skills:

```bash
# Issues ready for an agent to pick up
gh issue list --label ready-for-agent --state open

# Issues waiting on more info
gh issue list --label needs-info --state open

# Issues needing triage
gh issue list --label needs-triage --state open

# Closed/won't-fix
gh issue list --label wontfix --state closed
```

All skills will use `gh` CLI internally; you don't need to run these manually.
