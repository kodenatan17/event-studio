import type { BufferGeometry } from 'three';

import type { MaterialSpec } from '../materials';
import type { BodyDims } from '../rig';
import type { CoverRegion, WardrobeVariant } from '../wardrobe';

/** Finalized geometry (`shapes.finalize`) and what it is drawn with. */
export interface Part {
  /** `skin` parts leave `colour` empty: the tone comes from the appearance, not the geometry. */
  material: MaterialSpec;
  geometry: BufferGeometry;
}

/** Everything geometry depends on; the same context always builds the same parts. */
export interface PartContext {
  dims: BodyDims;
  /** Skin regions hidden by worn items (not built). */
  covers: ReadonlySet<CoverRegion>;
  /** A skirt covers the legs: only ankle stubs stay, and the skirt follows the hips. */
  skirted: boolean;
  /** Headwear sits on the crown: hair keeps only what shows below it. */
  hairCrownHidden: boolean;
}

export type ItemBuilder = (context: PartContext, variant: WardrobeVariant | undefined) => Part[];
