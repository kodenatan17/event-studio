import { useMemo } from 'react';

import type { Vec2 } from '../../navigation/walk';
import type { Vec3 } from '../../templates/types';
import { extraMaterials, geometries, janurCurve, materials } from '../materials';
import { Instances } from './Instances';
import type { InstanceTransform } from './Instances';
import { Part, seeded } from './Part';

// ----- Janur kuning (penjor) ------------------------------------------------------------------

const JANUR_TASSELS: InstanceTransform[] = Array.from({ length: 11 }, (_, index) => {
  const t = 0.5 + (index / 10) * 0.48;
  const point = janurCurve.getPointAt(t);
  const length = 0.45 + (index % 3) * 0.18;
  return {
    position: [point.x, point.y - length / 2, point.z + (index % 2 ? 0.05 : -0.05)],
    scale: [0.13, length, 0.13],
  };
});

const JANUR_FRONDS: InstanceTransform[] = Array.from({ length: 8 }, (_, index) => {
  const t = 0.18 + (index / 7) * 0.3;
  const point = janurCurve.getPointAt(t);
  const side = index % 2 ? 1 : -1;
  return {
    position: [point.x + side * 0.12, point.y - 0.25, point.z],
    rotation: [0, 0, side * 0.5],
    scale: [0.1, 0.6, 0.1],
  };
});

const JANUR_TIP = janurCurve.getPointAt(1);
const JANUR_BLOOMS: InstanceTransform[] = Array.from({ length: 6 }, (_, index) => {
  const angle = (index / 6) * Math.PI * 2;
  return {
    position: [
      JANUR_TIP.x + Math.cos(angle) * 0.16,
      JANUR_TIP.y - 0.55 - (index % 2) * 0.25,
      Math.sin(angle) * 0.16,
    ],
    scale: 0.13,
  };
});

export function Janur({
  position,
  rotationY,
  scale = 1,
}: {
  position: Vec3;
  rotationY: number;
  scale?: number;
}) {
  return (
    <group position={position} rotation-y={rotationY} scale={scale}>
      <Part material="stoneDark" position={[0, 0.18, 0]} scale={[0.45, 0.36, 0.45]} />
      <mesh geometry={geometries.janurPole} material={materials.janur} dispose={null} />
      <Instances geometry={geometries.tassel} material={materials.janur} items={JANUR_TASSELS} />
      <Instances geometry={geometries.tassel} material={materials.janur} items={JANUR_FRONDS} />
      <Part
        geometry="tassel"
        material={extraMaterials.janurTip}
        position={[JANUR_TIP.x, JANUR_TIP.y - 0.55, 0]}
        scale={[0.34, 1.1, 0.34]}
      />
      <Instances
        geometry={geometries.flower}
        material={extraMaterials.melati}
        items={JANUR_BLOOMS}
      />
    </group>
  );
}

// ----- Lanterns -------------------------------------------------------------------------------

export function Lanterns({ positions }: { positions: readonly Vec2[] }) {
  const parts = useMemo(() => {
    const at = (y: number, scale: Vec3) =>
      positions.map(([x, z]): InstanceTransform => ({ position: [x, y, z], scale }));
    return {
      base: at(0.04, [0.3, 0.08, 0.3]),
      post: at(0.45, [0.09, 0.9, 0.09]),
      plate: at(0.88, [0.32, 0.05, 0.32]),
      glow: at(1.07, [0.24, 0.34, 0.24]),
      cap: at(1.33, [0.38, 0.22, 0.38]),
      halo: at(1.07, [0.6, 0.6, 0.6]),
    };
  }, [positions]);

  return (
    <group>
      <Instances geometry={geometries.box} material={materials.stoneDark} items={parts.base} />
      <Instances geometry={geometries.post} material={materials.teakDark} items={parts.post} />
      <Instances geometry={geometries.box} material={materials.teakDark} items={parts.plate} />
      <Instances
        geometry={geometries.box}
        material={extraMaterials.lanternGlow}
        items={parts.glow}
      />
      <Instances geometry={geometries.pyramid} material={materials.teakDark} items={parts.cap} />
      <Instances
        geometry={geometries.sphere}
        material={extraMaterials.lanternHalo}
        items={parts.halo}
      />
    </group>
  );
}

// ----- Mandala floor medallion ----------------------------------------------------------------

function radial(count: number, radius: number, y: number, width: number, length: number) {
  return Array.from({ length: count }, (_, index): InstanceTransform => {
    const angle = (index / count) * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    return { position: [x, y, z], rotation: [0, Math.atan2(x, z), 0], scale: [width, 1, length] };
  });
}

const MANDALA_OUTER_PETALS = radial(16, 0.6, 0.016, 0.2, 0.36);
const MANDALA_INNER_PETALS = radial(8, 0.27, 0.02, 0.17, 0.32);
const MANDALA_DOTS = radial(28, 0.885, 0.013, 0.05, 0.05);
const MANDALA_DISCS: [number, number, keyof typeof extraMaterials][] = [
  [1.0, 0.006, 'mandalaC'],
  [0.95, 0.008, 'mandalaD'],
  [0.82, 0.01, 'mandalaA'],
  [0.76, 0.012, 'mandalaB'],
  [0.42, 0.018, 'mandalaD'],
  [0.12, 0.022, 'mandalaA'],
];

export function Mandala({ center, radius }: { center: Vec2; radius: number }) {
  return (
    <group position={[center[0], 0, center[1]]} scale={[radius, 1, radius]}>
      {MANDALA_DISCS.map(([size, y, material]) => (
        <Part
          key={`${size}`}
          geometry="disc"
          material={extraMaterials[material]}
          position={[0, y, 0]}
          scale={[size * 2, 1, size * 2]}
        />
      ))}
      <Instances
        geometry={geometries.petal}
        material={extraMaterials.mandalaA}
        items={MANDALA_OUTER_PETALS}
      />
      <Instances
        geometry={geometries.petal}
        material={extraMaterials.mandalaC}
        items={MANDALA_INNER_PETALS}
      />
      <Instances
        geometry={geometries.disc}
        material={extraMaterials.mandalaC}
        items={MANDALA_DOTS}
      />
    </group>
  );
}

// ----- Lotus pond -----------------------------------------------------------------------------

export function Pond({ center, size }: { center: Vec2; size: Vec2 }) {
  const [width, depth] = size;
  const parts = useMemo(() => {
    const random = seeded(center[0] * 7 + center[1] * 13 + 1);
    const pads: InstanceTransform[] = [];
    const lotus: InstanceTransform[] = [];
    for (let index = 0; index < 9; index += 1) {
      const x = (random() - 0.5) * (width - 0.8);
      const z = (random() - 0.5) * (depth - 0.8);
      const padSize = 0.35 + random() * 0.25;
      pads.push({ position: [x, 0.295, z], scale: [padSize, 1, padSize] });
      if (index % 2 === 0) {
        lotus.push({ position: [x + 0.06, 0.34, z], scale: [0.22, 0.17, 0.22] });
      }
    }
    return { pads, lotus };
  }, [center, width, depth]);

  return (
    <group position={[center[0], 0, center[1]]}>
      <Part material="stoneDark" position={[0, 0.14, 0]} scale={[width, 0.28, depth]} />
      <Part
        geometry="plane"
        material="water"
        position={[0, 0.285, 0]}
        scale={[width - 0.3, 1, depth - 0.3]}
      />
      <Instances geometry={geometries.disc} material={extraMaterials.lilyPad} items={parts.pads} />
      <Instances geometry={geometries.flower} material={extraMaterials.lotus} items={parts.lotus} />
    </group>
  );
}

// ----- Plumeria (kamboja) trees ---------------------------------------------------------------

export function Plumerias({ positions }: { positions: readonly Vec2[] }) {
  const parts = useMemo(() => {
    const trunks: InstanceTransform[] = [];
    const branches: InstanceTransform[] = [];
    const leaves: InstanceTransform[] = [];
    const leavesDark: InstanceTransform[] = [];
    const flowers: InstanceTransform[] = [];
    positions.forEach(([x, z], tree) => {
      const random = seeded(tree + x * 3 + z * 5 + 11);
      const lean = (random() - 0.5) * 0.2;
      trunks.push({ position: [x, 0.9, z], rotation: [0, 0, lean], scale: [0.22, 1.8, 0.22] });
      for (let branch = 0; branch < 3; branch += 1) {
        const angle = (branch / 3) * Math.PI * 2 + random();
        const dx = Math.cos(angle) * 0.35;
        const dz = Math.sin(angle) * 0.35;
        branches.push({
          position: [x + dx, 2.1, z + dz],
          rotation: [Math.sin(angle) * 0.6, 0, -Math.cos(angle) * 0.6],
          scale: [0.11, 1.0, 0.11],
        });
      }
      for (let cluster = 0; cluster < 5; cluster += 1) {
        const angle = (cluster / 5) * Math.PI * 2 + random() * 0.6;
        const reach = cluster === 0 ? 0 : 0.75 + random() * 0.25;
        const cx = x + Math.cos(angle) * reach;
        const cz = z + Math.sin(angle) * reach;
        const cy = 2.65 + random() * 0.35 + (cluster === 0 ? 0.3 : 0);
        const size = 0.95 + random() * 0.35;
        (cluster % 2 ? leavesDark : leaves).push({
          position: [cx, cy, cz],
          scale: [size * 1.25, size * 0.6, size * 1.25],
        });
        for (let bloom = 0; bloom < 4; bloom += 1) {
          const bloomAngle = random() * Math.PI * 2;
          const r = random() * size * 0.5;
          flowers.push({
            position: [
              cx + Math.cos(bloomAngle) * r,
              cy + size * 0.22 + random() * 0.08,
              cz + Math.sin(bloomAngle) * r,
            ],
            rotation: [random(), random(), 0],
            scale: 0.17,
          });
        }
      }
    });
    return { trunks, branches, leaves, leavesDark, flowers };
  }, [positions]);

  return (
    <group>
      <Instances geometry={geometries.post} material={extraMaterials.bark} items={parts.trunks} />
      <Instances geometry={geometries.post} material={extraMaterials.bark} items={parts.branches} />
      <Instances geometry={geometries.foliage} material={materials.leaf} items={parts.leaves} />
      <Instances
        geometry={geometries.foliage}
        material={extraMaterials.leafDark}
        items={parts.leavesDark}
      />
      <Instances
        geometry={geometries.flower}
        material={extraMaterials.melati}
        items={parts.flowers}
      />
    </group>
  );
}

/** Distant tree line silhouettes on the horizon. */
export function TreeLine({ positions }: { positions: readonly Vec2[] }) {
  const items = useMemo(
    () =>
      positions.map(([x, z], index): InstanceTransform => {
        const size = 4 + (index % 4) * 1.1;
        return { position: [x, size * 0.5, z], scale: [size, size * 1.35, size] };
      }),
    [positions],
  );
  return (
    <Instances geometry={geometries.sphere} material={extraMaterials.treeline} items={items} />
  );
}

// ----- Melati flower clusters and gentong pots ------------------------------------------------

function bouquet(x: number, y: number, z: number, out: InstanceTransform[], spread = 0.2) {
  for (let index = 0; index < 7; index += 1) {
    const angle = (index / 7) * Math.PI * 2;
    const r = index === 0 ? 0 : spread;
    out.push({
      position: [x + Math.cos(angle) * r, y + (index === 0 ? 0.12 : 0.04), z + Math.sin(angle) * r],
      scale: 0.14,
    });
  }
}

export function Flowers({ positions }: { positions: readonly Vec3[] }) {
  const parts = useMemo(() => {
    const blooms: InstanceTransform[] = [];
    const leaves = positions.map(([x, y, z]): InstanceTransform => {
      bouquet(x, y + 0.08, z, blooms);
      return { position: [x, y, z], scale: [0.55, 0.3, 0.55] };
    });
    return { blooms, leaves };
  }, [positions]);
  return (
    <group>
      <Instances geometry={geometries.foliage} material={materials.leaf} items={parts.leaves} />
      <Instances
        geometry={geometries.flower}
        material={extraMaterials.melati}
        items={parts.blooms}
      />
    </group>
  );
}

export function Gentong({ positions }: { positions: readonly Vec2[] }) {
  const parts = useMemo(() => {
    const blooms: InstanceTransform[] = [];
    const pots: InstanceTransform[] = [];
    const rims: InstanceTransform[] = [];
    const leaves: InstanceTransform[] = [];
    for (const [x, z] of positions) {
      pots.push({ position: [x, 0.3, z], scale: [0.62, 0.6, 0.62] });
      rims.push({ position: [x, 0.6, z], scale: [0.42, 0.08, 0.42] });
      leaves.push({ position: [x, 0.78, z], scale: [0.7, 0.42, 0.7] });
      bouquet(x, 0.88, z, blooms, 0.24);
    }
    return { pots, rims, leaves, blooms };
  }, [positions]);
  return (
    <group>
      <Instances geometry={geometries.sphere} material={materials.terracotta} items={parts.pots} />
      <Instances
        geometry={geometries.cylinder}
        material={materials.terracotta}
        items={parts.rims}
      />
      <Instances geometry={geometries.foliage} material={materials.leaf} items={parts.leaves} />
      <Instances
        geometry={geometries.flower}
        material={extraMaterials.melati}
        items={parts.blooms}
      />
    </group>
  );
}
