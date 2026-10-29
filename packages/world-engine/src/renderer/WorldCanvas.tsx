'use client';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import type { SceneDefinition, WorldAction } from '@undangan/contracts/world';
import { Component, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

import type { WorldStore } from '../scene-manager/store';
import { useWorldStore } from '../scene-manager/useWorldStore';
import { Environment } from '../scenes/Environment';
import { PrimitiveScene } from '../scenes/PrimitiveScene';
import { getPrimitiveLayout } from '../templates/blockout';
import { resolveDpr, usePrefersReducedMotion } from './capabilities';

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
  isActionEnabled?: (action: WorldAction) => boolean;
}

/**
 * Scene boundary keyed by `sceneId:requestId`: mounting a new key unmounts (and releases) the
 * previous scene. Only the matching request may mark itself ready (architecture.md §8.4).
 */
function SceneHost({
  store,
  requestId,
  scene,
  templateId,
  spawnPointId,
  reducedMotion,
  isActionEnabled,
}: SceneHostProps) {
  const layout = scene ? getPrimitiveLayout(templateId, scene.id) : null;

  useEffect(() => {
    const api = store.getState();
    api.sceneLoading(requestId);
    if (!scene) {
      api.sceneFailed(requestId, 'UNKNOWN_SCENE');
      return;
    }
    if (!layout) {
      api.sceneFailed(requestId, 'UNKNOWN_TEMPLATE');
      return;
    }
    // Ready after the first frame with the new scene mounted.
    const frame = requestAnimationFrame(() => store.getState().sceneReady(requestId));
    return () => cancelAnimationFrame(frame);
  }, [store, requestId, scene, layout]);

  if (!scene || !layout) return null;
  return (
    <PrimitiveScene
      store={store}
      scene={scene}
      layout={layout}
      spawnPointId={spawnPointId}
      reducedMotion={reducedMotion}
      isActionEnabled={isActionEnabled}
    />
  );
}

function ActiveScene({ store, scenes, templateId, isActionEnabled }: WorldCanvasProps) {
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
      isActionEnabled={isActionEnabled}
    />
  );
}

export function WorldCanvas({ store, scenes, templateId, isActionEnabled }: WorldCanvasProps) {
  const quality = useWorldStore(store, (state) => state.qualityProfile);
  const antialias = quality !== 'low';

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
        }}
      >
        <RendererProbes store={store} />
        <Environment />
        <ActiveScene
          store={store}
          scenes={scenes}
          templateId={templateId}
          isActionEnabled={isActionEnabled}
        />
      </Canvas>
    </CanvasErrorBoundary>
  );
}

export default WorldCanvas;
