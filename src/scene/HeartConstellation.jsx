import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

const STAR_COUNT = 32;

export function HeartConstellation({ progress = 0.0, opacity = 1.0 }) {
  const linesRef = useRef();
  const starsRef = useRef();
  const dustRef = useRef();

  // 1. Generate 32 Heart Anchor Stars in 3D Space
  const { starPoints, linePositions } = useMemo(() => {
    const points = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const t = (i / STAR_COUNT) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3) * 0.082;
      // Heart curve: lobe is up, point is down
      const y = (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.082 + 0.38;
      const z = Math.sin(t * 2.5) * 0.08;
      points.push(new THREE.Vector3(x, y, z));
    }

    // Line segments: (0-1), (1-2), ..., (31-0)
    const lineCoords = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % STAR_COUNT];
      lineCoords.push(p1.x, p1.y, p1.z);
      lineCoords.push(p2.x, p2.y, p2.z);
    }

    return {
      starPoints: points,
      linePositions: new Float32Array(lineCoords),
    };
  }, []);

  // 2. Ambient Deep Celestial Stardust in Background
  const stardustData = useMemo(() => {
    const count = 1200;
    const pos = new Float32Array(count * 3);
    const alphas = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 6.5;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 5.0;
      pos[i * 3 + 2] = -3.5 + Math.random() * 4.5;
      alphas[i] = 0.2 + Math.random() * 0.65;
      sizes[i] = 1.0 + Math.random() * 2.2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  // Line dynamic drawing geometry
  const dynamicLineGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(linePositions.slice(), 3));
    return geo;
  }, [linePositions]);

  // Star Points Geometry
  const starsGeo = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    for (let i = 0; i < STAR_COUNT; i++) {
      pos[i * 3 + 0] = starPoints[i].x;
      pos[i * 3 + 1] = starPoints[i].y;
      pos[i * 3 + 2] = starPoints[i].z;
      sizes[i] = 4.2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, [starPoints]);

  // Line Material
  const lineMaterial = useMemo(() => {
    return new THREE.LineBasicMaterial({
      color: new THREE.Color('#f6a4b8'),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Stars Point Material
  const starsMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uProgress;
        uniform float uOpacity;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          float indexNormalized = float(gl_VertexID) / ${STAR_COUNT}.0;
          float lit = smoothstep(indexNormalized - 0.05, indexNormalized + 0.02, uProgress);
          vAlpha = lit * uOpacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          float pulse = 1.0 + 0.35 * sin(uTime * 3.0 + float(gl_VertexID) * 0.8);
          gl_PointSize = aSize * pulse * (5.5 / -mvPosition.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          if (vAlpha <= 0.01) discard;
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float core = smoothstep(0.5, 0.05, dist);
          vec3 starColor = vec3(0.98, 0.82, 0.90);
          gl_FragColor = vec4(starColor, core * vAlpha);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uProgress: { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Stardust Material
  const dustMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uOpacity;
        attribute float aAlpha;
        attribute float aSize;
        varying float vAlpha;
        void main() {
          vAlpha = aAlpha * uOpacity;
          vec3 pos = position;
          pos.y += sin(uTime * 0.35 + position.x * 2.0) * 0.05;
          pos.x += cos(uTime * 0.28 + position.y * 2.0) * 0.04;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = aSize * (4.0 / -mvPosition.z);
        }
      `,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          if (vAlpha <= 0.01) discard;
          vec2 coord = gl_PointCoord - vec2(0.5);
          float dist = length(coord);
          if (dist > 0.5) discard;
          float core = smoothstep(0.5, 0.1, dist);
          vec3 dustColor = vec3(0.94, 0.68, 0.80);
          gl_FragColor = vec4(dustColor, core * vAlpha * 0.55);
        }
      `,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Master frame update
  useFrame(({ clock }) => {
    const elapsed = clock.getElapsedTime();

    starsMaterial.uniforms.uTime.value = elapsed;
    starsMaterial.uniforms.uProgress.value = progress;
    starsMaterial.uniforms.uOpacity.value = opacity;

    dustMaterial.uniforms.uTime.value = elapsed;
    dustMaterial.uniforms.uOpacity.value = opacity;

    lineMaterial.opacity = 0.75 * opacity * Math.min(1.0, progress * 1.5);

    // Update dynamic line draw range: progressively connect stars and close loop fully at 0.95+
    if (linesRef.current) {
      const totalVertices = STAR_COUNT * 2;
      const activeVertices = progress >= 0.95 ? totalVertices : Math.floor(progress * totalVertices);
      linesRef.current.geometry.setDrawRange(0, activeVertices);
    }
  });

  return (
    <group position={[0, 0.08, 0]}>
      {/* 1. Deep Celestial Stardust Field */}
      <points ref={dustRef} geometry={stardustData} material={dustMaterial} />

      {/* 2. Thin Luminous Constellation Lines */}
      <lineSegments ref={linesRef} geometry={dynamicLineGeo} material={lineMaterial} />

      {/* 3. Luminous Anchor Heart Stars */}
      <points ref={starsRef} geometry={starsGeo} material={starsMaterial} />
    </group>
  );
}
