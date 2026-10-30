---
name: event-review
description: "Review a specified Event Studio diff or code area for correctness and regressions without editing it."
---

# Event Studio review

Read repository `AGENTS.md` and [the shared execution contract](../../../.codex/workflows.md), then use its `review` route for the user's actual request.

reviewer only. Findings are the deliverable; do not launch a fix loop unless the user requests fixes.

Delegate appropriate specialist steps for substantial work when runtime instructions allow it; handle small work directly. Preserve the requested scope and existing WIP. Load only relevant domain skills and report actual evidence. The shared execution contract defines ownership, review/fix limits, and fallback when subagents are unavailable.
