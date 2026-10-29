import { useStore } from 'zustand';

import type { WorldState, WorldStore } from './store';

/** React binding for a per-viewer world store (works inside and outside the R3F canvas). */
export function useWorldStore<T>(store: WorldStore, selector: (state: WorldState) => T): T {
  return useStore(store, selector);
}
