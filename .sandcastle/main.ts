import { claudeCode, run } from '@ai-hero/sandcastle';
import { docker } from '@ai-hero/sandcastle/sandboxes/docker';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith('--mode='));
const MODE = (modeArg?.split('=')[1] ?? 'legacy') as 'legacy' | 'integrated';
const PRD_ISSUE = args.find((a) => !a.startsWith('--'));

if (!PRD_ISSUE) {
  console.error(
    'Usage: npx tsx .sandcastle/main.ts <prd-issue-number> [--mode=legacy|integrated] [--max-parallel=N]',
  );
  process.exit(1);
}
if (MODE !== 'legacy' && MODE !== 'integrated') {
  console.error(`Unknown --mode=${MODE} (expected: legacy | integrated)`);
  process.exit(1);
}

// Concurrency within a batch. Lower it when a batch holds issues whose file
// footprints overlap: same-batch workers all branch off the same integration
// commit, so two issues editing one file will collide when the second merges.
// `--max-parallel=1` serialises a batch entirely, which trades wall-clock for
// zero merge conflicts.
const parallelArg = args.find((a) => a.startsWith('--max-parallel='));
const MAX_PARALLEL = Number(parallelArg?.split('=')[1] ?? 5);
if (!Number.isInteger(MAX_PARALLEL) || MAX_PARALLEL < 1) {
  console.error(
    `Invalid --max-parallel=${parallelArg?.split('=')[1]} (expected a positive integer)`,
  );
  process.exit(1);
}
const AGENT = 'claude-opus-4-8';
const PRD = PRD_ISSUE as string; // guarded above
const INTEGRATION_BRANCH = `agent/prd-${PRD}`;

// Host-side git helper — branches materialize in the host repo, so integration
// (merging worker branches, basing the next batch on the result) happens here.
function git(...gitArgs: string[]): string {
  return execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
}

function refExists(ref: string): boolean {
  try {
    git('rev-parse', '--verify', '--quiet', ref);
    return true;
  } catch {
    return false;
  }
}

/** True when `maybeAncestor` is reachable from `descendant` (i.e. contained in it). */
function isAncestor(maybeAncestor: string, descendant: string): boolean {
  try {
    git('merge-base', '--is-ancestor', maybeAncestor, descendant);
    return true;
  } catch {
    return false;
  }
}

/**
 * Issues already merged into an integration branch by a previous run.
 *
 * Each integration merge is committed as `RALPH: integrate #<n>`, so the branch
 * itself records what is done — no state file to drift out of sync. This is what
 * makes a run resumable: a partially-executed PRD leaves its progress in git,
 * and GitHub issue closure (which only happens on PR merge) is not required.
 */
function integratedIssues(ref: string): number[] {
  if (!refExists(ref)) return [];
  const log = git('log', ref, '--grep', '^RALPH: integrate #', '--format=%s');
  return [...log.matchAll(/^RALPH: integrate #(\d+)/gm)].map((m) => Number(m[1]));
}

type Issue = { number: number; title: string; dependencies: number[] };

// Mode-specific finish instructions injected into the worker prompt as
// {{FINISH_INSTRUCTIONS}}. Everything before this (explore → TDD → review) is
// shared; only how the worker's result leaves the sandbox differs.
const LEGACY_FINISH = (
  issue: number,
) => `6. **Commit** — make a single git commit. The message MUST:
   - Start with \`RALPH:\` prefix
   - Include the task completed and any PRD reference
   - List key decisions made
   - List files changed
   - Note any blockers for the next iteration
7. **PR** — push the branch and open a PR. The body MUST have a \`## Code review\` section holding the retained report from step 5:
   \`\`\`
   git push -u origin agent/ralph-issue-${issue}
   gh pr create --title "RALPH: <summary>" --body "$(cat <<'BODY'
   Closes #${issue}

   <what changed and why>

   ## Code review

   <the aggregated Standards + Spec report from step 5, verbatim, with a note per finding on whether it was fixed or deliberately left and why. Write "No findings." under an axis that was clean.>
   BODY
   )"
   \`\`\`
   Do NOT close the issue manually — GitHub closes it automatically when the PR merges.`;

const INTEGRATED_FINISH = `6. **Commit** — make a single git commit on your current branch. Do NOT push and do NOT open a PR — an integrator agent collects your branch and opens one PR for the whole PRD. The message MUST:
   - Start with \`RALPH:\` prefix
   - Include the task completed and its PRD reference
   - List key decisions made
   - List files changed
   - Note any blockers for the next iteration
   Keep the retained review report (step 5) in the commit body under a \`## Code review\` heading, so the integrator can fold it into the PR.
   Do NOT close the issue manually — GitHub closes it when the integrated PR merges.`;

// Resume state (integrated mode only): what a previous run already merged into
// the integration branch. Computed before planning so the planner can treat
// those issues as satisfied blockers rather than outstanding work. Fetch first
// so an integration branch that exists only on the remote is visible.
if (MODE === 'integrated') git('fetch', 'origin');

const RESUME_REF = refExists(INTEGRATION_BRANCH)
  ? INTEGRATION_BRANCH
  : `origin/${INTEGRATION_BRANCH}`;
const ALREADY_INTEGRATED = MODE === 'integrated' ? integratedIssues(RESUME_REF) : [];

if (ALREADY_INTEGRATED.length) {
  console.log(
    `\nResuming ${INTEGRATION_BRANCH} — already integrated: ${ALREADY_INTEGRATED.map((n) => `#${n}`).join(', ')}`,
  );
}

// Phase 1: Planner agent reads PRD + linked issues, outputs dependency graph
console.log(`\n=== Planning from PRD #${PRD} (mode: ${MODE}) ===\n`);

const plan = await run({
  name: 'planner',
  sandbox: docker(),
  agent: claudeCode(AGENT),
  promptFile: '.sandcastle/plan-prompt.md',
  promptArgs: {
    PRD_ISSUE: PRD,
    ALREADY_INTEGRATED: ALREADY_INTEGRATED.length ? ALREADY_INTEGRATED.join(', ') : 'none',
  },
  branchStrategy: { type: 'head' },
});

const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
if (!planMatch) {
  throw new Error('Planner did not produce a <plan> tag.\n\n' + plan.stdout);
}

const { issues: plannedIssues } = JSON.parse(planMatch[1]) as { issues: Issue[] };

// Belt-and-braces against R1: the planner is told to omit already-integrated
// issues, but re-running one would duplicate work and near-certainly conflict,
// so drop them here too. Dependencies on them are already satisfied by
// construction — they are merged into the base every worker branches from.
const integratedSet = new Set(ALREADY_INTEGRATED);
const issues = plannedIssues
  .filter((i) => {
    if (!integratedSet.has(i.number)) return true;
    console.log(`  ⤳ #${i.number} skipped (already integrated on ${INTEGRATION_BRANCH})`);
    return false;
  })
  .map((i) => ({ ...i, dependencies: i.dependencies.filter((d) => !integratedSet.has(d)) }));

if (issues.length === 0) {
  console.log('No actionable issues found.');
  process.exit(0);
}

console.log(`Plan: ${issues.length} issue(s)`);
for (const issue of issues) {
  const deps = issue.dependencies.length ? ` (depends on: ${issue.dependencies.join(', ')})` : '';
  console.log(`  #${issue.number}: ${issue.title}${deps}`);
}

// Topological sort → parallelizable batches
function buildBatches(issues: Issue[]): Issue[][] {
  const remaining = new Set(issues.map((i) => i.number));
  const done = new Set<number>();
  const batches: Issue[][] = [];

  while (remaining.size > 0) {
    const batch = issues.filter(
      (i) =>
        remaining.has(i.number) && i.dependencies.every((d) => done.has(d) || !remaining.has(d)),
    );
    if (batch.length === 0) break; // circular dep guard
    for (const i of batch) remaining.delete(i.number);
    for (const i of batch) done.add(i.number);
    batches.push(batch);
  }

  return batches;
}

const batches = buildBatches(issues);
console.log(`\n${batches.length} batch(es) planned`);

const WORKER_HOOKS = {
  sandbox: {
    onSandboxReady: [
      { command: 'bun install', timeoutMs: 300_000 },
      { command: 'bunx playwright install chromium', timeoutMs: 600_000 },
    ],
  },
} as const;

// Run one worker. `baseRef` bases its branch on the integration branch in
// integrated mode; omitted in legacy mode so it branches from HEAD (main).
function runWorker(issue: Issue, baseRef?: string) {
  return run({
    name: `worker-${issue.number}`,
    sandbox: docker(),
    agent: claudeCode(AGENT),
    promptFile: '.sandcastle/worker-prompt.md',
    promptArgs: {
      ISSUE_NUMBER: String(issue.number),
      ISSUE_TITLE: issue.title,
      FINISH_INSTRUCTIONS: MODE === 'integrated' ? INTEGRATED_FINISH : LEGACY_FINISH(issue.number),
    },
    branchStrategy: {
      type: 'branch',
      branch:
        MODE === 'integrated'
          ? `agent/prd-${PRD}-issue-${issue.number}`
          : `agent/ralph-issue-${issue.number}`,
      ...(baseRef ? { baseRef } : {}),
    },
    hooks: WORKER_HOOKS,
  });
}

// Retry a failed worker once in a fresh sandbox before giving up on it.
async function runWorkerWithRetry(issue: Issue) {
  try {
    return await runWorker(issue, INTEGRATION_BRANCH);
  } catch {
    console.log(`  ↻ #${issue.number} retrying after failure`);
    return runWorker(issue, INTEGRATION_BRANCH);
  }
}

function printSummary(s: {
  integrated: Issue[];
  noCommit?: Issue[];
  dropped: Map<number, string>;
  prUrl?: string;
  failure?: string;
}) {
  console.log(`\n${'='.repeat(60)}\n RUN SUMMARY — PRD #${PRD}\n${'='.repeat(60)}`);
  if (s.prUrl) {
    console.log(`\n✅ PR ready: ${s.prUrl}`);
  } else if (s.failure) {
    console.log(`\n❌ No PR opened. Integration branch left intact: ${INTEGRATION_BRANCH}`);
    console.log(`\nFailure:\n${s.failure}`);
  }
  if (ALREADY_INTEGRATED.length) {
    console.log(
      `\nPreviously integrated (${ALREADY_INTEGRATED.length}): ${ALREADY_INTEGRATED.map((n) => `#${n}`).join(', ')}`,
    );
  }
  console.log(`\nIntegrated (${s.integrated.length}):`);
  for (const i of s.integrated) console.log(`  #${i.number}: ${i.title}`);
  if (s.noCommit?.length) {
    console.log(`\nCompleted with no commit (${s.noCommit.length}):`);
    for (const i of s.noCommit) console.log(`  #${i.number}: ${i.title}`);
  }
  if (s.dropped.size) {
    console.log(`\nDropped (${s.dropped.size}):`);
    for (const [n, reason] of s.dropped) console.log(`  #${n}: ${reason}`);
    console.log(`\n  ⚠ Dropped issues stay open and are re-planned on the next run.`);
  }
  console.log(`\nAfter merge, run: just sandcastle-sync`);
}

// ── Legacy: each worker branches from main and opens its own PR. Byte-for-byte
// the original behaviour — a failed worker is logged and the run continues.
async function runLegacy() {
  for (const [batchIdx, batch] of batches.entries()) {
    console.log(
      `\n=== Batch ${batchIdx + 1}/${batches.length}: ${batch.map((i) => `#${i.number}`).join(', ')} ===\n`,
    );

    // Chunk into MAX_PARALLEL to avoid saturating the proxy
    for (let i = 0; i < batch.length; i += MAX_PARALLEL) {
      const chunk = batch.slice(i, i + MAX_PARALLEL);

      const results = await Promise.allSettled(chunk.map((issue) => runWorker(issue)));

      for (const [j, result] of results.entries()) {
        const issue = chunk[j];
        if (result.status === 'rejected') {
          console.error(`  ✗ #${issue.number} failed: ${result.reason}`);
        } else {
          console.log(`  ✓ #${issue.number}: ${result.value.commits.length} commit(s)`);
        }
      }
    }
  }
  console.log('\nAll batches complete.');
}

// ── Integrated: workers branch off the integration branch (per batch), their
// branches merge into it in order, and one integrator opens a single PRD PR.
async function runIntegrated() {
  // Detach the host HEAD first: if it is parked on INTEGRATION_BRANCH (e.g. a
  // leftover checkout from a prior run), the branch writes below would fail, and
  // the integrator's worktree can't share a branch that's checked out here.
  // `git fetch origin` already ran during resume detection.
  git('checkout', '--detach', '--quiet', 'HEAD');

  // Adopt an existing integration branch rather than resetting it — that is what
  // lets a partially-executed PRD continue without discarding merged work or
  // waiting for its PR to land. Only a genuinely absent branch is created fresh.
  const local = INTEGRATION_BRANCH;
  const remote = `origin/${INTEGRATION_BRANCH}`;
  const hasLocal = refExists(local);
  const hasRemote = refExists(remote);

  if (!hasLocal && !hasRemote) {
    git('branch', local, 'origin/main');
    console.log(`\nIntegration branch ${local} created off origin/main`);
  } else if (!hasLocal) {
    git('branch', '--track', local, remote);
    console.log(`\nIntegration branch ${local} adopted from ${remote}`);
  } else if (!hasRemote) {
    console.log(`\nIntegration branch ${local} adopted (local only, not yet pushed)`);
  } else {
    const localSha = git('rev-parse', local);
    const remoteSha = git('rev-parse', remote);
    const localInRemote = isAncestor(local, remote);
    const remoteInLocal = isAncestor(remote, local);

    if (localSha === remoteSha) {
      console.log(`\nIntegration branch ${local} adopted (in sync with ${remote})`);
    } else if (localInRemote) {
      git('branch', '-f', local, remote); // strictly behind → fast-forward
      console.log(`\nIntegration branch ${local} fast-forwarded to ${remote}`);
    } else if (remoteInLocal) {
      console.log(`\nIntegration branch ${local} adopted (ahead of ${remote} by unpushed commits)`);
    } else {
      // Diverged: either side may hold work the other lacks. Forcing either
      // direction silently destroys commits, so refuse and let a human decide.
      throw new Error(
        `${local} and ${remote} have diverged (${localSha.slice(0, 7)} vs ${remoteSha.slice(0, 7)}).\n` +
          `Reconcile them manually before resuming — refusing to force either way.`,
      );
    }
  }

  git('checkout', local);

  const integrated: Issue[] = []; // succeeded + merged, in dependency order
  const noCommit: Issue[] = []; // succeeded with no commit (nothing to merge)
  const dropped = new Map<number, string>(); // issue → reason
  const workerBranches: string[] = []; // intermediate branches to clean up
  let lastConflictFiles: string[] = []; // unmerged paths from the most recent failed merge

  // Merge one worker branch into the integration branch. Returns false on
  // conflict, having aborted the merge and recorded the unmerged paths so a
  // drop can name them instead of saying only "merge conflict".
  function mergeIssue(issue: Issue, branch: string): boolean {
    try {
      git('merge', '--no-ff', '-m', `RALPH: integrate #${issue.number}`, branch);
      workerBranches.push(branch);
      integrated.push(issue);
      console.log(`  ✓ #${issue.number} merged`);
      return true;
    } catch {
      lastConflictFiles = git('diff', '--name-only', '--diff-filter=U').split('\n').filter(Boolean);
      git('merge', '--abort');
      return false;
    }
  }

  // An issue is skippable if any dependency was dropped. This is transitive:
  // a dropped dependent is itself in `dropped`, so its dependents cascade.
  const droppedDep = (issue: Issue) => issue.dependencies.find((d) => dropped.has(d));

  for (const [batchIdx, batch] of batches.entries()) {
    console.log(
      `\n=== Batch ${batchIdx + 1}/${batches.length}: ${batch.map((i) => `#${i.number}`).join(', ')} ===\n`,
    );

    for (let i = 0; i < batch.length; i += MAX_PARALLEL) {
      const chunk = batch.slice(i, i + MAX_PARALLEL);

      // Skip issues whose dependency was dropped upstream.
      const runnable = chunk.filter((issue) => {
        const dep = droppedDep(issue);
        if (dep !== undefined) {
          dropped.set(issue.number, `depends on dropped #${dep}`);
          console.log(`  ⤳ #${issue.number} skipped (depends on dropped #${dep})`);
          return false;
        }
        return true;
      });

      // Each worker branches off the CURRENT integration branch, so it builds
      // on every issue merged so far (its dependencies included).
      const results = await Promise.allSettled(runnable.map((issue) => runWorkerWithRetry(issue)));

      for (const [j, result] of results.entries()) {
        const issue = runnable[j];
        if (result.status === 'rejected') {
          dropped.set(issue.number, 'worker failed after retry');
          console.error(`  ✗ #${issue.number} dropped: ${result.reason}`);
          continue;
        }

        // A worker can legitimately succeed without committing — a docs/infra
        // task whose deliverables live outside the repo (e.g. pushing a tag).
        // There is nothing to merge, but it is done: record it so the integrator
        // can close it, rather than leaving it to be re-attempted every run.
        if (result.value.commits.length === 0) {
          noCommit.push(issue);
          console.log(`  ✓ #${issue.number} completed with no commit (nothing to merge)`);
          continue;
        }

        if (mergeIssue(issue, result.value.branch)) continue;

        // Conflict. A same-batch sibling merged first and touched the same files,
        // so this worker's base is stale. Re-run it on the updated integration
        // branch: the agent resolves semantically in its own sandbox, which a
        // host-side textual rebase cannot. Only drop if that also fails.
        console.log(`  ↻ #${issue.number} conflicted — re-running on the updated base`);
        let rerun;
        try {
          rerun = await runWorker(issue, INTEGRATION_BRANCH);
        } catch (e) {
          dropped.set(issue.number, `merge conflict; re-run failed: ${e}`);
          console.error(`  ✗ #${issue.number} dropped: conflict, and the re-run failed`);
          continue;
        }
        if (rerun.commits.length === 0) {
          noCommit.push(issue);
          console.log(`  ✓ #${issue.number} completed with no commit on re-run`);
          continue;
        }
        if (!mergeIssue(issue, rerun.branch)) {
          dropped.set(issue.number, `merge conflict in: ${lastConflictFiles.join(', ')}`);
          console.error(`  ✗ #${issue.number} dropped: still conflicting after re-run`);
        }
      }
    }
  }

  if (integrated.length === 0 && noCommit.length === 0) {
    printSummary({ integrated, noCommit, dropped, failure: 'no issues integrated' });
    return;
  }

  // Integrator: whole-diff review + full suite + one PR (branch checked out).
  // Detach the host HEAD off INTEGRATION_BRANCH — the integrator materializes it
  // in its own worktree, and git forbids the same branch in two worktrees. The
  // branch ref already points at the fully-merged result from the batches above.
  git('checkout', '--detach', '--quiet', INTEGRATION_BRANCH);

  const fmt = (list: Issue[]) => list.map((i) => `- #${i.number}: ${i.title}`).join('\n');

  // Every issue the PR should close: merged now, completed-without-commit now,
  // and anything a previous run already merged onto this branch (whose `Closes`
  // lines must survive a PR body rewrite).
  const closesList = [
    ...integrated.map((i) => i.number),
    ...noCommit.map((i) => i.number),
    ...ALREADY_INTEGRATED,
  ]
    .sort((a, b) => a - b)
    .map((n) => `#${n}`)
    .join(', ');

  // Dropped issues are passed in so the integrator states them plainly instead
  // of inferring a rationale for work it cannot find on the branch.
  const droppedList = dropped.size
    ? [...dropped].map(([n, reason]) => `- #${n}: ${reason}`).join('\n')
    : 'none';

  console.log(`\n=== Integrator (${integrated.length} merged, ${noCommit.length} no-commit) ===\n`);
  const integ = await run({
    name: 'integrator',
    sandbox: docker(),
    agent: claudeCode(AGENT),
    promptFile: '.sandcastle/integrator-prompt.md',
    promptArgs: {
      PRD_ISSUE: PRD,
      INTEGRATION_BRANCH,
      INTEGRATED_ISSUES: fmt(integrated),
      NO_COMMIT_ISSUES: noCommit.length ? fmt(noCommit) : 'none',
      DROPPED_ISSUES: droppedList,
      PREVIOUSLY_INTEGRATED: ALREADY_INTEGRATED.length
        ? ALREADY_INTEGRATED.map((n) => `#${n}`).join(', ')
        : 'none',
      CLOSES_ISSUES: closesList,
    },
    branchStrategy: { type: 'branch', branch: INTEGRATION_BRANCH },
    hooks: WORKER_HOOKS,
  });

  const reportMatch = integ.stdout.match(/<report>([\s\S]*?)<\/report>/);
  const prMatch = integ.stdout.match(/https:\/\/github\.com\/\S+\/pull\/\d+/);

  // Clean up intermediate worker branches (content preserved in the PR).
  for (const b of workerBranches) {
    try {
      git('branch', '-D', b);
    } catch {
      /* best effort */
    }
  }

  // Restore main worktree to the integration branch.
  try {
    git('checkout', INTEGRATION_BRANCH);
  } catch {
    console.warn(`⚠ Could not restore to ${INTEGRATION_BRANCH}; you're at a detached commit.`);
  }

  printSummary({
    integrated,
    noCommit,
    dropped,
    prUrl: prMatch?.[0],
    failure: reportMatch ? reportMatch[1].trim() : undefined,
  });
}

if (MODE === 'legacy') {
  await runLegacy();
} else {
  await runIntegrated();
}
