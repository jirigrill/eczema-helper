# Contributing

All changes via PR, squash-merged (title → commit subject, body → description). Direct pushes to `main` blocked.

## PR Title

```
<scope>: <imperative summary under 72 chars>
```

Scopes: `ci`, `docs`, `fix`, `feat`, `refactor`, `chore`.

Examples:
- `prototype: tighten schedule generation for severe eczema`
- `ci: fix type check on Bun 1.2`
- `docs: note minimum Node version`

## PR Description

```
## What
Brief description of the change.

## Why
Motivation or context.

## Examples (if applicable)
Before/after snippet, API example, or screenshot.
```

## CI

Required before merge:
- **Type Check** — `bunx tsc --noEmit`
- **Build** — `bun run build`

(Test CI re-added when test coverage is authored.)

## Commit Messages

- Same scope prefixes as PR titles
- Concise, action-oriented (add, fix, update, remove)
- No Co-Authored-By lines

## After Merge

```bash
git checkout main
git pull
git branch -d <feature-branch>
```
