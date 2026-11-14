export const loveStoryVertexShader = /* glsl */ `
uniform float uTime;
uniform float uRevealProgress;
uniform float uOfferProgress;
uniform float uManOfferProgress;
uniform float uWomanReachProgress;
uniform float uDissolveProgress;
uniform float uFreeze;
uniform float uAlpha;
uniform float uPixelRatio;

attribute vec3 aPositionInitial;
attribute vec3 aPositionRest;
attribute vec3 aPositionTouch;
attribute float aPartType;    // 0: Rose, 1: Stem, 2: Hand, 3.0: Man Body, 3.5: Man Arm, 4.0: Woman Gown/Body, 4.5: Woman Arm, 5: Ambient
attribute float aRevealOrder; // 0.0 to 1.0
attribute float aSize;
attribute float aColorT;
attribute float aRandom;

varying float vPartType;
varying float vColorT;
varying float vRandom;
varying float vAlpha;

// Simplex Noise 3D
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

vec3 curlNoise(vec3 p) {
  const float e = 0.08;
  float n1 = snoise(vec3(p.x, p.y + e, p.z));
  float n2 = snoise(vec3(p.x, p.y - e, p.z));
  float n3 = snoise(vec3(p.x, p.y, p.z + e));
  float n4 = snoise(vec3(p.x, p.y, p.z - e));
  float n5 = snoise(vec3(p.x + e, p.y, p.z));
  float n6 = snoise(vec3(p.x - e, p.y, p.z));
  float x = (n3 - n4) - (n1 - n2);
  float y = (n5 - n6) - (n3 - n4);
  float z = (n1 - n2) - (n5 - n6);
  return normalize(vec3(x, y, z));
}

void main() {
  vPartType = aPartType;
  vColorT = aColorT;
  vRandom = aRandom;

  float effectiveTime = (uFreeze > 0.5) ? 0.0 : uTime;

  // 1. Calculate Target Pose based on Offering/Touching Progress
  vec3 targetPose = aPositionTouch;
  if (aPartType <= 2.5 || abs(aPartType - 3.5) < 0.2) {
    // Rose blossom (0), stem (1), hand (2), or man arm (3.5)
    float p = max(uOfferProgress, uManOfferProgress);
    targetPose = mix(aPositionRest, aPositionTouch, smoothstep(0.0, 1.0, p));
  } else if (abs(aPartType - 4.5) < 0.2) {
    // Woman reaching arm & hand (4.5)
    float p = max(uOfferProgress, uWomanReachProgress);
    targetPose = mix(aPositionRest, aPositionTouch, smoothstep(0.0, 1.0, p));
  }

  // 2. Calculate Sequential Materialization (From cosmic scatter to target pose)
  float revealDelta = uRevealProgress - aRevealOrder;
  float formProgress = smoothstep(0.0, 0.08, revealDelta);

  // If particle has not begun forming yet, keep it unformed
  vec3 pos = mix(aPositionInitial, targetPose, formProgress);

  // Add organic swirl turbulence during materialization
  if (formProgress < 0.99 && formProgress > 0.01) {
    vec3 curl = curlNoise(pos * 1.1 + vec3(effectiveTime * 0.15, aRandom * 2.0, 0.0));
    pos += curl * ((1.0 - formProgress) * 0.28);
  }

  // Particle Opacity
  float particleAlpha = formProgress;

  // 3. Subtle Living Breathing Harmonic Motion (when fully formed and not frozen)
  if (formProgress >= 0.99 && uFreeze < 0.5 && uDissolveProgress < 0.01) {
    vec2 breath = vec2(
      sin(effectiveTime * 1.2 + targetPose.y * 2.5),
      cos(effectiveTime * 1.4 + targetPose.x * 2.5)
    ) * 0.0025;
    pos.xy += breath;
  }

  // 4. Scene Seven: Dissolution into thousands of floating particles
  if (uDissolveProgress > 0.001) {
    vec3 curl = curlNoise(pos * 0.85 + vec3(effectiveTime * 0.2, aRandom * 4.0, effectiveTime * 0.1));
    float dist = pow(uDissolveProgress, 1.5);
    pos += curl * (dist * 3.2);
    pos.y += pow(uDissolveProgress, 1.3) * 0.6; // Gentle romantic upward drift
    pos.z += (aRandom - 0.5) * pow(uDissolveProgress, 1.2) * 2.0;

    // Fade out as dissolve progresses
    particleAlpha *= (1.0 - smoothstep(0.15, 0.95, uDissolveProgress));
  }

  vAlpha = particleAlpha;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Particle Point Sizing with subtle twinkle
  float twinkle = (uFreeze > 0.5) ? 1.0 : (1.0 + 0.25 * sin(effectiveTime * 3.8 + aRandom * 6.28318));
  float baseScale = (aPartType < 0.5) ? 1.55 : 1.10; // Rose blossom slightly crisper
  float pSize = aSize * baseScale * uPixelRatio * twinkle * (7.0 / -mvPosition.z);
  gl_PointSize = clamp(pSize, 1.0, 3.2);
}
`;

export const loveStoryFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uFreeze;
uniform float uAlpha;
uniform float uDissolveProgress;

varying float vPartType;
varying float vColorT;
varying float vRandom;
varying float vAlpha;

void main() {
  if (vAlpha <= 0.005) discard;

  // Anti-aliased circular disc
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float core = smoothstep(0.5, 0.08, dist);

  float effectiveTime = (uFreeze > 0.5) ? 0.0 : uTime;
  float twinkle = (uFreeze > 0.5) ? 1.0 : (0.82 + 0.32 * sin(effectiveTime * 4.2 + vRandom * 6.28318));

  vec3 color;

  if (vPartType < 0.5) {
    // -------------------------------------------------------------
    // THE RED ROSE BLOSSOM (partType = 0)
    // Deep romantic crimson velvet core, rich ruby, soft rose petal tips
    // Keeps G and B restricted so additive blending never turns into solid white
    // -------------------------------------------------------------
    vec3 velvetCrimson = vec3(0.96, 0.01, 0.04);
    vec3 brightRuby     = vec3(1.00, 0.04, 0.12);
    vec3 petalGlow     = vec3(1.00, 0.10, 0.22);

    if (vColorT < 0.55) {
      color = mix(velvetCrimson, brightRuby, vColorT / 0.55);
    } else {
      color = mix(brightRuby, petalGlow, (vColorT - 0.55) / 0.45);
    }
  } else if (vPartType < 1.5) {
    // -------------------------------------------------------------
    // THE ROSE STEM, THORNS & LEAVES (partType = 1)
    // Deep garnet, dark wine red, burgundy, subtle rose highlights (NO GREEN)
    // -------------------------------------------------------------
    vec3 deepGarnet = vec3(0.45, 0.02, 0.07);
    vec3 wineRed    = vec3(0.68, 0.04, 0.14);
    vec3 stemAccent = vec3(0.85, 0.22, 0.38);
    color = mix(deepGarnet, wineRed, vColorT);
    if (vRandom > 0.75) {
      color = mix(color, stemAccent, 0.4);
    }
  } else if (vPartType < 2.5) {
    // -------------------------------------------------------------
    // THE HAND WRAPPING THE STEM (partType = 2)
    // Soft blush pink with warm white highlights
    // -------------------------------------------------------------
    vec3 blushPink = vec3(0.94, 0.46, 0.64);
    vec3 warmWhite = vec3(0.98, 0.88, 0.92);
    color = mix(blushPink, warmWhite, vColorT * 0.35);
  } else if (vPartType < 3.8) {
    // -------------------------------------------------------------
    // THE KNEELING PERSON (MAN) & ARM (partType = 3.0 or 3.5)
    // Blush pink, soft rose, dusty pink, subtle lavender
    // -------------------------------------------------------------
    vec3 dustyRose  = vec3(0.88, 0.38, 0.54);
    vec3 softBlush  = vec3(0.96, 0.52, 0.68);
    vec3 paleAccent = vec3(0.82, 0.60, 0.88);
    color = mix(dustyRose, softBlush, vColorT);
    if (vRandom > 0.80) {
      color = mix(color, paleAccent, 0.35);
    }
  } else if (vPartType < 4.8) {
    // -------------------------------------------------------------
    // THE STANDING GIRL & REACHING ARM (partType = 4.0 or 4.5)
    // Delicate blush pink, luminous petal pink, ethereal highlights
    // -------------------------------------------------------------
    vec3 petalPink     = vec3(0.92, 0.46, 0.64);
    vec3 etherealBlush = vec3(0.98, 0.68, 0.80);
    vec3 lavenderHint  = vec3(0.86, 0.64, 0.90);
    color = mix(petalPink, etherealBlush, vColorT);
    if (vRandom > 0.75) {
      color = mix(color, lavenderHint, 0.32);
    }
  } else {
    // -------------------------------------------------------------
    // AMBIENT DRIFTING STARDUST (partType = 5)
    // -------------------------------------------------------------
    vec3 ambientPink = vec3(0.92, 0.58, 0.74);
    vec3 ambientGlow = vec3(0.95, 0.80, 0.94);
    color = mix(ambientPink, ambientGlow, vColorT);
  }

  vec3 finalColor = color * twinkle;
  float alphaScale = (vPartType < 0.5) ? 0.55 : ((vPartType < 1.5) ? 0.35 : ((vPartType < 2.5) ? 0.18 : 0.115));
  float alpha = core * vAlpha * uAlpha * alphaScale;

  gl_FragColor = vec4(finalColor, alpha);
}
`;
