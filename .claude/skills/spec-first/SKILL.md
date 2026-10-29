---
name: spec-first
description: Resolve an Undangan AI Wedding World task to its feature ID, acceptance criteria, task ID and authoritative section across specs.md, architecture.md and api-contracts.md before designing, coding, testing or reviewing. Use for any behavior change — viewer, scenes, gallery, story, events, RSVP, guestbook, avatar, photo booth, decor, CMS, publish, guest invites.
---

# spec-first

The spec set lives at the repo root. Code follows the spec, never the other way round.

| File | Authoritative for |
|---|---|
| `specs.md` | Product scope: FR-01..FR-11 AC (§6), CMS screens (§10), tests (§13), gates (§16), tasks (§17), release checklist (§18) |
| `architecture.md` | System design: locked decisions (§2), routes/UX (§3), layout (§4), data/lifecycle (§5), engine (§8), assets (§11), budgets (§12), security (§14), env/CI (§15) |
| `api-contracts.md` | API boundaries: invite tokens/sessions (§5.3), public manifest (§7), endpoints/errors/uploads (§9) |

## Steps
1. Find the feature: `specs.md` §1.3 (ID, P0/P1) and its implementation, acceptance and failure cases in §6.
2. Find the task: `specs.md` §17 `T-xxx`, its dependencies and milestone/gate (§16). Do not start a task whose dependencies are not `DONE` (check `docs/progress.md`) without saying so.
3. Open only the sections the task needs:
   - routes / interaction rules → `architecture.md` §3; tables, draft/publish → §5; engine → §8; assets → §11; budgets / 2D fallback → §12; security → §14
   - tokens / sessions → `api-contracts.md` §5.3; manifest fields → §7; endpoints, status codes, upload limits → §9
4. Find the proof: matching unit/integration items in `specs.md` §13.1–13.2 and the `E2E-xx` scenario in §13.3.
5. Check `docs/decisions.md` for an existing decision on the point.

## Rules
- Never invent product rules. Unspecified design choices take the defaults in `architecture.md` §2; a real gap or conflict is reported as OPEN / NEEDS_REVISION and logged in `docs/decisions.md` with the precedence applied. Never silently drop an acceptance criterion.
- V1 out of scope (`specs.md` §0.8, `architecture.md` §2 "Explicitly deferred"): payments, multiplayer/realtime, chat, AI-generated media, voice, freeform 3D editor, webcam selfies. Refuse to add them; keep interfaces extendable.
- Cite the ID (`FR-xx` AC, `T-xxx`, `E2E-xx`) and file + § for every behavior decision.
- Changed behavior needs a test carrying the ID in its name (`'[FR-05] ...'`, `E2E-05 ...`).
- Missing credentials/assets/services: labeled adapter or placeholder + `BLOCKED` evidence; never present it as complete.
- After a task, `docs/progress.md` gets status + real evidence. `DONE` only when the AC and required tests pass.
