import type { Collider, Vec2 } from '../navigation/walk';
import type { PrimitiveLayout, TemplateDefinition } from './types';

/**
 * `blockout` template: procedural Javanese wedding courtyard (pelataran adat Jawa) built from
 * primitives. Prototype art only — ENGINEERING_DONE / ART_PENDING (architecture.md §11.2, D-019).
 * Never fetches `assetUrl`/`navmeshUrl` (D-008). Units: meters; +z faces the camera.
 */

const HALF_PI = Math.PI / 2;

function collider(id: string, cx: number, cz: number, width: number, depth: number): Collider {
  return {
    id,
    minX: cx - width / 2,
    maxX: cx + width / 2,
    minZ: cz - depth / 2,
    maxZ: cz + depth / 2,
  };
}

function postColliders(prefix: string, points: readonly Vec2[], size: number): Collider[] {
  return points.map(([x, z], index) => collider(`${prefix}_${index + 1}`, x, z, size, size));
}

/** Soko guru (four central pillars) plus the peripheral ring of a joglo pendopo. */
function pendopoPillars(cx: number, cz: number, width: number, depth: number): Vec2[] {
  const sx = width / 2 - 0.9;
  const sz = depth / 2 - 0.9;
  const ring: Vec2[] = [];
  for (const x of [-sx, sx]) {
    for (const t of [0, 1 / 3, 2 / 3, 1]) ring.push([cx + x, cz - sz + t * 2 * sz]);
  }
  for (const x of [-width * 0.22, width * 0.22]) {
    ring.push([cx + x, cz - sz], [cx + x, cz + sz]);
  }
  const soko: Vec2[] = [
    [cx - 2.2, cz - 2.2],
    [cx + 2.2, cz - 2.2],
    [cx - 2.2, cz + 2.2],
    [cx + 2.2, cz + 2.2],
  ];
  return [...soko, ...ring];
}

function cornerPillars(cx: number, cz: number, width: number, depth: number): Vec2[] {
  const sx = width / 2 - 0.5;
  const sz = depth / 2 - 0.5;
  return [
    [cx - sx, cz - sz],
    [cx + sx, cz - sz],
    [cx - sx, cz + sz],
    [cx + sx, cz + sz],
  ];
}

function ring(cx: number, cz: number, radius: number, count: number, phase = 0): Vec2[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = phase + (index / count) * Math.PI * 2;
    return [cx + Math.cos(angle) * radius, cz + Math.sin(angle) * radius] as const;
  });
}

const SKYLINE_TREES: Vec2[] = [
  ...ring(0, -6, 34, 22, 0.1),
  ...ring(0, -6, 27, 14, 0.35).filter(([, z]) => z < -12),
];

// ---------------------------------------------------------------------------------------------
// Entrance — gapura with carved teak doors, janur kuning, lantern-lined path, mandala beyond.
// ---------------------------------------------------------------------------------------------

const ENTRANCE_LANTERNS: Vec2[] = [-2, 0, 2, 4, 6].flatMap((z) => [
  [-1.7, z] as const,
  [1.7, z] as const,
]);
const ENTRANCE_TREES_INSIDE: Vec2[] = [
  [-5.3, -2.5],
  [5.4, -2.9],
];

const entrance: PrimitiveLayout = {
  floor: { minX: -6.2, maxX: 6.2, minZ: -3.6, maxZ: 7, material: 'pavingDark' },
  colliders: [
    collider('WALL_LEFT', -4.9, -4.6, 5.2, 0.7),
    collider('WALL_RIGHT', 4.9, -4.6, 5.2, 0.7),
    collider('GATE_PILLAR_LEFT', -1.75, -4.6, 1.2, 1.2),
    collider('GATE_PILLAR_RIGHT', 1.75, -4.6, 1.2, 1.2),
    collider('JANUR_LEFT', -2.2, -2.9, 0.5, 0.5),
    collider('JANUR_RIGHT', 2.2, -2.9, 0.5, 0.5),
    collider('JANUR_LEFT_2', -2.5, 3, 0.5, 0.5),
    collider('JANUR_RIGHT_2', 2.5, 3, 0.5, 0.5),
    collider('WELCOME_SIGN', 3.2, -1.4, 1.6, 0.8),
    collider('POND_LEFT', -4.6, 2.2, 2.8, 3.2),
    collider('POND_RIGHT', 4.7, 3.6, 2.6, 2.8),
    ...postColliders('LANTERN', ENTRANCE_LANTERNS, 0.34),
    ...postColliders('TREE', ENTRANCE_TREES_INSIDE, 0.5),
  ],
  spawnPoints: {
    SPAWN_ENTRY: [0, 6],
    SPAWN_FROM_LIVING: [0, -2.6],
  },
  hotspots: {
    HS_WELCOME: {
      position: [3.2, 1.35, -1.4],
      size: [1.5, 1.0, 0.1],
      rotationY: -0.35,
      material: 'cream',
    },
  },
  portals: {
    PORTAL_FRONT_DOOR: { position: [0, 1.55, -4.6], size: [2.3, 2.9, 0.2], material: 'teakCarved' },
  },
  camera: { offset: [0, 8.4, 10], lookHeight: 1.0, lookAhead: 5.5 },
  decor: [
    { type: 'ground', material: 'grass', center: [0, -6], size: [90, 90], y: -0.02 },
    { type: 'ground', material: 'pavingDark', center: [0, 4], size: [34, 34], y: -0.012 },
    { type: 'ground', material: 'pavingDark', center: [0, 1.7], size: [13.6, 11] },
    { type: 'ground', material: 'paving', center: [0, 1.7], size: [3, 11], y: 0.004 },
    { type: 'ground', material: 'pavingDark', center: [0, -10.5], size: [15, 11] },
    { type: 'box', material: 'stone', position: [0, 0.08, -4.6], size: [4.8, 0.16, 1.9] },
    { type: 'box', material: 'stoneDark', position: [0, 0.04, -3.5], size: [3.4, 0.08, 0.4] },
    { type: 'wall', start: [-2.3, -4.6], end: [-7.6, -4.6], height: 1.2, thickness: 0.6 },
    { type: 'wall', start: [2.3, -4.6], end: [7.6, -4.6], height: 1.2, thickness: 0.6 },
    { type: 'gapura', position: [0, 0, -4.6], doorWidth: 2.4, pillarWidth: 1.1, height: 3.4 },
    { type: 'janur', position: [-2.2, 0, -2.9], rotationY: 0 },
    { type: 'janur', position: [2.2, 0, -2.9], rotationY: Math.PI },
    { type: 'janur', position: [-2.5, 0, 3], rotationY: 0, scale: 0.85 },
    { type: 'janur', position: [2.5, 0, 3], rotationY: Math.PI, scale: 0.85 },
    { type: 'lanterns', positions: ENTRANCE_LANTERNS },
    {
      type: 'lanterns',
      positions: [
        [-3.6, -9],
        [3.6, -9],
        [-5.5, -12],
        [5.5, -12],
      ],
    },
    // Welcome plaque posts (the plaque face itself is HS_WELCOME).
    { type: 'box', material: 'teakDark', position: [2.55, 0.65, -1.15], size: [0.12, 1.3, 0.12] },
    { type: 'box', material: 'teakDark', position: [3.85, 0.65, -1.65], size: [0.12, 1.3, 0.12] },
    {
      type: 'box',
      material: 'teakCarved',
      position: [3.2, 1.95, -1.4],
      size: [1.7, 0.18, 0.16],
      rotationY: -0.35,
    },
    { type: 'pond', center: [-4.6, 2.2], size: [2.8, 3.2] },
    { type: 'pond', center: [4.7, 3.6], size: [2.6, 2.8] },
    {
      type: 'plumerias',
      positions: [
        ...ENTRANCE_TREES_INSIDE,
        [-8, 5.5],
        [8.2, 4.5],
        [-9, -1],
        [9.2, -1.6],
        [-6.4, 10.5],
        [6.8, 11],
      ],
    },
    {
      type: 'gentong',
      positions: [
        [-2.9, -3.9],
        [2.9, -3.9],
        [-6.6, 6.4],
        [6.6, 6.4],
      ],
    },
    {
      type: 'flowers',
      positions: [
        [-1.15, 0.25, -3.55],
        [1.15, 0.25, -3.55],
        [-2.2, 0.3, -2.45],
        [2.2, 0.3, -2.45],
      ],
    },
    // Beyond the gate: mandala courtyard and the pendopo on the skyline.
    { type: 'mandala', center: [0, -9.6], radius: 4.0 },
    {
      type: 'joglo',
      center: [0, -19],
      size: [15, 9],
      eaveHeight: 3.4,
      pillars: cornerPillars(0, -19, 15, 9),
    },
    {
      type: 'plumerias',
      positions: [
        [-6.5, -8],
        [6.8, -7.5],
        [-8.5, -14],
        [9, -13.5],
      ],
    },
    { type: 'trees', positions: SKYLINE_TREES },
  ],
};

// ---------------------------------------------------------------------------------------------
// Living room — Javanese "dalem": teak interior, carved gebyok, low table with the story book.
// ---------------------------------------------------------------------------------------------

const livingRoom: PrimitiveLayout = {
  floor: { minX: -5.6, maxX: 5.6, minZ: -4.5, maxZ: 4.6, material: 'teakFloor' },
  colliders: [
    collider('TABLE', 0, 0.4, 2.0, 1.2),
    collider('SOFA', 0, -1.55, 2.8, 0.95),
    collider('CHAIR_LEFT', -2.05, 0.4, 0.95, 0.95),
    collider('CHAIR_RIGHT', 2.05, 0.4, 0.95, 0.95),
    collider('GEBYOK', 0, -4.75, 5.4, 0.5),
    collider('PLANT_LEFT', -5.15, -4.05, 0.7, 0.7),
    collider('PLANT_RIGHT', 5.15, -4.05, 0.7, 0.7),
    collider('PLANT_FRONT', 5.1, 4.1, 0.7, 0.7),
  ],
  spawnPoints: {
    SPAWN_ENTRY: [0, 3.3],
    SPAWN_FROM_ENTRANCE: [-4.6, 2.6],
    SPAWN_FROM_GARDEN: [-4.2, -3.7],
    SPAWN_FROM_HALL: [4.2, -3.7],
  },
  hotspots: {
    HS_STORY: {
      position: [0.1, 0.57, 0.4],
      size: [0.6, 0.12, 0.44],
      rotationY: 0.3,
      material: 'red',
    },
    HS_GALLERY_01: {
      position: [-5.78, 1.75, -1.2],
      size: [1.1, 0.8, 0.06],
      rotationY: HALF_PI,
      material: 'photo',
    },
    HS_GALLERY_02: {
      position: [5.78, 1.75, -1.8],
      size: [1.1, 0.8, 0.06],
      rotationY: -HALF_PI,
      material: 'photo',
    },
    HS_GALLERY_03: {
      position: [5.78, 1.75, 1.3],
      size: [1.1, 0.8, 0.06],
      rotationY: -HALF_PI,
      material: 'photo',
    },
  },
  portals: {
    PORTAL_GARDEN_DOOR: {
      position: [-4.2, 1.3, -4.88],
      size: [1.3, 2.5, 0.16],
      material: 'teakCarved',
    },
    PORTAL_HALL_DOOR: {
      position: [4.2, 1.3, -4.88],
      size: [1.3, 2.5, 0.16],
      material: 'teakCarved',
    },
    PORTAL_BACK_TO_ENTRANCE: {
      position: [-5.84, 1.3, 2.6],
      size: [1.3, 2.5, 0.16],
      rotationY: HALF_PI,
      material: 'teakCarved',
    },
  },
  camera: { offset: [0, 7.8, 7.8], lookHeight: 0.5, lookAhead: 2.2 },
  decor: [
    { type: 'ground', material: 'grass', center: [0, -6], size: [90, 90], y: -0.02 },
    { type: 'ground', material: 'pavingDark', center: [0, 4], size: [34, 34], y: -0.012 },
    { type: 'box', material: 'stoneDark', position: [0, -0.1, 0], size: [12.6, 0.2, 10.4] },
    { type: 'ground', material: 'teakFloor', center: [0, 0], size: [12, 10], y: 0.002 },
    { type: 'ground', material: 'carpet', center: [0, -0.3], size: [5.4, 3.6], y: 0.008 },
    // Teak walls (dollhouse cut-away: back and sides only, low front sill).
    { type: 'box', material: 'teak', position: [0, 1.7, -5.1], size: [12.4, 3.4, 0.3] },
    { type: 'box', material: 'teak', position: [-6.05, 1.7, 0], size: [0.3, 3.4, 10.5] },
    { type: 'box', material: 'teak', position: [6.05, 1.7, 0], size: [0.3, 3.4, 10.5] },
    { type: 'box', material: 'teakDark', position: [0, 0.12, 5.05], size: [12.4, 0.24, 0.3] },
    { type: 'box', material: 'teakDark', position: [0, 3.45, -5.1], size: [12.6, 0.2, 0.4] },
    { type: 'box', material: 'teakDark', position: [-6.05, 3.45, 0], size: [0.4, 0.2, 10.7] },
    { type: 'box', material: 'teakDark', position: [6.05, 3.45, 0], size: [0.4, 0.2, 10.7] },
    // Door frames.
    { type: 'box', material: 'teakDark', position: [-4.2, 2.65, -4.9], size: [1.7, 0.2, 0.24] },
    { type: 'box', material: 'teakDark', position: [4.2, 2.65, -4.9], size: [1.7, 0.2, 0.24] },
    { type: 'box', material: 'teakDark', position: [-5.86, 2.65, 2.6], size: [0.24, 0.2, 1.7] },
    // Carved gebyok backdrop.
    { type: 'gebyok', position: [0, 0, -4.85], width: 5.2, height: 3.3 },
    // Gold frames behind the photos.
    { type: 'box', material: 'gold', position: [-5.86, 1.75, -1.2], size: [0.04, 0.96, 1.26] },
    { type: 'box', material: 'gold', position: [5.86, 1.75, -1.8], size: [0.04, 0.96, 1.26] },
    { type: 'box', material: 'gold', position: [5.86, 1.75, 1.3], size: [0.04, 0.96, 1.26] },
    // Low teak table with legs.
    { type: 'box', material: 'teak', position: [0, 0.45, 0.4], size: [1.8, 0.12, 1.0] },
    { type: 'box', material: 'teakDark', position: [-0.8, 0.2, 0.0], size: [0.1, 0.4, 0.1] },
    { type: 'box', material: 'teakDark', position: [0.8, 0.2, 0.0], size: [0.1, 0.4, 0.1] },
    { type: 'box', material: 'teakDark', position: [-0.8, 0.2, 0.8], size: [0.1, 0.4, 0.1] },
    { type: 'box', material: 'teakDark', position: [0.8, 0.2, 0.8], size: [0.1, 0.4, 0.1] },
    {
      type: 'box',
      material: 'gold',
      position: [0.1, 0.64, 0.4],
      size: [0.36, 0.02, 0.3],
      rotationY: 0.3,
    },
    // Carved bench and two armchairs.
    { type: 'box', material: 'cloth', position: [0, 0.42, -1.45], size: [2.6, 0.18, 0.8] },
    { type: 'box', material: 'teakCarved', position: [0, 0.18, -1.45], size: [2.7, 0.36, 0.85] },
    { type: 'box', material: 'teakCarved', position: [0, 0.95, -1.9], size: [2.7, 0.9, 0.14] },
    { type: 'box', material: 'gold', position: [0, 1.44, -1.9], size: [1.2, 0.1, 0.16] },
    { type: 'box', material: 'teakCarved', position: [-2.05, 0.22, 0.4], size: [0.85, 0.44, 0.85] },
    { type: 'box', material: 'cloth', position: [-2.05, 0.48, 0.4], size: [0.8, 0.1, 0.8] },
    { type: 'box', material: 'teakCarved', position: [-2.45, 0.85, 0.4], size: [0.12, 0.9, 0.85] },
    { type: 'box', material: 'teakCarved', position: [2.05, 0.22, 0.4], size: [0.85, 0.44, 0.85] },
    { type: 'box', material: 'cloth', position: [2.05, 0.48, 0.4], size: [0.8, 0.1, 0.8] },
    { type: 'box', material: 'teakCarved', position: [2.45, 0.85, 0.4], size: [0.12, 0.9, 0.85] },
    // Saka pillars in the corners.
    { type: 'box', material: 'teakDark', position: [-5.75, 1.7, -4.8], size: [0.35, 3.4, 0.35] },
    { type: 'box', material: 'teakDark', position: [5.75, 1.7, -4.8], size: [0.35, 3.4, 0.35] },
    {
      type: 'gentong',
      positions: [
        [-5.15, -4.05],
        [5.15, -4.05],
        [5.1, 4.1],
      ],
    },
    { type: 'chandelier', position: [0, 2.9, 0.1], scale: 0.9 },
    { type: 'pointLight', position: [0, 2.6, 0.4], intensity: 6, distance: 11 },
    {
      type: 'flowers',
      positions: [
        [-0.55, 0.6, 0.6],
        [-2.7, 3.0, -4.7],
        [2.7, 3.0, -4.7],
      ],
    },
    { type: 'trees', positions: SKYLINE_TREES },
  ],
};

// ---------------------------------------------------------------------------------------------
// Wedding garden — open pelataran: mandala, lotus ponds, plumeria, akad canopy, photo booth.
// ---------------------------------------------------------------------------------------------

const GARDEN_LANTERNS = ring(0, 0.6, 3.4, 8, Math.PI / 8);
const GARDEN_TREES_INSIDE: Vec2[] = [
  [-6.2, -3.2],
  [-4.4, -5.6],
  [3.4, -5.9],
  [6.6, 0.2],
];
const CANOPY_PILLARS = cornerPillars(0, -4.7, 4.2, 3.2);

const weddingGarden: PrimitiveLayout = {
  floor: { minX: -7.5, maxX: 7.5, minZ: -6.5, maxZ: 6.5, material: 'paving' },
  colliders: [
    collider('AKAD_CANOPY', 0, -4.7, 4.6, 3.6),
    collider('JANUR_AKAD_LEFT', -2.4, -2.7, 0.5, 0.5),
    collider('JANUR_AKAD_RIGHT', 2.4, -2.7, 0.5, 0.5),
    collider('PHOTO_BOOTH', 5.5, -3.3, 2.6, 1.3),
    collider('POND_LEFT', -5.3, 3.4, 2.8, 3.4),
    collider('POND_RIGHT', 5.3, 3.4, 2.8, 3.4),
    ...postColliders(
      'POT',
      [
        [4.3, -2.5],
        [6.8, -3.7],
      ],
      0.6,
    ),
    collider('GATE_PILLAR_NORTH', -7.6, -1.95, 1.0, 1.0),
    collider('GATE_PILLAR_SOUTH', -7.6, 0.75, 1.0, 1.0),
    ...postColliders('LANTERN', GARDEN_LANTERNS, 0.34),
    ...postColliders('TREE', GARDEN_TREES_INSIDE, 0.5),
  ],
  spawnPoints: {
    SPAWN_ENTRY: [0, 5.4],
    SPAWN_FROM_LIVING: [-6.4, -0.6],
  },
  hotspots: {
    HS_EVENT_CEREMONY: {
      position: [0, 0.6, -4.7],
      size: [1.5, 0.8, 0.8],
      material: 'cloth',
    },
    HS_PHOTO: {
      position: [5.5, 1.45, -3.4],
      size: [2.4, 2.5, 0.16],
      rotationY: -0.45,
      material: 'cream',
    },
  },
  portals: {
    PORTAL_BACK_TO_LIVING: {
      position: [-7.6, 1.45, -0.6],
      size: [1.7, 2.9, 0.2],
      rotationY: HALF_PI,
      material: 'teakCarved',
    },
  },
  camera: { offset: [0, 7.4, 9.5], lookHeight: 1.0, lookAhead: 3 },
  decor: [
    { type: 'ground', material: 'grass', center: [0, -6], size: [90, 90], y: -0.02 },
    { type: 'ground', material: 'pavingDark', center: [0, 4], size: [34, 34], y: -0.012 },
    { type: 'ground', material: 'paving', center: [0, 0], size: [17, 15] },
    { type: 'ground', material: 'pavingDark', center: [0, 4.2], size: [2.4, 6], y: 0.003 },
    { type: 'mandala', center: [0, 0.6], radius: 3.0 },
    // Akad canopy: raised stone platform, four teak pillars, small joglo roof, janur at the front.
    { type: 'box', material: 'stone', position: [0, 0.1, -4.7], size: [4.6, 0.2, 3.6] },
    {
      type: 'joglo',
      center: [0, -4.7],
      size: [5.2, 4.2],
      eaveHeight: 2.9,
      pillars: CANOPY_PILLARS,
    },
    { type: 'drapes', positions: CANOPY_PILLARS.slice(2), height: 2.7 },
    { type: 'janur', position: [-2.4, 0, -2.7], rotationY: 0, scale: 0.9 },
    { type: 'janur', position: [2.4, 0, -2.7], rotationY: Math.PI, scale: 0.9 },
    { type: 'box', material: 'gold', position: [0, 1.02, -4.7], size: [0.5, 0.04, 0.3] },
    {
      type: 'flowers',
      positions: [
        [-0.55, 1.05, -4.75],
        [0.55, 1.05, -4.75],
      ],
    },
    // Photo booth: flower-framed backdrop with a janur arch above.
    {
      type: 'box',
      material: 'teakCarved',
      position: [5.5, 1.45, -3.5],
      size: [2.7, 2.8, 0.1],
      rotationY: -0.45,
    },
    { type: 'janur', position: [4.35, 0, -2.85], rotationY: -0.45, scale: 1.0 },
    {
      type: 'gentong',
      positions: [
        [4.3, -2.5],
        [6.8, -3.7],
      ],
    },
    { type: 'pond', center: [-5.3, 3.4], size: [2.8, 3.4] },
    { type: 'pond', center: [5.3, 3.4], size: [2.8, 3.4] },
    { type: 'lanterns', positions: GARDEN_LANTERNS },
    {
      type: 'lanterns',
      positions: [
        [-1.6, 6.9],
        [1.6, 6.9],
        [-1.6, -7],
        [1.6, -7],
      ],
    },
    {
      type: 'plumerias',
      positions: [
        ...GARDEN_TREES_INSIDE,
        [-9, 6],
        [9.3, 5.5],
        [-10, -6],
        [10, -4],
        [-7, 10.5],
        [7.4, 11],
      ],
    },
    // Side gate back to the living room.
    {
      type: 'gapura',
      position: [-7.6, 0, -0.6],
      rotationY: HALF_PI,
      doorWidth: 1.7,
      pillarWidth: 1.0,
      height: 3.2,
    },
    { type: 'wall', start: [-7.9, -2.5], end: [-7.9, -8.5], height: 1.3, thickness: 0.5 },
    { type: 'wall', start: [-7.9, 1.3], end: [-7.9, 7.5], height: 1.3, thickness: 0.5 },
    // Side pavilions and the pendopo on the skyline.
    {
      type: 'joglo',
      center: [11, -8],
      size: [6, 5],
      eaveHeight: 2.8,
      pillars: cornerPillars(11, -8, 6, 5),
    },
    {
      type: 'joglo',
      center: [0, -15],
      size: [14, 8],
      eaveHeight: 3.2,
      pillars: cornerPillars(0, -15, 14, 8),
    },
    { type: 'trees', positions: SKYLINE_TREES },
  ],
};

// ---------------------------------------------------------------------------------------------
// Reception hall — joglo pendopo: soko guru, tiered roof, drapes, chandeliers, pelaminan.
// ---------------------------------------------------------------------------------------------

const HALL_CENTER: Vec2 = [0, -0.8];
const HALL_SIZE: Vec2 = [17, 14.6];
const HALL_PILLARS = pendopoPillars(HALL_CENTER[0], HALL_CENTER[1], HALL_SIZE[0], HALL_SIZE[1]);
const HALL_TABLES: Vec2[] = [
  [-4.6, -2.9],
  [4.6, -2.9],
  [-4.6, 0.1],
  [4.6, 0.1],
];
const FRONT_PILLARS = HALL_PILLARS.filter(([, z]) => z > 5);

const receptionHall: PrimitiveLayout = {
  floor: { minX: -7, maxX: 7, minZ: -6, maxZ: 5.6, material: 'stone' },
  colliders: [
    collider('STAGE', 0, -5.0, 6.0, 2.2),
    collider('RSVP_DESK', -3.9, 2.9, 2.0, 0.9),
    collider('GUESTBOOK_STAND', 4.2, 2.9, 0.9, 0.8),
    collider('DOOR_PILLAR_NORTH', -7.0, 1.95, 0.6, 0.6),
    collider('DOOR_PILLAR_SOUTH', -7.0, 4.05, 0.6, 0.6),
    ...HALL_TABLES.map(([x, z], index) => collider(`TABLE_${index + 1}`, x, z, 2.5, 2.5)),
    ...postColliders('PILLAR', HALL_PILLARS, 0.5),
  ],
  spawnPoints: {
    SPAWN_ENTRY: [0, 4.4],
    SPAWN_FROM_LIVING: [-5.8, 3],
  },
  hotspots: {
    HS_EVENT_RECEPTION: {
      position: [0, 0.25, -5.0],
      size: [5.6, 0.5, 1.8],
      material: 'teakCarved',
    },
    HS_RSVP: { position: [-3.9, 0.45, 2.9], size: [1.8, 0.9, 0.7], material: 'teak' },
    HS_GUESTBOOK: { position: [4.2, 0.55, 2.9], size: [0.7, 1.1, 0.55], material: 'teakCarved' },
  },
  portals: {
    PORTAL_BACK_TO_LIVING: {
      position: [-7.0, 1.3, 3.0],
      size: [1.5, 2.6, 0.16],
      rotationY: HALF_PI,
      material: 'teakCarved',
    },
  },
  camera: { offset: [0, 4.0, 13], lookHeight: 3.3, lookAhead: 2 },
  decor: [
    { type: 'ground', material: 'grass', center: [0, -6], size: [90, 90], y: -0.02 },
    { type: 'ground', material: 'pavingDark', center: [0, 4], size: [34, 34], y: -0.012 },
    { type: 'ground', material: 'pavingDark', center: [0, 2], size: [26, 24], y: -0.01 },
    { type: 'box', material: 'stoneDark', position: [0, -0.06, -0.8], size: [17.4, 0.16, 15] },
    { type: 'ground', material: 'stone', center: [0, -0.8], size: [17, 14.6], y: 0.022 },
    { type: 'ground', material: 'carpet', center: [0, 0.4], size: [1.8, 10.4], y: 0.03 },
    { type: 'mandala', center: [0, 9.2], radius: 2.4 },
    {
      type: 'joglo',
      center: HALL_CENTER,
      size: HALL_SIZE,
      eaveHeight: 4.0,
      pillars: HALL_PILLARS,
    },
    { type: 'drapes', positions: FRONT_PILLARS, height: 3.8 },
    // Pelaminan: gebyok backdrop, couple chairs and flowers on the stage (HS_EVENT_RECEPTION).
    { type: 'gebyok', position: [0, 0.5, -5.85], width: 6.0, height: 3.2 },
    { type: 'box', material: 'gold', position: [-0.6, 0.95, -5.3], size: [0.8, 0.9, 0.6] },
    { type: 'box', material: 'gold', position: [0.6, 0.95, -5.3], size: [0.8, 0.9, 0.6] },
    { type: 'box', material: 'white', position: [-0.6, 0.6, -5.15], size: [0.75, 0.14, 0.5] },
    { type: 'box', material: 'white', position: [0.6, 0.6, -5.15], size: [0.75, 0.14, 0.5] },
    {
      type: 'flowers',
      positions: [
        [-2.3, 0.75, -4.6],
        [2.3, 0.75, -4.6],
        [-1.6, 0.75, -5.6],
        [1.6, 0.75, -5.6],
        [-3.9, 1.0, 2.9],
        [4.2, 1.2, 2.9],
      ],
    },
    { type: 'box', material: 'cloth', position: [-3.9, 0.92, 2.9], size: [1.9, 0.04, 0.8] },
    { type: 'box', material: 'cream', position: [4.2, 1.13, 2.85], size: [0.6, 0.05, 0.42] },
    { type: 'roundTables', positions: HALL_TABLES },
    { type: 'chandelier', position: [0, 3.5, -0.8], scale: 1.4 },
    { type: 'chandelier', position: [-4.6, 3.4, -1.4], scale: 0.8 },
    { type: 'chandelier', position: [4.6, 3.4, -1.4], scale: 0.8 },
    { type: 'pointLight', position: [0, 3.1, -0.8], intensity: 10, distance: 14 },
    { type: 'pointLight', position: [0, 2.4, -4.4], intensity: 6, distance: 8 },
    // Free-standing carved door back to the living room.
    {
      type: 'gapura',
      position: [-7.0, 0, 3.0],
      rotationY: HALF_PI,
      doorWidth: 1.5,
      pillarWidth: 0.6,
      height: 3.0,
    },
    {
      type: 'lanterns',
      positions: [
        [-1.6, 6.6],
        [1.6, 6.6],
        [-5.2, 6.6],
        [5.2, 6.6],
      ],
    },
    {
      type: 'gentong',
      positions: [
        [-3.2, 6.9],
        [3.2, 6.9],
      ],
    },
    {
      type: 'plumerias',
      positions: [
        [-10.5, 5],
        [10.5, 4.5],
        [-11, -6],
        [11, -7],
      ],
    },
    { type: 'trees', positions: SKYLINE_TREES },
  ],
};

/** Trusted, code-side template catalog (D-008). Unknown ids → `UNKNOWN_TEMPLATE`. */
export const templates: Readonly<Record<string, TemplateDefinition>> = {
  blockout: {
    kind: 'primitive',
    layouts: {
      entrance,
      'living-room': livingRoom,
      'wedding-garden': weddingGarden,
      'reception-hall': receptionHall,
    },
  },
};

/** Layout for a scene of a primitive template, or `null` when the template cannot render it. */
export function getPrimitiveLayout(templateId: string, sceneId: string): PrimitiveLayout | null {
  const template = Object.hasOwn(templates, templateId) ? templates[templateId] : undefined;
  if (!template || template.kind !== 'primitive') return null;
  return Object.hasOwn(template.layouts, sceneId) ? (template.layouts[sceneId] ?? null) : null;
}
