# Decisions — Undangan AI Wedding World

> **Updated:** 2026-10-30
> **Scope:** records version choices and deviations or clarifications where the spec set is silent or inconsistent. Precedence follows `specs.md` (Documentation map and §0): `specs.md` for product scope, `architecture.md` for system design, `api-contracts.md` for API boundaries. No acceptance criterion is dropped.
> **Spec files are not edited here.** Each entry names the section that should be updated later in `specs.md`, `architecture.md` or `api-contracts.md`. Those files are the user's work in progress.

---

## D-001 — Package versions

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §2 (version policy) requires current, mutually compatible stable releases, an exact lockfile, and no canary or mixed majors. The spec pins no versions.

**Decision:**
- pnpm 10.34.9; Node >= 22.23.0
- next 16.4.3; react / react-dom 19.2.9
- three 0.186.1 (@types/three 0.186.0); @react-three/fiber 9.8.2
- typescript 6.0.3; eslint 9.39.5; eslint-config-next 16.4.3; typescript-eslint 8.72.1
- tailwindcss and @tailwindcss/postcss 4.3.3
- vitest 4.1.12; @playwright/test 1.64.1; turbo 2.11.10; prettier 3.9.10
- @types/react 19.2.18; @types/react-dom 19.2.7

Rationale:
- ESLint is capped at 9 by the plugins that eslint-config-next uses.
- TypeScript is capped below 6.1 by typescript-eslint.

Added in phase 2 (installed):
- zod ^4.6.7 (`packages/contracts/package.json`)
- zustand ^5.0.16 (`packages/world-engine/package.json`)
- eslint-plugin-react-hooks ^7.1.1 (root `package.json`; same major as eslint-config-next)

Exact versions are recorded in `pnpm-lock.yaml`.

**Spec impact:** none. This entry is the version record that `architecture.md` §2 requires.

---

## D-002 — Additional node names

**Status:** Accepted 2026-10-29

**Context:** `api-contracts.md` §7 uses `HS_WELCOME` on the entrance hotspot. `architecture.md` §8.5 does not list it. `architecture.md` §3.3 requires a ceremony information hotspot, and §8.3 defines `open_event_info`, but §8.5 has no node name for either. Portals need a node name as well.

**Decision:** add these node name families:
- `HS_WELCOME` — welcome sign on the entrance.
- `HS_EVENT_*` — event / ceremony information hotspot; action `open_event_info`.
- `PORTAL_*` — portal trigger nodes (see D-003 for the naming rule).

**Spec impact:** `architecture.md` §8.5 — add `HS_WELCOME`, `HS_EVENT_*` and `PORTAL_*` to the Blender node list.

---

## D-003 — Node naming derived from IDs

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §8.5 uses placeholders `SPAWN_<PORTAL>` but does not define how a manifest ID maps to a node name. `api-contracts.md` §7 uses kebab-case IDs such as `from-living`.

**Decision:**
- Spawn node: `SPAWN_<UPPER_SNAKE(spawnPointId)>`, e.g. `from-living` → `SPAWN_FROM_LIVING`.
- Portal node: `PORTAL_<UPPER_SNAKE(portalId)>`.
- If the spawn node is missing, fall back to `SPAWN_ENTRY`.

**Spec impact:** `architecture.md` §8.5 — define the mapping rule and the fallback. `api-contracts.md` §7.1 already requires node names to be validated before a template is active.

---

## D-004 — Scene ID is canonical

**Status:** Accepted 2026-10-29

**Context:** `api-contracts.md` §7 uses scene IDs such as `living-room` and `reception-hall`, and asset filenames such as `living.glb`.

**Decision:** the scene ID is the canonical key for scenes, portal targets and spawn lookups. Asset filenames are only locators inside `assetUrl`. They are never identifiers.

**Spec impact:** `api-contracts.md` §7 — state explicitly that the scene ID, not the filename, is the key.

---

## D-005 — Camera preset mapping

**Status:** Accepted 2026-10-29

**Context:** `api-contracts.md` §7 uses `"cameraPreset": "entry"`. `architecture.md` §8.5 lists `CAMERA_ENTRY` as a node name, but no rule links the two.

**Decision:** `cameraPreset: "entry"` maps to node `CAMERA_ENTRY`.

**Spec impact:** `architecture.md` §8.5 — add the preset-to-node mapping rule.

---

## D-006 — Story chapter `date` is optional

**Status:** Accepted 2026-10-29

**Context:** `specs.md` FR-03 lists an optional date per story chapter. The story example in `api-contracts.md` §7 omits `date`. The two files disagree.

**Decision:** a story chapter has an optional `date`. FR-03 wins because it is the product-scope source. The example omission does not make `date` forbidden.

**Spec impact:** `api-contracts.md` §7 — add the optional `date` field to the story chapter schema and example.

---

## D-007 — Hotspot behavior per action

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §3.4 requires each action's hotspot behavior to be documented. The choice is between walking the avatar into range first and executing immediately.

**Decision:** in the MVP, every hotspot action executes immediately. Walk-to-range is deferred to T-402.

**Spec impact:** `architecture.md` §3.4 — record the per-action choice. Owner to confirm: T-402 in `specs.md` §17 is defined as navmesh/waypoints and camera follow. T-204 (tap-to-move) is the other candidate for walk-to-range. The owner should be confirmed when T-204 or T-402 is scheduled.

---

## D-008 — Asset URLs stay https-only; blockout template is code-side

**Status:** Accepted 2026-10-29

**Context:** `api-contracts.md` §7.1 says scene asset URLs come from a trusted template catalog and an approved CDN. `architecture.md` §14 restricts external URLs to `https:`. `architecture.md` §11.2 calls for procedural primitives in Milestone 0.

**Decision:**
- Asset URLs (`assetUrl`, `navmeshUrl`) stay https-only.
- The procedural `blockout` template lives in a trusted code-side template catalog in `packages/world-engine`. It never fetches `assetUrl` or `navmeshUrl`.
- The publish pipeline (T-306, T-501) must reject `blockout` for live weddings.

**Spec impact:** `api-contracts.md` §7.1 — document `blockout` as a prototype-only template ID. `architecture.md` §11.2 — link the rule to the publish validation.

---

## D-009 — ManifestSource adapter and dev fixture

**Status:** Accepted 2026-10-29

**Context:** the real published source is T-105, which is BLOCKED (no Supabase project). The MVP still needs a working viewer route. `specs.md` §0 (item 4) requires a labeled adapter for missing services.

**Decision:**
- The `ManifestSource` adapter lives in `apps/web/lib/manifest-source.ts`. `apps/web/lib/dev-fixture.ts` is the fixture source behind it.
- The dev fixture serves only slug `demo-wedding`, and only when `NODE_ENV !== 'production'` or the server-only environment variable `DEV_FIXTURE_MANIFESTS=1` is set. Otherwise the route calls `notFound()`.
- The viewer shows a visible banner "Data contoh (fixture pengembangan)" and sends `noindex`.
- The real published source is T-105 (BLOCKED).
- `DEV_FIXTURE_MANIFESTS` must never be set in production.

**Spec impact:** `architecture.md` §15.1 — add `DEV_FIXTURE_MANIFESTS` as a server-only variable with the production prohibition. Variable name only; no value is recorded here.

---

## D-010 — Hotspot and portal control labels

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §3.4 requires a labeled HTML control for every 3D hotspot. `api-contracts.md` §7 hotspot objects carry `id`, `nodeName`, `action` and `payload`, with no label field. The spec set does not say where label text lives.

**Decision:** HTML control labels for hotspots and portals come from `apps/web/lib/labels.ts`, in Indonesian. They do not come from the manifest. They live in `apps/web/lib/labels.ts`.

**Spec impact:** none required. `api-contracts.md` §7 gains no label field. Recording the location here is sufficient.

---

## D-011 — Event `kind` limited to ceremony and reception

**Status:** Accepted 2026-10-29

**Context:** `specs.md` FR-05 requires at least a ceremony and a reception. `api-contracts.md` §7 uses `"kind": "ceremony"` in its example. The allowed set is not enumerated.

**Decision:** for V1, event `kind` is limited to `ceremony | reception`.

**Spec impact:** `api-contracts.md` §7 — enumerate the allowed `kind` values.

---

## D-012 — Strict manifest schemas

**Status:** Accepted 2026-10-29

**Context:** `api-contracts.md` §7.1 requires a `schemaVersion` and a compatibility policy, and says the viewer shows a recoverable error for unsupported future versions. The policy itself is not written.

**Decision:** manifest schemas are strict, so unknown keys are rejected. Future fields follow the version and compatibility policy in `api-contracts.md` §7.1. That policy is to be decided at T-105.

**Spec impact:** `api-contracts.md` §7.1 — the compatibility policy is still open and must be written at T-105.

---

## D-013 — `transitionStatus` is derived

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §8.2 lists `transitionStatus` among the state the viewer must keep, next to `currentSceneId` and `pendingSceneId`.

**Decision:** `transitionStatus` is derived from the single store `status`. It is not stored separately, so the two cannot drift apart.

**Spec impact:** `architecture.md` §8.2 — mark `transitionStatus` as a derived value.

---

## D-014 — Browser history strategy

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §3.4 says mobile back closes an active overlay first, with no aggressive history trapping. FR-04 requires back and forward to work consistently with overlay state.

**Decision:**
- Opening an overlay pushes a history entry with the same URL.
- Back closes the overlay.
- Scene switches never push history.

**Spec impact:** `architecture.md` §3.4 — the rule is stated there; this entry is the concrete strategy that implements it.

---

## D-015 — Baseline CSP and headers until T-603

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §14 requires CSP and a referrer policy, but gives no directive values. `api-contracts.md` §5.3 and `architecture.md` §3.1 require `Referrer-Policy: no-referrer` on `/i/[slug]`.

**Decision:** baseline headers until T-603:
- `script-src 'self' 'unsafe-inline'`, plus `'unsafe-eval'` in development only.
- `connect-src 'self' blob:` (amended by D-024).
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

Nonce-based CSP and HSTS arrive with T-603. `/i/[slug]` sends `no-referrer` (T-303).

**Spec impact:** `architecture.md` §14 — no directive values are specified. This baseline applies until T-603 tightens it.

---

## D-016 — Fixture media on reserved `.invalid` hosts

**Status:** Accepted 2026-10-29

**Context:** FR-02 requires a designed fallback when a gallery image is missing or removed. Until T-107 provides real media, the fixture needs a way to exercise that path.

**Decision:** fixture media URLs use reserved `.invalid` hosts. They never resolve, so the gallery shows the designed fallback tile. Used until T-107.

**Spec impact:** none. This is test-data behavior only. The demo wedding fixture lives in `packages/contracts/fixtures/demo-wedding.ts`.

---

## D-017 — Failure states

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §8.2 defines `ERROR` and `FALLBACK_2D`, but does not say which failure goes to which state.

**Decision:**
- Asset or scene load failure → `ERROR` state, with retry and a 2D option.
- Render-critical failure or WebGL context loss → `FALLBACK_2D`.

**Spec impact:** `architecture.md` §8.2 — classify failures by state.

---

## D-018 — Deviation: Drei not installed in the MVP

**Status:** Accepted 2026-10-29 (deviation from a locked decision)

**Context:** `architecture.md` §2 locks Drei as part of the 3D stack. Nothing in the MVP uses a Drei helper. Drei's `<Text>` would fetch an external font.

**Decision:** Drei is not installed in the MVP. Couple names render as DOM `<h1>`. Revisit when a Drei helper is actually needed.

**Spec impact:** `architecture.md` §2 — record Drei as deferred for the MVP. The lock is not changed by this entry.

---

## D-019 — 3D art in Milestone 0

**Status:** Accepted 2026-10-29

**Context:** `architecture.md` §11.2 requires procedural primitive blockouts during Milestone 0, with art-dependent tasks marked `ENGINEERING_DONE / ART_PENDING`. The Higgsfield MCP is connected but has 0 credits. `architecture.md` §8.5 requires origin and license for every shipped model in `docs/asset-register.md`, which does not exist yet.

**Decision:** Milestone 0 uses procedural primitive blockouts. No generated art is used. Any future generated asset needs an origin and license entry in `docs/asset-register.md` (planned, not created yet). It stays `ART_PENDING` until its license is confirmed for production.

**Spec impact:** none to `architecture.md` §11.2. License verification for production stays with T-606 (`specs.md` §17).

**Update 2026-10-29:**
- User-supplied reference images live in `apps/assets/`: `pelataran-adat-jawa.png`, `pengantin-adat-jawa.png`, `avatar-customize.png`. They are concept references, not shipped assets.
- Their origin and license are not recorded yet. Ask the user before any of them, or a model derived from them, ships.
- Planned once Higgsfield credits exist: couple models (multi-view image→3D with rigging, idle/walk) from `pengantin-adat-jawa.png`; 5 avatar presets from `avatar-customize.png`; props from `pelataran-adat-jawa.png`. All stay `ART_PENDING` with an entry in `docs/asset-register.md` (not created yet).
- `architecture.md` §4.2 places source/reference art under `assets/source/`. Moving `apps/assets/` there is a user decision and has not been done.
- Update 2026-10-30: the joglo pack moved to `assets/source/joglo-interior/` (D-025). `apps/assets/` is still unmoved. The living-room model amends this entry's "primitive blockout" scope (D-023).

---

## D-020 — Guest avatar: presets first, modular later

**Status:** Accepted 2026-10-29 (user decision)

**Context:** the user supplied `apps/assets/avatar-customize.png`, a reference for modular customization: skin tone, hair, blangkon/hijab headwear, beskap/batik/kebaya outfits, and accessories (bags, shoes, glasses). `specs.md` FR-07 requires 3–5 presets.

**Decision:**
- V1 keeps the FR-07 presets: 5 presets derived from the reference.
- Modular, part-based customization (shared skeleton plus swappable part GLBs) is a scope change for a later iteration.

**Spec impact:** none now. `specs.md` FR-07 must be updated if modular customization is adopted later.

---

## D-021 — Couple invitations show one avatar

**Status:** Accepted 2026-10-29 (user decision)

**Context:** FR-07 defines a single avatar in the local world. A couple's invitation could also imply a second, companion avatar.

**Decision:** an invitation for a couple still uses one guest avatar, per FR-07. A second companion avatar that follows the first is a future scope change. It would need party data on the invitation.

**Spec impact:** none now. A companion avatar would change `specs.md` FR-07 and the invitation data in `api-contracts.md` §5.3.

---

## D-022 — Javanese-themed blockout

**Status:** Accepted 2026-10-29 (user decision)

**Context:** `architecture.md` §11.2 requires procedural primitive blockouts (D-019). The user supplied `apps/assets/pelataran-adat-jawa.png` as the visual reference.

**Decision:** the primitive `blockout` template is styled after the reference: gapura with janur kuning, mandala pavement, lotus ponds, plumeria, joglo pendopo, warm sunset.
- Entrance = gapura.
- Living room = dalem with gebyok. (Amended 2026-10-30: the living-room scene now renders a GLB, see D-023. The primitive is kept for the other scenes.)
- Wedding garden = pelataran with akad canopy and photo-booth arch.
- Reception hall = joglo pendopo with pelaminan.

The palette `jawa-sunset` and lighting `warm-sunset` are hard-wired in the blockout for now. Passing the manifest `theme.paletteId` and `lightingId` to the engine is deferred to FR-10 / T-502. The blockout stays prototype-only (D-008).

**Spec impact:** none now. `specs.md` FR-10 and T-502 cover the theme wiring when it is built.

---

## D-023 — Living room renders a GLB from the joglo pack

**Status:** Accepted 2026-10-30 (user request). Art stays `ENGINEERING_DONE / ART_PENDING` until art sign-off (D-025).

**Context:** T-004 needs a placeholder Living Room. D-019 and D-022 limit Milestone 0 to procedural primitive blockouts. `architecture.md` §8.5 (line 361) expects Blender-authored GLBs with named nodes. The user supplied their own procedural asset pack (D-025) and asked for its living-room model to be used.

**Decision:**
- Served file: `apps/web/public/templates/joglo/1.0.0/living-room.glb`, a copy of `assets/source/joglo-interior/models/joglo_living_room_mobile_optimized.glb`. glTF 2.0, no extensions, 1,051,008 B raw / 472,628 B gzip, 35 nodes, 10,253 triangles, 5 embedded PNG textures (teak grain, dark and light teak, stone tiles, batik kawung), PBR materials. Y-up, meters, front +Z.
- Budget: within the per-scene aim in `architecture.md` §12 (3–8 MB, line 408).
- URL: comes from the trusted code-side catalog `packages/world-engine/src/templates/blockout.ts` (`kind: 'gltf'` layout). The manifest `assetUrl` is still never fetched. D-008 governs manifest URLs. This same-origin catalog path is not a manifest URL.
- Loader: plain three `GLTFLoader` in `packages/world-engine/src/scenes/GltfScene.tsx`. No Draco, Meshopt or KTX2 decoders. No Drei (D-018). A load failure resolves to `LOAD_FAILED`, then `sceneFailed(reqId, 'ASSET_LOAD_FAILED')` → ERROR panel (D-017).
- Scope: only `living-room` uses the GLB. Entrance, garden and hall remain the Javanese primitive blockout (D-022).
- Node mapping (manifest ID → GLB node):
  - `HS_STORY` → `STORY_BOOK__HS_STORY_BOOK`
  - `HS_GALLERY_0n` → `GALLERY_0n__HS_GALLERY_01` (n = 1..6)
  - `PORTAL_GARDEN_DOOR` → `HS_PORTAL_WEDDING_GARDEN`
  - `PORTAL_HALL_DOOR` → `HS_PORTAL_RECEPTION_HALL`
  - Back to entrance: an engine-defined invisible trigger strip along the open +Z edge. It is not a GLB node.
- Colliders: scene-config obstacles, the front chair, wayang, gamelan, gebyok, 4 saka guru umpak (0.56 m), 8 perimeter post bases (0.38 m) and 4 vases.
- Spawns (floor coordinates, meters): `SPAWN_ENTRY` / `FROM_ENTRANCE` (0, 4.05), `FROM_GARDEN` (−3.9, −4.0), `FROM_HALL` (3.9, −4.0).
- Disposal: the parsed GLTF stays in the loader cache. Geometry and texture GPU memory are freed on unmount and re-uploaded on re-entry. `data-gl-geometries` returns to baseline.
- `PHOTO_DISPLAY_MESH` keeps a placeholder material. CMS photo textures belong to T-202 and T-107.
- Caching: served with `Cache-Control: max-age=0` (revalidate), because the path is versioned but not content-hashed. Content-hashed immutable caching is deferred to T-504 (`architecture.md` §11.3).

**Discrepancies logged (precedence applied):**
- `architecture.md` §8.5 requires Blender-authored models. This GLB is generated by `assets/source/joglo-interior/build_joglo_interior.py` (Python). Whether Blender was used is not recorded. Precedence: the user request governs for the MVP, and the model stays `ART_PENDING`.
- D-019 and D-022 limit Milestone 0 to primitive blockouts. This entry is the exception for the living-room scene only.
- The GLB node names do not follow D-003 (`PORTAL_<ID>`) or D-002 (`HS_EVENT_*`). The catalog mapping above bridges them.

**Spec impact:**
- `architecture.md` §8.5 — owner to confirm the Blender-authored rule, and whether the GLB node naming is adopted.
- `api-contracts.md` §7.1 — document the `gltf` catalog kind and the same-origin path rule.
- OPEN: D-008 rejects `blockout` for live weddings. Whether a `gltf` template with `ART_PENDING` art may publish for live weddings is not decided. Decide at T-306 / T-501 (`specs.md` §17).

---

## D-024 — CSP `connect-src` allows `blob:`

**Status:** Accepted 2026-10-30. Amends D-015.

**Context:** three's `GLTFLoader` loads textures embedded in a GLB through `ImageBitmapLoader`, which fetches them via same-document `blob:` URLs (comment in `apps/web/next.config.ts`, line 23). The `connect-src 'self'` baseline of D-015 does not cover them.

**Decision:** `connect-src 'self' blob:`. `script-src` is unchanged. The reviewer judged this acceptable, because `blob:` URLs are origin-bound and do not open network egress.

**Spec impact:**
- `architecture.md` §14 — record `connect-src 'self' blob:` and its reason.
- When the GLB moves to a CDN (`NEXT_PUBLIC_ASSET_CDN_URL`, `architecture.md` §15), `connect-src` must also add the CDN origin. T-603 keeps `blob:`.

---

## D-025 — Joglo asset pack: location and ownership

**Status:** Accepted 2026-10-30 (user decision). Amends D-019.

**Context:** the user's procedural asset pack was at the repo root as `joglo_interior/`. `architecture.md` §4.2 places source art under `assets/source/`. D-019 left the move open. The pack's README states that all geometry and procedural textures were generated originally, with no third-party stock models or textures.

**Decision:**
- Moved, with user approval, to `assets/source/joglo-interior/`. It holds the build and optimize scripts, `scene-config.json`, `README.md`, `docs/r3f-integration.md`, `textures/`, `previews/`, `models/`, `viewer/index.html`, `requirements.txt` and `validation-report.json`.
- Ownership and license: the user states the pack is owned by the user and licensed for production use. The pack has no LICENSE file, so the statement is recorded in `docs/asset-register.md` as the user's statement.
- Status: stays `ENGINEERING_DONE / ART_PENDING` until art sign-off. The README says the pack is not equivalent to professional hand-modeled realism.
- `apps/assets/` is not moved. The D-019 open item for it stands.

**Spec impact:** `architecture.md` §4.2 layout is followed. `docs/asset-register.md` is created. The register entries satisfy `architecture.md` §8.5 (line 364).

---

## D-026 — Dialog ignores stale close events

**Status:** Accepted 2026-10-30. Dev-only bug, fixed.

**Context:** in development, React StrictMode runs effects twice, so a dialog could close right after it opened.

**Decision:** `packages/ui/src/dialogLifecycle.ts` ignores stale `close` events. Covered by 5 unit tests in `packages/ui/src/dialogLifecycle.test.ts`.

**Spec impact:** none. Part of the accessible dialog layout of T-108.

---

## D-027 — Content overlays open while a scene loads or fails

**Status:** Accepted 2026-10-30.

**Context:** `architecture.md` §8.2 defines `ERROR` but does not say which overlays stay available in it. `specs.md` G-01 requires guests to reach critical event information without being trapped in game mechanics. D-017 sends asset failures to ERROR.

**Decision:** the Info Acara, RSVP and Peta overlays can open while a scene is loading or switching, and while in ERROR.

**Spec impact:** `architecture.md` §8.2 — add overlay availability for the loading and ERROR states.

---

## D-028 — Welcome overlay opens on demand, not on load

**Status:** Provisional 2026-10-30. Owner to confirm.

**Context:** `specs.md` FR-01 implementation lists "welcome UI, start prompt" (line 98) without saying whether it opens by itself. An auto-open at load would push an OVERLAY_OPEN history entry at load (D-014).

**Decision:** the welcome overlay opens from the welcome sign or its control, not on load.

**Spec impact:** `specs.md` FR-01 — owner to confirm the reading. T-201 (Entrance name/welcome) stays IN_PROGRESS until it is confirmed.

---

## D-029 — Unsourced Indonesian copy

**Status:** Open. Owner review, 2026-10-30.

**Context:** `CLAUDE.md` requires product copy in Indonesian. The spec set gives no wording for the strings below, so they were written during the build. They are not product rules.

**Decision:** keep these strings for review:
- RSVP and guestbook shell: "Khusus tamu undangan" and the explanation of the personal invitation link.
- Photo booth: "Segera hadir" and the note that it never uses the camera.
- Welcome text.
- Event kind labels: "Upacara" (ceremony) and "Resepsi" (reception).

**Spec impact:** none. Owner to approve or replace each string.

---

## D-030 — 2D view uses `?mode=2d`

**Status:** Accepted 2026-10-30.

**Context:** `architecture.md` §3 (line 74) says `/w/[slug]` falls back to 2D on unsupported browsers, but defines no manual switch. FR-01 requires an accessible 2D link that works before hydration.

**Decision:**
- "Mode 2D" is a real link to `?mode=2d` (`apps/web/components/viewer/GlobalNav.tsx`). It works before hydration.
- The page reads `?mode=2d` and starts in 2D (`apps/web/app/(public)/w/[slug]/page.tsx`).
- "Kembali ke 3D" removes the query, so a reload stays in 3D (`apps/web/components/viewer/Viewer.tsx`).

Tests: `e2e/fallback.spec.ts`, `[T-108]` ×2 and `[D-017]` GLB 404 → ERROR panel.

**Spec impact:** `architecture.md` §3 — record the `mode` query parameter.

---

## D-031 — E2E timeouts for the GLB living room

**Status:** Accepted 2026-10-30 for `test.slow()` (timeout only). Worker cap: proposed, owner decision.

**Context:** the GLB living room renders at about 150 ms per frame on headless SwiftShader. That is a test-environment number, not device FPS. `architecture.md` §12 (line 409) aims for ≥30 FPS on mid-range devices. That is unmeasured.

**Decision:** `test.slow()` is applied to three tests. Their assertions are unchanged:
- `e2e/navigation.spec.ts`, `E2E-04 scene map navigates all four scenes…`
- `e2e/navigation.spec.ts`, `[FR-04] 10 transitions do not grow data-gl-geometries`
- `e2e/viewer.spec.ts`, `[T-301] garden/hall hotspots open…`

**Known limitation:** under `--repeat-each=3` with 4 workers, other living-room tests (`[FR-04] HTML controls…`, `E2E-02`) still hit the 30 s timeout intermittently. The normal full suite is consistently green.

**Proposed, not applied:** cap Playwright workers in CI at 2, or mark all living-room tests slow. Owner decision.

**Spec impact:** none. `specs.md` §13.3 assertions are unchanged. Device FPS is tracked under T-006 in `docs/progress.md`.
