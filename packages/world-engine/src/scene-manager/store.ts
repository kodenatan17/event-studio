import type { OverlayAction, WorldAction } from '@undangan/contracts/world';
import { createStore } from 'zustand/vanilla';
import type { StoreApi } from 'zustand/vanilla';

import { appearanceKey, defaultAppearance, normalizeAppearance } from '../avatar/appearance';
import type { AvatarAppearance } from '../avatar/appearance';
import { devWarn } from '../dev';
import { createInputBus } from '../input/bus';
import type { InputBus } from '../input/bus';
import type { InteractiveTag } from '../interaction/registry';

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

/**
 * `quick_map` and `avatar_editor` are engine-level UI overlays; everything else comes from a
 * `WorldAction` (architecture.md §8.3).
 */
export type ActiveOverlay = OverlayAction | { type: 'quick_map' } | { type: 'avatar_editor' };

export type QualityProfile = 'auto' | 'high' | 'low';

/** Which failure sent the viewer to 2D (D-017). */
export type FallbackReason =
  'webgl_unsupported' | 'context_lost' | 'render_error' | 'asset_failed' | 'manual';

export type TransitionStatus = 'idle' | 'switching' | 'loading' | 'failed';

/** Floor point `[x, z]` the avatar walks toward. */
export type FloorPoint = [number, number];

/** Post-processing actually running (`resolveRenderTier`, §12); test hook `data-postfx`. */
export type PostFx = 'bloom' | 'off';

/** Avatar position probe grid (m). */
const PROBE_STEP = 0.05;

export interface WorldStateData {
  status: WorldStatus;
  currentSceneId: string | null;
  pendingSceneId: string | null;
  pendingSpawnPointId: string | null;
  /** Incremented per accepted transition; callbacks with an older id are stale. */
  transitionRequestId: number;
  activeOverlay: ActiveOverlay | null;
  /** Guest avatar look (FR-07); always normalised, catalog ids only. */
  avatarAppearance: AvatarAppearance;
  qualityProfile: QualityProfile;
  soundEnabled: boolean;
  marker: FloorPoint | null;
  error: { code: string } | null;
  fallbackReason: FallbackReason | null;
  /** `gl.info.memory.geometries`, reported by the renderer for leak checks (FR-04). */
  glGeometries: number | null;
  /** `appearanceKey` of the character actually built in the scene; null while there is none. */
  characterKey: string | null;
  /** Node names of the template figures standing in the scene (`data-couple`). */
  figureNodes: readonly string[];
  /**
   * Keyboard/joystick/button input, mutated in place by input sources and read by the avatar
   * every frame. Never replace it through `set()` (no per-frame React renders).
   */
  input: InputBus;
  /** Hotspot/portal within reach of the avatar ("Buka"); changes only when the target does. */
  nearby: InteractiveTag | null;
  /** Avatar floor position, 0.05 m grid, sampled ≤ 4 Hz (test hook, never per frame). */
  avatarProbe: FloorPoint | null;
  postFx: PostFx;
  /** GLB download progress 0..1 of the current request, or `null` when unknown. */
  loadProgress: number | null;
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
  /** Normalises; a look with the same `appearanceKey` changes nothing. */
  setAvatarAppearance(appearance: AvatarAppearance): void;
  setQuality(quality: QualityProfile): void;
  setSound(enabled: boolean): void;
  setMarker(marker: FloorPoint | null): void;
  setGlGeometries(count: number): void;
  setCharacterKey(key: string | null): void;
  addFigure(nodeName: string): void;
  removeFigure(nodeName: string): void;
  setNearby(tag: InteractiveTag | null): void;
  setAvatarProbe(point: FloorPoint | null): void;
  setPostFx(postFx: PostFx): void;
  /** Ignored unless `requestId` is the scene load in flight. */
  setLoadProgress(requestId: number, progress: number | null): void;
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

const quantize = (value: number): number =>
  Number((Math.round(value / PROBE_STEP) * PROBE_STEP).toFixed(2));

/** One store per viewer mount; never a module singleton. */
export function createWorldStore({
  sceneIds,
  entrySceneId,
  initialFallbackReason,
}: WorldStoreOptions): WorldStore {
  const known = new Set(sceneIds);
  const input = createInputBus();

  return createStore<WorldState>()((set, get) => {
    /** Starts a new transition unconditionally; callers enforce the transition rules. */
    const beginTransition = (sceneId: string, spawnPointId?: string | null): number => {
      const requestId = get().transitionRequestId + 1;
      // Input is locked for the switch (§8.4): held keys and queued taps do not carry over.
      input.reset();
      set({
        status: 'SWITCHING_SCENE',
        pendingSceneId: sceneId,
        pendingSpawnPointId: spawnPointId ?? null,
        transitionRequestId: requestId,
        activeOverlay: null,
        marker: null,
        error: null,
        nearby: null,
        avatarProbe: null,
        loadProgress: null,
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
      avatarAppearance: defaultAppearance(),
      qualityProfile: 'auto',
      soundEnabled: false,
      marker: null,
      error: null,
      fallbackReason: initialFallbackReason ?? null,
      glGeometries: null,
      characterKey: null,
      figureNodes: [],
      input,
      nearby: null,
      avatarProbe: null,
      postFx: 'off',
      loadProgress: null,

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
        // The avatar editor previews the live character, so it needs a ready scene and no other
        // overlay; the D-027 loading/ERROR exception does not apply to it.
        if (overlay.type === 'avatar_editor' && status !== 'READY') return;
        if (status === 'READY' || status === 'OVERLAY_OPEN') {
          // Overlays suspend avatar input (§8.2): nothing held or queued survives the dialog.
          input.reset();
          set({ activeOverlay: overlay, status: 'OVERLAY_OPEN', marker: null, nearby: null });
        } else if (
          status === 'FALLBACK_2D' ||
          status === 'ERROR' ||
          LOADING_STATUSES.includes(status)
        ) {
          // Guests always reach the map, date and RSVP (G-01): 2D mode, a failed scene and an
          // in-flight load keep their status, so closing returns to it and input stays suspended.
          input.reset();
          set({ activeOverlay: overlay, marker: null, nearby: null });
        }
      },

      closeOverlay() {
        const { status } = get();
        set({ activeOverlay: null, ...(status === 'OVERLAY_OPEN' ? { status: 'READY' } : {}) });
      },

      enterFallback(reason) {
        const state = get();
        if (state.status === 'FALLBACK_2D' && state.fallbackReason !== 'manual') return;
        input.reset();
        set({
          status: 'FALLBACK_2D',
          fallbackReason: reason,
          // Invalidate in-flight scene loads.
          transitionRequestId: state.transitionRequestId + 1,
          pendingSceneId: null,
          pendingSpawnPointId: null,
          activeOverlay: null,
          marker: null,
          nearby: null,
          avatarProbe: null,
          loadProgress: null,
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

      setAvatarAppearance(appearance) {
        const next = normalizeAppearance(appearance);
        if (appearanceKey(next) !== appearanceKey(get().avatarAppearance)) {
          set({ avatarAppearance: next });
        }
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

      setCharacterKey(characterKey) {
        if (get().characterKey !== characterKey) set({ characterKey });
      },

      addFigure(nodeName) {
        const { figureNodes } = get();
        if (!figureNodes.includes(nodeName)) set({ figureNodes: [...figureNodes, nodeName] });
      },

      removeFigure(nodeName) {
        const { figureNodes } = get();
        if (figureNodes.includes(nodeName)) {
          set({ figureNodes: figureNodes.filter((name) => name !== nodeName) });
        }
      },

      setGlGeometries(glGeometries) {
        if (get().glGeometries !== glGeometries) set({ glGeometries });
      },

      setNearby(nearby) {
        const current = get().nearby;
        if (current?.kind === nearby?.kind && current?.id === nearby?.id) return;
        set({ nearby: nearby ? { kind: nearby.kind, id: nearby.id } : null });
      },

      setAvatarProbe(point) {
        const next: FloorPoint | null = point ? [quantize(point[0]), quantize(point[1])] : null;
        const current = get().avatarProbe;
        if (current?.[0] === next?.[0] && current?.[1] === next?.[1]) return;
        set({ avatarProbe: next });
      },

      setPostFx(postFx) {
        if (get().postFx !== postFx) set({ postFx });
      },

      setLoadProgress(requestId, progress) {
        if (!isCurrentLoad(requestId)) return;
        const next =
          progress === null || !Number.isFinite(progress)
            ? null
            : Math.round(Math.min(Math.max(progress, 0), 1) * 100) / 100;
        if (get().loadProgress !== next) set({ loadProgress: next });
      },
    };
  });
}
