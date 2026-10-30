import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DataTexture,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  LatheGeometry,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

import { noRaycast } from '../input';

type Surface = 'petals' | 'leaves' | 'cloth' | 'teak' | 'gold' | 'stone';
const SURFACES: readonly Surface[] = ['petals', 'leaves', 'cloth', 'teak', 'gold', 'stone'];

/** A fixed, bounded detail layer for the akad canopy; it adds no collision or interaction. */
interface GardenResources {
  geometry: Record<Surface, BufferGeometry>;
  material: Record<Surface, MeshStandardMaterial>;
  stoneMap: DataTexture;
  users: number;
  triangles: number;
}

let shared: GardenResources | undefined;

function surface(
  columns: number,
  rows: number,
  point: (u: number, v: number) => Vector3,
): BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  for (let y = 0; y <= rows; y += 1) {
    for (let x = 0; x <= columns; x += 1) {
      const u = x / columns;
      const v = y / rows;
      positions.push(...point(u, v).toArray());
      uv.push(u, v);
      if (x < columns && y < rows) {
        const a = y * (columns + 1) + x;
        const b = a + columns + 1;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Low-amplitude, periodic mineral grain: no downloaded image or DOM/canvas dependency. */
function stoneTexture(): DataTexture {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = Math.sin((x * Math.PI * 14) / size) * Math.cos((y * Math.PI * 18) / size);
      const vein = Math.sin(((x + y) * Math.PI * 4) / size);
      const value = Math.round(236 + grain * 8 + vein * 5);
      const index = (y * size + x) * 4;
      pixels.set([value, value, value, 255], index);
    }
  }
  const texture = new DataTexture(pixels, size, size);
  texture.name = 'GARDEN_STONE_GRAIN';
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function buildResources(): GardenResources {
  const pieces = Object.fromEntries(SURFACES.map((key) => [key, []])) as Record<
    Surface,
    BufferGeometry[]
  >;
  const add = (key: Surface, geometry: BufferGeometry, color: string) => {
    // A uniform attribute layout allows every surface to become one draw call.
    const count = geometry.getAttribute('position').count;
    const tint = new Color(color);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) colors.set([tint.r, tint.g, tint.b], i * 3);
    geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
    geometry.clearGroups();
    pieces[key].push(geometry);
  };
  const box = (key: Surface, p: Vector3, size: Vector3, color: string) => {
    add(key, new BoxGeometry(size.x, size.y, size.z).translate(p.x, p.y, p.z), color);
  };
  const curve = (key: Surface, points: Vector3[], radius: number, color: string) => {
    add(key, new TubeGeometry(new CatmullRomCurve3(points), 10, radius, 4, false), color);
  };

  // The petals rise gently from a golden throat, with rounded tips and a curved centre vein.
  const petal = surface(6, 3, (u, v) => {
    const width = Math.sin(Math.PI * v) * 0.058;
    const across = u * 2 - 1;
    return new Vector3(across * width, 0.014 + 0.055 * v * v + 0.012 * across * across, v * 0.145);
  });
  const leaf = surface(6, 2, (u, v) => {
    const across = u * 2 - 1;
    return new Vector3(
      across * Math.sin(Math.PI * v) * 0.08,
      0.065 * Math.sin(Math.PI * v) - 0.018 * Math.abs(across),
      v * 0.38,
    );
  });
  const flower = (position: Vector3, scale: number, angle: number, blush = false) => {
    const orientation = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), angle);
    const transform = new Matrix4().compose(
      position,
      orientation,
      new Vector3(scale, scale, scale),
    );
    for (let i = 0; i < 5; i += 1) {
      const geometry = petal
        .clone()
        .rotateY((i * Math.PI * 2) / 5)
        .applyMatrix4(transform);
      add('petals', geometry, blush ? '#eac1b0' : '#fff3d9');
    }
    const throat = new LatheGeometry(
      [
        new Vector2(0, 0),
        new Vector2(0.023, 0.013),
        new Vector2(0.013, 0.025),
        new Vector2(0, 0.03),
      ],
      8,
    ).applyMatrix4(transform);
    add('gold', throat, '#e2b864');
  };
  const spray = (position: Vector3, scale: number, count: number) => {
    for (let i = 0; i < count; i += 1) {
      const angle = i * 2.399963;
      const radius = (0.08 + (i % 3) * 0.066) * scale;
      const head = position
        .clone()
        .add(
          new Vector3(
            Math.cos(angle) * radius,
            (0.18 + (i % 4) * 0.065) * scale,
            Math.sin(angle) * radius,
          ),
        );
      flower(head, scale * (0.7 + (i % 3) * 0.11), Math.cos(angle) * 0.5, i % 5 === 0);
      curve(
        'leaves',
        [
          position,
          position
            .clone()
            .lerp(head, 0.5)
            .add(new Vector3(0.035, 0, 0)),
          head,
        ],
        0.008 * scale,
        '#49623a',
      );
    }
    for (let i = 0; i < count + 3; i += 1) {
      const angle = (i * Math.PI * 2) / (count + 3);
      const geometry = leaf
        .clone()
        .scale(scale, scale, scale)
        .rotateX(-0.1 - (i % 3) * 0.35)
        .rotateY(angle);
      geometry.translate(position.x, position.y + 0.09 * scale, position.z);
      add('leaves', geometry, i % 2 ? '#637e48' : '#3f6439');
    }
  };

  // Tall arrangements remain fully inside the existing canopy collision footprint.
  for (const x of [-1.85, 1.85]) {
    const urn = new LatheGeometry(
      [
        new Vector2(0.17, 0.2),
        new Vector2(0.19, 0.25),
        new Vector2(0.115, 0.3),
        new Vector2(0.11, 0.42),
        new Vector2(0.22, 0.62),
        new Vector2(0.19, 0.71),
        new Vector2(0.2, 0.73),
      ],
      16,
    ).translate(x, 0, -3.35);
    add('stone', urn, '#d6b38c');
    spray(new Vector3(x, 0.69, -3.35), 1, 7);
  }
  for (const x of [-0.55, 0.55]) spray(new Vector3(x, 1.06, -4.75), 0.55, 4);

  // Gathered, scalloped curtains replace the blockout half-lathes at the front posts.
  for (const side of [-1, 1]) {
    const curtain = surface(12, 18, (u, v) => {
      const y = 0.22 + v * 2.52;
      const width = 0.32 + 0.32 * Math.abs(v - 0.5) * 2;
      const center = side * (1.6 + 0.13 * Math.sin(v * Math.PI));
      const x = center + (u - 0.5) * width;
      const folds = Math.sin(u * Math.PI * 12) * (0.022 + Math.abs(v - 0.5) * 0.06);
      return new Vector3(x, y, -3.64 + folds + 0.045 * Math.sin(v * Math.PI));
    });
    add('cloth', curtain, '#f4e4c6');
    curve(
      'gold',
      [
        new Vector3(side * 1.72 - 0.17, 1.35, -3.57),
        new Vector3(side * 1.72, 1.3, -3.52),
        new Vector3(side * 1.72 + 0.17, 1.35, -3.57),
      ],
      0.018,
      '#cda755',
    );
  }
  const swag = surface(28, 4, (u, v) => {
    const scallop = Math.sin(u * Math.PI * 2) ** 2;
    return new Vector3(
      (u - 0.5) * 3.3,
      2.77 - scallop * (0.22 + v * 0.18),
      -3.65 + Math.sin(v * Math.PI * 6) * 0.025 + v * 0.08,
    );
  });
  add('cloth', swag, '#fff1d8');
  for (let i = 0; i < 8; i += 1) {
    flower(new Vector3(-1.5 + (i * 3) / 7, 2.76 - (i % 2) * 0.045, -3.55), 0.67, 0);
  }

  // Layered stone bands and teak/gold scrollwork give the low stage a carved, tangible edge.
  box('stone', new Vector3(0, 0.19, -2.94), new Vector3(4.58, 0.045, 0.09), '#e2c5a0');
  box('stone', new Vector3(0, 0.035, -2.94), new Vector3(4.58, 0.055, 0.09), '#b79470');
  box('teak', new Vector3(0, 0.11, -2.924), new Vector3(4.48, 0.105, 0.025), '#704326');
  for (let i = 0; i < 15; i += 1) {
    const x = -2.08 + i * 0.297;
    curve(
      'gold',
      [
        new Vector3(x - 0.11, 0.085, -2.901),
        new Vector3(x - 0.06, 0.14, -2.891),
        new Vector3(x, 0.125, -2.887),
        new Vector3(x + 0.06, 0.075, -2.891),
        new Vector3(x + 0.11, 0.13, -2.901),
      ],
      0.007,
      '#cba256',
    );
  }
  // Carved brackets sit under the existing eave, never across the open guest path.
  for (const side of [-1, 1]) {
    curve(
      'teak',
      [
        new Vector3(side * 1.58, 2.34, -3.6),
        new Vector3(side * 1.47, 2.55, -3.6),
        new Vector3(side * 1.26, 2.7, -3.6),
        new Vector3(side * 1.08, 2.76, -3.6),
      ],
      0.045,
      '#754522',
    );
    curve(
      'gold',
      [
        new Vector3(side * 1.58, 2.44, -3.55),
        new Vector3(side * 1.43, 2.67, -3.55),
        new Vector3(side * 1.13, 2.79, -3.55),
      ],
      0.009,
      '#d7b26b',
    );
  }
  petal.dispose();
  leaf.dispose();

  const geometry = {} as Record<Surface, BufferGeometry>;
  let triangles = 0;
  for (const key of SURFACES) {
    const merged = mergeGeometries(pieces[key], false);
    if (!merged) throw new Error(`Cannot merge garden surface ${key}`);
    merged.computeBoundingSphere();
    merged.computeBoundingBox();
    geometry[key] = merged;
    triangles += (merged.index?.count ?? merged.getAttribute('position').count) / 3;
    for (const piece of pieces[key]) piece.dispose();
  }
  const stoneMap = stoneTexture();
  const material: Record<Surface, MeshStandardMaterial> = {
    petals: new MeshStandardMaterial({ vertexColors: true, roughness: 0.58, side: DoubleSide }),
    leaves: new MeshStandardMaterial({ vertexColors: true, roughness: 0.72, side: DoubleSide }),
    cloth: new MeshStandardMaterial({ vertexColors: true, roughness: 0.92, side: DoubleSide }),
    teak: new MeshStandardMaterial({ vertexColors: true, roughness: 0.66 }),
    gold: new MeshStandardMaterial({
      vertexColors: true,
      metalness: 0.48,
      roughness: 0.37,
      emissive: '#21190a',
      emissiveIntensity: 0.15,
    }),
    stone: new MeshStandardMaterial({ vertexColors: true, map: stoneMap, roughness: 0.94 }),
  };
  return { geometry, material, stoneMap, users: 0, triangles };
}

export interface GardenDetailsKit {
  root: Group;
  triangles: number;
  drawCalls: number;
  /** Called after commit; render-phase construction cannot leak a shared GPU lease. */
  retain(): void;
  /** Releases GPU allocations after the final live instance, retaining reusable CPU data. */
  dispose(): void;
}

/** Six opaque material batches on every tier; no extra lights, shadows, or animation loops. */
export function createGardenDetails(): GardenDetailsKit {
  const resources = (shared ??= buildResources());
  const root = new Group();
  root.name = 'GARDEN_CANOPY_DETAILS';
  for (const key of SURFACES) {
    const mesh = new Mesh(resources.geometry[key], resources.material[key]);
    mesh.name = `GARDEN_DETAIL_${key.toUpperCase()}`;
    mesh.raycast = noRaycast;
    root.add(mesh);
  }
  let retained = false;
  return {
    root,
    triangles: resources.triangles,
    drawCalls: SURFACES.length,
    retain() {
      if (retained) return;
      retained = true;
      resources.users += 1;
    },
    dispose() {
      if (!retained) return;
      retained = false;
      resources.users -= 1;
      if (resources.users > 0) return;
      for (const key of SURFACES) {
        resources.geometry[key].dispose();
        resources.material[key].dispose();
      }
      resources.stoneMap.dispose();
    },
  };
}
