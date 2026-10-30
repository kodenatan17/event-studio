import { useFrame, useLoader } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { SceneDefinition, WorldAction } from '@undangan/contracts/world';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box3, Mesh, MeshBasicMaterial, Plane, Texture, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

import { devWarn } from '../dev';
import { tagKey } from '../interaction/nearby';
import type { Interactable } from '../interaction/nearby';
import type { InteractiveTag } from '../interaction/registry';
import {
  pickInteractive,
  portalAction,
  portalNodeName,
  resolveHotspotAction,
  spawnNodeName,
  toUpperSnake,
} from '../interaction/registry';
import { clampToFloor } from '../navigation/walk';
import type { RenderTier } from '../renderer/capabilities';
import { FollowCamera } from '../renderer/FollowCamera';
import { selectInputEnabled } from '../scene-manager/store';
import type { WorldStore } from '../scene-manager/store';
import type { GltfLayout, Vec3 } from '../templates/types';
import { Avatar, AVATAR_RADIUS, Marker } from './Avatar';
import { Decor } from './decor/Decor';
import { INDICATOR_SCALE, updateIndicators } from './indicators';
import { noRaycast, setCursor, TAP_SLOP_PX } from './input';
import { extraMaterials, geometries } from './materials';

/** Height of the floating indicator above an interactive node's top. */
const INDICATOR_LIFT = 0.45;
const TRIGGER_INDICATOR_LIFT = 0.15;

interface GltfSceneProps {
  store: WorldStore;
  /** Transition this load belongs to; download progress of older requests is ignored. */
  requestId: number;
  scene: SceneDefinition;
  layout: GltfLayout;
  spawnPointId: string | null;
  reducedMotion: boolean;
  tier: RenderTier;
  /** Same filter as the HTML controls: rejected hotspots are hidden and not raycast. */
  isActionEnabled?: (action: WorldAction) => boolean;
  /** The GLB could not be fetched or parsed (D-017: ERROR with retry and 2D). */
  onLoadFailed: () => void;
}

interface InteractiveNode {
  tag: InteractiveTag;
  action: WorldAction;
}

/** Resolved in place of a GLTF when fetching or parsing fails. */
const LOAD_FAILED = { loadFailed: true } as const;

/**
 * `GLTFLoader` whose failures resolve to `LOAD_FAILED` instead of rejecting: an expected asset
 * failure is a designed state (D-017), not a render exception reported as an uncaught page error.
 */
class SceneGltfLoader extends GLTFLoader {
  override load(
    url: string,
    onLoad: (gltf: GLTF) => void,
    onProgress?: (event: ProgressEvent) => void,
  ): void {
    super.load(url, onLoad, onProgress, () => {
      devWarn(`GLB ${url} failed to load`);
      onLoad(LOAD_FAILED as unknown as GLTF);
    });
  }
}

function isLoadFailure(gltf: GLTF): boolean {
  return (gltf as unknown) === LOAD_FAILED;
}

/** Drops a failed or stale GLB from the loader cache so a retry fetches it again (D-017). */
export function clearGltfCache(url: string): void {
  useLoader.clear(SceneGltfLoader, url);
}

/**
 * Manifest hotspots/portals keyed by the GLB (or trigger) node their manifest node maps to.
 * This is the inverse of `nodeMap`: any GLB name not in it never resolves to an action (§8.3).
 */
function useInteractiveNodes(
  scene: SceneDefinition,
  layout: GltfLayout,
  isActionEnabled?: (action: WorldAction) => boolean,
): ReadonlyMap<string, InteractiveNode> {
  return useMemo(() => {
    const nodes = new Map<string, InteractiveNode>();
    const target = (manifestNode: string): string | undefined => {
      const name = Object.hasOwn(layout.nodeMap, manifestNode)
        ? layout.nodeMap[manifestNode]
        : undefined;
      if (!name) devWarn(`Scene "${scene.id}" has no node ${manifestNode}`);
      return name;
    };
    for (const hotspot of scene.hotspots) {
      const action = resolveHotspotAction(hotspot);
      if (!action || (isActionEnabled && !isActionEnabled(action))) continue;
      const name = target(hotspot.nodeName);
      if (name) nodes.set(name, { tag: { kind: 'hotspot', id: hotspot.id }, action });
    }
    for (const portal of scene.portals) {
      const name = target(portalNodeName(portal.id));
      if (name)
        nodes.set(name, { tag: { kind: 'portal', id: portal.id }, action: portalAction(portal) });
    }
    return nodes;
  }, [scene, layout, isActionEnabled]);
}

/**
 * Frees the GPU buffers and textures of a cached GLTF; three re-uploads them if the scene is
 * entered again. Materials (and so their compiled shader programs) stay cached: recompiling PBR
 * programs on every re-entry costs far more than the little GPU memory a program holds.
 */
function releaseGpuResources(root: Object3D): void {
  const released = new Set<Material>();
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const list: Material[] = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of list) {
      if (released.has(material)) continue;
      released.add(material);
      for (const value of Object.values(material)) {
        if (value instanceof Texture) value.dispose();
      }
    }
  });
}

interface PreparedModel {
  model: Object3D;
  /** Indicator positions above interactive nodes, keyed by node name. */
  indicators: { name: string; position: Vec3; tagKey: string }[];
  /** Floor footprints of the mapped nodes and triggers, for "Buka" / E (§3.4). */
  interactables: Interactable[];
}

/**
 * Per-mount clone of the cached GLTF: mapped `HS_*` meshes become invisible raycast targets,
 * `SPAWN_*` and unmapped `HS_*` are hidden, the walkable floor stays tappable and everything else
 * ignores raycasts. Geometry, textures and GLB materials stay shared with the loader cache.
 */
function prepareModel(
  source: Object3D,
  layout: GltfLayout,
  nodes: ReadonlyMap<string, InteractiveNode>,
  hitMaterial: Material,
): PreparedModel {
  const model = source.clone(true);
  model.updateMatrixWorld(true);
  const indicators: PreparedModel['indicators'] = [];
  const interactables: Interactable[] = [];
  const bounds = new Box3();
  let hasFloor = false;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const { name } = object;
    const node = nodes.get(name);
    if (node) {
      object.material = hitMaterial;
      object.userData.interactive = node.tag;
      bounds.setFromObject(object);
      indicators.push({
        name,
        position: [
          (bounds.min.x + bounds.max.x) / 2,
          bounds.max.y + INDICATOR_LIFT,
          (bounds.min.z + bounds.max.z) / 2,
        ],
        tagKey: tagKey(node.tag),
      });
      interactables.push({
        tag: node.tag,
        action: node.action,
        min: [bounds.min.x, bounds.min.z],
        max: [bounds.max.x, bounds.max.z],
      });
    } else if (name.includes('HS_') || name.startsWith('SPAWN_')) {
      object.visible = false;
      object.raycast = noRaycast;
    } else if (name === layout.floor.nodeName) {
      object.userData.walkable = true;
      hasFloor = true;
    } else {
      // TODO(T-202/T-107): `*__PHOTO_DISPLAY_MESH` keeps the GLB placeholder material until CMS
      // photos are applied (TextureLoader with CORS, cloned material, sRGB color space).
      object.raycast = noRaycast;
    }
  });
  if (!hasFloor) devWarn(`GLB ${layout.url} has no floor node ${layout.floor.nodeName}`);
  for (const [name, trigger] of Object.entries(layout.triggers)) {
    const [x, y, z] = trigger.position;
    const node = nodes.get(name);
    if (node) {
      // Low on the strip, so it never floats over an avatar standing just inside the edge.
      indicators.push({
        name,
        position: [x, y + trigger.size[1] / 2 + TRIGGER_INDICATOR_LIFT, z],
        tagKey: tagKey(node.tag),
      });
      const [width, , depth] = trigger.size;
      interactables.push({
        tag: node.tag,
        action: node.action,
        min: [x - width / 2, z - depth / 2],
        max: [x + width / 2, z + depth / 2],
      });
    }
  }
  for (const name of nodes.keys()) {
    if (!indicators.some((indicator) => indicator.name === name)) {
      devWarn(`GLB ${layout.url} has no node ${name}`);
    }
  }
  return { model, indicators, interactables };
}

const UP = new Vector3(0, 1, 0);

/** GLB scene for gltf layouts: suspends while loading, reports a failed load, else renders. */
export function GltfScene({ onLoadFailed, ...props }: GltfSceneProps) {
  const { store, requestId, layout } = props;
  // Only the first (uncached) load reports progress. The denominator is the catalog size:
  // gzip makes Content-Length the compressed size (§8.1 loading feedback).
  const gltf = useLoader(SceneGltfLoader, layout.url, undefined, (event: ProgressEvent) => {
    const total = layout.sizeBytes ?? (event.lengthComputable ? event.total : 0);
    if (total > 0) store.getState().setLoadProgress(requestId, event.loaded / total);
  });
  if (isLoadFailure(gltf)) return <LoadFailed onLoadFailed={onLoadFailed} />;
  return <LoadedGltfScene {...props} gltf={gltf} />;
}

function LoadFailed({ onLoadFailed }: { onLoadFailed: () => void }) {
  useEffect(() => onLoadFailed(), [onLoadFailed]);
  return null;
}

/** Same avatar, marker, walk, camera and actions as primitive scenes. */
function LoadedGltfScene({
  store,
  scene,
  layout,
  spawnPointId,
  reducedMotion,
  isActionEnabled,
  gltf,
  tier,
}: Omit<GltfSceneProps, 'onLoadFailed'> & { gltf: GLTF }) {
  const [spawn] = useState(
    () =>
      layout.spawnPoints[spawnNodeName(spawnPointId)] ??
      layout.spawnPoints.SPAWN_ENTRY ??
      ([0, 0] as const),
  );
  const avatarPosition = useRef(new Vector3(spawn[0], layout.floor.y, spawn[1]));
  const nodes = useInteractiveNodes(scene, layout, isActionEnabled);
  const [hitMaterial] = useState(
    () => new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
  );
  const { model, indicators, interactables } = useMemo(
    () => prepareModel(gltf.scene, layout, nodes, hitMaterial),
    [gltf, layout, nodes, hitMaterial],
  );
  const floorPlane = useMemo(() => new Plane(UP, -layout.floor.y), [layout]);
  const indicatorMeshes = useRef<(Mesh | null)[]>([]);
  const hovered = useRef<string | null>(null);

  // The hit material is ours; the GLTF stays in the loader cache (CPU) for fast re-entry, but its
  // GPU buffers and textures are released so leaving the scene does not grow memory (FR-04).
  useEffect(
    () => () => {
      setCursor('');
      hitMaterial.dispose();
      releaseGpuResources(gltf.scene);
    },
    [gltf, hitMaterial],
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const state = store.getState();
      if (event.delta > TAP_SLOP_PX || !selectInputEnabled(state)) return;
      const tag = pickInteractive(event.intersections);
      if (tag) {
        for (const node of nodes.values()) {
          if (node.tag.kind === tag.kind && node.tag.id === tag.id) {
            state.dispatch(node.action);
            return;
          }
        }
        return;
      }
      const floorHit = event.intersections.find((hit) => hit.object.userData.walkable === true);
      if (!floorHit) return;
      // The floor mesh top is below the finish; project the tap onto the walkable height.
      const point = event.ray.intersectPlane(floorPlane, new Vector3()) ?? floorHit.point;
      state.setMarker(clampToFloor([point.x, point.z], layout.floor, AVATAR_RADIUS));
    },
    [store, nodes, floorPlane, layout],
  );

  const handlePointerMove = useCallback((event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const tag = pickInteractive(event.intersections);
    hovered.current = tag ? tagKey(tag) : null;
    setCursor(tag ? 'pointer' : '');
  }, []);

  const handlePointerOut = useCallback(() => {
    hovered.current = null;
    setCursor('');
  }, []);

  useFrame(({ clock }, delta) => {
    const nearby = store.getState().nearby;
    updateIndicators(
      indicatorMeshes.current,
      clock.elapsedTime,
      delta,
      nearby ? tagKey(nearby) : null,
      hovered.current,
      reducedMotion,
    );
  });

  const { floor } = layout;
  return (
    <group name={`SCENE_${toUpperSnake(scene.id)}`}>
      {layout.decor.map((item, index) => (
        <Decor key={index} item={item} store={store} tier={tier} reducedMotion={reducedMotion} />
      ))}
      <group
        onClick={handleClick}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
      >
        <primitive object={model} dispose={null} />
        {Object.entries(layout.triggers).map(([name, trigger]) => {
          const node = nodes.get(name);
          if (!node) return null;
          return (
            <mesh
              key={name}
              name={name}
              geometry={geometries.box}
              material={hitMaterial}
              position={trigger.position}
              scale={trigger.size}
              userData={{ interactive: node.tag }}
              dispose={null}
            />
          );
        })}
      </group>
      {indicators.map((indicator, index) => (
        <mesh
          key={indicator.name}
          ref={(mesh) => {
            indicatorMeshes.current[index] = mesh;
          }}
          geometry={geometries.flower}
          material={extraMaterials.lanternGlow}
          position={indicator.position}
          scale={INDICATOR_SCALE}
          userData={{ baseY: indicator.position[1], tagKey: indicator.tagKey }}
          raycast={noRaycast}
          dispose={null}
        />
      ))}
      <GltfLighting />
      <Avatar
        store={store}
        colliders={layout.colliders}
        floor={floor}
        floorY={floor.y}
        spawn={spawn}
        position={avatarPosition}
        interactables={interactables}
        reducedMotion={reducedMotion}
        tier={tier}
      />
      <Marker store={store} floorY={floor.y} />
      <FollowCamera
        store={store}
        target={avatarPosition}
        offset={layout.camera.offset}
        lookHeight={layout.camera.lookHeight}
        lookAhead={layout.camera.lookAhead}
        focusCenterX={(floor.minX + floor.maxX) / 2}
        fov={layout.camera.fov}
        maxHeight={layout.camera.maxHeight}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

/**
 * Extra fill for PBR materials on top of the shared `Environment` lights (no shadows,
 * architecture.md §12). A hemisphere only: extra direct lights cost a BRDF term per fragment
 * without visibly changing this interior. Unmounts with the scene.
 */
function GltfLighting() {
  return (
    <>
      <hemisphereLight args={['#fff2de', '#7a5a44', 1.6]} />
    </>
  );
}
