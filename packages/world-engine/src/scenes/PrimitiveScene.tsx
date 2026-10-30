import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import type { SceneDefinition, WorldAction } from '@undangan/contracts/world';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Vector3 } from 'three';
import type { Mesh } from 'three';

import { devWarn } from '../dev';
import { footprintAabb, tagKey } from '../interaction/nearby';
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
import type { NodePlacement, PrimitiveLayout, Vec3 } from '../templates/types';
import { Avatar, AVATAR_RADIUS, Marker } from './Avatar';
import { Decor } from './decor/Decor';
import { INDICATOR_SCALE, updateIndicators } from './indicators';
import { noRaycast, setCursor, TAP_SLOP_PX } from './input';
import { extraMaterials, geometries, highlightMaterial, materials } from './materials';

interface PrimitiveSceneProps {
  store: WorldStore;
  scene: SceneDefinition;
  layout: PrimitiveLayout;
  spawnPointId: string | null;
  reducedMotion: boolean;
  tier: RenderTier;
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
  tier,
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
  const interactables = useMemo<Interactable[]>(
    () =>
      nodes.map((node) => ({
        tag: node.tag,
        action: node.action,
        ...footprintAabb(node.placement.position, node.placement.size, node.placement.rotationY),
      })),
    [nodes],
  );
  const indicators = useRef<(Mesh | null)[]>([]);
  const hovered = useRef<string | null>(null);

  // Reset the hover cursor when the scene unmounts mid-hover.
  useEffect(() => () => setCursor(''), []);

  const handleHover = useCallback((tag: InteractiveTag | null) => {
    hovered.current = tag ? tagKey(tag) : null;
    setCursor(tag ? 'pointer' : '');
  }, []);

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

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    highlightMaterial.opacity = reducedMotion
      ? 0.26
      : 0.16 + 0.16 * (0.5 + 0.5 * Math.sin(t * 2.4));
    const nearby = store.getState().nearby;
    updateIndicators(
      indicators.current,
      t,
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
          onHover={handleHover}
          indicatorRef={(mesh) => {
            indicators.current[index] = mesh;
          }}
        />
      ))}
      <Avatar
        store={store}
        colliders={layout.colliders}
        floor={layout.floor}
        spawn={spawn}
        position={avatarPosition}
        interactables={interactables}
        reducedMotion={reducedMotion}
        tier={tier}
      />
      <Marker store={store} />
      <FollowCamera
        store={store}
        target={avatarPosition}
        offset={layout.camera.offset}
        lookHeight={layout.camera.lookHeight}
        lookAhead={layout.camera.lookAhead}
        focusCenterX={(layout.floor.minX + layout.floor.maxX) / 2}
        fov={layout.camera.fov}
        maxHeight={layout.camera.maxHeight}
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
  onHover: (tag: InteractiveTag | null) => void;
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
        onPointerOver={() => onHover(tag)}
        onPointerOut={() => onHover(null)}
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
        scale={INDICATOR_SCALE}
        userData={{ baseY: indicatorY, tagKey: tagKey(tag) }}
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
