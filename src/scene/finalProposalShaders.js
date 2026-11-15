export const finalRoseVertexShader = /* glsl */ `
uniform float uTime;
uniform float uFormation; // 0.0 (below screen) to 1.0 (fully formed rose)
uniform float uUniverse;  // 0.0 (formed rose) to 1.0 (universe of memories)
uniform float uAlpha;
uniform float uPixelRatio;

attribute vec3 aPositionInitial;
attribute vec3 aPositionTarget;
attribute float aDrawOrder;
attribute float aColorT;
attribute float aRandom;
attribute float aSize;

varying vec3 vColor;
varying float vAlpha;
varying float vUniverse;

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
  vUniverse = uUniverse;

  // Staggered formation: particles rise smoothly from below
  float staggeredProgress = smoothstep(0.0, 0.90, (uFormation * 1.25) - aDrawOrder * 0.25);
  vec3 currentPos = mix(aPositionInitial, aPositionTarget, staggeredProgress);

  // Upward swirl turbulence while rising
  if (staggeredProgress > 0.01 && staggeredProgress < 0.99) {
    vec3 curl = curlNoise(currentPos * 1.1 + vec3(uTime * 0.18, aRandom * 2.0, 0.0));
    currentPos += curl * ((1.0 - staggeredProgress) * 0.32);
  }

  // Living harmonic breathing motion when fully assembled
  if (staggeredProgress >= 0.99 && uUniverse < 0.01) {
    float breath = sin(uTime * 1.5 + aPositionTarget.y * 3.0) * 0.0035;
    currentPos.y += breath;
    currentPos.x += cos(uTime * 1.2 + aPositionTarget.x * 3.0) * 0.0025;
  }

  // Universe of Memories: Rose dissolves outward into 3D cosmic starfield
  if (uUniverse > 0.001) {
    vec3 curl = curlNoise(currentPos * 0.75 + vec3(uTime * 0.15, aRandom * 4.0, uTime * 0.08));
    float expandDist = pow(uUniverse, 1.4) * 3.5;
    currentPos += curl * expandDist;
    currentPos.z += (aRandom - 0.5) * pow(uUniverse, 1.2) * 2.5; // depth spread
    currentPos.y += pow(uUniverse, 1.3) * 0.5; // celestial upward drift
  }

  // Color selection:
  // In Rose mode: rich crimson velvet core, luminous ruby, dark garnet highlights (0% pink)
  vec3 velvetCrimson = vec3(0.68, 0.02, 0.05);
  vec3 brightRuby     = vec3(0.92, 0.08, 0.18);
  vec3 rubyRoseTip   = vec3(1.00, 0.16, 0.28);
  vec3 roseColor = mix(velvetCrimson, brightRuby, aColorT);
  if (aColorT > 0.6) {
    roseColor = mix(roseColor, rubyRoseTip, (aColorT - 0.6) / 0.4);
  }

  // In Universe mode: particles transition into ethereal blush-pink & stardust lavender
  vec3 stardustPink  = vec3(0.96, 0.65, 0.78);
  vec3 celestialGlow = vec3(0.98, 0.85, 0.92);
  vec3 universeColor = mix(stardustPink, celestialGlow, aRandom);

  vColor = mix(roseColor, universeColor, smoothstep(0.1, 0.85, uUniverse));

  // Alpha fade
  float alpha = smoothstep(0.0, 0.06, uFormation);
  if (uUniverse > 0.5) {
    alpha *= (1.0 - smoothstep(0.5, 0.98, uUniverse) * 0.45); // keep faint stardust alive in universe
  }
  vAlpha = alpha * uAlpha;

  vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 1.0 + 0.22 * sin(uTime * 3.5 + aRandom * 6.28);
  float pSize = aSize * 2.4 * uPixelRatio * twinkle * (6.0 / -mvPosition.z);
  gl_PointSize = clamp(pSize, 2.0, 8.0);
}
`;

export const finalRoseFragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
varying float vUniverse;

void main() {
  if (vAlpha <= 0.005) discard;

  // Anti-aliased circular disc with soft glowing core
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float core = 1.0 - smoothstep(0.08, 0.50, dist);

  // Soft luminous glow halo
  vec3 finalColor = vColor;
  if (vUniverse > 0.2) {
    finalColor += vec3(0.25, 0.15, 0.22) * (1.0 - dist * 2.0);
  }

  // Brilliant ruby/crimson additive luminance
  gl_FragColor = vec4(finalColor, core * vAlpha);
}
`;
