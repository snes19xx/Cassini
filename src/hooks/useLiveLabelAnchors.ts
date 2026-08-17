// Bbox-center anchors for primary instruments, quaternion-rotated offsets for secondary.

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import { COMPONENTS } from "../scenes/cassini/data/components";
import {
  PRIMARY_NUDGES,
  SECONDARY_OFFSETS,
} from "../scenes/cassini/data/labelOffsets";
import type { CassiniAAnchors } from "../scenes/cassini/parts/CassiniHuygensA";
import type { AnchorPoint } from "./useProjectedPoints";

const MODEL_RADIUS_BY_ID: Record<string, number> = Object.fromEntries(
  COMPONENTS.map((c) => [c.id, c.modelRadius]),
);

const PRIMARY_IDS = ["bus", "hga", "huygens", "iss", "radar"] as const;
type PrimaryId = (typeof PRIMARY_IDS)[number];

const SECONDARY_COMPONENTS = COMPONENTS.filter((c) => c.busRelative);
const SECONDARY_IDS = SECONDARY_COMPONENTS.map((c) => c.id);

const PRIMARY_TO_REF: Record<PrimaryId, keyof CassiniAAnchors> = {
  bus: "bus",
  hga: "hga",
  huygens: "huygens",
  iss: "iss",
  radar: "radar",
};

const _busWorld = new THREE.Vector3();
const _rotated = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _bboxCenter = new THREE.Vector3();

export function useLiveLabelAnchors(
  anchorRefs: CassiniAAnchors,
  huygensHasSeparated: boolean,
): React.MutableRefObject<AnchorPoint[]> {
  const vecPool = useMemo(() => {
    const pool: Record<string, THREE.Vector3> = {};
    for (const id of PRIMARY_IDS) pool[id] = new THREE.Vector3();
    for (const id of SECONDARY_IDS) pool[id] = new THREE.Vector3();
    return pool;
  }, []);

  const anchorsRef = useRef<AnchorPoint[]>(
    ([...PRIMARY_IDS, ...SECONDARY_IDS] as string[]).map((id) => ({
      id,
      worldPosition: vecPool[id]!,
      modelRadius: MODEL_RADIUS_BY_ID[id] ?? 1.5,
    })),
  );

  useFrame(() => {
    for (const id of PRIMARY_IDS) {
      if (id === "huygens" && huygensHasSeparated) {
        vecPool[id]!.set(0, -9999, 0);
        continue;
      }
      const mesh = anchorRefs[PRIMARY_TO_REF[id]]?.current;
      if (!mesh) continue;
      if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
      const bbox = mesh.geometry.boundingBox;
      if (!bbox) continue;
      bbox.getCenter(_bboxCenter);
      mesh.localToWorld(_bboxCenter);
      vecPool[id]!.copy(_bboxCenter);
      if (id === "huygens") vecPool[id]!.y -= 1.5;
      const nudge = PRIMARY_NUDGES[id];
      if (nudge) vecPool[id]!.add(nudge);
    }

    const busMesh = anchorRefs.bus?.current;
    if (!busMesh) return;

    _busWorld.copy(vecPool["bus"]!);
    busMesh.getWorldQuaternion(_quaternion);

    for (const id of SECONDARY_IDS) {
      const offset = SECONDARY_OFFSETS[id];
      if (!offset) continue;
      _rotated.copy(offset).applyQuaternion(_quaternion);
      vecPool[id]!.copy(_busWorld).add(_rotated);
    }
  });

  return anchorsRef;
}
