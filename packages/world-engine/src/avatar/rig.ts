import { Bone, Group, Skeleton, Vector3 } from 'three';

import type { BodyType } from './wardrobe';

/**
 * 17-bone humanoid rig shared by the guest avatar and the couple figures (FR-07). Bones have
 * identity rest rotations, so clips are plain rotations from rest; positions are the rest pose in
 * root space (feet at y = 0, facing +z, the character's left at +x). Stylised-realistic ~7-head
 * proportions: pria 1.70 m (head 0.243 m), wanita 1.60 m (head 0.229 m).
 */
export const BONE_NAMES = [
  'pelvis',
  'spine',
  'chest',
  'neck',
  'head',
  'shoulder_l',
  'elbow_l',
  'wrist_l',
  'shoulder_r',
  'elbow_r',
  'wrist_r',
  'hip_l',
  'knee_l',
  'ankle_l',
  'hip_r',
  'knee_r',
  'ankle_r',
] as const;

export type BoneName = (typeof BONE_NAMES)[number];

/** Bone index in `BONE_NAMES` (the skin index written into geometry). */
export const BONE = Object.fromEntries(BONE_NAMES.map((name, index) => [name, index])) as Record<
  BoneName,
  number
>;

const PARENT: Readonly<Record<BoneName, BoneName | null>> = {
  pelvis: null,
  spine: 'pelvis',
  chest: 'spine',
  neck: 'chest',
  head: 'neck',
  shoulder_l: 'chest',
  elbow_l: 'shoulder_l',
  wrist_l: 'elbow_l',
  shoulder_r: 'chest',
  elbow_r: 'shoulder_r',
  wrist_r: 'elbow_r',
  hip_l: 'pelvis',
  knee_l: 'hip_l',
  ankle_l: 'knee_l',
  hip_r: 'pelvis',
  knee_r: 'hip_r',
  ankle_r: 'knee_r',
};

type P3 = readonly [number, number, number];

/** Rest joint positions and the head volume of one body. */
export interface BodyDims {
  body: BodyType;
  height: number;
  joints: Readonly<Record<BoneName, P3>>;
  /** Head ellipsoid: centre and half extents (x width, y height, z depth). */
  head: { center: P3; rx: number; ry: number; rz: number };
}

/** Left-side joints; the right side mirrors x. */
interface SideJoints {
  shoulder: P3;
  elbow: P3;
  wrist: P3;
  hip: P3;
  knee: P3;
  ankle: P3;
}

function dims(
  body: BodyType,
  height: number,
  spine: { pelvis: P3; spine: P3; chest: P3; neck: P3; head: P3 },
  side: SideJoints,
  head: BodyDims['head'],
): BodyDims {
  const mirror = ([x, y, z]: P3): P3 => [-x, y, z];
  return {
    body,
    height,
    head,
    joints: {
      ...spine,
      shoulder_l: side.shoulder,
      elbow_l: side.elbow,
      wrist_l: side.wrist,
      shoulder_r: mirror(side.shoulder),
      elbow_r: mirror(side.elbow),
      wrist_r: mirror(side.wrist),
      hip_l: side.hip,
      knee_l: side.knee,
      ankle_l: side.ankle,
      hip_r: mirror(side.hip),
      knee_r: mirror(side.knee),
      ankle_r: mirror(side.ankle),
    },
  };
}

/** Arms rest slightly away from the body (≈ 8°), so sleeves never intersect the torso. */
export const BODY_DIMS: Readonly<Record<BodyType, BodyDims>> = {
  pria: dims(
    'pria',
    1.7,
    {
      pelvis: [0, 0.96, 0],
      spine: [0, 1.07, -0.008],
      chest: [0, 1.25, -0.012],
      neck: [0, 1.445, -0.018],
      head: [0, 1.535, -0.008],
    },
    {
      shoulder: [0.183, 1.392, -0.018],
      elbow: [0.222, 1.104, -0.034],
      wrist: [0.248, 0.852, -0.01],
      hip: [0.09, 0.892, 0],
      knee: [0.094, 0.488, 0.012],
      ankle: [0.096, 0.08, -0.02],
    },
    { center: [0, 1.582, 0.006], rx: 0.081, ry: 0.118, rz: 0.098 },
  ),
  wanita: dims(
    'wanita',
    1.6,
    {
      pelvis: [0, 0.905, 0],
      spine: [0, 1.0, -0.008],
      chest: [0, 1.17, -0.012],
      neck: [0, 1.358, -0.016],
      head: [0, 1.442, -0.008],
    },
    {
      shoulder: [0.162, 1.31, -0.016],
      elbow: [0.198, 1.042, -0.03],
      wrist: [0.226, 0.806, -0.006],
      hip: [0.088, 0.842, 0],
      knee: [0.09, 0.458, 0.012],
      ankle: [0.09, 0.076, -0.02],
    },
    { center: [0, 1.4865, 0.006], rx: 0.077, ry: 0.1135, rz: 0.093 },
  ),
};

export interface Rig {
  dims: BodyDims;
  /** Character root: bones and meshes hang below it; the avatar controller moves it. */
  root: Group;
  bones: Bone[];
  skeleton: Skeleton;
}

/** Builds the bone hierarchy in its rest pose and a skeleton with rest-pose inverses. */
export function createRig(body: BodyType): Rig {
  const bodyDims = BODY_DIMS[body];
  const root = new Group();
  root.name = 'CHARACTER';
  const bones = BONE_NAMES.map((name) => {
    const bone = new Bone();
    bone.name = name;
    return bone;
  });
  BONE_NAMES.forEach((name, index) => {
    const bone = bones[index]!;
    const parentName = PARENT[name];
    const world = new Vector3(...bodyDims.joints[name]);
    if (parentName) {
      world.sub(new Vector3(...bodyDims.joints[parentName]));
      bones[BONE[parentName]]!.add(bone);
    } else {
      root.add(bone);
    }
    bone.position.copy(world);
  });
  root.updateMatrixWorld(true);
  // Inverses from the current (rest) world matrices; the root is at the origin here.
  const skeleton = new Skeleton(bones);
  return { dims: bodyDims, root, bones, skeleton };
}

export function joint(dimsOrRig: BodyDims, name: BoneName): Vector3 {
  return new Vector3(...dimsOrRig.joints[name]);
}
