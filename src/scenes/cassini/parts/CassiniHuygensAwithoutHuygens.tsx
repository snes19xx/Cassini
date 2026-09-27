// src/scenes/cassini/parts/CassiniHuygensAwithoutHuygens.tsx
//
// Cassini orbiter only, used after Huygens separation (t >= 0.361177).
// Shares CassiniHuygensA's anchor ref shape so Spacecraft.tsx can use one
// unified ref type for both label models.

import React from "react";
import * as THREE from "three";
import { CassiniLabelHull, type CassiniAAnchors } from "./CassiniHuygensA";

interface ModelProps extends React.ComponentPropsWithoutRef<"group"> {
  geo?: boolean;
  anchorRefs?: CassiniAAnchors;
  overrideMaterial?: THREE.Material | null;
}

export function CassiniHuygensAwithoutHuygens({ geo, ...props }: ModelProps) {
  const url = geo
    ? "/assets/CassiniHuygensAwithoutHyugens_geo.glb"
    : "/assets/CassiniHuygensAwithoutHyugens.glb";
  return <CassiniLabelHull url={url} {...props} />;
}

// No module-level preload: Spacecraft.tsx warms this variant on a timer.
