# Phase 2 checklist — character, wardrobe, avatar editor

**How to use this file.** Do **one chunk per session**, top to bottom.
1. Before you start, read `CONTEXT.md` and the parts of `docs/design/controls-avatar-couple.md` that the chunk cites.
2. Finish the chunk and get its gates green.
3. Tick the chunk here (`[x]` plus a one-line result with real test counts).
4. Update the snapshot line in `CONTEXT.md`.
5. Stop.

If a session runs out of budget mid-chunk, leave the box unticked and add a `> WIP:` note under the chunk: what is done, what is next, and whether the tree is green. The next session resumes from that note.

Design sections are cited as §N of `docs/design/controls-avatar-couple.md`.

## Rules for every chunk
- **Skills:** load `spec-first`, `wedding-web-architecture`, `world-engine`, plus the `threejs-*` skills the chunk names. The stack is WebGL + R3F with no Drei; ignore the WebGPU/TSL sections.
- **Don't touch:** `AGENTS.md`, `.codex/`, `.agents/`, `.claude/`, `CLAUDE.md`, `skills-lock.json`, `apps/assets/mp3/` (never commit that mp3), or the spec files. Never stage, commit or push unless the user asks.
- **Dependencies:** no new ones. No zod in client bundles. `world-engine` imports only `@undangan/contracts/world`. `state.input` is mutable and never goes through `set()`. Don't trigger React re-renders every frame.
- **Disposal:** release everything you create without invalidating shared caches.
- **Tests:**
  - Put an ID in every test name (`[FR-07] …`, `E2E-11 …`). Never weaken an assertion.
  - Tests that enter the GLB living room get `test.slow()` (timeout only, D-031). List each one you add under the chunk.
- **Servers:** the user's `next dev` (:3001) and :3000 stay up. Run probes with `next start` on a free port (for example 3300); Playwright uses :3100. Kill anything you start.
- **Gates:** every chunk ends green on `pnpm lint && pnpm typecheck && pnpm test`. Chunks marked **+E2E** also run `pnpm build && pnpm test:e2e`.
- **Reporting:** report to the user in Indonesian. While long steps run, give a short progress update every 2–3 minutes.

---

- [x] **Chunk 0 — tree green again.** Done by Codex, verified 2026-10-30 22:56 WIB.
  - `labels.ts` has `avatar_editor: 'Ubah Avatar'`.
  - `Viewer.tsx` narrows the `avatar_editor` branch.
  - `shapes.ts` finished.
  - Results: lint clean · typecheck 5/5 · unit 116/0.

- [ ] **Chunk A — Phase 1 review fixes (+E2E).** Skills: `threejs-interaction`.
  1. `apps/web/components/viewer/KeyboardHint.tsx`: keep the desktop "E Buka …" button mounted while an overlay is open — hold the last `nearby`, or use `aria-disabled` — so Dialog focus returns to it (§3.4).
  2. Landscape phones (coarse pointer, width > 640, height ~390):
     - use the Interaksi disclosure on short viewports too (a max-height variant in `SceneActions.tsx` and `GlobalNav.tsx`);
     - add an E2E-12 landscape case (Pixel 7 landscape) checking: no overlap, everything ≥ 44 px, canvas ≥ 60% visible.
  3. `packages/world-engine/src/renderer/WorldCanvas.tsx`: give the `setPostFx` effect a cleanup that calls `setPostFx('off')`.
  4. `packages/world-engine/src/input/useKeyboardInput.ts`: clear `input.keys` on Meta keydown/keyup (macOS sticky keys).
  5. `SceneActions.tsx`: no `backdrop-blur` on small screens (`max-sm:`).
  6. Labels: portals keep their own verb ("Masuk ke Ruang Tamu"), and only content hotspots use "Buka …". This applies to `lib/labels.ts`, KeyboardHint and TouchControls. Never "Buka Masuk ke …".

- [ ] **Chunk B — textures + materials (§2).** Skills: `threejs-textures`, `threejs-materials`.
  - `packages/world-engine/src/avatar/textures.ts`:
    - deterministic, tileable CanvasTexture generators (reuse `seeded()`): 512 px on high, 256 px on base;
    - batik `parang|kawung|truntum` in sogan palettes;
    - embroidery `beskap|kebaya`: a colour canvas in sRGB plus a data canvas with G = roughness and B = metalness, NoColorSpace;
    - lace alpha, paes alpha, a 64² contact-shadow texture;
    - a `Map` cache and an injectable `TextureProvider` (Vitest runs in Node with no canvas);
    - GPU-only dispose, plus `clearCharacterCaches()`.
  - `avatar/materials.ts`:
    - cached by `kind:colour|pattern:tier`;
    - kinds: skin (Physical, sheen 0.25), eye, faceDetail, hair, velvet (sheen 1 with embroidery maps), cloth, lace (alphaTest 0.5), gold, leather, melati, paes;
    - the base tier uses MeshStandard with the same maps.
  - Tests:
    - cache identity;
    - dispose frees GPU memory but keeps the canvas;
    - the provider stub works in Node.

- [ ] **Chunk C — body, head, hair (§2 geometry/skinning).** Skills: `threejs-fundamentals`, `threejs-animation`.
  - Build `avatar/parts/{index,body,head,hair}.ts` on `rig.ts` and `shapes.ts`.
  - Look: "Stylized Realistic", not chibi or boxes. About 7 heads tall.
    - Torso and limbs: lathe-based.
    - Hands: palm plus 4 fingers and a thumb.
    - Head: sculpted sphere (jaw, chin, cheekbones, brow, eye sockets, nose, occiput).
    - Face: eyes with sclera, iris, pupil and highlight; lids; brows; lips with a cupid's bow; bevelled ears.
    - Hair: pria `belah-samping|rapi|ikal`; wanita `sanggul-ukel|cepol|tekuk`.
  - Skinning: rigid weighting, with a 2-bone blend near joints.
  - `covers` skips hidden skin; `hides` is applied at render time only (`visibleParts`).
  - Compare against `apps/assets/avatar-customize.png`.
  - Tests: every body and hair item builds; vertex weights sum to 1.

- [ ] **Chunk D — clothing, accessories, buildCharacter (§2–§3).** Skills: `threejs-materials`, `threejs-textures`.
  - `avatar/parts/{clothing,accessories}.ts`, covering every wardrobe item for its bodies:
    - headwear: peci, blangkon solo/yogya, iket, hijab;
    - tops: beskap, batik panjang/pendek, kebaya kutubaru/brokat;
    - bottoms: jarik with wiru, celana;
    - selendang;
    - shoes: selop, loafer, heels;
    - kacamata, tas, anting, bros.
  - The skirt follows `hip_l`/`hip_r`.
  - `avatar/buildCharacter.ts`:
    - `buildCharacter(spec, {tier, textures})` returns `CharacterKit {root, skeleton, triangles, drawCalls, dispose}`;
    - group by material, `mergeGeometries`, one SkinnedMesh per material sharing one Skeleton;
    - `frustumCulled = false` and `noRaycast` on every mesh;
    - keep the builder generic (outfit specs, `guestSelectable`) so Phase 3 can add wedding outfits.
  - Tests:
    - `[FR-07] every wardrobe item has a builder and builds for its bodies`
    - `[FR-07] each character ≤ 15,000 triangles and ≤ 12 draw calls`
    - `[FR-07] kit.dispose releases merged geometries and bone texture`

- [ ] **Chunk E — clips, animator, avatar swap (+E2E).** Skills: `threejs-animation`.
  - `avatar/clips.ts` — procedural QuaternionKeyframeTracks, cached per `body:skirted`:
    - `idle` 2.4 s;
    - `walk` 0.62 s (±26°, or ±16° when skirted; pelvis bob);
    - `jump` 0.55 s, once;
    - `wave` 1.6 s, once;
    - `interact` 0.6 s, once;
    - reserve the names `run` and `pose_01..03`.
  - `avatar/animator.ts`:
    - one mixer;
    - idle and walk weighted by speed; walk `timeScale = clamp(speed / 2.6, 0.6, 1.25)`;
    - one-shots: LoopOnce, fade in 0.12, fade out 0.15 on `finished`;
    - jump fades locomotion out; movement cancels wave;
    - dispose removes the listener, then calls `stopAllAction` and `uncacheRoot`.
  - `avatar/useCharacter.ts`: `useMemo([appearanceKey, tier])` with dispose on cleanup; create the mixer in `useEffect` so StrictMode leaves exactly one.
  - Replace `PlaceholderAnimator` in `scenes/Avatar.tsx` with the real character, keeping the same `{setLocomotion, trigger, update, dispose}` shape. Keep the contact shadow.
  - `WorldCanvas.tsx`: call `clearCharacterCaches()` on unmount.
  - Tests:
    - `[FR-07] clips idle/walk/jump/wave/interact exist and validate()`
    - `[FR-07] one AnimationMixer per character; dispose stops actions and uncaches root`
    - the existing `[FR-04] 10 transitions do not grow data-gl-geometries` must still pass.

- [ ] **Chunk F — Sheet, preview camera, AvatarEditor, persistence (+E2E) (§4).** Skills: `threejs-interaction`, `threejs-fundamentals`.
  - `packages/ui/src/Sheet.tsx`:
    - extract `useModalDialog` from `Dialog.tsx` (D-026 stale-close guard, focus restore);
    - a full-viewport transparent `<dialog>` with a transparent backdrop;
    - mobile: bottom panel, ≤ 55 dvh; sm and up: right panel, 360 px;
    - slide-in animation; respect `motion-reduce`.
  - `renderer/FollowCamera.tsx` preview mode while `activeOverlay.type === 'avatar_editor'`:
    - authored follow side, chest-height target, frames the full figure;
    - `setViewOffset` from `input.preview.inset*`, eased in and cleared on exit;
    - snap on reduced motion.
  - The avatar faces the camera plus `input.preview.yaw`.
  - `apps/web/lib/avatar-preference.ts` + test: mirror `sound-preference.ts`; store catalog ids only under `undangan.avatar.v1`.
  - `apps/web/lib/avatar-labels.ts`: Indonesian labels for every slot, item and variant.
  - `apps/web/components/viewer/AvatarEditor.tsx`:
    - opened from a 44 px "Ubah avatar" button at the top right; hidden in 2D; disabled unless READY;
    - tabs (role=tablist): Tubuh, Kepala, Pakaian, Aksesori; swatches use `aria-pressed`;
    - changes apply live through `setAvatarAppearance`;
    - a rotate surface (role=slider, "Putar avatar", drag or arrow keys) plus "Putar kiri/kanan" buttons;
    - footer: Acak / Batal / Simpan;
    - Escape, Batal and browser back all revert to the snapshot taken at open; D-014 history is unchanged;
    - while open: the world layer is inert, input is suspended, the header fades out.
  - `Viewer.tsx`: read the preference before `api.start()` so the avatar doesn't flash.
  - `WorldStatus.tsx`: add `data-avatar` = `appearanceKey`.
  - Tests:
    - `[§8.2] avatar_editor opens only from READY`
    - `[§3.4] avatar preference stores only catalog ids`

- [ ] **Chunk G — avatar E2E, full verification, screenshots, review (+E2E).**
  - `e2e/avatar.spec.ts` (entrance only):
    - `E2E-11 avatar appearance persists after reload; localStorage holds only undangan.sound/undangan.avatar.v1`
    - `[FR-07] Escape discards changes and restores focus`
    - `[FR-07] browser back closes the avatar editor first`
    - `[FR-07] mobile sheet ≤ 60% height, controls ≥ 44 px`
    - `[FR-08] three scene changes keep data-avatar and READY`
  - Unit tests in `appearance.test.ts`, if any are still missing:
    - `[FR-07] invalid stored appearance falls back per slot`
    - `[FR-07] parse rejects >2 KB / non-v1`
    - `[FR-07] hijab hides hair+earrings; sanggul returns when removed`
    - `[FR-07] switching body resets body-specific slots`
    - `[FR-07] selendang requires a kebaya`
  - Gates: all of them, plus the new and changed E2E with `--repeat-each=2`; report any flake with its error message.
  - Bundle: no zod or fixture strings in `apps/web/.next/static`; report the canvas chunk size before and after.
  - Screenshots (throwaway probe, then delete it) under `/tmp/event-studio-p2/`:
    - `p2-avatar-pria-default.png`
    - `p2-avatar-wanita-kebaya-sanggul.png`
    - `p2-avatar-wanita-hijab.png`
    - `p2-avatar-pria-blangkon-batik.png`
    - `p2-editor-mobile.png`
    - `p2-walk-entrance.png`

    Compare them with `apps/assets/avatar-customize.png` and iterate.
  - Review: a reviewer pass over all of Phase 2, with at most 2 fix rounds.
  - Final report (Indonesian):
    - summary and files changed;
    - real command counts;
    - triangles and draw calls for the 4 sample avatars;
    - screenshot paths;
    - deviations from the design;
    - tests that got `test.slow()`;
    - open items.
  - Set Phase 2 to DONE in `CONTEXT.md`. Leave D-032..D-038 for the documenter after Phase 3.
