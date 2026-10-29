import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { SceneDefinition, WorldAction } from '@undangan/contracts/world';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { Vector3 } from 'three';
import type { Group, Mesh } from 'three';

import { devWarn } from '../dev';
import type { InteractiveTag } from '../interaction/registry';
import {
  pickInteractive,
  portalAction,
  portalNodeName,
  resolveHotspotAction,
  spawnNodeName,
  toUpperSnake,
} from '../interaction/registry';
import { clampToFloor, stepToward } from '../navigation/walk';
import { FollowCamera } from '../renderer/FollowCamera';
import { selectInputEnabled } from '../scene-manager/store';
import type { WorldStore } from '../scene-manager/store';
import { useWorldStore } from '../scene-manager/useWorldStore';
import type { NodePlacement, PrimitiveLayout, Vec3 } from '../templates/types';
import { Decor } from './decor/Decor';
import { extraMaterials, geometries, highlightMaterial, materials } from './materials';

const AVATAR_RADIUS = 0.3;
const WALK_SPEED = 2.6;
/** Pointer travel (px) above which a tap counts as a drag and is ignored. */
const TAP_SLOP_PX = 6;

const noRaycast = () => {};

function setCursor(cursor: string): void {
  document.body.style.cursor = cursor;
}

interface PrimitiveSceneProps {
  store: WorldStore;
  scene: SceneDefinition;
  layout: PrimitiveLayout;
  spawnPointId: string | null;
  reducedMotion: boolean;
  /** Same filter as the HTML controls: rejected hotspots get no mesh and no raycast. */
  isActionEnabled?: (action: WorldAction) => boolean;
}

interface InteractiveNode {
  tag: InteractiveTag;
  nodeName: string;
  placement: NodePlacement;
  action: WorldAction;
}

/** Resolves manifest hotspots/portals to authored nodes; missing nodes keep their HTML control. */
function useInteractiveNodes(
  scene: SceneDefinition,
  layout: PrimitiveLayout,
  isActionEnabled?: (action: WorldAction) => boolean,
): InteractiveNode[] {
  return useMemo(() => {
    const nodes: InteractiveNode[] = [];
    for (const hotspot of scene.hotspots) {
      const placement = layout.hotspots[hotspot.nodeName];
      const action = resolveHotspotAction(hotspot);
      if (action && isActionEnabled && !isActionEnabled(action)) continue;
      if (!placement) devWarn(`Scene "${scene.id}" has no node ${hotspot.nodeName}`);
      if (placement && action) {
        nodes.push({
          tag: { kind: 'hotspot', id: hotspot.id },
          nodeName: hotspot.nodeName,
          placement,
          action,
        });
      }
    }
    for (const portal of scene.portals) {
      const nodeName = portalNodeName(portal.id);
      const placement = layout.portals[nodeName];
      if (!placement) devWarn(`Scene "${scene.id}" has no node ${nodeName}`);
      if (placement) {
        nodes.push({
          tag: { kind: 'portal', id: portal.id },
          nodeName,
          placement,
          action: portalAction(portal),
        });
      }
    }
    return nodes;
  }, [scene, layout, isActionEnabled]);
}

/** Procedural scene for primitive templates: floor, colliders, hotspots, portals, avatar. */
export function PrimitiveScene({
  store,
  scene,
  layout,
  spawnPointId,
  reducedMotion,
  isActionEnabled,
}: PrimitiveSceneProps) {
  const [spawn] = useState(
    () =>
      layout.spawnPoints[spawnNodeName(spawnPointId)] ??
      layout.spawnPoints.SPAWN_ENTRY ??
      ([0, 0] as const),
  );
  const avatarPosition = useRef(new Vector3(spawn[0], 0, spawn[1]));
  const nodes = useInteractiveNodes(scene, layout, isActionEnabled);
  const indicators = useRef<(Mesh | null)[]>([]);

  // Reset the hover cursor when the scene unmounts mid-hover.
  useEffect(() => () => setCursor(''), []);

  const handleInteractive = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      const state = store.getState();
      if (event.delta > TAP_SLOP_PX || !selectInputEnabled(state)) return;
      const tag = pickInteractive(event.intersections);
      const node = tag && nodes.find((n) => n.tag.kind === tag.kind && n.tag.id === tag.id);
      if (node) state.dispatch(node.action);
    },
    [store, nodes],
  );

  const handleFloor = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      const state = store.getState();
      if (event.delta > TAP_SLOP_PX || !selectInputEnabled(state)) return;
      event.stopPropagation();
      state.setMarker(clampToFloor([event.point.x, event.point.z], layout.floor, AVATAR_RADIUS));
    },
    [store, layout],
  );

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    highlightMaterial.opacity = reducedMotion
      ? 0.26
      : 0.16 + 0.16 * (0.5 + 0.5 * Math.sin(t * 2.4));
    indicators.current.forEach((mesh) => {
      if (!mesh) return;
      const baseY = mesh.userData.baseY as number;
      mesh.position.y = reducedMotion ? baseY : baseY + 0.08 * Math.sin(t * 2);
      mesh.rotation.y = reducedMotion ? 0 : t;
    });
  });

  const { floor } = layout;
  return (
    <group name={`SCENE_${toUpperSnake(scene.id)}`}>
      {layout.decor.map((item, index) => (
        <Decor key={index} item={item} />
      ))}
      <mesh
        name="FLOOR_WALKABLE"
        geometry={geometries.plane}
        material={materials[floor.material]}
        position={[(floor.minX + floor.maxX) / 2, 0.001, (floor.minZ + floor.maxZ) / 2]}
        scale={[floor.maxX - floor.minX, 1, floor.maxZ - floor.minZ]}
        onClick={handleFloor}
        dispose={null}
      />
      {layout.colliders.map((box) => (
        <mesh
          key={box.id}
          name={`COLLIDER_${box.id}`}
          visible={false}
          geometry={geometries.box}
          position={[(box.minX + box.maxX) / 2, 0.5, (box.minZ + box.maxZ) / 2]}
          scale={[box.maxX - box.minX, 1, box.maxZ - box.minZ]}
          raycast={noRaycast}
          dispose={null}
        />
      ))}
      {nodes.map((node, index) => (
        <InteractiveMesh
          key={`${node.tag.kind}:${node.tag.id}`}
          node={node}
          onClick={handleInteractive}
          onHover={setCursor}
          indicatorRef={(mesh) => {
            indicators.current[index] = mesh;
          }}
        />
      ))}
      <Avatar store={store} layout={layout} spawn={spawn} position={avatarPosition} />
      <Marker store={store} />
      <FollowCamera
        target={avatarPosition}
        offset={layout.camera.offset}
        lookHeight={layout.camera.lookHeight}
        lookAhead={layout.camera.lookAhead}
        focusCenterX={(layout.floor.minX + layout.floor.maxX) / 2}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

function InteractiveMesh({
  node,
  onClick,
  onHover,
  indicatorRef,
}: {
  node: InteractiveNode;
  onClick: (event: ThreeEvent<MouseEvent>) => void;
  onHover: (cursor: string) => void;
  indicatorRef: (mesh: Mesh | null) => void;
}) {
  const { placement, tag } = node;
  const geometry = placement.shape === 'cylinder' ? geometries.cylinder : geometries.box;
  const [w, h, d] = placement.size;
  const glow: Vec3 = [w + 0.12, h + 0.12, d + 0.12];
  const indicatorY = h / 2 + 0.5;
  return (
    <group position={placement.position} rotation-y={placement.rotationY ?? 0}>
      <mesh
        name={node.nodeName}
        geometry={geometry}
        material={materials[placement.material]}
        scale={placement.size}
        userData={{ interactive: tag }}
        onClick={onClick}
        onPointerOver={() => onHover('pointer')}
        onPointerOut={() => onHover('')}
        dispose={null}
      />
      {tag.kind === 'portal' ? <DoorDetails size={placement.size} /> : null}
      <mesh
        geometry={geometry}
        material={highlightMaterial}
        scale={glow}
        raycast={noRaycast}
        dispose={null}
      />
      <mesh
        ref={indicatorRef}
        geometry={geometries.flower}
        material={extraMaterials.lanternGlow}
        position={[0, indicatorY, 0]}
        scale={[0.2, 0.3, 0.2]}
        userData={{ baseY: indicatorY }}
        raycast={noRaycast}
        dispose={null}
      />
    </group>
  );
}

/** Carved double-leaf door face on portal nodes. */
function DoorDetails({ size: [w, h, d] }: { size: Vec3 }) {
  const face = d / 2 + 0.012;
  return (
    <group>
      {[-1, 1].map((side) => (
        <group key={side}>
          {[0.2, -0.22].map((y) => (
            <mesh
              key={y}
              geometry={geometries.box}
              material={materials.teakDark}
              position={[(side * w) / 4, y * h, 0]}
              scale={[w * 0.34, h * 0.34, d + 0.024]}
              raycast={noRaycast}
              dispose={null}
            />
          ))}
          <mesh
            geometry={geometries.sphere}
            material={materials.gold}
            position={[side * 0.08, -0.02 * h, face]}
            scale={0.08}
            raycast={noRaycast}
            dispose={null}
          />
        </group>
      ))}
      <mesh
        geometry={geometries.box}
        material={materials.gold}
        position={[0, 0, 0]}
        scale={[0.03, h * 0.96, d + 0.03]}
        raycast={noRaycast}
        dispose={null}
      />
    </group>
  );
}

/** Capsule placeholder avatar (until T-401) walking toward the marker with clamped delta. */
function Avatar({
  store,
  layout,
  spawn,
  position,
}: {
  store: WorldStore;
  layout: PrimitiveLayout;
  spawn: readonly [number, number];
  position: RefObject<Vector3>;
}) {
  const group = useRef<Group>(null);

  useFrame((_, delta) => {
    const avatar = group.current;
    if (!avatar) return;
    const state = store.getState();
    const target = state.marker;
    const current = position.current;
    if (target && selectInputEnabled(state)) {
      const result = stepToward(
        [current.x, current.z],
        target,
        delta,
        WALK_SPEED,
        layout.colliders,
        AVATAR_RADIUS,
      );
      const dx = result.position[0] - current.x;
      const dz = result.position[1] - current.z;
      const moved = Math.abs(dx) + Math.abs(dz) > 1e-6;
      if (moved) {
        avatar.rotation.y = Math.atan2(dx, dz);
        current.set(result.position[0], 0, result.position[1]);
      }
      if (result.arrived || !moved) state.setMarker(null);
    }
    avatar.position.copy(current);
  });

  return (
    <group ref={group} name="AVATAR_PLACEHOLDER" position={[spawn[0], 0, spawn[1]]}>
      <mesh
        geometry={geometries.capsule}
        material={extraMaterials.avatar}
        position={[0, 0.61, 0]}
        dispose={null}
      />
      <mesh
        geometry={geometries.sphere}
        material={extraMaterials.skin}
        position={[0, 1.42, 0]}
        scale={0.36}
        dispose={null}
      />
      <mesh
        geometry={geometries.cylinder}
        material={extraMaterials.blangkon}
        position={[0, 1.58, 0]}
        scale={[0.38, 0.1, 0.38]}
        dispose={null}
      />
    </group>
  );
}

function Marker({ store }: { store: WorldStore }) {
  const marker = useWorldStore(store, (state) => state.marker);
  if (!marker) return null;
  return (
    <mesh
      geometry={geometries.marker}
      material={extraMaterials.marker}
      position={[marker[0], 0.045, marker[1]]}
      raycast={noRaycast}
      dispose={null}
    />
  );
}
