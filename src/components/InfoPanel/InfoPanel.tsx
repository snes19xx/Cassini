// src/components/InfoPanel/InfoPanel.tsx

import { COMPONENTS } from "@/scenes/cassini/data/components";
import { stateAt } from "@/scenes/cassini/lib/stateAt";
import {
  BODY_CONTENT,
  RING_CROSSING_T_VALUES,
  findActiveEvent,
  tToDateMs,
} from "@/scenes/cassini/data/phases";
import {
  TABLEAUS,
  getActiveTableau,
  getBodyContentId,
} from "@/scenes/cassini/data/tableaus";
import { FinaleTelemetryBlock } from "@/scenes/cassini/finale/parts/FinaleTelemetryBlock";
import { useMissionStore } from "@/store/missionStore";
import { useEffect, useRef, useState } from "react";
import styles from "./InfoPanel.module.css";

// Sub-components

interface BarRowProps {
  label: string;
  value: number; // 0-1
  precision?: number;
  unit?: string;
  warn?: boolean;
}

function BarRow({ label, value, precision = 0, unit = "%", warn }: BarRowProps) {
  const display = `${(value * 100).toFixed(precision)}${unit}`;
  return (
    <div className={styles.barRow}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.bar}>
        <div
          className={styles.barFill}
          style={{
            width: `${value * 100}%`,
            background:
              warn && value > 0.15 ? "var(--color-warn, #ff6b35)" : undefined,
          }}
        />
      </div>
      <span className={styles.barValue}>{display}</span>
    </div>
  );
}

interface StatProps {
  label: string;
  value: string;
}

function Stat({ label, value }: StatProps) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

// Long-span tableaus drop the day so the date doesn't imply false precision.
const MONTH_YEAR_TABLEAUS = new Set(["family_portrait", "three_crescents"]);

function missionDate(t: number, tableauId?: string): string {
  const d = new Date(tToDateMs(t));
  if (tableauId && MONTH_YEAR_TABLEAUS.has(tableauId)) {
    return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  }
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function earthSaturnDistanceMkm(t: number): number {
  const base = 1327 + (t - 0.337) * 350;
  const wobble = Math.sin(t * Math.PI * 1.8) * 120;
  return Math.max(800, Math.min(1700, base + wobble));
}

function approxVelocity(t: number): number {
  if (t < 0.05) return 17 + t * 20 * 20;
  if (t < 0.12) return 37 - (t - 0.05) * 50;
  if (t < 0.26) return 33 + (t - 0.12) * 15;
  if (t < 0.33) return 35 - (t - 0.26) * 350;
  if (t < 0.337) return 10 + (t - 0.33) * 2900;
  if (t < 0.4) return 30 - (t - 0.337) * 60;
  const orbitPhase = ((t - 0.4) * 24) % 1;
  const baseV = 12 + Math.sin(orbitPhase * Math.PI) * 16;
  if (t < 0.98) return baseV;
  return baseV + (t - 0.98) * 120;
}

// Tracks the tableau window so a retime can't leave this stale.
const RING_DIVE_T_START =
  TABLEAUS.find((tab) => tab.id === "finale_ring_dive")?.tStart ?? 0.978;

function currentRingDive(t: number): number {
  if (t < 0.9804) return 0;
  for (let i = 0; i < RING_CROSSING_T_VALUES.length; i++) {
    const ct = RING_CROSSING_T_VALUES[i];
    if (ct !== undefined && t < ct + 0.002) return i + 1;
  }
  return RING_CROSSING_T_VALUES.length;
}

// Slides to keep the active event visible when a body has more than this.
const MAX_VISIBLE_EVENTS = 5;

function sliceEvents(
  events: { dateMs: number }[],
  activeDateMs: number,
): [number, number] {
  if (events.length <= MAX_VISIBLE_EVENTS) return [0, events.length];
  let idx = events.findIndex((e) => e.dateMs >= activeDateMs);
  if (idx < 0) idx = events.length; // all events are past
  const startMax = events.length - MAX_VISIBLE_EVENTS - 1;
  const start = Math.max(0, Math.min(idx, startMax));
  return [start, start + MAX_VISIBLE_EVENTS];
}

type Page = "body" | "spacecraft";
const PAGE_ORDER: Page[] = ["body", "spacecraft"];

interface PageNavProps {
  page: Page;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

function PageNav({ page, label, onPrev, onNext }: PageNavProps) {
  const idx = PAGE_ORDER.indexOf(page);
  return (
    <div className={styles.pageNav}>
      <button
        type="button"
        className={styles.pageArrow}
        onClick={onPrev}
        aria-label="Previous page"
      >
        ‹
      </button>
      <span className={styles.pageLabel}>
        {label}
        <span className={styles.pageIndicator}>
          {idx + 1}/{PAGE_ORDER.length}
        </span>
      </span>
      <button
        type="button"
        className={styles.pageArrow}
        onClick={onNext}
        aria-label="Next page"
      >
        ›
      </button>
    </div>
  );
}

// Main component

export function InfoPanel() {
  const currentT = useMissionStore((s) => s.currentT);
  const activeComponentId = useMissionStore((s) => s.activeComponent);
  const setActiveComponent = useMissionStore((s) => s.setActiveComponent);
  const renderMode = useMissionStore((s) => s.renderMode);

  const [page, setPage] = useState<Page>("body");

  const scrollRef = useRef<HTMLDivElement>(null);
  const syncOverflow = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.dataset.overflowing = String(el.scrollHeight > el.clientHeight + 1);
  };
  useEffect(() => {
    syncOverflow();
  }, []);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(syncOverflow);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const state = stateAt(currentT);
  const activeComponent = COMPONENTS.find((c) => c.id === activeComponentId);

  const activeTableau = getActiveTableau(currentT);
  const bodyId = getBodyContentId(activeTableau);
  const body = bodyId ? BODY_CONTENT[bodyId] : null;
  const activeEvent = body
    ? findActiveEvent(body.events, tToDateMs(currentT))
    : null;
  const distanceMkm = earthSaturnDistanceMkm(currentT);
  const lightDelaySec = (distanceMkm * 1e6) / 299792;
  const velocityKms = approxVelocity(currentT);

  const isCruise = currentT < 0.337;
  const isHuygensWindow = currentT >= 0.361 && currentT <= 0.42;
  const isGrandFinale = currentT >= RING_DIVE_T_START;
  const rDive = currentRingDive(currentT);

  const cyclePage = (dir: 1 | -1) => {
    const idx = PAGE_ORDER.indexOf(page);
    const next = (idx + dir + PAGE_ORDER.length) % PAGE_ORDER.length;
    setPage(PAGE_ORDER[next]!);
  };

  const bodyPageLabel = body ? body.displayName : activeTableau.label;

  return (
    <div
      className={styles.wrapper}
      data-position={activeComponent ? "right" : "left"}
      data-theme={activeComponent ? "default" : renderMode.toLowerCase()}
      role="region"
      aria-label="Mission information panel"
    >
      {/* Header */}
      <header className={styles.header}>
        <span className={styles.missionId}>
          {activeComponent ? "CAS-HUY / COMP" : "CAS-HUY / MISSION"}
        </span>
        <div className={styles.headerActions}>
          {activeComponent && (
            <button
              className={styles.closeBtn}
              onClick={() => setActiveComponent(null)}
              aria-label="Close panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1L13 13M1 13L13 1"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          )}
        </div>
      </header>

      {/* Scrolls when content exceeds the panel's capped height. */}
      <div className={styles.scrollBody} ref={scrollRef}>
      {activeComponent ? (
        /* Component detail view (RIGHT SIDE) */
        <>
          <div className={styles.detailHeader}>
            <h2 className={styles.detailName}>{activeComponent.name}</h2>
            <p className={styles.detailSub}>
              {activeComponent.id.toUpperCase()}
            </p>
          </div>

          <p className={styles.detailBody}>{activeComponent.description}</p>

          <div className={styles.sectionLabel}>Specifications</div>
          <div className={styles.statGrid}>
            {!activeComponent.stats[0] ||
            activeComponent.stats[0].label.toLowerCase().includes("mass") ? null : (
              <Stat label="Total mass" value={`${activeComponent.mass} kg`} />
            )}
            {activeComponent.stats.map((s, i) => (
              <Stat key={i} label={s.label} value={s.value} />
            ))}
          </div>
        </>
      ) : !body ? (
        /* No body content yet: single spacecraft page, no pagination */
        <SpacecraftSection
          state={state}
          velocityKms={velocityKms}
          distanceMkm={distanceMkm}
          lightDelaySec={lightDelaySec}
          isCruise={isCruise}
          isHuygensWindow={isHuygensWindow}
          isGrandFinale={isGrandFinale}
          rDive={rDive}
          tableauId={activeTableau.id}
          currentT={currentT}
        />
      ) : (
        <>
          <PageNav
            page={page}
            label={page === "body" ? bodyPageLabel : "SPACECRAFT"}
            onPrev={() => cyclePage(-1)}
            onNext={() => cyclePage(1)}
          />

          {page === "body" ? (
            <BodySection
              body={body}
              activeEvent={activeEvent}
              activeDateMs={tToDateMs(currentT)}
              missionDateLabel={missionDate(currentT, activeTableau.id)}
            />
          ) : (
            <SpacecraftSection
              state={state}
              velocityKms={velocityKms}
              distanceMkm={distanceMkm}
              lightDelaySec={lightDelaySec}
              isCruise={isCruise}
              isHuygensWindow={isHuygensWindow}
              isGrandFinale={isGrandFinale}
              rDive={rDive}
              tableauId={activeTableau.id}
              currentT={currentT}
            />
          )}
        </>
      )}
      </div>
    </div>
  );
}

// BODY section

function BodySection({
  body,
  activeEvent,
  activeDateMs,
  missionDateLabel,
}: {
  body: {
    displayName: string;
    hook: string;
    events: { dateMs: number; date: string; title: string }[];
  };
  activeEvent: { dateMs: number } | null;
  activeDateMs: number;
  missionDateLabel: string;
}) {
  const [start, end] = sliceEvents(body.events, activeDateMs);
  const visible = body.events.slice(start, end);
  return (
    <>
      <div className={styles.bodyHeader}>
        <span className={styles.phaseDate}>{missionDateLabel}</span>
      </div>
      <p className={styles.bodyHook}>{body.hook}</p>
      <div className={styles.sectionLabel}>Mission events</div>
      <ul className={styles.eventList}>
        {visible.map((e) => (
          <li
            key={e.dateMs}
            className={`${styles.eventRow}${
              activeEvent && activeEvent.dateMs === e.dateMs
                ? ` ${styles.eventActive}`
                : ""
            }`}
          >
            <span className={styles.eventDate}>{e.date}</span>
            <span className={styles.eventTitle}>{e.title}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

// SPACECRAFT section

function SpacecraftSection({
  state,
  velocityKms,
  distanceMkm,
  lightDelaySec,
  isCruise,
  isHuygensWindow,
  isGrandFinale,
  rDive,
  tableauId,
  currentT,
}: {
  state: ReturnType<typeof stateAt>;
  velocityKms: number;
  distanceMkm: number;
  lightDelaySec: number;
  isCruise: boolean;
  isHuygensWindow: boolean;
  isGrandFinale: boolean;
  rDive: number;
  tableauId: string;
  currentT: number;
}) {
  return (
    <>
      <div className={styles.sectionLabel}>Navigation</div>
      <div className={styles.statGrid}>
        <Stat label="Velocity" value={`${velocityKms.toFixed(1)} km/s`} />
        <Stat
          label="Earth distance"
          value={`${(distanceMkm / 1000).toFixed(2)} bn km`}
        />
        <Stat
          label="Light delay"
          value={`${(lightDelaySec / 60).toFixed(1)} min`}
        />
        {isGrandFinale && rDive > 0 && (
          <Stat label="Ring dive" value={`${rDive} / 22`} />
        )}
      </div>

      {isHuygensWindow && (
        <>
          <div className={styles.sectionLabel}>Huygens probe</div>
          <BarRow
            label="Signal link"
            value={state.effects.huygensSignal}
            precision={0}
          />
          <div className={styles.statGrid}>
            <Stat
              label="Link status"
              value={state.effects.huygensSignal > 0.01 ? "ACTIVE" : "LOST"}
            />
          </div>
        </>
      )}

      {!isCruise && !isHuygensWindow && (
        <>
          <div className={styles.sectionLabel}>Mission ops</div>
          <BarRow label="SOI burn" value={state.effects.soiBurn} />
          <BarRow
            label="Disintegr."
            value={state.effects.disintegration}
            precision={1}
            warn
          />
        </>
      )}

      {tableauId.startsWith("finale_") && <FinaleTelemetryBlock t={currentT} />}
    </>
  );
}
