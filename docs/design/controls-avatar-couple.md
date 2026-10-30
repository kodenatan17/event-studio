# Architect design — controls, avatar wardrobe, couple, UI polish, bloom (2026-10-30)

Agreed by the user (decisions are not to be reopened): procedural "Stylized Realistic" characters in code (Higgsfield has 0 credits); actions are Jump, Interact-near-hotspot and Wave; the avatar editor is a bottom sheet (mobile) or side panel (desktop) with a live preview in the same scene; bloom runs on the high tier / desktop only.

Spec wording changes are logged as D-032..D-038 by the documenter at the end. The Gate A / T-401 dependency breach was accepted by the user and is recorded in progress.md.

## 1. Input — `packages/world-engine/src/input/`

### Input bus — `bus.ts` `createInputBus()`
- A mutable per-viewer object held in the store as `state.input`. It is NEVER replaced through `set()`, so 60 Hz writes cause no React renders.
- Fields:
  - `keys: Set<code>`
  - `joystick: {x, y}`
  - `actions: ('jump'|'interact'|'wave')[]` — drained each frame
  - `preview: {yaw, insetRight, insetBottom}`
  - `reset()`
- The store calls `input.reset()` in `beginTransition`, `openOverlay` and `enterFallback`.

### Keyboard — `keyboard.ts`
Pure; uses `event.code` so bindings are layout-independent.

| Action | Keys |
|---|---|
| up | KeyW, ArrowUp |
| down | KeyS, ArrowDown |
| left | KeyA, ArrowLeft |
| right | KeyD, ArrowRight |
| jump | Space |
| interact | KeyE, Enter, NumpadEnter |
| wave | KeyQ |

`shouldHandleKeyDown(ev, inputEnabled)` returns false when any of these hold:
- input is not enabled (`selectInputEnabled`);
- a modifier key is held, or `isComposing` is set;
- the target is inside `input, textarea, select, [contenteditable], dialog, [role=dialog]`;
- the key is Space or Enter and the target is inside `button, a[href], summary, [role=button]`, or any focusable element other than `tabindex=-1`;
- the key is an arrow and the target is inside `[role=tablist|slider|listbox|menu|radiogroup]`;
- the key is an action key and `ev.repeat` is set.

Key-up is always processed. `blur` and `visibilitychange` clear `keys`.

### Keyboard hook — `useKeyboardInput.ts`
- Window listeners, mounted in `WorldCanvas`.
- Calls preventDefault only for keys it handled (Space, arrows).

### Joystick — `joystick.ts`
`joystickVector(dxPx, dyPx, radiusPx = 40, deadzone = 0.15)` returns `{x, y, m}`:
- y is up-positive;
- the deadzone is radial and rescaled: `m' = (m − dz) / (1 − dz)`;
- the result is clamped to 1.

### Movement — `movement.ts`
- `keyboardVector` normalises diagonals.
- `combineMovement(kb, joy)` = sum, clamped to |v| ≤ 1.
- `toWorldDirection(v, camForwardXZ)`:
  - f = camera forward projected onto XZ (fallback −z);
  - right = (−f.z, f.x);
  - world = right·x + f·y.
- Speed = `WALK_SPEED` (2.6) × m.
- Any m > 0 calls `setMarker(null)` once.

### Collision movement — `navigation/walk.ts`
Add `moveWithCollisions(pos, dir, speed, delta, floor, colliders, radius)`:
1. Clamp dt to `MAX_FRAME_DELTA`.
2. Sub-step the move so each step is ≤ 0.2 m.
3. For each sub-step try full (dx, dz), then (dx, 0), then (0, dz); if none is free, stop.
4. Finish with `clampToFloor(radius)`.

Spec: §8.4 "never clip".

### Motion — `navigation/motion.ts` `stepMotion(state, input, env, dt)`
Pure function.
- Directional input wins over the tap marker.
- Facing yaw is damped with λ = 14; it snaps on reduced motion.
- Jump:
  - H = 0.45 m, T = 0.55 s, g = 8H/T² ≈ 11.9, v0 = 4H/T ≈ 3.27;
  - h(t) = v0·t − ½g·t²;
  - only from the ground; no double jump;
  - horizontal motion still goes through `moveWithCollisions`, because colliders are 2D footprints and a jump never clears furniture;
  - the camera tracks the ground position, so there is no bob.

### Interaction — `interaction/nearby.ts`
- Types and helpers:
  - `Interactable { tag, action, min: Vec2, max: Vec2 }`
  - `footprintAabb(position, size, rotationY)`
- `nearestInteractable(p, list, INTERACT_RADIUS = 1.8)`:
  - distance from the point to the AABB;
  - ties go to the lower id, the same rule as `pickInteractive` (§8.3).
- The radius is 1.8 m because the akad table AABB edge is 1.7 m from the nearest free point at z = −2.6. A blockout test guards this.
- Sources:
  - PrimitiveScene: `nodes[].placement`.
  - GltfScene: keep the Box3 min/max x/z that `prepareModel` already computes per mapped mesh; triggers use their size.
- Disabled actions are already filtered by `useInteractiveNodes(isActionEnabled)`.

### UI read path
- Store field `nearby: InteractiveTag | null`, set only when the id changes.
- The "Buka" button and `data-nearby` subscribe through selectors.
- The indicator emphasis (scale 1.35) reads `getState()` in `useFrame`.
- No per-frame React renders.

### Interact and wave
- Interact: E or "Buka" pushes `'interact'` onto `input.actions`. The Avatar `useFrame` drains the queue, calls `state.dispatch(nearest.action)` (the same WorldAction, §3.4/§8.3) and triggers the interact clip.
- Wave: cosmetic only.

## 2. Character system — `packages/world-engine/src/avatar/` (three side, canvas chunk)

### Rig — `rig.ts`
- 17 bones with identity rest rotations:
  - `pelvis` → `spine` → `chest` → `neck` → `head`
  - `chest` → `shoulder_l|r` → `elbow` → `wrist`
  - `pelvis` → `hip_l|r` → `knee` → `ankle`
- Proportions ~7 heads: pria 1.70 m (head 0.243), wanita 1.60 m (head 0.229).
- Skeleton inverses are computed in the rest pose. One Skeleton is shared by all SkinnedMeshes of a character, bound with `bind(skeleton, identity)`.

### Geometry — `shapes.ts`, `parts/{body,head,hair,clothing,accessories,wedding}.ts`, registry `parts/index.ts`
- **Torso**: Lathe profile per body (bust/waist/hip), elliptical scale z 0.7.
- **Limbs**: tapered lathe tubes along −Y.
- **Hands**: palm capsule + 4 fingers + thumb.
- **Feet**: sit inside the shoes.
- **Clothing** (offset shells):
  - beskap: lathe + stand collar + asymmetric front flap + gold buttons;
  - kebaya: flared hem + kutubaru panel;
  - jarik: A-line lathe + extruded wiru pleat strip;
  - selendang / ronce: ribbon or tube along a CatmullRom curve.
- Item `covers` flags skip hidden skin segments.
- **Head**: Sphere(40×32) → ellipsoid → sculpt deformers (jaw taper, chin, cheekbones, brow ridge, eye sockets, nose ridge + tip + alae, occiput), then recompute normals.
- **Ears**: bevelled Extrude.
- **Eyes**: 24×16 eyeball with vertex-colour pupil/iris/sclera by angle, upper lid shell, lash crescent, tube brows.
- **Lips**: upper with cupid's bow, fuller lower, vertex-coloured.

### Skinning
- Each part is rigidly weighted to its bone.
- Sleeves and limbs blend 2 bones over the 15% nearest each joint.
- Skirt follow: below the waist, vertices with x < 0 or x > 0 blend into `hip_l` / `hip_r`, up to 0.6 at the hem.

### Materials — `materials.ts`
Cached by `kind:colour|pattern:tier`.

| Material | Setup |
|---|---|
| skin | Physical, sheen 0.25, sheenRoughness 0.6, peach sheen colour, roughness 0.58 |
| eye | vertexColors, roughness 0.15, clearcoat 1 on high |
| faceDetail | vertexColors |
| hair | root-to-tip gradient |
| velvet | Physical, roughness 0.9, sheen 1, sheenRoughness 0.3, embroidery `map` + `roughnessMap` + `metalnessMap` |
| cloth | batik map, roughness 0.82 |
| lace | alphaMap, alphaTest 0.5, DoubleSide |
| gold | metalness 0.85, roughness 0.3, small emissive |
| leather | — |
| melati | registered for glow gain |
| paes | alphaMap, polygonOffset |

The base tier (coarse pointer, low, or software renderer) uses MeshStandard with the same maps.

### Textures — `textures.ts`
- Deterministic generators (reuse `seeded()`), tileable, CanvasTexture 512 on high / 256 on base:
  - batik `parang|kawung|truntum` (sogan palettes);
  - embroidery `beskap|kebaya`: the same vine routine drawn twice — a colour canvas (sRGB) and a data canvas (G = roughness 0.9/0.35, B = metalness 0/1, NoColorSpace);
  - lace alpha;
  - paes alpha;
  - contact-shadow radial, 64².
- Cache: `Map<key, Texture>`.
- Disposal follows the D-023 pattern: `kit.dispose()` frees GPU memory only (`texture.dispose()`) and keeps the CPU canvases. `clearCharacterCaches()` runs on WorldCanvas unmount.
- `TextureProvider` is injectable so Vitest (node, no canvas) can stub it.

### Builder — `buildCharacter.ts`
`buildCharacter(spec, {tier, textures})` returns `CharacterKit {root, skeleton, triangles, drawCalls, dispose()}`:
1. `visibleParts(spec)`.
2. Builders produce part geometries, cached CPU-side per item + body.
3. Group by material.
4. `mergeGeometries` per group.
5. One SkinnedMesh per material.

- All meshes: `frustumCulled = false`, `raycast = noRaycast`.
- Budget: ≤ 15k triangles and ≤ 12 draw calls per character, enforced by a test.

### Clips — `clips.ts`
Procedural QuaternionKeyframeTracks sampled from pose functions, cached per `body:skirted`.

| Clip | Details |
|---|---|
| `idle` | 2.4 s |
| `walk` | 0.62 s cycle; thigh ±26° (±16° when skirted); pelvis bob as a position track including rest y |
| `jump` | 0.55 s, once |
| `wave` | 1.6 s, once; right arm + head |
| `interact` | 0.6 s, once |

Reserved names: `run`, `pose_01..03` (T-403).

### Animator — `animator.ts`
`createAnimator(root, clips)` creates one AnimationMixer.
- idle and walk are both playing, weighted by speed.
- walk `timeScale` = clamp(speed / 2.6, 0.6, 1.25).
- One-shots: `reset().setLoop(LoopOnce).fadeIn(0.12)`; a `finished` listener fades them out over 0.15 s.
- Jump fades locomotion to 0 for its duration. Moving cancels wave.
- `dispose()` removes the listener, calls `stopAllAction()` and `uncacheRoot(root)`.

### Hook — `useCharacter.ts`
- Kit via `useMemo([appearanceKey, tier])`, with cleanup `kit.dispose()`.
- The mixer is created in `useEffect`, so StrictMode leaves exactly one live mixer (FR-07 AC5).
- Returns a ref that `useFrame` reads.

### Phase 1 seam
Avatar uses a tiny `PlaceholderAnimator` (capsule hop, wave wiggle, lean) behind the same `{update, trigger, setLocomotion}` shape. Phase 2 replaces it.

## 3. Wardrobe — pure, three-free, exported from `src/index.ts`

### `avatar/wardrobe.ts`
`WardrobeItem`:
- `id` — kebab-case ascii
- `slot`
- `bodies`
- `variants?: {id, swatch, pattern?}[]` — the first one is the default
- `tags?`
- `hides?: ('hair'|'hairCrown'|'earrings')[]`
- `requires?: {slot:'top', tag:'kebaya'}`
- `covers?`
- `guestSelectable`

Labels live in apps/web (D-010 pattern).

Catalog, from `avatar-customize.png`:

| Group | Slot | Items [variants] |
|---|---|---|
| All | skin | `langsat`, `kuning`, `sawo-terang`, `sawo-matang`, `cokelat` |
| Pria | hair | `belah-samping`, `rapi`, `ikal` |
| Pria | headwear | `peci`, `blangkon-solo`, `blangkon-yogya`, `iket` — all hide `hairCrown` |
| Pria | top | `beskap` [hitam, krem, hijau, marun], `batik-panjang` [navy], `batik-pendek` [navy] |
| Pria | bottom | `jarik` [parang, kawung, truntum], `celana` [hitam] |
| Pria | shoes | `selop` [hitam], `loafer` [cokelat] |
| Wanita | hair | `sanggul-ukel`, `sanggul-cepol`, `sanggul-tekuk` |
| Wanita | headwear | `hijab` [krem, merah-muda, biru, hijau, marun] — hides `hair` and `earrings` |
| Wanita | top | `kebaya-kutubaru` [merah-muda, hijau, biru], `kebaya-brokat` [marun, putih] |
| Wanita | bottom | `jarik` |
| Wanita | selendang | 4 colours; requires a kebaya |
| Wanita | shoes | `heels` [nude, marun, emas, hitam] |
| Wanita | earrings | `anting` [emas] |
| Shared | accessories | `kacamata` [hitam, cokelat], `tas` ×4, `bros` [emas] |

Wedding-only items (`guestSelectable: false`) are listed in §5.

### `avatar/appearance.ts`
- Type:
  ```ts
  AvatarAppearance = {
    v: 1;
    body: 'pria' | 'wanita';
    skin: SkinToneId;
    slots: Partial<Record<Slot, { item; variant? }>>;
  }
  ```
- Required slots: hair, top, bottom, shoes.
- Defaults:
  - pria: belah-samping / beskap-hitam / jarik-parang / selop-hitam / bros
  - wanita: sanggul-ukel / kebaya-kutubaru-hijau / jarik-parang / heels-nude / anting
- `normalizeAppearance`:
  - an item not allowed for the body becomes the body default (optional slots are emptied);
  - an unknown variant becomes the first variant;
  - a `requires` violation empties the slot.
- `hides` is applied only at render time (`visibleParts`), so removing the hijab restores the sanggul.
- `parseAvatarAppearance(unknown)` — manual parsing, no zod in the client:
  1. A raw string longer than 2 KB, `v !== 1`, or a non-object → default.
  2. Otherwise fall back per field and drop unknown keys.
  3. Normalise.
- Also exports `randomAppearance(rng, body)`, `appearanceKey()` (stable sorted string) and `AVATAR_STORAGE_KEY = 'undangan.avatar.v1'`.

### Store
- `avatarPresetId` is replaced by `avatarAppearance` (default pria), with `setAvatarAppearance(a)` (normalises).
- New fields:
  - `nearby`
  - `avatarProbe: FloorPoint|null` — 0.05 m quantised, ≤ 4 Hz
  - `postFx: 'bloom'|'off'`
  - `loadProgress: number|null` — stale requestId ignored
  - `figureNodes: readonly string[]`
  - `input`
- `ActiveOverlay` gains `{type:'avatar_editor'}`. `openOverlay` allows it only from READY (D-027 does not apply).

### Storage
- `apps/web/lib/avatar-preference.ts` mirrors `sound-preference.ts` (try/catch).
- It is read in Viewer's existing effect before `api.start()`, so the first scene builds the saved avatar with no flash.
- It holds only catalog ids — no sensitive data (§3.4).

## 4. Avatar panel — `apps/web/components/viewer/AvatarEditor.tsx`

### Opening
- Header top-right button "Ubah avatar": 44 px, hidden in 2D, disabled unless READY.
- Opens `avatar_editor`, a UI overlay like `quick_map`, not a WorldAction (§8.3).

### Container
- New `packages/ui/src/Sheet.tsx`, sharing a `useModalDialog` hook extracted from `Dialog.tsx` (open lifecycle, D-026 stale-close guard, focus restore).
- Full-viewport transparent native `<dialog>` with a transparent `::backdrop`.
- Mobile: bottom panel ≤ 55 dvh; the remaining area is a rotate surface.
- ≥ sm: right panel, 360 px.
- Reason: Dialog's centred dimmed box would hide the avatar.

### Rotate surface
- `role="slider"`, `aria-label="Putar avatar"`.
- Drag and Arrow keys change `input.preview.yaw`.
- "Putar kiri/kanan" buttons.
- Everything ≥ 44 px.

### Content
- Tabs (role=tablist): "Tubuh", "Kepala", "Pakaian", "Aksesori".
- Swatch and item buttons use `aria-pressed`.
- Changes call `setAvatarAppearance` live, which rebuilds the kit.
- Footer:
  - "Acak" — random within the current body;
  - "Batal";
  - "Simpan" — writes localStorage, then closes.
- Escape, Batal and browser back all revert to the snapshot taken at open.

### Movement and history
- OVERLAY_OPEN suspends input and clears the marker (§3.4).
- The canvas stays rendered behind the transparent dialog; the world layer is `inert`.
- `useOverlayHistory` is unchanged (D-014).
- The Viewer header fades out while the editor is open.

### Camera
- FollowCamera preview mode while `activeOverlay.type === 'avatar_editor'` (FollowCamera gets a `store` prop). No separate rig.
- The camera stays on the authored follow side, which is known to be wall-free.
- Distance: d = 1.2·H / (2·tan(fov/2)·visibleFraction), looking at chest height.
- The avatar faces the camera, plus the user's yaw.
- Panel inset: `setViewOffset(W, H, insetRight·W/2, insetBottom·H/2, W, H)`, eased, cleared on exit. The panel writes `input.preview.inset*` from a ResizeObserver.
- Reduced motion snaps the camera.

## 5. Couple (Phase 3)

### Decor item
- `DecorItem {type:'figure'; nodeName; outfit: 'groom-jawa'|'bride-jawa'; position; rotationY}`, rendered by `scenes/decor/Figure.tsx`, which reuses `useCharacter`.
- These are template decor (like `janur`), so the engine stays free of wedding data.

### Outfits (`FIGURE_OUTFITS` in `wardrobe.ts`)
- **Groom**:
  - `blangkon-pengantin` — gold motif + mondolan + front ornament
  - `beskap-beludru-bordir` — black velvet + gold embroidery maps, white cuffs
  - `jarik-sogan-pengantin` — parang + wiru
  - `stagen` — gold
  - `keris` — back-right, on the pelvis bone
  - `ronce-pria` — 2 strands, chest
  - `selop-bordir`
- **Bride**:
  - `sanggul-pengantin`
  - `siger` — extruded gold arc
  - `cunduk-mentul` ×5
  - `paes` — forehead decal patch cut from the head geometry, offset 0.6 mm
  - `kebaya-beludru-bordir` + lace sleeves (alphaMap)
  - `jarik-ekor` — lathe with the back hem pushed −z, about a 0.5 m train
  - `ronce-panjang` — from the sanggul over the right shoulder to the knee (blends head → chest → pelvis)
  - `anting` — gold

### Placement (wedding-garden)
- On the platform top (y = 0.2), in front of the table, facing +z. The groom is on the viewer's left, as in the reference.
- `COUPLE_GROOM` at (−0.48, 0.2, −3.45), rotY +0.15.
- `COUPLE_BRIDE` at (0.48, 0.2, −3.45), rotY −0.15.
- The train ends at about −3.95, before the table front at −4.3. Front pillars are at ±1.6.
- Both figures are inside the `AKAD_CANOPY` collider, so the guest stops 0.85 m away.

### Animation
- Clips `idle_groom` (hand at ronce, weight shift) and `idle_bride` (clasped hands, head tilt), phase-offset.
- Optional: head turns toward the guest within 3 m (±35°, applied after `mixer.update`).

### Hooks and lifecycle
- Every mesh is `noRaycast`.
- Each Figure reports its node name to the store: `addFigure` on mount, `removeFigure` on cleanup. This drives `data-couple="ready"`.
- Contact shadows are included.
- `kit.dispose()` on unmount.

## 6. UI polish + mobile layout

### Polish
- **Veil**: shown instantly; fades out over 500 ms only after READY. This removes the empty-sky flash.
- **Camera arrival ease**: the camera starts at the desired position + (0, 1.5, 2.5) and eases in with `FOLLOW_RATE`; it snaps on reduced motion.
- **Dialog**: enter animation only — opacity, translate-y-3, scale .98 → 1, 200 ms, plus a backdrop fade.
- **Sheet**: slides in from y-full on mobile, x-full at sm+, 260 ms.
- All animations use `motion-reduce:transition-none`. Exit animations need deferred unmount (OPEN).
- **Nav**: `aria-pressed` and `aria-expanded` items get a filled style.
- **Breadcrumb**: a scene chip under the couple names (§3.3).
- **GLB progress**:
  - `useLoader` onProgress → `setLoadProgress`;
  - the denominator is the catalog field `GltfLayout.sizeBytes` (1,051,008), because gzip makes Content-Length unusable;
  - the veil shows a bar and a %, aria-hidden; the status text stays announced.
- **Contact shadow**: shared `geometries.disc` + one shared radial material at floorY + 0.02, scaled by jump height.
- **Press and hover**: buttons get `active:scale-[.97]`; a hovered 3D hotspot gets indicator scale 1.25.

### Mobile (< 640 px)
- **SceneActions**:
  - stays one DOM instance (no duplicate `data-hotspot-id`) and collapses into an "Interaksi" disclosure;
  - the toggle lives in GlobalNav (`sm:hidden`, `aria-expanded`, `aria-controls`);
  - the panel uses `bottom-full`, max-h 40 dvh;
  - it closes on navigate, toggle, Escape or an outside tap;
  - it stays open while overlays open, so focus returns to the opener (§3.4; the existing focus tests rely on this).
- **GlobalNav**: short visible labels, accessible names unchanged (WCAG 2.5.3) — "Acara" for "Info Acara", "2D" for "Mode 2D". 6 items.
- **TouchControls** (`pointer-coarse:` only):
  - an absolute `bottom-full` row inside viewer-controls, so the 60% canvas measure is unaffected;
  - joystick bottom-left: 112 px base, 48 px knob, `touch-action:none`, `aria-hidden` (WASD, taps and the HTML controls are the equivalents);
  - cluster bottom-right: "Lompat" 64 px, "Buka …" 56 px (disabled when nothing is near), "Sapa" 52 px.

### Desktop
`KeyboardHint` pill (`pointer-fine:`): "W A S D / panah Jalan · Spasi Lompat · E Buka · Q Sapa".

## 7. Bloom — `renderer/Bloom.tsx`

### Setup
- One per canvas, created once (not per scene).
- Pass chain: EffectComposer with its own `WebGLRenderTarget({type: HalfFloatType, samples: 4})` → RenderPass → UnrealBloomPass (strength 0.55, radius 0.4, threshold 1.0) → OutputPass.
- `flat` means NoToneMapping; OutputPass handles sRGB.
- `useFrame(() => composer.render(delta), 1)` — priority > 0 takes over R3F's render.
- In an effect: `composer.setPixelRatio(viewport.dpr); composer.setSize(size.w, size.h)`.
- On unmount: dispose every pass, then `composer.dispose()`.
- Imports use the `three/examples/jsm/...` paths the repo already uses.

### Glow
`renderer/glow.ts` calls `setGlowGain(1.8)` on mount and `(1)` on unmount, for lanternGlow, melati and the indicators. Only HDR accents bloom.

### Gating
`resolveRenderTier` in `capabilities.ts`, together with `usePointerCoarse`:
- `bloom = quality !== 'low' && !coarsePointer && !reducedMotion && (quality === 'high' || !softwareRenderer)`
- `physicalMaterials` = the same rule without the reduced-motion term.
- `textureSize = bloom-capable ? 512 : 256`.
- `isSoftwareRenderer(gl)` checks `WEBGL_debug_renderer_info` against /swiftshader|llvmpipe|software/i, so desktop E2E on SwiftShader runs without bloom.

### `data-gl-geometries`
The passes share three's single FullScreenQuad geometry. Bloom adds +1 geometry once, at canvas mount, before the first settled sample, and the count stays constant across transitions.

### Test hook
`store.postFx` → `data-postfx`.

## STEPS — each phase must end green on `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm test:e2e`

### Phase 1 — controls + polish + bloom
1. `input/{bus,keyboard,joystick,movement}.ts`, `useKeyboardInput.ts`, plus `*.test.ts`.
2. `navigation/walk.ts` `moveWithCollisions`; new `navigation/motion.ts` (+ tests).
3. `interaction/nearby.ts` (+ test).
4. `scene-manager/store.ts`:
   - add `input`, `nearby`, `avatarProbe`, `postFx`, `loadProgress` and their setters;
   - resets in `beginTransition`, `openOverlay`, `enterFallback`;
   - new `store.test.ts` cases.
5. `scenes/Avatar.tsx`:
   - new props `floor` and `interactables`;
   - `stepMotion`, PlaceholderAnimator, nearby, 4 Hz probe, contact shadow, queue drain + dispatch.
6. `scenes/PrimitiveScene.tsx` and `scenes/GltfScene.tsx`:
   - interactables (GLB: keep the Box3 from `prepareModel`);
   - pass `floor`;
   - nearest/hover indicator scale;
   - GLB `onProgress` → `setLoadProgress`.
7. `templates/types.ts` `GltfLayout.sizeBytes?`; `blockout.ts` sets it; `blockout.test.ts` reachability test.
8. `renderer/FollowCamera.tsx` arrival ease.
9. Renderer:
   - `renderer/capabilities.ts`: `usePointerCoarse`, `isSoftwareRenderer`, `resolveRenderTier` (+ test);
   - `renderer/glow.ts`, `renderer/Bloom.tsx`;
   - `scenes/materials.ts`: register glow, contact-shadow material.
10. `renderer/WorldCanvas.tsx`:
    - tier state from onCreated, `<Bloom/>` when enabled, `setPostFx`;
    - `useKeyboardInput`;
    - pass `tier` to SceneHost → scenes.
11. `src/index.ts`: export `joystickVector`, `INTERACT_RADIUS` and the new types.
12. apps/web:
    - new `components/viewer/WorldStatus.tsx` — moves the status div so 4 Hz probes don't re-render Viewer; adds `data-avatar-x/z`, `data-nearby`, `data-postfx`;
    - new `TouchControls.tsx`, `KeyboardHint.tsx`;
    - edit `SceneActions.tsx` (responsive single-instance disclosure), `GlobalNav.tsx` (Interaksi toggle, short labels, active styles), `Viewer.tsx` (wiring, veil, progress, scene chip);
    - `lib/labels.ts`: Lompat, Sapa, Buka, Interaksi, hint copy.
13. `packages/ui/src/Dialog.tsx` (enter animation), `Button.tsx` (press feedback).
14. e2e:
    - new `e2e/helpers.ts`: `expectScene`, `sceneControl()` (opens "Interaksi" when the control is hidden);
    - switch `navigation`, `viewer` and `mobile` specs to the helper;
    - new `e2e/controls.spec.ts`.

### Phase 2 — character system + wardrobe + panel + persistence
15. `avatar/{wardrobe,appearance}.ts` (+ `appearance.test.ts`); export from `index.ts`.
16. `avatar/{rig,shapes,textures,materials,buildCharacter,clips,animator,useCharacter}.ts` and `avatar/parts/{index,body,head,hair,clothing,accessories}.ts`, plus `buildCharacter.test.ts`, `clips.test.ts`, `animator.test.ts`.
17. `store.ts`: `avatarAppearance`, `setAvatarAppearance`, the `avatar_editor` overlay + READY guard (`avatarPresetId` removed).
18. `scenes/Avatar.tsx`: `useCharacter(appearance, tier)`; preview facing.
19. `FollowCamera.tsx`: preview mode + view offset.
20. `WorldCanvas.tsx`: `clearCharacterCaches()` on unmount.
21. `packages/ui/src/{Dialog,Sheet,index}`: extract `useModalDialog`, add `Sheet`.
22. apps/web:
    - new `lib/avatar-preference.ts` (+ test), `lib/avatar-labels.ts`, `components/viewer/AvatarEditor.tsx`;
    - `labels.ts`: `avatar_editor: 'Ubah Avatar'`;
    - `Viewer.tsx`: button; read the preference before start; a narrowing branch for `avatar_editor` before `OverlayHost`;
    - `WorldStatus.tsx`: `data-avatar` = appearanceKey.
23. New `e2e/avatar.spec.ts`.

### Phase 3 — couple
24. `avatar/wardrobe.ts`: wedding items + `FIGURE_OUTFITS`.
25. `avatar/parts/wedding.ts`; `textures.ts` (paes, kebaya embroidery); `clips.ts` (`idle_groom`, `idle_bride`).
26. `templates/types.ts` (`figure` DecorItem); `templates/blockout.ts` (2 garden entries); `scenes/decor/{Figure,Decor}.tsx`.
27. `store.ts`: `figureNodes`, `addFigure`, `removeFigure`.
28. `WorldStatus.tsx`: `data-couple`.
29. Tests.

## Tests (ID-bearing names)

### Phase 1 — unit
- `[FR-04] W/ArrowUp map to camera-forward (screen up)`
- `[FR-04] diagonal keys are normalised`
- `[FR-04] joystick deadzone 0.15 and clamp 1`
- `[FR-04] keys ignored in inputs/dialogs/with modifiers; Space/Enter ignored on buttons`
- `[§8.4] moveWithCollisions slides per axis`
- `[§8.4] 1000 seeded random steps never end inside an expanded collider`
- `[§8.4] large delta clamped and sub-stepped`
- `[FR-04] directional input cancels the marker`
- `[FR-04] jump only when grounded; returns to floor after 0.55 s`
- `[§3.4] nearest within 1.8 m wins, ties → lower id`
- `[§3.4] every blockout interactable reachable from a free floor point`
- `[§12] low/coarse/reduced-motion disable bloom; software renderer unless high`
- `[§8.2] overlay open resets input and nearby`
- `[FR-04] setLoadProgress ignores stale request ids`

### Phase 1 — E2E
- `[FR-04] W/D keys move avatar camera-relative` (data-avatar-x/z)
- `[§8.4] holding W in the garden stops at the akad canopy` (z ≥ −2.61)
- `[§3.4] E near the akad table opens Info Acara (same action as the control)`
- `[§8.2] movement keys ignored while Peta is open`
- `[FR-04] mobile joystick drag moves the avatar; release stops` (page.mouse on the joystick)
- `[§12] mobile renders without post-processing` (data-postfx=off)
- E2E-12 updated: nav count 5 → 6; touch controls ≥ 44 px, inside the viewport, no overlap with nav, header or each other; canvas ≥ 60%.

### Phase 2 — unit
- `[FR-07] invalid stored appearance falls back per slot`
- `[FR-07] parse rejects >2 KB / non-v1`
- `[FR-07] hijab hides hair+earrings; sanggul returns when removed`
- `[FR-07] switching body resets body-specific slots`
- `[FR-07] selendang requires a kebaya`
- `[FR-07] every wardrobe item has a builder and builds for its bodies`
- `[FR-07] each character ≤ 15,000 triangles and ≤ 12 draw calls`
- `[FR-07] one AnimationMixer per character; dispose stops actions and uncaches root`
- `[FR-07] clips idle/walk/jump/wave/interact exist and validate()`
- `[FR-07] kit.dispose releases merged geometries and bone texture`
- `[§8.2] avatar_editor opens only from READY`
- `[§3.4] avatar preference stores only catalog ids`

### Phase 2 — E2E
- `E2E-11 avatar appearance persists after reload; localStorage holds only undangan.sound/undangan.avatar.v1` (entrance only)
- `[FR-07] Escape discards changes and restores focus`
- `[FR-07] browser back closes the avatar editor first`
- `[FR-07] mobile sheet ≤ 60% height, controls ≥ 44 px`
- `[FR-08] three scene changes keep data-avatar and READY`

### Phase 3
- `[§3.3] garden places COUPLE_GROOM/COUPLE_BRIDE on the platform inside the canopy collider`
- `[FR-06] couple figures ≤ 15k tris with clip names idle_groom/idle_bride`
- `[§3.3] figure meshes never raycast`
- E2E `[§3.3] wedding garden shows groom and bride` (data-couple=ready)
- E2E `[FR-04] entrance↔garden ×5 does not grow data-gl-geometries`

### Hooks
- On `world-status`: `data-avatar-x`, `data-avatar-z`, `data-nearby`, `data-postfx`, `data-avatar`, `data-couple`.
- Separately: `data-testid="touch-controls"`.

## RISKS / OPEN
- Characters are derived from reference images whose license is unknown (D-019); they stay ART_PENDING.
- Three skinned characters + Physical materials are unmeasured against the ≥ 30 FPS target (tiering mitigates).
- The garden adds about 25 draw calls; SwiftShader garden tests may need `test.slow()` (D-031).
- Bloom "auto" interpretation: no quality UI exists, so "high" is unreachable today.
- `WEBGL_debug_renderer_info` may be masked (Firefox).
- Dialog exit animations need deferred unmount — not in scope.
- Cultural accuracy of the attire and all labels need owner review (D-029).
- AZERTY: hint letters will be wrong there.
- `state.input` is a mutable non-reactive object — never push it through `set()`.
- An env map for gold/velvet is optional and OFF by default.
- Canvas-chunk growth (+60–90 KB) — check with next-bundle-optimizer after Phase 2.
