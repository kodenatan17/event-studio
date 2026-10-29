# Event Studio — Undangan AI Wedding World — Claude Code

Undangan AI Wedding World is a **mobile-first interactive 3D wedding invitation** opened from a browser link (usually shared over WhatsApp), plus a **multi-tenant studio CMS** where couples build and publish their own world:
- guests walk through four connected scenes: `entrance` → `living-room` → `wedding-garden` / `reception-hall`;
- they read the couple's story, browse the gallery, view event details, RSVP, sign the guestbook and take a virtual avatar photo;
- couples edit content, theme and decor, manage guests and invite links, preview the draft and publish versioned snapshots.

It is one reusable engine and template for many couples, **not** a bespoke single-couple demo.

| ID | Feature | Priority |
|---|---|---|
| FR-01 | 3D entrance with couple names | P0 |
| FR-02 | Living Room with interactive photo gallery | P0 |
| FR-03 | Interactive love-story book | P0 |
| FR-04 | Inter-room navigation | P0 |
| FR-05 | Event information and RSVP | P0 |
| FR-06 | Virtual photo booth with wedding avatars | P1 |
| FR-07 | Guest character/avatar | P1 |
| FR-08 | Wedding Garden and Reception Hall | P0 |
| FR-09 | Digital guestbook and wishes | P0 |
| FR-10 | Couple-selectable scenes/decorations | P1 |
| FR-11 | Per-couple Wedding World CMS | P0 |

## Spec set & precedence
Read **all three** before implementing anything. Section IDs are noncontiguous on purpose (kept for traceability).

| File | Authoritative for |
|---|---|
| `specs.md` | Product behavior, FR-01..FR-11 acceptance criteria (§6), CMS screens (§10), test strategy (§13), release gates (§16), task order T-001..T-606 (§17), release checklist (§18) |
| `architecture.md` | Locked V1 decisions (§2), routes and UX rules (§3), system layout (§4), data model and draft/publish lifecycle (§5), world engine (§8), assets (§11), budgets (§12), security (§14), env/CI/ops (§15) |
| `api-contracts.md` | Invitation tokens and guest sessions (§5.3), public manifest (§7), HTTP endpoints, error envelope and upload rules (§9) |

If they disagree: follow the file authoritative for that concern, record the discrepancy in `docs/decisions.md`, and **never silently drop an acceptance criterion**.

## Status — 2026-10-29
- Greenfield: the repo holds only the spec set and this AI config. No app code, `package.json` or lockfile yet.
- Start with **T-001** (audit, record stack and constraints), then T-002 (pnpm workspace, strict TS, lint/format, CI skeleton).
- Per `specs.md` §0, create `docs/progress.md` (task ID, status, evidence, next action) and `docs/decisions.md` first, and keep them updated.
- Gate A comes before any architectural expansion. Finish the vertical slice first: `Entrance → Door → Living Room → Book → Story Overlay → Close` (`specs.md` §20).

## Stack — locked for V1 (`architecture.md` §2)
- **One Next.js App Router app** (`apps/web`) serving `/w/*` (public viewer), `/i/*` (invite exchange), `/studio/*` (CMS) and `/api/*` (Route Handlers, Node.js runtime where DB/storage SDKs are needed).
- TypeScript strict · pnpm workspace + Turborepo · React + Tailwind CSS.
- 3D: Three.js + React Three Fiber + Drei, Blender-authored GLB. Canvas is client-only, never SSR.
- State: Zustand for transient viewer/editor state; the server is the source of truth for persistent data.
- Supabase Postgres + Supabase Auth (email magic link) with RLS; SQL migrations in `supabase/migrations/`.
- Cloudflare R2: private draft media, public published assets via controlled promotion.
- Shared Zod schemas and types in `packages/contracts`. Tests: Vitest (unit/integration), Playwright (E2E).
- **Version policy:** the spec pins no versions. At T-002 pick current, mutually compatible **stable** releases, commit an exact lockfile and record the choices in `docs/decisions.md`. No canary/unreleased versions, no mixed majors.

## Layout (planned, `architecture.md` §4.2)
```text
apps/web/                 app/ (public w/[slug], i/[slug]/route.ts, studio, api/public, api/studio, api/health), components/, lib/
packages/world-engine/    renderer, scene-manager, asset-manager, navigation, camera, interaction, avatar, quality
packages/wedding-features/ gallery, storybook, event-info, rsvp, guestbook, photo-booth
packages/contracts/       Zod schemas + TS types (single source of truth)
packages/database/        tenant-scoped queries, repositories, DB types
packages/ui/              accessible design system
packages/config/          tsconfig, eslint, formatting
supabase/                 migrations/, seed.sql (dev/test only)
assets/                   source/ (provenance), optimized/, manifest/
scripts/  e2e/  docs/{progress,decisions,asset-register,runbook}.md  .env.example
```
Ownership (§4.3):
- `world-engine` knows nothing about weddings. It consumes typed scene definitions and emits typed `WorldAction`s.
- `wedding-features` registers the domain actions (`open_gallery`, `open_story`, …) and their accessible overlays.
- `contracts` is the only place for API and manifest types; never hand-duplicate them.
- `database` owns tenant-scoped persistence and transactions.
- `apps/web` wires experience and auth together. The service-role key never reaches a browser bundle.

## Commands (`architecture.md` §15.2 — available once T-002 creates them)
```bash
pnpm install
pnpm dev               # Next.js + local watchers
pnpm lint
pnpm typecheck
pnpm test              # unit/integration (local adapters if needed)
pnpm test:e2e          # Playwright
pnpm build
pnpm assets:validate   # GLB node names, budgets, variants, licenses
pnpm db:migrate        # explicitly configured target only
pnpm db:seed           # development/test ONLY — must refuse production
```
CI on PR: frozen install → lint → typecheck → unit → build → E2E subset → asset validation.

## Working rules
- **Spec first.** Every behavior traces to an ID: `FR-xx` + its acceptance criteria, `T-xxx`, `E2E-xx`, or an architecture/API section. Never invent product rules; anything unspecified uses the defaults in `architecture.md` §2, and a real gap goes to `docs/decisions.md`.
- **Task order** follows `specs.md` §17 dependencies. Track status in `docs/progress.md` as `NOT_STARTED | IN_PROGRESS | BLOCKED | DONE`, with evidence (commit, test command + result, screenshot, migration ID). `DONE` only when the AC and the required tests pass, never from code generation alone.
- **No silent scope cutting.** If a credential, service or 3D asset is missing: build a clearly labeled adapter or placeholder, mark the task `BLOCKED` with evidence, and keep everything else working.
- **Out of scope for V1:** payments/subscriptions, multiplayer or realtime presence/chat, AI-generated images/models/narration, voice chat, freeform 3D editor, webcam selfies.
- **No real data in production paths.** Couple, guest, RSVP and tenant data come from the database; fake seed data lives only in dev/test fixtures.
- **Tests are acceptance evidence.** Workspace convention (not a spec rule): put the ID in the test name, e.g. `'[FR-05] declined stores partySize 0'`, Playwright `test('E2E-05 guest token → RSVP attending → edit to declined', …)`. Mocks do not count as real storage/auth integration passes.
- Small composable typed modules with explicit error handling; smallest change that works; no broad refactors or new packages beyond the locked stack unless the task needs them.
- Run `pnpm lint`, `pnpm typecheck`, the relevant `pnpm test` and (at milestones) `pnpm build` before finishing.
- Don't touch user WIP; never revert or reformat files you weren't asked to change.

## Agents & routes
This session is the orchestrator. Subagents live in `.claude/agents/` (edit them directly):
- `scout` (Pingot, read-only research)
- `architect` (Bima, design / spec validation)
- `coder` (Zaki)
- `qa` (Lulu, tests)
- `reviewer` (Sari, review + security)
- `documenter` (Nadia)
- `devops` (Dimas, workspace / CI / migrations / deploy)

Slash commands in `.claude/commands/`: `/feature` · `/bugfix` · `/refactor` · `/review` · `/security` · `/performance` · `/document` · `/comment` · `/devops` · `/analyze` · `/solutioning`.
- Each command runs one specialist per step through the Agent tool, with a reviewer → coder fix loop of at most 2 rounds.
- Small tasks may be done directly.

## Skills (`.claude/skills/`)
Load the relevant one before working in its area.

| Skill | Use for |
|---|---|
| `spec-first` | Any behavior change: resolve to FR / T / E2E IDs and the authoritative section |
| `wedding-web-architecture` | Monorepo layout, Next.js routes and Route Handlers, contracts, data model, draft/publish/rollback, env, tests |
| `world-engine` | R3F viewer, scene state machine, actions/hotspots, navigation, avatar, photo booth render, GLB assets, quality tiers, 2D fallback |
| `wedding-security-boundaries` | Tenant isolation/RLS, invite tokens and guest sessions, manifest privacy, uploads, CSRF, logging; every security review |
| `next-bundle-optimizer` | Auditing/reducing Next.js client bundles and initial-load work (`architecture.md` §12 budgets) |

## Invariants & gotchas
- **Public manifest** (`api-contracts.md` §7) is an immutable published snapshot: no guest lists, token hashes, draft media, signed preview URLs, private object keys or unrelated user IDs. The viewer never reads draft JSON.
- **Invite token = bearer capability:** ≥256-bit random, base64url in the link, only its SHA-256 hash stored. `/i/[slug]` sets the guest session cookie and 303-redirects to the clean `/w/[slug]` with `Referrer-Policy: no-referrer` and `Cache-Control: no-store`. Never log, persist client-side or return the token outside create/rotate responses.
- **Secrets:** only `NEXT_PUBLIC_*` values may reach the browser. `SUPABASE_SERVICE_ROLE_KEY`, R2 keys and `GUEST_SESSION_SECRET` are server-only. Never commit `.env*`; `.env.example` lists names only. Never print secret values.
- **Draft vs published:** edits never show publicly until explicit Publish. Publish = validate → promote assets → immutable versioned publication → atomic `active_publication_id` switch; a failure leaves the active version unchanged. Rollback only moves the pointer.
- **3D is an enhancement:** guests must always reach date, location, RSVP and wishes. Unsupported WebGL, context loss or asset failure → 2D fallback, never a blank canvas. Every 3D hotspot has a labeled HTML control invoking the same action.
- **Resource lifecycle is correctness:** scene switches dispose geometry/materials/textures and clear listeners, mixers and RAF loops; stale loads are cancelled.
- Audio is off until a user gesture. The photo booth never requests the webcam and never uploads by default.
- **Art:** placeholder primitives are prototype-only (`ENGINEERING_DONE / ART_PENDING`). Every shipped model needs origin and license in `docs/asset-register.md`.
- **Language:** code, identifiers and technical contracts are English. Product copy and user-facing error messages are Indonesian (`id-ID`, e.g. `"Input tidak valid"`); event timezone default `Asia/Jakarta`, stored as IANA.
