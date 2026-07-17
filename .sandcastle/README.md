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
bunx tsx .sandcastle/main.ts <prd-issue-number>

# Example
bunx tsx .sandcastle/main.ts 284

# Watch a worker's live output
tail -f .sandcastle/logs/<logfile>.log

# List recent logs
ls -t .sandcastle/logs/
```

## How It Works

1. **Planner** — reads PRD issue + all linked open issues, builds a dependency graph
2. **Batches** — topological sort produces parallelizable batches (independent issues run simultaneously, max 3)
3. **Workers** — each worker gets one issue, creates `agent/ralph-issue-<N>` branch, implements via TDD, opens a PR (`Closes #N`)
4. **You** — review PRs, merge when satisfied
5. **Repeat** — re-run same command; planner picks up newly unblocked issues

## After PRs Merge

```bash
git reset --hard origin/main   # sync local main (squash merges diverge — never use git pull)
git branch | grep agent/ralph  # check for stale local branches
git branch -D agent/ralph-issue-<N>  # delete stale branches
```

## .env Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_BASE_URL` | Proxy URL — `http://host.docker.internal:8082` |
| `ANTHROPIC_API_KEY` | Any non-empty string — proxy ignores it |
| `GH_TOKEN` | GitHub token with repo + issues scope |

## Files

| File | Purpose |
|---|---|
| `main.ts` | Orchestrator — planner + batch execution |
| `plan-prompt.md` | Planner agent prompt — reads PRD, outputs dependency JSON |
| `worker-prompt.md` | Worker agent prompt — TDD workflow, PR creation |
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
Squash merges cause divergence. Always use `git reset --hard origin/main` after merging, never `git pull`.

**Stale `agent/ralph-issue-*` branches after failures**
Safe to delete — only failed runs leave branches behind:
```bash
git branch | grep agent/ralph | xargs git branch -D
```

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
