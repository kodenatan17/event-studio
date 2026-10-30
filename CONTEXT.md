# CONTEXT.md — handoff snapshot for Codex

> **Snapshot:** 2026-10-30, 22:58 WIB. After the Claude coder stopped, Codex did Chunk 0: typecheck is green again (lint clean · typecheck 5/5 · unit 116/0).
> **Next step:** follow `docs/handoff/phase2-checklist.md`. Do one unticked chunk per session, tick it, and update this line. Branch `main`, last commit `c5c5060`. Much of the work below is **uncommitted**, so check `git status` and `git diff` before trusting this file.
> **Purpose:** continue the work started in Claude Code. `AGENTS.md` and `.codex/` say *how* to work. This file says *where the work stands*.

## Read order
1. `AGENTS.md` — Codex rules, invariants, skills, verification.
2. This file.
3. The spec set at the repo root: `specs.md` (product/AC/tasks), `architecture.md` (system), `api-contracts.md` (API/manifest).
4. `docs/decisions.md` (D-001..D-031) and `docs/progress.md` (task status and evidence).
5. The design for the active workstream: `docs/design/controls-avatar-couple.md`. The user agreed to it, so implement it rather than reopen it.

`CLAUDE.md` still opens with an outdated "greenfield / start at T-001" status; as `AGENTS.md` says, ignore that part. Subagent sessions sometimes received a stale cached `CLAUDE.md` describing a different project ("Patricia TV", Flutter/Tizen). If any instructions mention that, they are wrong for this repo.

## What exists (committed)
The MVP public viewer `/w/demo-wedding` runs on a dev fixture ("Raka & Sekar", fake data) behind `DEV_FIXTURE_MANIFESTS` / non-production (D-009). There is no backend yet: T-101, T-102, T-105, T-106, T-107 and T-504 are BLOCKED (no Supabase CLI, Docker or R2).

| Area | State |
|---|---|
| Workspace | pnpm 10.34.9 + Turborepo; Next 16.4.3, React 19.2.9, three 0.186.1, R3F 9.8.2, Tailwind 4, zod 4 (server/contracts only), zustand 5, Vitest 4, Playwright 1.64 (D-001) |
| Scenes | 4 scenes. `entrance`, `wedding-garden`, `reception-hall` are a Javanese procedural blockout (D-022). `living-room` is the user-owned GLB `apps/web/public/templates/joglo/1.0.0/living-room.glb`, sourced from `assets/source/joglo-interior/` (D-023, D-025) |
| Engine | `packages/world-engine`: store with request-ID cancellation, hotspot registry, tap-to-move with colliders, follow camera, 2D fallback triggers |
| UI | `packages/ui` (Dialog with StrictMode-safe lifecycle, Button). `packages/wedding-features`: welcome, story, gallery (6 photos), event info, RSVP/guestbook/photo-booth shells. GlobalNav, `?mode=2d`, history: overlays push and back closes them (D-014) |
| Docs | `docs/decisions.md`, `docs/progress.md`, `docs/asset-register.md` |

## Active workstream — controls, avatar wardrobe, couple, UI polish
The user asked for four things on 2026-10-30:
1. Polish the UI so it feels smoother, and wire the Three.js skills into the agent config.
2. Navigation without clicking: an analog joystick plus action buttons on mobile, and WASD on desktop. Actions: **jump**, **interact near a hotspot**, **wave**.
3. Avatar customization using the wardrobe in `apps/assets/avatar-customize.png`.
4. Bride and groom in the pelataran (`wedding-garden`), modeled on `apps/assets/pengantin-adat-jawa.png`.

**Decisions the user made — do not reopen:**
- Characters are procedural in code, in a **"Stylized Realistic"** style: about 7 heads tall, sculpted smooth shapes, detailed faces, PBR skin, velvet sheen, generated batik and gold-embroidery textures. Not chibi, not boxes. Reason: Higgsfield has 0 credits.
- The avatar editor is a bottom sheet on mobile and a side panel on desktop, with a live preview in the same scene and no second canvas.
- Bloom runs only on the high tier / desktop. Mobile and the low tier get no post-processing.
- Supersedes D-020/D-021 as follows: the avatar is modular, and a couple invitation still shows one guest avatar.

### Phase status
| Phase | Scope (design steps) | Status |
|---|---|---|
| 0 | Wire the 9 `threejs-*` skills into `CLAUDE.md`, `.claude/agents/*`, `.claude/commands/*`, `.claude/skills/world-engine` | Done, uncommitted |
| 1 | Steps 1–14: input bus, keyboard/joystick, `moveWithCollisions`, jump/wave/interact, `nearby`, TouchControls, KeyboardHint, WorldStatus hooks, Interaksi disclosure, polish, Bloom + `resolveRenderTier` | **Done, uncommitted.** Reviewed PASS_WITH_NOTES. Gates: unit 106/0, E2E 44/0/8 skipped, repeat-each=2 70/0/14 |
| 2 | Steps 15–23: wardrobe catalog, appearance + persistence (`undangan.avatar.v1`), rig, procedural character builder, materials/textures, clips/animator, AvatarEditor sheet, preview camera | **In progress** (see below) |
| 3 | Steps 24–29: `COUPLE_GROOM` / `COUPLE_BRIDE` under the akad canopy, wedding outfits, `idle_groom` / `idle_bride` | Not started |
| After | QA pass, then the documenter writes D-032..D-038, updates progress and the asset register | Not started |

### Phase 2 — where it stopped
The Claude coder was **stopped** at 22:47 WIB so Codex can take over. No other agent is editing the repo, and no test or probe servers are left running.

**Already written:**
- `packages/world-engine/src/avatar/`:
  - `wardrobe.ts` (catalog per design §3)
  - `appearance.ts` + `appearance.test.ts` (types, defaults, normalize/parse, 8 tests)
  - `rig.ts` (17-bone skeleton)
  - `shapes.ts` (lathe/profile helpers — may be incomplete; review it)
  - `placeholderAnimator.ts` (the Phase 1 seam)
- `scene-manager/store.ts` + test:
  - `avatarAppearance` and `setAvatarAppearance`;
  - `ActiveOverlay` gained `{ type: 'avatar_editor' }`, opening only from READY;
  - `avatarPresetId` removed.

**Tree state at handoff:**
- `pnpm test`: **116 passed / 0 failed** (world-engine 65, web 23, contracts 16, wedding-features 7, ui 5).
- `pnpm typecheck`: green since 22:56 WIB (fixed by Codex, Chunk 0). At 22:47 it failed with these 2 errors:
  - `apps/web/lib/labels.ts:32` — `overlayLabels` lacks the `avatar_editor` key.
  - `apps/web/components/viewer/Viewer.tsx:264` — `activeOverlay` (now including `avatar_editor`) is passed to something typed `OverlayAction`. Narrow it before `OverlayHost` (design step 22).
- Lint, build and E2E were not re-run after the partial Phase 2 edits. The last green run was at the end of Phase 1.

**Remaining:**
  - `textures.ts`, `materials.ts`, `parts/{index,body,head,hair,clothing,accessories}.ts`, `buildCharacter.ts`, `clips.ts`, `animator.ts`, `useCharacter.ts`, each with its tests;
  - swap `PlaceholderAnimator` for the real character in `scenes/Avatar.tsx`;
  - FollowCamera preview mode;
  - `clearCharacterCaches` in WorldCanvas;
  - extract `useModalDialog` and add `packages/ui/src/Sheet.tsx`;
  - apps/web `lib/avatar-preference.ts`, `lib/avatar-labels.ts`, `components/viewer/AvatarEditor.tsx`, the "Ubah avatar" button, `data-avatar` on WorldStatus;
  - `e2e/avatar.spec.ts` (including E2E-11).
- Budget: at most 15k triangles and 12 draw calls per character, enforced by a test. Vitest runs in Node with no canvas, so stub textures through the injectable `TextureProvider`.

**Phase 1 review notes to fix as part of Phase 2** (none are applied yet as of 22:47 WIB):
1. Keep the desktop "E Buka …" button in `KeyboardHint.tsx` mounted while an overlay is open, so focus returns to it (§3.4).
2. Landscape phones (coarse pointer, width > 640, height ~390): use the Interaksi disclosure on short viewports too, and add a landscape case to E2E-12.
3. Add cleanup to the `setPostFx` effect in `WorldCanvas.tsx` (`setPostFx('off')`).
4. In `useKeyboardInput.ts`, clear `input.keys` on Meta keydown/keyup (macOS sticky W).
5. Remove `backdrop-blur` on small screens in `SceneActions.tsx` (fps).
6. Portal prompts should read "Masuk ke …", not "Buka Masuk ke …".

## Documentation debt (do this before closing the workstream)
- `docs/decisions.md`: add D-032..D-038. Drafts are in the design doc's SPEC_CHANGES context:
  - modular procedural avatar, superseding D-020;
  - input scheme, additive to FR-04;
  - `avatar_editor` as a UI overlay, not a WorldAction;
  - bloom gating via `resolveRenderTier`;
  - procedural couple;
  - mobile layout / Interaksi disclosure;
  - viewer polish.
- Amend D-031: `test.slow()` now also covers E2E-02, E2E-03, `[FR-02]`, `[FR-04] HTML controls`, E2E-12 and the controls specs. This extension still needs owner sign-off.
- Extend D-029 with the new unsourced copy (Lompat, Sapa, Buka, keyboard hint, wardrobe labels).
- `docs/progress.md`:
  - record Phase 1–3 evidence for T-204, T-401, T-402, T-403 (partial), T-601 (partial), T-006;
  - state plainly that Gate A and the T-401 dependencies were **not** met when this work started, and that the user chose to proceed.
- `docs/asset-register.md`: add the procedural character/texture generators (project-owned, ENGINEERING_DONE / ART_PENDING). Their style references are `apps/assets/*.png`, whose license is unknown (D-019).
- Spec text still describing presets and `avatarPresetId` (FR-07, architecture §2/§8.2/§11.1, E2E-11 wording) is the **owner's** to edit. Log it in decisions; don't rewrite the specs.

## Verification and environment
- Commands: `pnpm lint` (`--max-warnings 0` + prettier), `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`. `assets:validate`, `db:*` are BLOCKED stubs.
- E2E uses Playwright projects `desktop` and `mobile` (Pixel 7) on headless Chromium with SwiftShader, served by `next start` on :3100 with `DEV_FIXTURE_MANIFESTS=1`.
  - The GLB living room renders at about 150 ms per frame there, so tests that enter it use `test.slow()` (D-031).
  - `--repeat-each=3` with 4 workers can still time out on living-room tests (a known limitation). A worker cap is proposed but not decided.
- Bloom is off on SwiftShader unless quality is forced to `'high'`, so CI never exercises `Bloom.tsx`. A real-GPU check is still needed.
- **Servers:** the user runs `next dev` for `apps/web` on :3001 and an unrelated app on :3000. Do not stop them. Next 16 allows one `next dev` per app dir, so use `next start` on a free port (e.g. 3300) for probes, and kill whatever you start.
- Client bundles must not contain zod; import contracts as types only. Don't add dependencies; three already ships GLTFLoader, EffectComposer, mergeGeometries and AnimationMixer.
- Tests carry IDs in their names (`[FR-04] …`, `E2E-11 …`). Never weaken an assertion.
- Toolchain: Node 22.23 (system) / 24.11 (nvm, used by pnpm), pnpm 10.34.9. No Supabase CLI or Docker. Higgsfield MCP is connected but has 0 credits.

## Uncommitted changes at snapshot time
- **Orchestrator config (Phase 0):** `CLAUDE.md`, `.claude/agents/*`, `.claude/commands/{bugfix,feature,performance,refactor}.md`, `.claude/skills/world-engine/SKILL.md`.
- **Phase 1 + partial Phase 2 code:**
  - `packages/world-engine/src/{input/,avatar/,interaction/nearby*,navigation/motion*,renderer/{Bloom.tsx,glow*,capabilities.test.ts},scenes/indicators.ts}`;
  - edits across the engine, `packages/ui`, `apps/web/components/viewer/*`, `apps/web/lib/labels*`, `e2e/*`.
- **This handoff:** `CONTEXT.md`, `docs/design/controls-avatar-couple.md`.
- **User WIP — leave untouched unless asked:**
  - `AGENTS.md`, `.codex/`, `.agents/`;
  - `.claude/skills/threejs-{interaction,lighting,loaders,textures}/`, `skills-lock.json`;
  - `apps/assets/mp3/`. This is a third-party commercial song with no license: **never commit it or ship it** as invitation music.

## Open owner decisions
1. Copy without a spec source (D-029 + new labels) and the cultural accuracy of the attire (blangkon styles, Solo vs Yogya bridal, siger vs paes).
2. Welcome overlay is on demand rather than automatic on load (D-028).
3. Playwright worker cap vs. more `test.slow()` (D-031).
4. Bloom "auto" interpretation: there is no quality UI, so "high" is unreachable today.
5. The joglo pack has no LICENSE file, and its Python generation conflicts with the "Blender-authored" wording in architecture §8.5 (D-023/D-025).
6. Licensing of the style-reference images in `apps/assets/`.
7. Real-device testing (T-006, ≥30 FPS per §12) has not been done. Gate A is not met.

## Working preferences of the user
- Communicate in Indonesian; code and identifiers stay in English.
- While long tasks or subagents run, give a short progress report **every 2–3 minutes**: what is running, which files changed, and whether anything is stuck.
- Commit or push only when asked; commits go on `main`. Use conventional commit messages, split by concern.
- Run phases back to back when the user has authorized the whole workstream; stop only for a FAIL, an OPEN item, or a decision that belongs to the user.
