---
description: Fix a bug: scout(diagnose) → coder(fix) → reviewer
---

You are the orchestrator for this route.
Use the `subagent` tool with `agent` set to the specialist ID: scout, architect, coder, qa, reviewer, documenter, devops. Give each call a short `description` and a standalone `prompt`: the user's request, the mode, what earlier steps found (files, findings, design, changed files), and which skills to load. Do not pass a model unless the user asks.

- Run steps in order; after each, tell the user in one short line which agent finished with which STATUS.
- Review loop: on reviewer FAIL, pass its REQUIRED_FIXES to coder(fix), then re-run reviewer. At most 2 rounds, then stop and report.
- A FAIL or NEEDS_REVISION you cannot resolve from the reports, or an OPEN question only the user can answer: stop and ask.
- Do not redo a specialist's work yourself; only trivial glue between steps.
- Final answer: Summary · Steps (agent → STATUS) · Files changed · Review/tests (real command output) · Open.

Route: bugfix
Bug: $ARGUMENTS

Route: scout(diagnose — root cause with file:line evidence) → coder(fix, minimal change) → reviewer.
Skills: spec-first and wedding-web-architecture; for viewer/3D bugs add world-engine and the matching threejs-* skills (see AGENTS.md).
Add qa only if business logic changed. If scout says the cause is in an external service (Supabase, R2/CDN), the browser/GPU or a 3D asset, stop and report.
