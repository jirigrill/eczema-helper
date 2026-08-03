import { claudeCode, run } from '@ai-hero/sandcastle';
import { docker } from '@ai-hero/sandcastle/sandboxes/docker';
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const modeArg = args.find((a) => a.startsWith('--mode='));
const MODE = (modeArg?.split('=')[1] ?? 'legacy') as 'legacy' | 'integrated';
const PRD_ISSUE = args.find((a) => !a.startsWith('--'));

if (!PRD_ISSUE) {
  console.error('Usage: npx tsx .sandcastle/main.ts <prd-issue-number> [--mode=legacy|integrated]');
  process.exit(1);
}
if (MODE !== 'legacy' && MODE !== 'integrated') {
  console.error(`Unknown --mode=${MODE} (expected: legacy | integrated)`);
  process.exit(1);
}

const MAX_PARALLEL = 3;
const AGENT = 'claude-opus-4-7';
const PRD = PRD_ISSUE as string; // guarded above
const INTEGRATION_BRANCH = `agent/prd-${PRD}`;

// Host-side git helper — branches materialize in the host repo, so integration
// (merging worker branches, basing the next batch on the result) happens here.
function git(...gitArgs: string[]): string {
  return execFileSync('git', gitArgs, { encoding: 'utf8' }).trim();
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

// Phase 1: Planner agent reads PRD + linked issues, outputs dependency graph
console.log(`\n=== Planning from PRD #${PRD} (mode: ${MODE}) ===\n`);

const plan = await run({
  name: 'planner',
  sandbox: docker(),
  agent: claudeCode(AGENT),
  promptFile: '.sandcastle/plan-prompt.md',
  promptArgs: { PRD_ISSUE: PRD },
  branchStrategy: { type: 'head' },
});

const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
if (!planMatch) {
  throw new Error('Planner did not produce a <plan> tag.\n\n' + plan.stdout);
}

const { issues } = JSON.parse(planMatch[1]) as { issues: Issue[] };

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
  console.log(`\nIntegrated (${s.integrated.length}):`);
  for (const i of s.integrated) console.log(`  #${i.number}: ${i.title}`);
  if (s.dropped.size) {
    console.log(`\nDropped (${s.dropped.size}):`);
    for (const [n, reason] of s.dropped) console.log(`  #${n}: ${reason}`);
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
  // Fresh integration branch off origin/main. Detach the host HEAD first: if it
  // is parked on INTEGRATION_BRANCH (e.g. a leftover checkout from a prior run),
  // `git branch -f` below would fail, and the integrator's worktree can't share
  // a branch that's checked out here.
  git('fetch', 'origin');
  git('checkout', '--detach', '--quiet', 'HEAD');
  git('branch', '-f', INTEGRATION_BRANCH, 'origin/main');
  git('checkout', INTEGRATION_BRANCH);
  console.log(`\nIntegration branch ${INTEGRATION_BRANCH} created off origin/main`);

  const integrated: Issue[] = []; // succeeded + merged, in dependency order
  const dropped = new Map<number, string>(); // issue → reason
  const workerBranches: string[] = []; // intermediate branches to clean up

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
        const branch = result.value.branch;
        try {
          git('merge', '--no-ff', '-m', `RALPH: integrate #${issue.number}`, branch);
          workerBranches.push(branch);
          integrated.push(issue);
          console.log(`  ✓ #${issue.number} merged (${result.value.commits.length} commit(s))`);
        } catch {
          // Conflict merging an independent same-batch issue — drop it (and its subtree).
          git('merge', '--abort');
          dropped.set(issue.number, 'merge conflict into integration branch');
          console.error(`  ✗ #${issue.number} dropped: merge conflict`);
        }
      }
    }
  }

  if (integrated.length === 0) {
    printSummary({ integrated, dropped, failure: 'no issues integrated' });
    return;
  }

  // Integrator: whole-diff review + full suite + one PR (branch checked out).
  // Detach the host HEAD off INTEGRATION_BRANCH — the integrator materializes it
  // in its own worktree, and git forbids the same branch in two worktrees. The
  // branch ref already points at the fully-merged result from the batches above.
  git('checkout', '--detach', '--quiet', INTEGRATION_BRANCH);
  const integratedList = integrated.map((i) => `- #${i.number}: ${i.title}`).join('\n');

  console.log(`\n=== Integrator (${integrated.length} issue(s)) ===\n`);
  const integ = await run({
    name: 'integrator',
    sandbox: docker(),
    agent: claudeCode(AGENT),
    promptFile: '.sandcastle/integrator-prompt.md',
    promptArgs: {
      PRD_ISSUE: PRD,
      INTEGRATION_BRANCH,
      INTEGRATED_ISSUES: integratedList,
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
