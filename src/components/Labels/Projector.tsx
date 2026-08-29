// src/components/Labels/Projector.tsx
//

import {
  BODY_LABELS,
  findBodyLabel,
  latLonToUnitVec,
} from "@/scenes/cassini/data/bodyLabels";
import { COMPONENTS } from "@/scenes/cassini/data/components";
import { INSPECTION_VIEWS } from "@/scenes/cassini/data/inspectionViews";
import {
  ATMOSPHERE_TABLEAU_ID,
  HUYGENS_SEPARATION_T,
} from "@/scenes/cassini/data/missionConstants";
import { getActiveTableau } from "@/scenes/cassini/data/tableaus";
import { moonWorldPositions } from "@/scenes/cassini/parts/TableauMoonRenderer";
import { labelAnchorsRef } from "@/scenes/cassini/Spacecraft";
import { useMissionStore } from "@/store/missionStore";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import styles from "./Labels.module.css";

const PRIMARY_IDS = new Set(["hga", "huygens", "bus", "iss", "radar", "mag"]);
const MIN_PUSH_PRIMARY = 220;
const MIN_PUSH_SECONDARY = 140;
const HOMEPAGE_T_EPSILON = 0.001;
const LABEL_SAFE_BOTTOM_PX = 240;
const HORIZONTAL_LOCK_EXCEPTIONS = new Set(["mag", "rpws"]);
const LEFT_COLUMN_END_X = 380;
const RIGHT_COLUMN_END_OFFSET = 380;
const LOCKED_LABEL_MIN_GAP_PX = 44;

// Display name shown on each label.
const LABEL_DISPLAY_NAMES: Record<string, string> = {
  bus: "BUS",
  hga: "High-Gain Antenna (HGA)",
  huygens: "HUYGENS",
  mag: "Magnetometer (MAG)",
  iss: "Imaging Science Subsystem (ISS)",
  radar: "RADAR",
  vims: "Visible and Infrared Mapping Spectrometer (VIMS)",
  cirs: "Composite Infrared Spectrometer (CIRS)",
  inms: "Ion and Neutral Mass Spectrometer (INMS)",
  uvis: "Ultraviolet Imaging Spectrograph (UVIS)",
  rpws: "Radio and Plasma Wave Science (RPWS)",
  caps: "Cassini Plasma Spectrometer (CAPS)",
  mimi: "Magnetospheric Imaging Instrument (MIMI)",
  cda: "Cosmic Dust Analyzer (CDA)",
  rss: "Radio Science Subsystem (RSS)",
  lga1: "Low-Gain Antenna 1 (LGA-1)",
};

const _v3 = new THREE.Vector3();

export function Projector() {
  const { camera, size } = useThree();
  const showLabels = useMissionStore((s) => s.showLabels);
  const activeComponent = useMissionStore((s) => s.activeComponent);
  const setActiveComponent = useMissionStore((s) => s.setActiveComponent);
  const inspectionView = useMissionStore((s) => s.inspectionView);
  const inAtmosphere = useMissionStore(
    (s) => getActiveTableau(s.currentT).id === ATMOSPHERE_TABLEAU_ID,
  );

  const dotsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const textsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const linesRef = useRef<Record<string, SVGLineElement | null>>({});
  const buttonRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const moonLabelRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const surfaceLabelRef = useRef<Record<string, HTMLButtonElement | null>>({});

  useFrame(() => {
    try {
      if (!showLabels) return;

      // Reads currentT straight from the store to avoid a 60x/s re-render.
      const currentT = useMissionStore.getState().currentT;
      const huygensHasSeparated = currentT >= HUYGENS_SEPARATION_T;

      const tableau = getActiveTableau(currentT);
      const inMoonTableau = tableau.kind === "moon";
      const isHomepage = currentT < HOMEPAGE_T_EPSILON;

      const showSpacecraftLabels = isHomepage && inspectionView !== null;
      const viewAnchorIds = inspectionView
        ? INSPECTION_VIEWS[inspectionView].anchorIds
        : [];
      const viewAnchorSet = new Set(viewAnchorIds);

      let busCx = size.width / 2;
      let busCy = size.height / 2;
      const busAnchor = labelAnchorsRef.current.find((a) => a.id === "bus");
      if (busAnchor) {
        _v3.copy(busAnchor.worldPosition).project(camera);
        if (_v3.z < 1) {
          busCx = (_v3.x * 0.5 + 0.5) * size.width;
          busCy = (-_v3.y * 0.5 + 0.5) * size.height;
        }
      }

      // Hide every spacecraft label up front; the visible pass below will
      // re-show only the ones belonging to the active inspection view.
      labelAnchorsRef.current.forEach((anchor) => {
        const w = buttonRef.current[anchor.id];
        if (w) w.style.display = "none";
        const l = linesRef.current[anchor.id];
        if (l) l.style.display = "none";
      });

      const labelTargets: Record<
        string,
        { sx: number; sy: number; tx: number; ty: number }
      > = {};
      const visibleAnchorIds: string[] = [];

      if (showSpacecraftLabels) {
        for (const anchor of labelAnchorsRef.current) {
          if (!viewAnchorSet.has(anchor.id)) continue;

          // Huygens has no label once it's separated from the orbiter.
          if (anchor.id === "huygens" && huygensHasSeparated) {
            continue;
          }

          _v3.copy(anchor.worldPosition).project(camera);
          if (_v3.z > 1) continue;

          const sx = (_v3.x * 0.5 + 0.5) * size.width;
          const sy = (_v3.y * -0.5 + 0.5) * size.height;

          let tx: number;
          let ty: number;

          if (HORIZONTAL_LOCK_EXCEPTIONS.has(anchor.id)) {
            const dx = sx - busCx;
            const dy = sy - busCy;
            const dist = Math.max(Math.hypot(dx, dy), 1);
            let nx: number, ny: number;
            if (dist < 8) {
              let h = 0;
              for (let i = 0; i < anchor.id.length; i++) {
                h = (h * 31 + anchor.id.charCodeAt(i)) | 0;
              }
              const ang = (h % 360) * (Math.PI / 180);
              nx = Math.cos(ang);
              ny = Math.sin(ang);
            } else {
              nx = dx / dist;
              ny = dy / dist;
            }
            const isPrimary = PRIMARY_IDS.has(anchor.id);
            const pushDist = isPrimary ? MIN_PUSH_PRIMARY : MIN_PUSH_SECONDARY;
            tx = sx + nx * pushDist;
            ty = sy + ny * pushDist;
          } else {
            const isLeft = sx < busCx;
            tx = isLeft
              ? LEFT_COLUMN_END_X
              : size.width - RIGHT_COLUMN_END_OFFSET;
            ty = sy;
          }
          const maxTy = size.height - LABEL_SAFE_BOTTOM_PX;
          if (ty > maxTy) ty = maxTy;

          labelTargets[anchor.id] = { sx, sy, tx, ty };
          visibleAnchorIds.push(anchor.id);
        }

        const BOX_H = LOCKED_LABEL_MIN_GAP_PX;
        const BOX_W = 110;
        const safeMaxTy = size.height - LABEL_SAFE_BOTTOM_PX;
        const ids = visibleAnchorIds.slice().sort();
        for (let iter = 0; iter < 6; iter++) {
          for (let i = 0; i < ids.length; i++) {
            for (let j = i + 1; j < ids.length; j++) {
              const a = labelTargets[ids[i]!]!;
              const b = labelTargets[ids[j]!]!;
              const dx = a.tx - b.tx;
              const dy = a.ty - b.ty;
              if (Math.abs(dx) < BOX_W && Math.abs(dy) < BOX_H) {
                const push = (BOX_H - Math.abs(dy)) / 2 + 1;
                if (dy >= 0) {
                  a.ty += push;
                  b.ty -= push;
                } else {
                  a.ty -= push;
                  b.ty += push;
                }
              }
            }
          }
          for (const id of ids) {
            const t = labelTargets[id]!;
            if (t.ty > safeMaxTy) t.ty = safeMaxTy;
          }
        }

        // Write to the DOM.
        for (const id of visibleAnchorIds) {
          const t = labelTargets[id]!;
          const button = buttonRef.current[id];
          const dot = dotsRef.current[id];
          const text = textsRef.current[id];
          const line = linesRef.current[id];

          if (button) button.style.display = "block";
          if (line) line.style.display = "block";

          if (dot) dot.style.transform = `translate(${t.sx}px, ${t.sy}px)`;

          const isLeft = t.tx < busCx;
          const lineEndX = isLeft ? t.tx - 10 : t.tx + 10;

          if (text) {
            text.style.transform = `translate(${lineEndX}px, ${t.ty}px) ${isLeft ? "translateX(-100%)" : ""}`;
            if (isLeft) {
              text.style.borderLeft = "1px solid var(--panel-border)";
              text.style.alignItems = "flex-end";
              text.style.borderRadius = "2px 0 0 2px";
            } else {
              text.style.borderRight = "1px solid var(--panel-border)";
              text.style.alignItems = "flex-start";
              text.style.borderRadius = "0 2px 2px 0";
            }
          }

          if (line) {
            line.setAttribute("x1", t.sx.toString());
            line.setAttribute("y1", t.sy.toString());
            line.setAttribute("x2", lineEndX.toString());
            line.setAttribute("y2", t.ty.toString());
          }
        }
      }

      //  Body label
      const activeBodyId = inMoonTableau ? tableau.body : null;
      const placedMoons = tableau.moons;
      for (const body of BODY_LABELS) {
        const button = moonLabelRef.current[body.bodyId];
        if (!button) continue;

        let anchored = false;
        if (body.bodyId === activeBodyId) {
          _v3.set(0, 0, 0);
          anchored = true;
        } else if (placedMoons) {
          const placement = placedMoons.find((m) => m.body === body.bodyId);
          if (placement) {
            const live = moonWorldPositions.get(body.bodyId);
            if (live) _v3.copy(live);
            else _v3.set(...placement.pos);
            anchored = true;
          }
        }
        if (!anchored) {
          button.style.display = "none";
          continue;
        }

        _v3.project(camera);
        if (_v3.z > 1 || _v3.x < -1 || _v3.x > 1 || _v3.y < -1 || _v3.y > 1) {
          button.style.display = "none";
          continue;
        }
        const mx = (_v3.x * 0.5 + 0.5) * size.width;
        const my = (_v3.y * -0.5 + 0.5) * size.height;
        button.style.display = "block";
        button.style.transform = `translate(${mx}px, ${my}px)`;
      }

      // Surface features on the active moon
      if (activeBodyId) {
        const bodyLabel = findBodyLabel(activeBodyId);
        const moonRadius = tableau.moonEffectiveRadius ?? 0;
        if (bodyLabel && moonRadius > 0) {
          for (const feat of bodyLabel.surfaceFeatures) {
            const button =
              surfaceLabelRef.current[`${activeBodyId}.${feat.id}`];
            if (!button) continue;
            const [ux, uy, uz] = latLonToUnitVec(feat.lat, feat.lon);
            _v3.set(ux * moonRadius, uy * moonRadius, uz * moonRadius);
            const dot =
              ux * (_v3.x - camera.position.x) +
              uy * (_v3.y - camera.position.y) +
              uz * (_v3.z - camera.position.z);
            if (dot > 0) {
              button.style.display = "none";
              continue;
            }
            _v3.project(camera);
            if (_v3.z > 1) {
              button.style.display = "none";
              continue;
            }
            const fx = (_v3.x * 0.5 + 0.5) * size.width;
            const fy = (_v3.y * -0.5 + 0.5) * size.height;
            button.style.display = "block";
            button.style.transform = `translate(${fx}px, ${fy}px)`;
          }
        }
      }
      for (const body of BODY_LABELS) {
        if (body.bodyId === activeBodyId) continue;
        for (const feat of body.surfaceFeatures) {
          const button = surfaceLabelRef.current[`${body.bodyId}.${feat.id}`];
          if (button) button.style.display = "none";
        }
      }
    } catch (err) {
      console.error(
        "[Projector useFrame] crash — active component:",
        activeComponent,
        err,
      );
    }
  });

  if (!showLabels || inAtmosphere) return null;

  return (
    <Html fullscreen style={{ pointerEvents: "none" }}>
      <svg
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          overflow: "visible",
          pointerEvents: "none",
          zIndex: 1,
        }}
      >
        {COMPONENTS.map((c) => (
          <line
            key={`line-${c.id}`}
            ref={(el) => {
              linesRef.current[c.id] = el;
            }}
            stroke={
              activeComponent === c.id ? "var(--color-accent)" : "#ffffff"
            }
            strokeWidth={activeComponent === c.id ? 1.5 : 1}
            opacity={PRIMARY_IDS.has(c.id) || activeComponent === c.id ? 1 : 1}
            style={{ display: "none" }}
          />
        ))}
      </svg>

      <div className={styles.container} style={{ zIndex: 3 }}>
        {BODY_LABELS.map((body) => (
          <button
            key={`body-${body.bodyId}`}
            ref={(el) => {
              moonLabelRef.current[body.bodyId] = el;
            }}
            className={styles.moonLabel}
            style={{
              display: "none",
              pointerEvents: "auto",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
            onClick={(e) => {
              e.stopPropagation();
              useMissionStore.getState().resetCamera();
            }}
          >
            <span className={styles.moonName}>{body.name}</span>
          </button>
        ))}
      </div>

      <div className={styles.container} style={{ zIndex: 3 }}>
        {BODY_LABELS.flatMap((body) =>
          body.surfaceFeatures.map((feat) => (
            <button
              key={`surf-${body.bodyId}.${feat.id}`}
              ref={(el) => {
                surfaceLabelRef.current[`${body.bodyId}.${feat.id}`] = el;
              }}
              className={styles.surfaceLabel ?? styles.moonLabel}
              style={{
                display: "none",
                pointerEvents: "auto",
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <span className={styles.moonName}>{feat.name}</span>
            </button>
          )),
        )}
      </div>

      <div className={styles.container} style={{ zIndex: 2 }}>
        {COMPONENTS.map((c) => {
          const isPrimary = PRIMARY_IDS.has(c.id);
          const isActive = activeComponent === c.id;

          return (
            <button
              key={`btn-${c.id}`}
              ref={(el) => {
                buttonRef.current[c.id] = el;
              }}
              className={styles.label}
              data-active={isActive}
              data-primary={isPrimary}
              onClick={(e) => {
                e.stopPropagation();
                setActiveComponent(isActive ? null : c.id);
              }}
              style={{ display: "none" }}
            >
              <div
                ref={(el) => {
                  dotsRef.current[c.id] = el;
                }}
                className={styles.dot}
              />
              <div
                ref={(el) => {
                  textsRef.current[c.id] = el;
                }}
                className={styles.textBlock}
              >
                <span className={styles.labelName}>
                  {LABEL_DISPLAY_NAMES[c.id] ?? c.shortName}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Html>
  );
}
