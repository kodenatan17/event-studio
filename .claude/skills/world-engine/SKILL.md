---
name: world-engine
description: Map of the 3D viewer — React Three Fiber renderer, scene state machine, WorldAction registry and hotspots, tap-to-move navigation and portals, scene transitions/cancellation, guest avatar, photo booth capture, Blender GLB node conventions and asset validation, quality tiers, performance budgets and 2D fallback. Load for any work in packages/world-engine, scene/overlay wiring, avatars, photo booth, decor variants or 3D assets.
---

# world-engine

Source of truth: `architecture.md` §3.2–3.4, §8, §11, §12 and the manifest in `api-contracts.md` §7. Features: FR-01..FR-04, FR-06..FR-08, FR-10.

## Related skills
Load the Three.js skills that match the work (WebGL + React Three Fiber, no Drei — D-018; skip WebGPU/TSL sections):
| Area | Skills |
|---|---|
| Renderer, camera, loop, resize, disposal | `threejs-fundamentals` |
| Hotspot picking, tap/joystick/keyboard input | `threejs-interaction` |
| Avatar / couple rigs and clips (idle, walk, jump, wave) | `threejs-animation` |
| Skin, velvet, gold, batik, lace looks | `threejs-materials`, `threejs-textures`, `threejs-shaders` |
| Scene lights, lanterns, quality tiers | `threejs-lighting` |
| GLB scenes and props | `threejs-loaders` |
| Bloom / effects (high tier only) | `threejs-postprocessing` |

## Boundary
`packages/world-engine` consumes typed scene definitions from the published manifest and emits typed `WorldAction`s. It never imports wedding entities. `packages/wedding-features` registers handlers and renders the HTML overlays.

## Renderer (§8.1)
- R3F `<Canvas>` client-only (no SSR). One scene-boundary component owns context, renderer settings and resource references.
- Camera: 3/4 elevated follow view, not first-person.
- Adaptive, capped DPR; baked lighting + limited dynamic shadows; instancing; compressed textures.
- Handle `webglcontextlost`, failed loads and unsupported hardware → recoverable 2D mode. Suspense/error boundaries never hide global navigation.

## State machine (§8.2)
`BOOT → LOADING_MANIFEST → LOADING_SCENE → READY ⇄ OVERLAY_OPEN`, `READY → SWITCHING_SCENE → LOADING_SCENE`, errors → `ERROR`, any render-critical error → `FALLBACK_2D`.
Single source of truth: `currentSceneId`, `pendingSceneId`, `transitionStatus`, `activeOverlay`, `avatarPresetId`, `qualityProfile`, `soundEnabled`. Overlay open suspends avatar input.

## Actions (§8.3)
Allowlist only: `navigate`, `open_welcome`, `open_gallery`, `open_story`, `open_event_info`, `open_rsvp`, `open_guestbook`, `open_photo_booth`.
- Manifest `hotspot.action` → validated registry; unknown action fails safely with a developer warning.
- Raycast only tagged interactables and walkable surfaces; resolve overlapping hotspots consistently.
- Every 3D hotspot has a labeled HTML control dispatching the **same** action (§3.4). Nothing task-critical depends on finding a hidden hotspot; the global map reaches every unlocked scene.

## Navigation & transitions (§8.4, FR-04)
- Waypoint/navmesh movement on `FLOOR_WALKABLE` with `COLLIDER_*`; never clip through furniture.
- Switch: lock input → (preload) → transition UI → load target, enter spawn point → release old refs → unlock. No full page reload.
- Request ID / cancellation token per transition; rapid double taps don't create duplicate controllers; stale callbacks never activate an old scene.
- Stable portal IDs + explicit spawn points; quick map works even if a portal route is missing.
- Avatar motion uses clamped frame delta, separate from rendering; handle long tab inactivity.
- Browser back closes the active overlay first; no aggressive history trapping.

## Lifecycle (FR-04, FR-10, §12)
Dispose per-scene geometry/materials/textures not shared elsewhere; remove listeners, animation mixer subscriptions and RAF loops. Switching a decor variant releases old texture/material refs. Target: no monotonic memory growth over 10 transitions.

## Avatar & photo booth (FR-06, FR-07)
- 3–5 presets, `idle` / `walk` / `interact|pose` clip mapping; one animation controller per active avatar; unknown preset → default. Preset persists in `localStorage`.
- Booth: couple models + guest avatar, ≥3 poses, ≥3 frames, optional label → offscreen render/readPixels → 2D canvas composition → local PNG download/share. No webcam, no upload by default; recoverable error on context loss/allocation/CORS failure.

## Assets (§8.5, §11)
- Node names: `SCENE_<NAME>`, `FLOOR_WALKABLE`, `COLLIDER_*`, `SPAWN_ENTRY`, `SPAWN_<PORTAL>`, `HS_STORY|HS_RSVP|HS_GUESTBOOK|HS_PHOTO|HS_GALLERY_*`, `DECOR_<SLOT>_<VARIANT>`, `CAMERA_ENTRY`.
- GLB in meters, consistent up axis, named clips. Meshopt/Draco/KTX2 only with matching runtime decoders verified on mobile.
- `scripts/validate-assets` (`pnpm assets:validate`) checks files, sizes, node names, clips, variants, textures and budgets before a template is active.
- Asset URLs come from the trusted template catalog/CDN only; content-hashed immutable keys.
- Placeholder primitives are prototype-only (`ENGINEERING_DONE / ART_PENDING`). Every shipped model is recorded in `docs/asset-register.md`.

## Budgets & fallback (§12)
- Targets (measure on real devices): 2–5 MB before entrance interactivity, 3–8 MB per scene, ≥30 FPS mid-range Android/iPhone.
- Quality tiers `auto | high | low`; low disables shadows/post-processing, reduces decor, lowers DPR. Respect `prefers-reduced-motion`.
- Audio off until a user gesture.
- 2D fallback minimum: names, story, gallery, ceremony/reception, RSVP, approved guestbook, guestbook posting for invited guests. Booth may show an unsupported notice.
- Instrument scene load time, failed assets, JS errors, context loss and transition errors — never tokens or message content.
