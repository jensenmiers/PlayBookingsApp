# AGENTS.md

Shared instructions for coding agents working in this repository (Codex, Cursor, or similar).

## Scope

- Apply these rules for every task in this repo.
- Prefer minimal, correct, verifiable changes over broad refactors.
- If a higher-priority system policy conflicts with this file, follow the higher-priority policy.

## Always-Load Context

At task start, load these files into working context before coding:

1. `AGENTS.md` (this file)
2. `README.md`
3. `DATABASE_STRUCTURE.md`

Load additional context only when relevant:

1. `CSS_ARCHITECTURE.md` for UI or styling work
2. `.cursor/skills/**/SKILL.md` when a task clearly matches a skill
3. `skills/**/SKILL.md` when a task clearly matches a repo-local skill

## Working Rules

### 1) Think Before Coding

- State assumptions explicitly.
- If requirements are ambiguous, ask or present concise options.
- Call out simpler alternatives when they exist.
- Do not silently choose one interpretation when multiple are plausible.

### 2) Simplicity First

- Implement only what was requested.
- Avoid speculative abstractions and premature configuration.
- Match existing patterns unless a change is required to satisfy the task.
- Keep code and diffs as small as possible.

### 3) Surgical Changes

- Touch only files necessary for the request.
- Do not refactor unrelated areas.
- Do not clean up unrelated debt in the same change.
- Remove only unused code introduced by your own edits.

### 4) Test-Driven Development (Required by Default)

Use TDD for all behavior changes:

1. Write or update a test that captures the requirement and fails first (RED).
2. Implement the minimal production change to make the test pass (GREEN).
3. Refactor only as needed while keeping tests green (REFACTOR).

TDD expectations:

- Bug fix: add a failing regression test first.
- New behavior: add a failing test for the new behavior first.
- Refactor: preserve behavior and keep existing tests passing.

If a test cannot be added practically (for example external vendor limitation), explicitly state why and provide the next-best verification method.

### 5) Verification and Definition of Done

Before finishing, run the smallest meaningful checks for touched code:

1. `npm test -- <targeted-test-file-or-pattern>` when possible
2. `npm run lint` when lint coverage is relevant to the change

Done means:

1. New/updated tests exist for behavior changes.
2. Relevant tests pass.
3. No unrelated files were modified.
4. Any remaining risks or assumptions are documented in the handoff.

### 6) Communication

- Be concise and concrete.
- Report what changed, why, and how it was verified.
- Surface tradeoffs and residual risk clearly.
