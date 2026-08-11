// src/scenes/cassini/parts/SaturnGroup.tsx
//
// Positions and scales Saturn (body + rings) as a group: centered and full
// scale as the focal subject, offset and smaller as a moon-tableau backdrop.
// No parent axial tilt: Cassini spent most of the mission near Saturn's
// equatorial plane, so from the spacecraft Saturn never reads as tilted the
// way it does from Earth.

import { SaturnBody } from "./SaturnBody";
import { SaturnRings } from "./SaturnRings";

export function SaturnGroup({
  pos = [0, 0, 0],
  scale = 1,
  renderMode,
  showRings = true,
}: {
  pos?: [number, number, number];
  scale?: number;
  renderMode: string;
  showRings?: boolean;
}) {
  return (
    <group position={pos} scale={scale}>
      <SaturnBody renderMode={renderMode} />
      {showRings && <SaturnRings renderMode={renderMode} />}
    </group>
  );
}
