import {
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';

import type { MaterialSpec } from '../materials';
import { BONE } from '../rig';
import type { BodyDims } from '../rig';
import {
  curveTube,
  finalize,
  gauss,
  lerp,
  mirrorX,
  rigid,
  ringSurface,
  smoothstep,
} from '../shapes';
import type { Ring } from '../shapes';
import type { Part } from './types';

const SKIN: MaterialSpec = { kind: 'skin' };
const FACE: MaterialSpec = { kind: 'faceDetail' };
const EYE: MaterialSpec = { kind: 'eye' };

const headBone = rigid(BONE.head);

const BROW_COLOUR = new Color('#2a1c14');
const LASH_COLOUR = new Color('#120c09');
const SCLERA = new Color('#f4eee6');
const IRIS = new Color('#5a3618');
const IRIS_RIM = new Color('#2c180c');
const PUPIL = new Color('#0a0706');
const HIGHLIGHT = new Color('#ffffff');

/** Moves a point of the head ellipsoid onto the face: everything is relative to the ellipsoid. */
export function sculptHead(dims: BodyDims, point: Vector3): void {
  const { center, rx, ry, rz } = dims.head;
  const [cx, cy, cz] = center;
  const nx = (point.x - cx) / rx;
  const ny = (point.y - cy) / ry;
  const nz = (point.z - cz) / rz;
  const front = smoothstep(-0.1, 0.5, nz);
  const back = 1 - smoothstep(-0.5, 0.1, nz);

  // Jaw and chin taper; the back of the skull tucks in toward the neck.
  const jaw = smoothstep(-0.25, -0.98, ny);
  point.x = cx + (point.x - cx) * (1 - 0.2 * jaw);
  if (nz < 0) point.z = cz + (point.z - cz) * (1 - 0.42 * jaw);
  point.z += rz * 0.07 * gauss(nx, ny + 0.86, 0, 0.3, 0.14) * front;
  point.y -= ry * 0.03 * gauss(nx, ny + 0.92, 0, 0.3, 0.1) * front;
  point.z += rz * 0.06 * gauss(nx, ny - 0.3, 0, 1, 0.4) * back;

  for (const side of [-1, 1]) {
    const cheek = gauss(nx - side * 0.66, ny + 0.12, nz - 0.6, 0.2, 0.16, 0.26);
    point.x += side * rx * 0.05 * cheek;
    point.z += rz * 0.03 * cheek;
    point.z -= rz * 0.03 * gauss(nx - side * 0.42, ny - 0.06, 0, 0.24, 0.14) * front;
    // The eye opening: a shallow almond the eyeball shows through.
    point.z -= rz * 0.075 * gauss(nx - side * 0.42, ny - 0.05, 0, 0.17, 0.075) * front;
    point.z += rz * 0.028 * gauss(nx - side * 0.12, ny + 0.33, 0, 0.06, 0.05) * front;
  }
  point.z += rz * 0.045 * gauss(nx, ny - 0.22, 0, 0.56, 0.08) * front;

  // Nose: a bridge deepening down to the tip.
  const bridge = gauss(nx, 0, 0, 0.07, 1) * smoothstep(0.14, 0.02, ny) * smoothstep(-0.4, -0.3, ny);
  point.z += rz * lerp(0.015, 0.075, smoothstep(0.1, -0.26, ny)) * bridge * front;
  point.z += rz * 0.05 * gauss(nx, ny + 0.3, 0, 0.09, 0.06) * front;
}

/** Point on the sculpted face at normalized x/y (front side), lifted off the skin by `lift`. */
export function facePoint(dims: BodyDims, nx: number, ny: number, lift = 0): Vector3 {
  const { center, rx, ry, rz } = dims.head;
  const nz = Math.sqrt(Math.max(0.0001, 1 - nx * nx - ny * ny));
  const point = new Vector3(center[0] + nx * rx, center[1] + ny * ry, center[2] + nz * rz);
  sculptHead(dims, point);
  point.z += lift;
  return point;
}

function skull(dims: BodyDims): BufferGeometry {
  const { center, rx, ry, rz } = dims.head;
  const rows = 30;
  const profile: Ring[] = Array.from({ length: rows + 1 }, (_, i) => {
    const angle = -Math.PI / 2 + (i / rows) * Math.PI;
    const ring = Math.max(0.001, Math.cos(angle));
    return {
      y: center[1] + ry * Math.sin(angle),
      rx: rx * ring,
      rzf: rz * ring,
      rzb: rz * ring,
      cx: center[0],
      cz: center[2],
    };
  });
  const y0 = profile[0]!.y;
  const y1 = profile[rows]!.y;
  return ringSurface(profile, {
    segments: 40,
    rows,
    frontBias: 0.3,
    closeBottom: true,
    closeTop: true,
    rowEase: (t) => (Math.sin(Math.PI * (t - 0.5)) + 1) / 2,
    bottom: () => y0,
    top: () => y1,
    deform: (point) => sculptHead(dims, point),
  });
}

/** Eyeball with sharp iris rings: a lathe around z, so rows follow the pupil. */
function eyeball(radius: number): BufferGeometry {
  // Ascending height: a lathe faces outward only with its points ordered bottom to top.
  const angles = [1.7, 1.2, 0.84, 0.76, 0.68, 0.4, 0.34, 0.24, 0.001];
  const lathe = new LatheGeometry(
    angles.map((a) => new Vector2(Math.sin(a) * radius, Math.cos(a) * radius)),
    14,
  );
  lathe.rotateX(Math.PI / 2);
  return lathe;
}

function eyeColour(point: Vector3, centre: Vector3, radius: number): Color {
  const angle = Math.acos(Math.min(1, (point.z - centre.z) / radius));
  if (angle < 0.36) return PUPIL;
  if (angle < 0.7) return IRIS;
  if (angle < 0.82) return IRIS_RIM;
  return SCLERA;
}

function eyeParts(dims: BodyDims): Part[] {
  const wanita = dims.body === 'wanita';
  const radius = dims.head.rx * (wanita ? 0.24 : 0.215);
  const anchor = facePoint(dims, 0.4, 0.06);
  const centre = new Vector3(anchor.x, anchor.y, anchor.z - radius * 0.34);

  const ball = eyeball(radius);
  ball.translate(centre.x, centre.y, centre.z);
  const shine = new CircleGeometry(radius * 0.17, 6);
  shine.translate(centre.x + radius * 0.2, centre.y + radius * 0.3, centre.z + radius * 0.985);

  // Upper lid: a thin skin cap over the top of the eyeball.
  const lid = new SphereGeometry(radius * 1.07, 12, 4, 0.1, Math.PI - 0.2, 0, 0.96);
  lid.translate(centre.x, centre.y, centre.z);

  const lashPath = Array.from({ length: 7 }, (_, i) => {
    const phi = 0.15 + (i / 6) * (Math.PI - 0.3);
    const theta = 0.96 + Math.abs(i - 3) * 0.05;
    const r = radius * 1.09;
    return new Vector3(
      centre.x - r * Math.cos(phi) * Math.sin(theta),
      centre.y + r * Math.cos(theta),
      centre.z + r * Math.sin(phi) * Math.sin(theta),
    );
  });
  const lashSize = wanita ? 0.0019 : 0.0012;
  const lash = curveTube(new CatmullRomCurve3(lashPath), {
    segments: 8,
    radial: 3,
    up: new Vector3(0, 1, 0),
    radius: (t) => [lashSize * (0.4 + Math.sin(Math.PI * t)), radius * 0.09],
  });

  const browPath = [
    facePoint(dims, 0.13, 0.27, 0.0015),
    facePoint(dims, 0.36, 0.34, 0.0015),
    facePoint(dims, 0.62, 0.27, 0.0015),
  ];
  const browWidth = wanita ? 0.0022 : 0.0034;
  const brow = curveTube(new CatmullRomCurve3(browPath), {
    segments: 6,
    radial: 4,
    up: new Vector3(0, 1, 0),
    radius: (t) => [browWidth * (1 - 0.55 * t), 0.0016],
  });

  const pair = (geometry: BufferGeometry) => [geometry, mirrorX(geometry)];
  return [
    ...pair(ball).map((geometry) => ({
      material: EYE,
      geometry: finalize(geometry, headBone, {
        color: (point) =>
          eyeColour(point, new Vector3(Math.sign(point.x) * centre.x, centre.y, centre.z), radius),
      }),
    })),
    ...pair(shine).map((geometry) => ({
      material: EYE,
      geometry: finalize(geometry, headBone, { color: HIGHLIGHT }),
    })),
    ...pair(lid).map((geometry) => ({ material: SKIN, geometry: finalize(geometry, headBone) })),
    ...pair(lash).map((geometry) => ({
      material: FACE,
      geometry: finalize(geometry, headBone, { color: LASH_COLOUR }),
    })),
    ...pair(brow).map((geometry) => ({
      material: FACE,
      geometry: finalize(geometry, headBone, { color: BROW_COLOUR }),
    })),
  ];
}

function lipParts(dims: BodyDims): Part[] {
  const wanita = dims.body === 'wanita';
  const width = wanita ? 0.26 : 0.28;
  const upperColour = new Color(wanita ? '#a84b50' : '#a0625a');
  const lowerColour = new Color(wanita ? '#c0605f' : '#b4736a');
  // Corners lift a little: a resting smile, as in the reference.
  const mouthY = (x: number) => -0.6 + 0.05 * (x / width) ** 2;
  const path = (offset: (x: number) => number, lift: number) =>
    Array.from({ length: 9 }, (_, i) => {
      const x = -width + (i / 8) * width * 2;
      return facePoint(dims, x, mouthY(x) + offset(x), lift);
    });

  const upper = curveTube(
    new CatmullRomCurve3(
      path((x) => 0.022 + 0.018 * Math.exp(-((Math.abs(x) - 0.07) ** 2) / 0.003), 0.001),
    ),
    {
      segments: 12,
      radial: 4,
      up: new Vector3(0, 1, 0),
      radius: (t) => {
        const swell = Math.sin(Math.PI * t) ** 0.6;
        return [0.0034 * swell + 0.0002, 0.0018 * swell + 0.0002];
      },
    },
  );
  const lower = curveTube(new CatmullRomCurve3(path(() => -0.03, 0.0012)), {
    segments: 12,
    radial: 4,
    up: new Vector3(0, 1, 0),
    radius: (t) => {
      const swell = Math.sin(Math.PI * t) ** 0.8;
      return [0.0048 * swell + 0.0002, 0.0024 * swell + 0.0002];
    },
  });
  return [
    { material: FACE, geometry: finalize(upper, headBone, { color: upperColour }) },
    { material: FACE, geometry: finalize(lower, headBone, { color: lowerColour }) },
  ];
}

function earGeometry(dims: BodyDims): BufferGeometry {
  const { center, rx, ry } = dims.head;
  const h = ry * 0.26;
  const w = h * 0.56;
  const shape = new Shape();
  shape.moveTo(0, -h * 0.9);
  shape.bezierCurveTo(-w * 0.6, -h * 0.6, -w, h * 0.1, -w * 0.9, h * 0.6);
  shape.bezierCurveTo(-w * 0.7, h * 1.15, w * 0.2, h * 1.2, w * 0.55, h * 0.7);
  shape.bezierCurveTo(w * 0.7, h * 0.2, w * 0.3, -h * 0.5, 0, -h * 0.9);
  const ear = new ExtrudeGeometry(shape, {
    depth: 0.003,
    bevelEnabled: true,
    bevelSize: 0.0018,
    bevelThickness: 0.0018,
    bevelSegments: 1,
    curveSegments: 5,
  });
  ear.rotateY(Math.PI / 2);
  ear.rotateZ(-0.16);
  ear.translate(center[0] + rx * 0.96, center[1] + ry * 0.0, center[2] - rx * 0.1);
  return ear;
}

export function headParts(dims: BodyDims): Part[] {
  const ear = earGeometry(dims);
  return [
    { material: SKIN, geometry: finalize(skull(dims), headBone) },
    { material: SKIN, geometry: finalize(ear, headBone) },
    { material: SKIN, geometry: finalize(mirrorX(ear), headBone) },
    ...eyeParts(dims),
    ...lipParts(dims),
  ];
}
