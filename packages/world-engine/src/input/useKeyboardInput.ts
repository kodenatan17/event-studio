import { useEffect } from 'react';

import { selectInputEnabled } from '../scene-manager/store';
import type { WorldStore } from '../scene-manager/store';
import { queueAction } from './bus';
import { keyBinding, preventsDefault, releasesHeldKeys, shouldHandleKeyDown } from './keyboard';

/**
 * WASD/arrows, Space, E/Enter and Q on the window (FR-04). Writes the store's input bus only;
 * the avatar reads it every frame. Default actions are suppressed only for handled keys.
 */
export function useKeyboardInput(store: WorldStore): void {
  useEffect(() => {
    // A key released while the window had no focus, or under Meta, never sends key-up.
    const releaseAll = () => store.getState().input.keys.clear();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (releasesHeldKeys(event.key)) {
        releaseAll();
        return;
      }
      const state = store.getState();
      if (!shouldHandleKeyDown(event, selectInputEnabled(state))) return;
      const binding = keyBinding(event.code);
      if (!binding) return;
      if (binding.kind === 'move') state.input.keys.add(event.code);
      else queueAction(state.input, binding.action);
      if (preventsDefault(event.code)) event.preventDefault();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (releasesHeldKeys(event.key)) releaseAll();
      else store.getState().input.keys.delete(event.code);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') releaseAll();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', releaseAll);
      document.removeEventListener('visibilitychange', handleVisibility);
      releaseAll();
    };
  }, [store]);
}
