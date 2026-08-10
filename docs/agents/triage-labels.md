# Triage labels

Five canonical roles for issue triage. These labels are applied and removed as issues move through their lifecycle.

| Label | Meaning | Applied when | Removed when |
|-------|---------|--------------|--------------|
| `needs-triage` | Maintainer needs to evaluate and classify | Issue is filed | Maintainer decides it's clear (`ready-for-agent`), needs info (`needs-info`), or will not be done (`wontfix`) |
| `needs-info` | Waiting on reporter or external clarification | Maintainer determines the spec is incomplete | Reporter provides details and maintainer removes it, or issue goes stale |
| `ready-for-agent` | Fully specified and actionable; an agent can pick it up with no human context | Maintainer has evaluated and determined it's clear and ready | Issue is assigned or completed |
| `ready-for-human` | Requires human implementation, review, or sign-off | Issue requires human judgment or creative work beyond agent scope | Human picks it up or issue is closed |
| `wontfix` | Will not be actioned | Maintainer decides issue is out of scope, duplicate, or will not be prioritized | (stays until issue is closed) |

## How to use

- When filing an issue yourself or via a skill, start without labels. Triage will add `needs-triage`.
- When triaging, read the issue, then apply exactly one of: `needs-info`, `ready-for-agent`, `ready-for-human`, or `wontfix`.
- Remove `needs-triage` when you apply a disposition label.
- An issue with `needs-info` → gets info → remove `needs-info`, apply `ready-for-agent`.
- An issue with `ready-for-agent` → agent picks it up → no label change needed. When agent closes it, you can close the issue.

## `parked` — the default-view filter

`parked` marks an issue whose subject was parked by the descaling (PRD #623) and now lives
only in the annotated tag `parked/protocol-engine`. It is **not** a state role — it is a
visibility filter that sits alongside one.

- **Default view excludes it:** `gh issue list --search "-label:parked"`
- **A parked issue carries `ready-for-human`, never `ready-for-agent`**, so that
  `gh issue list --label ready-for-agent` never hands an agent work against code that is not
  in the tree. Reviving needs a human decision to unpark the feature first.
- The work itself is still considered valid — parked means *not actionable against today's
  tree*, not *rejected*. Rejection is still `wontfix`.
- The comment applying it names the owning parked feature in `docs/parked-features.md`, which
  is the slicing index for restoring it.

## Other labels (not triage-driven)

Your repo also uses:
- `bug`, `enhancement`, `documentation`, `chore`, `i18n` — categorize the type of work
- `architecture` — architectural concern; review before merging
- `dependencies` — automated (Dependabot)
- `good first issue`, `help wanted` — community engagement
- `duplicate`, `invalid`, `question` — issue categorization (not triage)
- `wontfix` — overlaps with triage (this is a triage disposition)

These can be applied alongside triage labels. The five canonical ones above are the ones skills focus on.
