import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  useProjectionStore,
  type ProjectedPoint,
} from "../store/projectionStore";

export interface AnchorPoint {
  id: string;
  worldPosition: THREE.Vector3;
  modelRadius: number;
}

const _worldPos = new THREE.Vector3();
const _toCamera = new THREE.Vector3();
const _projected = new THREE.Vector3();

export function useProjectedPoints(anchors: AnchorPoint[]) {
  const { camera, size } = useThree();

  useFrame(() => {
    camera.getWorldPosition(_toCamera);
    const viewWidth = size.width;
    const viewHeight = size.height;

    const currentViewport = useProjectionStore.getState().viewport;
    if (
      currentViewport.width !== viewWidth ||
      currentViewport.height !== viewHeight
    ) {
      useProjectionStore.getState().setViewport(viewWidth, viewHeight);
    }

    // Accumulate every anchor's projection, then commit with a single
    // store write below.
    let patch: Record<string, ProjectedPoint> | null = null;

    anchors.forEach((anchor) => {
      // Isolate to scale anchors. Projector handles instrument labels imperatively.
      if (!anchor.id.startsWith("scale:")) return;

      _worldPos.copy(anchor.worldPosition);
      _projected.copy(_worldPos).project(camera);

      const screenX = (_projected.x * 0.5 + 0.5) * viewWidth;
      const screenY = (-_projected.y * 0.5 + 0.5) * viewHeight;

      const anchorDist = _worldPos.length();
      let facing = true;

      if (anchorDist > anchor.modelRadius) {
        const cameraDist = _toCamera.length() || 1;
        const cos = _worldPos.dot(_toCamera) / (anchorDist * cameraDist);
        facing = cos > -0.35;
      }

      const onScreen =
        _projected.z < 1 &&
        _projected.x >= -1 &&
        _projected.x <= 1 &&
        _projected.y >= -1 &&
        _projected.y <= 1;

      const point: ProjectedPoint = {
        id: anchor.id,
        screenX,
        screenY,
        y: screenY,
        facing: facing && _projected.z < 1,
        depth: _projected.z,
        onScreen,
      };

      (patch ??= {})[anchor.id] = point;
    });

    if (patch) {
      useProjectionStore.getState().setProjections(patch);
    }
  });
}
