// src/scenes/cassini/parts/TableauMoonRenderer.tsx
//
// All moon meshes pre-mount and stay mounted; per-frame damping picks
// which one is active instead of mount/unmount on every tableau swap.

import { useMissionStore } from "@/store/missionStore";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import * as THREE from "three";
import { FULL_MISSION_SECONDS } from "../data/missionConstants";
import { getActiveTableau, type Tableau } from "../data/tableaus";
import { missionToDisplay } from "../lib/tRemap";
import {
  ALL_MOONS,
  Binding,
  MoonId,
  getBinding,
  subscribe,
} from "../lib/textureService";

// Live world position per visible moon, read by the labels Projector.
export const moonWorldPositions: Map<string, THREE.Vector3> = new Map();

interface MoonTarget {
  scale: number;
  px: number;
  py: number;
  pz: number;
  tiltRad: number;
  spinRadPerSec: number;
  orbitRadPerSec: number;
}

const BODY_RADIUS: Record<string, number> = {
  titan: 7.69,
  iapetus: 4.39,
  enceladus: 1.49,
  mimas: 1.19,
  rhea: 4.59,
  dione: 3.36,
  tethys: 3.31,
};

// True tidally-locked periods read as static, so speed them up.
const MOON_SPIN_FACTOR = 3000;

// Drift is keyed to mission display time so scrubbing stays deterministic.
const _orbAxis = new THREE.Vector3();
const _orbEuler = new THREE.Euler();
const _orbOffset = new THREE.Vector3();

// PIA23175. Quad sits through the moon centre so the near side occludes it.
const PLUME_VERT = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_vertex>
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
  }
`;

const PLUME_FRAG = /* glsl */ `
  #include <common>
  #include <logdepthbuf_pars_fragment>
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vP;

  float hash1(float x) {
    return fract(sin(x * 12.9898) * 43758.5453);
  }

  void main() {
    #include <logdepthbuf_fragment>
    // Moon-centred, in radius units. Keep in sync with PLUME_CENTER_Y.
    vec2 p = vP + vec2(0.0, -1.2);
    float d = length(p);

    // Kills the sliver that peeks past the silhouette at glancing angles.
    float outsideDisc = smoothstep(0.982, 1.005, d);
    if (outsideDisc <= 0.0) discard;

    float jets = 0.0;
    for (int i = 0; i < 10; i++) {
      float fi = float(i);
      // Source angle from straight-down, jittered across the stripes.
      float a = -0.5 + 1.0 * (fi / 9.0) + (hash1(fi * 7.3) - 0.5) * 0.08;
      vec2 s = vec2(sin(a), -cos(a));
      float ca = a + (hash1(fi * 13.7) - 0.5) * 0.24;
      vec2 dir = vec2(sin(ca), -cos(ca));
      vec2 v = p - s;
      float t = dot(v, dir);
      if (t < 0.0) continue;
      float q = dot(v, vec2(-dir.y, dir.x));
      float w = (0.55 + 0.45 * hash1(fi * 3.1)) *
                (0.85 + 0.15 * sin(uTime * 0.7 + fi * 2.1));
      float sigma = 0.020 + t * (0.055 + 0.04 * hash1(fi * 5.9));
      jets += exp(-q * q / (2.0 * sigma * sigma)) * exp(-t * 2.7) * w;
    }

    // Merged haze the jets feed, in a cone just wider than the jet arc.
    float ang = acos(clamp(dot(p / max(d, 1e-4), vec2(0.0, -1.0)), -1.0, 1.0));
    float fog = exp(-max(d - 1.0, 0.0) * 2.1) *
                (1.0 - smoothstep(0.42, 0.8, ang));

    // Guard bands so the quad's own edges never print.
    float guard = (1.0 - smoothstep(1.45, 1.78, abs(p.x))) *
                  smoothstep(-2.8, -2.45, p.y);

    float I = (jets * 0.75 + fog * 0.22) * outsideDisc * guard * uIntensity;
    // Dither breaks additive banding in the soft fog.
    I -= (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 0.012;
    if (I < 0.004) discard;

    vec3 col = mix(vec3(0.55, 0.72, 1.0), vec3(0.95, 0.98, 1.0),
                   clamp(I, 0.0, 1.0));
    gl_FragColor = vec4(col, clamp(I, 0.0, 1.0));
  }
`;

// Radius units; PLUME_FRAG's coordinate shift must match.
const PLUME_CENTER_Y = -1.2;

const _plumeCam = new THREE.Vector3();

// Single-body tableaus centre the moon; multi-moon ones read placements.
function resolveMoonTarget(
  tab: Tableau,
  body: string,
  realR: number,
): MoonTarget | null {
  if (tab.kind !== "moon") return null;
  if (tab.body === body && tab.moonEffectiveRadius) {
    return {
      scale: tab.moonEffectiveRadius / realR,
      px: 0,
      py: 0,
      pz: 0,
      tiltRad: 0,
      spinRadPerSec: 0,
      orbitRadPerSec: 0,
    };
  }
  const placement = tab.moons?.find((m) => m.body === body);
  if (placement) {
    const baseRate = placement.spinPeriodHours
      ? (2 * Math.PI) / (placement.spinPeriodHours * 3600)
      : 0;
    return {
      scale: placement.effectiveRadius / realR,
      px: placement.pos[0],
      py: placement.pos[1],
      pz: placement.pos[2],
      tiltRad: ((placement.axialTiltDeg ?? 0) * Math.PI) / 180,
      spinRadPerSec: baseRate * MOON_SPIN_FACTOR,
      orbitRadPerSec: placement.orbitRadPerSec ?? 0,
    };
  }
  return null;
}

function useMoonBinding(body: MoonId): Binding {
  return useSyncExternalStore(
    (fn) => subscribe(body, fn),
    () => getBinding(body),
    () => getBinding(body),
  );
}

function MoonMesh({ body, renderMode }: { body: MoonId; renderMode: string }) {
  const cameraResetNonce = useMissionStore((s) => s.cameraResetNonce);

  const binding = useMoonBinding(body);
  const spaceMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const blueprintMaterialRef = useRef<THREE.MeshBasicMaterial | null>(null);
  if (!spaceMaterialRef.current) {
    spaceMaterialRef.current = new THREE.MeshStandardMaterial({
      color: "#9aa0a8",
      roughness: 0.78,
      metalness: 0.0,
    });
  }
  if (!blueprintMaterialRef.current) {
    blueprintMaterialRef.current = new THREE.MeshBasicMaterial({
      color: "#8fd2ff",
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
  }
  useEffect(() => {
    const m = spaceMaterialRef.current;
    if (!m) return;
    const hadMap = m.map !== null;
    const willHaveMap = binding.texture !== null;
    if (binding.texture) {
      m.map = binding.texture;
      m.color.set("#ffffff");
    } else {
      m.map = null;
      m.color.set("#9aa0a8");
    }
    if (hadMap !== willHaveMap) {
      m.needsUpdate = true;
    }
  }, [binding]);

  const realR = BODY_RADIUS[body] ?? 5;
  const groupRef = useRef<THREE.Group>(null);
  // Nested so the body spins about its own tilted axis.
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const plumeRef = useRef<THREE.Group>(null);
  const liveScaleRef = useRef(0);
  const livePosRef = useRef(new THREE.Vector3());

  const plumeMaterial = useMemo(() => {
    if (body !== "enceladus") return null;
    return new THREE.ShaderMaterial({
      vertexShader: PLUME_VERT,
      fragmentShader: PLUME_FRAG,
      uniforms: {
        uIntensity: { value: 0.8 },
        uTime: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [body]);
  useEffect(() => {
    return () => {
      plumeMaterial?.dispose();
    };
  }, [plumeMaterial]);

  useEffect(() => {
    if (!groupRef.current) return;
    const t = useMissionStore.getState().currentT;
    const tab = getActiveTableau(t);
    const target = resolveMoonTarget(tab, body, realR);
    if (target) {
      liveScaleRef.current = target.scale;
      livePosRef.current.set(target.px, target.py, target.pz);
      groupRef.current.scale.setScalar(Math.max(0.00001, target.scale));
      groupRef.current.position.copy(livePosRef.current);
      groupRef.current.visible = target.scale > 0.001;
    } else {
      liveScaleRef.current = 0;
      groupRef.current.scale.setScalar(0.00001);
      groupRef.current.visible = false;
    }
    // eslint-disable-next-line react-hooks
  }, [cameraResetNonce]);

  useFrame((frameState, deltaRaw) => {
    if (!groupRef.current) return;
    const delta = Number.isFinite(deltaRaw)
      ? Math.min(0.1, Math.max(0, deltaRaw))
      : 0;
    try {
      const t = useMissionStore.getState().currentT;
      const tab = getActiveTableau(t);
      const target = resolveMoonTarget(tab, body, realR);
      const targetScale = target ? target.scale : 0;

      liveScaleRef.current = THREE.MathUtils.damp(
        liveScaleRef.current,
        targetScale,
        4,
        delta,
      );
      if (!Number.isFinite(liveScaleRef.current)) {
        liveScaleRef.current = targetScale;
      }

      if (target) {
        let tx = target.px;
        let ty = target.py;
        let tz = target.pz;
        // Swing the placement about the backdrop's ring axis, prograde.
        const sat = tab.saturnBackdrop;
        if (sat && target.orbitRadPerSec !== 0) {
          const elapsedSec =
            Math.max(0, missionToDisplay(t) - missionToDisplay(tab.tStart)) *
            FULL_MISSION_SECONDS;
          const theta = target.orbitRadPerSec * elapsedSec;
          _orbAxis.set(0, 1, 0);
          if (sat.rotDeg) {
            _orbEuler.set(
              (sat.rotDeg[0] * Math.PI) / 180,
              (sat.rotDeg[1] * Math.PI) / 180,
              (sat.rotDeg[2] * Math.PI) / 180,
            );
            _orbAxis.applyEuler(_orbEuler);
          }
          _orbOffset.set(tx - sat.pos[0], ty - sat.pos[1], tz - sat.pos[2]);
          _orbOffset.applyAxisAngle(_orbAxis, theta);
          tx = sat.pos[0] + _orbOffset.x;
          ty = sat.pos[1] + _orbOffset.y;
          tz = sat.pos[2] + _orbOffset.z;
        }

        const lp = livePosRef.current;
        if (liveScaleRef.current < 0.001) {
          lp.set(tx, ty, tz);
        } else {
          lp.x = THREE.MathUtils.damp(lp.x, tx, 3.5, delta);
          lp.y = THREE.MathUtils.damp(lp.y, ty, 3.5, delta);
          lp.z = THREE.MathUtils.damp(lp.z, tz, 3.5, delta);
          if (!Number.isFinite(lp.x + lp.y + lp.z)) {
            lp.set(tx, ty, tz);
          }
        }
        groupRef.current.position.copy(lp);
      }

      groupRef.current.scale.setScalar(Math.max(0.00001, liveScaleRef.current));
      groupRef.current.visible = liveScaleRef.current > 0.001;

      if (groupRef.current.visible && tab.moons) {
        let anchor = moonWorldPositions.get(body);
        if (!anchor) {
          anchor = new THREE.Vector3();
          moonWorldPositions.set(body, anchor);
        }
        anchor.copy(groupRef.current.position);
      } else if (moonWorldPositions.has(body)) {
        moonWorldPositions.delete(body);
      }

      // Spin freezes in tableaus without a rate; phase is never reset.
      if (tiltRef.current) {
        const tilt = target ? target.tiltRad : 0;
        if (tiltRef.current.rotation.z !== tilt) {
          tiltRef.current.rotation.z = tilt;
        }
      }
      if (spinRef.current && target && target.spinRadPerSec > 0) {
        spinRef.current.rotation.y += delta * target.spinRadPerSec;
      }

      // Y-billboard so the jets rise off the limb from any orbit azimuth.
      if (plumeRef.current && plumeMaterial) {
        const plumesVisible =
          !!target &&
          tab.body === body &&
          tab.effects?.plumes === true &&
          renderMode !== "blueprint";
        plumeRef.current.visible = plumesVisible;
        if (plumesVisible) {
          _plumeCam.copy(frameState.camera.position);
          groupRef.current.worldToLocal(_plumeCam);
          plumeRef.current.rotation.y = Math.atan2(_plumeCam.x, _plumeCam.z);
          plumeMaterial.uniforms.uTime!.value += delta;
        }
      }
    } catch (err) {
      console.error(`[MoonMesh:${body} useFrame] swallowed error`, err);
    }
  });

  const showSpace = renderMode !== "blueprint";
  return (
    <group ref={groupRef} visible={false}>
      <group ref={tiltRef}>
        <group ref={spinRef}>
          <mesh visible={showSpace}>
            <sphereGeometry args={[realR, 96, 48]} />
            <primitive object={spaceMaterialRef.current} attach="material" />
          </mesh>
          <mesh visible={!showSpace}>
            <sphereGeometry args={[realR, 96, 48]} />
            <primitive
              object={blueprintMaterialRef.current}
              attach="material"
            />
          </mesh>
        </group>
      </group>
      {plumeMaterial && (
        /* Quad geometry is authored in radius units; mesh scale maps those
           to this body. The [0, y, 0] offset survives the Y-billboard. */
        <group ref={plumeRef} visible={false}>
          <mesh
            position={[0, PLUME_CENTER_Y * realR, 0]}
            scale={realR}
            renderOrder={11}
          >
            <planeGeometry args={[3.6, 3.2]} />
            <primitive object={plumeMaterial} attach="material" />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function TableauMoonRenderer({ renderMode }: { renderMode: string }) {
  return (
    <>
      {ALL_MOONS.map((body) => (
        <MoonMesh key={body} body={body} renderMode={renderMode} />
      ))}
    </>
  );
}
