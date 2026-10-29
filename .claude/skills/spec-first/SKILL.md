---
name: spec-first
description: Resolve a Patricia TV-app task to its business rule in /specs.md (and the acceptance criteria behind it) before designing, coding, testing or reviewing. Use for anything touching pairing, MQTT actions, campaign sync, showtime, playlist/spotRepeat, back-to-back, bumper, evidence, heartbeat or maintenance.
---

# spec-first

Business rules for the TV client live in `/specs.md` (workspace root). Code follows the spec, never the other way round.

## Steps
1. Find the rule ID(s) for the task in `/specs.md` §4 (`PAIR-*`, `MQTT-*`, `SYNC-*`, `SHOW-*`, `PL-*`, `B2B-*`, `BUMP-*`, `EVD-*`, `HB-*`, `MNT-*`, and `SEC-*` for security / platform baseline, e.g. TLS validation and Flutter ≥ 3.47.8).
2. If the rule's wording is ambiguous, open only the source it cites (one file), in this priority order:
   1. `technical-documentation/docs/sprint_5/sprint_5.3/acceptance_criteria/Apps/` — Campaign Playlist / Back to Back / Showtime
   2. `technical-documentation/docs/sprint_5/sprint_5.2/acceptance_criteria/Apps/` — QR, connection status, bumper default, campaign to device
   3. `HLD Patricia - 5.3.md` §5.9 (Apps Playback) and §8 (open items)
   4. `flutter-core/lib/docs/campaign_playback.md` — how the rules are implemented (code + test map in §11)
3. Check `/specs.md` §8 (OPEN). If the task touches an open item, do not pick an answer: report it as OPEN / NEEDS_REVISION.

## Rules
- Never invent or silently resolve a business rule. A rule that is not in the spec is an OPEN question.
- Cite the rule ID (and source file + section) for every behavior decision.
- A rule change needs a test whose name carries the rule ID (playlist rules use the bracket form already used in tests, e.g. `'[6] spotRepeat = 2 ...'`, `'[Case 3] ...'`) under `flutter-core/test/features/video_player/helpers/` or the bloc test.
- After a rule changes, the documenter updates `/specs.md` and the table in `campaign_playback.md` §11.
- `technical-documentation/` is read-only from this workspace (it has its own `AGENTS.md`).
