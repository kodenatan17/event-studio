import { CatmullRomCurve3, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import type { MaterialSpec } from '../materials';
import { BONE, joint } from '../rig';
import type { BodyDims, BoneName } from '../rig';
import { chainWeights, curveTube, finalize, lerp, rigid, ringSurface } from '../shapes';
import type { Ring, WeightFn } from '../shapes';
import type { Part, PartContext } from './types';

const SKIN: MaterialSpec = { kind: 'skin' };

/** Piecewise-linear radius along a limb: `[t, radius]` stops sorted by t. */
function radiusAt(stops: readonly (readonly [number, number])[], t: number): number {
  let k = 0;
  while (k < stops.length - 2 && stops[k + 1]![0] < t) k += 1;
  const [t0, r0] = stops[k]!;
  const [t1, r1] = stops[k + 1]!;
  return lerp(r0, r1, Math.min(1, Math.max(0, (t - t0) / (t1 - t0))));
}

function limb(
  dims: BodyDims,
  chain: readonly BoneName[],
  stops: readonly (readonly [number, number])[],
  segments: number,
  radial: number,
  from: number,
): BufferGeometry {
  const full = new CatmullRomCurve3(chain.map((name) => joint(dims, name)));
  if (from === 0) {
    return curveTube(full, {
      segments,
      radial,
      radius: (t) => {
        const radius = radiusAt(stops, t);
        return [radius, radius];
      },
    });
  }
  // A stub below a sleeve or hem: only the visible end of the limb is built.
  const stub = new CatmullRomCurve3(
    [0, 1 / 3, 2 / 3, 1].map((t) => full.getPointAt(lerp(from, 1, t))),
  );
  return curveTube(stub, {
    segments: 3,
    radial,
    radius: (t) => {
      const radius = radiusAt(stops, lerp(from, 1, t));
      return [radius, radius];
    },
  });
}

const scaleOf = (dims: BodyDims) => dims.height / 1.7;

function arm(dims: BodyDims, side: 'l' | 'r', from: number): BufferGeometry {
  const s = scaleOf(dims);
  const slim = dims.body === 'wanita' ? 0.86 : 1;
  const chain: BoneName[] = [`shoulder_${side}`, `elbow_${side}`, `wrist_${side}`];
  const stops = [
    [0, 0.046],
    [0.2, 0.046],
    [0.5, 0.034],
    [0.66, 0.036],
    [1, 0.024],
  ].map(([t, radius]) => [t!, radius! * s * slim] as const);
  return finalize(limb(dims, chain, stops, 12, 8, from), chainWeights(dims, chain));
}

function leg(dims: BodyDims, side: 'l' | 'r', from: number): BufferGeometry {
  const s = scaleOf(dims);
  const chain: BoneName[] = [`hip_${side}`, `knee_${side}`, `ankle_${side}`];
  const stops = [
    [0, 0.082],
    [0.28, 0.066],
    [0.5, 0.046],
    [0.68, 0.05],
    [1, 0.03],
  ].map(([t, radius]) => [t!, radius! * s] as const);
  return finalize(limb(dims, chain, stops, 14, 9, from), chainWeights(dims, chain));
}

/** Palm, four fingers and a thumb in wrist space: fingers along −y, thumb toward +z. */
function hand(dims: BodyDims, side: 'l' | 'r'): BufferGeometry[] {
  const s = scaleOf(dims) * (dims.body === 'wanita' ? 0.92 : 1);
  const wrist = joint(dims, side === 'l' ? 'wrist_l' : 'wrist_r');
  const elbow = joint(dims, side === 'l' ? 'elbow_l' : 'elbow_r');
  const rotation = new Quaternion().setFromUnitVectors(
    new Vector3(0, -1, 0),
    wrist.clone().sub(elbow).normalize(),
  );
  // Relaxed: the back of the hand turns a little toward the front.
  const turn = side === 'l' ? 0.55 : Math.PI - 0.55;
  const place = (geometry: BufferGeometry): BufferGeometry => {
    geometry.rotateY(turn);
    geometry.applyQuaternion(rotation);
    geometry.translate(wrist.x, wrist.y, wrist.z);
    return geometry;
  };
  const palm = new SphereGeometry(1, 8, 6);
  palm.scale(0.019 * s, 0.052 * s, 0.04 * s);
  palm.translate(0, -0.05 * s, 0);

  const digit = (start: Vector3, length: number, radius: number, sideways: number) => {
    const curve = new CatmullRomCurve3([
      start,
      start.clone().add(new Vector3(-0.002 * s, -length * 0.55, sideways * 0.5)),
      start.clone().add(new Vector3(-0.009 * s, -length, sideways)),
    ]);
    return curveTube(curve, {
      segments: 3,
      radial: 4,
      radius: (t) => {
        const r = radius * s * (t > 0.95 ? 0.35 : 1 - 0.25 * t);
        return [r, r];
      },
    });
  };
  const fingers = [
    [0.027, 0.062],
    [0.009, 0.072],
    [-0.01, 0.068],
    [-0.027, 0.054],
  ].map(([z, length]) => digit(new Vector3(0, -0.09 * s, z! * s), length! * s, 0.0075, 0));
  const thumb = digit(new Vector3(0, -0.035 * s, 0.03 * s), 0.052 * s, 0.0088, 0.022 * s);
  return [palm, ...fingers, thumb].map(place);
}

function torso(dims: BodyDims): BufferGeometry {
  const { pelvis, neck } = dims.joints;
  const s = scaleOf(dims);
  const wanita = dims.body === 'wanita';
  const bottom = pelvis[1] - 0.12 * s;
  const top = neck[1] - 0.05 * s;
  const span = top - bottom;
  const profile: Ring[] = (
    wanita
      ? [
          [0, 0.15, 0.1, 0.11],
          [0.26, 0.145, 0.095, 0.11],
          [0.5, 0.108, 0.078, 0.08],
          [0.74, 0.135, 0.1, 0.085],
          [0.92, 0.135, 0.075, 0.075],
          [1, 0.08, 0.055, 0.055],
        ]
      : [
          [0, 0.145, 0.1, 0.1],
          [0.26, 0.14, 0.095, 0.1],
          [0.5, 0.135, 0.09, 0.09],
          [0.74, 0.17, 0.105, 0.095],
          [0.92, 0.175, 0.09, 0.085],
          [1, 0.09, 0.06, 0.06],
        ]
  ).map(([t, rx, rzf, rzb]) => ({
    y: bottom + t! * span,
    rx: rx! * s,
    rzf: rzf! * s,
    rzb: rzb! * s,
  }));
  return finalize(
    ringSurface(profile, { segments: 20, rows: 12 }),
    chainWeights(dims, ['pelvis', 'spine', 'chest', 'neck']),
  );
}

/** Neck flaring into the collarbones, so open necklines show skin above the torso shell. */
function neck(dims: BodyDims): BufferGeometry {
  const s = scaleOf(dims);
  const wanita = dims.body === 'wanita';
  const base = dims.joints.neck[1] - 0.15 * s;
  const top = dims.head.center[1] - 0.05 * s;
  const span = top - base;
  const girth = wanita ? 0.86 : 1;
  const cz = dims.joints.neck[2];
  const shoulder = dims.joints.shoulder_l[1];
  const profile: Ring[] = [
    { y: base, rx: 0.15 * s, rzf: 0.102 * s, rzb: 0.08 * s, cz },
    { y: shoulder - 0.01 * s, rx: 0.15 * s, rzf: 0.086 * s, rzb: 0.074 * s, cz },
    // Under the garment shells at their narrowest, or their necklines fight with the skin.
    { y: shoulder + 0.03 * s, rx: 0.122 * s * girth, rzf: 0.068 * s * girth, rzb: 0.064 * s, cz },
    { y: dims.joints.neck[1] + 0.008 * s, rx: 0.07 * s, rzf: 0.056 * s, rzb: 0.056 * s, cz },
    {
      y: base + span * 0.8,
      rx: 0.048 * s * girth,
      rzf: 0.049 * s * girth,
      rzb: 0.05 * s * girth,
      cz,
    },
    {
      y: top,
      rx: 0.046 * s * girth,
      rzf: 0.047 * s * girth,
      rzb: 0.05 * s * girth,
      cz: cz + 0.012,
    },
  ];
  return finalize(
    ringSurface(profile, { segments: 16, rows: 10 }),
    chainWeights(dims, ['chest', 'neck', 'head']),
  );
}

/** Every skin part below the head; regions listed in `covers` are not built. */
export function bodyParts({ dims, covers, skirted }: PartContext): Part[] {
  const parts: BufferGeometry[] = [];
  if (!covers.has('torso')) parts.push(torso(dims));
  if (!covers.has('neck')) parts.push(neck(dims));
  // Sleeves stop at the wrist: a stub joins them to the hand.
  const armFrom = covers.has('arms') ? 0.84 : 0;
  parts.push(arm(dims, 'l', armFrom), arm(dims, 'r', armFrom));
  if (!covers.has('legs')) parts.push(leg(dims, 'l', 0), leg(dims, 'r', 0));
  // Ankles under a skirt hem; trousers hide them entirely.
  else if (skirted) parts.push(leg(dims, 'l', 0.78), leg(dims, 'r', 0.78));
  const hands: Part[] = (['l', 'r'] as const).flatMap((side) => {
    const weights: WeightFn = rigid(BONE[side === 'l' ? 'wrist_l' : 'wrist_r']);
    return hand(dims, side).map((geometry) => ({
      material: SKIN,
      geometry: finalize(geometry, weights),
    }));
  });
  return [...parts.map((geometry) => ({ material: SKIN, geometry })), ...hands];
}
