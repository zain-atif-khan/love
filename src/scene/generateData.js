import fs from 'fs';

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}
const rand = mulberry32(1001);

const particles = [];

function addP(pRest, pTouch, partType, revealOrder, size, colorT) {
  particles.push({
    rest: pRest,
    touch: pTouch || pRest,
    partType, // 0: Rose, 1: Hand, 2: Man, 3: Girl, 4: Ambient
    revealOrder,
    size: size || (1.0 + rand() * 0.8),
    colorT: colorT !== undefined ? colorT : rand(),
    random: rand()
  });
}

// ----------------------------------------------------------------------
// 1. THE RED ROSE (partType = 0)
// Center at (0.0, 0.0, 0.0) in rest pose; moves slightly forward in touch pose
// ----------------------------------------------------------------------
const roseOffsetRest = [0.0, 0.0, 0.0];
const roseOffsetTouch = [0.06, 0.02, 0.0]; // Rose offered slightly forward towards girl

// Core spiral
for (let i = 0; i < 700; i++) {
  const theta = rand() * Math.PI * 8.0;
  const r = 0.005 + (theta / (Math.PI * 8.0)) * 0.06;
  const h = (theta / (Math.PI * 8.0)) * 0.08 - 0.03;
  const rx = Math.cos(theta) * r;
  const rz = Math.sin(theta) * r;
  const ry = h + (rand() - 0.5) * 0.01;
  
  const rest = [roseOffsetRest[0] + rx, roseOffsetRest[1] + ry, roseOffsetRest[2] + rz];
  const touch = [roseOffsetTouch[0] + rx, roseOffsetTouch[1] + ry, roseOffsetTouch[2] + rz];
  // Deep ruby red in center, bright crimson at edges
  const colorT = 0.1 + (r / 0.06) * 0.4;
  addP(rest, touch, 0, rand() * 0.15, 1.2 + rand() * 0.6, colorT);
}

// Layered petals (4 rings: inner, mid-inner, mid-outer, outer)
const petalLayers = [
  { count: 700, petals: 5, radius: 0.09, height: 0.02, cup: 0.04, colorT: 0.3 },
  { count: 900, petals: 6, radius: 0.13, height: 0.00, cup: 0.06, colorT: 0.45 },
  { count: 1100, petals: 7, radius: 0.17, height: -0.02, cup: 0.08, colorT: 0.65 },
  { count: 1200, petals: 8, radius: 0.21, height: -0.04, cup: 0.09, colorT: 0.85 }
];

petalLayers.forEach(layer => {
  for (let i = 0; i < layer.count; i++) {
    const angle = rand() * Math.PI * 2.0;
    // Petal wave
    const wave = Math.sin(angle * layer.petals);
    const r = layer.radius * (0.8 + 0.25 * wave) * (0.5 + 0.5 * Math.sqrt(rand()));
    const rx = Math.cos(angle) * r;
    const rz = Math.sin(angle) * r;
    // Cup curve: edge curls upward/outward
    const cupZ = Math.pow(r / layer.radius, 2.0) * layer.cup;
    const ry = layer.height + cupZ + (rand() - 0.5) * 0.012;

    const rest = [roseOffsetRest[0] + rx, roseOffsetRest[1] + ry, roseOffsetRest[2] + rz];
    const touch = [roseOffsetTouch[0] + rx, roseOffsetTouch[1] + ry, roseOffsetTouch[2] + rz];
    addP(rest, touch, 0, 0.02 + rand() * 0.16, 1.1 + rand() * 0.7, layer.colorT + (rand() - 0.5) * 0.15);
  }
});

// Rose Sepals & Stem
for (let i = 0; i < 900; i++) {
  const t = rand();
  const y = -0.04 - t * 0.36; // Descends through the man's hand
  const angle = rand() * Math.PI * 2.0;
  const r = 0.012 * (1.0 - t * 0.2); // Stem radius
  const rx = Math.cos(angle) * r;
  const rz = Math.sin(angle) * r;

  const rest = [roseOffsetRest[0] + rx, roseOffsetRest[1] + y, roseOffsetRest[2] + rz];
  const touch = [roseOffsetTouch[0] + rx, roseOffsetTouch[1] + y, roseOffsetTouch[2] + rz];
  addP(rest, touch, 0, 0.14 + rand() * 0.06, 1.0 + rand() * 0.5, 0.95);
}

// ----------------------------------------------------------------------
// 2. THE HAND HOLDING THE STEM (partType = 1)
// Wraps around the stem from y = -0.18 to -0.32
// ----------------------------------------------------------------------
const handOffsetRest = [-0.01, -0.22, 0.0];
const handOffsetTouch = [0.05, -0.20, 0.0];

// Fingers wrapping around stem (4 fingers: index, middle, ring, pinky)
const fingers = [
  { y: -0.19, r: 0.026, count: 320 },
  { y: -0.22, r: 0.027, count: 350 },
  { y: -0.25, r: 0.026, count: 330 },
  { y: -0.28, r: 0.024, count: 300 }
];

fingers.forEach((finger, fIdx) => {
  for (let i = 0; i < finger.count; i++) {
    // Wrap around stem from behind (theta ~ -0.4pi) to front (theta ~ 1.2pi)
    const arc = -0.4 * Math.PI + rand() * 1.6 * Math.PI;
    const r = finger.r + (rand() - 0.5) * 0.008;
    const fx = Math.cos(arc) * r;
    const fz = Math.sin(arc) * r;
    const fy = finger.y + (rand() - 0.5) * 0.018;

    const rest = [handOffsetRest[0] + fx, handOffsetRest[1] + fy, handOffsetRest[2] + fz];
    const touch = [handOffsetTouch[0] + fx, handOffsetTouch[1] + fy, handOffsetTouch[2] + fz];
    addP(rest, touch, 1, 0.20 + (fIdx / 4.0) * 0.08 + rand() * 0.04, 1.2 + rand() * 0.5, rand());
  }
});

// Thumb resting along the stem
for (let i = 0; i < 350; i++) {
  const t = rand();
  const tx = -0.015 - t * 0.025;
  const ty = -0.20 + t * 0.04;
  const tz = 0.022 - t * 0.015 + (rand() - 0.5) * 0.01;
  const rest = [handOffsetRest[0] + tx, handOffsetRest[1] + ty, handOffsetRest[2] + tz];
  const touch = [handOffsetTouch[0] + tx, handOffsetTouch[1] + ty, handOffsetTouch[2] + tz];
  addP(rest, touch, 1, 0.24 + rand() * 0.06, 1.1 + rand() * 0.6, rand());
}

// Palm and wrist volume
for (let i = 0; i < 700; i++) {
  const u = rand();
  const v = rand();
  const px = -0.03 - u * 0.06 + (rand() - 0.5) * 0.015;
  const py = -0.20 - v * 0.09 + (rand() - 0.5) * 0.015;
  const pz = -0.01 + (u - 0.5) * 0.04 + (rand() - 0.5) * 0.015;
  const rest = [handOffsetRest[0] + px, handOffsetRest[1] + py, handOffsetRest[2] + pz];
  const touch = [handOffsetTouch[0] + px, handOffsetTouch[1] + py, handOffsetTouch[2] + pz];
  addP(rest, touch, 1, 0.28 + rand() * 0.06, 1.1 + rand() * 0.6, rand());
}

// ----------------------------------------------------------------------
// 3. THE KNEELING PERSON (MAN) (partType = 2)
// In genuine romantic proposal posture on left side
// ----------------------------------------------------------------------
// Head & Hair
for (let i = 0; i < 1500; i++) {
  const phi = rand() * Math.PI;
  const theta = rand() * Math.PI * 2.0;
  const rad = 0.12 * Math.cbrt(rand());
  let hx = -0.85 + Math.sin(phi) * Math.cos(theta) * rad * 0.95;
  let hy = 0.22 + Math.cos(phi) * rad * 1.15;
  let hz = Math.sin(phi) * Math.sin(theta) * rad * 0.95;
  
  // Define facial profile facing right (+X)
  if (hx > -0.78 && hy < 0.28 && hy > 0.14) {
    hx += 0.03 * Math.sin((hy - 0.14) / 0.14 * Math.PI); // Nose bridge & lips profile
  }
  // Hair contour on crown and back
  if (hy > 0.26 || hx < -0.88) {
    hy += 0.015 * rand();
    hx -= 0.015 * rand();
  }
  const pos = [hx, hy, hz];
  addP(pos, pos, 2, 0.35 + rand() * 0.08, 1.1 + rand() * 0.5, rand());
}

// Neck
for (let i = 0; i < 350; i++) {
  const t = rand();
  const angle = rand() * Math.PI * 2.0;
  const r = 0.045 * Math.sqrt(rand());
  const nx = -0.84 + Math.cos(angle) * r;
  const ny = 0.12 - t * 0.10;
  const nz = Math.sin(angle) * r;
  const pos = [nx, ny, nz];
  addP(pos, pos, 2, 0.38 + rand() * 0.05, 1.1, rand());
}

// Torso / Suit Jacket
for (let i = 0; i < 2800; i++) {
  const t = rand(); // 0 at shoulders (y ~ 0.02), 1 at waist (y ~ -0.55)
  const angle = rand() * Math.PI * 2.0;
  // Torso tapers slightly from shoulders to waist
  const widthX = 0.14 - t * 0.03;
  const widthZ = 0.14 - t * 0.03;
  // Forward proposal inclination (~10 degrees towards girl)
  const leanX = -0.84 + t * 0.05;
  const tx = leanX + Math.cos(angle) * widthX * Math.sqrt(rand());
  const ty = 0.02 - t * 0.57;
  const tz = Math.sin(angle) * widthZ * Math.sqrt(rand());
  const pos = [tx, ty, tz];
  addP(pos, pos, 2, 0.40 + t * 0.10 + rand() * 0.05, 1.2, rand());
}

// Left Arm (resting on left thigh)
for (let i = 0; i < 900; i++) {
  const t = rand();
  // Shoulder (-0.86, 0.0, -0.14) -> Elbow (-0.68, -0.32, -0.16) -> Hand (-0.46, -0.85, -0.10)
  let ax, ay, az;
  if (t < 0.5) {
    const f = t / 0.5;
    ax = -0.86 + f * 0.18;
    ay = 0.0 - f * 0.32;
    az = -0.14 - f * 0.02;
  } else {
    const f = (t - 0.5) / 0.5;
    ax = -0.68 + f * 0.22;
    ay = -0.32 - f * 0.53;
    az = -0.16 + f * 0.06;
  }
  const jitter = (rand() - 0.5) * 0.035;
  const pos = [ax + jitter, ay + jitter, az + jitter];
  addP(pos, pos, 2, 0.44 + rand() * 0.07, 1.1, rand());
}

// Right Arm (Holding the Rose - Animated between Rest and Touch)
for (let i = 0; i < 1100; i++) {
  const t = rand();
  // Rest pose: Shoulder (-0.74, 0.0, 0.12) -> Elbow (-0.44, -0.18, 0.10) -> Hand (-0.10, -0.24, 0.0)
  let rx, ry, rz;
  if (t < 0.5) {
    const f = t / 0.5;
    rx = -0.74 + f * 0.30;
    ry = 0.0 - f * 0.18;
    rz = 0.12 - f * 0.02;
  } else {
    const f = (t - 0.5) / 0.5;
    rx = -0.44 + f * 0.34;
    ry = -0.18 - f * 0.06;
    rz = 0.10 - f * 0.10;
  }

  // Touch pose: Shoulder (-0.74, 0.0, 0.12) -> Elbow (-0.38, -0.09, 0.08) -> Hand (-0.03, -0.11, 0.0)
  let tx, ty, tz;
  if (t < 0.5) {
    const f = t / 0.5;
    tx = -0.74 + f * 0.36;
    ty = 0.0 - f * 0.09;
    tz = 0.12 - f * 0.04;
  } else {
    const f = (t - 0.5) / 0.5;
    tx = -0.38 + f * 0.35;
    ty = -0.09 - f * 0.02;
    tz = 0.08 - f * 0.08;
  }

  const jx = (rand() - 0.5) * 0.035;
  const jy = (rand() - 0.5) * 0.035;
  const jz = (rand() - 0.5) * 0.035;

  const rest = [rx + jx, ry + jy, rz + jz];
  const touch = [tx + jx, ty + jy, tz + jz];
  addP(rest, touch, 2, 0.32 + t * 0.10 + rand() * 0.04, 1.2, rand());
}

// Kneeling Leg (Right Leg: Hip -> Knee on Ground -> Shin along ground -> Foot flexed)
for (let i = 0; i < 2400; i++) {
  const t = rand();
  let lx, ly, lz;
  if (t < 0.5) {
    // Thigh: Hip (-0.88, -0.58, 0.06) -> Grounded Knee (-0.96, -1.48, 0.06)
    const f = t / 0.5;
    lx = -0.88 - f * 0.08;
    ly = -0.58 - f * 0.90;
    lz = 0.06;
  } else if (t < 0.85) {
    // Shin along ground: Knee (-0.96, -1.48, 0.06) -> Ankle (-1.35, -1.49, 0.06)
    const f = (t - 0.5) / 0.35;
    lx = -0.96 - f * 0.39;
    ly = -1.48 - f * 0.01;
    lz = 0.06;
  } else {
    // Foot flexed on toes: Ankle (-1.35, -1.49, 0.06) -> Toes (-1.46, -1.50, 0.06)
    const f = (t - 0.85) / 0.15;
    lx = -1.35 - f * 0.11;
    ly = -1.49 - f * 0.01;
    lz = 0.06;
  }
  const jx = (rand() - 0.5) * 0.055;
  const jy = (rand() - 0.5) * 0.055;
  const jz = (rand() - 0.5) * 0.055;
  const pos = [lx + jx, ly + jy, lz + jz];
  addP(pos, pos, 2, 0.48 + t * 0.10 + rand() * 0.05, 1.2, rand());
}

// Upright Bent Leg (Left Leg: Hip -> Horizontal Thigh to Knee -> Vertical Shin -> Flat Foot)
for (let i = 0; i < 2200; i++) {
  const t = rand();
  let lx, ly, lz;
  if (t < 0.45) {
    // Thigh forward: Hip (-0.84, -0.58, -0.06) -> Front Knee (-0.44, -0.92, -0.08)
    const f = t / 0.45;
    lx = -0.84 + f * 0.40;
    ly = -0.58 - f * 0.34;
    lz = -0.06 - f * 0.02;
  } else if (t < 0.85) {
    // Shin down: Front Knee (-0.44, -0.92, -0.08) -> Ankle (-0.44, -1.51, -0.08)
    const f = (t - 0.45) / 0.40;
    lx = -0.44;
    ly = -0.92 - f * 0.59;
    lz = -0.08;
  } else {
    // Foot flat on ground: Ankle (-0.44, -1.51, -0.08) -> Shoe tip (-0.24, -1.52, -0.08)
    const f = (t - 0.85) / 0.15;
    lx = -0.44 + f * 0.20;
    ly = -1.51 - f * 0.01;
    lz = -0.08;
  }
  const jx = (rand() - 0.5) * 0.055;
  const jy = (rand() - 0.5) * 0.055;
  const jz = (rand() - 0.5) * 0.055;
  const pos = [lx + jx, ly + jy, lz + jz];
  addP(pos, pos, 2, 0.46 + t * 0.12 + rand() * 0.05, 1.2, rand());
}

// ----------------------------------------------------------------------
// 4. THE STANDING GIRL (partType = 3)
// Standing gracefully in front of kneeling person on right side
// ----------------------------------------------------------------------
// Head & Facial Profile (facing left -X)
for (let i = 0; i < 1600; i++) {
  const phi = rand() * Math.PI;
  const theta = rand() * Math.PI * 2.0;
  const rad = 0.11 * Math.cbrt(rand());
  let gx = 0.92 + Math.sin(phi) * Math.cos(theta) * rad * 0.90;
  let gy = 0.54 + Math.cos(phi) * rad * 1.15;
  let gz = Math.sin(phi) * Math.sin(theta) * rad * 0.90;
  
  // Delicate facial profile facing left (-X) towards the man
  if (gx < 0.86 && gy < 0.58 && gy > 0.46) {
    gx -= 0.025 * Math.sin((gy - 0.46) / 0.12 * Math.PI); // Forehead, gentle nose, lips, chin
  }
  const pos = [gx, gy, gz];
  addP(pos, pos, 3, 0.60 + rand() * 0.08, 1.1 + rand() * 0.5, rand());
}

// Long Flowing Romantic Hair (flowing down back and over shoulders to y ~ 0.05)
for (let i = 0; i < 1800; i++) {
  const t = rand();
  const wave = Math.sin(t * 8.0) * 0.02;
  const hx = 0.96 + t * 0.06 + wave + (rand() - 0.5) * 0.04;
  const hy = 0.58 - t * 0.52 + (rand() - 0.5) * 0.02;
  const hz = (rand() - 0.5) * 0.16 + (rand() - 0.5) * 0.02;
  const pos = [hx, hy, hz];
  addP(pos, pos, 3, 0.62 + t * 0.08 + rand() * 0.04, 1.0 + rand() * 0.6, rand());
}

// Slender Neck & Shoulders
for (let i = 0; i < 600; i++) {
  const t = rand();
  const angle = rand() * Math.PI * 2.0;
  const r = 0.04 * Math.sqrt(rand());
  const nx = 0.91 + Math.cos(angle) * r;
  const ny = 0.44 - t * 0.14;
  const nz = Math.sin(angle) * r * 1.2;
  const pos = [nx, ny, nz];
  addP(pos, pos, 3, 0.64 + rand() * 0.06, 1.1, rand());
}

// Feminine Bodice / Torso (shoulders at y ~ 0.30 down to waist at y ~ -0.05)
for (let i = 0; i < 2200; i++) {
  const t = rand();
  const angle = rand() * Math.PI * 2.0;
  const widthX = 0.11 - t * 0.025;
  const widthZ = 0.13 - t * 0.035;
  const bx = 0.92 + Math.cos(angle) * widthX * Math.sqrt(rand());
  const by = 0.30 - t * 0.35;
  const bz = Math.sin(angle) * widthZ * Math.sqrt(rand());
  const pos = [bx, by, bz];
  addP(pos, pos, 3, 0.66 + t * 0.08 + rand() * 0.04, 1.15, rand());
}

// Flowing Gown / Dress (from waist y ~ -0.05 down to hem y ~ -1.54)
for (let i = 0; i < 5200; i++) {
  const t = rand(); // 0 at waist, 1 at ground
  const angle = rand() * Math.PI * 2.0;
  // A-line flare: radius expands from 0.12 at waist to 0.38 at hem
  const baseR = 0.11 + t * 0.27;
  // Flowing undulating folds
  const folds = 1.0 + 0.12 * Math.sin(angle * 7.0 + t * 3.0) + 0.06 * Math.cos(angle * 12.0);
  const r = baseR * folds * (0.85 + 0.15 * Math.sqrt(rand()));
  const dx = 0.93 + Math.cos(angle) * r * 0.92;
  const dy = -0.05 - t * 1.49;
  const dz = Math.sin(angle) * r;
  const pos = [dx, dy, dz];
  addP(pos, pos, 3, 0.68 + t * 0.16 + rand() * 0.05, 1.1 + rand() * 0.5, rand());
}

// Left Arm (relaxed at side of gown)
for (let i = 0; i < 800; i++) {
  const t = rand();
  const ax = 0.93 + (rand() - 0.5) * 0.03;
  const ay = 0.28 - t * 0.55 + (rand() - 0.5) * 0.02;
  const az = -0.13 - t * 0.02 + (rand() - 0.5) * 0.03;
  const pos = [ax, ay, az];
  addP(pos, pos, 3, 0.70 + rand() * 0.08, 1.1, rand());
}

// Right Arm (The Reaching Arm — transforms from relaxed rest to reaching/touching rose)
for (let i = 0; i < 1600; i++) {
  const t = rand();
  // Rest pose: Shoulder (0.86, 0.28, 0.10) -> Elbow (0.88, 0.05, 0.10) -> Hand (0.84, -0.22, 0.08)
  let rx, ry, rz;
  if (t < 0.45) {
    const f = t / 0.45;
    rx = 0.86 + f * 0.02;
    ry = 0.28 - f * 0.23;
    rz = 0.10;
  } else {
    const f = (t - 0.45) / 0.55;
    rx = 0.88 - f * 0.04;
    ry = 0.05 - f * 0.27;
    rz = 0.10 - f * 0.02;
  }

  // Touch pose:
  // Shoulder (0.84, 0.28, 0.10) -> Elbow (0.54, 0.15, 0.06) -> Wrist (0.24, 0.06, 0.02) -> Fingertips (0.07, 0.01, 0.0) touching rose petals!
  let tx, ty, tz;
  if (t < 0.4) {
    const f = t / 0.4;
    tx = 0.84 - f * 0.30;
    ty = 0.28 - f * 0.13;
    tz = 0.10 - f * 0.04;
  } else if (t < 0.8) {
    const f = (t - 0.4) / 0.4;
    tx = 0.54 - f * 0.30;
    ty = 0.15 - f * 0.09;
    tz = 0.06 - f * 0.04;
  } else {
    // Delicate hand & fingertips reaching right to the rose petals!
    const f = (t - 0.8) / 0.2;
    tx = 0.24 - f * 0.17;
    ty = 0.06 - f * 0.05;
    tz = 0.02 - f * 0.02;
  }

  const jx = (rand() - 0.5) * 0.03;
  const jy = (rand() - 0.5) * 0.03;
  const jz = (rand() - 0.5) * 0.03;

  const rest = [rx + jx, ry + jy, rz + jz];
  const touch = [tx + jx, ty + jy, tz + jz];
  addP(rest, touch, 3, 0.72 + t * 0.12 + rand() * 0.04, 1.2, rand());
}

// Feet beneath gown hem
for (let i = 0; i < 300; i++) {
  const fx = 0.91 + (rand() - 0.5) * 0.08;
  const fy = -1.54 + (rand() - 0.5) * 0.02;
  const fz = (rand() - 0.5) * 0.08;
  const pos = [fx, fy, fz];
  addP(pos, pos, 3, 0.82 + rand() * 0.04, 1.0, rand());
}

// ----------------------------------------------------------------------
// 5. AMBIENT DRIFTING STARDUST (partType = 4)
// Subtle romantic particles floating around the scene
// ----------------------------------------------------------------------
for (let i = 0; i < 1100; i++) {
  const theta = rand() * Math.PI * 2.0;
  const rad = 0.3 + rand() * 1.8;
  const ax = Math.cos(theta) * rad * 1.1;
  const ay = -0.3 + Math.sin(theta) * rad * 0.8;
  const az = (rand() - 0.5) * 1.2;
  const pos = [ax, ay, az];
  addP(pos, pos, 4, rand() * 0.85, 0.8 + rand() * 0.6, rand());
}

console.log('Total love story particles generated:', particles.length);

// ----------------------------------------------------------------------
// Pack binary data
// ----------------------------------------------------------------------
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
  // Initial: Wide 3D cosmic scattering
  const radiusInit = 1.8 + rand() * 3.2;
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

// Binary structure:
// uint32 count
// posInitial (count * 3 * float32)
// posRest (count * 3 * float32)
// posTouch (count * 3 * float32)
// partTypes (count * float32)
// revealOrders (count * float32)
// sizes (count * float32)
// colorTs (count * float32)
// randomSeeds (count * float32)

const totalFloats = count * (3 + 3 + 3 + 1 + 1 + 1 + 1 + 1); // 14 floats per particle
const totalBytes = 4 + totalFloats * 4;
const buffer = Buffer.alloc(totalBytes);

let offset = 0;
buffer.writeUInt32LE(count, offset);
offset += 4;

function writeFloats(arr) {
  for (let i = 0; i < arr.length; i++) {
    buffer.writeFloatLE(arr[i], offset);
    offset += 4;
  }
}

writeFloats(posInitial);
writeFloats(posRest);
writeFloats(posTouch);
writeFloats(partTypes);
writeFloats(revealOrders);
writeFloats(sizes);
writeFloats(colorTs);
writeFloats(randomSeeds);

if (!fs.existsSync('public')) fs.mkdirSync('public');
fs.writeFileSync('public/love_story.bin', buffer);
console.log('Successfully written public/love_story.bin. Total count:', count, 'Size:', (buffer.length / 1024 / 1024).toFixed(2), 'MB');
