# Task

You are a planning agent. Analyze PRD #{{PRD_ISSUE}} and its child issues, then produce a structured execution plan.

## PRD

!`gh issue view {{PRD_ISSUE}} --json number,title,body --jq '"#" + (.number|tostring) + ": " + .title + "\n\n" + .body'`

## Open issues referencing this PRD

!`gh issue list --state open --limit 100 --json number,title,body,labels --jq '[.[] | select(.body | strings | test("#{{PRD_ISSUE}}"))] | map({number, title, body, labels: [.labels[].name]})'`

## Closed issue numbers (resolved — blockers in this list are satisfied)

!`gh issue list --state closed --limit 200 --json number --jq '[.[].number]'`

## Instructions

1. Read the PRD to understand the full scope.
2. From the open list above, identify open issues that are child tasks of this PRD.
3. For each open issue, parse referenced blockers ("blocked by #N", "depends on #N", or logical ordering).
4. **Closed blocker = resolved.** If a blocker number appears in the closed list above, the dependency is satisfied: do NOT list it under `dependencies` and do NOT exclude the issue.
5. Only list dependencies that are themselves OPEN and present in the open list above.
6. Exclude an open issue ONLY if a blocker is OPEN and not a child of this PRD (unresolved external work).

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
