# Undangan AI — Joglo Living Room 3D Asset Pack v1.0

**Deliverable:** actual geometric `.glb` assets with stylized-realistic visual design, procedural textures and PBR glTF materials. These are NOT renders/PNGs masquerading as models.

## Included

- `models/joglo_living_room_mobile_optimized.glb` — RECOMMENDED for mobile; batched static geometry, interaction/photo nodes preserved.
- `models/joglo_living_room_complete.glb` — editable assembled interior: saka guru, open-front Joglo room, carved gebyok, 6 interactive framed photo placeholders, book on table, furniture, lamps, batik carpet, floral vases, wayang and gamelan accent.
- `models/joglo_interior_shell.glb` — architectural base, removable by composition.
- **11 modular props**: gebyok, story table, story book, photo frame, wooden bench, chair, hanging lantern, batik rug, flower vase, wayang display, saron decoration.
- `scene-config.json` — 3D positioning convention, walkable envelope, obstacle draft AABBs, hotspots, camera and actions.
- `textures/*.png` — self-generated wood grain, stone and kawung-inspired batik textures embedded into the GLBs.
- `viewer/index.html` — orbit/zoom/asset selector/wireframe preview using Three.js.
- `build_joglo_interior.py` — reproducible model generator.

## Build / Rebuild

```sh
pip install -r requirements.txt
python build_joglo_interior.py
python optimize_joglo.py
```

Rerun the optimizer after regenerating the full model. Revalidate all assets before release.

## Preview

From the extracted folder:

```sh
python3 -m http.server 8080
```

Open **http://localhost:8080/viewer/**. Requires internet connection to fetch Three.js via jsDelivr. The GLB assets themselves work offline.

## Three.js / React Three Fiber

Copy `models/*.glb` to `public/models/`, use `useGLTF('/models/joglo_living_room_mobile_optimized.glb')`, then hide objects with names containing `HS_` or `SPAWN_` and register interactions from `scene-config.json`.

**Coordinates**: meters, **Y-up**, front/entry is positive Z. Camera recommended at `[11,7.5,13.8]`, look-at `[0,2,0]`.

### Real CMS photo replacement

The six `PHOTO_DISPLAY_MESH` meshes are placeholders. Replace their material's base color texture with an appropriately cropped publicly published photo using `THREE.TextureLoader` (cross-origin safe); don't ship couple photos in static shared models. Match each frame by its parent/prefix `GALLERY_01..06`.

### MVP scope and limitations

- Produces valid geometric assets and embedded PBR-style textures. **Not equivalent to professional hand-modeled/photogrammetric architectural realism**.
- Carved ornament motifs are stylized procedural approximations. Not an academically faithful reconstruction of a particular regional Joglo or a specific historical gebyok.
- Not rigged; no avatar character included (separate avatar milestone).
- `HS_` and `SPAWN_` markers are rendered as visible geometry by naive GLB viewers; the included viewer hides them by default. Use the scene config to register raycast hit targets.
- Walkable/colliders in `scene-config.json` are preliminary approximations; bake authoritative navmesh/physics colliders before allowing unconstrained walking.
- No personally identifying content; wedding photos are intentionally placeholders.
- Performance budgets must be tested on a real mobile browser before production.

## Copyright

All geometry and procedural textures generated originally in this session; no third-party stock models/textures were incorporated.

## Draw-call / batching notes

The editable full model uses ~616 independently named meshes (a high draw-call count for mobile). The optimized model batches static geometry by material and preserves individual `HS_*`, `SPAWN_*`, `PHOTO_DISPLAY_MESH`, and `FLOOR_WALKABLE` meshes. Use the optimized model in the public viewer; use complete/model-per-prop files when editing authored scenes. This is **not** a substitute for mobile profiling.

**Important for previous exterior pack:** That earlier procedural pack was authored with Z-up conventions; this interior pack uses glTF-native **Y-up**. To combine them, rotate/re-export the older exterior asset around X (-90 degrees), check positions, and regenerate the navmesh. Do not assume the two scenes share coordinates without conversion.
