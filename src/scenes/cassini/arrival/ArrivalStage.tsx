// src/scenes/cassini/arrival/ArrivalStage.tsx
//
// Saturn's body renders through TableauResolver's GlobalSaturn; this stage adds only the rings and camera.

import { useMissionStore } from "@/store/missionStore";
import { getActiveTableau } from "../data/tableaus";
import { isArrivalTableau } from "./lib/arrivalShot";
import { ArrivalCameraDriver } from "./parts/ArrivalCameraDriver";
import { ArrivalRings } from "./parts/ArrivalRings";

export function ArrivalStage() {
  const active = useMissionStore((s) =>
    isArrivalTableau(getActiveTableau(s.currentT).id),
  );
  // Blueprint keeps SaturnRings' wireframe; the ring card here is photoreal-only.
  const isPhotorealTheme = useMissionStore(
    (s) => s.renderMode === "space" || s.renderMode === "editorial",
  );

  if (!active) return null;

  return (
    <>
      {isPhotorealTheme && <ArrivalRings />}
      <ArrivalCameraDriver />
    </>
  );
}
