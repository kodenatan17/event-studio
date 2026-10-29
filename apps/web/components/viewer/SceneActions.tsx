'use client';

import type { SceneDefinition, WorldAction } from '@undangan/contracts/world';
import type { WorldStore } from '@undangan/world-engine';
import { portalAction, resolveHotspotAction, useWorldStore } from '@undangan/world-engine';

import { controlLabel, sceneLabel } from '@/lib/labels';

const BUTTON =
  'min-h-11 min-w-11 whitespace-nowrap rounded-full px-3 py-2 text-sm sm:px-4 font-medium shadow-sm backdrop-blur ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900';

interface SceneActionsProps {
  store: WorldStore;
  scenes: readonly SceneDefinition[];
  /** Hides controls for features the couple turned off (manifest `features.*Enabled`). */
  isActionEnabled?: (action: WorldAction) => boolean;
}

/**
 * Labelled HTML control for every hotspot and portal of the current scene, dispatching the same
 * `WorldAction` as the 3D object (architecture.md §3.4). One compact row; scrolls sideways on
 * narrow screens so the 3D view stays visible. Scene-to-scene jumps live in the global map.
 */
export function SceneActions({ store, scenes, isActionEnabled }: SceneActionsProps) {
  const currentSceneId = useWorldStore(store, (state) => state.currentSceneId);
  const scene = scenes.find((candidate) => candidate.id === currentSceneId);
  const dispatch = (action: WorldAction) => store.getState().dispatch(action);

  if (!scene) return null;
  return (
    <ul
      aria-label={`Aksi di ${sceneLabel(scene.id)}`}
      className="pointer-events-auto flex max-w-full flex-nowrap gap-2 overflow-x-auto overscroll-x-contain px-1 py-1 sm:flex-wrap sm:justify-center"
    >
      {scene.hotspots.map((hotspot) => {
        const action = resolveHotspotAction(hotspot);
        if (!action || (isActionEnabled && !isActionEnabled(action))) return null;
        return (
          <li key={hotspot.id} className="shrink-0">
            <button
              type="button"
              data-hotspot-id={hotspot.id}
              className={`${BUTTON} bg-[#fbf7ee]/90 text-[#4e2c18]`}
              onClick={() => dispatch(action)}
            >
              {controlLabel(hotspot.id)}
            </button>
          </li>
        );
      })}
      {scene.portals.map((portal) => (
        <li key={portal.id} className="shrink-0">
          <button
            type="button"
            data-hotspot-id={portal.id}
            className={`${BUTTON} bg-[#7a4a2a]/90 text-[#fbf7ee]`}
            onClick={() => dispatch(portalAction(portal))}
          >
            {controlLabel(portal.id)}
          </button>
        </li>
      ))}
    </ul>
  );
}
