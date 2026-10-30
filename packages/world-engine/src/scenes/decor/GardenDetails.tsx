import { useEffect, useState } from 'react';

import { createGardenDetails } from './gardenDetails';

/** Garden-only detail layer; every mesh uses noRaycast so the HTML/world actions stay unchanged. */
export function GardenDetails() {
  const [kit] = useState(createGardenDetails);
  useEffect(() => {
    kit.retain();
    return () => kit.dispose();
  }, [kit]);
  return <primitive object={kit.root} dispose={null} />;
}
