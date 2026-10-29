import { extraMaterials, geometries, PALETTE } from './materials';

/** Palette `jawa-sunset` + lighting `warm-sunset`: no shadows, no textures (architecture.md §12). */
export function Environment() {
  return (
    <>
      <color attach="background" args={[PALETTE.sky]} />
      <fog attach="fog" args={[PALETTE.fog, 38, 115]} />
      <mesh
        geometry={geometries.sky}
        material={extraMaterials.sky}
        renderOrder={-1}
        dispose={null}
      />
      <hemisphereLight args={[PALETTE.hemisphereSky, PALETTE.hemisphereGround, 1.5]} />
      <ambientLight intensity={0.35} color="#ffe2c4" />
      <directionalLight position={[-7, 9, 6]} intensity={1.6} color={PALETTE.sun} />
    </>
  );
}
