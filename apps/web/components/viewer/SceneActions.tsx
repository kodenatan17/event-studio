'use client';

import type { SceneDefinition, WorldAction } from '@undangan/contracts/world';
import type { WorldStore } from '@undangan/world-engine';
import { portalAction, resolveHotspotAction, useWorldStore } from '@undangan/world-engine';
import { useEffect, useRef } from 'react';

import { controlLabel, sceneLabel } from '@/lib/labels';

const BUTTON =
  'min-h-11 min-w-11 whitespace-nowrap rounded-full px-3 py-2 text-sm sm:px-4 font-medium shadow-sm backdrop-blur ' +
  'transition active:scale-[.97] motion-reduce:transition-none motion-reduce:active:scale-100 ' +
  'max-sm:w-full max-sm:truncate ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-900';

interface SceneActionsProps {
  store: WorldStore;
  scenes: readonly SceneDefinition[];
  /** Hides controls for features the couple turned off (manifest `features.*Enabled`). */
  isActionEnabled?: (action: WorldAction) => boolean;
  /** Element id, referenced by the "Interaksi" toggle's `aria-controls`. */
  id: string;
  /** Mobile disclosure state; at ≥ sm the row is always shown. */
  open: boolean;
  onClose: () => void;
}

/**
 * Labelled HTML control for every hotspot and portal of the current scene, dispatching the same
 * `WorldAction` as the 3D object (architecture.md §3.4). One DOM instance: a compact row at ≥ sm,
 * and below sm a panel above the bottom bar behind the "Interaksi" toggle (GlobalNav). The panel
 * closes on the toggle, Escape or a tap outside, and with the scene; it stays open while an
 * overlay it opened is up, so focus returns to the control (§3.4).
 */
export function SceneActions({
  store,
  scenes,
  isActionEnabled,
  id,
  open,
  onClose,
}: SceneActionsProps) {
  const currentSceneId = useWorldStore(store, (state) => state.currentSceneId);
  const scene = scenes.find((candidate) => candidate.id === currentSceneId);
  const dispatch = (action: WorldAction) => store.getState().dispatch(action);
  const list = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    const toggle = () => document.querySelector<HTMLElement>(`[aria-controls="${id}"]`);
    // An open dialog owns Escape and taps; the panel stays behind it.
    const overlayOpen = (target: EventTarget | null) =>
      store.getState().activeOverlay !== null ||
      (target instanceof Element && target.closest('dialog') !== null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || overlayOpen(event.target)) return;
      const hadFocus = list.current?.contains(document.activeElement) ?? false;
      onClose();
      if (hadFocus) toggle()?.focus();
    };
    const handlePointerDown = (event: PointerEvent) => {
      if (overlayOpen(event.target) || !(event.target instanceof Node)) return;
      if (list.current?.contains(event.target) || toggle()?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open, id, store, onClose]);

  if (!scene) return null;
  return (
    <ul
      ref={list}
      id={id}
      aria-label={`Aksi di ${sceneLabel(scene.id)}`}
      className={`pointer-events-auto flex max-w-full flex-nowrap gap-2 px-1 py-1 sm:flex-wrap sm:justify-center sm:overflow-x-auto sm:overscroll-x-contain ${
        open
          ? 'max-sm:absolute max-sm:inset-x-3 max-sm:bottom-full max-sm:mb-2 max-sm:grid max-sm:max-h-[40dvh] max-sm:grid-cols-2 max-sm:overflow-y-auto max-sm:overscroll-contain max-sm:rounded-2xl max-sm:bg-[#2b2118]/85 max-sm:p-2 max-sm:shadow-xl'
          : 'max-sm:hidden'
      }`}
    >
      {scene.hotspots.map((hotspot) => {
        const action = resolveHotspotAction(hotspot);
        if (!action || (isActionEnabled && !isActionEnabled(action))) return null;
        return (
          <li key={hotspot.id} className="shrink-0 max-sm:min-w-0">
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
        <li key={portal.id} className="shrink-0 max-sm:min-w-0">
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
