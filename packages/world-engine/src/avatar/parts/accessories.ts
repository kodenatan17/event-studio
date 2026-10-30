import {
  BoxGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';

import type { MaterialSpec } from '../materials';
import { BONE, joint } from '../rig';
import type { BodyDims } from '../rig';
import {
  chainWeights,
  curveTube,
  finalize,
  lerp,
  mirrorX,
  rigid,
  ringSurface,
  smoothstep,
} from '../shapes';
import type { Ring } from '../shapes';
import type { WardrobeVariant } from '../wardrobe';
import { facePoint, sculptHead } from './head';
import type { ItemBuilder } from './types';

const GOLD: MaterialSpec = { kind: 'gold' };
/** Shared with shoes: one draw call, the colour is in the vertices. */
const LEATHER: MaterialSpec = { kind: 'leather' };
const headBone = rigid(BONE.head);
const chestBone = rigid(BONE.chest);
const scaleOf = (dims: BodyDims) => dims.height / 1.7;

function fabric(variant: WardrobeVariant | undefined, fallback: string): MaterialSpec {
  return { kind: 'cloth', colour: variant?.swatch ?? fallback, pattern: variant?.pattern };
}

/** Rings hugging the skull from `from` to `to` (normalized heights), `grow` metres out. */
function skullRings(dims: BodyDims, from: number, to: number, grow: number, count = 13): Ring[] {
  const { center, rx, ry, rz } = dims.head;
  return Array.from({ length: count }, (_, i) => {
    const ny = lerp(from, to, i / (count - 1));
    const ring = Math.sqrt(Math.max(0.0004, 1 - ny * ny));
    return {
      y: center[1] + ny * (ry + grow),
      rx: (rx + grow) * ring,
      rzf: (rz + grow) * ring,
      rzb: (rz + grow) * ring,
      cx: center[0],
      cz: center[2],
    };
  });
}

/** Crown cover shared by the cloth headwear: a brim line above the brow, closed on top. */
export function crownCover(dims: BodyDims, grow: number, brim: number): BufferGeometry {
  return ringSurface(skullRings(dims, brim, 0.995, grow), {
    segments: 26,
    rows: 10,
    closeTop: true,
    uRepeat: 2,
    vScale: 0.09,
  });
}

/** Stiff oval cap, flat-topped, worn straight. */
const peci: ItemBuilder = ({ dims }, variant) => {
  const { center, rx, ry, rz } = dims.head;
  const y = center[1] + ry * 0.48;
  const height = ry * 0.86;
  const grow = 0.009;
  const profile: Ring[] = [
    { y, rx: rx * 0.97 + grow, rzf: rz * 0.92 + grow, rzb: rz * 0.92 + grow, cz: center[2] },
    {
      y: y + height * 0.8,
      rx: rx * 0.93 + grow,
      rzf: rz * 0.89 + grow,
      rzb: rz * 0.89 + grow,
      cz: center[2],
    },
    {
      y: y + height,
      rx: rx * 0.84 + grow,
      rzf: rz * 0.8 + grow,
      rzb: rz * 0.8 + grow,
      cz: center[2],
    },
  ];
  const cap = ringSurface(profile, {
    segments: 26,
    rows: 5,
    closeTop: true,
  });
  return [{ material: velvetOf(variant), geometry: finalize(cap, headBone) }];
};

function velvetOf(variant: WardrobeVariant | undefined): MaterialSpec {
  return { kind: 'velvet', colour: variant?.swatch ?? '#1c1918' };
}

/** A soft fold of cloth along the head; `path` in root space. */
export function fold(path: readonly Vector3[], width: number, thickness: number): BufferGeometry {
  return curveTube(new CatmullRomCurve3([...path]), {
    segments: 10,
    radial: 5,
    uvRepeat: 2,
    up: new Vector3(0, 1, 0),
    radius: (t) => {
      const swell = Math.sin(Math.PI * Math.min(1, 0.1 + t * 0.8));
      return [width * swell, thickness * swell];
    },
  });
}

export function blob(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number,
  rz: number,
): BufferGeometry {
  const sphere = new SphereGeometry(1, 10, 7);
  sphere.scale(rx, ry, rz);
  sphere.translate(x, y, z);
  return sphere;
}

export function foldedBand(dims: BodyDims, grow: number, width = 0.02): BufferGeometry[] {
  const { center, rx, ry, rz } = dims.head;
  const y = center[1] + ry * 0.5;
  return [-1, 1].map((side) => {
    const points = [
      new Vector3(side * 0.004, y + ry * 0.2, center[2] + rz * 0.88 + grow),
      new Vector3(side * rx * 0.7, y + ry * 0.05, center[2] + rz * 0.6 + grow),
      new Vector3(side * (rx + grow), y - ry * 0.05, center[2] - rz * 0.1),
    ];
    return fold(points, width, 0.006);
  });
}

/** Solo: flat back with a tied trepes; Yogya: the round mondolan. */
function blangkon(mondolan: boolean): ItemBuilder {
  return ({ dims }, variant) => {
    const { center, ry, rz } = dims.head;
    const material = fabric(variant, '#5b3b22');
    const grow = 0.01;
    const back = mondolan
      ? blob(0, center[1] - ry * 0.02, center[2] - rz - 0.018, 0.05, 0.045, 0.04)
      : blob(0, center[1] + ry * 0.04, center[2] - rz - 0.002, 0.056, 0.05, 0.018);
    const knots = [
      blob(0, center[1] + ry * 0.68, center[2] + rz * 0.84, 0.014, 0.018, 0.009),
      blob(0, center[1] - ry * 0.3, center[2] - rz * 0.9, 0.03, 0.018, 0.012),
    ];
    return [crownCover(dims, grow, 0.4), back, ...foldedBand(dims, grow), ...knots].map(
      (geometry) => ({ material, geometry: finalize(geometry, headBone) }),
    );
  };
}

/** Folded head-tie with a knot and two standing ends at the front. */
const iket: ItemBuilder = ({ dims }, variant) => {
  const { center, ry, rz } = dims.head;
  const material = fabric(variant, '#3b2618');
  const grow = 0.01;
  const knot = center[1] + ry * 0.92;
  const front = center[2] + rz * 0.52;
  const ends = [-1, 1].map((side) =>
    fold(
      [
        new Vector3(0, knot, front),
        new Vector3(side * 0.03, knot + 0.03, front + 0.006),
        new Vector3(side * 0.062, knot + 0.022, front - 0.006),
      ],
      0.016,
      0.006,
    ),
  );
  return [
    crownCover(dims, grow, 0.44),
    ...foldedBand(dims, grow),
    blob(0, knot, front, 0.018, 0.016, 0.014),
    ...ends,
  ].map((geometry) => ({ material, geometry: finalize(geometry, headBone) }));
};

/** Hood framing the face, and a drape from under the chin over the shoulders. */
const hijab: ItemBuilder = ({ dims }, variant) => {
  const material: MaterialSpec = { kind: 'cloth', colour: variant?.swatch ?? '#e2d2bf' };
  const { center, rx, ry, rz } = dims.head;
  const grow = 0.012;
  const hood = ringSurface(skullRings(dims, -0.98, 0.995, grow, 21), {
    segments: 30,
    rows: 16,
    closeTop: true,
    frontBias: 0.25,
    // The face opening: columns near the front stop above the brow.
    bottom: (theta) => {
      const off = Math.min(theta, Math.PI * 2 - theta);
      const open = 1 - smoothstep(0.72, 1.02, off);
      return center[1] + ry * lerp(-0.98, 0.62, open);
    },
    deform: (point) => {
      const before = point.z;
      sculptHead(dims, point);
      point.z = Math.max(point.z, before);
    },
  });

  const chin = center[1] - ry * 0.98;
  const top = dims.joints.shoulder_l[1];
  const drapeRings: Ring[] = [
    // Wider and deeper than every top at each height, so no collar shows through.
    { y: top - 0.2, rx: 0.175, rzf: 0.155, rzb: 0.108, cz: -0.012 },
    { y: top - 0.08, rx: 0.2, rzf: 0.14, rzb: 0.108, cz: -0.012 },
    { y: top + 0.03, rx: 0.15, rzf: 0.108, rzb: 0.098, cz: -0.01 },
    { y: chin + 0.015, rx: rx + 0.004, rzf: rz * 0.78, rzb: rz * 0.8, cz: center[2] - 0.006 },
    { y: center[1] - ry * 0.45, rx: rx + 0.006, rzf: rz * 0.84, rzb: rz, cz: center[2] },
  ];
  const drape = ringSurface(drapeRings, {
    segments: 26,
    rows: 12,
    // Under the jaw at the front, up behind the ears at the sides.
    top: (theta) => {
      const off = Math.min(theta, Math.PI * 2 - theta);
      return lerp(chin + 0.012, center[1] - ry * 0.45, smoothstep(0.1, 1.3, off));
    },
    bottom: (theta) => top - 0.2 - 0.06 * Math.cos(theta) ** 2,
  });
  return [
    { material, geometry: finalize(hood, headBone) },
    { material, geometry: finalize(drape, chainWeights(dims, ['chest', 'neck', 'head'])) },
  ];
};

/** Round rims and temples sitting on the bridge of the nose. */
const kacamata: ItemBuilder = ({ dims }, variant) => {
  const color = new Color(variant?.swatch ?? '#1b1918');
  const eye = facePoint(dims, 0.4, 0.06, 0.008);
  const radius = dims.head.rx * 0.34;
  const rim = new TorusGeometry(radius, 0.0013, 5, 18);
  rim.translate(eye.x, eye.y, eye.z);
  const bridge = curveTube(
    new CatmullRomCurve3([
      new Vector3(eye.x - radius, eye.y + 0.002, eye.z),
      new Vector3(0, eye.y + 0.006, eye.z + 0.003),
      new Vector3(-eye.x + radius, eye.y + 0.002, eye.z),
    ]),
    { segments: 4, radial: 4, radius: () => [0.0011, 0.0011] },
  );
  const temple = curveTube(
    new CatmullRomCurve3([
      new Vector3(eye.x + radius, eye.y + 0.002, eye.z),
      new Vector3(dims.head.rx + 0.003, eye.y + 0.002, dims.head.center[2] + 0.02),
      new Vector3(dims.head.rx + 0.001, eye.y - 0.004, dims.head.center[2] - 0.05),
    ]),
    { segments: 5, radial: 4, radius: () => [0.0011, 0.0011] },
  );
  return [rim, mirrorX(rim), bridge, temple, mirrorX(temple)].map((geometry) => ({
    material: LEATHER,
    geometry: finalize(geometry, headBone, { color }),
  }));
};

/** Small structured clutch held at the left hand. */
const tas: ItemBuilder = ({ dims }, variant) => {
  const metallic = variant?.id === 'emas';
  const material: MaterialSpec = metallic ? { kind: 'gold', colour: variant.swatch } : LEATHER;
  const color = metallic ? undefined : new Color(variant?.swatch ?? '#e6d6bd');
  const wrist = joint(dims, 'wrist_l');
  const s = scaleOf(dims);
  const body = new BoxGeometry(0.03 * s, 0.1 * s, 0.15 * s, 1, 2, 2);
  body.translate(wrist.x + 0.012, wrist.y - 0.2 * s, wrist.z + 0.012);
  const handle = new TorusGeometry(0.038 * s, 0.0032, 4, 12, Math.PI);
  handle.rotateY(Math.PI / 2);
  handle.translate(wrist.x + 0.012, wrist.y - 0.15 * s, wrist.z + 0.012);
  const clasp = new CylinderGeometry(0.007, 0.007, 0.006, 8);
  clasp.rotateZ(Math.PI / 2);
  clasp.translate(wrist.x + 0.03 * s, wrist.y - 0.165 * s, wrist.z + 0.012);
  const hand = rigid(BONE.wrist_l);
  return [
    { material, geometry: finalize(body, hand, { color }) },
    { material, geometry: finalize(handle, hand, { color }) },
    { material: GOLD, geometry: finalize(clasp, hand) },
  ];
};

/** Gold drops under both earlobes. */
const anting: ItemBuilder = ({ dims }, variant) => {
  const material: MaterialSpec = { kind: 'gold', colour: variant?.swatch };
  const { center, rx, ry } = dims.head;
  const x = center[0] + rx * 1.02;
  const y = center[1] - ry * 0.22;
  const z = center[2] - rx * 0.1;
  const stud = new SphereGeometry(0.0042, 6, 4);
  stud.translate(x, y, z);
  const drop = new SphereGeometry(1, 6, 5);
  drop.scale(0.0034, 0.0078, 0.0034);
  drop.translate(x, y - 0.015, z);
  return [stud, drop, mirrorX(stud), mirrorX(drop)].map((geometry) => ({
    material,
    geometry: finalize(geometry, headBone),
  }));
};

/** Gold flower with a short tassel, on the wearer's left chest. */
const bros: ItemBuilder = ({ dims }, variant) => {
  const material: MaterialSpec = { kind: 'gold', colour: variant?.swatch };
  const s = scaleOf(dims);
  const wanita = dims.body === 'wanita';
  const x = (wanita ? 0.048 : 0.082) * s;
  const y = dims.joints.chest[1] + 0.05 * s;
  const z = (wanita ? 0.113 : 0.108) * s;
  const centre = new SphereGeometry(0.0072, 6, 4);
  centre.translate(x, y, z);
  const petals = Array.from({ length: 6 }, (_, i) => {
    const angle = (i * Math.PI) / 3;
    const petal = new SphereGeometry(0.0072, 5, 3);
    petal.scale(1, 0.56, 0.5);
    petal.rotateZ(angle);
    petal.translate(x + Math.cos(angle) * 0.01, y + Math.sin(angle) * 0.01, z - 0.001);
    return petal;
  });
  const tassels = [-1, 0, 1].map((k) => {
    const tassel = new CylinderGeometry(0.0013, 0.0009, 0.034, 4);
    tassel.translate(x + k * 0.005, y - 0.03 - Math.abs(k) * -0.004, z + 0.001);
    return tassel;
  });
  return [centre, ...petals, ...tassels].map((geometry) => ({
    material,
    geometry: finalize(geometry, chestBone),
  }));
};

export const ACCESSORY_BUILDERS: Readonly<Record<string, ItemBuilder>> = {
  peci,
  'blangkon-solo': blangkon(false),
  'blangkon-yogya': blangkon(true),
  iket,
  hijab,
  kacamata,
  tas,
  anting,
  bros,
};
