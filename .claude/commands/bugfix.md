---
description: Fix a bug: scout(diagnose) → coder(fix) → reviewer
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

Route: bugfix
Bug: <request>$ARGUMENTS</request>

Route: scout(diagnose — root cause with file:line evidence) → coder(fix, minimal change) → reviewer.
Skills: spec-first and wedding-web-architecture; for viewer/3D bugs add world-engine and the matching threejs-* skills (see CLAUDE.md).
Add qa only if business logic changed. If scout says the cause is in an external service (Supabase, R2/CDN), the browser/GPU or a 3D asset, stop and report.
