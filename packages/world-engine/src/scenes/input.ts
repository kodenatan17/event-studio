/** Pointer travel (px) above which a tap counts as a drag and is ignored. */
export const TAP_SLOP_PX = 6;

/** Assigned to `raycast` on meshes that must never intercept taps. */
export const noRaycast = () => {};

export function setCursor(cursor: string): void {
  document.body.style.cursor = cursor;
}
