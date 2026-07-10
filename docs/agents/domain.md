# Domain docs

**Layout:** Single-context. One `CONTEXT.md` at the repo root, with `docs/adr/` for numbered architectural decisions.

## Consumer rules

Skills that use domain docs (`diagnosing-bugs`, `tdd`, `improve-codebase-architecture`, and others) will:

1. Read `CONTEXT.md` first to understand vocabulary, domain invariants, and core business logic
2. Read `docs/adr/` to understand past architectural decisions and trade-offs
3. Use `UBIQUITOUS_LANGUAGE.md` (linked from `CONTEXT.md`) to look up terms used across more than one file

**Before these skills engage:** make sure `CONTEXT.md` is up-to-date. It should reflect the current state of the codebase, not historical decisions. If you change a core invariant or domain term, update `CONTEXT.md` in the same PR.

**When recording a new decision:** add an ADR to `docs/adr/` with the decision, rationale, and consequences. Link it from `CONTEXT.md` if it affects domain invariants. Update the index in `docs/README.md`.

## Related files (secondary references)

- **`DESIGN.md`** — UI design system, colors, typography, component patterns. Relevant to UI-focused skills and when troubleshooting rendering issues.
- **`CONTRIBUTING.md`** — PR workflow, commit conventions, CI gates. Relevant when working with git history or planning refactors.
- **`AGENTS.md`** (this file's parent) — agent-specific guidance. Relevant to all skills working in this repo.

## Index

- ADR index and table: `docs/README.md`
- Full list of ADRs: `docs/adr/` (0001–0026)
