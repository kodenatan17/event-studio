---
description: Performance work: scout → coder → reviewer
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

Route: performance
Performance: <request>$ARGUMENTS</request>

Route: scout(analyze — where the cost is, with evidence) → coder(performance) → reviewer.
Targets are `architecture.md` §12 budgets (real-device measurement). Skills for the agents: world-engine for 3D/scene/asset cost, next-bundle-optimizer for client bundle and initial-load work, plus wedding-web-architecture.
