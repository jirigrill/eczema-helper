# Sandcastle — RALPH Agent Orchestration

Autonomous coding agents that work through GitHub issues, open PRs, and verify with `just check` + `just test`.

## Prerequisites

- Docker Desktop running
- `.sandcastle/.env` configured (copy from `.env.example`)
- `sandcastle:atopic_helper` Docker image built

## Setup

```bash
cp .sandcastle/.env.example .sandcastle/.env
# fill in ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY, GH_TOKEN

just sandcastle-build
```

The image bakes a warm Bun install cache from `bun.lock` (see `Dockerfile` `warmup` step). Rebuild the image any time you add/remove dependencies — the cache tracks the lockfile snapshot, not the live lockfile. `just sandcastle-build` stages `package.json` + `bun.lock` into `.sandcastle/` for Docker's build context and cleans up on exit.

## Commands

```bash
# Run agents for a PRD (planner + parallel workers)
bunx tsx .sandcastle/main.ts <prd-issue-number> [--mode=legacy|integrated]

# Example — legacy mode (default): one PR per issue
bunx tsx .sandcastle/main.ts 284

# Example — integrated mode: one PR for the whole PRD
bunx tsx .sandcastle/main.ts 284 --mode=integrated

# Watch a worker's live output
tail -f .sandcastle/logs/<logfile>.log

# List recent logs
ls -t .sandcastle/logs/
```

## Modes

`--mode` selects how worker output reaches you. Default is `legacy` — the flag is
additive, so nothing changes unless you pass `--mode=integrated`.

| | `legacy` (default) | `integrated` |
|---|---|---|
| Worker base branch | `main` | `agent/prd-<N>` (rebased per batch) |
| Dependent issues see blocker's code | no — built blind against `main` | yes — built on the blocker's committed code |
| Worker failure | logged, run continues | retry once, then drop issue + its downstream subtree |
| Review | worker self-reviews its slice once | worker loops to convergence **+** integrator reviews the whole diff |
| PRs you review | one per issue | **one per PRD** |
| Rebasing onto `main` | you, per branch | none — serial merges into one branch |

Pick `integrated` when a PRD is a coherent feature you'd want to review and
frontend-test as a whole. Keep PRDs reviewable-sized: a giant feature is better
split into 2–3 smaller PRDs (each yields one digestible PR) than merged as one
3000-line diff.

## How It Works — legacy mode

1. **Planner** — reads PRD issue + all linked open issues, builds a dependency graph
2. **Batches** — topological sort produces parallelizable batches (independent issues run simultaneously, max 3)
3. **Workers** — each worker gets one issue, creates `agent/ralph-issue-<N>` branch, implements via TDD, opens a PR (`Closes #N`)
4. **You** — review PRs, merge when satisfied
5. **Repeat** — re-run same command; planner picks up newly unblocked issues

## How It Works — integrated mode

1. **Planner** — same dependency graph and batches as legacy.
2. **Integration branch** — orchestrator creates `agent/prd-<N>` off `main`.
3. **Staged batches** — each batch's workers branch off the *current* `agent/prd-<N>`,
   run in parallel (max 3), self-review their slice to convergence, and commit.
   When the batch finishes, its branches merge into `agent/prd-<N>` (serial, in order).
   The next batch branches off the updated integration branch — so dependent issues
   build on their dependencies' real committed code, not a guess against `main`.
4. **Failure handling** — a failed worker is retried once in a fresh sandbox. If it
   still fails, its issue **and everything transitively downstream of it** are dropped;
   the coherent remainder still integrates. The integration branch never contains an
   issue whose blocker was dropped.
5. **Integrator** — after all batches, one integrator agent reviews the whole
   `agent/prd-<N>` diff against `main`, fixes findings (logging which regions it
   touched), and runs `just check` + `just test` (incl. Playwright E2E). Only if the
   full suite is green does it open **one** PR (`agent/prd-<N>` → `main`, with a
   `Closes #N` line per integrated issue). If it cannot reach green, it opens no PR and
   reports — the branch is left intact for inspection.
6. **End-of-run summary** — the terminal prints the PR URL + integrated issues +
   integrator-touched log on success, or the failed stage + preserved branch + last
   error on failure.
7. **You** — frontend-test and squash-merge the one PR. Skipped issues stay open for a
   later run.

## After a Run Merges

```bash
just sandcastle-sync   # git reset --hard origin/main + prune leftover agent/* locals
```

`just sandcastle-sync` handles the one thing that must happen on your machine after a
squash-merge (local `main` diverges — never use `git pull`) and prunes any leftover
`agent/*` local branches in one step.

- **legacy** leaves one `agent/ralph-issue-<N>` branch per merged PR — `sandcastle-sync`
  prunes them.
- **integrated** deletes its intermediate per-worker branches at end of run, and GitHub
  auto-deletes `agent/prd-<N>` on merge — `sandcastle-sync` only re-syncs local `main`.

## .env Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_BASE_URL` | Proxy URL — `http://host.docker.internal:8082` |
| `ANTHROPIC_API_KEY` | Any non-empty string — proxy ignores it |
| `GH_TOKEN` | GitHub token with repo + issues scope |

## Files

| File | Purpose |
|---|---|
| `main.ts` | Orchestrator — planner + batch execution; `--mode` selects legacy/integrated |
| `plan-prompt.md` | Planner agent prompt — reads PRD, outputs dependency JSON |
| `worker-prompt.md` | Worker agent prompt — TDD workflow; opens a PR (legacy) or commits its branch for integration |
| `integrator-prompt.md` | Integrator agent prompt (integrated mode) — whole-diff review, full suite, one PRD PR |
| `skills/` | Agent skills vendored from `~/.agents/skills`, copied into the image at `~/.claude/skills` (worker prompt uses `tdd` and `code-review`). Re-sync when a source skill changes. |
| `Dockerfile` | Sandbox image — Node 22 + Bun + just + gh CLI + Playwright + Claude Code |
| `.env.example` | Template for secrets |

## Troubleshooting

**`bun: not found` inside container**
Dockerfile missing Bun install. Rebuild: `just sandcastle-build`

**`gh auth login` error / GH_TOKEN missing**
Add `GH_TOKEN=<token>` to `.sandcastle/.env`. Get a token via `gh auth token` (or `ghp auth token` on machines where the wrapper unsets `GH_HOST`/`GH_TOKEN` for enterprise auth). Sandcastle injects the value into the container, bypassing whatever your host shell has set — so a mis-set `GH_TOKEN` env var on your host doesn't affect worker auth as long as `.sandcastle/.env` is correct.

**`Image 'sandcastle:atopic_helper' not found`**
Run `just sandcastle-build` first.

**Planner returns no actionable issues**
Issues may reference closed blockers — planner checks `gh issue view <N>` to confirm. If still empty, verify open issues reference the PRD number in their body.

**Playwright `two different versions` error inside container**
macOS node_modules copied into Linux container. Fixed: `bunx playwright install chromium` runs in `onSandboxReady` hook automatically (downloads the version-pinned browser binary into the agent's cache).

**Playwright `su: Authentication failure` / password prompt during sandbox setup**
The container runs as non-root user `agent`, so `playwright install --with-deps` can't `apt-get` OS libs. Fixed: OS-level deps are baked into the image at build time as root (`playwright install-deps` in the Dockerfile); the runtime hook only downloads the browser binary as the agent user.

**Local main diverged after PR merge**
Squash merges cause divergence. Run `just sandcastle-sync` (does `git reset --hard origin/main`), never `git pull`.

**Stale `agent/*` branches after a run**
Run `just sandcastle-sync` — it re-syncs local `main` and prunes leftover `agent/*`
locals. In integrated mode the orchestrator already deletes its intermediate per-worker
branches; only a failed run leaves them behind.

**`CopyToWorktreeTimeoutError: Copying files to worktree timed out after 60000ms`**
Sandcastle was copying `node_modules` (~250 MB) into each worker's worktree. Fixed: `copyToWorktree` was removed from `main.ts` — the container's `onSandboxReady: bun install` hook rebuilds `node_modules` correctly for Linux (macOS-native binaries would fail in-container anyway).

**`bun install` hook fails with "Fail extracting tarball for X" (e.g. `lightningcss-linux-arm64-musl`)**
Transient tarball extraction race — often hits one of three parallel workers when they all fetch from `registry.npmjs.org` simultaneously. Fixed by baking the Bun install cache into the Docker image (see Dockerfile `warmup` step). Cache lives at `/home/agent/.bun/install/cache` — outside the worktree bind mount, so it survives runtime. If a new dep is added and this recurs, rebuild the image (see below).

**Rebuilding the image after `bun.lock` changes**
The Dockerfile bakes tarballs for every entry in the current `bun.lock` at build time. Any `bun add`/`bun remove` that mutates the lockfile leaves the image cache stale — the next worker run will hit the network for the missing dep. Rebuild the image so the cache tracks the new lockfile:
```bash
just sandcastle-build
```
Skip if you've only added/removed devDependencies you don't need in the container (rare).

**Hook timed out after 60000ms**
Sandcastle's default hook timeout is 60 s. `bun install` and `playwright install chromium` on a cold cache easily exceed this. Fixed: hooks in `main.ts` explicitly set `timeoutMs: 300_000` (5 min) for `bun install` and `600_000` (10 min) for Playwright.
