import { useMemo } from 'react';

import type { Vec2 } from '../../navigation/walk';
import type { Vec3 } from '../../templates/types';
import { extraMaterials, geometries, materials } from '../materials';
import { Instances } from './Instances';
import type { InstanceTransform } from './Instances';
import { Part } from './Part';

// ----- Stone wall with paduraksa-style caps ---------------------------------------------------

export function Wall({
  start,
  end,
  height,
  thickness,
}: {
  start: Vec2;
  end: Vec2;
  height: number;
  thickness: number;
}) {
  const dx = end[0] - start[0];
  const dz = end[1] - start[1];
  const length = Math.hypot(dx, dz);
  const rotationY = -Math.atan2(dz, dx);
  return (
    <group position={[(start[0] + end[0]) / 2, 0, (start[1] + end[1]) / 2]} rotation-y={rotationY}>
      <Part material="stone" position={[0, height / 2, 0]} scale={[length, height, thickness]} />
      <Part material="stoneDark" position={[0, 0.12, 0]} scale={[length, 0.24, thickness + 0.1]} />
      <Part
        material="stoneDark"
        position={[0, height + 0.07, 0]}
        scale={[length, 0.14, thickness + 0.14]}
      />
      {[-1, 1].map((side) => (
        <Part
          key={side}
          geometry="pyramid"
          material="stoneDark"
          position={[(side * length) / 2, height + 0.4, 0]}
          scale={[thickness + 0.1, 0.55, thickness + 0.1]}
        />
      ))}
    </group>
  );
}

// ----- Gapura: stone pillars with stepped crowns around a carved teak door --------------------

export function Gapura({
  position,
  rotationY = 0,
  doorWidth,
  pillarWidth: pw,
  height,
}: {
  position: Vec3;
  rotationY?: number;
  doorWidth: number;
  pillarWidth: number;
  height: number;
}) {
  const pillarX = doorWidth / 2 + pw / 2;
  return (
    <group position={position} rotation-y={rotationY}>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * pillarX, 0, 0]}>
          <Part material="stoneDark" position={[0, 0.16, 0]} scale={[pw * 1.18, 0.32, pw * 1.18]} />
          <Part material="stone" position={[0, height / 2, 0]} scale={[pw, height, pw]} />
          <Part
            material="stoneDark"
            position={[0, height * 0.62, 0]}
            scale={[pw * 1.08, 0.12, pw * 1.08]}
          />
          <Part
            material="teakCarved"
            position={[0, height * 0.34, pw / 2 + 0.02]}
            scale={[pw * 0.6, height * 0.42, 0.04]}
          />
          <Part
            material="gold"
            position={[0, height * 0.34, pw / 2 + 0.045]}
            scale={[pw * 0.18, pw * 0.18, 0.02]}
          />
          <Part
            material="stoneDark"
            position={[0, height + 0.11, 0]}
            scale={[pw * 1.22, 0.22, pw * 1.22]}
          />
          <Part
            material="stone"
            position={[0, height + 0.36, 0]}
            scale={[pw * 0.92, 0.28, pw * 0.92]}
          />
          <Part
            material="stoneDark"
            position={[0, height + 0.62, 0]}
            scale={[pw * 0.64, 0.24, pw * 0.64]}
          />
          <Part
            geometry="pyramid"
            material="stone"
            position={[0, height + 0.74 + pw * 0.4, 0]}
            scale={[pw * 0.56, pw * 0.8, pw * 0.56]}
          />
        </group>
      ))}
      {/* Door frame and carved lintel crown. */}
      {[-1, 1].map((side) => (
        <Part
          key={side}
          material="teakDark"
          position={[side * (doorWidth / 2 - 0.04), (height - 0.3) / 2, 0]}
          scale={[0.12, height - 0.3, 0.34]}
        />
      ))}
      <Part
        material="teakCarved"
        position={[0, height - 0.15, 0]}
        scale={[doorWidth + 0.1, 0.5, 0.44]}
      />
      <Part material="gold" position={[0, height + 0.12, 0]} scale={[doorWidth + 0.2, 0.08, 0.5]} />
      <Part
        geometry="pyramid"
        material="teakDark"
        position={[0, height + 0.66, 0]}
        scale={[doorWidth * 0.82, 1.0, 0.3]}
      />
      <Part geometry="sphere" material="gold" position={[0, height + 1.2, 0]} scale={0.22} />
    </group>
  );
}

// ----- Joglo: tiered terracotta roof on teak pillars ------------------------------------------

/** Top extents of each tier relative to its base (must match `roofLower/roofMid/roofTop`). */
const LOWER_TOP = [0.46, 0.42] as const;
const MID_TOP = [0.62, 0.5] as const;
const TOP_TOP = [0.46, 0.1] as const;
/** The top tier overhangs the middle one, giving the stacked (tumpang) silhouette. */
const TOP_BASE = [0.72, 0.6] as const;

export function Joglo({
  center,
  size,
  eaveHeight,
  pillars,
}: {
  center: Vec2;
  size: Vec2;
  eaveHeight: number;
  pillars: readonly Vec2[];
}) {
  const [width, depth] = size;
  const lowerHeight = Math.min(width, depth) * 0.12 + 0.4;
  const upperWidth = width * LOWER_TOP[0];
  const upperDepth = depth * LOWER_TOP[1];
  const upperHeight = upperDepth * 0.95 + 0.5;
  const upperBase = eaveHeight + lowerHeight + 0.28;
  const midHeight = upperHeight * 0.42;
  const topBase = upperBase + midHeight + 0.1;
  const topWidth = upperWidth * TOP_BASE[0];
  const topDepth = upperDepth * TOP_BASE[1];
  const topHeight = upperHeight * 0.62;
  const ridgeY = topBase + topHeight;
  const ridgeLength = topWidth * TOP_TOP[0];

  const parts = useMemo(() => {
    const local = pillars.map(([x, z]) => [x - center[0], z - center[1]] as const);
    const at = (y: number, scale: Vec3) =>
      local.map(([x, z]): InstanceTransform => ({ position: [x, y, z], scale }));
    const xs = local.map(([x]) => x);
    const zs = local.map(([, z]) => z);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minZ = Math.min(...zs);
    const maxZ = Math.max(...zs);
    const beamY = eaveHeight + 0.06;
    const beams: InstanceTransform[] = [
      { position: [0, beamY, minZ], scale: [maxX - minX + 0.4, 0.22, 0.24] },
      { position: [0, beamY, maxZ], scale: [maxX - minX + 0.4, 0.22, 0.24] },
      { position: [minX, beamY, (minZ + maxZ) / 2], scale: [0.24, 0.22, maxZ - minZ + 0.4] },
      { position: [maxX, beamY, (minZ + maxZ) / 2], scale: [0.24, 0.22, maxZ - minZ + 0.4] },
    ];
    const eaveTrim: InstanceTransform[] = [
      { position: [0, eaveHeight + 0.04, depth / 2], scale: [width, 0.1, 0.1] },
      { position: [0, eaveHeight + 0.04, -depth / 2], scale: [width, 0.1, 0.1] },
      { position: [width / 2, eaveHeight + 0.04, 0], scale: [0.1, 0.1, depth] },
      { position: [-width / 2, eaveHeight + 0.04, 0], scale: [0.1, 0.1, depth] },
    ];
    return {
      umpak: at(0.15, [0.6, 0.3, 0.6]),
      pillars: at((eaveHeight + 0.1) / 2, [0.34, eaveHeight + 0.1, 0.34]),
      capitals: at(eaveHeight - 0.35, [0.42, 0.14, 0.42]),
      beams,
      eaveTrim,
    };
  }, [center, pillars, eaveHeight, width, depth]);

  const lowerScale: Vec3 = [width, lowerHeight, depth];
  const midScale: Vec3 = [upperWidth, midHeight, upperDepth];
  const topScale: Vec3 = [topWidth, topHeight, topDepth];
  return (
    <group position={[center[0], 0, center[1]]}>
      <Instances geometry={geometries.box} material={materials.stoneDark} items={parts.umpak} />
      <Instances geometry={geometries.post} material={materials.teak} items={parts.pillars} />
      <Instances geometry={geometries.box} material={materials.gold} items={parts.capitals} />
      <Instances geometry={geometries.box} material={materials.teakDark} items={parts.beams} />
      <Instances geometry={geometries.box} material={materials.gold} items={parts.eaveTrim} />
      {/* Lower, wide and shallow tier (penanggap). */}
      <Part geometry="roofLower" material="roof" position={[0, eaveHeight, 0]} scale={lowerScale} />
      <Part
        geometry="roofLower"
        material={extraMaterials.roofUnder}
        position={[0, eaveHeight, 0]}
        scale={lowerScale}
      />
      {/* Carved band between the tiers. */}
      <Part
        material="teakCarved"
        position={[0, eaveHeight + lowerHeight + 0.14, 0]}
        scale={[upperWidth, 0.3, upperDepth]}
      />
      {/* Steep upper tiers (brunjung) with ridge and crowns. */}
      <Part geometry="roofMid" material="roof" position={[0, upperBase, 0]} scale={midScale} />
      <Part
        geometry="roofMid"
        material={extraMaterials.roofUnder}
        position={[0, upperBase, 0]}
        scale={midScale}
      />
      <Part
        material="gold"
        position={[0, topBase - 0.05, 0]}
        scale={[upperWidth * MID_TOP[0] + 0.1, 0.1, upperDepth * MID_TOP[1] + 0.1]}
      />
      <Part geometry="roofTop" material="roof" position={[0, topBase, 0]} scale={topScale} />
      <Part
        geometry="roofTop"
        material={extraMaterials.roofUnder}
        position={[0, topBase, 0]}
        scale={topScale}
      />
      <Part
        material="roof"
        position={[0, ridgeY + 0.08, 0]}
        scale={[ridgeLength + 0.3, 0.2, 0.3]}
      />
      {[-1, 0, 1].map((side) => (
        <Part
          key={side}
          geometry="pyramid"
          material="gold"
          position={[(side * ridgeLength) / 2, ridgeY + (side === 0 ? 0.55 : 0.4), 0]}
          scale={side === 0 ? [0.36, 0.7, 0.36] : [0.24, 0.45, 0.24]}
        />
      ))}
    </group>
  );
}

// ----- Gebyok: carved teak screen -------------------------------------------------------------

export function Gebyok({
  position,
  width,
  height,
  rotationY = 0,
}: {
  position: Vec3;
  width: number;
  height: number;
  rotationY?: number;
}) {
  const parts = useMemo(() => {
    const columns = Math.max(3, Math.round(width / 1.05));
    const cell = width / columns;
    const rows = [
      { y: height * 0.68, h: height * 0.5 },
      { y: height * 0.22, h: height * 0.26 },
    ];
    const panels: InstanceTransform[] = [];
    const insets: InstanceTransform[] = [];
    const rosettes: InstanceTransform[] = [];
    const posts: InstanceTransform[] = [];
    for (let column = 0; column < columns; column += 1) {
      const x = -width / 2 + cell * (column + 0.5);
      for (const row of rows) {
        panels.push({ position: [x, row.y, 0.1], scale: [cell * 0.78, row.h * 0.86, 0.06] });
        insets.push({ position: [x, row.y, 0.135], scale: [cell * 0.52, row.h * 0.6, 0.04] });
        rosettes.push({ position: [x, row.y, 0.16], scale: [0.16, 0.16, 0.06] });
      }
    }
    for (let column = 0; column <= columns; column += 1) {
      posts.push({
        position: [-width / 2 + cell * column, height / 2, 0.08],
        scale: [0.1, height, 0.22],
      });
    }
    return { panels, insets, rosettes, posts };
  }, [width, height]);

  return (
    <group position={position} rotation-y={rotationY}>
      <Part material="teakCarved" position={[0, height / 2, 0]} scale={[width, height, 0.18]} />
      <Instances geometry={geometries.box} material={materials.teak} items={parts.panels} />
      <Instances geometry={geometries.box} material={materials.teakDark} items={parts.insets} />
      <Instances geometry={geometries.flower} material={materials.gold} items={parts.rosettes} />
      <Instances geometry={geometries.box} material={materials.teakDark} items={parts.posts} />
      <Part material="teakDark" position={[0, 0.1, 0.02]} scale={[width + 0.2, 0.2, 0.3]} />
      <Part material="gold" position={[0, height + 0.04, 0]} scale={[width + 0.1, 0.1, 0.24]} />
      <Part
        geometry="pyramid"
        material="teakCarved"
        position={[0, height + 0.5, 0]}
        scale={[width * 0.55, 0.9, 0.2]}
      />
      <Part geometry="flower" material="gold" position={[0, height + 0.55, 0.12]} scale={0.3} />
    </group>
  );
}

// ----- Reception furniture, drapes and chandeliers --------------------------------------------

export function RoundTables({ positions }: { positions: readonly Vec2[] }) {
  const parts = useMemo(() => {
    const tops: InstanceTransform[] = [];
    const skirts: InstanceTransform[] = [];
    const centerpieces: InstanceTransform[] = [];
    const seats: InstanceTransform[] = [];
    const backs: InstanceTransform[] = [];
    for (const [x, z] of positions) {
      tops.push({ position: [x, 0.76, z], scale: [1.6, 0.06, 1.6] });
      skirts.push({ position: [x, 0.37, z], scale: [1.5, 0.74, 1.5] });
      centerpieces.push({ position: [x, 0.92, z], scale: [0.26, 0.3, 0.26] });
      for (let chair = 0; chair < 6; chair += 1) {
        const angle = (chair / 6) * Math.PI * 2 + Math.PI / 6;
        const rotationY = Math.atan2(Math.cos(angle), Math.sin(angle));
        const cx = x + Math.cos(angle) * 1.05;
        const cz = z + Math.sin(angle) * 1.05;
        seats.push({
          position: [cx, 0.45, cz],
          rotation: [0, rotationY, 0],
          scale: [0.44, 0.08, 0.44],
        });
        backs.push({
          position: [x + Math.cos(angle) * 1.27, 0.75, z + Math.sin(angle) * 1.27],
          rotation: [0, rotationY, 0],
          scale: [0.44, 0.6, 0.06],
        });
      }
    }
    return { tops, skirts, centerpieces, seats, backs };
  }, [positions]);
  return (
    <group>
      <Instances geometry={geometries.cylinder} material={materials.cloth} items={parts.tops} />
      <Instances geometry={geometries.cylinder} material={materials.cloth} items={parts.skirts} />
      <Instances
        geometry={geometries.flower}
        material={materials.gold}
        items={parts.centerpieces}
      />
      <Instances geometry={geometries.box} material={materials.gold} items={parts.seats} />
      <Instances geometry={geometries.box} material={materials.teakCarved} items={parts.backs} />
    </group>
  );
}

export function Drapes({ positions, height }: { positions: readonly Vec2[]; height: number }) {
  const items = useMemo(
    () =>
      positions.map(([x, z]): InstanceTransform => ({
        position: [x, 0, z],
        scale: [1.3, height, 1.3],
      })),
    [positions, height],
  );
  return <Instances geometry={geometries.drape} material={extraMaterials.drape} items={items} />;
}

const CHANDELIER_BULBS: InstanceTransform[] = Array.from({ length: 8 }, (_, index) => {
  const angle = (index / 8) * Math.PI * 2;
  return { position: [Math.cos(angle) * 0.45, 0, Math.sin(angle) * 0.45], scale: 0.16 };
});

export function Chandelier({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <Part geometry="post" material="teakDark" position={[0, 0.55, 0]} scale={[0.04, 1.0, 0.04]} />
      <Part geometry="cylinder" material="gold" position={[0, 0.05, 0]} scale={[1.0, 0.05, 1.0]} />
      <Part
        geometry="pyramid"
        material="gold"
        position={[0, -0.25, 0]}
        rotation={[Math.PI, 0, 0]}
        scale={[0.34, 0.5, 0.34]}
      />
      <Instances
        geometry={geometries.sphere}
        material={extraMaterials.lanternGlow}
        items={CHANDELIER_BULBS}
      />
      <Part geometry="sphere" material={extraMaterials.lanternHalo} scale={1.6} />
    </group>
  );
}
