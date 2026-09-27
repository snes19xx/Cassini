"""Final Dives orbit rework prototype: orbitsim.py OUTDIR [ALPHA] [APO].

Scene frame: Saturn at origin r=180, +Y north, ring plane XZ, prograde X -> -Z.
"""
import os
import sys
import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Wedge

OUTDIR = sys.argv[1] if len(sys.argv) > 1 else "."
ALPHA = float(sys.argv[2]) if len(sys.argv) > 2 else 0.5
APO = float(sys.argv[3]) if len(sys.argv) > 3 else 1400.0

R_SAT = 180.0
KM = 60268.0 / R_SAT
RING_IN, RING_OUT = 222.5, 419.3
BANDS = [(74658, 92000, 0.10), (92000, 117580, 0.22), (122170, 136775, 0.16),
         (140000, 140400, 0.35)]

INC = np.radians(62.0)
PERI_LAT = np.radians(-6.0)
PERI_SWING = 445.0
# Real periapse is ~187; the 26-unit model needs clearance.
PERI_DIVE = 198.0
SWING_S, DIVE_S = 24.0, 42.0
# Dive sweeps apoapse -> periapse -> apoapse -> periapse.
DIVE_E0, DIVE_E1 = np.pi, 4 * np.pi

# SceneLighting's main key. Real periapses sat at local noon.
SUN = np.array([-400.0, 80.0, 200.0])
SUN_H = np.array([SUN[0], 0, SUN[2]]) / np.hypot(SUN[0], SUN[2])

Y = np.array([0.0, 1.0, 0.0])
# Argument of latitude u from the ascending node: sin(lat) = sin(i) sin(u).
OMEGA_ARG = np.pi + np.arcsin(np.sin(-PERI_LAT) / np.sin(INC))

# Periapse sits at u ~ 187 deg, so the node points anti-sun.
N = -SUN_H
C = np.cross(Y, N)
T = np.cos(INC) * C + np.sin(INC) * Y


def elem(ra, rp):
    return (ra + rp) / 2, (ra - rp) / (ra + rp)


def theta_of_E(E, e):
    return 2 * np.arctan2(np.sqrt(1 + e) * np.sin(E / 2), np.sqrt(1 - e) * np.cos(E / 2))


def E_of_theta(th, e):
    return 2 * np.arctan(np.sqrt((1 - e) / (1 + e)) * np.tan(th / 2))


def pos_new(E, a, e):
    u = theta_of_E(E, e) + OMEGA_ARG
    r = a * (1 - e * np.cos(E))
    return r[:, None] * (np.cos(u)[:, None] * N + np.sin(u)[:, None] * T)


def cumtrapz(x, y):
    return np.concatenate([[0], np.cumsum(0.5 * (y[1:] + y[:-1]) * np.diff(x))])


def proposed(apo, alpha):
    """Swing (north pass -> apoapse) and dive (apoapse -> 2 periapses) with times."""
    def weight(E, e):
        # dt/dE up to a rate constant. alpha 1 is Kepler, 0 is uniform in E.
        return (1 - e * np.cos(E)) ** alpha

    a1, e1 = elem(apo, PERI_SWING)
    a2, e2 = elem(apo, PERI_DIVE)

    Ed = np.linspace(DIVE_E0, DIVE_E1, 20000)
    c2 = DIVE_S / cumtrapz(Ed, weight(Ed, e2))[-1]
    t_dive = SWING_S + c2 * cumtrapz(Ed, weight(Ed, e2))
    v_handoff = a2 * np.sqrt(1 - e2**2) / (c2 * (1 + e2) ** alpha)

    # Rate ramps linearly in E so the swing's apoapse speed matches the dive's.
    Es = np.linspace(E_of_theta(np.pi / 2 - OMEGA_ARG, e1), np.pi, 20000)
    s = (Es - Es[0]) / (Es[-1] - Es[0])
    ws = weight(Es, e1)
    c_end = a1 * np.sqrt(1 - e1**2) / (v_handoff * (1 + e1) ** alpha)
    c_start = (SWING_S - c_end * cumtrapz(Es, s * ws)[-1]) / cumtrapz(Es, (1 - s) * ws)[-1]
    t_swing = cumtrapz(Es, (c_start + (c_end - c_start) * s) * ws)

    return dict(swing=pos_new(Es, a1, e1), t_swing=t_swing,
                dive=pos_new(Ed, a2, e2), t_dive=t_dive,
                e1=e1, e2=e2, c_start=c_start, c_end=c_end)


def solve_kepler(M, e):
    E = M.copy()
    for _ in range(12):
        E -= (E - e * np.sin(E) - M) / (1 - e * np.cos(E))
    return E


def pos_cur(M, ra, rp):
    a, e = elem(ra, rp)
    E = solve_kepler(M, e)
    th = theta_of_E(E, e)
    r = a * (1 - e * np.cos(E))
    inc = np.radians(85)
    u, v = r * np.sin(th), -r * np.cos(th)
    return np.stack([u, v * np.sin(inc), v * np.cos(inc)], 1)


def cur_swing_M(p):
    # Mirrors swingAroundTrajectory.ts, quadratic ease included.
    a, e = elem(700, 342)
    E0 = E_of_theta(np.pi / 2, e)
    M0, M1 = E0 - e * np.sin(E0), 3 * np.pi
    dMd = 3 * np.pi / (0.994677 - 0.978)
    e2c = (700 - 195) / (700 + 195)
    vf = np.sqrt(((1 - e2c) / (1 - e)) * ((1 + e) / (1 + e2c)) ** 3)
    A = dMd * vf * (0.978 - 0.963) / (M1 - M0) - 1
    return M0 + (M1 - M0) * (A * p * p + (1 - A) * p)


pc = np.linspace(0, 1, 20000)
CUR = dict(swing=pos_cur(cur_swing_M(pc), 700, 342), t_swing=pc * SWING_S,
           dive=pos_cur(np.pi + 3 * np.pi * pc, 700, 195), t_dive=SWING_S + pc * DIVE_S)


def near_time(P, t, rmax):
    m = np.linalg.norm(P, axis=1) < rmax
    return np.sum(np.diff(t)[m[:-1]])


def crossings(P, t):
    y = P[:, 1]
    idx = np.where(np.sign(y[:-1]) != np.sign(y[1:]))[0]
    return [(t[i], np.linalg.norm(P[i])) for i in idx]


def speed(P, t):
    return np.linalg.norm(np.diff(P, axis=0), axis=1) / np.diff(t)


def report(tag, o):
    for name in ("swing", "dive"):
        P, t = o[name], o["t_" + name]
        cr = ", ".join(f"{tt:.1f}s@r{rr:.0f}" for tt, rr in crossings(P, t))
        v = speed(P, t)
        print(f"  {tag} {name:5s} <2Rs {near_time(P, t, 2 * R_SAT):4.1f}s  "
              f"v {v.min():4.0f}-{v.max():4.0f} u/s  crossings: {cr}")


class Camera:
    def __init__(self, pos, target, fov_deg=45.0, aspect=16 / 9):
        self.pos = np.asarray(pos, float)
        self.f = np.asarray(target, float) - self.pos
        self.f /= np.linalg.norm(self.f)
        self.r = np.cross(self.f, Y)
        self.r /= np.linalg.norm(self.r)
        self.u = np.cross(self.r, self.f)
        self.k = 1 / np.tan(np.radians(fov_deg) / 2)
        self.aspect = aspect

    def __call__(self, P):
        d = np.atleast_2d(P) - self.pos
        z = d @ self.f
        return (d @ self.r) / z * self.k, (d @ self.u) / z * self.k

    def hidden(self, P):
        # Ray from camera to P hits the planet before reaching P.
        d = P - self.pos
        L = np.linalg.norm(d, axis=1)
        b = (d / L[:, None]) @ self.pos
        disc = b * b - (self.pos @ self.pos - R_SAT**2)
        t_hit = -b - np.sqrt(np.maximum(disc, 0))
        return (disc > 0) & (t_hit > 0) & (t_hit < L)

    def planet_radius(self):
        z = -self.pos @ self.f
        return R_SAT / np.sqrt(z * z - R_SAT**2) * self.k


def fit_camera(direction, target, paths, margin=0.9):
    # Back the camera off along `direction` until every path point is in frame.
    direction = direction / np.linalg.norm(direction)
    for dist in np.arange(1200, 12000, 50):
        cam = Camera(target + direction * dist, target)
        x, y = cam(np.vstack(paths))
        if np.all(np.abs(x) < margin * cam.aspect) and np.all(np.abs(y) < margin):
            return cam, dist
    return cam, dist


INK, INK2, MUTED, GRID = "#0b0b0b", "#52514e", "#a09f9a", "#ecebe8"
BG, PLANET = "#fcfcfb", "#e9e4d6"
COL_SWING, COL_DIVE, COL_CUR = "#2a78d6", "#eb6834", "#8a8984"
plt.rcParams.update({"font.size": 9, "text.color": INK, "axes.labelcolor": INK2,
                     "xtick.color": INK2, "ytick.color": INK2, "axes.edgecolor": MUTED})


def proj_top(P):
    # From +Y with screen-up = -Z, so prograde reads counter-clockwise.
    P = np.atleast_2d(P)
    return P[:, 0], -P[:, 2]


def proj_side(P):
    P = np.atleast_2d(P)
    return P @ N, P[:, 1]


def proj_end(P):
    P = np.atleast_2d(P)
    return P @ C, P[:, 1]


def saturn_flat(ax):
    ax.add_patch(Circle((0, 0), R_SAT, fc=PLANET, ec=MUTED, lw=0.8, zorder=2))
    for sgn in (-1, 1):
        ax.plot([sgn * RING_IN, sgn * RING_OUT], [0, 0], color=INK2, lw=2.2,
                solid_capstyle="butt", zorder=3)


def saturn_top(ax):
    for r0, r1, al in BANDS:
        ax.add_patch(Wedge((0, 0), r1 / KM, 0, 360, width=(r1 - r0) / KM,
                           fc=INK2, alpha=al, lw=0, zorder=1))
    ax.add_patch(Circle((0, 0), R_SAT, fc=PLANET, ec=MUTED, lw=0.8, zorder=2))


def saturn_cam(cam):
    def draw_it(ax):
        ph = np.linspace(0, 2 * np.pi, 400)
        for r0, r1, al in BANDS:
            for rr in np.linspace(r0 / KM, r1 / KM, 6):
                x, y = cam(np.stack([rr * np.cos(ph), 0 * ph, rr * np.sin(ph)], 1))
                ax.plot(x, y, color=INK2, alpha=al * 0.8, lw=1.0, zorder=1)
        cx, cy = cam(np.zeros(3))
        ax.add_patch(Circle((cx[0], cy[0]), cam.planet_radius(), fc=PLANET, ec=MUTED,
                            lw=0.8, zorder=2))
    return draw_it


def one_second_dots(ax, P, t, proj, col):
    k = np.searchsorted(t, np.arange(np.ceil(t[0]), t[-1], 1.0))
    x, y = proj(P[k[k < len(t)]])
    ax.plot(x, y, "o", ms=2.6, color=col, mec=BG, mew=0.5, zorder=5)


def style(ax, title, lim, ticks=True):
    ax.set_aspect("equal")
    ax.set_xlim(*lim[0])
    ax.set_ylim(*lim[1])
    ax.set_title(title, loc="left", fontsize=10, color=INK)
    ax.grid(color=GRID, lw=0.6, zorder=0)
    ax.set_axisbelow(True)
    if not ticks:
        ax.set_xticks([])
        ax.set_yticks([])


def draw(ax, o, proj, sat, title, lim, cam=None, cur=True, dots=True):
    sat(ax)
    if cur:
        for P in (CUR["swing"], CUR["dive"]):
            x, y = proj(P)
            ax.plot(x, y, "--", color=COL_CUR, lw=1.0, zorder=3)
    for name, col in (("swing", COL_SWING), ("dive", COL_DIVE)):
        P, t = o[name], o["t_" + name]
        x, y = proj(P)
        if cam is not None:
            hid = cam.hidden(P)
            ax.plot(np.where(hid, np.nan, x), y, color=col, lw=1.6, zorder=4)
            ax.plot(np.where(hid, x, np.nan), y, color=col, lw=0.8, alpha=0.35, zorder=1.5)
        else:
            ax.plot(x, y, color=col, lw=1.6, zorder=4)
        if dots:
            one_second_dots(ax, P, t, proj, col)
    style(ax, title, lim, ticks=cam is None)


def pacing(ax, o, apo):
    series = ((CUR, COL_CUR, "--", "current"),
              (o, COL_SWING, "-", "proposed SWING AROUND"),
              (o, COL_DIVE, "-", "proposed RING DIVE"))
    for src, col, ls, lab in series:
        names = ("swing", "dive") if src is CUR else (("swing",) if col == COL_SWING else ("dive",))
        for j, name in enumerate(names):
            P, t = src[name], src["t_" + name]
            ax.plot(t, np.linalg.norm(P, axis=1) / R_SAT, ls, color=col,
                    lw=1.6 if ls == "-" else 1.0, label=lab if j == 0 else None)
            for tt, rr in crossings(P, t):
                ax.plot(tt, rr / R_SAT, "|", ms=9, mew=1.4, color=col)
    ax.axhspan(RING_IN / R_SAT, RING_OUT / R_SAT, color=INK2, alpha=0.08, lw=0)
    ax.axhline(1, color=MUTED, lw=0.8)
    ax.axvline(SWING_S, color=MUTED, lw=0.8)
    ax.text(SWING_S + 0.4, apo / R_SAT * 1.03, "SWING AROUND → RING DIVE", color=INK2,
            fontsize=8, va="top")
    ax.text(0.4, (RING_IN + RING_OUT) / 2 / R_SAT, "visible rings", color=INK2, fontsize=8,
            va="center")
    ax.text(0.4, 1.0, "cloud tops", color=INK2, fontsize=8, va="bottom")
    ax.set_xlabel("wall-clock seconds at 1×   (ticks mark ring-plane crossings)")
    ax.set_ylabel("distance from Saturn centre (Rs)")
    ax.set_xlim(0, SWING_S + DIVE_S)
    ax.set_ylim(0, apo / R_SAT * 1.06)
    ax.grid(color=GRID, lw=0.6)
    ax.legend(frameon=False, loc="lower left", ncol=3, bbox_to_anchor=(0.0, 1.0))
    ax.set_title("PACING", loc="left", fontsize=10, pad=22)


def main_sheet(o, path):
    cam_now = Camera([1500, 700, 1500], [0, 0, 0])
    el = np.radians(22)
    target = N * (APO - PERI_SWING) * 0.33
    cam_new, dist = fit_camera(np.cos(el) * C + np.sin(el) * Y, target,
                               [o["swing"], o["dive"]])
    print(f"  proposed wide camera pos={cam_new.pos.round(0)} target={target.round(0)} dist={dist:.0f}")

    lim_wide = ((-700, APO + 250), (-(APO * 0.8), APO * 0.8))
    fig = plt.figure(figsize=(15, 24), facecolor=BG)
    gs = fig.add_gridspec(5, 2, height_ratios=[0.95, 0.95, 0.8, 0.8, 0.5],
                          hspace=0.2, wspace=0.1, top=0.975)

    ax = fig.add_subplot(gs[0, 0], facecolor=BG)
    draw(ax, o, proj_top, saturn_top, "TOP: looking down on the north pole", lim_wide)
    sx, sy = proj_top(SUN_H * (APO * 0.62))
    ax.annotate("", xy=(sx[0], sy[0]), xytext=(sx[0] * 0.72, sy[0] * 0.72),
                arrowprops=dict(arrowstyle="<-", color=INK2, lw=1))
    ax.text(sx[0], sy[0] + 25, "to Sun", color=INK2, ha="center", va="bottom")
    ax.plot(60, -90, "s", ms=5, mfc="none", mec=INK, zorder=6)
    ax.text(80, -110, "POLAR pose now", color=INK2, fontsize=8, va="top")
    x0, y0 = proj_top(o["swing"][0])
    ax.plot(x0, y0, "s", ms=5, color=COL_SWING, zorder=6)
    ax.text(x0[0] + 30, y0[0] + 30, "swing start\n(north pass)", color=INK2, fontsize=8)

    ax = fig.add_subplot(gs[0, 1], facecolor=BG)
    draw(ax, o, proj_side, saturn_flat, "SIDE: ring plane edge-on, broadside to the long axis",
         lim_wide)
    ax.text(lim_wide[0][0] + 20, lim_wide[1][1] - 20,
            "north up · periapse left (dayside) · apoapse right (nightside)",
            color=INK2, fontsize=8, va="top")

    ax = fig.add_subplot(gs[1, 0], facecolor=BG)
    draw(ax, o, proj_end, saturn_flat, "END-ON: looking down the long axis (the 62° tilt)",
         ((-800, 800), (-750, 750)))

    ax = fig.add_subplot(gs[1, 1], facecolor=BG)
    draw(ax, o, proj_side, saturn_flat, "SIDE close-up: the periapse passes vs the ring edge",
         ((-500, 280), (-390, 390)))
    ax.text(-490, 380, "dots = 1 s of wall-clock at 1×", color=INK2, fontsize=8, va="top")

    ax = fig.add_subplot(gs[2, :], facecolor=BG)
    draw(ax, o, cam_now, saturn_cam(cam_now),
         "WIDE CAMERA as it is now: [1500, 700, 1500] → origin, fov 45, 16:9",
         ((-16 / 9, 16 / 9), (-1, 1)), cam=cam_now)

    ax = fig.add_subplot(gs[3, :], facecolor=BG)
    p = cam_new.pos.round(0).astype(int)
    tg = target.round(0).astype(int)
    draw(ax, o, cam_new, saturn_cam(cam_new),
         f"WIDE CAMERA proposed: [{p[0]}, {p[1]}, {p[2]}] → [{tg[0]}, {tg[1]}, {tg[2]}], "
         "22° above the rings, looking across the orbit plane",
         ((-16 / 9, 16 / 9), (-1, 1)), cam=cam_new, cur=False)

    ax = fig.add_subplot(gs[4, :], facecolor=BG)
    pacing(ax, o, APO)

    fig.suptitle("Final Dives: current (grey dashed) vs proposed.   i = 62°, periapse 6°S at "
                 f"local noon, apoapse {APO:.0f} (real ≈ 3800), pacing α = {ALPHA}",
                 x=0.1, ha="left", y=0.995, fontsize=11)
    fig.savefig(path, dpi=100, facecolor=BG, bbox_inches="tight")


def variants_sheet(path, apos=(1100, 1400, 2000, 3800)):
    fig, axes = plt.subplots(2, len(apos), figsize=(4.2 * len(apos), 7.2), facecolor=BG,
                             gridspec_kw=dict(height_ratios=[1, 0.55], hspace=0.22, wspace=0.15))
    for j, apo in enumerate(apos):
        o = proposed(apo, ALPHA)
        per_pass = near_time(o["dive"], o["t_dive"], 2 * R_SAT) / 2
        ax = axes[0, j]
        ax.set_facecolor(BG)
        span = apo + 700
        draw(ax, o, proj_side, saturn_flat,
             f"apoapse {apo}   e_dive {o['e2']:.2f}   b/a {np.sqrt(1 - o['e2']**2):.2f}",
             ((-650, apo + 50), (-span * 0.55, span * 0.55)), cur=False, dots=False)
        ax.set_xticks([])
        ax.set_yticks([])
        ax = axes[1, j]
        ax.set_facecolor(BG)
        for name, col in (("swing", COL_SWING), ("dive", COL_DIVE)):
            ax.plot(o["t_" + name], np.linalg.norm(o[name], axis=1) / R_SAT, color=col, lw=1.4)
        ax.axhline(1, color=MUTED, lw=0.8)
        ax.set_ylim(0, 22)
        ax.set_xlim(0, SWING_S + DIVE_S)
        ax.grid(color=GRID, lw=0.6)
        ax.set_title(f"{per_pass:.1f} s inside 2 Rs per dive pass", loc="left", fontsize=9)
        if j == 0:
            ax.set_ylabel("distance (Rs)")
        ax.set_xlabel("seconds")
    fig.suptitle(f"How elliptical: side view (broadside, same as main sheet) at four apoapse "
                 f"distances, pacing α = {ALPHA}. 3800 is the real ratio.",
                 x=0.07, ha="left", fontsize=11)
    fig.savefig(path, dpi=100, facecolor=BG, bbox_inches="tight")


if __name__ == "__main__":
    o = proposed(APO, ALPHA)
    print(f"ALPHA={ALPHA} APO={APO} omega_arg={np.degrees(OMEGA_ARG):.1f}deg "
          f"e_swing={o['e1']:.3f} e_dive={o['e2']:.3f} b/a dive={np.sqrt(1 - o['e2']**2):.2f}")
    print(f"  swing start {o['swing'][0].round(0)} r={np.linalg.norm(o['swing'][0]):.0f} "
          f"rate {o['c_start']:.2f}->{o['c_end']:.2f}")
    print(f"  dive apoapse {o['dive'][0].round(0)}  dive end {o['dive'][-1].round(1)}")
    report("new", o)
    report("cur", CUR)
    main_sheet(o, os.path.join(OUTDIR, "final_dives_orbits.png"))
    variants_sheet(os.path.join(OUTDIR, "final_dives_apoapse_variants.png"))
    print("wrote", OUTDIR)
