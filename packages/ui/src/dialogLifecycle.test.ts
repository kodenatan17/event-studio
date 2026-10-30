import { describe, expect, it, vi } from 'vitest';

import { openModalDialog } from './dialogLifecycle';
import type { ModalDialogElement } from './dialogLifecycle';

/** Mirrors `<dialog>`: `close()` updates `open` now and fires `close` in a later task. */
class FakeDialog extends EventTarget {
  open = false;
  showModal() {
    this.open = true;
  }
  close() {
    if (!this.open) return;
    this.open = false;
    setTimeout(() => this.dispatchEvent(new Event('close')), 0);
  }
}

const asDialog = (fake: FakeDialog) => fake as unknown as ModalDialogElement;
const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('openModalDialog', () => {
  it('[§3.4] opens the dialog modally', () => {
    const fake = new FakeDialog();
    openModalDialog(asDialog(fake), vi.fn());
    expect(fake.open).toBe(true);
  });

  it('[architecture.md §3.4] StrictMode remount: close event from the previous opening is ignored', async () => {
    const fake = new FakeDialog();
    const requestClose = vi.fn();
    const cleanup = openModalDialog(asDialog(fake), requestClose);
    // StrictMode: simulated unmount, then the effect runs again before `close` is dispatched.
    cleanup();
    openModalDialog(asDialog(fake), requestClose);
    await nextTask();
    expect(fake.open).toBe(true);
    expect(requestClose).not.toHaveBeenCalled();
  });

  it('[§3.4] Escape (`cancel`) is prevented and requests a close', () => {
    const fake = new FakeDialog();
    const requestClose = vi.fn();
    openModalDialog(asDialog(fake), requestClose);
    const cancel = new Event('cancel', { cancelable: true });
    fake.dispatchEvent(cancel);
    expect(cancel.defaultPrevented).toBe(true);
    expect(requestClose).toHaveBeenCalledTimes(1);
  });

  it('[§3.4] a native close of the current opening requests a close', async () => {
    const fake = new FakeDialog();
    const requestClose = vi.fn();
    openModalDialog(asDialog(fake), requestClose);
    fake.close();
    await nextTask();
    expect(requestClose).toHaveBeenCalledTimes(1);
  });

  it('[§3.4] cleanup closes the dialog without requesting a close', async () => {
    const fake = new FakeDialog();
    const requestClose = vi.fn();
    openModalDialog(asDialog(fake), requestClose)();
    await nextTask();
    expect(fake.open).toBe(false);
    expect(requestClose).not.toHaveBeenCalled();
  });
});
