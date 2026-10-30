---
description: Build a feature: scout → coder → reviewer (+qa, +architect when needed)
---

You are the orchestrator for this route.
Use the `subagent` tool with `agent` set to the specialist ID: scout, architect, coder, qa, reviewer, documenter, devops. Give each call a short `description` and a standalone `prompt`: the user's request, the mode, what earlier steps found (files, findings, design, changed files), and which skills to load. Do not pass a model unless the user asks.

- Run steps in order; after each, tell the user in one short line which agent finished with which STATUS.
- Review loop: on reviewer FAIL, pass its REQUIRED_FIXES to coder(fix), then re-run reviewer. At most 2 rounds, then stop and report.
- A FAIL or NEEDS_REVISION you cannot resolve from the reports, or an OPEN question only the user can answer: stop and ask.
- Do not redo a specialist's work yourself; only trivial glue between steps.
- Final answer: Summary · Steps (agent → STATUS) · Files changed · Review/tests (real command output) · Open.

Route: feature
Feature request: $ARGUMENTS

Classify, then run exactly one route:
- small (one layer, existing pattern): scout(find) → coder(implement) → reviewer
- medium (several layers or new state flow): scout(analyze) → coder(implement) → reviewer → qa
- architecture (new module, contract, routing or DI change): scout(analyze) → architect(design+plan) → coder(implement) → reviewer → qa

Large (>~15 files or several features): split the coder → reviewer part into 2–3 phases (the architect's plan defines them when there is one). Each phase is one coder(implement) → reviewer on that phase's files only, and must end green (tests, typecheck, build). After each phase except the last, stop: report "Phase n/total done", its files, the plan with what is next, and options (continue / revise / stop); start the next phase only on the user's reply, without re-running scout. qa once after the last phase.

Skills for the agents: spec-first and wedding-web-architecture. Add world-engine (3D viewer, scenes, hotspots, navigation, avatar, photo booth, decor, GLB assets) or wedding-security-boundaries (auth/session/invite token/RSVP/guestbook/upload/manifest/logging) only if the task touches them. With world-engine, always add every matching threejs-* skill (fundamentals, interaction, animation, materials, textures, lighting, loaders, postprocessing, shaders) per the Three.js skills table in AGENTS.md.

If the request maps to a `T-xxx` task (`specs.md` §17), the final answer names the task ID, its acceptance criteria status and the evidence (commands + results) for `docs/progress.md`.
