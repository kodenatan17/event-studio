'use client';

import type { SceneDefinition } from '@undangan/contracts/world';
import { Button, Dialog } from '@undangan/ui';
import type { WorldStore } from '@undangan/world-engine';
import { useWorldStore } from '@undangan/world-engine';
import type { RefObject } from 'react';

import { sceneLabel } from '@/lib/labels';

interface QuickMapDialogProps {
  store: WorldStore;
  scenes: readonly SceneDefinition[];
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

/** Scene map reaching every scene even without a portal route (FR-04, architecture.md §8.3). */
export function QuickMapDialog({ store, scenes, onClose, fallbackFocus }: QuickMapDialogProps) {
  const currentSceneId = useWorldStore(store, (state) => state.currentSceneId);

  return (
    <Dialog
      title="Peta"
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      data-testid="overlay-panel"
      data-overlay-type="quick_map"
    >
      <nav aria-label="Peta cepat">
        <ul className="grid gap-2 sm:grid-cols-2">
          {scenes.map((scene) => {
            const isCurrent = scene.id === currentSceneId;
            return (
              <li key={scene.id}>
                <Button
                  variant={isCurrent ? 'primary' : 'secondary'}
                  aria-current={isCurrent ? 'location' : undefined}
                  className="w-full justify-start"
                  // Same action as the portals; navigating closes the map (store rule).
                  onClick={() => store.getState().dispatch({ type: 'navigate', sceneId: scene.id })}
                >
                  {sceneLabel(scene.id)}
                </Button>
              </li>
            );
          })}
        </ul>
      </nav>
    </Dialog>
  );
}
