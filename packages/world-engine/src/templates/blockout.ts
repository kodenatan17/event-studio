import type { Collider, Vec2 } from '../navigation/walk';
import type { GltfLayout, PrimitiveLayout, SceneLayout, TemplateDefinition } from './types';

/**
 * `blockout` template: procedural Javanese wedding courtyard (pelataran adat Jawa) built from
 * primitives, except the living room, which loads the joglo interior GLB from the code-side `url`.
 * Prototype art only — ENGINEERING_DONE / ART_PENDING (architecture.md §11.2, D-019).
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
  kind: 'primitive',
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
// Living room — joglo interior GLB (assets/source/joglo-interior, ART_PENDING): saka guru, carved
// gebyok, story table with the book, six photo frames on the back wall, open front toward +z.
// ---------------------------------------------------------------------------------------------

/** Saka guru umpak bases and perimeter post bases (`build_joglo_interior.py` make_shell). */
const JOGLO_SAKA_GURU: Vec2[] = [-2.3, 2.3].flatMap((x) =>
  [-2.35, 2.35].map((z) => [x, z] as const),
);
const JOGLO_POSTS: Vec2[] = [-6.25, -2.95, 2.95, 6.25].flatMap((x) =>
  [-4.65, 4.6].map((z) => [x, z] as const),
);
const JOGLO_VASES: Vec2[] = [
  [-5.4, -3.7],
  [5.4, -3.7],
  [-5.4, 4.0],
  [5.4, 4.0],
];

const livingRoom: GltfLayout = {
  kind: 'gltf',
  url: '/templates/joglo/1.0.0/living-room.glb',
  nodeMap: {
    HS_STORY: 'STORY_BOOK__HS_STORY_BOOK',
    HS_GALLERY_01: 'GALLERY_01__HS_GALLERY_01',
    HS_GALLERY_02: 'GALLERY_02__HS_GALLERY_01',
    HS_GALLERY_03: 'GALLERY_03__HS_GALLERY_01',
    HS_GALLERY_04: 'GALLERY_04__HS_GALLERY_01',
    HS_GALLERY_05: 'GALLERY_05__HS_GALLERY_01',
    HS_GALLERY_06: 'GALLERY_06__HS_GALLERY_01',
    PORTAL_GARDEN_DOOR: 'HS_PORTAL_WEDDING_GARDEN',
    PORTAL_HALL_DOOR: 'HS_PORTAL_RECEPTION_HALL',
    PORTAL_BACK_TO_ENTRANCE: 'TRIGGER_BACK_TO_ENTRANCE',
  },
  triggers: {
    // The GLB has no front door: a low threshold strip along the open front edge.
    TRIGGER_BACK_TO_ENTRANCE: { position: [0, 0.47, 5.05], size: [3.2, 0.2, 0.6] },
  },
  // `scene-config.json` walkable rect; floor finish top at y ≈ 0.37.
  floor: {
    minX: -6.4,
    maxX: 6.4,
    minZ: -4.65,
    maxZ: 4.65,
    y: 0.37,
    nodeName: 'SHELL__FLOOR_WALKABLE',
  },
  colliders: [
    // `scene-config.json` obstacles (chairs widened for their rotated footprint).
    collider('STORY_TABLE', 0, 0.4, 2.35, 1.5),
    collider('SOFA_LEFT', -4.5, 1.4, 1.1, 2.8),
    collider('SOFA_RIGHT', 4.5, 1.4, 1.1, 2.8),
    collider('CHAIR_LEFT', -3.8, -0.75, 1.0, 1.0),
    collider('CHAIR_RIGHT', 3.8, -0.75, 1.0, 1.0),
    // Props missing from `scene-config.json` (positions from `build_joglo_interior.py`).
    collider('CHAIR_FRONT', 2.9, 3.15, 0.9, 0.9),
    collider('WAYANG', -5.6, -3.4, 1.4, 0.45),
    collider('GAMELAN', 5.35, -3.4, 2.0, 0.85),
    collider('GEBYOK', 0, -5.0, 7.4, 0.5),
    ...postColliders('SAKA_GURU', JOGLO_SAKA_GURU, 0.56),
    ...postColliders('POST', JOGLO_POSTS, 0.38),
    ...postColliders('VASE', JOGLO_VASES, 0.55),
  ],
  spawnPoints: {
    // GLB `SPAWN_ENTRY` (bbox center); the doors sit behind the wayang/gamelan corners.
    SPAWN_ENTRY: [0, 4.05],
    SPAWN_FROM_ENTRANCE: [0, 4.05],
    SPAWN_FROM_GARDEN: [-3.9, -4.0],
    SPAWN_FROM_HALL: [3.9, -4.0],
  },
  // Frontal view under the front eave (ornament bottom ≈ y 4.45) so the gebyok and frames show.
  camera: { offset: [0, 3.6, 7.4], lookHeight: 2.0, lookAhead: 3.2, fov: 50, maxHeight: 3.9 },
  decor: [
    { type: 'ground', material: 'grass', center: [0, -6], size: [90, 90], y: -0.02 },
    { type: 'ground', material: 'pavingDark', center: [0, 4], size: [34, 34], y: -0.012 },
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
  kind: 'primitive',
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
  kind: 'primitive',
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
    layouts: {
      entrance,
      'living-room': livingRoom,
      'wedding-garden': weddingGarden,
      'reception-hall': receptionHall,
    },
  },
};

/** Layout for a scene of a catalog template, or `null` when the template cannot render it. */
export function getSceneLayout(templateId: string, sceneId: string): SceneLayout | null {
  const template = Object.hasOwn(templates, templateId) ? templates[templateId] : undefined;
  if (!template) return null;
  return Object.hasOwn(template.layouts, sceneId) ? (template.layouts[sceneId] ?? null) : null;
}
