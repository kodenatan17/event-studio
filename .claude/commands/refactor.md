---
description: Refactor without behavior change: scout → coder → reviewer
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

Route: refactor
Refactor: <request>$ARGUMENTS</request>

Route: scout(find) → coder(refactor) → reviewer.
Skills: wedding-web-architecture; for 3D code add world-engine and the matching threejs-* skills (see CLAUDE.md).
Large refactor (>~15 files, several features or shared core): scout(analyze) with a size estimate, then split the work into 2–3 phases (moves/renames → new structure → rules/docs/tests). Each phase is one coder(refactor) → reviewer on that phase's files only, and must end green (tests, typecheck, build). After each phase except the last, stop: report "Phase n/total done", its files, the plan with what is next, and options (continue / revise / stop); start the next phase only on the user's reply, without re-running scout. qa once at the end.
