# Contributing

All changes via PR, squash-merged (title → commit subject, body → description). Direct pushes to `main` blocked.

## PR Title

```
<scope>: <imperative summary under 72 chars>
```

Scopes: `ci`, `docs`, `fix`, `feat`, `refactor`, `chore`.

Examples:
- `prototype: tighten schedule generation for severe eczema`
- `ci: fix type check on Bun 1.2`
- `docs: note minimum Node version`

## PR Description

```
## What
Brief description of the change.

## Why
Motivation or context.

## Examples (if applicable)
Before/after snippet, API example, or screenshot.
```

## AI-Assisted Contributions

Agent-authored PRs are expected here, not discouraged — this repo has an `AGENTS.md` and a `docs/agents/` directory. The relevant policy is how they self-identify, not whether they're allowed:

- **Autonomous agent runs** (e.g. Sandcastle/`RALPH`, see `.sandcastle/README.md`) prefix every commit subject and PR title with `RALPH:`. They run in one of two modes:
  - **legacy** (default) — one PR per issue on branch `agent/ralph-issue-<N>`, body opens with `Closes #<N>`.
  - **integrated** (`--mode=integrated`) — one PR per PRD on branch `agent/prd-<N>`, opened by an integrator agent after all issues are merged and the full suite is green. Body opens with a `Closes #<N>` line for **every** integrated issue and includes `## Integrated issues`, `## Not included` (dropped or unscheduled issues, with reasons), `## Touched during integration`, and `## Code review` sections. A run is **resumable**: it adopts an existing `agent/prd-<N>` branch, skips issues already merged onto it, and updates the open PR instead of creating a second one — so a partially-executed PRD continues without redoing work or waiting for its PR to land.
- **Human-directed AI pair-programming** (a contributor working interactively with an assistant) follows the normal branch, commit, and PR conventions below — no special prefix. The human reviews and is accountable for what's proposed before it ships.

## Branch Naming

```
<scope>/<short-description>
```

Same scopes as PR titles, e.g. `fix/472-svelte-check-errors`, `docs/date-strip-prototype`. Autonomous agent branches use `agent/ralph-issue-<N>` (legacy mode) or `agent/prd-<N>` (integrated mode) instead (see above).

## CI

Required before merge:
- **Format** — `prettier --check "src/**/*.{ts,svelte}"` (run `just fmt` to fix)
- **Lint** — `eslint .` (run `just lint` / `just lint-fix`)
- **Type Check** — `bun run check` (`svelte-check` — also type-checks `.svelte` templates, which `tsc --noEmit` does not)
- **Build** — `bun run build`
- **Unit Tests** / **E2E Tests** — `bun run test` / `playwright test`

## Commit Messages

- Same scope prefixes as PR titles
- Concise, action-oriented (add, fix, update, remove)
- No Co-Authored-By lines

## After Merge

```bash
git checkout main
git pull
git branch -d <feature-branch>
```

After an autonomous agent run, use `just sandcastle-sync` instead — squash merges diverge local `main`, so it does `git reset --hard origin/main` (never `git pull`) and prunes leftover `agent/*` branches.
