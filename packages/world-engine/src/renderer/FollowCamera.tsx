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
/** Portrait moves in on the avatar: a tall screen is narrow, so a distant figure is lost (D-037). */
const CLOSE_IN_PER_PORTRAIT = 0.72;
const LIFT_PER_PORTRAIT = 0.2;
const LOOK_AHEAD_DROP_PER_PORTRAIT = 0.85;
const CENTER_PULL_PER_PORTRAIT = 1.7;
const MAX_CENTER_PULL = 0.9;
const MAX_LEAN = 4.5;
/** The avatar stays within this share of the half-width from the screen center (D-037). */
const SAFE_LEAN = 0.3;
/** The part of the avatar the framing keeps in view (m above its feet). */
const AVATAR_CHEST = 0.9;
/** Landscape viewports shorter than this (px) are framed tighter: a phone on its side. */
const SHORT_VIEWPORT = 620;
const SHORT_RANGE = 220;
/** Full-short-viewport pull-in and flattening (fractions of the authored rig). */
const SHORT_PULL = 0.25;
const SHORT_FLATTEN = 0.3;

interface Framing {
  fov: number;
  /** Multiplies the whole offset (pull back). */
  distance: number;
  /** Extra multiplier on the offset height: a steeper view fills a tall screen with floor. */
  lift: number;
  /** Sideways: 0 = follow the avatar exactly, 1 = frame the floor center. */
  centerPull: number;
  /** Multiplies the rig's `lookAhead`: looking far past the avatar drops it down the screen. */
  lookAhead: number;
}

/**
 * Portrait phones widen the view, move in on the avatar and lean a little toward the room center,
 * so a narrow screen keeps the avatar large and shows the room's props behind it. Landscape keeps the plain follow view, except on a short viewport
 * (a phone on its side, a short browser window): the authored rig then leaves the room tiny and
 * the camera high, so it pulls in and flattens.
 */
export function framingFor(aspect: number, height: number, baseFov: number): Framing {
  if (aspect >= 1) {
    const short = Math.min(1, Math.max(0, (SHORT_VIEWPORT - height) / SHORT_RANGE));
    return {
      fov: baseFov,
      distance: 1 - SHORT_PULL * short,
      lift: 1 - SHORT_FLATTEN * short,
      centerPull: 0,
      lookAhead: 1,
    };
  }
  const portrait = 1 - aspect;
  const halfFov = (baseFov * Math.PI) / 360;
  const fov = (2 * Math.atan(Math.tan(halfFov) / Math.pow(aspect, 0.75)) * 180) / Math.PI;
  return {
    fov: Math.min(MAX_PORTRAIT_FOV, fov),
    distance: 1 - portrait * CLOSE_IN_PER_PORTRAIT,
    lift: 1 + portrait * LIFT_PER_PORTRAIT,
    centerPull: Math.min(MAX_CENTER_PULL, portrait * CENTER_PULL_PER_PORTRAIT),
    lookAhead: 1 - portrait * LOOK_AHEAD_DROP_PER_PORTRAIT,
  };
}

/** The framed part of a `CameraRig`: what a frame's camera pose depends on. */
export interface FollowRig {
  offset: Vec3;
  lookHeight: number;
  lookAhead: number;
  maxHeight: number;
}

interface FollowView {
  aspect: number;
  /** Guest zoom: scales the authored distance. */
  zoom: number;
  /** Floor center x; `undefined` follows the avatar exactly. */
  focusCenterX?: number;
}

/**
 * Half the width the camera sees at the avatar's depth (m). Leaning moves camera and aim together,
 * so it does not change this.
 */
function halfWidthAtAvatar(
  rise: number,
  back: number,
  lookHeight: number,
  lookAhead: number,
  tanHalfWidth: number,
): number {
  const aimDown = rise - lookHeight;
  const aimBack = back + lookAhead;
  const length = Math.hypot(aimDown, aimBack) || 1;
  const depth = ((rise - AVATAR_CHEST) * aimDown + back * aimBack) / length;
  return depth * tanHalfWidth;
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

/**
 * Camera position and aim for one frame, pure (`position`/`look` are written to). The lean toward
 * the room center is capped by what the camera sees, not by a fixed distance: the view narrows on a
 * tall screen and when zoomed in, and a fixed cap walked the avatar off the screen (D-037).
 */
export function followPose(
  position: Vector3,
  look: Vector3,
  avatar: Vector3,
  rig: FollowRig,
  framing: Framing,
  { aspect, zoom, focusCenterX }: FollowView,
): void {
  const distance = framing.distance * zoom;
  const rise = Math.min(rig.offset[1] * distance * framing.lift, rig.maxHeight);
  const back = rig.offset[2] * distance;
  // Zooming in aims lower and nearer: a rig's high aim would tip the avatar off the screen's foot.
  const aim = Math.min(1, framing.lookAhead * zoom);
  const lookAhead = rig.lookAhead * aim;
  const lookHeight = AVATAR_CHEST + (rig.lookHeight - AVATAR_CHEST) * aim;
  const tanHalfWidth = Math.tan((framing.fov * Math.PI) / 360) * aspect;
  const limit = Math.min(
    MAX_LEAN,
    SAFE_LEAN * halfWidthAtAvatar(rise, back, lookHeight, lookAhead, tanHalfWidth),
  );
  const lean =
    focusCenterX === undefined
      ? 0
      : Math.max(-limit, Math.min(limit, (focusCenterX - avatar.x) * framing.centerPull));
  const focusX = avatar.x + lean;
  position.set(focusX + rig.offset[0] * distance, avatar.y + rise, avatar.z + back);
  look.set(focusX, avatar.y + lookHeight, avatar.z - lookAhead);
}

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
    const state = store.getState();
    const aspect = size.width / Math.max(size.height, 1);
    const framing = framingFor(aspect, size.height, baseFov);
    const { fov } = framing;
    if (camera instanceof PerspectiveCamera && Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const avatar = target.current;
    // Guest zoom is the authored distance scaled by `cameraZoom` (already clamped by the store).
    followPose(
      desired.current,
      lookTarget.current,
      avatar,
      { offset, lookHeight, lookAhead, maxHeight },
      framing,
      { aspect, zoom: state.cameraZoom, focusCenterX },
    );

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
