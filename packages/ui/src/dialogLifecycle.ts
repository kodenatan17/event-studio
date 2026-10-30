/** The parts of `HTMLDialogElement` the lifecycle needs (keeps it testable without a DOM). */
export type ModalDialogElement = Pick<
  HTMLDialogElement,
  'open' | 'showModal' | 'close' | 'addEventListener' | 'removeEventListener'
>;

/**
 * Opens `dialog` modally and routes Escape (`cancel`) and native closes to `requestClose`.
 * Returns the cleanup, which detaches the listeners and closes the dialog.
 *
 * `close()` dispatches its `close` event asynchronously. Under React StrictMode the cleanup runs
 * and the dialog is re-opened before that event arrives, so a `close` event that finds the
 * dialog open belongs to an earlier opening and is ignored.
 */
export function openModalDialog(dialog: ModalDialogElement, requestClose: () => void): () => void {
  const handleCancel = (event: Event) => {
    // Escape: close through React state instead of the native close.
    event.preventDefault();
    requestClose();
  };
  // Browsers may close without a cancelable `cancel` (close watcher rules).
  const handleClose = () => {
    if (!dialog.open) requestClose();
  };
  dialog.addEventListener('cancel', handleCancel);
  dialog.addEventListener('close', handleClose);
  if (!dialog.open) dialog.showModal();
  return () => {
    dialog.removeEventListener('cancel', handleCancel);
    dialog.removeEventListener('close', handleClose);
    if (dialog.open) dialog.close();
  };
}
