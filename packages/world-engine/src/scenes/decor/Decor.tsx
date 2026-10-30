import type { RenderTier } from '../../renderer/capabilities';
import type { WorldStore } from '../../scene-manager/store';
import type { DecorItem } from '../../templates/types';
import { PALETTE } from '../materials';
import { GardenDetails } from './GardenDetails';
import { Figure } from './Figure';
import { Flowers, Gentong, Janur, Lanterns, Mandala, Plumerias, Pond, TreeLine } from './nature';
import { Part } from './Part';
import { Chandelier, Drapes, Gapura, Gebyok, Joglo, RoundTables, Wall } from './structures';

interface DecorProps {
  item: DecorItem;
  store: WorldStore;
  tier: RenderTier;
  reducedMotion: boolean;
}

/** Renders one decor entry of a primitive layout (non-interactive; never raycast). */
export function Decor({ item, store, tier, reducedMotion }: DecorProps) {
  switch (item.type) {
    case 'ground':
      return (
        <Part
          geometry="plane"
          material={item.material}
          position={[item.center[0], item.y ?? 0, item.center[1]]}
          scale={[item.size[0], 1, item.size[1]]}
        />
      );
    case 'box':
      return (
        <Part
          material={item.material}
          position={item.position}
          scale={item.size}
          rotation={[0, item.rotationY ?? 0, 0]}
        />
      );
    case 'cylinder':
      return (
        <Part
          geometry="cylinder"
          material={item.material}
          position={item.position}
          scale={[item.radius * 2, item.height, item.radius * 2]}
        />
      );
    case 'wall':
      return <Wall {...item} />;
    case 'gapura':
      return <Gapura {...item} />;
    case 'janur':
      return <Janur {...item} />;
    case 'figure':
      return <Figure item={item} store={store} tier={tier} reducedMotion={reducedMotion} />;
    case 'lanterns':
      return <Lanterns positions={item.positions} />;
    case 'mandala':
      return <Mandala center={item.center} radius={item.radius} />;
    case 'pond':
      return <Pond center={item.center} size={item.size} />;
    case 'plumerias':
      return <Plumerias positions={item.positions} />;
    case 'trees':
      return <TreeLine positions={item.positions} />;
    case 'joglo':
      return <Joglo {...item} />;
    case 'gebyok':
      return <Gebyok {...item} />;
    case 'roundTables':
      return <RoundTables positions={item.positions} />;
    case 'drapes':
      return <Drapes positions={item.positions} height={item.height} />;
    case 'chandelier':
      return <Chandelier position={item.position} scale={item.scale} />;
    case 'pointLight':
      return (
        <pointLight
          position={item.position}
          intensity={item.intensity}
          distance={item.distance}
          decay={2}
          color={PALETTE.lantern}
        />
      );
    case 'flowers':
      return <Flowers positions={item.positions} />;
    case 'gardenDetails':
      return <GardenDetails />;
    case 'gentong':
      return <Gentong positions={item.positions} />;
    default: {
      const _exhaustive: never = item;
      return null;
    }
  }
}
