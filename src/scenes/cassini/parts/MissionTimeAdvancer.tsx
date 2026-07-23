import { useFrame } from "@react-three/fiber";
import { useMissionStore } from "../../../store/missionStore";
import { FULL_MISSION_SECONDS } from "../data/missionConstants";
import { displayToMission, missionToDisplay } from "../lib/tRemap";

// Advances time inside r3f's render loop so it shares the same delta as
// rendering. A separate RAF chain drifts against r3f's when frames are
// throttled
export function MissionTimeAdvancer() {
  useFrame((_, deltaRaw) => {
    const delta = Number.isFinite(deltaRaw)
      ? Math.min(0.1, Math.max(0, deltaRaw))
      : 0;
    if (delta === 0) return;
    const s = useMissionStore.getState();
    if (!s.isPlaying) return;
    const currentDisplayT = missionToDisplay(s.currentT);
    const advance = (delta * s.playbackSpeed) / FULL_MISSION_SECONDS;
    const nextDisplayT = currentDisplayT + advance;
    if (nextDisplayT >= 1) {
      useMissionStore.setState({ currentT: 1, isPlaying: false });
      return;
    }
    s.setTime(displayToMission(nextDisplayT));
  }, -2);
  return null;
}
