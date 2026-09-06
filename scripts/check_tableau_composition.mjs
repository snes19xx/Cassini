// PIA18322

const ASPECT = 16 / 9;
let FOV = 45;

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
function norm(a) {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
}

function makeCam(pos, lookAt) {
  const fwd = norm(sub(lookAt, pos));
  const right = norm(cross(fwd, [0, 1, 0]));
  const up = cross(right, fwd);
  return { pos, fwd, right, up };
}

function project(cam, p, label, radius = 0) {
  const v = sub(p, cam.pos);
  const z = dot(v, cam.fwd);
  const x = dot(v, cam.right);
  const y = dot(v, cam.up);
  const tanH = Math.tan((FOV * Math.PI) / 360);
  const ndcX = x / (z * tanH * ASPECT);
  const ndcY = y / (z * tanH);
  const sx = 50 + ndcX * 50;
  const sy = 50 - ndcY * 50;
  const dist = Math.hypot(...v);
  const rFrac = radius
    ? ((radius / (dist * tanH * ASPECT)) * 50).toFixed(1)
    : "";
  console.log(
    `  ${label.padEnd(22)} screen ${sx.toFixed(1).padStart(6)}% , ${sy
      .toFixed(1)
      .padStart(
        6,
      )}%  (z=${z.toFixed(0)}${radius ? `, radius ≈ ${rFrac}% of width` : ""})`,
  );
  return { sx, sy };
}

{
  FOV = 14;
  const cam = makeCam([0, 0, 2885], [0, 0, 0]);
  project(cam, [283, -66, -2515], "titan", 476);
  project(cam, [-160, 58, 285], "rhea", 78);
  project(cam, [-45, -96, 1585], "mimas", 13);

  console.log("\n  — dollied to 1600 (mid-zoom): trio splitting —");
  const mid = makeCam([0, 0, 1600], [0, 0, 0]);
  project(mid, [283, -66, -2515], "titan", 476);
  project(mid, [-160, 58, 285], "rhea", 78);
  project(mid, [-45, -96, 1585], "mimas (15 units ahead)", 13);

  console.log("\n  — dollied to minDist 500: Titan alone fills the frame —");
  const close = makeCam([0, 0, 500], [0, 0, 0]);
  project(close, [283, -66, -2515], "titan", 476);
  project(close, [-160, 58, 285], "rhea (off-frame)", 78);
  // mimas is 1,085 units BEHIND the camera here — gone entirely.
  FOV = 45;
}
