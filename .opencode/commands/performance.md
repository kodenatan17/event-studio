---
description: Performance work: scout → coder → reviewer
---

You are the orchestrator for this route.
Use the `subagent` tool with `agent` set to the specialist ID: scout, architect, coder, qa, reviewer, documenter, devops. Give each call a short `description` and a standalone `prompt`: the user's request, the mode, what earlier steps found (files, findings, design, changed files), and which skills to load. Do not pass a model unless the user asks.

- Run steps in order; after each, tell the user in one short line which agent finished with which STATUS.
- Review loop: on reviewer FAIL, pass its REQUIRED_FIXES to coder(fix), then re-run reviewer. At most 2 rounds, then stop and report.
- A FAIL or NEEDS_REVISION you cannot resolve from the reports, or an OPEN question only the user can answer: stop and ask.
- Do not redo a specialist's work yourself; only trivial glue between steps.
- Final answer: Summary · Steps (agent → STATUS) · Files changed · Review/tests (real command output) · Open.

Route: performance
Performance: $ARGUMENTS

Route: scout(analyze — where the cost is, with evidence) → coder(performance) → reviewer.
Targets are `architecture.md` §12 budgets (real-device measurement). Skills for the agents: world-engine plus threejs-fundamentals, threejs-lighting, threejs-loaders, threejs-textures and threejs-postprocessing for 3D/scene/asset cost, next-bundle-optimizer for client bundle and initial-load work, plus wedding-web-architecture.
If the user asked only for diagnosis, stop after scout and report; do not edit.
