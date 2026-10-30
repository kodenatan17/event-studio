'use client';

import type { WorldStore } from '@undangan/world-engine';
import { useWorldStore } from '@undangan/world-engine';

interface WorldStatusProps {
  store: WorldStore;
  /** Announced status text (scene loading/ready, error, 2D). */
  message: string;
}

/**
 * Screen-reader status line plus the test hooks. Its own component, so the ≤ 4 Hz avatar probe
 * and renderer stats never re-render the Viewer.
 */
export function WorldStatus({ store, message }: WorldStatusProps) {
  const status = useWorldStore(store, (state) => state.status);
  const currentSceneId = useWorldStore(store, (state) => state.currentSceneId);
  const requestId = useWorldStore(store, (state) => state.transitionRequestId);
  const glGeometries = useWorldStore(store, (state) => state.glGeometries);
  const probe = useWorldStore(store, (state) => state.avatarProbe);
  const nearby = useWorldStore(store, (state) => state.nearby);
  const postFx = useWorldStore(store, (state) => state.postFx);

  return (
    <div
      data-testid="world-status"
      aria-live="polite"
      className="sr-only"
      data-world-status={status}
      data-scene-id={currentSceneId ?? ''}
      data-request-id={requestId}
      data-gl-geometries={glGeometries ?? ''}
      data-avatar-x={probe ? probe[0].toFixed(2) : ''}
      data-avatar-z={probe ? probe[1].toFixed(2) : ''}
      data-nearby={nearby?.id ?? ''}
      data-postfx={postFx}
    >
      {message}
    </div>
  );
}
