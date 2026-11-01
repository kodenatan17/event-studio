import { describe, expect, it } from 'vitest';

import { tapSuppressed } from '../input/bus';
import { createWorldStore } from '../scene-manager/store';
import { attachZoomGestures } from './useCameraZoomGestures';

function setup() {
  const target = new EventTarget();
  const store = createWorldStore({ sceneIds: ['entrance'], entrySceneId: 'entrance' });
  const detach = attachZoomGestures(target, store);
  const fire = (type: string, fields: Record<string, number | boolean> = {}) => {
    const event = Object.assign(new Event(type, { cancelable: true }), fields);
    target.dispatchEvent(event);
    return event;
  };
  return { store, fire, detach };
}

describe('camera zoom gestures', () => {
  it('[D-034] wheel down pulls out, wheel up pulls in, and the page never scrolls', () => {
    const { store, fire } = setup();
    expect(fire('wheel', { deltaY: 100, deltaMode: 0 }).defaultPrevented).toBe(true);
    const out = store.getState().cameraZoom;
    expect(out).toBeGreaterThan(1);
    fire('wheel', { deltaY: -100, deltaMode: 0 });
    expect(store.getState().cameraZoom).toBeCloseTo(1);
  });

  it('[D-034] a trackpad pinch (ctrl+wheel) moves further per pixel than a mouse wheel', () => {
    const { store, fire } = setup();
    fire('wheel', { deltaY: 10, deltaMode: 0, ctrlKey: true });
    const pinched = store.getState().cameraZoom;
    store.getState().resetCameraZoom();
    fire('wheel', { deltaY: 10, deltaMode: 0 });
    expect(pinched).toBeGreaterThan(store.getState().cameraZoom);
  });

  it('[D-034] two fingers apart pull in, then the lifted pinch swallows the trailing tap', () => {
    const { store, fire } = setup();
    fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    fire('pointerdown', { pointerId: 2, clientX: 200, clientY: 100 });
    expect(tapSuppressed(store.getState().input, performance.now())).toBe(true);
    fire('pointermove', { pointerId: 2, clientX: 225, clientY: 100 });
    expect(store.getState().cameraZoom).toBeCloseTo(0.8);
    fire('pointerup', { pointerId: 2 });
    expect(tapSuppressed(store.getState().input, performance.now())).toBe(true);
    expect(tapSuppressed(store.getState().input, performance.now() + 1000)).toBe(false);
  });

  it('[D-034] one finger never zooms or suppresses a tap', () => {
    const { store, fire } = setup();
    fire('pointerdown', { pointerId: 1, clientX: 100, clientY: 100 });
    fire('pointermove', { pointerId: 1, clientX: 180, clientY: 100 });
    fire('pointerup', { pointerId: 1 });
    expect(store.getState().cameraZoom).toBe(1);
    expect(tapSuppressed(store.getState().input, performance.now())).toBe(false);
  });

  it('[D-034] detaching removes every listener', () => {
    const { store, fire, detach } = setup();
    detach();
    fire('wheel', { deltaY: 100, deltaMode: 0 });
    expect(store.getState().cameraZoom).toBe(1);
  });
});
