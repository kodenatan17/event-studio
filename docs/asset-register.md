# Asset register — Undangan AI Wedding World

> **Updated:** 2026-10-30
> **Scope:** origin, author, license, allowed usage and attribution for every shipped model and texture (`architecture.md` §8.5 line 364, §11; `specs.md` repo layout). Reference images and audio that are not shipped are listed separately.
> **Status values:** `ENGINEERING_DONE / ART_PENDING` (engineering complete, art or license sign-off missing), `PROTOTYPE_ONLY`, `REFERENCE_ONLY`. A model is not production-ready until its status is cleared by the owner.

---

## Shipped assets

| Asset | Path | Origin / author | License / ownership | Allowed usage | Attribution | Status |
|---|---|---|---|---|---|---|
| Living room GLB (served copy) | `apps/web/public/templates/joglo/1.0.0/living-room.glb` | Copy of `assets/source/joglo-interior/models/joglo_living_room_mobile_optimized.glb`. Procedural model from the user's own asset pack. glTF 2.0, 35 nodes, 10,253 triangles, 472,628 B gzip. | Owned by the user. The user states it is licensed for production use. The pack has no LICENSE file (D-025). | `living-room` scene only, via the trusted catalog path in `packages/world-engine/src/templates/blockout.ts` (D-023). Not reachable from manifest `assetUrl` (D-008). | Not required (user-owned work). | `ENGINEERING_DONE / ART_PENDING` |
| Embedded textures of the living room GLB (5 PNG) | Inside `apps/web/public/templates/joglo/1.0.0/living-room.glb`. Source PNGs: `assets/source/joglo-interior/textures/teak_grain.png`, `dark_teak_grain.png`, `light_teak_grain.png`, `stone_tiles.png`, `batik_kawung_stylized.png` | User's own asset pack. README states all procedural textures were generated originally, with no third-party stock textures. | Owned by the user, same statement as above (D-025). | Same as the GLB. Textures are not separate network assets. | Not required (user-owned work). | `ENGINEERING_DONE / ART_PENDING` |

Notes:
- Only the served copy ships. The other models in `assets/source/joglo-interior/models/` are source material. The viewer does not reference them.
- Art sign-off is needed before the status changes. The pack's README says it is not equivalent to professional hand-modeled realism.
- Caching: the served path is versioned but not content-hashed. Content-hashed immutable caching is deferred to T-504 (`architecture.md` §11.3).

---

## Source and provenance (not shipped)

| Asset | Path | Origin / author | License / ownership | Allowed usage | Attribution | Status |
|---|---|---|---|---|---|---|
| Joglo asset pack (source) | `assets/source/joglo-interior/` | User's own procedural pack, moved from repo-root `joglo_interior/` with user approval (D-025). Build and optimize scripts: `build_joglo_interior.py`, `optimize_joglo.py`. Docs: `README.md`, `docs/r3f-integration.md`. | Owned by the user, licensed for production use per the user (D-025). No LICENSE file in the pack. | Source and provenance. Regenerate the served copy from it. Not served directly. | Not required (user-owned work). | `ENGINEERING_DONE / ART_PENDING` |
| Joglo previews | `assets/source/joglo-interior/previews/*.png` | Same as the pack. | Same as the pack. | Review and documentation only. Not served. | Not required. | `REFERENCE_ONLY` |
| Joglo viewer | `assets/source/joglo-interior/viewer/index.html` | Same as the pack. Uses three.js `GLTFLoader` and `OrbitControls` via import. | Same as the pack. The three.js library carries its own license (MIT). | Local inspection only. Not served. | Not required for the pack. three.js is not shipped from this file. | `REFERENCE_ONLY` |

---

## Procedural blockout (code, project-owned)

| Asset | Path | Origin / author | License / ownership | Allowed usage | Attribution | Status |
|---|---|---|---|---|---|---|
| Primitive blockout scenes and decor | `packages/world-engine/src/scenes/decor/` (`Decor.tsx`, `Instances.tsx`, `Part.tsx`, `nature.tsx`, `structures.tsx`), `packages/world-engine/src/templates/blockout.ts` | Project code in this repository. No external models or textures. | Project-owned code. | Prototype blockout for entrance, garden and reception hall (D-022). Living room uses the GLB above. | Not required. | `PROTOTYPE_ONLY` (`architecture.md` §11.2; D-019, D-022) |

---

## Reference material (not shipped)

These files are concept references. They do not ship in the build. Origin and license are not recorded yet, so each one needs the user's answer before it is used in a shipped asset or model (D-019, D-020).

| Asset | Path | Origin / author | License / ownership | Allowed usage | Attribution | Status |
|---|---|---|---|---|---|---|
| Javanese pelataran concept | `apps/assets/pelataran-adat-jawa.png` | Not recorded. User-supplied reference (D-019, D-022). | Not recorded. Ask the user. | Reference for the blockout styling and for future props (D-019). Not shipped. | Unknown. Ask the user. | `REFERENCE_ONLY` |
| Javanese couple concept | `apps/assets/pengantin-adat-jawa.png` | Not recorded. User-supplied reference (D-019). | Not recorded. Ask the user. | Reference for the future couple models. Not shipped. | Unknown. Ask the user. | `REFERENCE_ONLY` |
| Avatar customization concept | `apps/assets/avatar-customize.png` | Not recorded. User-supplied reference (D-019, D-020). | Not recorded. Ask the user. | Reference for the 5 FR-07 presets. Not shipped. | Unknown. Ask the user. | `REFERENCE_ONLY` |
| Background song file | `apps/assets/mp3/Denny Caknan - Cundamani (Lirik Lagu).mp3` | Commercial recording by a third-party artist (not the couple, not this project). Added by the user. | Not licensed for shipping. | Must not be used as invitation background music, or in any shipped build, without a proper license. Audio is off until a user gesture (`architecture.md` §12 line 415). Optional ambient music is an entrance option (`architecture.md` §3 line 117). | Owned by the artist and rights holders. Not attributable as project content. | `BLOCKED` for shipping. Not licensed. |

---

## Open items
- Origin and license of the three `apps/assets/*.png` references: ask the user.
- The background song must be replaced with a licensed track, or removed, before any shipped build uses audio.
- Living room GLB: art sign-off and production license confirmation are needed to clear `ART_PENDING` (T-004, T-606).
- Whether `architecture.md` §8.5 (Blender-authored models) is met by this Python-generated GLB: owner to confirm (D-023).
- Pre-ship validation of GLB node names, budgets and license entries is T-504 (`pnpm assets:validate` is still a stub).
