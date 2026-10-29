'use client';

import { useEffect, useEffectEvent, useState } from 'react';

import { createOverlayHistory } from './overlay-history';

/** Browser back closes the active overlay first; see `createOverlayHistory` for the rules. */
export function useOverlayHistory(overlayType: string | null, onBack: () => void): void {
  const [overlayHistory] = useState(() => createOverlayHistory(() => window.history));
  const closeFromHistory = useEffectEvent(onBack);

  useEffect(() => {
    overlayHistory.sync(overlayType);
  }, [overlayHistory, overlayType]);

  useEffect(() => {
    const handlePopState = () => {
      if (overlayHistory.popState()) closeFromHistory();
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [overlayHistory]);
}
