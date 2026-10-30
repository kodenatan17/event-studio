import {
  AdditiveBlending,
  BackSide,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  CylinderGeometry,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  IcosahedronGeometry,
  LatheGeometry,
  LinearFilter,
  MeshBasicMaterial,
  MeshLambertMaterial,
  OctahedronGeometry,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';

import { registerGlowMaterial } from '../renderer/glow';
import type { MaterialKey } from '../templates/types';

/**
 * Shared geometries and materials of the `blockout` template, palette `jawa-sunset`.
 * Created once per page and reused by every scene (rendered with `dispose={null}`), so scene
 * switches never grow GPU memory (FR-04, architecture.md §12). Unit-sized; meshes scale them.
 */

export const PALETTE = {
  sky: '#f4b98a',
  skyTop: '#a07fa6',
  skyMid: '#e9a08f',
  fog: '#f2b48c',
  hemisphereSky: '#ffb37a',
  hemisphereGround: '#6b4a3a',
  sun: '#ffd2a1',
  lantern: '#ffcf7a',
  lotus: '#f3c6d3',
  melati: '#fbf7ee',
  janurTip: '#eef3b4',
} as const;

const SURFACE_COLORS: Record<MaterialKey, string> = {
  roof: '#8b3a2b',
  teak: '#7a4a2a',
  teakDark: '#4e2c18',
  teakCarved: '#6a3d22',
  teakFloor: '#a06b43',
  stone: '#d9b38c',
  stoneDark: '#a98462',
  paving: '#e4c39d',
  pavingDark: '#c99c76',
  grass: '#7f8a4e',
  janur: '#d8e27a',
  cream: '#f1e3c8',
  white: '#fbf7ee',
  cloth: '#f6efe2',
  gold: '#c9a24a',
  red: '#7c2a2a',
  carpet: '#8e3b2e',
  photo: '#c9a27a',
  terracotta: '#b5673e',
  leaf: '#4f7a3a',
  water: '#5b8fa8',
};

function lambert(color: string, emissive = '#000000'): MeshLambertMaterial {
  return new MeshLambertMaterial({ color, emissive });
}

export const materials: Record<MaterialKey, MeshLambertMaterial> = Object.fromEntries(
  Object.entries(SURFACE_COLORS).map(([key, color]) => [key, lambert(color)]),
) as Record<MaterialKey, MeshLambertMaterial>;
materials.gold.emissive = new Color('#4a3510');
materials.cream.emissive = new Color('#2a2214');
materials.photo.emissive = new Color('#2a1a0c');
materials.janur.emissive = new Color('#2c3008');

/** Soft radial blob (64², white with falling alpha), built without a DOM canvas. */
function radialShadowTexture(size = 64): DataTexture {
  const data = new Uint8Array(size * size * 4);
  const center = (size - 1) / 2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const r = Math.min(Math.hypot(x - center, y - center) / center, 1);
      const index = (y * size + x) * 4;
      data[index] = 255;
      data[index + 1] = 255;
      data[index + 2] = 255;
      data[index + 3] = Math.round(255 * (1 - r) ** 1.6);
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export const extraMaterials = {
  roofUnder: new MeshLambertMaterial({ color: '#5e3420', side: BackSide }),
  janurDouble: new MeshLambertMaterial({ color: SURFACE_COLORS.janur, side: DoubleSide }),
  janurTip: new MeshLambertMaterial({ color: PALETTE.janurTip, emissive: '#2c3008' }),
  drape: new MeshLambertMaterial({ color: '#fffaf0', emissive: '#3a3328', side: DoubleSide }),
  lanternGlow: new MeshBasicMaterial({ color: PALETTE.lantern }),
  lanternHalo: new MeshBasicMaterial({
    color: '#ffb84d',
    transparent: true,
    opacity: 0.12,
    blending: AdditiveBlending,
    depthWrite: false,
  }),
  lotus: lambert(PALETTE.lotus, '#3a2028'),
  melati: new MeshBasicMaterial({ color: '#fffaf0' }),
  lilyPad: lambert('#5f8a4a'),
  leafDark: lambert('#3d5e2e'),
  bark: lambert('#8a7464'),
  mandalaA: lambert('#c98f6a'),
  mandalaB: lambert('#ecd6b4'),
  mandalaC: lambert('#a8643f'),
  mandalaD: lambert('#f3e2c7'),
  marker: new MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.9 }),
  treeline: new MeshLambertMaterial({ color: '#56703a' }),
  sky: new MeshBasicMaterial({ vertexColors: true, side: BackSide, fog: false, depthWrite: false }),
  /** Contact shadow under the avatar (no shadow maps, §12); scaled by the jump height. */
  contactShadow: new MeshBasicMaterial({
    color: '#3a2416',
    map: radialShadowTexture(),
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
} as const;

// Lantern glow (also the hotspot indicators) and melati bloom when bloom runs. Melati is near
// white, so half the gain already lifts it as far above the threshold as the amber lanterns.
registerGlowMaterial(extraMaterials.lanternGlow);
registerGlowMaterial(extraMaterials.melati, 0.5);

/** Pulsing halo on interactive hotspots and portals (opacity animated in `PrimitiveScene`). */
export const highlightMaterial = new MeshBasicMaterial({
  color: '#ffe3a0',
  transparent: true,
  opacity: 0.28,
  blending: AdditiveBlending,
  depthWrite: false,
});

/** Frustum with a rectangular base 1×1 at y=0 and a top of `topX`×`topZ` at y=1 (open ends). */
function rectFrustum(topX: number, topZ: number): BufferGeometry {
  const b = 0.5;
  const tx = topX / 2;
  const tz = topZ / 2;
  const corners = [
    [
      [-b, 0, b],
      [b, 0, b],
      [tx, 1, tz],
      [-tx, 1, tz],
    ],
    [
      [b, 0, b],
      [b, 0, -b],
      [tx, 1, -tz],
      [tx, 1, tz],
    ],
    [
      [b, 0, -b],
      [-b, 0, -b],
      [-tx, 1, -tz],
      [tx, 1, -tz],
    ],
    [
      [-b, 0, -b],
      [-b, 0, b],
      [-tx, 1, tz],
      [-tx, 1, -tz],
    ],
  ];
  const positions: number[] = [];
  for (const [p0, p1, p2, p3] of corners) {
    positions.push(...p0!, ...p1!, ...p2!, ...p0!, ...p2!, ...p3!);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function flat<T extends BufferGeometry>(geometry: T): T {
  geometry.rotateX(-Math.PI / 2);
  return geometry;
}

/** Penjor-style janur pole: rises, bends over the path and droops (local +x is the bend). */
export const janurCurve = new CatmullRomCurve3([
  new Vector3(0, 0, 0),
  new Vector3(0, 1.6, 0),
  new Vector3(0.12, 2.8, 0),
  new Vector3(0.7, 3.45, 0),
  new Vector3(1.4, 3.25, 0),
  new Vector3(1.75, 2.6, 0),
]);

function skyDome(): SphereGeometry {
  const geometry = new SphereGeometry(110, 24, 16);
  const position = geometry.getAttribute('position');
  const colors: number[] = [];
  const horizon = new Color(PALETTE.sky);
  const mid = new Color(PALETTE.skyMid);
  const top = new Color(PALETTE.skyTop);
  const color = new Color();
  for (let index = 0; index < position.count; index += 1) {
    const t = Math.max(0, position.getY(index) / 110);
    if (t < 0.25) color.copy(horizon).lerp(mid, t / 0.25);
    else color.copy(mid).lerp(top, Math.min(1, (t - 0.25) / 0.6));
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  return geometry;
}

const drapeProfile = [
  new Vector2(0.36, 0),
  new Vector2(0.3, 0.22),
  new Vector2(0.14, 0.42),
  new Vector2(0.17, 0.55),
  new Vector2(0.25, 0.82),
  new Vector2(0.28, 1),
];

export const geometries = {
  box: new BoxGeometry(1, 1, 1),
  cylinder: new CylinderGeometry(0.5, 0.5, 1, 20),
  post: new CylinderGeometry(0.5, 0.5, 1, 8),
  pyramid: new CylinderGeometry(0, Math.SQRT1_2, 1, 4, 1).rotateY(Math.PI / 4),
  sphere: new SphereGeometry(0.5, 14, 10),
  foliage: new IcosahedronGeometry(0.5, 1),
  flower: new OctahedronGeometry(0.5, 0),
  tassel: new CylinderGeometry(0.5, 0, 1, 4),
  plane: flat(new PlaneGeometry(1, 1)),
  disc: flat(new CircleGeometry(0.5, 48)),
  petal: flat(new CircleGeometry(0.5, 12)),
  ring: flat(new RingGeometry(0.36, 0.5, 40)),
  roofLower: rectFrustum(0.46, 0.42),
  roofMid: rectFrustum(0.62, 0.5),
  roofTop: rectFrustum(0.46, 0.1),
  janurPole: new TubeGeometry(janurCurve, 24, 0.06, 6, false),
  drape: new LatheGeometry(drapeProfile, 14, -Math.PI / 2, Math.PI),
  marker: flat(new RingGeometry(0.2, 0.32, 32)),
  sky: skyDome(),
} as const;
