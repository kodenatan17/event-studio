import { CatmullRomCurve3, Color, SphereGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';

import { seeded } from '../../scenes/decor/Part';
import type { MaterialSpec } from '../materials';
import { BONE } from '../rig';
import type { BodyDims } from '../rig';
import { curveTube, finalize, gauss, lerp, rigid, ringSurface, smoothstep } from '../shapes';
import type { Ring } from '../shapes';
import type { ItemBuilder, Part, PartContext } from './types';

const HAIR: MaterialSpec = { kind: 'hair', colour: '#2b1f19' };
const headBone = rigid(BONE.head);

const DEGREE = Math.PI / 180;

/** Point `lift` metres above the skull ellipsoid; azimuth 0 = front, 90 = left, elevation 90 = top. */
export function onSkull(dims: BodyDims, azimuth: number, elevation: number, lift: number): Vector3 {
  const { center, rx, ry, rz } = dims.head;
  const a = azimuth * DEGREE;
  const e = elevation * DEGREE;
  return new Vector3(
    center[0] + (rx + lift) * Math.cos(e) * Math.sin(a),
    center[1] + (ry + lift) * Math.sin(e),
    center[2] + (rz + lift) * Math.cos(e) * Math.cos(a),
  );
}

/** Lowest hair per side of the head, as normalized y over the folded azimuth (0 front … π back). */
type Hairline = readonly (readonly [azimuth: number, ny: number])[];

const SHORT_HAIRLINE: Hairline = [
  [0, 0.66],
  [28, 0.56],
  [50, 0.3],
  [78, 0.16],
  [100, -0.08],
  [135, -0.42],
  [180, -0.56],
];

const LONG_HAIRLINE: Hairline = [
  [0, 0.7],
  [30, 0.56],
  [55, 0.3],
  [80, 0.04],
  [105, -0.22],
  [140, -0.56],
  [180, -0.72],
];

function hairlineAt(hairline: Hairline, theta: number): number {
  const folded = (theta > Math.PI ? 2 * Math.PI - theta : theta) / DEGREE;
  let k = 0;
  while (k < hairline.length - 2 && hairline[k + 1]![0] < folded) k += 1;
  const [a0, y0] = hairline[k]!;
  const [a1, y1] = hairline[k + 1]!;
  return lerp(y0, y1, smoothstep(a0, a1, folded));
}

/** Hair shell over the skull. With the crown hidden, only the band below headwear remains. */
function cap(
  dims: BodyDims,
  hairline: Hairline,
  thickness: number,
  crownHidden: boolean,
  bump: (nx: number, ny: number, nz: number) => number,
): BufferGeometry {
  const { center, rx, ry, rz } = dims.head;
  const rows = 14;
  const outer = { rx: rx + thickness, ry: ry + thickness, rz: rz + thickness };
  const profile: Ring[] = Array.from({ length: 25 }, (_, i) => {
    const angle = (-80 + (i / 24) * 170) * DEGREE;
    const ring = Math.max(0.001, Math.cos(angle));
    return {
      y: center[1] + outer.ry * Math.sin(angle),
      rx: outer.rx * ring,
      rzf: outer.rz * ring,
      rzb: outer.rz * ring,
      cx: center[0],
      cz: center[2],
    };
  });
  const crown = center[1] + ry * 0.5;
  return ringSurface(profile, {
    segments: 30,
    rows,
    closeTop: !crownHidden,
    bottom: (theta) => center[1] + ry * hairlineAt(hairline, theta),
    top: crownHidden ? () => crown : () => center[1] + outer.ry * 0.9995,
    rowEase: (t) => t ** 0.8,
    deform: (point, theta) => {
      const nx = (point.x - center[0]) / rx;
      const ny = (point.y - center[1]) / ry;
      const nz = (point.z - center[2]) / rz;
      // The shell thins out to the skin along the hairline, so no edge stands off the head.
      const edge = smoothstep(0, 0.34, ny - hairlineAt(hairline, theta));
      const lift = bump(nx, ny, nz) - (1 - edge) * (thickness / rx);
      point.x += nx * rx * lift;
      point.y += ny * ry * lift;
      point.z += nz * rz * lift;
    },
  });
}

/** A flat lock following `path` (azimuth, elevation, lift) along the skull, tapering to its tip. */
function lock(
  dims: BodyDims,
  path: readonly (readonly [number, number, number])[],
  width: number,
  thickness: number,
): BufferGeometry {
  const curve = new CatmullRomCurve3(path.map(([a, e, l]) => onSkull(dims, a, e, l)));
  return curveTube(curve, {
    segments: 8,
    radial: 5,
    up: new Vector3(0, 1, 0),
    radius: (t) => {
      const swell = Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)) ** 0.7;
      return [thickness * swell + 0.0004, width * swell + 0.0004];
    },
  });
}

function blob(position: Vector3, rx: number, ry: number, rz: number, detail = 10): BufferGeometry {
  const sphere = new SphereGeometry(1, detail, Math.round(detail * 0.75));
  sphere.scale(rx, ry, rz);
  sphere.translate(position.x, position.y, position.z);
  return sphere;
}

/** Dark at the roots near the skull's lower edge, lighter on the crown. */
function hairShade(dims: BodyDims) {
  const { center, ry } = dims.head;
  return (point: Vector3): Color => {
    const shade = lerp(0.62, 1.12, smoothstep(center[1] - ry * 0.7, center[1] + ry, point.y));
    return new Color(shade, shade, shade);
  };
}

export function hairParts(dims: BodyDims, geometries: readonly BufferGeometry[]): Part[] {
  const color = hairShade(dims);
  return geometries.map((geometry) => ({
    material: HAIR,
    geometry: finalize(geometry, headBone, { color }),
  }));
}

/** Side part on the wearer's left: long locks sweep across, short ones fall to the near side. */
const belahSamping: ItemBuilder = ({ dims, hairCrownHidden }) => {
  const geometries = [
    cap(dims, SHORT_HAIRLINE, 0.009, hairCrownHidden, (nx, ny, nz) =>
      hairCrownHidden ? 0 : 0.1 * gauss(nx + 0.2, ny - 0.75, nz - 0.45, 0.65, 0.3, 0.5),
    ),
  ];
  if (!hairCrownHidden) {
    for (let i = 0; i < 7; i += 1) {
      const start = 34 - i * 2;
      const elevation = 62 + i * 3.4;
      geometries.push(
        lock(
          dims,
          [
            [start, elevation, 0.012],
            [4 - i * 6, elevation + 9, 0.021],
            [-34 - i * 9, elevation - 6, 0.016],
            [-74 - i * 11, 30 + i * 3, 0.007],
          ],
          0.018,
          0.0065,
        ),
      );
    }
    for (let i = 0; i < 3; i += 1) {
      geometries.push(
        lock(
          dims,
          [
            [40 + i * 2, 66 + i * 4, 0.01],
            [62 + i * 7, 52 + i * 3, 0.014],
            [86 + i * 12, 22 + i * 4, 0.006],
          ],
          0.016,
          0.005,
        ),
      );
    }
  }
  return hairParts(dims, geometries);
};

/** Neat, combed straight back from a lifted front. */
const rapi: ItemBuilder = ({ dims, hairCrownHidden }) => {
  const geometries = [
    cap(dims, SHORT_HAIRLINE, 0.008, hairCrownHidden, (nx, ny, nz) =>
      hairCrownHidden ? 0 : 0.07 * gauss(nx, ny - 0.72, nz - 0.5, 0.8, 0.28, 0.45),
    ),
  ];
  if (!hairCrownHidden) {
    for (let i = -4; i <= 4; i += 1) {
      geometries.push(
        lock(
          dims,
          [
            [i * 10, 46, 0.012],
            [i * 11, 68, 0.019],
            [i * 15, 86, 0.015],
            [180 - i * 12, 62, 0.008],
          ],
          0.015,
          0.005,
        ),
      );
    }
  }
  return hairParts(dims, geometries);
};

/** Short curls: seeded clusters over the crown and sides. */
const ikal: ItemBuilder = ({ dims, hairCrownHidden }) => {
  const random = seeded(0.73);
  const geometries = [cap(dims, SHORT_HAIRLINE, 0.008, hairCrownHidden, () => 0)];
  const count = hairCrownHidden ? 0 : 30;
  for (let i = 0; i < count; i += 1) {
    const azimuth = random() * 360;
    const front = Math.cos(azimuth * DEGREE) > 0;
    const elevation = (front ? 44 : 20) + random() * (front ? 40 : 66);
    const size = 0.0115 + random() * 0.0055;
    geometries.push(blob(onSkull(dims, azimuth, elevation, 0.0125), size, size * 0.86, size, 6));
  }
  return hairParts(dims, geometries);
};

/** Centre-parted hair drawn back over the ears to the nape. */
export function drawnBack(context: PartContext): BufferGeometry[] {
  const { dims, hairCrownHidden } = context;
  const geometries = [cap(dims, LONG_HAIRLINE, 0.008, hairCrownHidden, () => 0)];
  if (hairCrownHidden) return geometries;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 4; i += 1) {
      geometries.push(
        lock(
          dims,
          [
            [side * 6, 72 - i * 2, 0.008],
            [side * (46 + i * 4), 42 - i * 7, 0.015],
            [side * (96 + i * 6), 2 - i * 8, 0.015],
            [side * (156 - i * 5), -32 - i * 4, 0.009],
          ],
          0.019,
          0.0055,
        ),
      );
    }
  }
  return geometries;
}

const sanggulUkel: ItemBuilder = (context) => {
  const { dims } = context;
  const { center, ry, rz } = dims.head;
  const hub = new Vector3(0, center[1] - ry * 0.46, center[2] - rz - 0.03);
  const turns = 2.6;
  const path = Array.from({ length: 22 }, (_, i) => {
    const t = i / 21;
    const angle = t * turns * Math.PI * 2;
    const radius = lerp(0.052, 0.008, t);
    return new Vector3(
      hub.x + radius * Math.cos(angle),
      hub.y + radius * Math.sin(angle) * 0.86,
      hub.z - (1 - t) * 0.006 - 0.014 * Math.sin(Math.PI * t),
    );
  });
  const coil = curveTube(new CatmullRomCurve3(path), {
    segments: 44,
    radial: 6,
    radius: (t) => {
      const radius = lerp(0.0165, 0.0115, t);
      return [radius, radius];
    },
  });
  return hairParts(dims, [
    ...drawnBack(context),
    blob(hub.clone().add(new Vector3(0, 0, 0.012)), 0.046, 0.04, 0.026),
    coil,
  ]);
};

const sanggulCepol: ItemBuilder = (context) => {
  const { dims } = context;
  const { center, ry, rz } = dims.head;
  const hub = new Vector3(0, center[1] + ry * 0.34, center[2] - rz - 0.026);
  const wrap = curveTube(
    new CatmullRomCurve3(
      Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 9) * Math.PI * 2 * 1.1;
        return new Vector3(
          hub.x + 0.05 * Math.cos(angle),
          hub.y + 0.042 * Math.sin(angle),
          hub.z - 0.012,
        );
      }),
    ),
    {
      segments: 24,
      radial: 5,
      radius: () => [0.007, 0.007],
    },
  );
  return hairParts(dims, [
    ...drawnBack(context),
    blob(hub, 0.05, 0.044, 0.038, 12),
    wrap,
    lock(
      dims,
      [
        [168, 34, 0.012],
        [180, 44, 0.03],
        [192, 34, 0.012],
      ],
      0.012,
      0.008,
    ),
  ]);
};

const sanggulTekuk: ItemBuilder = (context) => {
  const { dims } = context;
  const { center, ry, rz } = dims.head;
  const low = center[1] - ry * 0.72;
  const fold = (x: number, y: number, tilt: number) => {
    const roll = blob(new Vector3(0, 0, 0), 0.056, 0.024, 0.024, 10);
    roll.rotateZ(tilt);
    roll.translate(x, y, center[2] - rz - 0.002);
    return roll;
  };
  return hairParts(dims, [
    ...drawnBack(context),
    fold(0, low + 0.03, 0.1),
    fold(0, low - 0.006, -0.12),
    fold(0, low - 0.04, 0.08),
  ]);
};

export const HAIR_BUILDERS: Readonly<Record<string, ItemBuilder>> = {
  'belah-samping': belahSamping,
  rapi,
  ikal,
  'sanggul-ukel': sanggulUkel,
  'sanggul-cepol': sanggulCepol,
  'sanggul-tekuk': sanggulTekuk,
};
