import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { RefObject } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { MAX_FRAME_DELTA } from '../navigation/walk';
import type { Vec3 } from '../templates/types';

interface FollowCameraProps {
  /** Avatar position, mutated every frame by the avatar controller. */
  target: RefObject<Vector3>;
  offset: Vec3;
  lookHeight: number;
  lookAhead: number;
  /** Floor center x; portrait framing leans sideways toward it so the room stays in view. */
  focusCenterX?: number;
  /** Landscape vertical field of view (degrees); portrait widens it. */
  fov?: number;
  /** Caps the camera height above the avatar (portrait lift included). */
  maxHeight?: number;
  reducedMotion: boolean;
}

const FOLLOW_RATE = 4;
/** A new scene's camera starts this far above/behind its follow position and eases in. */
const ARRIVAL_OFFSET = new Vector3(0, 1.5, 2.5);
const BASE_FOV = 45;
const MAX_PORTRAIT_FOV = 70;
const LIFT_PER_PORTRAIT = 1.2;
const CENTER_PULL_PER_PORTRAIT = 1.7;
const MAX_CENTER_PULL = 0.9;
/** The camera never leans further than this (m) from the avatar, so it stays in frame. */
const MAX_LEAN = 4.5;

interface Framing {
  fov: number;
  /** Multiplies the whole offset (pull back). */
  distance: number;
  /** Extra multiplier on the offset height: a steeper view fills a tall screen with floor. */
  lift: number;
  /** Sideways: 0 = follow the avatar exactly, 1 = frame the floor center. */
  centerPull: number;
}

/**
 * Portrait phones widen the view, pull back, look down more steeply and lean sideways toward
 * the room center, so a narrow screen shows the room's key props instead of empty floor around an
 * avatar standing near a wall. Landscape keeps the plain follow view.
 */
function framingFor(aspect: number, baseFov: number): Framing {
  if (aspect >= 1) return { fov: baseFov, distance: 1, lift: 1, centerPull: 0 };
  const portrait = 1 - aspect;
  const halfFov = (baseFov * Math.PI) / 360;
  const fov = (2 * Math.atan(Math.tan(halfFov) / Math.pow(aspect, 0.75)) * 180) / Math.PI;
  return {
    fov: Math.min(MAX_PORTRAIT_FOV, fov),
    distance: 1 + portrait * 0.7,
    lift: 1 + portrait * LIFT_PER_PORTRAIT,
    centerPull: Math.min(MAX_CENTER_PULL, portrait * CENTER_PULL_PER_PORTRAIT),
  };
}

const lean = (value: number): number => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, value));

/**
 * Fixed 3/4 elevated follow view (architecture.md §8.1). Each scene arrival eases in from
 * `ARRIVAL_OFFSET`; reduced motion snaps instead of easing.
 */
export function FollowCamera({
  target,
  offset,
  lookHeight,
  lookAhead,
  focusCenterX,
  fov: baseFov = BASE_FOV,
  maxHeight = Infinity,
  reducedMotion,
}: FollowCameraProps) {
  const look = useRef(new Vector3());
  const desired = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());
  const initialized = useRef(false);

  useFrame(({ camera, size }, delta) => {
    const { fov, distance, lift, centerPull } = framingFor(
      size.width / Math.max(size.height, 1),
      baseFov,
    );
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const avatar = target.current;
    const focusX =
      focusCenterX === undefined
        ? avatar.x
        : avatar.x + lean((focusCenterX - avatar.x) * centerPull);
    desired.current.set(
      focusX + offset[0] * distance,
      avatar.y + Math.min(offset[1] * distance * lift, maxHeight),
      avatar.z + offset[2] * distance,
    );
    lookTarget.current.set(focusX, avatar.y + lookHeight, avatar.z - lookAhead);
    if (!initialized.current) {
      camera.position.copy(desired.current);
      if (!reducedMotion) {
        camera.position.add(ARRIVAL_OFFSET);
        // Interiors cap the height (beams); the arrival respects it too.
        camera.position.y = Math.min(camera.position.y, avatar.y + maxHeight);
      }
      look.current.copy(lookTarget.current);
      initialized.current = true;
    } else if (reducedMotion) {
      camera.position.copy(desired.current);
      look.current.copy(lookTarget.current);
    } else {
      const t = 1 - Math.exp(-Math.min(delta, MAX_FRAME_DELTA) * FOLLOW_RATE);
      camera.position.lerp(desired.current, t);
      look.current.lerp(lookTarget.current, t);
    }
    camera.lookAt(look.current);
  });

  return null;
}
