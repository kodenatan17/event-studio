import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Quaternion,
  Uint16BufferAttribute,
  Vector3,
} from 'three';
import type { Curve } from 'three';

import { BONE, joint } from './rig';
import type { BodyDims, BoneName } from './rig';

/**
 * Geometry helpers for the procedural characters: elliptic "ring surfaces" (lathe-like shells
 * with separate width, front and back depth per height), variable-radius curve tubes, mirroring,
 * and `finalize`, which gives every part the same attribute set so they merge per material.
 */

export type Influence = readonly [bone: number, weight: number];
/** Skin weights for a rest-pose point (root space). */
export type WeightFn = (point: Vector3) => readonly Influence[];
export type ColorFn = (point: Vector3, index: number) => Color;

/** `uv1` default; only lace parts sample it, and they set their own. */
const DEFAULT_UV1: readonly [number, number] = [0, 0];

export interface FinalizeOptions {
  /** Vertex colour (multiplies the material colour/map); white when omitted. */
  color?: Color | ColorFn;
  /** Second UV set (lace alpha map); `DEFAULT_UV1` when omitted. */
  uv1?: (point: Vector3, index: number) => readonly [number, number];
}

/** Indexed geometry with position, normal, uv, uv1, color, skinIndex and skinWeight only. */
export function finalize(
  source: BufferGeometry,
  weights: WeightFn,
  options: FinalizeOptions = {},
): BufferGeometry {
  const geometry = new BufferGeometry();
  const position = source.getAttribute('position');
  const count = position.count;
  geometry.setAttribute('position', position.clone());
  if (!source.getAttribute('normal')) source.computeVertexNormals();
  geometry.setAttribute('normal', source.getAttribute('normal').clone());
  const uv = source.getAttribute('uv');
  geometry.setAttribute(
    'uv',
    uv ? uv.clone() : new Float32BufferAttribute(new Float32Array(count * 2), 2),
  );
  const index = source.getIndex();
  geometry.setIndex(index ? index.clone() : new BufferAttribute(range(count), 1));

  const colors = new Float32Array(count * 3);
  const uv1 = new Float32Array(count * 2);
  const skinIndex = new Uint16Array(count * 4);
  const skinWeight = new Float32Array(count * 4);
  const point = new Vector3();
  const white = new Color(1, 1, 1);
  for (let i = 0; i < count; i += 1) {
    point.fromBufferAttribute(position, i);
    const color =
      typeof options.color === 'function' ? options.color(point, i) : (options.color ?? white);
    colors.set([color.r, color.g, color.b], i * 3);
    const second = options.uv1 ? options.uv1(point, i) : DEFAULT_UV1;
    uv1.set(second, i * 2);
    const influences = [...weights(point)]
      .filter(([, weight]) => weight > 1e-4)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
    const total = influences.reduce((sum, [, weight]) => sum + weight, 0) || 1;
    influences.forEach(([bone, weight], slot) => {
      skinIndex[i * 4 + slot] = bone;
      skinWeight[i * 4 + slot] = weight / total;
    });
    if (influences.length === 0) skinWeight[i * 4] = 1;
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  geometry.setAttribute('uv1', new Float32BufferAttribute(uv1, 2));
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(skinIndex, 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute(skinWeight, 4));
  return geometry;
}

function range(count: number): Uint32Array {
  const range = new Uint32Array(count);
  for (let i = 0; i < count; i += 1) range[i] = i;
  return range;
}

export const rigid =
  (bone: number): WeightFn =>
  () => [[bone, 1]];

export const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = clamp01((value - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/** Gaussian bump, 1 at the centre. */
export function gauss(dx: number, dy: number, dz: number, sx: number, sy: number, sz = sx): number {
  return Math.exp(
    -((dx * dx) / (2 * sx * sx) + (dy * dy) / (2 * sy * sy) + (dz * dz) / (2 * sz * sz)),
  );
}

/** One cross-section of a ring surface. */
export interface Ring {
  y: number;
  /** Half width along x. */
  rx: number;
  /** Half depth toward +z (front) and −z (back). */
  rzf: number;
  rzb: number;
  cx?: number;
  cz?: number;
  /** Superellipse exponent: 2 = ellipse, larger = boxier. */
  n?: number;
}

type RingKey = 'rx' | 'rzf' | 'rzb' | 'cx' | 'cz' | 'n';
const RING_KEYS: readonly RingKey[] = ['rx', 'rzf', 'rzb', 'cx', 'cz', 'n'];
const ringValue = (ring: Ring, key: RingKey): number => ring[key] ?? (key === 'n' ? 2 : 0);

/** Smooth (monotone-spacing Hermite) interpolation of a profile sorted by `y`. */
export function sampleProfile(rings: readonly Ring[], y: number): Ring {
  const last = rings.length - 1;
  if (y <= rings[0]!.y) return { ...rings[0]!, y };
  if (y >= rings[last]!.y) return { ...rings[last]!, y };
  let k = 0;
  while (k < last - 1 && rings[k + 1]!.y < y) k += 1;
  const r0 = rings[k]!;
  const r1 = rings[k + 1]!;
  const h = r1.y - r0.y;
  const t = (y - r0.y) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  const slope = (key: RingKey, i: number): number => {
    const prev = rings[Math.max(0, i - 1)]!;
    const next = rings[Math.min(last, i + 1)]!;
    return next.y === prev.y
      ? 0
      : (ringValue(next, key) - ringValue(prev, key)) / (next.y - prev.y);
  };
  const result: Ring = { y, rx: 0, rzf: 0, rzb: 0 };
  for (const key of RING_KEYS) {
    const p0 = ringValue(r0, key);
    const p1 = ringValue(r1, key);
    const m0 = slope(key, k) * h;
    const m1 = slope(key, k + 1) * h;
    const value =
      (2 * t3 - 3 * t2 + 1) * p0 +
      (t3 - 2 * t2 + t) * m0 +
      (-2 * t3 + 3 * t2) * p1 +
      (t3 - t2) * m1;
    const lo = Math.min(p0, p1);
    const hi = Math.max(p0, p1);
    // No overshoot beyond the two neighbouring rings (keeps radii positive and silhouettes clean).
    result[key] = Math.min(hi, Math.max(lo, value));
  }
  return result;
}

/** Point on a ring at angle `theta` (0 = front +z, π/2 = +x). */
export function ringPoint(ring: Ring, theta: number, target = new Vector3()): Vector3 {
  const s = Math.sin(theta);
  const c = Math.cos(theta);
  const e = 2 / ringValue(ring, 'n');
  const sx = Math.sign(s) * Math.abs(s) ** e;
  const sz = Math.sign(c) * Math.abs(c) ** e;
  return target.set(
    ringValue(ring, 'cx') + ring.rx * sx,
    ring.y,
    ringValue(ring, 'cz') + (c >= 0 ? ring.rzf : ring.rzb) * sz,
  );
}

export interface RingSurfaceOptions {
  segments: number;
  /** Rows between the bottom and top boundary (default: one per profile ring). */
  rows?: number;
  /** 0..0.8: packs columns toward the front (faces, collars). */
  frontBias?: number;
  /** Per-column boundaries (necklines, hems); default the first/last profile height. */
  bottom?: (theta: number) => number;
  top?: (theta: number) => number;
  /** Open shell between two column angles (`[start, end]`, radians); default the full ring. */
  arc?: readonly [number, number];
  /** Row distribution 0..1 → 0..1 (e.g. denser near the face). */
  rowEase?: (t: number) => number;
  /** Texture repeats around the shell and metres per v (batik scale). */
  uRepeat?: number;
  vScale?: number;
  /** Displaces each vertex after placement (sculpt deformers); `theta` is the column angle. */
  deform?: (point: Vector3, theta: number, ring: Ring) => void;
  /** Collapse the top/bottom row to a point (closed ends). */
  closeTop?: boolean;
  closeBottom?: boolean;
}

/** Column angle with optional front packing; monotonic over [0, 2π]. */
function columnAngle(
  j: number,
  segments: number,
  bias: number,
  arc: readonly [number, number] | undefined,
): number {
  const s = j / segments;
  if (arc) return lerp(arc[0], arc[1], s);
  return 2 * Math.PI * s - bias * Math.sin(2 * Math.PI * s);
}

/**
 * Shell around the y axis from elliptic/superelliptic rings (outward-facing for rows ordered
 * bottom → top). The seam (θ = 0 = 2π) sits at the front centre; its duplicated normals are
 * averaged so it never shows.
 */
export function ringSurface(profile: readonly Ring[], options: RingSurfaceOptions): BufferGeometry {
  const { segments, frontBias = 0, uRepeat = 1, vScale = 1 } = options;
  const rows = options.rows ?? profile.length - 1;
  const ease = options.rowEase ?? ((t: number) => t);
  const columns = segments + 1;
  const positions = new Float32Array((rows + 1) * columns * 3);
  const uvs = new Float32Array((rows + 1) * columns * 2);
  const point = new Vector3();
  const y0 = profile[0]!.y;
  const y1 = profile[profile.length - 1]!.y;
  for (let j = 0; j < columns; j += 1) {
    const theta = columnAngle(j, segments, frontBias, options.arc);
    const bottom = options.bottom?.(theta) ?? y0;
    const top = options.top?.(theta) ?? y1;
    for (let i = 0; i <= rows; i += 1) {
      const y = lerp(bottom, top, ease(i / rows));
      const ring = sampleProfile(profile, y);
      if ((i === 0 && options.closeBottom) || (i === rows && options.closeTop)) {
        point.set(ringValue(ring, 'cx'), y, ringValue(ring, 'cz'));
      } else {
        ringPoint(ring, theta, point);
      }
      options.deform?.(point, theta, ring);
      const index = i * columns + j;
      positions.set([point.x, point.y, point.z], index * 3);
      uvs.set([(j / segments) * uRepeat, y / vScale], index * 2);
    }
  }
  const indices: number[] = [];
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < segments; j += 1) {
      const a = i * columns + j;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  if (!options.arc) weldSeamNormals(geometry, rows, columns);
  return geometry;
}

/** Averages the duplicated first/last column normals of a ring surface. */
function weldSeamNormals(geometry: BufferGeometry, rows: number, columns: number): void {
  const normal = geometry.getAttribute('normal');
  const a = new Vector3();
  const b = new Vector3();
  for (let i = 0; i <= rows; i += 1) {
    const first = i * columns;
    const last = first + columns - 1;
    a.fromBufferAttribute(normal, first);
    b.fromBufferAttribute(normal, last);
    a.add(b).normalize();
    normal.setXYZ(first, a.x, a.y, a.z);
    normal.setXYZ(last, a.x, a.y, a.z);
  }
  normal.needsUpdate = true;
}

/** Re-orients a shell built along +y (y = 0 … length) to run from `from` to `to`. */
export function alongSegment(geometry: BufferGeometry, from: Vector3, to: Vector3): BufferGeometry {
  const direction = to.clone().sub(from).normalize();
  const rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction);
  geometry.applyQuaternion(rotation);
  geometry.translate(from.x, from.y, from.z);
  return geometry;
}

export interface CurveTubeOptions {
  segments: number;
  radial: number;
  /** Cross-section half sizes at t: [along the reference axis, across it]. */
  radius: (t: number) => readonly [number, number];
  /** Reference "up" for the cross-section (the first radius points along it). */
  up?: Vector3;
  /** Colour along the tube (vertex colours, e.g. hair roots → tips). */
  uvRepeat?: number;
}

/**
 * Tube with a per-t elliptic cross-section along `curve`. Ends taper with the radius function
 * (use a radius → 0 for closed tips).
 */
export function curveTube(curve: Curve<Vector3>, options: CurveTubeOptions): BufferGeometry {
  const { segments, radial } = options;
  const up = options.up ?? new Vector3(0, 0, 1);
  const positions: number[] = [];
  const uvs: number[] = [];
  const point = new Vector3();
  const tangent = new Vector3();
  const normal = new Vector3();
  const binormal = new Vector3();
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    curve.getPointAt(t, point);
    curve.getTangentAt(t, tangent).normalize();
    normal.copy(up).addScaledVector(tangent, -up.dot(tangent));
    if (normal.lengthSq() < 1e-8) normal.set(1, 0, 0);
    normal.normalize();
    binormal.crossVectors(tangent, normal).normalize();
    const [ra, rb] = options.radius(t);
    for (let j = 0; j <= radial; j += 1) {
      const phi = (j / radial) * Math.PI * 2;
      const cos = Math.cos(phi);
      const sin = Math.sin(phi);
      positions.push(
        point.x + normal.x * ra * cos + binormal.x * rb * sin,
        point.y + normal.y * ra * cos + binormal.y * rb * sin,
        point.z + normal.z * ra * cos + binormal.z * rb * sin,
      );
      uvs.push(j / radial, t * (options.uvRepeat ?? 1));
    }
  }
  const indices: number[] = [];
  const columns = radial + 1;
  for (let i = 0; i < segments; i += 1) {
    for (let j = 0; j < radial; j += 1) {
      const a = i * columns + j;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, b, c, b, d, c);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  weldSeamNormals(geometry, segments, columns);
  return geometry;
}

/** Mirror across x = 0 (left ↔ right) keeping faces outward; normals are mirrored, not rebuilt. */
export function mirrorX(source: BufferGeometry): BufferGeometry {
  const geometry = source.clone();
  geometry.scale(-1, 1, 1);
  if (!geometry.getIndex()) {
    geometry.setIndex(new BufferAttribute(range(geometry.getAttribute('position').count), 1));
  }
  const index = geometry.getIndex()!;
  const array = index.array;
  for (let i = 0; i < array.length; i += 3) {
    const swap = array[i + 1]!;
    array[i + 1] = array[i + 2]!;
    array[i + 2] = swap;
  }
  index.needsUpdate = true;
  return geometry;
}

/**
 * Skin weights along a chain of joints: a point belongs to the segment it projects on (driven by
 * the bone at the segment's start) and blends 2 bones over the `band` share of a segment nearest
 * each joint; on a joint the two bones weigh the same.
 */
export function chainWeights(dims: BodyDims, chain: readonly BoneName[], band = 0.15): WeightFn {
  const points = chain.map((name) => joint(dims, name));
  const bones = chain.map((name) => BONE[name]);
  const last = chain.length - 2;
  const a = new Vector3();
  const closest = new Vector3();
  return (point) => {
    let segment = 0;
    let along = 0;
    let best = Infinity;
    for (let i = 0; i <= last; i += 1) {
      a.copy(points[i + 1]!).sub(points[i]!);
      const t = clamp01(point.clone().sub(points[i]!).dot(a) / a.lengthSq());
      closest.copy(points[i]!).addScaledVector(a, t);
      const distance = closest.distanceToSquared(point);
      if (distance < best) {
        best = distance;
        segment = i;
        along = t;
      }
    }
    if (along > 1 - band) {
      const share = 0.5 * smoothstep(1 - band, 1, along);
      return [
        [bones[segment]!, 1 - share],
        [bones[segment + 1]!, share],
      ];
    }
    if (segment > 0 && along < band) {
      const share = 0.5 * smoothstep(band, 0, along);
      return [
        [bones[segment]!, 1 - share],
        [bones[segment - 1]!, share],
      ];
    }
    return [[bones[segment]!, 1]];
  };
}

/** Displaces positions in place and recomputes normals. */
export function displace(geometry: BufferGeometry, fn: (point: Vector3) => void): BufferGeometry {
  const position = geometry.getAttribute('position');
  const point = new Vector3();
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i);
    fn(point);
    position.setXYZ(i, point.x, point.y, point.z);
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

export function triangleCount(geometry: BufferGeometry): number {
  const index = geometry.getIndex();
  return (index ? index.count : geometry.getAttribute('position').count) / 3;
}
