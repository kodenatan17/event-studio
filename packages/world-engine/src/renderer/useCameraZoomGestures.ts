import { useEffect } from 'react';

import type { WorldStore } from '../scene-manager/store';

/** Exponential, so each wheel notch moves the view by the same ratio at any zoom. */
const WHEEL_RATE = 0.0012;
/** Trackpad pinches arrive as ctrl+wheel with much smaller deltas. */
const PINCH_WHEEL_RATE = 0.01;
/** `deltaMode` 1 reports lines, not pixels (Firefox with a mouse wheel). */
const WHEEL_LINE_PX = 16;
/** The click a browser may send after the last finger lifts must not walk the avatar. */
const TAP_GUARD_MS = 250;

interface Point {
  x: number;
  y: number;
}

/**
 * Wheel, trackpad pinch and two-finger pinch on the canvas, all on the store's `cameraZoom`
 * (D-033, D-034). The stick and buttons sit on the DOM layer above the canvas, so a thumb on the
 * stick never counts as a pinch finger.
 */
export function attachZoomGestures(target: EventTarget, store: WorldStore): () => void {
  const pointers = new Map<number, Point>();
  let startSpan = 0;
  let startZoom = 1;

  const span = (): number => {
    const [a, b] = [...pointers.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  };

  const handleWheel = (event: Event) => {
    const wheel = event as WheelEvent;
    // Taken even at the clamp: the page behind never scrolls or zooms under the world (FR-04).
    wheel.preventDefault();
    const pixels = wheel.deltaMode === 1 ? wheel.deltaY * WHEEL_LINE_PX : wheel.deltaY;
    const rate = wheel.ctrlKey ? PINCH_WHEEL_RATE : WHEEL_RATE;
    const state = store.getState();
    state.setCameraZoom(state.cameraZoom * Math.exp(pixels * rate));
  };

  const handleDown = (event: Event) => {
    const { pointerId, clientX: x, clientY: y } = event as PointerEvent;
    pointers.set(pointerId, { x, y });
    if (pointers.size !== 2) return;
    startSpan = span();
    const state = store.getState();
    startZoom = state.cameraZoom;
    state.input.tapGuard.until = Infinity;
  };

  const handleMove = (event: Event) => {
    const { pointerId, clientX: x, clientY: y } = event as PointerEvent;
    const point = pointers.get(pointerId);
    if (!point) return;
    point.x = x;
    point.y = y;
    if (pointers.size !== 2 || startSpan === 0) return;
    const current = span();
    // Fingers apart pull the camera in.
    if (current > 0) store.getState().setCameraZoom((startZoom * startSpan) / current);
  };

  const handleUp = (event: Event) => {
    const { pointerId } = event as PointerEvent;
    if (!pointers.delete(pointerId) || pointers.size !== 1) return;
    startSpan = 0;
    store.getState().input.tapGuard.until = performance.now() + TAP_GUARD_MS;
  };

  target.addEventListener('wheel', handleWheel, { passive: false });
  target.addEventListener('pointerdown', handleDown);
  target.addEventListener('pointermove', handleMove);
  target.addEventListener('pointerup', handleUp);
  target.addEventListener('pointercancel', handleUp);
  return () => {
    target.removeEventListener('wheel', handleWheel);
    target.removeEventListener('pointerdown', handleDown);
    target.removeEventListener('pointermove', handleMove);
    target.removeEventListener('pointerup', handleUp);
    target.removeEventListener('pointercancel', handleUp);
  };
}

export function useCameraZoomGestures(element: HTMLElement, store: WorldStore): void {
  useEffect(() => attachZoomGestures(element, store), [element, store]);
}
