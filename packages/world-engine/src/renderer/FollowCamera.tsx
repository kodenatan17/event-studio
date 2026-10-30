import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import type { RefObject } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';

import { MAX_FRAME_DELTA } from '../navigation/walk';
import type { WorldStore } from '../scene-manager/store';
import type { Vec3 } from '../templates/types';

interface FollowCameraProps {
  store: WorldStore;
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

/** Avatar editor preview: margin around the figure, and what the camera aims at (m). */
const PREVIEW_FRAME_HEIGHT = 2.4;
const PREVIEW_CHEST = 0.98;
/** Preview camera height above the aim point: just enough to see the top of the head. */
const PREVIEW_RISE = 0.28;
const PREVIEW_INSET_RATE = 8;

/**
 * Camera for the avatar editor, on the scene's authored follow side (known to be wall-free) and
 * never further out than the follow camera. Distance frames the figure in the part of the view
 * the panel leaves free.
 */
function previewPosition(
  out: Vector3,
  avatar: Vector3,
  offset: Vec3,
  fov: number,
  freeHeight: number,
): void {
  const reach = Math.hypot(offset[0], offset[2]) || 1;
  const halfFov = (fov * Math.PI) / 360;
  const distance = Math.min(reach, PREVIEW_FRAME_HEIGHT / (2 * Math.tan(halfFov) * freeHeight));
  out.set(
    avatar.x + (offset[0] / reach) * distance,
    avatar.y + PREVIEW_CHEST + PREVIEW_RISE,
    avatar.z + (offset[2] / reach) * distance,
  );
}

const lean = (value: number): number => Math.max(-MAX_LEAN, Math.min(MAX_LEAN, value));

/**
 * Fixed 3/4 elevated follow view (architecture.md §8.1). Each scene arrival eases in from
 * `ARRIVAL_OFFSET`; reduced motion snaps instead of easing. While the avatar editor is open the
 * same camera frames the whole figure, its view shifted clear of the editor panel.
 */
export function FollowCamera({
  store,
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
  const inset = useRef({ right: 0, bottom: 0 });

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

    const state = store.getState();
    const previewing = state.activeOverlay?.type === 'avatar_editor';
    const { preview } = state.input;
    if (previewing) {
      previewPosition(desired.current, avatar, offset, fov, 1 - preview.insetBottom);
      lookTarget.current.set(avatar.x, avatar.y + PREVIEW_CHEST, avatar.z);
    }
    if (camera instanceof PerspectiveCamera) {
      const goalRight = previewing ? preview.insetRight : 0;
      const goalBottom = previewing ? preview.insetBottom : 0;
      const ease = reducedMotion
        ? 1
        : 1 - Math.exp(-Math.min(delta, MAX_FRAME_DELTA) * PREVIEW_INSET_RATE);
      const view = inset.current;
      view.right += (goalRight - view.right) * ease;
      view.bottom += (goalBottom - view.bottom) * ease;
      const settled = Math.abs(view.right) + Math.abs(view.bottom) < 0.001;
      if (settled && !previewing) {
        view.right = 0;
        view.bottom = 0;
        if (camera.view?.enabled) camera.clearViewOffset();
      } else {
        const { width, height } = size;
        camera.setViewOffset(
          width,
          height,
          (view.right * width) / 2,
          (view.bottom * height) / 2,
          width,
          height,
        );
      }
    }

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
