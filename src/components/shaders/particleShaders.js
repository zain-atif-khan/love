export const particleVertexShader = /* glsl */ `
uniform float uTime;
uniform float uStage;
uniform float uDrawProgress;
uniform float uNoiseIntensity;
uniform float uAlpha;
uniform float uPixelRatio;

attribute vec3 aPositionInitial;
attribute vec3 aPositionCloud;
attribute vec3 aPositionTarget;
attribute float aDrawOrder;
attribute float aRandom;
attribute float aColorT;
attribute float aSize;

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
  vColorT = aColorT;
  vRandom = aRandom;
  
  vec3 pos;
  float particleAlpha = 1.0;
  
  if (uStage <= 1.0) {
    // Stage 1 -> 2: From initial cosmic field to swirling cloud
    float t1 = smoothstep(0.0, 1.0, uStage);
    pos = mix(aPositionInitial, aPositionCloud, t1);
    
    // Swirl turbulence during gathering
    vec3 curl = curlNoise(pos * 0.9 + vec3(uTime * 0.18, uTime * 0.12, aRandom * 2.0));
    pos += curl * (sin(t1 * 3.14159265) * uNoiseIntensity * 1.0);
    
    particleAlpha = mix(0.2, 0.7, t1);
  } else {
    // Stage 3 -> 5: From swirling cloud to crisp artwork target
    float drawDiff = uDrawProgress - aDrawOrder;
    
    if (drawDiff >= 0.0) {
      // Particle crystallizes into its target line
      float crystallizeT = smoothstep(0.0, 0.14, drawDiff);
      pos = mix(aPositionCloud, aPositionTarget, crystallizeT);
      
      // Settling noise
      vec3 curl = curlNoise(pos * 1.5 + vec3(uTime * 0.22, uTime * 0.16, aRandom));
      pos += curl * ((1.0 - crystallizeT) * uNoiseIntensity * 0.5);
      
      // Once locked, subtle organic breathing
      if (crystallizeT >= 0.98) {
        vec2 breath = vec2(
          sin(uTime * 1.1 + aPositionTarget.y * 2.2),
          cos(uTime * 1.3 + aPositionTarget.x * 2.2)
        ) * 0.0025;
        pos.xy += breath;
      }
      
      particleAlpha = mix(0.7, 1.0, crystallizeT);
    } else {
      // Swirling cloud awaiting reveal
      pos = aPositionCloud;
      vec3 curl = curlNoise(pos * 1.1 + vec3(uTime * 0.25, uTime * 0.18, aRandom * 3.0));
      pos += curl * (uNoiseIntensity * 0.25);
      
      particleAlpha = 0.4;
    }
  }

  vAlpha = particleAlpha;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Delicate micro-particle sizing
  float twinkleSize = 1.0 + 0.3 * sin(uTime * 4.2 + aRandom * 6.28318);
  float pSize = aSize * uPixelRatio * twinkleSize * (11.0 / -mvPosition.z);
  gl_PointSize = clamp(pSize, 1.0, 4.0);
}
`;

export const particleFragmentShader = /* glsl */ `
uniform vec3 uColor1; // Rose pink
uniform vec3 uColor2; // Blush pink
uniform vec3 uColor3; // Lavender purple
uniform vec3 uColor4; // Cyan periwinkle
uniform float uTime;
uniform float uAlpha;

varying float vColorT;
varying float vRandom;
varying float vAlpha;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  // Soft anti-aliased luminous particle core
  float core = smoothstep(0.5, 0.1, dist);

  // 4-stop vertical spectral gradient matching reference
  vec3 color;
  if (vColorT < 0.32) {
    float f = vColorT / 0.32;
    color = mix(uColor1, uColor2, smoothstep(0.0, 1.0, f));
  } else if (vColorT < 0.68) {
    float f = (vColorT - 0.32) / 0.36;
    color = mix(uColor2, uColor3, smoothstep(0.0, 1.0, f));
  } else {
    float f = (vColorT - 0.68) / 0.32;
    color = mix(uColor3, uColor4, smoothstep(0.0, 1.0, f));
  }

  // Dynamic continuous twinkle / luminescence pulsing
  float twinkle = 0.75 + 0.35 * sin(uTime * 4.5 + vRandom * 6.28318);
  vec3 finalColor = color * twinkle;
  
  // Calibrated delicate alpha to prevent additive blowout while maintaining soft glow
  float alpha = core * vAlpha * uAlpha * 0.32;

  gl_FragColor = vec4(finalColor, alpha);
}
`;
