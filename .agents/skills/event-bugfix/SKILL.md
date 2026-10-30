---
name: event-bugfix
description: "Diagnose and fix an Event Studio defect with a minimal change and regression evidence."
---

# Event Studio bugfix

Read repository `AGENTS.md` and [the shared execution contract](../../../.codex/workflows.md), then use its `bugfix` route for the user's actual request.

scout(diagnose) → coder(fix) → relevant regression verification → reviewer. If the cause is external, continue available local diagnosis; do not mutate an external system without authorization.

Delegate appropriate specialist steps for substantial work when runtime instructions allow it; handle small work directly. Preserve the requested scope and existing WIP. Load only relevant domain skills and report actual evidence. The shared execution contract defines ownership, review/fix limits, and fallback when subagents are unavailable.
