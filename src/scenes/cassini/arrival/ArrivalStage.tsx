// src/scenes/cassini/arrival/ArrivalStage.tsx
//
// Saturn's body renders through TableauResolver's GlobalSaturn; this stage adds only the rings and camera.

import { useMissionStore } from "@/store/missionStore";
import { getActiveTableau } from "../data/tableaus";
import {
  TITAN_ENTRY_MOUNT_T_END,
  TITAN_TABLEAU_ID,
  isArrivalTableau,
} from "./lib/arrivalShot";
import { ArrivalCameraDriver } from "./parts/ArrivalCameraDriver";
import { ArrivalRings } from "./parts/ArrivalRings";

export function ArrivalStage() {
  const active = useMissionStore((s) =>
    isArrivalTableau(getActiveTableau(s.currentT).id),
  );
  // The camera driver's departure ref carries across the cut into titan_huygens.
  const inTitanEntry = useMissionStore(
    (s) =>
      getActiveTableau(s.currentT).id === TITAN_TABLEAU_ID &&
      s.currentT < TITAN_ENTRY_MOUNT_T_END,
  );
  // Blueprint keeps SaturnRings' wireframe; the ring card here is photoreal-only.
  const isPhotorealTheme = useMissionStore(
    (s) => s.renderMode === "space" || s.renderMode === "editorial",
  );

  if (!active && !inTitanEntry) return null;

  return (
    <>
      {active && isPhotorealTheme && <ArrivalRings />}
      <ArrivalCameraDriver />
    </>
  );
}
