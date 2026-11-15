const fs = require('fs');
const buf = fs.readFileSync('public/love_story.bin');
const count = buf.readUInt32LE(4);

let offset = 8 + count * 3 * 4 + count * 3 * 4;
const posTouch = new Float32Array(buf.buffer, buf.byteOffset + offset, count * 3);
offset += count * 3 * 4;
const partTypes = new Float32Array(buf.buffer, buf.byteOffset + offset, count);

const contact = [-0.0327, 1.5615, -0.0054];

function dist(p1, p2) {
  return Math.hypot(p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]);
}

// Group particles into regions
const regions = [
  { name: 'rose_petal_contact', filter: (pt, p) => pt === 0.0 && dist(p, contact) < 0.06 },
  { name: 'rose_petal_mid', filter: (pt, p) => pt === 0.0 && dist(p, contact) >= 0.06 && dist(p, contact) < 0.12 },
  { name: 'rose_petal_center', filter: (pt, p) => pt === 0.0 && dist(p, contact) >= 0.12 },
  { name: 'rose_sepal_stem_top', filter: (pt, p) => pt === 1.0 && p[1] > 1.35 },
  { name: 'rose_stem_mid', filter: (pt, p) => pt === 1.0 && p[1] <= 1.35 && p[1] > 1.25 },
  { name: 'rose_stem_bottom', filter: (pt, p) => pt === 1.0 && p[1] <= 1.25 },
  { name: 'man_hand_fingers', filter: (pt, p) => pt === 2.0 && p[0] > -0.15 },
  { name: 'man_hand_palm', filter: (pt, p) => pt === 2.0 && p[0] <= -0.15 },
  { name: 'man_arm_wrist', filter: (pt, p) => Math.abs(pt - 3.5) < 0.1 && p[0] > -0.32 },
  { name: 'man_arm_forearm', filter: (pt, p) => Math.abs(pt - 3.5) < 0.1 && p[0] <= -0.32 && p[0] > -0.50 },
  { name: 'man_arm_elbow', filter: (pt, p) => Math.abs(pt - 3.5) < 0.1 && p[0] <= -0.50 },
  { name: 'man_body_shoulder', filter: (pt, p) => Math.abs(pt - 3.0) < 0.1 && p[1] > 1.40 },
  { name: 'man_body_chest', filter: (pt, p) => Math.abs(pt - 3.0) < 0.1 && p[1] <= 1.40 && p[1] > 1.15 },
  { name: 'man_body_waist', filter: (pt, p) => Math.abs(pt - 3.0) < 0.1 && p[1] <= 1.15 && p[1] > 0.85 },
  { name: 'man_body_thigh', filter: (pt, p) => Math.abs(pt - 3.0) < 0.1 && p[1] <= 0.85 && p[1] > 0.50 },
  { name: 'man_body_knee_shin', filter: (pt, p) => Math.abs(pt - 3.0) < 0.1 && p[1] <= 0.50 },
  { name: 'woman_fingertip', filter: (pt, p) => Math.abs(pt - 4.5) < 0.1 && dist(p, contact) < 0.08 },
  { name: 'woman_hand_palm', filter: (pt, p) => Math.abs(pt - 4.5) < 0.1 && dist(p, contact) >= 0.08 && dist(p, contact) < 0.18 },
  { name: 'woman_wrist_forearm', filter: (pt, p) => Math.abs(pt - 4.5) < 0.1 && dist(p, contact) >= 0.18 && dist(p, contact) < 0.35 },
  { name: 'woman_elbow_upper_arm', filter: (pt, p) => Math.abs(pt - 4.5) < 0.1 && dist(p, contact) >= 0.35 },
  { name: 'woman_shoulder', filter: (pt, p) => Math.abs(pt - 4.0) < 0.1 && p[1] > 1.65 && p[0] < 0.65 },
  { name: 'woman_bodice', filter: (pt, p) => Math.abs(pt - 4.0) < 0.1 && p[1] <= 1.65 && p[1] > 1.35 },
  { name: 'woman_waist', filter: (pt, p) => Math.abs(pt - 4.0) < 0.1 && p[1] <= 1.35 && p[1] > 1.05 },
  { name: 'woman_gown_upper', filter: (pt, p) => Math.abs(pt - 4.0) < 0.1 && p[1] <= 1.05 && p[1] > 0.70 },
  { name: 'woman_gown_mid', filter: (pt, p) => Math.abs(pt - 4.0) < 0.1 && p[1] <= 0.70 && p[1] > 0.35 },
  { name: 'woman_gown_hem', filter: (pt, p) => Math.abs(pt - 4.0) < 0.1 && p[1] <= 0.35 },
];

const results = [];
for (const reg of regions) {
  let sum = [0, 0, 0];
  let c = 0;
  for (let i = 0; i < count; i++) {
    const pt = partTypes[i];
    const p = [posTouch[i * 3 + 0], posTouch[i * 3 + 1], posTouch[i * 3 + 2]];
    if (reg.filter(pt, p)) {
      sum[0] += p[0];
      sum[1] += p[1];
      sum[2] += p[2];
      c++;
    }
  }
  if (c > 0) {
    const center = [sum[0] / c, sum[1] / c, sum[2] / c];
    const d = dist(center, contact);
    results.push({ name: reg.name, count: c, center, d });
    console.log(`{ name: '${reg.name}', pos: [${center.map(v => v.toFixed(3)).join(', ')}], d: ${d.toFixed(2)} },`);
  }
}
