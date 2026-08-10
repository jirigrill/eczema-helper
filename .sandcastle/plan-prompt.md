# Task

You are a planning agent. Analyze PRD #{{PRD_ISSUE}} and its child issues, then produce a structured execution plan.

## PRD

!`gh issue view {{PRD_ISSUE}} --json number,title,body --jq '"#" + (.number|tostring) + ": " + .title + "\n\n" + .body'`

## Open child issues of this PRD

Two discovery paths, unioned — a child either references the PRD, or is listed in the PRD body:

- issues whose body references `#{{PRD_ISSUE}}`, **and**
- issues whose number is referenced by the PRD #{{PRD_ISSUE}} body.

!`CHILDREN=$(gh issue view {{PRD_ISSUE}} --json body --jq '.body' | grep -oE '#[0-9]+' | tr -d '#' | sort -u | paste -sd, -); gh issue list --state open --limit 100 --json number,title,body,labels | jq --arg prd "{{PRD_ISSUE}}" --arg kids "$CHILDREN" '($kids | split(",") | map(select(length>0) | tonumber)) as $k | [.[] | select((.body | strings | test("#" + $prd)) or (.body | strings | test("issues/" + $prd)) or (.number as $n | $k | index($n)))] | map({number, title, body, labels: [.labels[].name]})'`

## Closed issue numbers (resolved — blockers in this list are satisfied)

!`gh issue list --state closed --limit 200 --json number --jq '[.[].number]'`

## Already integrated by a previous run (resolved — treat exactly like closed)

{{ALREADY_INTEGRATED}}

These issues are **still open on GitHub** but their work is already merged onto this
PRD's integration branch — issues only close when the integrated PR merges, which
has not happened yet. Their code is in the base that every worker branches from.

## Instructions

1. Read the PRD to understand the full scope.
2. From the open child list above, identify open issues that are child tasks of this PRD.
3. For each open issue, parse referenced blockers ("blocked by #N", "depends on #N", or logical ordering).
3a. **A PRD-stated step order is authoritative.** If the PRD body lays out an ordered
    execution plan — numbered/lettered steps (Step 0, 1, 2, 2b, 3, …), or prose stating
    the steps run in sequence — then for every step, add a dependency on its immediately
    preceding step, even when that step's own issue body omits it or names a different
    blocker. Do this in addition to, not instead of, the issue's declared `## Blocked by`.
    Steps the PRD does not place in this order (or does not mention at all) are unordered
    relative to each other and may still batch in parallel.
4. **Closed blocker = resolved.** If a blocker number appears in the closed list above, the dependency is satisfied: do NOT list it under `dependencies` and do NOT exclude the issue.
5. **Already-integrated blocker = resolved.** Apply rule 4 identically to the already-integrated list: do NOT list it under `dependencies` and do NOT exclude the issue that depends on it.
6. **Never output an already-integrated issue.** Omit it from `issues` entirely — re-running it would duplicate merged work and conflict.
7. Only list dependencies that are themselves OPEN and present in the open list above.
8. Exclude an open issue ONLY if a blocker is OPEN and not a child of this PRD (unresolved external work).

## Output

Output ONLY a `<plan>` tag with JSON in this exact format — no other text:

<plan>
{
  "issues": [
    { "number": 123, "title": "issue title", "dependencies": [] },
    { "number": 124, "title": "issue title", "dependencies": [123] }
  ]
}
</plan>

Order from fewest to most dependencies. `dependencies` lists issue numbers that must complete before this issue starts. Use `[]` for no dependencies.
