import type { RenderMode } from "@/store/missionStore";
import { useMissionStore } from "@/store/missionStore";
import styles from "./SignalLost.module.css";

function eomTheme(s: {
  renderMode: RenderMode;
  _preTerminalRenderMode: RenderMode | null;
}): RenderMode {
  return s._preTerminalRenderMode ?? s.renderMode;
}

const STARFIELD = (() => {
  const rand = (seed: number) => {
    let s = seed >>> 0;
    return (a: number, b: number) => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return a + (s / 0xffffffff) * (b - a);
    };
  };
  const r = rand(0xca551_e01);
  return Array.from({ length: 220 }, (_, id) => {
    const radius = Math.pow(r(0, 1), 2.4) * 1.5 + 0.25;
    const t = r(0, 1);
    const tone: "neutral" | "warm" | "cool" =
      t > 0.9 ? "warm" : t > 0.78 ? "cool" : "neutral";
    return {
      id,
      cx: r(0, 1000),
      cy: r(0, 600),
      r: radius,
      o: r(0.25, 1),
      tone,
      twinkle: r(0, 1) > 0.72,
      delay: r(0, 4.5),
    };
  });
})();

const DECAY_ENVELOPE =
  "M0 34.0 L 10 37.9 L 20 41.6 L 30 45.2 L 40 48.5 L 50 51.7 L 60 54.8 " +
  "L 70 57.7 L 80 60.4 L 90 63.0 L 100 65.5 L 110 67.8 L 120 70.1 L 130 72.2 " +
  "L 140 74.2 L 150 76.2 L 160 78.0 L 170 79.7 L 180 81.4 L 190 82.9 L 200 84.4 " +
  "L 210 85.8 L 220 87.1 L 230 88.4 L 240 89.6 L 250 90.8 L 260 91.9 L 270 92.9 " +
  "L 280 93.9 L 290 94.8 L 300 95.7 L 310 96.5 L 320 97.3 L 330 98.0 L 340 98.8 " +
  "L 350 99.4 L 360 100.1 L 370 100.7 L 380 101.2 L 390 101.8 L 400 102.3 " +
  "L 410 102.8 L 420 103.3 L 430 103.7 L 440 104.1 L 450 104.5 L 460 104.9 " +
  "L 470 105.2 L 480 105.6 L 490 105.9 L 500 106.2 L 510 106.5 L 520 106.7 " +
  "L 530 107.0 L 540 107.2 L 550 107.4 L 560 107.7 L 570 107.9 L 580 108.1 " +
  "L 590 108.2 L 600 108.4 L 610 108.6 L 620 108.7 L 630 108.9 L 640 109.0 " +
  "L 650 109.2 L 660 109.3 L 670 109.5 L 680 109.6 L 690 109.8 L 700 110.0";

const DECAY_FILL =
  DECAY_ENVELOPE +
  " L 700 110.0 L 690 110.2 L 680 110.4 L 670 110.5 L 660 110.7 L 650 110.8 " +
  "L 640 111.0 L 630 111.1 L 620 111.3 L 610 111.4 L 600 111.6 L 590 111.8 " +
  "L 580 111.9 L 570 112.1 L 560 112.3 L 550 112.6 L 540 112.8 L 530 113.0 " +
  "L 520 113.3 L 510 113.5 L 500 113.8 L 490 114.1 L 480 114.4 L 470 114.8 " +
  "L 460 115.1 L 450 115.5 L 440 115.9 L 430 116.3 L 420 116.7 L 410 117.2 " +
  "L 400 117.7 L 390 118.2 L 380 118.8 L 370 119.3 L 360 119.9 L 350 120.6 " +
  "L 340 121.2 L 330 122.0 L 320 122.7 L 310 123.5 L 300 124.3 L 290 125.2 " +
  "L 280 126.1 L 270 127.1 L 260 128.1 L 250 129.2 L 240 130.4 L 230 131.6 " +
  "L 220 132.9 L 210 134.2 L 200 135.6 L 190 137.1 L 180 138.6 L 170 140.3 " +
  "L 160 142.0 L 150 143.8 L 140 145.8 L 130 147.8 L 120 149.9 L 110 152.2 " +
  "L 100 154.5 L 90 157.0 L 80 159.6 L 70 162.3 L 60 165.2 L 50 168.3 " +
  "L 40 171.5 L 30 174.8 L 20 178.4 L 10 182.1 L 0 186.0 Z";

const DECAY_STROKE =
  DECAY_ENVELOPE +
  " L 700 110.0 L 690 110.2 L 680 110.4 L 670 110.5 L 660 110.7 L 650 110.8 " +
  "L 640 111.0 L 630 111.1 L 620 111.3 L 610 111.4 L 600 111.6 L 590 111.8 " +
  "L 580 111.9 L 570 112.1 L 560 112.3 L 550 112.6 L 540 112.8 L 530 113.0 " +
  "L 520 113.3 L 510 113.5 L 500 113.8 L 490 114.1 L 480 114.4 L 470 114.8 " +
  "L 460 115.1 L 450 115.5 L 440 115.9 L 430 116.3 L 420 116.7 L 410 117.2 " +
  "L 400 117.7 L 390 118.2 L 380 118.8 L 370 119.3 L 360 119.9 L 350 120.6 " +
  "L 340 121.2 L 330 122.0 L 320 122.7 L 310 123.5 L 300 124.3 L 290 125.2 " +
  "L 280 126.1 L 270 127.1 L 260 128.1 L 250 129.2 L 240 130.4 L 230 131.6 " +
  "L 220 132.9 L 210 134.2 L 200 135.6 L 190 137.1 L 180 138.6 L 170 140.3 " +
  "L 160 142.0 L 150 143.8 L 140 145.8 L 130 147.8 L 120 149.9 L 110 152.2 " +
  "L 100 154.5 L 90 157.0 L 80 159.6 L 70 162.3 L 60 165.2 L 50 168.3 " +
  "L 40 171.5 L 30 174.8 L 20 178.4 L 10 182.1 L 0 186.0";

const NOISE_TAIL =
  "M700 110 L 736 110 L 748 108.8 L 764 111.2 L 782 109.4 " +
  "L 806 110.8 L 834 109.6 L 866 110.6 L 902 109.8 L 946 110.4 L 1000 110";

// End-of-mission overlay:
export function SignalLost() {
  const isSignalLost = useMissionStore((s) => s.currentT >= 1.0);
  const theme = useMissionStore(eomTheme);
  const reset = useMissionStore((s) => s.reset);

  const isEditorial = theme === "editorial";
  const isBlueprint = theme === "blueprint";
  const isSpace = !isEditorial && !isBlueprint;

  return (
    <div
      className={`${styles.overlay} ${isSignalLost ? styles.visible : ""}`}
      data-eom-theme={theme}
      aria-hidden={!isSignalLost}
    >
      <div className={styles.backdrop} aria-hidden>
        {isSpace && (
          <svg
            className={styles.starfield}
            viewBox="0 0 1000 600"
            preserveAspectRatio="xMidYMid slice"
          >
            {STARFIELD.map((s) => {
              const cls =
                s.tone === "warm"
                  ? styles.starWarm
                  : s.tone === "cool"
                    ? styles.starCool
                    : styles.star;
              return (
                <circle
                  key={s.id}
                  className={`${cls}${s.twinkle ? ` ${styles.starTwinkle}` : ""}`}
                  cx={s.cx.toFixed(1)}
                  cy={s.cy.toFixed(1)}
                  r={s.r.toFixed(2)}
                  opacity={s.o.toFixed(2)}
                  style={
                    s.twinkle
                      ? { animationDelay: `${s.delay.toFixed(2)}s` }
                      : undefined
                  }
                />
              );
            })}
          </svg>
        )}
      </div>

      <div className={styles.page}>
        <header className={styles.rail}>
          <div className={styles.wordmark}>CASSINI</div>
        </header>

        <main className={styles.main}>
          <div className={styles.fig}>
            <svg
              viewBox="0 0 1000 220"
              role="img"
              aria-label="Carrier signal amplitude decaying to the noise floor at loss of signal, 11:55:46 UTC"
            >
              <line
                x1="0"
                y1="110"
                x2="1000"
                y2="110"
                stroke="var(--eom-fg-faint)"
                strokeWidth="1"
              />
              <g className={styles.decay}>
                <path
                  d={DECAY_FILL}
                  fill="var(--eom-accent)"
                  fillOpacity="0.14"
                  stroke="none"
                />
                <path
                  d={DECAY_STROKE}
                  fill="none"
                  stroke="var(--eom-accent)"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
                <path
                  d={NOISE_TAIL}
                  fill="none"
                  stroke="var(--eom-fg-dim)"
                  strokeWidth="1"
                />
              </g>
              <g className={styles.marker}>
                <line
                  x1="700"
                  y1="16"
                  x2="700"
                  y2="204"
                  stroke="var(--eom-accent)"
                  strokeWidth="1"
                  strokeDasharray="2 5"
                />
                <circle cx="700" cy="110" r="2.6" fill="var(--eom-accent)" />
                <text
                  x="712"
                  y="24"
                  fontFamily="var(--font-mono)"
                  fontSize="11"
                  letterSpacing="1.8"
                  fill="var(--eom-accent)"
                >
                  11:55:46 UTC
                </text>
              </g>
            </svg>
          </div>

          <div className={styles.copy}>
            <div className={styles.eyebrow}>
              Loss of signal &middot; 15 September 2017
            </div>
            <h2 className={styles.title}>End of Mission</h2>
            <p className={styles.body}>
              Cassini entered Saturn&rsquo;s atmosphere transmitting to the last
              second. The final packet reached Earth eighty-three minutes after
              the spacecraft had already burned up.
            </p>
            <div className={styles.actions}>
              <button
                className={`${styles.btn} ${styles.btnSolid}`}
                type="button"
                onClick={reset}
                tabIndex={isSignalLost ? 0 : -1}
              >
                Restart mission
              </button>
              <a
                className={`${styles.btn} ${styles.btnGhost}`}
                href="https://github.com/snes19xx/Cassini"
                target="_blank"
                rel="noopener"
                tabIndex={isSignalLost ? 0 : -1}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.07-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.42 7.42 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A7.995 7.995 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
                </svg>
                View on GitHub
              </a>
            </div>
          </div>
        </main>

        <footer className={styles.foot}>
          References, credits and sources are also in the GitHub repository
        </footer>
      </div>
    </div>
  );
}
