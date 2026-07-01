import { run, claudeCode } from "@ai-hero/sandcastle";
import { docker } from "@ai-hero/sandcastle/sandboxes/docker";

const PRD_ISSUE = process.argv[2];
if (!PRD_ISSUE) {
  console.error("Usage: npx tsx .sandcastle/main.ts <prd-issue-number>");
  process.exit(1);
}

const MAX_PARALLEL = 3;

// Phase 1: Planner agent reads PRD + linked issues, outputs dependency graph
console.log(`\n=== Planning from PRD #${PRD_ISSUE} ===\n`);

const plan = await run({
  name: "planner",
  sandbox: docker(),
  agent: claudeCode("claude-opus-4-7"),
  promptFile: ".sandcastle/plan-prompt.md",
  promptArgs: { PRD_ISSUE },
  branchStrategy: { type: "head" },
});

const planMatch = plan.stdout.match(/<plan>([\s\S]*?)<\/plan>/);
if (!planMatch) {
  throw new Error("Planner did not produce a <plan> tag.\n\n" + plan.stdout);
}

type Issue = { number: number; title: string; dependencies: number[] };
const { issues } = JSON.parse(planMatch[1]) as { issues: Issue[] };

if (issues.length === 0) {
  console.log("No actionable issues found.");
  process.exit(0);
}

console.log(`Plan: ${issues.length} issue(s)`);
for (const issue of issues) {
  const deps = issue.dependencies.length
    ? ` (depends on: ${issue.dependencies.join(", ")})`
    : "";
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
        remaining.has(i.number) &&
        i.dependencies.every((d) => done.has(d) || !remaining.has(d)),
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

// Phase 2: Execute batches sequentially, issues within each batch in parallel
for (const [batchIdx, batch] of batches.entries()) {
  console.log(
    `\n=== Batch ${batchIdx + 1}/${batches.length}: ${batch.map((i) => `#${i.number}`).join(", ")} ===\n`,
  );

  // Chunk into MAX_PARALLEL to avoid saturating the proxy
  for (let i = 0; i < batch.length; i += MAX_PARALLEL) {
    const chunk = batch.slice(i, i + MAX_PARALLEL);

    const results = await Promise.allSettled(
      chunk.map((issue) =>
        run({
          name: `worker-${issue.number}`,
          sandbox: docker(),
          agent: claudeCode("claude-opus-4-7"),
          promptFile: ".sandcastle/worker-prompt.md",
          promptArgs: {
            ISSUE_NUMBER: String(issue.number),
            ISSUE_TITLE: issue.title,
          },
          branchStrategy: {
            type: "branch",
            branch: `agent/ralph-issue-${issue.number}`,
          },
          hooks: {
            sandbox: {
              onSandboxReady: [
                { command: "bun install", timeoutMs: 300_000 },
                { command: "bunx playwright install chromium", timeoutMs: 600_000 },
              ],
            },
          },
        }),
      ),
    );

    for (const [j, result] of results.entries()) {
      const issue = chunk[j];
      if (result.status === "rejected") {
        console.error(`  ✗ #${issue.number} failed: ${result.reason}`);
      } else {
        console.log(
          `  ✓ #${issue.number}: ${result.value.commits.length} commit(s)`,
        );
      }
    }
  }
}

console.log("\nAll batches complete.");
