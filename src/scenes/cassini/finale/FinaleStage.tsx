// src/scenes/cassini/finale/FinaleStage.tsx

import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { useMissionStore } from "@/store/missionStore";
import { isTerminalTableau } from "../data/missionConstants";
import { CassiniTrail } from "./parts/CassiniTrail";
import { RingBackdrop } from "./parts/RingBackdrop";
import { RingParticleField } from "./parts/RingParticleField";
import { SkyDome } from "./parts/SkyDome";
import { TerminalControls } from "./parts/TerminalControls";
import { TerminalSunFill } from "./parts/TerminalSunFill";
import { VolumetricRings } from "./parts/VolumetricRings";

export function FinaleStage() {
  const tableauId = useMissionStore((s) => getActiveTableau(s.currentT).id);
  const tableauKind = useMissionStore((s) => getActiveTableau(s.currentT).kind);
  const isFinale = tableauKind === "finale";
  const isTerminal = isTerminalTableau(tableauId);
  const isPhotorealTheme = useMissionStore(
    (s) => s.renderMode === "space" || s.renderMode === "editorial",
  );

  if (!isFinale) return null;

  return (
    <>
      {isPhotorealTheme && isTerminal && <SkyDome />}
      {isPhotorealTheme && !isTerminal && <VolumetricRings />}
      {isPhotorealTheme && isTerminal && <RingBackdrop />}
      {isPhotorealTheme && isTerminal && <CassiniTrail />}
      {isPhotorealTheme && !isTerminal && <RingParticleField />}
      {isPhotorealTheme && isTerminal && <TerminalSunFill />}
      {isTerminal && <TerminalControls />}
    </>
  );
}
