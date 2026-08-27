// src/scenes/cassini/finale/parts/TerminalControls.tsx
//
// The terminal camera pose is locked; the viewer may only drag to pan posX
// and tilt pitch, or pinch/scroll to resize Cassini.

import { useThree } from "@react-three/fiber";
import { useEffect } from "react";
import {
  CASS_SCALE_MAX,
  CASS_SCALE_MIN,
  PITCH_MAX,
  PITCH_MIN,
  POSX_MAX,
  POSX_MIN,
  useCameraDebugStore,
} from "../lib/cameraDebug";

const POSX_PER_PX = 0.25;
const PITCH_PER_PX = 0.15;
const WHEEL_RESPONSE = 0.0015;
const PINCH_RESPONSE = 1.0;

const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export function TerminalControls() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    const el = gl.domElement;
    const store = useCameraDebugStore;

    // 1 pointer = drag, 2 = pinch.
    const pointers = new Map<number, { x: number; y: number }>();

    let dragStartX = 0;
    let dragStartY = 0;
    let baseDragPosX = 0;
    let basePitch = 0;

    let pinchStartDist = 0;
    let baseScale = 1;

    const dist = () => {
      const pts = [...pointers.values()];
      if (pts.length < 2) return 0;
      const dx = pts[0]!.x - pts[1]!.x;
      const dy = pts[0]!.y - pts[1]!.y;
      return Math.hypot(dx, dy);
    };

    const beginDrag = (x: number, y: number) => {
      dragStartX = x;
      dragStartY = y;
      const s = store.getState();
      baseDragPosX = s.posX;
      basePitch = s.pitchDeg;
    };

    const beginPinch = () => {
      pinchStartDist = dist();
      baseScale = store.getState().cassiniScale;
    };

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) beginDrag(e.clientX, e.clientY);
      else if (pointers.size === 2) beginPinch();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const s = store.getState();

      if (pointers.size >= 2) {
        if (pinchStartDist > 0) {
          const ratio = dist() / pinchStartDist;
          const scaled = baseScale * (1 + (ratio - 1) * PINCH_RESPONSE);
          s.set({ cassiniScale: clamp(scaled, CASS_SCALE_MIN, CASS_SCALE_MAX) });
        }
        return;
      }

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      s.set({
        posX: clamp(baseDragPosX + dx * POSX_PER_PX, POSX_MIN, POSX_MAX),
        pitchDeg: clamp(basePitch - dy * PITCH_PER_PX, PITCH_MIN, PITCH_MAX),
      });
    };

    const endPointer = (e: PointerEvent) => {
      el.releasePointerCapture?.(e.pointerId);
      pointers.delete(e.pointerId);
      // Re-seed the drag baseline from the surviving pointer so the camera
      // doesn't jump when a pinch drops back to a single finger.
      if (pointers.size === 1) {
        const p = [...pointers.values()][0]!;
        beginDrag(p.x, p.y);
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const s = store.getState();
      const factor = Math.exp(-e.deltaY * WHEEL_RESPONSE);
      s.set({
        cassiniScale: clamp(
          s.cassiniScale * factor,
          CASS_SCALE_MIN,
          CASS_SCALE_MAX,
        ),
      });
    };

    const prevTouchAction = el.style.touchAction;
    const prevCursor = el.style.cursor;
    el.style.touchAction = "none";
    el.style.cursor = "grab";

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endPointer);
    el.addEventListener("pointercancel", endPointer);
    el.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endPointer);
      el.removeEventListener("pointercancel", endPointer);
      el.removeEventListener("wheel", onWheel);
      el.style.touchAction = prevTouchAction;
      el.style.cursor = prevCursor;
      pointers.clear();
    };
  }, [gl]);

  return null;
}
