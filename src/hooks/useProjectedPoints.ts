import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { create } from "zustand";

export interface ProjectedPoint {
  id: string;
  screenX: number;
  screenY: number;
  facing: boolean;
  depth: number;
  onScreen: boolean;
  y: number;
}

export interface AnchorPoint {
  id: string;
  worldPosition: THREE.Vector3;
  modelRadius: number;
}

interface ProjectionState {
  projections: Record<string, ProjectedPoint>;
  viewport: { width: number; height: number };
  // One store update per frame for every anchor's projection, instead of
  // one update (and one subscriber notify) per anchor per frame.
  setProjections: (patch: Record<string, ProjectedPoint>) => void;
  setViewport: (width: number, height: number) => void;
}

export const useProjectionStore = create<ProjectionState>((set) => ({
  projections: {},
  viewport: { width: 0, height: 0 },
  setProjections: (patch) =>
    set((s) => ({
      projections: { ...s.projections, ...patch },
    })),
  setViewport: (width, height) => set({ viewport: { width, height } }),
}));

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
