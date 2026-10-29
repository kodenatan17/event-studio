# Progress — Undangan AI Wedding World

> **Updated:** 2026-10-29
> **Purpose:** task status and evidence per `specs.md` §0.2 (execution protocol). Task list and dependencies come from `specs.md` §17. Update this file after every task.

## Status legend

| Status | Meaning |
|---|---|
| `NOT_STARTED` | No work recorded |
| `IN_PROGRESS` | Work started; AC or tests not yet passing |
| `BLOCKED` | Missing credential, service or asset. Record the blocker; keep a labeled adapter or placeholder where possible |
| `DONE` | AC and required tests pass, with evidence recorded |

Art-dependent work uses `ENGINEERING_DONE / ART_PENDING` (`architecture.md` §11.2). Engineering is complete, but the production model or license is still missing. It is not `DONE`.

**Evidence rules:** record only evidence that was actually produced (commit, command and result, screenshot, migration ID, runbook entry). Never mark `DONE` from code generation alone.

**Current milestone:** Gate A+ prototype in progress — MVP public viewer on a dev fixture (no backend).

Gate A (`specs.md` §16.1, §17) requires T-001 through T-006 to pass. T-002, T-004 and T-005 are IN_PROGRESS and T-006 is NOT_STARTED, so Gate A is not yet met.

## Summary (43 tasks)

| Status | Count |
|---|---|
| `DONE` | 3 |
| `IN_PROGRESS` | 6 |
| `BLOCKED` | 6 |
| `NOT_STARTED` | 28 |

"Next action" lists dependencies from `specs.md` §17. "planned: MVP phase 3" marks tasks planned for the MVP, not started yet.

---

## Milestone 0 — Feasibility & repository foundation

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-001 | Audit repository, record present stack and constraints. | DONE | Repo audit 2026-10-29: repo held only the spec set, `CLAUDE.md`, `.claude/` and one git commit. Node 22.23.0, npm 10.9.8, corepack 0.34.0; pnpm absent (enabled via corepack); Supabase CLI and Docker absent; no Supabase project, R2 bucket or CDN; Higgsfield MCP connected, 0 credits. | None. Re-audit if the host toolchain changes. |
| T-002 | Initialize pnpm workspace, app, shared packages, strict TS, formatting/linting, CI skeleton. | IN_PROGRESS | Workspace created (pnpm 10.34.9 + Turborepo, strict TS, ESLint/Prettier, CI skeleton `.github/workflows/ci.yml`). `pnpm lint` clean with `--max-warnings 0`; `pnpm typecheck` green; `pnpm test` 50 passed / 0 failed (contracts 16, world-engine 24, web 10); `pnpm build` OK. CI config sets telemetry off and uploads reports (config only, not run remotely). | Run the CI workflow on a remote and record the run. Then mark DONE. |
| T-003 | Set up first React Three Fiber canvas, placeholder Entrance scene, responsive/mobile canvas boundary. | DONE | R3F canvas and placeholder entrance render under `next build && next start`. `pnpm test:e2e` 15 passed / 0 failed / 1 skipped (projects `desktop` + `mobile`, Pixel 7; the skipped test is mobile-only and skipped on desktop). Includes `[T-003] mobile canvas fills viewport, no page scroll` (mobile project) and header smoke tests. `e2e/navigation.spec.ts` with `--repeat-each=3`: 18/18. Earlier one-off Pixel 7 probe: WebGL context live, DPR capped 1.75, `touch-action: none`. | None for AC. Note: `specs.md` §17 lists T-002 as its dependency, which is still IN_PROGRESS. Owner to confirm DONE. |
| T-004 | Add placeholder Living Room and scene manager with safe transition/loading/failure states. | IN_PROGRESS (ENGINEERING_DONE / ART_PENDING) | Scene manager store with request-ID cancellation and loading/ERROR states; 4 primitive scenes (blockout, prototype only). Reviewed PASS_WITH_NOTES, no required fixes. `data-gl-geometries` observed flat at 16–18 across scene switches (manual observation). | Phase 3: 2D fallback, E2E-04, automated geometry regression test. Depends T-003 (DONE). |
| T-005 | Implement raycast hotspot registry, clickable door and storybook overlay vertical slice. | IN_PROGRESS | Hotspot registry and raycast on tagged meshes; clickable door and portals; storybook hotspot dispatches `open_story`. | Phase 3: story overlay (E2E-02). Depends T-004 (IN_PROGRESS). |
| T-006 | Test vertical slice on touch/mobile, document baseline FPS/loading/blockers. | NOT_STARTED | — | planned: MVP phase 3. Depends T-005 (IN_PROGRESS). |

## Milestone 1 — Data/auth, reusable engine

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-101 | Configure Supabase local/dev, SQL migrations and seed; create tenant schema and indexes. | BLOCKED | Supabase CLI and Docker absent; no Supabase project or credentials. `pnpm db:migrate` and `pnpm db:seed` are stubs that exit 1. | Install Supabase CLI and Docker, or provide a dev project and credentials. Then add migrations, seed and tenant schema. Depends T-002 (IN_PROGRESS). |
| T-102 | Implement studio login/session, member middleware and SQL RLS policies; write cross-tenant tests. | BLOCKED | Blocked by T-101 (no Supabase project or credentials). | Implement after T-101 runs locally. Depends T-101. |
| T-103 | Implement `WeddingManifestV1Schema` and strict template/action schemas; add fixtures and contract tests. | DONE | `WeddingManifestV1Schema` in `packages/contracts/src/manifest.ts`; `WorldActionSchema` in `packages/contracts/src/world.ts`; fixture `packages/contracts/fixtures/demo-wedding.ts`; 16 contract tests pass (`pnpm test`). | None for AC. `specs.md` §17 lists T-004 as its dependency, which was IN_PROGRESS when recorded. Owner to confirm. |
| T-104 | Implement `world-engine` scene/nav/asset/quality/camera modules with deterministic cleanup and error handling. | IN_PROGRESS (subset) | Scene, navigation, quality and camera modules in `packages/world-engine`. `world-engine` 24 tests pass (`pnpm test`). GLTF asset manager not implemented (no assets yet). | Add the GLTF asset manager when assets exist. Depends T-005 (IN_PROGRESS). |
| T-105 | Implement public manifest read endpoint and immutable publication storage model. | BLOCKED | Blocked by T-101 (no Supabase project or credentials). No real published source exists; the dev fixture stands in (D-009). | Implement after T-101 and T-103. Depends T-101, T-103. |
| T-106 | Implement private draft data and optimistic revision control. | BLOCKED | Blocked by T-101 and T-102. | Implement after T-101 and T-102. Depends T-101, T-102. |
| T-107 | Implement R2 draft/published storage adapter, upload signing, verification and local development adapter. | BLOCKED | No R2 bucket. Depends T-102 (blocked). | Build the local development adapter first (needs no R2). Wire R2 once a bucket exists. Depends T-102. |
| T-108 | Implement core accessible UI/dialog layout + 2D fallback skeleton. | NOT_STARTED | — | planned: MVP phase 3. Depends T-003 (DONE). |

## Milestone 2 — Content vertical slice

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-201 | Finish Entrance name/welcome and responsive status/audio controls. | NOT_STARTED | — | planned: MVP phase 3 (view-only parts). Depends T-104, T-105. |
| T-202 | Finish Living Room frames/gallery with published media and draft-only authorized preview. | NOT_STARTED | — | planned: MVP phase 3 (view-only parts). Depends T-104, T-107, T-108. Draft preview waits for T-106 and T-107. |
| T-203 | Finish interactive storybook, chapter CRUD/schema and story editor. | NOT_STARTED | — | planned: MVP phase 3 (view-only storybook overlay, as in T-005). Depends T-104, T-106, T-108. CRUD and editor wait for T-106. |
| T-204 | Finish four-scene navigation core: tap-to-move, portal/spawn logic, quick map, history policy. | IN_PROGRESS (view) | Tap-to-move on floor with colliders; portals and spawn points; temporary quick map list. | Phase 3: global nav and history (D-014). Depends T-104 (IN_PROGRESS). |
| T-205 | Implement CMS create wedding wizard, metadata editor and gallery upload. | NOT_STARTED | — | Depends T-102, T-106, T-107. |
| T-206 | Implement preview manifest generation and authorized draft preview. | NOT_STARTED | — | Depends T-106, T-202, T-203. |

## Milestone 3 — Event and guest services

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-301 | Implement Garden/Hall scenes, ceremony/reception interactions and fallback content. | IN_PROGRESS (view, ENGINEERING_DONE / ART_PENDING) | Garden and Hall scenes with ceremony, reception, RSVP, guestbook and photo hotspots (blockout). | Phase 3: overlays. Depends T-204 (IN_PROGRESS). |
| T-302 | Implement event editor, timezone correct viewer and Maps link validation. | NOT_STARTED | — | Depends T-205. |
| T-303 | Implement guest creation/invite token hashes/secure token exchange/sessions/revocation. | NOT_STARTED | — | Depends T-101, T-102. |
| T-304 | Implement guest-session-scoped RSVP UI/API, validation, aggregates and tests. | NOT_STARTED | — | Depends T-303, T-302. |
| T-305 | Implement guestbook creation/moderation/public approved list/pagination/tests. | NOT_STARTED | — | Depends T-303. |
| T-306 | Implement publish pipeline with asset promotion, validation, versioning/rollback, and failure recovery. | NOT_STARTED | — | Depends T-105, T-106, T-107, T-205. |
| T-307 | Run cross-tenant, RSVP, draft/publish and guestbook E2E tests. | NOT_STARTED | — | Depends T-301..T-306. |

## Milestone 4 — Avatars & virtual photography

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-401 | Integrate guest avatar presets, selection persistence, idle/walk pose mapping. | NOT_STARTED | — | Depends T-204 and artist assets. When started, mark `ENGINEERING_DONE / ART_PENDING` until assets are licensed. |
| T-402 | Hook avatar movement to navmesh/waypoints and camera follow; profile mobile. | NOT_STARTED | — | Depends T-401. |
| T-403 | Integrate couple avatars, three pose presets and booth environment. | NOT_STARTED | — | Depends T-301 and artist assets. |
| T-404 | Implement offscreen capture, PNG frame/name composition, local download/share, recoverable errors. | NOT_STARTED | — | Depends T-403, T-107 (public asset CORS). |
| T-405 | Write booth E2E/manual QA including no webcam access and context-loss recovery. | NOT_STARTED | — | Depends T-404. |

## Milestone 5 — Theme customization & studio completeness

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-501 | Formalize scene template catalog/GLB node naming, six decoration slots and allowed variants. | NOT_STARTED | — | Depends T-103 and artist asset deliverables. |
| T-502 | Implement palette/lighting/decor selection with draft preview and manifest validation. | NOT_STARTED | — | Depends T-501, T-206. |
| T-503 | Finish CMS RSVP dashboard, guests workflow, guestbook moderation, publish management/rollback UX. | NOT_STARTED | — | Depends T-304, T-305, T-306. |
| T-504 | Add template/asset validation CLI, optimized models/textures and license register. | BLOCKED | `pnpm assets:validate` is a stub. Asset pipeline not implemented. No production art. | Implement the validator (GLB node names, budgets, variants, licenses) after T-501. Depends T-501. |
| T-505 | End-to-end verification that decor changes remain draft until publish, rollback restores older look. | NOT_STARTED | — | Depends T-502, T-503. |

## Milestone 6 — Hardening & pilot

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-601 | Implement adaptive quality, scene preloading budgets and memory-release regression test. | NOT_STARTED | — | Depends T-204, T-401. |
| T-602 | Complete responsive/accessible 2D fallback for all non-booth core actions. | NOT_STARTED | — | Depends T-302, T-304, T-305. |
| T-603 | Complete RLS/security abuse tests, rate limits, logging redaction, production CSP/CORS. | NOT_STARTED | — | Depends T-307. Baseline CSP is in D-015. |
| T-604 | Finish Playwright suite E2E-01..12, run real-device matrix and record evidence. | NOT_STARTED | — | Depends T-505, T-602, T-603. |
| T-605 | Complete runbook, backups/restore drill, publishing rollback rehearsal and deployment. | NOT_STARTED | — | Depends T-604. |
| T-606 | Run three distinct wedding pilot configurations; fix critical defects and validate scene asset licenses. | NOT_STARTED | — | Depends T-605 and artist signoff. |
