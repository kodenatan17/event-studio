---
name: event-refactor
description: "Restructure Event Studio code while preserving behavior and contracts."
---

# Event Studio refactor

Read repository `AGENTS.md` and [the shared execution contract](../../../.codex/workflows.md), then use its `refactor` route for the user's actual request.

scout(find/analyze) → coder(refactor) → existing regression checks → reviewer. Phase large changes and serialize shared-file edits.

Delegate appropriate specialist steps for substantial work when runtime instructions allow it; handle small work directly. Preserve the requested scope and existing WIP. Load only relevant domain skills and report actual evidence. The shared execution contract defines ownership, review/fix limits, and fallback when subagents are unavailable.
