// src/scenes/cassini/data/inspectionViews.ts
//
// Guided inspection: the camera locks to one of four orthogonal viewpoints
// and labels only the instruments that face it, so every Cassini-Huygens
// component gets a discrete click target in at least one view.

export type InspectionViewId = "top" | "front" | "rear" | "mag";

export interface InspectionView {
  id: InspectionViewId;
  label: string;
  hint: string;
  camera: {
    pos: [number, number, number];
    lookAt: [number, number, number];
  };
  /** Component IDs surfaced in this view; anchors not listed stay hidden. */
  anchorIds: string[];
}

// Cameras sit closer than the default tableau view, with a small negative
// lookAt.y so the inspection bar at the bottom doesn't crowd the model.
export const INSPECTION_VIEWS: Record<InspectionViewId, InspectionView> = {
  top: {
    id: "top",
    label: "TOP",
    hint: "Dish & RADAR",
    camera: { pos: [0, 18, 4], lookAt: [0, -1.5, -0.5] },
    anchorIds: ["hga", "radar", "rss", "lga1"],
    // `hint` surfaces only as a tooltip; the button shows `label`.
  },
  front: {
    id: "front",
    label: "SIDE 1",
    hint: "Instrument bay",
    camera: { pos: [0, 0, 19], lookAt: [0, -0.3, 0] },
    anchorIds: ["iss", "vims", "cirs", "uvis", "inms", "mimi"],
  },
  rear: {
    id: "rear",
    label: "SIDE 2",
    hint: "Huygens probe",
    camera: { pos: [0, 0, -20], lookAt: [0, -1.5, -2.5] },
    anchorIds: ["bus", "huygens"],
  },
  mag: {
    id: "mag",
    label: "REAR",
    hint: "Boom & plasma",
    // Starboard 3/4 view; the direction keeps the hand-tuned plasma
    // offsets in labelOffsets.ts projecting to the right side of the bus.
    camera: { pos: [16, 4, 7], lookAt: [0, -1, -1] },
    anchorIds: ["mag", "rpws", "caps", "cda"],
  },
};

export const INSPECTION_VIEW_ORDER: InspectionViewId[] = [
  "top",
  "front",
  "rear",
  "mag",
];

export function getInspectionView(id: InspectionViewId): InspectionView {
  return INSPECTION_VIEWS[id];
}
