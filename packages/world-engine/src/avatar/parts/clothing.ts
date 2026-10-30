import {
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  Float32BufferAttribute,
  SphereGeometry,
  Vector3,
} from 'three';

import type { MaterialSpec } from '../materials';
import { BONE, joint } from '../rig';
import type { BodyDims, BoneName } from '../rig';
import {
  chainWeights,
  curveTube,
  finalize,
  lerp,
  mirrorX,
  rigid,
  ringPoint,
  ringSurface,
  sampleProfile,
  smoothstep,
} from '../shapes';
import type { Influence, Ring, WeightFn } from '../shapes';
import type { WardrobeVariant } from '../wardrobe';
import type { ItemBuilder, Part } from './types';

/** Metres per batik tile along the body, and tiles around a garment. */
const BATIK_V = 0.24;
const BATIK_U = 4;
/** Embroidery repeats larger than batik: its vines read at follow-camera distance. */
const EMBROIDERY_V = 0.42;
const EMBROIDERY_U = 2.5;

const GOLD: MaterialSpec = { kind: 'gold' };
const scaleOf = (dims: BodyDims) => dims.height / 1.7;

function fabric(variant: WardrobeVariant | undefined): MaterialSpec {
  return { kind: 'cloth', colour: variant?.swatch ?? '#3a3430', pattern: variant?.pattern };
}

function velvet(variant: WardrobeVariant | undefined): MaterialSpec {
  return { kind: 'velvet', colour: variant?.swatch ?? '#1f1b1a' };
}

/** Torso weights, with the shoulder bones sharing the cloth nearest each shoulder joint. */
export function topWeights(dims: BodyDims): WeightFn {
  const spine = chainWeights(dims, ['pelvis', 'spine', 'chest', 'neck']);
  const reach = 0.1 * scaleOf(dims);
  const joints = (['shoulder_l', 'shoulder_r'] as const).map((name) => ({
    bone: BONE[name],
    at: joint(dims, name),
  }));
  return (point) => {
    const influences: Influence[] = [...spine(point)];
    for (const { bone, at } of joints) {
      const share = 0.55 * smoothstep(reach, 0, point.distanceTo(at));
      if (share <= 0) continue;
      for (let i = 0; i < influences.length; i += 1) {
        const [other, weight] = influences[i]!;
        influences[i] = [other, weight * (1 - share)];
      }
      influences.push([bone, share]);
    }
    return influences;
  };
}

interface SleeveOptions {
  /** Share of the arm covered: 1 reaches the wrist. */
  length: number;
  radius: readonly [shoulder: number, elbow: number, wrist: number];
}

function sleeve(
  dims: BodyDims,
  side: 'l' | 'r',
  { length, radius }: SleeveOptions,
): BufferGeometry {
  const chain: BoneName[] = [`shoulder_${side}`, `elbow_${side}`, `wrist_${side}`];
  const arm = new CatmullRomCurve3(chain.map((name) => joint(dims, name)));
  const inset = joint(dims, chain[0]!).multiply(new Vector3(0.82, 1, 1));
  const points = [
    inset,
    ...Array.from({ length: 7 }, (_, i) => arm.getPointAt(((i + 1) / 7) * length)),
  ];
  const s = scaleOf(dims);
  const tube = curveTube(new CatmullRomCurve3(points), {
    segments: 12,
    radial: 9,
    uvRepeat: (length * 0.6) / BATIK_V,
    radius: (t) => {
      const at = t * length;
      const r =
        at < 0.5
          ? lerp(radius[0], radius[1], smoothstep(0, 0.5, at))
          : lerp(radius[1], radius[2], smoothstep(0.5, 1, at));
      // Rounded start inside the shoulder.
      const cap = Math.sqrt(Math.min(1, t / 0.07));
      return [r * s * cap, r * s * cap];
    },
  });
  return finalize(tube, chainWeights(dims, chain));
}

const sleeves = (dims: BodyDims, material: MaterialSpec, options: SleeveOptions): Part[] =>
  (['l', 'r'] as const).map((side) => ({ material, geometry: sleeve(dims, side, options) }));

/** Pria upper-body silhouette, hem to collar. */
export function priaShell(dims: BodyDims, hemDrop: number): Ring[] {
  const { pelvis, chest, neck } = dims.joints;
  const shoulder = dims.joints.shoulder_l[1];
  return [
    { y: pelvis[1] - hemDrop, rx: 0.172, rzf: 0.122, rzb: 0.124 },
    { y: dims.joints.spine[1] + 0.01, rx: 0.156, rzf: 0.11, rzb: 0.108 },
    { y: chest[1] + 0.02, rx: 0.182, rzf: 0.122, rzb: 0.112 },
    { y: shoulder - 0.01, rx: 0.208, rzf: 0.1, rzb: 0.096, n: 2.5 },
    { y: shoulder + 0.03, rx: 0.14, rzf: 0.08, rzb: 0.08 },
    { y: neck[1] + 0.02, rx: 0.062, rzf: 0.056, rzb: 0.06 },
  ].map((ring) => ({ ...ring, cz: -0.012 }));
}

/** Wanita upper-body silhouette; the hem flares over the hips. */
function wanitaShell(dims: BodyDims, hemDrop: number): Ring[] {
  const { pelvis, chest, neck, spine } = dims.joints;
  const shoulder = dims.joints.shoulder_l[1];
  return [
    { y: pelvis[1] - hemDrop, rx: 0.186, rzf: 0.138, rzb: 0.142 },
    { y: spine[1] + 0.03, rx: 0.114, rzf: 0.09, rzb: 0.084 },
    { y: chest[1] + 0.02, rx: 0.146, rzf: 0.122, rzb: 0.088 },
    { y: shoulder - 0.008, rx: 0.176, rzf: 0.086, rzb: 0.08, n: 2.4 },
    { y: shoulder + 0.026, rx: 0.118, rzf: 0.068, rzb: 0.07 },
    { y: neck[1] + 0.012, rx: 0.056, rzf: 0.05, rzb: 0.054 },
  ].map((ring) => ({ ...ring, cz: -0.01 }));
}

function collar(dims: BodyDims, height: number): BufferGeometry {
  const s = scaleOf(dims);
  const y = dims.joints.neck[1] + 0.008;
  const profile: Ring[] = [
    { y, rx: 0.058 * s, rzf: 0.056 * s, rzb: 0.058 * s, cz: -0.012 },
    { y: y + height, rx: 0.053 * s, rzf: 0.052 * s, rzb: 0.054 * s, cz: -0.008 },
  ];
  return finalize(
    ringSurface(profile, { segments: 16, rows: 1 }),
    chainWeights(dims, ['chest', 'neck', 'head']),
  );
}

function bead(position: Vector3, radius: number): BufferGeometry {
  const sphere = new SphereGeometry(radius, 6, 4);
  sphere.translate(position.x, position.y, position.z);
  return sphere;
}

/** A point on the front of `profile` at height y, `theta` off centre, lifted by `lift`. */
function frontPoint(profile: readonly Ring[], y: number, theta: number, lift: number): Vector3 {
  return ringPoint(sampleProfile(profile, y), theta).add(new Vector3(0, 0, lift));
}

/** Round-hemmed front flap, stand collar, gold buttons. */
export function beskapParts(dims: BodyDims, material: MaterialSpec): Part[] {
  const s = scaleOf(dims);
  const profile = priaShell(dims, 0.13);
  const hem = profile[0]!.y;
  const collarTop = dims.joints.neck[1] + 0.05;
  const shell = ringSurface(profile, {
    segments: 28,
    rows: 16,
    uRepeat: EMBROIDERY_U,
    vScale: EMBROIDERY_V,
    // The front corners are cut away toward the sides.
    bottom: (theta) => hem + 0.04 * Math.exp(-(Math.sin(theta / 2) ** 2) / 0.03),
  });
  const buttonLine = (y: number) => frontPoint(profile, y, -0.2, 0.004);
  const buttons: BufferGeometry[] = Array.from({ length: 5 }, (_, i) =>
    bead(
      buttonLine(lerp(dims.joints.spine[1] + 0.04, dims.joints.neck[1] - 0.05, i / 4)),
      0.0062 * s,
    ),
  );
  const flap = curveTube(
    new CatmullRomCurve3(
      Array.from({ length: 6 }, (_, i) => {
        const y = lerp(collarTop - 0.05, hem + 0.05, i / 5);
        return frontPoint(profile, y, lerp(-0.1, 0.22, i / 5), 0.002);
      }),
    ),
    { segments: 12, radial: 4, radius: () => [0.0045, 0.0045] },
  );
  const weights = topWeights(dims);
  return [
    { material, geometry: finalize(shell, weights) },
    { material, geometry: finalize(flap, weights) },
    { material, geometry: collar(dims, 0.038 * s) },
    ...sleeves(dims, material, { length: 1, radius: [0.054, 0.048, 0.042] }),
    ...buttons.map((geometry) => ({ material: GOLD, geometry: finalize(geometry, weights) })),
  ];
}

const beskap: ItemBuilder = ({ dims }, variant) => beskapParts(dims, velvet(variant));

function batikShirt(length: number): ItemBuilder {
  return ({ dims }, variant) => {
    const s = scaleOf(dims);
    const material = fabric(variant);
    const profile = priaShell(dims, 0.1);
    const shell = ringSurface(profile, {
      segments: 26,
      rows: 14,
      uRepeat: BATIK_U,
      vScale: BATIK_V,
    });
    const placket = curveTube(
      new CatmullRomCurve3([
        frontPoint(profile, dims.joints.neck[1] - 0.02, 0, 0.002),
        frontPoint(profile, dims.joints.chest[1], 0, 0.003),
        frontPoint(profile, profile[0]!.y + 0.01, 0, 0.003),
      ]),
      { segments: 8, radial: 4, up: new Vector3(1, 0, 0), radius: () => [0.008, 0.0016] },
    );
    const weights = topWeights(dims);
    return [
      { material, geometry: finalize(shell, weights) },
      { material, geometry: finalize(placket, weights) },
      { material, geometry: collar(dims, 0.026 * s) },
      ...sleeves(dims, material, { length, radius: [0.054, 0.048, 0.042] }),
    ];
  };
}

interface KebayaOptions {
  body: MaterialSpec;
  /** See-through lace sleeves, drawn over bare arms. */
  lace?: MaterialSpec;
  /** Floor-length coat: the front opens over the skirt and the back trails this far (m). */
  train?: number;
}

/** The bodice in the open front: the same cloth in shadow, so it costs no extra draw call. */
const BODICE_SHADE = new Color(0.58, 0.58, 0.58);

/** Column angle of a long coat: below the hips the front panels part toward the sides. */
function partedAngle(theta: number, opening: number, parted: number): number {
  const side = theta > Math.PI ? -1 : 1;
  const off = theta > Math.PI ? Math.PI * 2 - theta : theta;
  const span = Math.PI - opening;
  const open = Math.PI - ((Math.PI - off) * (span - parted)) / span;
  return side > 0 ? open : Math.PI * 2 - open;
}

export function kebayaParts(dims: BodyDims, options: KebayaOptions): Part[] {
  const s = scaleOf(dims);
  const { train } = options;
  const short = wanitaShell(dims, 0.17);
  const { chest, neck, pelvis, knee_l: knee } = dims.joints;
  const profile: Ring[] = train
    ? [
        { y: 0.02, rx: 0.21, rzf: 0.17, rzb: 0.19, cz: -0.01 },
        { y: knee[1], rx: 0.175, rzf: 0.14, rzb: 0.15, cz: -0.01 },
        { y: pelvis[1] - 0.1, rx: 0.17, rzf: 0.13, rzb: 0.135, cz: -0.01 },
        ...short.slice(1),
      ]
    : short;
  const shoulder = dims.joints.shoulder_l[1];
  const neckline = chest[1] + 0.085;
  const opening = 0.2;
  const parting = (y: number) => (train ? 0.5 * smoothstep(pelvis[1], 0.02, y) : 0);
  const edge = (y: number) => partedAngle(opening, opening, parting(y));
  const uRepeat = train ? EMBROIDERY_U : BATIK_U;
  const vScale = train ? EMBROIDERY_V : BATIK_V;
  const shell = ringSurface(profile, {
    segments: train ? 28 : 26,
    rows: train ? 20 : 16,
    arc: [opening, Math.PI * 2 - opening],
    uRepeat,
    vScale,
    deform: train
      ? (point, theta, ring) => {
          ringPoint(ring, partedAngle(theta, opening, parting(point.y)), point);
          const off = Math.min(theta, Math.PI * 2 - theta);
          const trail = smoothstep(1.4, 2.8, off) * smoothstep(knee[1] + 0.1, 0.02, point.y) ** 2;
          point.z -= train * trail;
        }
      : undefined,
    // V neck: the opening falls away from the shoulders to the breastbone.
    top: (theta) => {
      const off = Math.min(theta, Math.PI * 2 - theta);
      const scoop = lerp(neckline, shoulder + 0.026, smoothstep(0.2, 1, off));
      return lerp(scoop, neck[1] + 0.012, smoothstep(1.3, 2.2, off));
    },
    // Pointed front tips, shorter toward the sides.
    bottom: (theta) => {
      if (train) return profile[0]!.y;
      const off = Math.min(theta, Math.PI * 2 - theta);
      return profile[0]!.y + 0.08 * smoothstep(0.2, 1.3, off) * (1 - smoothstep(1.8, 3, off) * 0.8);
    },
  });

  const panelProfile: Ring[] = [
    { y: short[0]!.y + 0.02, rx: 0.15, rzf: 0.1, rzb: 0.1, cz: -0.01 },
    { y: dims.joints.spine[1] + 0.03, rx: 0.11, rzf: 0.086, rzb: 0.08, cz: -0.01 },
    { y: chest[1] + 0.02, rx: 0.14, rzf: 0.117, rzb: 0.085, cz: -0.01 },
    { y: shoulder - 0.05, rx: 0.14, rzf: 0.094, rzb: 0.08, cz: -0.01 },
  ];
  const panel = ringSurface(panelProfile, {
    segments: 18,
    rows: 8,
    uRepeat: uRepeat * 0.7,
    vScale,
  });

  const placketPoints = train ? 9 : 6;
  const placket = (side: number) =>
    curveTube(
      new CatmullRomCurve3(
        Array.from({ length: placketPoints }, (_, i) => {
          const y = lerp(neckline + 0.005, profile[0]!.y + 0.015, i / (placketPoints - 1));
          return frontPoint(profile, y, side * edge(y), 0.0015);
        }),
      ),
      { segments: train ? 16 : 10, radial: 4, radius: () => [train ? 0.0062 : 0.0034, 0.0034] },
    );

  const weights = topWeights(dims);
  const sleeveParts = sleeves(dims, options.lace ?? options.body, {
    length: 0.95,
    radius: [0.05, 0.042, 0.036],
  });
  // Lace leaves the arms bare, so a short sleeve of the body cloth closes the shoulders.
  const lacedSleeves = options.lace
    ? [
        ...sleeveParts.map((part) => ({ ...part, geometry: withLaceUv(part.geometry) })),
        ...sleeves(dims, options.body, { length: 0.2, radius: [0.05, 0.047, 0.046] }),
      ]
    : sleeveParts;
  return [
    { material: options.body, geometry: finalize(shell, weights) },
    { material: options.body, geometry: finalize(panel, weights, { color: BODICE_SHADE }) },
    { material: GOLD, geometry: finalize(placket(1), weights) },
    { material: GOLD, geometry: finalize(placket(-1), weights) },
    ...lacedSleeves,
    {
      material: GOLD,
      geometry: finalize(bead(frontPoint(profile, neckline - 0.03, 0, 0.012), 0.0065 * s), weights),
    },
  ];
}

/** Tiles of the lace map along and around a sleeve (about 8 cm each). */
const LACE_U = 4;
const LACE_V = 3;

/** The lace map is sampled through `uv1`: sleeves spread it evenly along their length. */
function withLaceUv(geometry: BufferGeometry): BufferGeometry {
  const uv = geometry.getAttribute('uv');
  const uv1 = geometry.getAttribute('uv1');
  for (let i = 0; i < uv.count; i += 1) uv1.setXY(i, uv.getX(i) * LACE_U, uv.getY(i) * LACE_V);
  uv1.needsUpdate = true;
  return geometry;
}

const kebayaKutubaru: ItemBuilder = ({ dims }, variant) =>
  kebayaParts(dims, {
    body: { kind: 'cloth', colour: variant?.swatch ?? '#5d7350', pattern: 'truntum' },
  });

const kebayaBrokat: ItemBuilder = ({ dims }, variant) => {
  const colour = variant?.swatch ?? '#74202f';
  return kebayaParts(dims, {
    body: { kind: 'cloth', colour, pattern: 'sekar' },
    lace: { kind: 'lace', colour },
  });
};

/** Skirt skin: pelvis at the waist, sharing the hips toward the hem so it follows the stride. */
export function skirtWeights(top: number, bottom: number): WeightFn {
  return (point) => {
    const follow = 0.6 * smoothstep(top, bottom, point.y);
    const left = smoothstep(-0.04, 0.04, point.x);
    return [
      [BONE.pelvis, 1 - follow],
      [BONE.hip_l, follow * left],
      [BONE.hip_r, follow * (1 - left)],
    ];
  };
}

function skirtProfile(dims: BodyDims): Ring[] {
  const { pelvis, knee_l: knee, ankle_l: ankle } = dims.joints;
  const wanita = dims.body === 'wanita';
  const k = wanita ? 0.93 : 1;
  return [
    { y: ankle[1] + 0.012, rx: 0.146 * k, rzf: 0.116, rzb: 0.116 },
    { y: knee[1], rx: 0.15 * k, rzf: 0.112, rzb: 0.114 },
    { y: pelvis[1] - 0.1, rx: 0.156 * k, rzf: 0.112, rzb: 0.118 },
    { y: pelvis[1] + 0.03, rx: 0.12 * k, rzf: 0.09, rzb: 0.094 },
  ];
}

/** Wiru: the jarik's folded front edge, a zigzag strip standing off the skirt. */
function wiru(profile: readonly Ring[]): BufferGeometry {
  const folds = 8;
  const rows = 8;
  const top = profile[profile.length - 1]!.y - 0.04;
  const bottom = profile[0]!.y;
  const positions: number[] = [];
  const uvs: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const y = lerp(bottom, top, row / rows);
    const ring = sampleProfile(profile, y);
    for (let fold = 0; fold <= folds; fold += 1) {
      const x = lerp(-0.012, 0.075, fold / folds) * (1 + 0.5 * (1 - row / rows));
      const z = ring.rzf * Math.sqrt(Math.max(0, 1 - (x / ring.rx) ** 2));
      positions.push(x, y, z + (fold % 2 === 0 ? 0.0015 : 0.0085));
      uvs.push(fold * 0.05, y / BATIK_V);
    }
  }
  const indices: number[] = [];
  const columns = folds + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let fold = 0; fold < folds; fold += 1) {
      const a = row * columns + fold;
      indices.push(a, a + 1, a + columns, a + 1, a + columns + 1, a + columns);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export const jarik: ItemBuilder = ({ dims }, variant) => {
  const material = fabric(variant);
  const profile = skirtProfile(dims);
  const skirt = ringSurface(profile, {
    segments: 28,
    rows: 12,
    uRepeat: BATIK_U,
    vScale: BATIK_V,
  });
  const weights = skirtWeights(profile[profile.length - 1]!.y, profile[0]!.y);
  return [
    { material, geometry: finalize(skirt, weights) },
    { material, geometry: finalize(wiru(profile), weights) },
  ];
};

const celana: ItemBuilder = ({ dims }, variant) => {
  const material = fabric(variant);
  const s = scaleOf(dims);
  const { pelvis } = dims.joints;
  const hips: Ring[] = [
    { y: pelvis[1] - 0.11, rx: 0.152, rzf: 0.098, rzb: 0.11 },
    { y: pelvis[1] - 0.03, rx: 0.15, rzf: 0.098, rzb: 0.11 },
    { y: pelvis[1] + 0.04, rx: 0.13, rzf: 0.088, rzb: 0.094 },
  ];
  const leg = (side: 'l' | 'r') => {
    const chain: BoneName[] = [`hip_${side}`, `knee_${side}`, `ankle_${side}`];
    const tube = curveTube(new CatmullRomCurve3(chain.map((name) => joint(dims, name))), {
      segments: 12,
      radial: 10,
      radius: (t) => {
        const r =
          t < 0.5
            ? lerp(0.09, 0.066, smoothstep(0, 0.5, t))
            : lerp(0.066, 0.056, smoothstep(0.5, 1, t));
        return [r * s, r * s];
      },
    });
    return { material, geometry: finalize(tube, chainWeights(dims, chain)) };
  };
  return [
    {
      material,
      geometry: finalize(
        ringSurface(hips, { segments: 20, rows: 4 }),
        chainWeights(dims, ['pelvis', 'spine']),
      ),
    },
    leg('l'),
    leg('r'),
  ];
};

/** Drapes from the left shoulder across the back and down the right side. */
const selendang: ItemBuilder = ({ dims }, variant) => {
  const material: MaterialSpec = { kind: 'cloth', colour: variant?.swatch ?? '#dba3a8' };
  const shoulder = joint(dims, 'shoulder_l');
  const { pelvis } = dims.joints;
  const path = [
    new Vector3(shoulder.x + 0.03, shoulder.y - 0.42, 0.13),
    new Vector3(shoulder.x + 0.015, shoulder.y - 0.2, 0.1),
    new Vector3(shoulder.x - 0.015, shoulder.y + 0.022, 0.05),
    new Vector3(shoulder.x - 0.05, shoulder.y + 0.04, -0.04),
    new Vector3(0, shoulder.y - 0.1, -0.115),
    new Vector3(-shoulder.x - 0.05, pelvis[1] + 0.18, -0.06),
    new Vector3(-shoulder.x - 0.09, pelvis[1] - 0.16, 0.05),
    new Vector3(-shoulder.x - 0.07, pelvis[1] - 0.48, 0.09),
  ];
  const ribbon = curveTube(new CatmullRomCurve3(path), {
    segments: 26,
    radial: 6,
    radius: (t) => [0.052 * (0.86 + 0.7 * Math.abs(t - 0.45)), 0.0032],
    up: new Vector3(1, 0, 0.35).normalize(),
  });
  return [{ material, geometry: finalize(ribbon, topWeights(dims)) }];
};

/** One leather material for every shoe, bag and frame: the colour is in the vertices. */
const LEATHER: MaterialSpec = { kind: 'leather' };
const LEATHER_SOLE = new Color('#201815');

/** Foot shell in ankle space, toes toward +z; `flat` is the shoe's sole height. */
function shoeShell(length: number, width: number, height: number): BufferGeometry {
  const shell = new SphereGeometry(1, 10, 8);
  shell.scale(width, height, length);
  const position = shell.getAttribute('position');
  for (let i = 0; i < position.count; i += 1) {
    const z = position.getZ(i);
    // Slimmer toward the toe box; flat under the foot.
    position.setX(i, position.getX(i) * (z > 0 ? 1 - (0.3 * z) / length : 1));
    position.setY(i, Math.max(position.getY(i), -height * 0.2));
  }
  shell.computeVertexNormals();
  return shell;
}

interface ShoeBuild {
  upper: BufferGeometry;
  sole?: BufferGeometry;
  trim?: BufferGeometry;
  heel?: BufferGeometry;
}

function pairOfShoes(dims: BodyDims, colour: Color, build: () => ShoeBuild): Part[] {
  const parts: Part[] = [];
  const { upper, sole, trim, heel } = build();
  for (const side of ['l', 'r'] as const) {
    const ankle = joint(dims, `ankle_${side}`);
    const place = (geometry: BufferGeometry, color?: Color) => {
      const positioned = side === 'l' ? geometry.clone() : mirrorX(geometry);
      positioned.translate(ankle.x, 0, ankle.z);
      return finalize(positioned, rigid(BONE[`ankle_${side}`]), { color });
    };
    parts.push({ material: LEATHER, geometry: place(upper, colour) });
    if (sole) parts.push({ material: LEATHER, geometry: place(sole, LEATHER_SOLE) });
    if (trim) parts.push({ material: GOLD, geometry: place(trim) });
    if (heel) parts.push({ material: LEATHER, geometry: place(heel, colour) });
  }
  return parts;
}

/** Slip-on: a low upper over a thin sole; the selop adds a gold ornament on the vamp. */
export function slipOn(ornament: boolean): ItemBuilder {
  return ({ dims }, variant) => {
    return pairOfShoes(dims, new Color(variant?.swatch ?? '#191615'), () => {
      const upper = shoeShell(0.135, 0.052, 0.066);
      upper.translate(0, 0.024, 0.062);
      const sole = new SphereGeometry(1, 10, 3);
      sole.scale(0.055, 0.012, 0.142);
      sole.translate(0, 0.012, 0.062);
      const trim = ornament ? new SphereGeometry(0.014, 6, 4) : undefined;
      trim?.scale(1.5, 0.6, 1);
      trim?.translate(0, 0.066, 0.118);
      return { upper, sole, trim };
    });
  };
}

const heels: ItemBuilder = ({ dims }, variant) => {
  return pairOfShoes(dims, new Color(variant?.swatch ?? '#d9b394'), () => {
    const upper = shoeShell(0.118, 0.04, 0.046);
    upper.rotateX(0.32);
    upper.translate(0, 0.05, 0.05);
    const heel = new SphereGeometry(1, 6, 5);
    heel.scale(0.012, 0.042, 0.012);
    heel.translate(0, 0.04, -0.034);
    return { upper, heel };
  });
};

export const CLOTHING_BUILDERS: Readonly<Record<string, ItemBuilder>> = {
  beskap,
  'batik-panjang': batikShirt(1),
  'batik-pendek': batikShirt(0.42),
  'kebaya-kutubaru': kebayaKutubaru,
  'kebaya-brokat': kebayaBrokat,
  jarik,
  celana,
  selendang,
  selop: slipOn(true),
  loafer: slipOn(false),
  heels,
};
