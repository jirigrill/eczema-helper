# Context

## PRD

!`gh issue view {{PRD_ISSUE}} --json number,title,body --jq '"#" + (.number|tostring) + ": " + .title + "\n\n" + .body'`

## Integrated issues (merged into this branch by THIS run, in dependency order)

{{INTEGRATED_ISSUES}}

## Previously integrated (merged by an EARLIER run — already on this branch)

{{PREVIOUSLY_INTEGRATED}}

## Completed with no commit (done, but nothing to merge — deliverables live outside the repo)

{{NO_COMMIT_ISSUES}}

## Dropped — NOT on this branch, NOT implemented

{{DROPPED_ISSUES}}

## Recent RALPH commits (last 15)

!`git log --oneline --grep="RALPH" -15`

# Task

You are the INTEGRATOR. The issues listed above as integrated have already been
implemented by worker agents and merged, in dependency order, into the current branch
`{{INTEGRATION_BRANCH}}`. Your job is to make the whole PRD a coherent, mergeable
result — then open **or update** exactly one PR.

You are on `{{INTEGRATION_BRANCH}}`. Do not switch branches. Do not touch `main`.

**This branch may be a resumed run.** It can already carry work from an earlier run
(see _Previously integrated_), and an open PR for it may already exist. Never assume
the branch starts from a clean `main`.

**Account for gaps honestly.** If a child issue of the PRD is absent from this branch,
it is listed above under _Dropped_ or _Completed with no commit_ — or it was never
scheduled. **Never invent a rationale for an absence.** Do not describe a missing issue
as deferred, out of scope, or planned for later unless the PRD itself says so. If you
cannot account for a gap from the lists above, say so plainly in the PR body.

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

4. **One PR — create it, or update the existing one.** Push `{{INTEGRATION_BRANCH}}`,
   then check whether a PR is already open for it:

   ```
   git push -u origin {{INTEGRATION_BRANCH}}
   gh pr list --head {{INTEGRATION_BRANCH}} --state open --json number,body
   ```

   The push must **not** be forced — this run only adds commits.
   - **No PR yet** → `gh pr create --base main` with the body below.
   - **PR exists** → `gh pr edit <number>` with the body below, rewritten to cover the
     branch's _whole_ contents, not just this run's slice. The body is cumulative: it must
     still carry every `Closes` line and every `## Integrated issues` entry from the
     earlier run, plus the new ones. Read the existing body first (the command above
     returns it) so you preserve what it already documents.

   Body requirements:
   - Open with one `Closes #N` line for **each of these issues, and no others**:
     `{{CLOSES_ISSUES}}`. This set already includes previously-integrated issues and any
     completed-with-no-commit issue, so GitHub closes them all when the PR merges.
   - `## Integrated issues` — each of the above mapped to a one-line summary. Mark ones
     from an earlier run so a reviewer can tell what is new in this push.
   - `## Not included` — every issue from the _Dropped_ list with its reason verbatim, and
     any PRD child that was never scheduled. Write "None." only if both are genuinely
     empty. **Do not soften a drop into a scope decision.**
   - `## Touched during integration` — regions you authored while fixing (step 1), or "None."
   - `## Code review` — final aggregated Standards + Spec report, per-finding fixed/left note.

   ```
   Closes #<issue>
   Closes #<issue>
   ...

   <what this PRD delivers, in one short paragraph>

   ## Integrated issues

   - #<n>: <one-line summary>
   - #<n>: <one-line summary> (integrated in an earlier run)
   ...

   ## Not included

   - #<n>: <verbatim reason from the Dropped list>

   ## Touched during integration

   <regions you authored while fixing review findings, or "None.">

   ## Code review

   <final aggregated Standards + Spec report, per-finding fixed/left note>
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
