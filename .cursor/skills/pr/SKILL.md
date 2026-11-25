---
name: pr
description: >-
  Review the most recent open GitHub PR with a Bugbot-style harness code review
  of the latest commit. Use when the user invokes /pr, asks to review the latest
  open PR, or wants a Bugbot-like PR review calibrated for MVP/product-market-fit.
disable-model-invocation: true
---

# /pr — Latest Open PR Review

Bugbot-style, defect-first review of the **most recently updated open PR**, scoped to that PR's **latest commit**. Calibrated for an early-stage MVP seeking product-market fit.

## Product posture (non-negotiable)

Play Bookings optimizes for learning velocity and the shortest responsible path to production.

**Flag hard (must report):**
- Correctness bugs / regressions introduced by the commit
- Security, payment correctness, privacy, auth/session leaks
- Data integrity / booking-state corruption risks
- Broken user flows that would ship broken UX

**Do not flag (MVP noise):**
- Missing scale abstractions, premature caching, or "enterprise" infra
- Reversible managed-service / ops shortcuts
- Style nits, rename bikesheds, speculative refactors
- "Would be nicer if…" maintainability comments that do not block shipping

If a finding is only "this won't scale," omit it unless it fails for current expected load.

## Workflow

Copy and track:

```
/pr Progress:
- [ ] 1. Resolve latest open PR
- [ ] 2. Checkout PR head (if needed)
- [ ] 3. Identify latest commit
- [ ] 4. Run Bugbot harness on that commit
- [ ] 5. Filter findings through MVP posture
- [ ] 6. Report compact results
```

### 1. Resolve the most recent open PR

From the repo root:

```bash
gh pr list --state open --limit 20 \
  --json number,title,url,updatedAt,createdAt,headRefName,baseRefName,author,commits
```

Pick the PR with the latest `updatedAt`. If none are open, stop: "No open PRs."

If the user named a PR number/URL, use that instead.

### 2. Checkout the PR head

```bash
gh pr checkout <number>
```

If checkout fails due to local dirty state, explain the blocker and ask before stashing. Do not stash without confirmation.

Confirm:

```bash
git status -sb
git log -1 --oneline
```

### 3. Identify the latest commit

Use the tip of the PR head:

```bash
git rev-parse HEAD
git log -1 --format='%H%n%s%n%b'
gh pr view <number> --json commits,files,title,url,baseRefName,headRefName
```

Review target = that single latest commit (`HEAD`), not the full multi-commit PR history unless the user asks for whole-PR review.

### 4. Run Bugbot harness

Launch **exactly one** `bugbot` subagent:

- `run_in_background: false` unless user asked for background
- `description: "Bugbot"`
- `subagent_type: "bugbot"`

Prompt shape (exact):

```text
Full Repository Path: <absolute repository path>
Diff: branch changes
Custom Instructions: Review only the latest commit <sha> ("<subject>"). Ignore unrelated earlier commits on this branch. Defect-first Bugbot-style review. MVP posture: flag correctness, security, payment, privacy, data-integrity, and broken UX only. Do not flag scale, speculative refactors, style nits, or reversible infra shortcuts. PR: #<number> <title> (<url>). Base: <baseRefName>.
```

Do **not** pre-compute the diff for the subagent. Default `Diff: branch changes`.

**Retries (once each, then stop):**
1. Wrong invocation shape → fix prompt and retry
2. Diff could not be computed → retry with `Diff: natural language` + `Change Description` for files touched by the latest commit only (`git show --name-status --stat <sha>`, then summarize each file)
3. Other failure → retry once with same prompt; if it fails again, report the blocker

### 5. Filter findings (MVP gate)

After Bugbot returns, drop any finding that is only:
- scale / future-proofing
- style / naming preference
- speculative architecture
- reversible infra shortcut called out in AGENTS.md as acceptable

Keep findings that would make a real user, payment, or data path fail.

### 6. Report format

Lead with actionability. ADHD-shaped: first line = verdict + PR link.

```markdown
## /pr #<number> — <title>
**<url>**
Latest commit: `<sha7>` — <subject>

| Severity | Location | Finding |
|----------|----------|---------|
| ... | file:line | ... |
```

Rules:
- Sort by severity (highest first)
- Columns exactly: Severity, Location (`file:line`), Finding
- If no issues after MVP filter: one line — `Bugbot found no ship-blocking bugs on <sha7>.`
- If empty diff: one line — no diff to review
- Brief residual-risk note only if material (auth/payments/data)
- **Do not fix** or push unless the user explicitly asks next

## Optional follow-ups (ask, don't do)

- Fix P0/P1 findings
- Whole-PR review (all commits)
- Post review comments on GitHub (`gh pr review` / `gh api`)
