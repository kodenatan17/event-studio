'use client';

import type { WeddingManifestV1 } from '@undangan/contracts';
import type { WorldAction } from '@undangan/contracts/world';
import { Button } from '@undangan/ui';
import { OverlayHost } from '@undangan/wedding-features';
import type { WorldStatus as WorldStatusValue, WorldStore } from '@undangan/world-engine';
import { createWorldStore, detectWebGL, useWorldStore } from '@undangan/world-engine';
import dynamic from 'next/dynamic';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { isActionEnabled } from '@/lib/action-enabled';
import { sceneLabel } from '@/lib/labels';
import { readSoundPreference } from '@/lib/sound-preference';

import { Fallback2D } from './Fallback2D';
import { GlobalNav } from './GlobalNav';
import { KeyboardHint } from './KeyboardHint';
import { QuickMapDialog } from './QuickMapDialog';
import { SceneActions } from './SceneActions';
import { TouchControls } from './TouchControls';
import { useOverlayHistory } from './use-overlay-history';
import { WorldStatus } from './WorldStatus';

const WorldCanvas = dynamic(() => import('@undangan/world-engine/canvas'), {
  ssr: false,
  loading: () => null,
});

interface ViewerProps {
  manifest: WeddingManifestV1;
  /** `2d` (from `?mode=2d`) starts in the manual 2D invitation (T-108). */
  initialMode?: '3d' | '2d';
  /** Rendered above the couple names (e.g. the dev-fixture banner). */
  children?: ReactNode;
}

function statusText(status: WorldStatusValue, sceneId: string | null): string {
  const label = sceneId ? sceneLabel(sceneId) : 'dunia undangan';
  switch (status) {
    case 'BOOT':
    case 'LOADING_MANIFEST':
      return 'Memuat dunia undangan…';
    case 'SWITCHING_SCENE':
    case 'LOADING_SCENE':
      return `Memuat ${label}…`;
    case 'READY':
    case 'OVERLAY_OPEN':
      return `${label} siap`;
    case 'ERROR':
      return 'Ruangan gagal dimuat';
    case 'FALLBACK_2D':
      return 'Mode 2D aktif';
  }
}

/**
 * GLB download bar in the (aria-hidden) veil; the status line keeps announcing the scene. Its
 * own component, so progress events never re-render the Viewer.
 */
function LoadProgress({ store }: { store: WorldStore }) {
  const progress = useWorldStore(store, (state) => state.loadProgress);
  if (progress === null) return null;
  const percent = Math.round(progress * 100);
  return (
    <div data-testid="load-progress" className="flex w-48 flex-col items-center gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#fbf7ee]/60">
        <div
          className="h-full rounded-full bg-[#7a4a2a] transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="text-xs tabular-nums">{percent}%</p>
    </div>
  );
}

export function Viewer({ manifest, initialMode = '3d', children }: ViewerProps) {
  const { world, wedding, features } = manifest;
  const [store] = useState(() =>
    createWorldStore({
      sceneIds: world.scenes.map((scene) => scene.id),
      entrySceneId: world.entrySceneId,
      initialFallbackReason: initialMode === '2d' ? 'manual' : undefined,
    }),
  );
  const status = useWorldStore(store, (state) => state.status);
  const currentSceneId = useWorldStore(store, (state) => state.currentSceneId);
  const pendingSceneId = useWorldStore(store, (state) => state.pendingSceneId);
  const activeOverlay = useWorldStore(store, (state) => state.activeOverlay);
  const fallbackReason = useWorldStore(store, (state) => state.fallbackReason);
  /** Focus target when an overlay closes and its opener is gone (e.g. opened by a 3D tap). */
  const worldRef = useRef<HTMLDivElement>(null);
  const interactionsId = useId();
  // Mobile "Interaksi" panel, open for one scene: it closes by itself once the scene changes.
  const [interactionsFor, setInteractionsFor] = useState<string | null>(null);
  const interactionsOpen = interactionsFor !== null && interactionsFor === currentSceneId;
  const toggleInteractions = useCallback(
    () =>
      setInteractionsFor((open) =>
        open !== null && open === currentSceneId ? null : currentSceneId,
      ),
    [currentSceneId],
  );
  const closeInteractions = useCallback(() => setInteractionsFor(null), []);

  useEffect(() => {
    const api = store.getState();
    if (readSoundPreference()) api.setSound(true);
    // A manual 2D start becomes `webgl_unsupported` here, which hides "Kembali ke 3D".
    if (detectWebGL()) api.start();
    else api.enterFallback('webgl_unsupported');
  }, [store]);

  const closeOverlay = useCallback(() => store.getState().closeOverlay(), [store]);

  /** "Kembali ke 3D" also drops `?mode=2d`, so a reload stays in 3D (T-108). */
  const exitFallback = () => {
    store.getState().exitFallback();
    const url = new URL(window.location.href);
    if (url.searchParams.get('mode') !== '2d') return;
    url.searchParams.delete('mode');
    window.history.replaceState(window.history.state, '', url);
  };
  useOverlayHistory(activeOverlay?.type ?? null, closeOverlay);

  // Shared by the HTML controls and the 3D hotspots (architecture.md §3.4).
  const actionEnabled = useCallback(
    (action: WorldAction) => isActionEnabled(action, features),
    [features],
  );

  const is2D = status === 'FALLBACK_2D';
  const loading = status === 'BOOT' || status === 'SWITCHING_SCENE' || status === 'LOADING_SCENE';
  const showCanvas = status !== 'BOOT' && !is2D;
  const message = statusText(status, loading ? (pendingSceneId ?? currentSceneId) : currentSceneId);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f4b98a] text-[#2b2118]">
      {/* Everything behind an open dialog is inert (architecture.md §3.4). */}
      <div
        ref={worldRef}
        tabIndex={-1}
        inert={activeOverlay !== null}
        data-testid="world-layer"
        className="absolute inset-0 outline-none"
      >
        {is2D ? (
          <Fallback2D
            content={manifest}
            reason={fallbackReason}
            banner={children}
            onAction={(action) => store.getState().dispatch(action)}
            onExit={exitFallback}
          />
        ) : (
          <>
            <div className="absolute inset-0">
              {showCanvas ? (
                <WorldCanvas
                  store={store}
                  scenes={world.scenes}
                  templateId={world.templateId}
                  isActionEnabled={actionEnabled}
                />
              ) : null}
            </div>

            {/* Transition veil (architecture.md §8.4); text is announced by the status element. It
                covers instantly (no empty-sky flash) and fades out only once the scene is ready. */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f4b98a] transition-opacity motion-reduce:transition-none ${
                loading ? 'opacity-100 duration-0' : 'opacity-0 duration-500'
              }`}
            >
              <p className="rounded-full bg-[#fbf7ee]/80 px-4 py-2 text-sm">{message}</p>
              {loading ? <LoadProgress store={store} /> : null}
            </div>

            <header
              data-testid="viewer-header"
              className={`pointer-events-none absolute inset-x-0 top-0 flex flex-col items-center gap-2 ${
                children ? '' : 'pt-[env(safe-area-inset-top)]'
              }`}
            >
              {children}
              <div className="mt-1 rounded-2xl bg-[#2b2118]/70 px-5 py-2 text-center text-[#fbf7ee] backdrop-blur">
                <p className="text-xs tracking-widest uppercase">Undangan Pernikahan</p>
                <h1 className="font-serif text-2xl">
                  {wedding.couple.groom} &amp; {wedding.couple.bride}
                </h1>
              </div>
              {/* Where am I (§3.3 breadcrumb); the quick map lists every scene. */}
              {currentSceneId ? (
                <p
                  data-testid="scene-chip"
                  className="-mt-1 rounded-full bg-[#fbf7ee]/90 px-3 py-0.5 text-xs font-medium text-[#4e2c18] shadow-sm"
                >
                  {sceneLabel(currentSceneId)}
                </p>
              ) : null}
            </header>

            {status === 'ERROR' ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div
                  role="alert"
                  className="pointer-events-auto mx-4 max-w-sm rounded-2xl bg-[#fbf7ee] p-5 text-center shadow-xl"
                >
                  <p>Ruangan tidak dapat dimuat.</p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button onClick={() => store.getState().retry()}>Coba lagi</Button>
                    <Button
                      variant="secondary"
                      onClick={() => store.getState().enterFallback('manual')}
                    >
                      Mode 2D
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div
              data-testid="viewer-controls"
              className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)_+_0.5rem)]"
            >
              <TouchControls store={store} hidden={interactionsOpen} />
              <KeyboardHint store={store} />
              <SceneActions
                store={store}
                scenes={world.scenes}
                isActionEnabled={actionEnabled}
                id={interactionsId}
                open={interactionsOpen}
                onClose={closeInteractions}
              />
              <GlobalNav
                store={store}
                rsvpEnabled={features.rsvpEnabled}
                interactionsId={interactionsId}
                interactionsOpen={interactionsOpen}
                onToggleInteractions={toggleInteractions}
              />
            </div>
          </>
        )}
      </div>

      <WorldStatus store={store} message={message} />

      {activeOverlay?.type === 'quick_map' ? (
        <QuickMapDialog
          store={store}
          scenes={world.scenes}
          onClose={closeOverlay}
          fallbackFocus={worldRef}
        />
      ) : activeOverlay?.type === 'avatar_editor' ? null : activeOverlay ? (
        <OverlayHost
          key={activeOverlay.type}
          overlay={activeOverlay}
          onClose={closeOverlay}
          content={manifest}
          fallbackFocus={worldRef}
        />
      ) : null}
    </div>
  );
}
