'use client';

import { Button, Sheet } from '@undangan/ui';
import type { WorldStore } from '@undangan/world-engine';
import { MAX_CAMERA_ZOOM, MIN_CAMERA_ZOOM, useWorldStore } from '@undangan/world-engine';
import type { RefObject } from 'react';

import {
  CAMERA_CLOSE_LABEL,
  CAMERA_LABEL,
  CAMERA_RESET_LABEL,
  CAMERA_ZOOM_IN_LABEL,
  CAMERA_ZOOM_OUT_LABEL,
} from '@/lib/labels';

interface CameraControlsProps {
  store: WorldStore;
  onClose: () => void;
  fallbackFocus?: RefObject<HTMLElement | null>;
}

/** One press moves the view by this fraction of the authored distance. */
const ZOOM_STEP = 0.15;

/**
 * Guest camera control (D-033): the follow rig's distance only. A UI overlay like the quick map,
 * so the world behind stays inert and browser back closes it.
 *
 * ponytail: no pitch or orbit; add those only with a new acceptance criterion, and then as a
 * second axis on `cameraZoom` rather than a free camera rig.
 */
export function CameraControls({ store, onClose, fallbackFocus }: CameraControlsProps) {
  const zoom = useWorldStore(store, (state) => state.cameraZoom);
  const setZoom = (next: number) => store.getState().setCameraZoom(next);
  const reset = () => store.getState().resetCameraZoom();

  return (
    <Sheet
      label={CAMERA_LABEL}
      onClose={onClose}
      fallbackFocus={fallbackFocus}
      data-testid="camera-controls"
      data-overlay-type="camera_controls"
    >
      <h2 className="px-4 pt-3 font-serif text-xl leading-tight text-[#2b2118]">{CAMERA_LABEL}</h2>
      <div className="flex flex-1 flex-col gap-2 px-4 py-3">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            className="flex-1"
            disabled={zoom <= MIN_CAMERA_ZOOM}
            onClick={() => setZoom(zoom - ZOOM_STEP)}
          >
            {CAMERA_ZOOM_IN_LABEL}
          </Button>
          <Button
            variant="secondary"
            className="flex-1"
            disabled={zoom >= MAX_CAMERA_ZOOM}
            onClick={() => setZoom(zoom + ZOOM_STEP)}
          >
            {CAMERA_ZOOM_OUT_LABEL}
          </Button>
        </div>
        <Button variant="ghost" disabled={zoom === 1} onClick={reset}>
          {CAMERA_RESET_LABEL}
        </Button>
      </div>
      <div className="flex shrink-0 justify-end border-t border-[#e6d6c3] px-4 py-2">
        <Button onClick={onClose}>{CAMERA_CLOSE_LABEL}</Button>
      </div>
    </Sheet>
  );
}
