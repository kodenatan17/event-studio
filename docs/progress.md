# Progress — Undangan AI Wedding World

> **Updated:** 2026-10-30
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

Gate A (`specs.md` §16.1, §17) requires T-001 through T-006 to pass. T-002, T-004, T-005 and T-006 are IN_PROGRESS, so Gate A is not yet met. T-006 needs a real-phone run by the user; the manual device matrix (`specs.md` §13.4) has not been run. Pixel 7 emulation is headless Chromium on SwiftShader and does not replace it.

## Summary (43 tasks)

| Status | Count |
|---|---|
| `DONE` | 4 |
| `IN_PROGRESS` | 10 |
| `BLOCKED` | 6 |
| `NOT_STARTED` | 23 |

"Next action" lists dependencies from `specs.md` §17. "planned: MVP phase 3" marks tasks planned for the MVP, not started yet.

---

## Milestone 0 — Feasibility & repository foundation

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-001 | Audit repository, record present stack and constraints. | DONE | Repo audit 2026-10-29: repo held only the spec set, `CLAUDE.md`, `.claude/` and one git commit. Node 22.23.0, npm 10.9.8, corepack 0.34.0; pnpm absent (enabled via corepack); Supabase CLI and Docker absent; no Supabase project, R2 bucket or CDN; Higgsfield MCP connected, 0 credits. | None. Re-audit if the host toolchain changes. |
| T-002 | Initialize pnpm workspace, app, shared packages, strict TS, formatting/linting, CI skeleton. | IN_PROGRESS | Workspace created (pnpm 10.34.9 + Turborepo, strict TS, ESLint/Prettier, CI skeleton `.github/workflows/ci.yml`). QA run 2026-10-30: `pnpm lint` clean; `pnpm typecheck` 5/5; `pnpm test` 83 passed / 0 failed (ui 5, wedding-features 7, contracts 16, web 22, world-engine 33); `pnpm build` OK; `pnpm test:e2e` (desktop + mobile) 38 passed / 0 failed / 2 skipped. CI config sets telemetry off and uploads reports (config only, not run remotely). | Run the CI workflow on a remote and record the run. Then mark DONE. |
| T-003 | Set up first React Three Fiber canvas, placeholder Entrance scene, responsive/mobile canvas boundary. | DONE | R3F canvas and placeholder entrance render under `next build && next start`. `pnpm test:e2e` 15 passed / 0 failed / 1 skipped (projects `desktop` + `mobile`, Pixel 7; the skipped test is mobile-only and skipped on desktop). Includes `[T-003] mobile canvas fills viewport, no page scroll` (mobile project) and header smoke tests. `e2e/navigation.spec.ts` with `--repeat-each=3`: 18/18. Earlier one-off Pixel 7 probe: WebGL context live, DPR capped 1.75, `touch-action: none`. | None for AC. Note: `specs.md` §17 lists T-002 as its dependency, which is still IN_PROGRESS. Owner to confirm DONE. |
| T-004 | Add placeholder Living Room and scene manager with safe transition/loading/failure states. | IN_PROGRESS (ENGINEERING_DONE / ART_PENDING) | Scene manager store with request-ID cancellation and loading/ERROR states. Living room renders the GLB `apps/web/public/templates/joglo/1.0.0/living-room.glb` (D-023); the other three scenes stay primitive blockouts (prototype only). E2E-04 pass (`e2e/navigation.spec.ts`). `[FR-04] 10 transitions do not grow data-gl-geometries` pass (`e2e/navigation.spec.ts`), so the geometry regression is automated. GLB 404 → ERROR panel: `[D-017]` pass (`e2e/fallback.spec.ts`). `[T-504]` GLB node test pass (`packages/world-engine/src/templates/gltf-layout.test.ts`). Earlier review PASS_WITH_NOTES, no required fixes. | Art sign-off and production license for the living-room GLB (`docs/asset-register.md`). Owner to decide D-023 discrepancies (Blender-authored rule, node naming). Depends T-003 (DONE). |
| T-005 | Implement raycast hotspot registry, clickable door and storybook overlay vertical slice. | IN_PROGRESS | Hotspot registry and raycast on tagged meshes; clickable door and portals; storybook hotspot dispatches `open_story`. E2E-02 pass (entrance → living room → open story → change chapter → close). FR-03 coverage pass. Store lets the Info Acara, RSVP and Peta overlays open while a scene loads or is in ERROR (D-027). | Stays IN_PROGRESS: depends on T-004 (ART_PENDING), and the device run under T-006 is pending. Confirm D-027 against `architecture.md` §8.2. Depends T-004. |
| T-006 | Test vertical slice on touch/mobile, document baseline FPS/loading/blockers. | IN_PROGRESS | Headless Chromium, desktop and Pixel 7 emulation, SwiftShader. Not a real device. `pnpm test:e2e` 38 passed / 0 failed / 2 skipped (2026-10-30, run multiple times). Stress `--repeat-each=3` on navigation, mobile and viewer: 59 passed / 4 failed (timeouts only) / 3 skipped. Failures are living-room tests (D-031). Earlier one-off Pixel 7 probe (T-003): WebGL context live, DPR capped 1.75. No device FPS or loading baseline recorded. | User runs the real-phone test on a mid-range Android and an iPhone. Record loading time and FPS against `architecture.md` §12 (≥30 FPS aim, unmeasured). Owner to decide the Playwright worker cap (D-031). Then Gate A. Depends T-005 (IN_PROGRESS). |

## Milestone 1 — Data/auth, reusable engine

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-101 | Configure Supabase local/dev, SQL migrations and seed; create tenant schema and indexes. | BLOCKED | Supabase CLI and Docker absent; no Supabase project or credentials. `pnpm db:migrate` and `pnpm db:seed` are stubs that exit 1. | Install Supabase CLI and Docker, or provide a dev project and credentials. Then add migrations, seed and tenant schema. Depends T-002 (IN_PROGRESS). |
| T-102 | Implement studio login/session, member middleware and SQL RLS policies; write cross-tenant tests. | BLOCKED | Blocked by T-101 (no Supabase project or credentials). | Implement after T-101 runs locally. Depends T-101. |
| T-103 | Implement `WeddingManifestV1Schema` and strict template/action schemas; add fixtures and contract tests. | DONE | `WeddingManifestV1Schema` in `packages/contracts/src/manifest.ts`; `WorldActionSchema` in `packages/contracts/src/world.ts`; fixture `packages/contracts/fixtures/demo-wedding.ts`, now with a 6-item gallery (`.invalid` media hosts per D-016) so all six living-room GLB frames are clickable. 2026-10-30: 16 contract tests pass (`pnpm test`). | None for AC. `specs.md` §17 lists T-004 as its dependency, which is IN_PROGRESS. Owner to confirm. |
| T-104 | Implement `world-engine` scene/nav/asset/quality/camera modules with deterministic cleanup and error handling. | IN_PROGRESS (subset) | Scene, navigation, quality and camera modules in `packages/world-engine`. Living-room GLB loader implemented in `packages/world-engine/src/scenes/GltfScene.tsx` (plain GLTFLoader; geometry and textures freed on unmount, re-uploaded on re-entry). `world-engine` 33 tests pass (2026-10-30, `pnpm test`). A general GLTF asset manager is not evidenced. | Decide whether the living-room loader meets T-104's asset-manager scope. Add the general asset manager and preloading budgets when more scenes use GLBs (T-601). Depends T-005 (IN_PROGRESS). |
| T-105 | Implement public manifest read endpoint and immutable publication storage model. | BLOCKED | Blocked by T-101 (no Supabase project or credentials). No real published source exists; the dev fixture stands in (D-009). | Implement after T-101 and T-103. Depends T-101, T-103. |
| T-106 | Implement private draft data and optimistic revision control. | BLOCKED | Blocked by T-101 and T-102. | Implement after T-101 and T-102. Depends T-101, T-102. |
| T-107 | Implement R2 draft/published storage adapter, upload signing, verification and local development adapter. | BLOCKED | No R2 bucket. Depends T-102 (blocked). | Build the local development adapter first (needs no R2). Wire R2 once a bucket exists. Depends T-102. |
| T-108 | Implement core accessible UI/dialog layout + 2D fallback skeleton. | DONE | Accessible dialog lifecycle in `packages/ui/src/dialogLifecycle.ts`: stale close events ignored (D-026), 5 unit tests pass (2026-10-30). 2D skeleton: `?mode=2d` starts in 2D; "Mode 2D" link works before hydration; "Kembali ke 3D" drops the query (D-030). `[T-108]` ×2 pass (`e2e/fallback.spec.ts`). `[T-108]` store test pass (`packages/world-engine/src/scene-manager/store.test.ts`). `[D-017]` GLB 404 → ERROR panel with "Coba lagi" and "Mode 2D" pass. | None for this skeleton. The complete 2D fallback for all non-booth core actions is T-602. Owner to confirm DONE (see the flags in the report). Depends T-003 (DONE). |

## Milestone 2 — Content vertical slice

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-201 | Finish Entrance name/welcome and responsive status/audio controls. | IN_PROGRESS (view) | FR-01 coverage pass: unknown slug → 404; invalid-manifest panel; "Mode 2D" link. Welcome overlay opens from the welcome sign, not on load (D-028, provisional). Responsive status/audio controls: no evidence recorded. | Owner to confirm D-028. Record evidence for status/audio controls. Real published manifest waits on T-105 (BLOCKED). Depends T-104, T-105. |
| T-202 | Finish Living Room frames/gallery with published media and draft-only authorized preview. | IN_PROGRESS (view) | E2E-03 pass (6 photos, lightbox navigation). FR-02 six photo controls pass. Fixture media on `.invalid` hosts shows the designed fallback tile (D-016). Living-room GLB frames are clickable (`GALLERY_01`–`GALLERY_06`, D-023). | Published media waits on T-107 (BLOCKED). Draft-only preview waits on T-106 (BLOCKED). Depends T-104 (IN_PROGRESS), T-107, T-108 (DONE). |
| T-203 | Finish interactive storybook, chapter CRUD/schema and story editor. | IN_PROGRESS (view) | E2E-02 pass (story overlay: open, change chapter, close). FR-03 coverage pass. View-only storybook overlay. | Chapter CRUD and story editor wait on T-106 (BLOCKED). Depends T-104, T-106, T-108. |
| T-204 | Finish four-scene navigation core: tap-to-move, portal/spawn logic, quick map, history policy. | IN_PROGRESS (view) | FR-04 coverage pass. E2E-04 pass (scene map navigates all four scenes; return to entrance). `[FR-04] 10 transitions do not grow data-gl-geometries` pass. Tap-to-move on floor with colliders; portals and spawn points (D-023). Temporary quick map list. History policy (D-014): no evidence recorded. | Record evidence for the D-014 history policy and the quick map. Depends T-104 (IN_PROGRESS). |
| T-205 | Implement CMS create wedding wizard, metadata editor and gallery upload. | NOT_STARTED | — | Depends T-102, T-106, T-107. |
| T-206 | Implement preview manifest generation and authorized draft preview. | NOT_STARTED | — | Depends T-106, T-202, T-203. |

## Milestone 3 — Event and guest services

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-301 | Implement Garden/Hall scenes, ceremony/reception interactions and fallback content. | IN_PROGRESS (view, ENGINEERING_DONE / ART_PENDING) | `[T-301] garden/hall hotspots open event, booth and guestbook overlays` pass (`e2e/viewer.spec.ts`). FR-05 view: event information in WIB with an https maps link; RSVP invitation-only message. FR-08 partial: garden and hall overlays. Blockout art only. | RSVP and guestbook writes are backend work (T-303 to T-305, NOT_STARTED). Depends T-204 (IN_PROGRESS). |
| T-302 | Implement event editor, timezone correct viewer and Maps link validation. | NOT_STARTED | — | Depends T-205. |
| T-303 | Implement guest creation/invite token hashes/secure token exchange/sessions/revocation. | NOT_STARTED | — | Depends T-101, T-102. |
| T-304 | Implement guest-session-scoped RSVP UI/API, validation, aggregates and tests. | NOT_STARTED | — | Depends T-303, T-302. |
| T-305 | Implement guestbook creation/moderation/public approved list/pagination/tests. | NOT_STARTED | — | Depends T-303. |
| T-306 | Implement publish pipeline with asset promotion, validation, versioning/rollback, and failure recovery. | NOT_STARTED | — | Depends T-105, T-106, T-107, T-205. Decide whether `gltf` templates with ART_PENDING art may publish (D-023). |
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
| T-501 | Formalize scene template catalog/GLB node naming, six decoration slots and allowed variants. | NOT_STARTED | — | Depends T-103 and artist asset deliverables. Owner to decide GLB node naming (D-023). |
| T-502 | Implement palette/lighting/decor selection with draft preview and manifest validation. | NOT_STARTED | — | Depends T-501, T-206. |
| T-503 | Finish CMS RSVP dashboard, guests workflow, guestbook moderation, publish management/rollback UX. | NOT_STARTED | — | Depends T-304, T-305, T-306. |
| T-504 | Add template/asset validation CLI, optimized models/textures and license register. | BLOCKED | `pnpm assets:validate` is a stub. Asset pipeline not implemented. `[T-504]` GLB node-mapping test passes (`packages/world-engine/src/templates/gltf-layout.test.ts`). License register started: `docs/asset-register.md` (2026-10-30). No production art sign-off. | Implement the validator (GLB node names, budgets, variants, licenses) after T-501. Depends T-501. |
| T-505 | End-to-end verification that decor changes remain draft until publish, rollback restores older look. | NOT_STARTED | — | Depends T-502, T-503. |

## Milestone 6 — Hardening & pilot

| Task | Title | Status | Evidence | Next action |
|---|---|---|---|---|
| T-601 | Implement adaptive quality, scene preloading budgets and memory-release regression test. | NOT_STARTED | — | Depends T-204, T-401. |
| T-602 | Complete responsive/accessible 2D fallback for all non-booth core actions. | NOT_STARTED | — | Depends T-302, T-304, T-305. |
| T-603 | Complete RLS/security abuse tests, rate limits, logging redaction, production CSP/CORS. | NOT_STARTED | — | Depends T-307. Baseline CSP is in D-015, amended by D-024 (`connect-src 'self' blob:`). |
| T-604 | Finish Playwright suite E2E-01..12, run real-device matrix and record evidence. | NOT_STARTED | — | Depends T-505, T-602, T-603. |
| T-605 | Complete runbook, backups/restore drill, publishing rollback rehearsal and deployment. | NOT_STARTED | — | Depends T-604. |
| T-606 | Run three distinct wedding pilot configurations; fix critical defects and validate scene asset licenses. | NOT_STARTED | — | Depends T-605 and artist signoff. Clear the `ART_PENDING` entries in `docs/asset-register.md`. |
