'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { SceneDefinition, WorldAction } from '@undangan/contracts/world';
import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { clearCharacterCaches } from '../avatar/caches';
import { useKeyboardInput } from '../input/useKeyboardInput';
import type { WorldStore } from '../scene-manager/store';
import { useWorldStore } from '../scene-manager/useWorldStore';
import { Environment } from '../scenes/Environment';
import { clearGltfCache, GltfScene } from '../scenes/GltfScene';
import { PrimitiveScene } from '../scenes/PrimitiveScene';
import { getSceneLayout } from '../templates/blockout';
import { Bloom } from './Bloom';
import {
  isSoftwareRenderer,
  resolveDpr,
  resolveRenderTier,
  usePointerCoarse,
  usePrefersReducedMotion,
} from './capabilities';
import type { RenderTier } from './capabilities';

export interface WorldCanvasProps {
  store: WorldStore;
  scenes: readonly SceneDefinition[];
  /** Trusted template catalog id (D-008); unknown ids fail the scene with `UNKNOWN_TEMPLATE`. */
  templateId: string;
  /** Hotspots whose action this rejects (disabled features) are not rendered or raycast. */
  isActionEnabled?: (action: WorldAction) => boolean;
}

/** How often (seconds) renderer memory stats are pushed to the store. */
const MEMORY_SAMPLE_INTERVAL = 0.5;

/** Render-critical errors switch the viewer to 2D instead of a blank canvas (D-017). */
class CanvasErrorBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error('[world-engine] render error', error instanceof Error ? error.name : 'unknown');
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Unexpected scene render errors also end the transition in `ERROR` with retry and 2D (D-017). */
class SceneAssetBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  override componentDidCatch(error: unknown) {
    console.error(
      '[world-engine] scene asset error',
      error instanceof Error ? error.name : 'unknown',
    );
    this.props.onError();
  }

  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Marks the request ready after the first frame with its scene mounted (inside any Suspense). */
function ReadySignal({ store, requestId }: { store: WorldStore; requestId: number }) {
  useEffect(() => {
    const frame = requestAnimationFrame(() => store.getState().sceneReady(requestId));
    return () => cancelAnimationFrame(frame);
  }, [store, requestId]);
  return null;
}

function RendererProbes({ store }: { store: WorldStore }) {
  const gl = useThree((state) => state.gl);
  const elapsed = useRef(0);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      store.getState().enterFallback('context_lost');
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    return () => canvas.removeEventListener('webglcontextlost', handleContextLost);
  }, [gl, store]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    if (elapsed.current < MEMORY_SAMPLE_INTERVAL) return;
    elapsed.current = 0;
    store.getState().setGlGeometries(gl.info.memory.geometries);
  });

  return null;
}

interface SceneHostProps {
  store: WorldStore;
  requestId: number;
  scene: SceneDefinition | undefined;
  templateId: string;
  spawnPointId: string | null;
  reducedMotion: boolean;
  tier: RenderTier;
  isActionEnabled?: (action: WorldAction) => boolean;
}

/**
 * Scene boundary keyed by `sceneId:requestId`: mounting a new key unmounts (and releases) the
 * previous scene. Picks the renderer by `layout.kind`. Only the matching request may mark itself
 * ready (architecture.md §8.4).
 */
function SceneHost({
  store,
  requestId,
  scene,
  templateId,
  spawnPointId,
  reducedMotion,
  tier,
  isActionEnabled,
}: SceneHostProps) {
  const layout = scene ? getSceneLayout(templateId, scene.id) : null;

  useEffect(() => {
    const api = store.getState();
    api.sceneLoading(requestId);
    if (!scene) {
      api.sceneFailed(requestId, 'UNKNOWN_SCENE');
      return;
    }
    if (!layout) api.sceneFailed(requestId, 'UNKNOWN_TEMPLATE');
  }, [store, requestId, scene, layout]);

  if (!scene || !layout) return null;
  if (layout.kind === 'primitive') {
    return (
      <>
        <PrimitiveScene
          store={store}
          scene={scene}
          layout={layout}
          spawnPointId={spawnPointId}
          reducedMotion={reducedMotion}
          tier={tier}
          isActionEnabled={isActionEnabled}
        />
        <ReadySignal store={store} requestId={requestId} />
      </>
    );
  }
  // The HTML loading veil stays up while the GLB suspends; ready only fires once it rendered. A
  // failed load reports from an effect before ReadySignal's frame, so that late ready is dropped.
  const failAsset = () => {
    clearGltfCache(layout.url);
    store.getState().sceneFailed(requestId, 'ASSET_LOAD_FAILED');
  };
  return (
    <SceneAssetBoundary onError={failAsset}>
      <Suspense fallback={null}>
        <GltfScene
          store={store}
          requestId={requestId}
          scene={scene}
          layout={layout}
          spawnPointId={spawnPointId}
          reducedMotion={reducedMotion}
          tier={tier}
          isActionEnabled={isActionEnabled}
          onLoadFailed={failAsset}
        />
        <ReadySignal store={store} requestId={requestId} />
      </Suspense>
    </SceneAssetBoundary>
  );
}

function ActiveScene({
  store,
  scenes,
  templateId,
  isActionEnabled,
  tier,
}: WorldCanvasProps & { tier: RenderTier }) {
  const status = useWorldStore(store, (state) => state.status);
  const requestId = useWorldStore(store, (state) => state.transitionRequestId);
  const sceneId = useWorldStore(store, (state) => state.pendingSceneId ?? state.currentSceneId);
  const spawnPointId = useWorldStore(store, (state) => state.pendingSpawnPointId);
  const reducedMotion = usePrefersReducedMotion();

  if (!sceneId || status === 'BOOT' || status === 'ERROR' || status === 'FALLBACK_2D') return null;
  return (
    <SceneHost
      key={`${sceneId}:${requestId}`}
      store={store}
      requestId={requestId}
      scene={scenes.find((scene) => scene.id === sceneId)}
      templateId={templateId}
      spawnPointId={spawnPointId}
      reducedMotion={reducedMotion}
      tier={tier}
      isActionEnabled={isActionEnabled}
    />
  );
}

export function WorldCanvas({ store, scenes, templateId, isActionEnabled }: WorldCanvasProps) {
  const quality = useWorldStore(store, (state) => state.qualityProfile);
  const antialias = quality !== 'low';
  const coarsePointer = usePointerCoarse();
  const reducedMotion = usePrefersReducedMotion();
  // Unknown until the context exists: treated as software, so bloom never starts on a guess.
  const [softwareRenderer, setSoftwareRenderer] = useState<boolean | null>(null);
  const tier = useMemo(
    () =>
      resolveRenderTier({
        quality,
        coarsePointer,
        reducedMotion,
        softwareRenderer: softwareRenderer ?? true,
      }),
    [quality, coarsePointer, reducedMotion, softwareRenderer],
  );

  useKeyboardInput(store);
  useEffect(() => {
    store.getState().setPostFx(tier.bloom ? 'bloom' : 'off');
    return () => store.getState().setPostFx('off');
  }, [store, tier.bloom]);
  useEffect(() => clearCharacterCaches, []);

  return (
    <CanvasErrorBoundary onError={() => store.getState().enterFallback('render_error')}>
      <Canvas
        // `antialias` is fixed at context creation, so switching it needs a new canvas.
        key={antialias ? 'aa' : 'no-aa'}
        flat
        dpr={resolveDpr(quality)}
        gl={{ antialias, powerPreference: 'default' }}
        camera={{ position: [0, 6, 12], fov: 45, near: 0.1, far: 240 }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
        onCreated={({ gl }) => {
          // Taps and drags belong to the world, never to page scroll/zoom (FR-04).
          gl.domElement.style.touchAction = 'none';
          setSoftwareRenderer(isSoftwareRenderer(gl));
        }}
      >
        <RendererProbes store={store} />
        <Environment />
        {tier.bloom ? <Bloom /> : null}
        {/* After the probe: a scene built on the guessed tier would rebuild its character. */}
        {softwareRenderer === null ? null : (
          <ActiveScene
            store={store}
            scenes={scenes}
            templateId={templateId}
            isActionEnabled={isActionEnabled}
            tier={tier}
          />
        )}
      </Canvas>
    </CanvasErrorBoundary>
  );
}

export default WorldCanvas;
