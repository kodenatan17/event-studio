import type { OverlayAction, WorldAction } from '@undangan/contracts/world';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';

import { devWarn } from '../dev';

/** Viewer state machine (architecture.md §8.2). */
export type WorldStatus =
  | 'BOOT'
  | 'LOADING_MANIFEST'
  | 'LOADING_SCENE'
  | 'READY'
  | 'OVERLAY_OPEN'
  | 'SWITCHING_SCENE'
  | 'ERROR'
  | 'FALLBACK_2D';

/** `quick_map` is engine-level navigation UI; everything else comes from a `WorldAction`. */
export type ActiveOverlay = OverlayAction | { type: 'quick_map' };

export type QualityProfile = 'auto' | 'high' | 'low';

/** Which failure sent the viewer to 2D (D-017). */
export type FallbackReason =
  'webgl_unsupported' | 'context_lost' | 'render_error' | 'asset_failed' | 'manual';

export type TransitionStatus = 'idle' | 'switching' | 'loading' | 'failed';

/** Floor point `[x, z]` the avatar walks toward. */
export type FloorPoint = [number, number];

export interface WorldStateData {
  status: WorldStatus;
  currentSceneId: string | null;
  pendingSceneId: string | null;
  pendingSpawnPointId: string | null;
  /** Incremented per accepted transition; callbacks with an older id are stale. */
  transitionRequestId: number;
  activeOverlay: ActiveOverlay | null;
  avatarPresetId: 'default';
  qualityProfile: QualityProfile;
  soundEnabled: boolean;
  marker: FloorPoint | null;
  error: { code: string } | null;
  fallbackReason: FallbackReason | null;
  /** `gl.info.memory.geometries`, reported by the renderer for leak checks (FR-04). */
  glGeometries: number | null;
}

export interface WorldActions {
  /** BOOT → first transition to the entry scene. */
  start(): void;
  /** Same entry point for 3D hotspots and HTML controls (architecture.md §8.3). */
  dispatch(action: WorldAction): void;
  /** Returns the request id that will load `sceneId`, or `null` when nothing was requested. */
  requestScene(sceneId: string, spawnPointId?: string): number | null;
  sceneLoading(requestId: number): void;
  sceneReady(requestId: number): void;
  sceneFailed(requestId: number, code: string): void;
  openOverlay(overlay: ActiveOverlay): void;
  closeOverlay(): void;
  enterFallback(reason: FallbackReason): void;
  exitFallback(): void;
  retry(): void;
  setQuality(quality: QualityProfile): void;
  setSound(enabled: boolean): void;
  setMarker(marker: FloorPoint | null): void;
  setGlGeometries(count: number): void;
}

export type WorldState = WorldStateData & WorldActions;
export type WorldStore = StoreApi<WorldState>;

export interface WorldStoreOptions {
  sceneIds: readonly string[];
  entrySceneId: string;
  /** Start in 2D (e.g. `?mode=2d`) so the first server render is already the 2D view (T-108). */
  initialFallbackReason?: FallbackReason;
}

export const selectTransitionStatus = (state: WorldStateData): TransitionStatus => {
  switch (state.status) {
    case 'SWITCHING_SCENE':
      return 'switching';
    case 'LOADING_SCENE':
      return 'loading';
    case 'ERROR':
      return 'failed';
    default:
      return 'idle';
  }
};

/** Avatar/floor/hotspot input only while the scene is ready and no overlay blocks it. */
export const selectInputEnabled = (state: WorldStateData): boolean => state.status === 'READY';

const LOADING_STATUSES: readonly WorldStatus[] = ['SWITCHING_SCENE', 'LOADING_SCENE'];

/** One store per viewer mount; never a module singleton. */
export function createWorldStore({
  sceneIds,
  entrySceneId,
  initialFallbackReason,
}: WorldStoreOptions): WorldStore {
  const known = new Set(sceneIds);

  return createStore<WorldState>()((set, get) => {
    /** Starts a new transition unconditionally; callers enforce the transition rules. */
    const beginTransition = (sceneId: string, spawnPointId?: string | null): number => {
      const requestId = get().transitionRequestId + 1;
      set({
        status: 'SWITCHING_SCENE',
        pendingSceneId: sceneId,
        pendingSpawnPointId: spawnPointId ?? null,
        transitionRequestId: requestId,
        activeOverlay: null,
        marker: null,
        error: null,
      });
      return requestId;
    };

    const isCurrentLoad = (requestId: number): boolean => {
      const state = get();
      return requestId === state.transitionRequestId && LOADING_STATUSES.includes(state.status);
    };

    return {
      status: initialFallbackReason ? 'FALLBACK_2D' : 'BOOT',
      currentSceneId: null,
      pendingSceneId: null,
      pendingSpawnPointId: null,
      transitionRequestId: 0,
      activeOverlay: null,
      avatarPresetId: 'default',
      qualityProfile: 'auto',
      soundEnabled: false,
      marker: null,
      error: null,
      fallbackReason: initialFallbackReason ?? null,
      glGeometries: null,

      start() {
        if (get().status !== 'BOOT') return;
        if (!known.has(entrySceneId)) {
          devWarn(`Entry scene "${entrySceneId}" is not listed`);
          set({ status: 'ERROR', error: { code: 'UNKNOWN_SCENE' } });
          return;
        }
        beginTransition(entrySceneId);
      },

      dispatch(action) {
        if (action.type === 'navigate') {
          get().requestScene(action.sceneId, action.spawnPointId);
        } else {
          get().openOverlay(action);
        }
      },

      requestScene(sceneId, spawnPointId) {
        const state = get();
        if (!known.has(sceneId)) {
          devWarn(`Ignoring navigation to unknown scene "${sceneId}"`);
          return null;
        }
        if (state.status === 'BOOT' || state.status === 'FALLBACK_2D') return null;
        if (LOADING_STATUSES.includes(state.status) && state.pendingSceneId === sceneId) {
          // Rapid double tap: keep the in-flight request (FR-04); a map opened meanwhile closes.
          if (state.activeOverlay) set({ activeOverlay: null });
          return state.transitionRequestId;
        }
        if (
          (state.status === 'READY' || state.status === 'OVERLAY_OPEN') &&
          state.currentSceneId === sceneId
        ) {
          if (state.activeOverlay) set({ activeOverlay: null, status: 'READY' });
          return null;
        }
        return beginTransition(sceneId, spawnPointId);
      },

      sceneLoading(requestId) {
        if (isCurrentLoad(requestId)) set({ status: 'LOADING_SCENE' });
      },

      sceneReady(requestId) {
        // Stale or repeated callbacks (StrictMode, superseded requests) are dropped.
        if (!isCurrentLoad(requestId)) return;
        set({
          // An overlay opened during the load stays open over the new scene (G-01).
          status: get().activeOverlay ? 'OVERLAY_OPEN' : 'READY',
          currentSceneId: get().pendingSceneId,
          pendingSceneId: null,
          pendingSpawnPointId: null,
        });
      },

      sceneFailed(requestId, code) {
        if (!isCurrentLoad(requestId)) return;
        // Keep the pending target so retry() can request it again (D-017).
        set({ status: 'ERROR', error: { code } });
      },

      openOverlay(overlay) {
        const { status } = get();
        if (status === 'READY' || status === 'OVERLAY_OPEN') {
          set({ activeOverlay: overlay, status: 'OVERLAY_OPEN', marker: null });
        } else if (
          status === 'FALLBACK_2D' ||
          status === 'ERROR' ||
          LOADING_STATUSES.includes(status)
        ) {
          // Guests always reach the map, date and RSVP (G-01): 2D mode, a failed scene and an
          // in-flight load keep their status, so closing returns to it and input stays suspended.
          set({ activeOverlay: overlay, marker: null });
        }
      },

      closeOverlay() {
        const { status } = get();
        set({ activeOverlay: null, ...(status === 'OVERLAY_OPEN' ? { status: 'READY' } : {}) });
      },

      enterFallback(reason) {
        const state = get();
        if (state.status === 'FALLBACK_2D' && state.fallbackReason !== 'manual') return;
        set({
          status: 'FALLBACK_2D',
          fallbackReason: reason,
          // Invalidate in-flight scene loads.
          transitionRequestId: state.transitionRequestId + 1,
          pendingSceneId: null,
          pendingSpawnPointId: null,
          activeOverlay: null,
          marker: null,
        });
      },

      exitFallback() {
        const state = get();
        if (state.status !== 'FALLBACK_2D' || state.fallbackReason !== 'manual') return;
        set({ fallbackReason: null });
        beginTransition(state.currentSceneId ?? entrySceneId);
      },

      retry() {
        const state = get();
        if (state.status !== 'ERROR') return;
        beginTransition(
          state.pendingSceneId ?? state.currentSceneId ?? entrySceneId,
          state.pendingSpawnPointId,
        );
      },

      setQuality(qualityProfile) {
        set({ qualityProfile });
      },

      setSound(soundEnabled) {
        set({ soundEnabled });
      },

      setMarker(marker) {
        set({ marker });
      },

      setGlGeometries(glGeometries) {
        if (get().glGeometries !== glGeometries) set({ glGeometries });
      },
    };
  });
}
