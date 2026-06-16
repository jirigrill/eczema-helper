# Sandcastle — RALPH Agent Orchestration

Autonomous coding agents that work through GitHub issues, open PRs, and verify with `just check` + `just test`.

## Prerequisites

- Docker Desktop running
- `.sandcastle/.env` configured (copy from `.env.example`)
- `sandcastle:eczema-helper` Docker image built

## Setup

```bash
cp .sandcastle/.env.example .sandcastle/.env
# fill in ANTHROPIC_BASE_URL, ANTHROPIC_API_KEY, GH_TOKEN

npx sandcastle docker build-image
```

## Commands

```bash
# Run agents for a PRD (planner + parallel workers)
npx tsx .sandcastle/main.ts <prd-issue-number>

# Example
npx tsx .sandcastle/main.ts 284

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
| `Dockerfile` | Sandbox image — Node 22 + Bun + just + gh CLI + Playwright + Claude Code |
| `.env.example` | Template for secrets |

## Troubleshooting

**`bun: not found` inside container**
Dockerfile missing Bun install. Rebuild: `npx sandcastle docker build-image`

**`gh auth login` error / GH_TOKEN missing**
Add `GH_TOKEN=<token>` to `.sandcastle/.env`. Get token: `ghp auth token`

**`Image 'sandcastle:eczema-helper' not found`**
Run `npx sandcastle docker build-image` first.

**Planner returns no actionable issues**
Issues may reference closed blockers — planner checks `gh issue view <N>` to confirm. If still empty, verify open issues reference the PRD number in their body.

**Playwright `two different versions` error inside container**
macOS node_modules copied into Linux container. Fixed: `bunx playwright install --with-deps chromium` runs in `onSandboxReady` hook automatically.

**Local main diverged after PR merge**
Squash merges cause divergence. Always use `git reset --hard origin/main` after merging, never `git pull`.

**Stale `agent/ralph-issue-*` branches after failures**
Safe to delete — only failed runs leave branches behind:
```bash
git branch | grep agent/ralph | xargs git branch -D
```
