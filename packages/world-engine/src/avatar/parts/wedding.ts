import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  SphereGeometry,
  Vector3,
} from 'three';

import { seeded } from '../../scenes/decor/Part';
import type { MaterialSpec } from '../materials';
import { BONE, joint } from '../rig';
import type { BodyDims } from '../rig';
import {
  chainWeights,
  curveTube,
  finalize,
  lerp,
  rigid,
  ringSurface,
  sampleProfile,
} from '../shapes';
import type { WeightFn } from '../shapes';
import { blob, crownCover, foldedBand } from './accessories';
import { beskapParts, jarik, kebayaParts, priaShell, slipOn } from './clothing';
import { drawnBack, hairParts, onSkull } from './hair';
import { facePoint } from './head';
import type { ItemBuilder, Part } from './types';

/** Wedding attire of the couple (design §5), after `apps/assets/pengantin-adat-jawa.png`. */

const GOLD: MaterialSpec = { kind: 'gold' };
const MELATI: MaterialSpec = { kind: 'melati', colour: '#ffffff' };
const LEATHER: MaterialSpec = { kind: 'leather' };
const UP_Y = new Vector3(0, 1, 0);
const headBone = rigid(BONE.head);
const chestBone = rigid(BONE.chest);
const pelvisBone = rigid(BONE.pelvis);

const BUD = new Color('#fff8e2');
const BUD_SHADE = new Color('#8f9a66');

/** Threaded jasmine: a tube pinched between buds, shaded green-grey in the pinches. */
function ronce(path: readonly Vector3[], radius: number, buds: number, weights: WeightFn): Part {
  const tube = curveTube(new CatmullRomCurve3([...path]), {
    segments: buds * 3,
    radial: 4,
    radius: (t) => {
      const r = radius * (0.5 + 0.5 * Math.abs(Math.sin(Math.PI * buds * t)));
      return [r, r];
    },
  });
  const along = tube.getAttribute('uv');
  const bud = new Color();
  return {
    material: MELATI,
    geometry: finalize(tube, weights, {
      color: (_, index) =>
        bud.copy(BUD_SHADE).lerp(BUD, Math.abs(Math.sin(Math.PI * buds * along.getY(index)))),
    }),
  };
}

/** A six-petal gold flower facing +z. */
function goldStar(centre: Vector3, size: number): BufferGeometry[] {
  const petals = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3;
    const petal = new SphereGeometry(size, 4, 2);
    petal.scale(1, 0.38, 0.3);
    petal.rotateZ(angle);
    petal.translate(centre.x + Math.cos(angle) * size, centre.y + Math.sin(angle) * size, centre.z);
    return petal;
  });
  const middle = new SphereGeometry(size * 0.46, 5, 3);
  middle.translate(centre.x, centre.y, centre.z + size * 0.2);
  return [...petals, middle];
}

/** Batik crown with a dark folded band, gold edge, mondolan and a jewelled front. */
const blangkonPengantin: ItemBuilder = ({ dims }, variant) => {
  const { center, rx, ry, rz } = dims.head;
  const material: MaterialSpec = {
    kind: 'cloth',
    colour: variant?.swatch ?? '#3d2a16',
    pattern: variant?.pattern,
  };
  const grow = 0.009;
  const band = new Color(0.32, 0.34, 0.5);
  const edge = curveTube(
    new CatmullRomCurve3(
      Array.from({ length: 11 }, (_, i) => onSkull(dims, -100 + i * 20, 24, grow + 0.001)),
    ),
    { segments: 16, radial: 4, up: UP_Y, radius: () => [0.0036, 0.0016] },
  );
  const front = new Vector3(0, center[1] + ry * 0.62, center[2] + rz * 0.86 + grow + 0.008);
  const mondolan = blob(0, center[1] - ry * 0.12, center[2] - rz - 0.026, 0.044, 0.04, 0.036);
  return [
    { material, geometry: finalize(crownCover(dims, grow, 0.34), headBone) },
    { material, geometry: finalize(mondolan, headBone) },
    ...foldedBand(dims, grow + 0.001, 0.012).map((geometry) => ({
      material,
      geometry: finalize(geometry, headBone, { color: band }),
    })),
    { material: GOLD, geometry: finalize(edge, headBone) },
    ...goldStar(front, 0.0125 * (rx / 0.08)).map((geometry) => ({
      material: GOLD,
      geometry: finalize(geometry, headBone),
    })),
  ];
};

const beskapBeludru: ItemBuilder = ({ dims }, variant) =>
  beskapParts(dims, { kind: 'velvet', colour: variant?.swatch ?? '#141110', pattern: 'beskap' });

/** Gold sash around the waist, over the beskap. */
const stagen: ItemBuilder = ({ dims }) => {
  const profile = priaShell(dims, 0.13);
  const { pelvis } = dims.joints;
  const y = pelvis[1] + 0.02;
  const at = (height: number, grow: number) => {
    const ring = sampleProfile(profile, height);
    return { ...ring, rx: ring.rx + grow, rzf: ring.rzf + grow, rzb: ring.rzb + grow };
  };
  const band = ringSurface([at(y - 0.018, 0.0035), at(y + 0.018, 0.0035)], {
    segments: 26,
    rows: 2,
  });
  return [{ material: GOLD, geometry: finalize(band, chainWeights(dims, ['pelvis', 'spine'])) }];
};

/** Worn at the back on the right, hilt up, the sheath slanting down across the hip. */
const keris: ItemBuilder = ({ dims }) => {
  const { pelvis } = dims.joints;
  const dark = new Color('#3a2412');
  const at = new Vector3(-0.09, pelvis[1] + 0.12, -0.16);
  const tilt = 0.32;
  const place = (geometry: BufferGeometry) => {
    geometry.rotateZ(-tilt);
    geometry.translate(at.x, at.y, at.z);
    return finalize(geometry, pelvisBone, { color: dark });
  };
  const sheath = new CylinderGeometry(0.014, 0.009, 0.36, 6);
  sheath.scale(1, 1, 0.42);
  sheath.translate(0, -0.2, 0);
  const crosspiece = new SphereGeometry(1, 8, 5);
  crosspiece.scale(0.058, 0.016, 0.014);
  crosspiece.translate(0.012, -0.015, 0);
  const hilt = curveTube(
    new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(0.002, 0.05, 0),
      new Vector3(0.018, 0.092, 0),
    ]),
    { segments: 6, radial: 5, radius: (t) => [0.0105 - 0.004 * t, 0.0105 - 0.004 * t] },
  );
  hilt.rotateZ(-tilt);
  hilt.translate(at.x, at.y, at.z);
  return [
    { material: LEATHER, geometry: place(sheath) },
    { material: LEATHER, geometry: place(crosspiece) },
    { material: GOLD, geometry: finalize(hilt, pelvisBone) },
  ];
};

/** Two strands from the collar to the waist, each ending in a small tassel. */
const roncePria: ItemBuilder = ({ dims }) => {
  const s = dims.height / 1.7;
  const neck = dims.joints.neck[1];
  const chest = dims.joints.chest[1];
  const { pelvis } = dims.joints;
  return [-1, 1].flatMap((side) => {
    const strand = (offset: number, drop: number) =>
      ronce(
        [
          new Vector3(side * (0.062 + offset) * s, neck + 0.02, 0.022),
          new Vector3(side * (0.098 + offset) * s, neck - 0.09, 0.098),
          new Vector3(side * (0.086 + offset) * s, chest, 0.128),
          new Vector3(side * (0.072 + offset) * s, pelvis[1] + 0.12, 0.128),
          new Vector3(side * (0.07 + offset) * s, pelvis[1] - drop, 0.136),
        ],
        0.0092,
        17,
        chestBone,
      );
    return [strand(-0.012, 0), strand(0.012, 0.05)];
  });
};

const selopBordir = slipOn(true);

/** Drawn-back hair over a high bun bound with jasmine. */
const sanggulPengantin: ItemBuilder = (context) => {
  const { dims } = context;
  const { center, ry, rz } = dims.head;
  const hub = new Vector3(0, center[1] + ry * 0.12, center[2] - rz - 0.036);
  const random = seeded(0.29);
  const wrap = ronce(
    Array.from({ length: 18 }, (_, i) => {
      const t = i / 17;
      const angle = t * Math.PI * 2 * 2.5 + random() * 0.08;
      const radius = lerp(0.056, 0.022, t);
      return new Vector3(
        hub.x + radius * Math.cos(angle),
        hub.y + radius * Math.sin(angle) * 0.9,
        hub.z - 0.03 - (1 - t) * 0.004,
      );
    }),
    0.0092,
    20,
    headBone,
  );
  return [
    ...hairParts(dims, [...drawnBack(context), blob(hub.x, hub.y, hub.z, 0.058, 0.052, 0.038)]),
    wrap,
  ];
};

/** Gold crest over the forehead, tallest at the middle, and a jasmine band behind it. */
const siger: ItemBuilder = ({ dims }) => {
  const arc = (elevation: number, lift: number, from: number, to: number, points: number) =>
    Array.from({ length: points }, (_, i) =>
      onSkull(dims, lerp(from, to, i / (points - 1)), elevation, lift),
    );
  const crest = curveTube(new CatmullRomCurve3(arc(60, 0.011, -66, 66, 11)), {
    segments: 22,
    radial: 4,
    up: UP_Y,
    radius: (t) => [0.0042 + 0.0105 * Math.sin(Math.PI * t) ** 4, 0.0018],
  });
  return [
    { material: GOLD, geometry: finalize(crest, headBone) },
    ronce(arc(74, 0.011, -118, 118, 13), 0.0102, 24, headBone),
  ];
};

/** Five gold flowers trembling on wires above the crown. */
const cundukMentul: ItemBuilder = ({ dims }) => {
  const parts: Part[] = [];
  for (let i = 0; i < 5; i += 1) {
    const azimuth = -44 + i * 22;
    const base = onSkull(dims, azimuth, 70, 0.012);
    const fan = (azimuth / 44) * 0.052;
    const top = base.clone().add(new Vector3(fan, 0.076 - Math.abs(fan) * 0.4, 0.008));
    const wire = curveTube(new CatmullRomCurve3([base, base.clone().lerp(top, 0.5), top]), {
      segments: 3,
      radial: 3,
      radius: () => [0.001, 0.001],
    });
    parts.push({ material: GOLD, geometry: finalize(wire, headBone) });
    for (const geometry of goldStar(top, 0.0115)) {
      parts.push({ material: GOLD, geometry: finalize(geometry, headBone) });
    }
  }
  return parts;
};

/** Forehead patch cut from the face surface, lifted 0.6 mm; the alpha map draws the cusps. */
const paes: ItemBuilder = ({ dims }) => {
  const columns = 14;
  const rows = 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows;
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns;
      const point = facePoint(dims, lerp(-0.72, 0.72, u), lerp(0.4, 0.82, v), 0.0006);
      positions.push(point.x, point.y, point.z);
      uvs.push(u, v);
    }
  }
  const indices: number[] = [];
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * stride + column;
      indices.push(a, a + 1, a + stride, a + 1, a + stride + 1, a + stride);
    }
  }
  const patch = new BufferGeometry();
  patch.setAttribute('position', new Float32BufferAttribute(positions, 3));
  patch.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  patch.setIndex(indices);
  patch.computeVertexNormals();
  return [{ material: { kind: 'paes', colour: '#1a120d' }, geometry: finalize(patch, headBone) }];
};

const TRAIN = 0.5;

/** Fine gold chain with a pendant in the neckline. */
function kalung(dims: BodyDims): Part[] {
  const neck = dims.joints.neck[1];
  const cz = dims.joints.neck[2];
  const chain = curveTube(
    new CatmullRomCurve3([
      new Vector3(-0.052, neck + 0.02, cz + 0.03),
      new Vector3(-0.05, neck - 0.04, cz + 0.07),
      new Vector3(0, neck - 0.08, cz + 0.094),
      new Vector3(0.05, neck - 0.04, cz + 0.07),
      new Vector3(0.052, neck + 0.02, cz + 0.03),
    ]),
    { segments: 14, radial: 3, radius: () => [0.0017, 0.0017] },
  );
  const pendant = goldStar(new Vector3(0, neck - 0.088, cz + 0.097), 0.0086);
  return [chain, ...pendant].map((geometry) => ({
    material: GOLD,
    geometry: finalize(geometry, chestBone),
  }));
}

const kebayaBeludru: ItemBuilder = ({ dims }, variant) => [
  ...kebayaParts(dims, {
    body: { kind: 'velvet', colour: variant?.swatch ?? '#141110', pattern: 'kebaya' },
    lace: { kind: 'lace', colour: '#2a1a12' },
    train: TRAIN,
  }),
  ...kalung(dims),
];

/** From the sanggul over the right shoulder to the knee, in three strands. */
const roncePanjang: ItemBuilder = ({ dims }) => {
  const { center, ry } = dims.head;
  const neck = dims.joints.neck[1];
  const chest = dims.joints.chest[1];
  const { pelvis, knee_l: knee } = dims.joints;
  const shoulder = joint(dims, 'shoulder_r');
  const weights = chainWeights(dims, ['pelvis', 'spine', 'chest', 'neck', 'head']);
  return [0, 1, 2].map((strand) => {
    const spread = (strand - 1) * 0.014;
    return ronce(
      [
        new Vector3(-0.09 + spread, center[1] + ry * 0.42, center[2] - 0.062),
        new Vector3(-0.098 + spread, center[1] - ry * 0.3, center[2] - 0.012),
        new Vector3(shoulder.x * 0.62 + spread, neck - 0.015, 0.068),
        new Vector3(shoulder.x * 0.62 + spread, chest + 0.02, 0.128),
        new Vector3(shoulder.x * 0.58 + spread, pelvis[1] + 0.06, 0.14),
        new Vector3(shoulder.x * 0.58 + spread, knee[1] + 0.09 + strand * 0.03, 0.156),
      ],
      0.0092,
      28,
      weights,
    );
  });
};

export const WEDDING_BUILDERS: Readonly<Record<string, ItemBuilder>> = {
  'blangkon-pengantin': blangkonPengantin,
  'beskap-beludru-bordir': beskapBeludru,
  'jarik-sogan-pengantin': jarik,
  stagen,
  keris,
  'ronce-pria': roncePria,
  'selop-bordir': selopBordir,
  'sanggul-pengantin': sanggulPengantin,
  siger,
  'cunduk-mentul': cundukMentul,
  paes,
  'kebaya-beludru-bordir': kebayaBeludru,
  'jarik-ekor': jarik,
  'ronce-panjang': roncePanjang,
};
