import fs from 'fs';
import path from 'path';

// Deterministic PRNG (Mulberry32)
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261115);

const particles = [];

function addP(pRest, pTouch, partType, revealOrder, size, colorT) {
  particles.push({
    rest: pRest,
    touch: pTouch || pRest,
    partType, // 0: Rose, 1: Stem/Leaves, 2: Hand, 3: Man, 4: Girl, 5: Ambient
    revealOrder: Math.max(0, Math.min(1, revealOrder)),
    size: size || (1.05 + rand() * 0.65),
    colorT: colorT !== undefined ? colorT : rand(),
    random: rand()
  });
}

// Compute an orthonormal frame (N, B) perpendicular to tangent vector T
function getOrthoFrame(T) {
  const len = Math.hypot(T[0], T[1], T[2]) || 1;
  const tn = [T[0] / len, T[1] / len, T[2] / len];
  let up = [0, 1, 0];
  if (Math.abs(tn[1]) > 0.92) up = [0, 0, 1];
  
  // N = normalize(cross(tn, up))
  let nx = tn[1] * up[2] - tn[2] * up[1];
  let ny = tn[2] * up[0] - tn[0] * up[2];
  let nz = tn[0] * up[1] - tn[1] * up[0];
  const nLen = Math.hypot(nx, ny, nz) || 1;
  const n = [nx / nLen, ny / nLen, nz / nLen];
  
  // B = cross(tn, n)
  const bx = tn[1] * n[2] - tn[2] * n[1];
  const by = tn[2] * n[0] - tn[0] * n[2];
  const bz = tn[0] * n[1] - tn[1] * n[0];
  const b = [bx, by, bz];

  return { t: tn, n, b };
}

// True 3D Oriented Anatomical Segment with smooth muscle profile
function addAnatomicalSegment(p1Rest, p2Rest, p1Touch, p2Touch, r1, r2, count, partType, orderMin, orderMax, profileFn) {
  const dirRest = [p2Rest[0] - p1Rest[0], p2Rest[1] - p1Rest[1], p2Rest[2] - p1Rest[2]];
  const dirTouch = [p2Touch[0] - p1Touch[0], p2Touch[1] - p1Touch[1], p2Touch[2] - p1Touch[2]];
  const frameRest = getOrthoFrame(dirRest);
  const frameTouch = getOrthoFrame(dirTouch);

  for (let i = 0; i < count; i++) {
    const t = rand();
    const theta = rand() * Math.PI * 2.0;
    
    // Balanced surface rim and soft interior volume
    const isSurface = rand() > 0.40;
    const radFactor = isSurface ? (0.85 + 0.15 * rand()) : Math.sqrt(rand()) * 0.85;
    
    const baseR = r1 + (r2 - r1) * t;
    const muscleMod = profileFn ? profileFn(t) : 1.0;
    const currentR = baseR * muscleMod * radFactor;

    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);

    const dispRest = [
      (frameRest.n[0] * cosT + frameRest.b[0] * sinT) * currentR,
      (frameRest.n[1] * cosT + frameRest.b[1] * sinT) * currentR,
      (frameRest.n[2] * cosT + frameRest.b[2] * sinT) * currentR
    ];

    const dispTouch = [
      (frameTouch.n[0] * cosT + frameTouch.b[0] * sinT) * currentR,
      (frameTouch.n[1] * cosT + frameTouch.b[1] * sinT) * currentR,
      (frameTouch.n[2] * cosT + frameTouch.b[2] * sinT) * currentR
    ];

    const rest = [
      p1Rest[0] + dirRest[0] * t + dispRest[0],
      p1Rest[1] + dirRest[1] * t + dispRest[1],
      p1Rest[2] + dirRest[2] * t + dispRest[2]
    ];

    const touch = [
      p1Touch[0] + dirTouch[0] * t + dispTouch[0],
      p1Touch[1] + dirTouch[1] * t + dispTouch[1],
      p1Touch[2] + dirTouch[2] * t + dispTouch[2]
    ];

    const order = orderMin + t * (orderMax - orderMin) + (rand() - 0.5) * 0.015;
    addP(rest, touch, partType, order, 1.05 + rand() * 0.55, rand());
  }
}

// ----------------------------------------------------------------------------------
// 1. THE RED ROSE (partType = 0)
// True Blooming English Rose: Upright tight spiral center bud + cupped scalloped petals
// ----------------------------------------------------------------------------------
const roseRest = [0.0, 0.05, 0.0];
const roseTouch = [0.05, 0.05, 0.0]; // Moved slightly forward in offer pose

// Inner Spiral Bud: tight overlapping spiral swirling upward to a delicate tip
for (let i = 0; i < 1800; i++) {
  const theta = rand() * Math.PI * 16.0;
  const frac = theta / (Math.PI * 16.0); // 0 at center, 1 at outer spiral
  const r = 0.005 + frac * 0.055;
  // Bud rises in the center: peak at y=0.11, base at y=0.03
  const ry = 0.03 + (1.0 - Math.pow(frac, 1.2)) * 0.08 + (rand() - 0.5) * 0.01;
  const rx = Math.cos(theta) * r;
  const rz = Math.sin(theta) * r;

  const rest = [roseRest[0] + rx, roseRest[1] + ry, roseRest[2] + rz];
  const touch = [roseTouch[0] + rx, roseTouch[1] + ry, roseTouch[2] + rz];
  addP(rest, touch, 0, rand() * 0.12, 1.15 + rand() * 0.5, 0.05 + frac * 0.35);
}

// 4 Concentric Layers of Cupped, Upward-Opening Petals with Wavy Ruffled Margins
// In a true rose, petals cup UPWARD from base to rim!
const roseLayers = [
  { petals: 5, rIn: 0.035, rOut: 0.085, yBase: 0.02, yRim: 0.075, count: 1800, colorBase: 0.25 },
  { petals: 6, rIn: 0.065, rOut: 0.125, yBase: 0.01, yRim: 0.070, count: 2400, colorBase: 0.45 },
  { petals: 7, rIn: 0.095, rOut: 0.165, yBase: 0.00, yRim: 0.065, count: 2800, colorBase: 0.65 },
  { petals: 8, rIn: 0.125, rOut: 0.205, yBase: -0.01, yRim: 0.060, count: 3400, colorBase: 0.85 }
];

roseLayers.forEach((layer, lIdx) => {
  for (let i = 0; i < layer.count; i++) {
    const angle = rand() * Math.PI * 2.0;
    const u = Math.sqrt(rand()); // Radial progress from base to petal rim
    
    // Scalloped undulating petal rim
    const petalWave = Math.sin(angle * layer.petals);
    const rCurrent = (layer.rIn + u * (layer.rOut - layer.rIn)) * (1.0 + 0.10 * petalWave);
    
    // Real chalice cup curve: drops at base, rises upward along petal, curls slightly at rim
    const yCurve = layer.yBase + Math.sin(u * Math.PI * 0.65) * (layer.yRim - layer.yBase) + (u > 0.85 ? Math.cos((u - 0.85)/0.15 * Math.PI) * 0.006 : 0.0);
    
    const rx = Math.cos(angle) * rCurrent;
    const rz = Math.sin(angle) * rCurrent;
    const ry = yCurve + (rand() - 0.5) * 0.006;

    const rest = [roseRest[0] + rx, roseRest[1] + ry, roseRest[2] + rz];
    const touch = [roseTouch[0] + rx, roseTouch[1] + ry, roseTouch[2] + rz];
    
    const colorVal = Math.min(1.0, layer.colorBase + u * 0.25 + (rand() - 0.5) * 0.06);
    const order = 0.03 + lIdx * 0.024 + u * 0.035 + rand() * 0.015;
    addP(rest, touch, 0, order, 1.15 + rand() * 0.5, colorVal);
  }
});

// Delicate Calyx Sepals (pointed crimson/garnet sepals hugging base of flower)
for (let s = 0; s < 5; s++) {
  const baseAngle = (s / 5.0) * Math.PI * 2.0;
  for (let i = 0; i < 260; i++) {
    const t = rand();
    const angle = baseAngle + (rand() - 0.5) * 0.18;
    const r = 0.025 + t * 0.085;
    const sy = -0.01 - Math.pow(t, 1.4) * 0.045;
    const sx = Math.cos(angle) * r;
    const sz = Math.sin(angle) * r;

    const rest = [roseRest[0] + sx, roseRest[1] + sy, roseRest[2] + sz];
    const touch = [roseTouch[0] + sx, roseTouch[1] + sy, roseTouch[2] + sz];
    addP(rest, touch, 1, 0.13 + rand() * 0.03, 1.05, 0.35 + rand() * 0.3);
  }
}

// ----------------------------------------------------------------------------------
// 2. THE ROSE STEM & LEAVES (partType = 1)
// Organic curved stem with 2 realistic serrated rose leaves (Deep garnet/crimson, NO green)
// ----------------------------------------------------------------------------------
const stemTopRest = [roseRest[0], roseRest[1] - 0.01, roseRest[2]];
const stemBottomRest = [-0.08, -0.28, 0.02];
const stemTopTouch = [roseTouch[0], roseTouch[1] - 0.01, roseTouch[2]];
const stemBottomTouch = [-0.03, -0.22, 0.02];

for (let i = 0; i < 2200; i++) {
  const t = rand();
  // Natural gentle organic curve
  const curveX = Math.sin(t * Math.PI * 1.4) * 0.022;
  const theta = rand() * Math.PI * 2.0;
  const stemR = 0.013 * (1.0 - t * 0.20) * Math.sqrt(rand());

  const sx = (stemTopRest[0] + (stemBottomRest[0] - stemTopRest[0]) * t) + curveX + Math.cos(theta) * stemR;
  const sy = stemTopRest[1] + (stemBottomRest[1] - stemTopRest[1]) * t;
  const sz = (stemTopRest[2] + (stemBottomRest[2] - stemTopRest[2]) * t) + Math.sin(theta) * stemR;

  const sxTouch = (stemTopTouch[0] + (stemBottomTouch[0] - stemTopTouch[0]) * t) + curveX + Math.cos(theta) * stemR;
  const syTouch = stemTopTouch[1] + (stemBottomTouch[1] - stemTopTouch[1]) * t;
  const szTouch = (stemTopTouch[2] + (stemBottomTouch[2] - stemTopTouch[2]) * t) + Math.sin(theta) * stemR;

  addP([sx, sy, sz], [sxTouch, syTouch, szTouch], 1, 0.15 + t * 0.035, 1.08, 0.25 + rand() * 0.4);
}

// Rose Leaf 1 (branching left at t=0.35)
for (let i = 0; i < 480; i++) {
  const u = rand();
  const v = (rand() - 0.5) * 2.0;
  const leafLen = 0.075;
  const leafW = 0.038 * Math.sin(u * Math.PI);
  const lx = -0.03 - u * leafLen + (rand() - 0.5) * 0.005;
  const ly = -0.08 - u * 0.022 + v * leafW;
  const lz = 0.01 + v * leafW * 0.6;
  addP([lx, ly, lz], [lx + 0.05, ly + 0.01, lz], 1, 0.16 + rand() * 0.03, 1.05, 0.35 + rand() * 0.3);
}

// Rose Leaf 2 (branching right at t=0.6)
for (let i = 0; i < 420; i++) {
  const u = rand();
  const v = (rand() - 0.5) * 2.0;
  const leafLen = 0.065;
  const leafW = 0.034 * Math.sin(u * Math.PI);
  const lx = 0.01 + u * leafLen + (rand() - 0.5) * 0.005;
  const ly = -0.14 - u * 0.018 + v * leafW;
  const lz = 0.02 + v * leafW * 0.5;
  addP([lx, ly, lz], [lx + 0.05, ly + 0.01, lz], 1, 0.17 + rand() * 0.03, 1.05, 0.35 + rand() * 0.3);
}

// ----------------------------------------------------------------------------------
// 3. THE HAND WRAPPING THE STEM (partType = 2)
// Anatomical human hand: palm arch, wrist, 4 wrapped fingers around stem, opposing thumb
// ----------------------------------------------------------------------------------
const handRest = [-0.08, -0.22, 0.02];
const handTouch = [-0.03, -0.16, 0.02];

// Palm & Wrist
for (let i = 0; i < 1500; i++) {
  const u = rand();
  const v = rand();
  const px = -0.07 - u * 0.075 + (rand() - 0.5) * 0.012;
  const py = -0.17 - v * 0.095 + (rand() - 0.5) * 0.012;
  const pz = -0.01 + (u - 0.5) * 0.055 + (rand() - 0.5) * 0.012;

  const dxTouch = handTouch[0] - handRest[0];
  const dyTouch = handTouch[1] - handRest[1];
  addP([px, py, pz], [px + dxTouch, py + dyTouch, pz], 2, 0.20 + u * 0.05, 1.12, rand());
}

// 4 Curled Fingers Wrapping Around Stem
const fingers = [
  { yOffset: -0.18, r: 0.024, count: 520, order: 0.23 },
  { yOffset: -0.21, r: 0.023, count: 540, order: 0.25 },
  { yOffset: -0.24, r: 0.022, count: 500, order: 0.27 },
  { yOffset: -0.27, r: 0.020, count: 460, order: 0.29 }
];

fingers.forEach((finger) => {
  for (let i = 0; i < finger.count; i++) {
    const t = rand();
    const phi = -0.35 * Math.PI + t * 1.45 * Math.PI;
    const fx = -0.06 + Math.cos(phi) * finger.r;
    const fy = finger.yOffset + (rand() - 0.5) * 0.012;
    const fz = 0.01 + Math.sin(phi) * finger.r;

    const dxTouch = handTouch[0] - handRest[0];
    const dyTouch = handTouch[1] - handRest[1];
    addP([fx, fy, fz], [fx + dxTouch, fy + dyTouch, fz], 2, finger.order + rand() * 0.02, 1.1, rand());
  }
});

// Thumb Gripping Stem
for (let i = 0; i < 600; i++) {
  const t = rand();
  const tx = -0.065 + t * 0.040 + (rand() - 0.5) * 0.010;
  const ty = -0.23 + t * 0.050 + (rand() - 0.5) * 0.010;
  const tz = 0.025 - t * 0.014 + (rand() - 0.5) * 0.010;

  const dxTouch = handTouch[0] - handRest[0];
  const dyTouch = handTouch[1] - handRest[1];
  addP([tx, ty, tz], [tx + dxTouch, ty + dyTouch, tz], 2, 0.25 + rand() * 0.03, 1.12, rand());
}

// ----------------------------------------------------------------------------------
// 4. THE KNEELING PERSON (MAN) (partType = 3)
// Romantic proposal posture: elegant masculine head profile, styled hair locks,
// tailored suit jacket with lapels, natural spine forward lean, articulated arm,
// upright bent knee & kneeling rear leg with seamless joints
// ----------------------------------------------------------------------------------
const manHeadCenter = [-0.94, 0.28, 0.0];

// Head Cranium Oval Volume
for (let i = 0; i < 2400; i++) {
  const theta = rand() * Math.PI * 2.0;
  const phi = Math.acos(2.0 * rand() - 1.0);
  const rad = Math.cbrt(rand());
  const hx = manHeadCenter[0] + Math.sin(phi) * Math.cos(theta) * 0.11 * rad;
  const hy = manHeadCenter[1] + Math.cos(phi) * 0.13 * rad;
  const hz = manHeadCenter[2] + Math.sin(phi) * Math.sin(theta) * 0.09 * rad;
  addP([hx, hy, hz], [hx, hy, hz], 3, 0.32 + rand() * 0.05, 1.05 + rand() * 0.45, rand());
}

// Masculine Facial Profile facing right (+X toward girl)
for (let i = 0; i < 1100; i++) {
  const t = rand();
  const y = 0.39 - t * 0.24;
  let x = -0.83;
  if (t > 0.28 && t < 0.56) {
    x += 0.042 * Math.sin((t - 0.28) / 0.28 * Math.PI); // Nose bridge
  } else if (t >= 0.56 && t < 0.74) {
    x += 0.020 * Math.sin((t - 0.56) / 0.18 * Math.PI); // Lips
  } else if (t >= 0.74) {
    x += 0.035 * Math.sin((t - 0.74) / 0.26 * Math.PI); // Chin
  }
  const z = (rand() - 0.5) * 0.08;
  addP([x + (rand() - 0.5) * 0.010, y, z], [x + (rand() - 0.5) * 0.010, y, z], 3, 0.33 + rand() * 0.04, 1.1, rand());
}

// Styled Wavy Hair with loose locks
for (let i = 0; i < 2200; i++) {
  const theta = rand() * Math.PI * 2.0;
  const phi = rand() * Math.PI * 0.62;
  const rad = 0.115 + rand() * 0.035;
  const wave = Math.sin(theta * 6.0) * 0.012;
  const hx = manHeadCenter[0] + Math.sin(phi) * Math.cos(theta) * (rad + wave);
  const hy = manHeadCenter[1] + Math.cos(phi) * (rad * 1.18 + wave);
  const hz = manHeadCenter[2] + Math.sin(phi) * Math.sin(theta) * rad;
  if (hx < -0.85 || hy > 0.32) {
    addP([hx, hy, hz], [hx, hy, hz], 3, 0.34 + rand() * 0.05, 1.12, rand());
  }
}

// Slender Neck
addAnatomicalSegment(
  [-0.93, 0.17, 0.0], [-0.93, 0.05, 0.0],
  [-0.93, 0.17, 0.0], [-0.93, 0.05, 0.0],
  0.050, 0.058, 800, 3, 0.36, 0.40
);

// Fitted Suit Jacket with gentle spine arch (proportions refined: rx=0.10, rz=0.14)
const manTorsoTop = [-0.93, 0.05, 0.0];
const manWaist = [-0.94, -0.48, 0.0];
for (let i = 0; i < 4800; i++) {
  const t = rand(); // from shoulders down to waist
  const angle = rand() * Math.PI * 2.0;
  
  // Natural spine forward lean
  const spineArch = 0.03 * Math.sin(t * Math.PI);
  const rx = (0.11 - t * 0.025) * (0.8 + 0.2 * Math.sqrt(rand()));
  const rz = (0.15 - t * 0.030) * (0.8 + 0.2 * Math.sqrt(rand()));
  
  const tx = manTorsoTop[0] + (manWaist[0] - manTorsoTop[0]) * t + spineArch + Math.cos(angle) * rx;
  const ty = manTorsoTop[1] + (manWaist[1] - manTorsoTop[1]) * t;
  const tz = manTorsoTop[2] + Math.sin(angle) * rz;
  
  // Jacket lapel line accents
  const isLapel = Math.abs(tz) < 0.035 && tx > (manTorsoTop[0] + 0.05);
  addP([tx, ty, tz], [tx, ty, tz], 3, 0.38 + t * 0.08 + rand() * 0.02, isLapel ? 1.25 : 1.05, rand());
}

// Left Arm (Resting on left knee):
const manLShoulder = [-0.94, 0.02, -0.15];
const manLElbow = [-0.72, -0.32, -0.19];
const manLHand = [-0.46, -0.74, -0.11];

addAnatomicalSegment(
  manLShoulder, manLElbow, manLShoulder, manLElbow,
  0.055, 0.046, 1200, 3, 0.42, 0.46,
  (t) => 1.0 + 0.14 * Math.sin(t * Math.PI)
);
addAnatomicalSegment(
  manLElbow, manLHand, manLElbow, manLHand,
  0.046, 0.036, 1100, 3, 0.46, 0.50,
  (t) => 1.0 + 0.12 * Math.sin(t * Math.PI)
);
// Hand softly resting on knee
for (let i = 0; i < 450; i++) {
  const hx = manLHand[0] + (rand() - 0.5) * 0.06;
  const hy = manLHand[1] + (rand() - 0.5) * 0.035;
  const hz = manLHand[2] + (rand() - 0.5) * 0.045;
  addP([hx, hy, hz], [hx, hy, hz], 3, 0.49 + rand() * 0.02, 1.1, rand());
}

// Right Arm (The Offering Arm Holding the Rose):
const manRShoulder = [-0.80, 0.02, 0.12];

const manRElbowRest = [-0.52, -0.22, 0.10];
const manRWristRest = [-0.17, -0.22, 0.03];

const manRElbowTouch = [-0.38, -0.14, 0.08];
const manRWristTouch = [-0.08, -0.15, 0.03];

addAnatomicalSegment(
  manRShoulder, manRElbowRest, manRShoulder, manRElbowTouch,
  0.056, 0.048, 1400, 3, 0.28, 0.33,
  (t) => 1.0 + 0.15 * Math.sin(t * Math.PI)
);
addAnatomicalSegment(
  manRElbowRest, manRWristRest, manRElbowTouch, manRWristTouch,
  0.048, 0.038, 1350, 3, 0.31, 0.36,
  (t) => 1.0 + 0.12 * Math.sin(t * Math.PI)
);

// Kneeling Leg (Right Leg bent back along floor):
const manRHip = [-0.94, -0.50, 0.08];
const manRKnee = [-0.98, -1.45, 0.08];
const manRAnkle = [-1.38, -1.46, 0.08];
const manRToe = [-1.48, -1.50, 0.08];

addAnatomicalSegment(
  manRHip, manRKnee, manRHip, manRKnee,
  0.090, 0.072, 2400, 3, 0.48, 0.53,
  (t) => 1.0 + 0.16 * Math.sin(t * Math.PI)
);
addAnatomicalSegment(
  manRKnee, manRAnkle, manRKnee, manRAnkle,
  0.072, 0.055, 1800, 3, 0.52, 0.56,
  (t) => 1.0 + 0.12 * Math.sin(t * Math.PI)
);
// Flexed dress shoe (toes tucked on floor, heel raised)
for (let i = 0; i < 800; i++) {
  const t = rand();
  const sx = manRAnkle[0] + (manRToe[0] - manRAnkle[0]) * t + (rand() - 0.5) * 0.030;
  const sy = -1.45 - t * 0.05 + (rand() - 0.5) * 0.022;
  const sz = manRAnkle[2] + (rand() - 0.5) * 0.040;
  addP([sx, sy, sz], [sx, sy, sz], 3, 0.55 + rand() * 0.03, 1.12, rand());
}

// Upright Bent Leg (Left Leg — knee up at 90 degrees):
const manLHip = [-0.90, -0.50, -0.08];
const manLKnee = [-0.46, -0.84, -0.10];
const manLAnkle = [-0.46, -1.45, -0.10];
const manLToe = [-0.22, -1.48, -0.10];

addAnatomicalSegment(
  manLHip, manLKnee, manLHip, manLKnee,
  0.090, 0.072, 2300, 3, 0.46, 0.51,
  (t) => 1.0 + 0.16 * Math.sin(t * Math.PI)
);
addAnatomicalSegment(
  manLKnee, manLAnkle, manLKnee, manLAnkle,
  0.072, 0.055, 2000, 3, 0.50, 0.54,
  (t) => 1.0 + 0.14 * Math.sin(t * Math.PI)
);
// Left dress shoe planted flat on floor
for (let i = 0; i < 850; i++) {
  const t = rand();
  const sx = manLAnkle[0] + (manLToe[0] - manLAnkle[0]) * t + (rand() - 0.5) * 0.030;
  const sy = -1.46 - rand() * 0.040;
  const sz = manLAnkle[2] + (rand() - 0.5) * 0.040;
  addP([sx, sy, sz], [sx, sy, sz], 3, 0.53 + rand() * 0.03, 1.15, rand());
}

// ----------------------------------------------------------------------------------
// 5. THE STANDING GIRL (partType = 4)
// Feminine silhouette: delicate facial profile facing left (-X), cascading hair waves,
// slender neck & shoulders, fitted bodice, sweeping A-line ballgown with ripples,
// and graceful articulated reaching arm whose delicate fingertips touch the rose petal!
// ----------------------------------------------------------------------------------
const girlHeadCenter = [0.92, 0.58, 0.0];

// Head Cranium Volume
for (let i = 0; i < 2200; i++) {
  const theta = rand() * Math.PI * 2.0;
  const phi = Math.acos(2.0 * rand() - 1.0);
  const rad = Math.cbrt(rand());
  const hx = girlHeadCenter[0] + Math.sin(phi) * Math.cos(theta) * 0.10 * rad;
  const hy = girlHeadCenter[1] + Math.cos(phi) * 0.13 * rad;
  const hz = girlHeadCenter[2] + Math.sin(phi) * Math.sin(theta) * 0.09 * rad;
  addP([hx, hy, hz], [hx, hy, hz], 4, 0.60 + rand() * 0.05, 1.05 + rand() * 0.45, rand());
}

// Delicate Feminine Facial Profile facing left (-X towards proposer)
for (let i = 0; i < 1200; i++) {
  const t = rand();
  const y = 0.68 - t * 0.23;
  let x = 0.82;
  if (t > 0.26 && t < 0.55) {
    x -= 0.038 * Math.sin((t - 0.26) / 0.29 * Math.PI); // Nose
  } else if (t >= 0.55 && t < 0.75) {
    x -= 0.020 * Math.sin((t - 0.55) / 0.20 * Math.PI); // Lips
  } else if (t >= 0.75) {
    x -= 0.024 * Math.sin((t - 0.75) / 0.25 * Math.PI); // Chin
  }
  const z = (rand() - 0.5) * 0.075;
  addP([x + (rand() - 0.5) * 0.009, y, z], [x + (rand() - 0.5) * 0.009, y, z], 4, 0.61 + rand() * 0.04, 1.08, rand());
}

// Cascading Romantic Wavy Hair
for (let i = 0; i < 3400; i++) {
  const t = rand();
  const wave = Math.sin(t * 8.0) * 0.030 + Math.cos(t * 14.0) * 0.010;
  const hx = 0.94 + t * 0.08 + wave + (rand() - 0.5) * 0.032;
  const hy = 0.62 - t * 0.65 + (rand() - 0.5) * 0.022;
  const hz = (rand() - 0.5) * 0.16;
  addP([hx, hy, hz], [hx, hy, hz], 4, 0.62 + t * 0.08 + rand() * 0.03, 1.05 + rand() * 0.45, rand());
}

// Slender Graceful Neck
addAnatomicalSegment(
  [0.91, 0.45, 0.0], [0.91, 0.30, 0.0],
  [0.91, 0.45, 0.0], [0.91, 0.30, 0.0],
  0.040, 0.048, 800, 4, 0.64, 0.68
);

// Fitted Bodice & Waist
const girlShoulders = [0.91, 0.30, 0.0];
const girlWaist = [0.92, -0.05, 0.0];
for (let i = 0; i < 4000; i++) {
  const t = rand();
  const angle = rand() * Math.PI * 2.0;
  const rx = (0.125 - t * 0.035) * (0.8 + 0.2 * Math.sqrt(rand()));
  const rz = (0.145 - t * 0.040) * (0.8 + 0.2 * Math.sqrt(rand()));
  const bx = girlShoulders[0] + (girlWaist[0] - girlShoulders[0]) * t + Math.cos(angle) * rx;
  const by = girlShoulders[1] + (girlWaist[1] - girlShoulders[1]) * t;
  const bz = girlShoulders[2] + Math.sin(angle) * rz;
  addP([bx, by, bz], [bx, by, bz], 4, 0.66 + t * 0.07 + rand() * 0.03, 1.12, rand());
}

// Sweeping A-Line Ballgown with 12 rippling folds pooling on floor
for (let i = 0; i < 10500; i++) {
  const t = rand();
  const angle = rand() * Math.PI * 2.0;
  const baseR = 0.09 + Math.pow(t, 1.15) * 0.38;
  const ripples = 1.0 + 0.16 * Math.sin(angle * 12.0 + t * 3.0) + 0.08 * Math.cos(angle * 6.0);
  const r = baseR * ripples * (0.85 + 0.15 * Math.sqrt(rand()));
  
  const gx = 0.92 + Math.cos(angle) * r * 0.95;
  const gy = -0.05 - t * 1.45;
  const gz = Math.sin(angle) * r;
  
  addP([gx, gy, gz], [gx, gy, gz], 4, 0.68 + t * 0.16 + rand() * 0.04, 1.15 + rand() * 0.5, rand());
}

// Left Arm (Relaxed at side)
const girlLShoulder = [0.91, 0.30, -0.13];
const girlLElbow = [0.93, 0.04, -0.15];
const girlLHand = [0.91, -0.24, -0.12];

addAnatomicalSegment(
  girlLShoulder, girlLElbow, girlLShoulder, girlLElbow,
  0.040, 0.036, 1000, 4, 0.70, 0.75,
  (t) => 1.0 + 0.12 * Math.sin(t * Math.PI)
);
addAnatomicalSegment(
  girlLElbow, girlLHand, girlLElbow, girlLHand,
  0.036, 0.028, 950, 4, 0.74, 0.78,
  (t) => 1.0 + 0.10 * Math.sin(t * Math.PI)
);
for (let i = 0; i < 400; i++) {
  const hx = girlLHand[0] + (rand() - 0.5) * 0.04;
  const hy = girlLHand[1] + (rand() - 0.5) * 0.045;
  const hz = girlLHand[2] + (rand() - 0.5) * 0.04;
  addP([hx, hy, hz], [hx, hy, hz], 4, 0.77 + rand() * 0.03, 1.08, rand());
}

// Right Arm (The Reaching Arm — Graceful articulation to touch rose):
const girlRShoulder = [0.85, 0.30, 0.12];

const girlRElbowRest = [0.88, 0.06, 0.12];
const girlRWristRest = [0.85, -0.18, 0.10];
const girlRFingersRest = [0.83, -0.28, 0.08];

// In Touch Pose: Fingertip precisely meets outer petal of the rose:
// Rose in touch pose is at [0.05, 0.05, 0.0], outer rim petal at [0.24, 0.07, 0.0]
const touchContactPoint = [0.24, 0.07, 0.0];
const girlRWristTouch = [0.40, 0.12, 0.03];
const girlRElbowTouch = [0.66, 0.18, 0.08];

addAnatomicalSegment(
  girlRShoulder, girlRElbowRest, girlRShoulder, girlRElbowTouch,
  0.044, 0.038, 1400, 4, 0.70, 0.76,
  (t) => 1.0 + 0.14 * Math.sin(t * Math.PI)
);
addAnatomicalSegment(
  girlRElbowRest, girlRWristRest, girlRElbowTouch, girlRWristTouch,
  0.038, 0.030, 1350, 4, 0.74, 0.80,
  (t) => 1.0 + 0.12 * Math.sin(t * Math.PI)
);
// Tapered delicate feminine hand & fingertips touching rose
addAnatomicalSegment(
  girlRWristRest, girlRFingersRest, girlRWristTouch, touchContactPoint,
  0.030, 0.012, 1250, 4, 0.78, 0.84,
  (t) => 1.0 - t * 0.40
);

// Graceful shoes peeking beneath gown hem
for (let i = 0; i < 550; i++) {
  const fx = 0.90 + (rand() - 0.5) * 0.075;
  const fy = -1.52 + (rand() - 0.5) * 0.02;
  const fz = (rand() - 0.5) * 0.075;
  addP([fx, fy, fz], [fx, fy, fz], 4, 0.82 + rand() * 0.03, 1.1, rand());
}

// ----------------------------------------------------------------------------------
// 6. AMBIENT DRIFTING STARDUST & AURA PARTICLES (partType = 5)
// ----------------------------------------------------------------------------------
for (let i = 0; i < 2400; i++) {
  const theta = rand() * Math.PI * 2.0;
  const rad = 0.35 + rand() * 2.2;
  const ax = Math.cos(theta) * rad * 1.15;
  const ay = -0.35 + Math.sin(theta) * rad * 0.85;
  const az = (rand() - 0.5) * 1.5;
  addP([ax, ay, az], [ax, ay, az], 5, rand() * 0.85, 0.7 + rand() * 0.6, rand());
}

console.log(`Total sculpted anatomical particles: ${particles.length}`);

// Pack into binary Float32Array format
const count = particles.length;
const posInitial = new Float32Array(count * 3);
const posRest = new Float32Array(count * 3);
const posTouch = new Float32Array(count * 3);
const partTypes = new Float32Array(count);
const revealOrders = new Float32Array(count);
const sizes = new Float32Array(count);
const colorTs = new Float32Array(count);
const randomSeeds = new Float32Array(count);

particles.forEach((p, i) => {
  const i3 = i * 3;
  const radiusInit = 2.0 + rand() * 4.0;
  const thetaInit = rand() * Math.PI * 2.0;
  const phiInit = (rand() - 0.5) * Math.PI;
  posInitial[i3] = Math.cos(phiInit) * Math.cos(thetaInit) * radiusInit;
  posInitial[i3 + 1] = Math.sin(phiInit) * radiusInit;
  posInitial[i3 + 2] = Math.cos(phiInit) * Math.sin(thetaInit) * radiusInit * 0.7;

  posRest[i3] = p.rest[0];
  posRest[i3 + 1] = p.rest[1];
  posRest[i3 + 2] = p.rest[2];

  posTouch[i3] = p.touch[0];
  posTouch[i3 + 1] = p.touch[1];
  posTouch[i3 + 2] = p.touch[2];

  partTypes[i] = p.partType;
  revealOrders[i] = p.revealOrder;
  sizes[i] = p.size;
  colorTs[i] = p.colorT;
  randomSeeds[i] = p.random;
});

const totalBytes = 8 + count * 4 * (3 + 3 + 3 + 1 + 1 + 1 + 1 + 1);
const buffer = Buffer.alloc(totalBytes);

buffer.write('LOVE', 0, 4, 'ascii');
buffer.writeUInt32LE(count, 4);

let offset = 8;
const writeFloatArray = (f32Arr) => {
  const byteLen = f32Arr.length * 4;
  Buffer.from(f32Arr.buffer).copy(buffer, offset, 0, byteLen);
  offset += byteLen;
};

writeFloatArray(posInitial);
writeFloatArray(posRest);
writeFloatArray(posTouch);
writeFloatArray(partTypes);
writeFloatArray(revealOrders);
writeFloatArray(sizes);
writeFloatArray(colorTs);
writeFloatArray(randomSeeds);

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}
const outPath = path.join(outDir, 'love_story.bin');
fs.writeFileSync(outPath, buffer);

console.log(`Generated high-fidelity organic binary dataset: ${outPath} (${(totalBytes / (1024 * 1024)).toFixed(2)} MB, ${count} particles)`);
