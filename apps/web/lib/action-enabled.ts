import type { WeddingManifestV1 } from '@undangan/contracts';
import type { WorldAction } from '@undangan/contracts/world';
import { isShellEnabled } from '@undangan/wedding-features';

/**
 * Whether an action's feature is turned on (manifest `features.*Enabled`). The HTML controls and
 * the 3D hotspots both use it, so a disabled feature has neither (architecture.md §3.4).
 */
export function isActionEnabled(
  action: WorldAction,
  features: WeddingManifestV1['features'],
): boolean {
  switch (action.type) {
    case 'open_rsvp':
      return isShellEnabled('rsvp', features);
    case 'open_guestbook':
      return isShellEnabled('guestbook', features);
    case 'open_photo_booth':
      return isShellEnabled('photo_booth', features);
    default:
      return true;
  }
}
