# Decisions — Undangan AI Wedding World

> **Updated:** 2026-10-29
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
- `connect-src 'self'`.
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
- Living room = dalem with gebyok.
- Wedding garden = pelataran with akad canopy and photo-booth arch.
- Reception hall = joglo pendopo with pelaminan.

The palette `jawa-sunset` and lighting `warm-sunset` are hard-wired in the blockout for now. Passing the manifest `theme.paletteId` and `lightingId` to the engine is deferred to FR-10 / T-502. The blockout stays prototype-only (D-008).

**Spec impact:** none now. `specs.md` FR-10 and T-502 cover the theme wiring when it is built.
