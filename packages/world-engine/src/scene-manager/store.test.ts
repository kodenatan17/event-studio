import { afterEach, describe, expect, it, vi } from 'vitest';

import { createWorldStore, selectInputEnabled, selectTransitionStatus } from './store';

const SCENES = ['entrance', 'living-room', 'wedding-garden', 'reception-hall'];

/** Store that has finished loading the entry scene. */
function readyStore() {
  const store = createWorldStore({ sceneIds: SCENES, entrySceneId: 'entrance' });
  store.getState().start();
  const { transitionRequestId } = store.getState();
  store.getState().sceneLoading(transitionRequestId);
  store.getState().sceneReady(transitionRequestId);
  return store;
}

describe('createWorldStore', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('[FR-01] start loads the entry scene', () => {
    const store = createWorldStore({ sceneIds: SCENES, entrySceneId: 'entrance' });
    expect(store.getState().status).toBe('BOOT');

    store.getState().start();
    expect(store.getState()).toMatchObject({
      status: 'SWITCHING_SCENE',
      pendingSceneId: 'entrance',
      transitionRequestId: 1,
    });
    expect(selectTransitionStatus(store.getState())).toBe('switching');

    store.getState().sceneLoading(1);
    expect(selectTransitionStatus(store.getState())).toBe('loading');
    store.getState().sceneReady(1);
    expect(store.getState()).toMatchObject({
      status: 'READY',
      currentSceneId: 'entrance',
      pendingSceneId: null,
    });
    expect(selectTransitionStatus(store.getState())).toBe('idle');
  });

  it('[FR-04] stale sceneReady ignored', () => {
    const store = readyStore();
    const first = store.getState().requestScene('living-room');
    const second = store.getState().requestScene('wedding-garden', 'from-living');
    expect(second).toBe((first ?? 0) + 1);

    store.getState().sceneReady(first ?? -1);
    expect(store.getState().status).toBe('SWITCHING_SCENE');
    expect(store.getState().currentSceneId).toBe('entrance');

    store.getState().sceneReady(second ?? -1);
    expect(store.getState()).toMatchObject({ status: 'READY', currentSceneId: 'wedding-garden' });

    // A repeated (StrictMode) callback changes nothing.
    store.getState().sceneReady(second ?? -1);
    expect(store.getState().transitionRequestId).toBe(second);
  });

  it('[FR-04] double tap = one request', () => {
    const store = readyStore();
    const before = store.getState().transitionRequestId;

    const first = store.getState().requestScene('living-room', 'from-entrance');
    const again = store.getState().requestScene('living-room', 'from-entrance');

    expect(again).toBe(first);
    expect(store.getState().transitionRequestId).toBe(before + 1);
  });

  it('[FR-04] same scene while READY is a no-op', () => {
    const store = readyStore();
    const before = store.getState().transitionRequestId;

    expect(store.getState().requestScene('entrance')).toBeNull();
    expect(store.getState()).toMatchObject({ status: 'READY', transitionRequestId: before });
  });

  it('[FR-04] navigate closes overlay first', () => {
    const store = readyStore();
    store.getState().dispatch({ type: 'open_welcome' });
    expect(store.getState().status).toBe('OVERLAY_OPEN');

    store.getState().dispatch({ type: 'navigate', sceneId: 'living-room', spawnPointId: 'from-x' });

    expect(store.getState()).toMatchObject({
      activeOverlay: null,
      status: 'SWITCHING_SCENE',
      pendingSceneId: 'living-room',
      pendingSpawnPointId: 'from-x',
    });
  });

  it('[§8.2] unknown scene ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = readyStore();
    const before = store.getState().transitionRequestId;

    expect(store.getState().requestScene('secret-room')).toBeNull();

    expect(store.getState()).toMatchObject({ status: 'READY', transitionRequestId: before });
    expect(warn).toHaveBeenCalledOnce();
  });

  it('[FR-01] context loss → FALLBACK_2D', () => {
    const store = readyStore();
    store.getState().requestScene('living-room');
    const inFlight = store.getState().transitionRequestId;

    store.getState().enterFallback('context_lost');
    store.getState().sceneReady(inFlight);

    expect(store.getState()).toMatchObject({
      status: 'FALLBACK_2D',
      fallbackReason: 'context_lost',
      currentSceneId: 'entrance',
    });
    expect(store.getState().requestScene('living-room')).toBeNull();
    // Only a manual 2D switch can be undone.
    store.getState().exitFallback();
    expect(store.getState().status).toBe('FALLBACK_2D');
  });

  it('[FR-01] manual 2D mode can return to 3D', () => {
    const store = readyStore();
    store.getState().enterFallback('manual');
    store.getState().exitFallback();

    expect(store.getState()).toMatchObject({
      status: 'SWITCHING_SCENE',
      pendingSceneId: 'entrance',
      fallbackReason: null,
    });
  });

  it('[FR-01] sceneFailed → ERROR, retry works', () => {
    const store = readyStore();
    const failed = store.getState().requestScene('reception-hall', 'from-living') ?? -1;
    store.getState().sceneLoading(failed);
    store.getState().sceneFailed(failed, 'UNKNOWN_TEMPLATE');

    expect(store.getState()).toMatchObject({
      status: 'ERROR',
      error: { code: 'UNKNOWN_TEMPLATE' },
    });
    expect(selectTransitionStatus(store.getState())).toBe('failed');

    store.getState().retry();
    const retried = store.getState().transitionRequestId;
    expect(retried).toBe(failed + 1);
    expect(store.getState()).toMatchObject({
      status: 'SWITCHING_SCENE',
      pendingSceneId: 'reception-hall',
      pendingSpawnPointId: 'from-living',
      error: null,
    });

    store.getState().sceneReady(retried);
    expect(store.getState()).toMatchObject({ status: 'READY', currentSceneId: 'reception-hall' });
  });

  it('[FR-04] ERROR → requestScene(current) recovers', () => {
    const store = readyStore();
    const failed = store.getState().requestScene('living-room') ?? -1;
    store.getState().sceneFailed(failed, 'SCENE_LOAD_FAILED');
    expect(store.getState()).toMatchObject({ status: 'ERROR', currentSceneId: 'entrance' });

    const recovered = store.getState().requestScene('entrance');
    expect(recovered).toBe(failed + 1);
    expect(store.getState()).toMatchObject({
      status: 'SWITCHING_SCENE',
      pendingSceneId: 'entrance',
      error: null,
    });
    store.getState().sceneReady(recovered ?? -1);
    expect(store.getState()).toMatchObject({ status: 'READY', currentSceneId: 'entrance' });
  });

  it('[FR-04] ERROR → requestScene(failed pending) recovers', () => {
    const store = readyStore();
    const failed = store.getState().requestScene('reception-hall') ?? -1;
    store.getState().sceneFailed(failed, 'SCENE_LOAD_FAILED');

    // The failed target is still pending, but ERROR is not an in-flight load: a new request starts.
    const again = store.getState().requestScene('reception-hall');
    expect(again).toBe(failed + 1);
    expect(store.getState()).toMatchObject({ status: 'SWITCHING_SCENE', error: null });
    store.getState().sceneFailed(failed, 'SCENE_LOAD_FAILED');
    expect(store.getState().status).toBe('SWITCHING_SCENE');
    store.getState().sceneReady(again ?? -1);
    expect(store.getState()).toMatchObject({ status: 'READY', currentSceneId: 'reception-hall' });
  });

  it('[T-108] initialFallbackReason starts in 2D; manual can enter 3D', () => {
    const store = createWorldStore({
      sceneIds: SCENES,
      entrySceneId: 'entrance',
      initialFallbackReason: 'manual',
    });
    expect(store.getInitialState()).toMatchObject({
      status: 'FALLBACK_2D',
      fallbackReason: 'manual',
    });
    // start() only runs from BOOT.
    store.getState().start();
    expect(store.getState().status).toBe('FALLBACK_2D');
    // No WebGL detected after mount: the reason becomes non-manual and 3D stays locked.
    store.getState().enterFallback('webgl_unsupported');
    expect(store.getState().fallbackReason).toBe('webgl_unsupported');
    store.getState().exitFallback();
    expect(store.getState().status).toBe('FALLBACK_2D');

    const manual = createWorldStore({
      sceneIds: SCENES,
      entrySceneId: 'entrance',
      initialFallbackReason: 'manual',
    });
    manual.getState().exitFallback();
    expect(manual.getState()).toMatchObject({
      status: 'SWITCHING_SCENE',
      pendingSceneId: 'entrance',
    });
  });

  it('[§8.2] overlay open disables input', () => {
    const store = readyStore();
    expect(selectInputEnabled(store.getState())).toBe(true);

    store.getState().dispatch({ type: 'open_gallery', startIndex: 1 });
    expect(store.getState().activeOverlay).toEqual({ type: 'open_gallery', startIndex: 1 });
    expect(selectInputEnabled(store.getState())).toBe(false);

    store.getState().closeOverlay();
    expect(store.getState().status).toBe('READY');
    expect(selectInputEnabled(store.getState())).toBe(true);
  });

  it('[G-01] info overlay opens while scene loading', () => {
    const store = readyStore();
    const requestId = store.getState().requestScene('living-room') ?? -1;

    store.getState().dispatch({ type: 'open_event_info' });
    expect(store.getState()).toMatchObject({
      status: 'SWITCHING_SCENE',
      activeOverlay: { type: 'open_event_info' },
    });
    expect(selectInputEnabled(store.getState())).toBe(false);

    // The transition keeps running underneath the overlay.
    store.getState().sceneLoading(requestId);
    expect(store.getState()).toMatchObject({
      status: 'LOADING_SCENE',
      activeOverlay: { type: 'open_event_info' },
    });

    store.getState().closeOverlay();
    expect(store.getState()).toMatchObject({ status: 'LOADING_SCENE', activeOverlay: null });
    expect(selectInputEnabled(store.getState())).toBe(false);

    // Quick map during a load; picking the pending scene keeps one request and closes the map.
    store.getState().openOverlay({ type: 'quick_map' });
    expect(store.getState().activeOverlay).toEqual({ type: 'quick_map' });
    expect(store.getState().requestScene('living-room')).toBe(requestId);
    expect(store.getState()).toMatchObject({ status: 'LOADING_SCENE', activeOverlay: null });
  });

  it('[G-01] info overlay opens in ERROR and close returns to ERROR', () => {
    const store = readyStore();
    const failed = store.getState().requestScene('reception-hall') ?? -1;
    store.getState().sceneFailed(failed, 'SCENE_LOAD_FAILED');

    store.getState().dispatch({ type: 'open_rsvp' });
    expect(store.getState()).toMatchObject({
      status: 'ERROR',
      activeOverlay: { type: 'open_rsvp' },
      error: { code: 'SCENE_LOAD_FAILED' },
    });
    expect(selectInputEnabled(store.getState())).toBe(false);

    store.getState().closeOverlay();
    expect(store.getState()).toMatchObject({
      status: 'ERROR',
      activeOverlay: null,
      pendingSceneId: 'reception-hall',
    });

    // Retry still works after the overlay closed.
    store.getState().retry();
    expect(store.getState()).toMatchObject({ status: 'SWITCHING_SCENE', error: null });
  });

  it('[FR-04] sceneReady during open overlay keeps overlay open', () => {
    const store = readyStore();
    const requestId = store.getState().requestScene('living-room') ?? -1;
    store.getState().sceneLoading(requestId);
    store.getState().openOverlay({ type: 'quick_map' });

    store.getState().sceneReady(requestId);
    expect(store.getState()).toMatchObject({
      status: 'OVERLAY_OPEN',
      currentSceneId: 'living-room',
      pendingSceneId: null,
      activeOverlay: { type: 'quick_map' },
    });
    expect(selectInputEnabled(store.getState())).toBe(false);

    store.getState().closeOverlay();
    expect(store.getState()).toMatchObject({ status: 'READY', currentSceneId: 'living-room' });
    expect(selectInputEnabled(store.getState())).toBe(true);
  });

  it('[§8.2] overlays are ignored in BOOT', () => {
    const store = createWorldStore({ sceneIds: SCENES, entrySceneId: 'entrance' });

    store.getState().dispatch({ type: 'open_story' });

    expect(store.getState()).toMatchObject({ status: 'BOOT', activeOverlay: null });
  });

  it('[§12] audio stays off until enabled', () => {
    const store = readyStore();
    expect(store.getState().soundEnabled).toBe(false);
    store.getState().setSound(true);
    expect(store.getState().soundEnabled).toBe(true);
  });
});
