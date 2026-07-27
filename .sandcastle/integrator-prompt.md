# Context

## PRD

!`gh issue view {{PRD_ISSUE}} --json number,title,body --jq '"#" + (.number|tostring) + ": " + .title + "\n\n" + .body'`

## Integrated issues (all merged into this branch, in dependency order)

{{INTEGRATED_ISSUES}}

## Recent RALPH commits (last 15)

!`git log --oneline --grep="RALPH" -15`

# Task

You are the INTEGRATOR. All the issues listed above have already been implemented by
worker agents and merged, in dependency order, into the current branch
`{{INTEGRATION_BRANCH}}` (branched from `main`). Your job is to make the whole PRD a
single, coherent, mergeable result — then open exactly one PR.

You are on `{{INTEGRATION_BRANCH}}`. Do not switch branches. Do not touch `main`.

## Workflow

1. **Whole-diff review** — review the entire integrated change against `main`, following
   the vendored `code-review` skill (`~/.claude/skills/code-review/SKILL.md`). Diff is
   `git diff main...HEAD`.
   - Focus on what no single worker could see: **integration seams** where one issue's
     code meets another's, **duplication introduced across issues** (two workers solving
     the same sub-problem differently), and **inconsistent patterns** between slices.
   - Standards source: `docs/architecture/code-standards.md` plus the skill's smell
     baseline. Spec source: the PRD above and each issue, fetched via
     `docs/agents/issue-tracker.md` (present in this repo). Do NOT run
     `/setup-matt-pocock-skills` — it is not available in this sandbox; if the tracker
     doc is absent, have the Spec sub-agent report "no spec available".
   - **Loop to convergence**: fix findings — including ones localized inside a single
     issue's code that its worker's own review missed — then re-run `just ci`
     and re-review. Stop only when a pass surfaces no new actionable
     findings.
   - **Log every region you touch** while fixing. You will list these in the PR body so
     the human reviewer knows which code was authored during integration rather than by
     the original worker.

2. **Full CI gate** — run `just ci`. This mirrors GitHub CI exactly: prettier `--check`,
   eslint, type check, build, unit tests, **and** Playwright E2E. Everything MUST be green.
   If any prettier issue is reported, run `just fmt` to fix it, commit, then re-run `just ci`.
   - If you **cannot** get `just ci` green after a reasonable effort, **do NOT open a
     PR**. Instead, output a `<report>` block (format below) describing what failed, and
     stop. Leave the branch as-is for human inspection.

3. **Commit** — commit any integration fixes you made. The message MUST start with
   `RALPH:`, summarize the integration work, and list the regions you touched.

4. **One PR** — push `{{INTEGRATION_BRANCH}}` and open a single PR targeting `main`.
   - The body MUST open with one `Closes #N` line **per integrated issue listed above**
     (so GitHub auto-closes them all on merge). Do not add `Closes` for issues not in the
     list.
   - Include a `## Integrated issues` section mapping each issue to a one-line summary.
   - Include a `## Touched during integration` section listing the regions you authored
     while fixing (step 1) — or "None." if you changed nothing.
   - Include a `## Code review` section with the final aggregated Standards + Spec report,
     a note per finding on whether it was fixed or deliberately left (and why). Write
     "No findings." under a clean axis.

   ```
   git push -u origin {{INTEGRATION_BRANCH}}
   gh pr create --base main --title "RALPH: <PRD summary>" --body "$(cat <<'BODY'
   Closes #<issue>
   Closes #<issue>
   ...

   <what this PRD delivers, in one short paragraph>

   ## Integrated issues

   - #<n>: <one-line summary>
   ...

   ## Touched during integration

   <regions you authored while fixing review findings, or "None.">

   ## Code review

   <final aggregated Standards + Spec report, per-finding fixed/left note>
   BODY
   )"
   ```

## Done

On success (PR open):

<promise>COMPLETE</promise>

On failure (could not reach green — no PR opened):

<report>
FAILED: <which stage — whole-diff review / just ci (format / lint / type / build / unit / E2E)>
<the failing output, trimmed to the relevant part>
</report>
<promise>COMPLETE</promise>
