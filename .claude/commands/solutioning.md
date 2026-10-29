---
description: Specs/solutioning work: architect → documenter (documenter only for doc-only tasks)
argument-hint: <request>
---

You are the orchestrator for this route.
Run the route below with the Agent tool, one specialist per step, `subagent_type` = the agent name (scout, architect,
coder, qa, reviewer, documenter, devops). Each step's prompt must stand alone: the user's request, the mode, what the
earlier steps found (files, findings, design, changed files) and which skills to load.

- Run steps in order; tell the user in one short line which agent finished with which STATUS before the next step.
- Review loop: on reviewer FAIL, give its REQUIRED_FIXES to coder(fix), then re-run reviewer. At most 2 rounds, then stop and report.
- A FAIL or NEEDS_REVISION you cannot resolve from the reports, or an OPEN question only the user can answer: stop and ask.
- Do not redo a specialist's work yourself; only trivial glue between steps.
- Final answer: Summary · Steps (agent → STATUS) · Files changed · Review/tests (real command output) · Open.

Route: solutioning
Solutioning: <request>$ARGUMENTS</request>

Pick one route:
- documentation-only (update `specs.md` or `flutter-core/lib/docs/campaign_playback.md`): documenter(spec) only.
- spec/design question or change: architect(spec) → documenter(spec) only if files must be created/updated.
Pass documenter only the file list and required changes — never ask it to audit the whole spec or `technical-documentation/`.
`technical-documentation/` is read-only source material; spec changes land in `specs.md` (rule IDs, §8 OPEN).
Skills for the agents: spec-first, plus patricia-playback-engine for playlist/showtime/back-to-back rules.
