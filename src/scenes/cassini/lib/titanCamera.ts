// src/scenes/cassini/lib/titanCamera.ts
//
// Resolves which camera titan_huygens is using, for the driver, the orbit
// lock and the button label alike.

import type { TitanCameraMode } from "@/store/missionStore";
import {
  TITAN_ENTRY_MOUNT_T_END,
  TITAN_TABLEAU_ID,
} from "../arrival/lib/arrivalShot";
import { getActiveTableau } from "../data/tableaus";
import { isDescending } from "./huygensDescent";

/**
 * Effective Titan camera mode, or null on any other tableau and through the
 * entry beat, where ArrivalStage still has the camera.
 */
export function titanCameraMode(
  t: number,
  override: TitanCameraMode | null,
): TitanCameraMode | null {
  if (getActiveTableau(t).id !== TITAN_TABLEAU_ID) return null;
  if (t < TITAN_ENTRY_MOUNT_T_END) return null;
  return override ?? (isDescending(t) ? "shoulder" : "wide");
}
