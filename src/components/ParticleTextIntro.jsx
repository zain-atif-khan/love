import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';

// Shaders for the Glowing Red Particle Text
const textParticleVertexShader = /* glsl */ `
uniform float uTime;
uniform float uGatherProgress;   // 0.0 -> 1.0 (0.0 - 0.8s: particles gather into letters)
uniform float uDisperseProgress; // 0.0 -> 1.0 (3.8 - 4.3s: particles disperse into blackness)
uniform float uAlpha;
uniform float uRotation;         // 0.0 -> PI/2 (2.8 - 3.8s: rotate entire composition 90 deg clockwise)
uniform float uPixelRatio;

attribute vec3 aPositionTarget;
attribute vec3 aPositionInitial;
attribute vec3 aPositionDisperse;
attribute float aColorT;
attribute float aSize;
attribute float aRandom;

varying float vColorT;
varying float vRandom;
varying float vAlpha;

void main() {
  vColorT = aColorT;
  vRandom = aRandom;

  // 1. Gather particles from cosmic scatter into letters (0.0 - 0.8s)
  vec3 pos = mix(aPositionInitial, aPositionTarget, smoothstep(0.0, 1.0, uGatherProgress));

  // Subtle living breathing twinkle when formed
  if (uGatherProgress > 0.99 && uDisperseProgress < 0.01) {
    pos.xy += vec2(
      sin(uTime * 1.5 + aPositionTarget.y * 3.0),
      cos(uTime * 1.8 + aPositionTarget.x * 3.0)
    ) * 0.003;
  }

  // 2. Dispersal into blackness (3.8 - 4.3s)
  if (uDisperseProgress > 0.001) {
    pos += aPositionDisperse * pow(uDisperseProgress, 1.3);
  }

  // 3. Smooth 90-degree clockwise rotation of the ENTIRE composition (2.8 - 3.8s)
  // In screen space (around center 0, 0, 0):
  float c = cos(uRotation);
  float s = sin(uRotation);
  vec3 rotPos = vec3(
    pos.x * c + pos.y * s,
    -pos.x * s + pos.y * c,
    pos.z
  );

  vAlpha = smoothstep(0.0, 0.35, uGatherProgress) * (1.0 - smoothstep(0.1, 1.0, uDisperseProgress)) * uAlpha;

  vec4 mvPosition = modelViewMatrix * vec4(rotPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float twinkle = 0.88 + 0.24 * sin(uTime * 4.2 + aRandom * 6.28318);
  gl_PointSize = clamp(aSize * uPixelRatio * twinkle * (14.0 / -mvPosition.z), 1.2, 4.5);
}
`;

const textParticleFragmentShader = /* glsl */ `
uniform float uTime;
uniform float uAlpha;

varying float vColorT;
varying float vRandom;
varying float vAlpha;

void main() {
  if (vAlpha <= 0.005) discard;

  // Anti-aliased circular particle disc
  vec2 coord = gl_PointCoord - vec2(0.5);
  float dist = length(coord);
  if (dist > 0.5) discard;

  float core = smoothstep(0.5, 0.08, dist);

  // Deep crimson velvet and bright ruby red glow
  vec3 velvetCrimson = vec3(0.96, 0.02, 0.06); // deep rich crimson
  vec3 brightRuby     = vec3(1.00, 0.10, 0.22); // vibrant glowing red
  vec3 rubySparkle   = vec3(1.00, 0.32, 0.44); // radiant ruby highlight

  vec3 color = mix(velvetCrimson, brightRuby, vColorT);
  if (vRandom > 0.80) {
    color = mix(color, rubySparkle, 0.45);
  }

  float twinkle = 0.90 + 0.25 * sin(uTime * 4.2 + vRandom * 6.28318);
  vec3 finalColor = color * twinkle;

  float alpha = core * vAlpha * uAlpha * 0.75;

  gl_FragColor = vec4(finalColor, alpha);
}
`;

function TextParticleMesh({ data, onTextDisappeared, onWaitCompleted }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const stateRef = useRef({
    gather: 0,
    rotation: 0,
    disperse: 0,
    alpha: 1.0,
  });

  const geometry = useMemo(() => {
    if (!data) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.posInitial, 3));
    geo.setAttribute('aPositionTarget', new THREE.BufferAttribute(data.posTarget, 3));
    geo.setAttribute('aPositionInitial', new THREE.BufferAttribute(data.posInitial, 3));
    geo.setAttribute('aPositionDisperse', new THREE.BufferAttribute(data.posDisperse, 3));
    geo.setAttribute('aColorT', new THREE.BufferAttribute(data.colorTs, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(data.randomSeeds, 1));
    return geo;
  }, [data]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: textParticleVertexShader,
      fragmentShader: textParticleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uGatherProgress: { value: 0 },
        uDisperseProgress: { value: 0 },
        uRotation: { value: 0 },
        uAlpha: { value: 1.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    if (!geometry || !material) return;
    materialRef.current = material;
    const uniforms = material.uniforms;
    const animState = stateRef.current;

    const updateUniforms = () => {
      uniforms.uGatherProgress.value = animState.gather;
      uniforms.uDisperseProgress.value = animState.disperse;
      uniforms.uRotation.value = animState.rotation;
      uniforms.uAlpha.value = animState.alpha;
    };

    const tl = gsap.timeline({
      onUpdate: updateUniforms,
      onComplete: () => {
        if (onWaitCompleted) onWaitCompleted();
      }
    });

    // Exact required timing sequence:
    // 1. Red particle text appears (0.0s - 0.8s)
    tl.to(animState, {
      gather: 1.0,
      duration: 0.8,
      ease: 'power2.out',
    });

    // 2. Text remains visible for 2 seconds (0.8s - 2.8s)
    tl.to(animState, {
      duration: 2.0,
    });

    // 3. Rotate ENTIRE text composition smoothly by exactly 90 degrees clockwise (2.8s - 3.8s)
    tl.to(animState, {
      rotation: Math.PI / 2, // 90 deg clockwise
      duration: 1.0,
      ease: 'power2.inOut',
    });

    // 4. Text particles disappear completely (3.8s - 4.3s)
    tl.to(animState, {
      disperse: 1.0,
      alpha: 0.0,
      duration: 0.5,
      ease: 'power2.in',
      onComplete: () => {
        if (onTextDisappeared) onTextDisappeared();
      }
    });

    // 5. Wait exactly 2 seconds after the text has fully disappeared (4.3s - 6.3s)
    tl.to(animState, {
      duration: 2.0,
    });

    window.__TEXT_PARTICLES_TL__ = tl;
    window.__TEXT_PARTICLES_STATE__ = animState;
    window.__TEXT_PARTICLES_UPDATE__ = updateUniforms;

    return () => {
      tl.kill();
      delete window.__TEXT_PARTICLES_TL__;
      delete window.__TEXT_PARTICLES_STATE__;
      delete window.__TEXT_PARTICLES_UPDATE__;
    };
  }, [geometry, material, onTextDisappeared, onWaitCompleted]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      if (stateRef.current) {
        materialRef.current.uniforms.uGatherProgress.value = stateRef.current.gather;
        materialRef.current.uniforms.uDisperseProgress.value = stateRef.current.disperse;
        materialRef.current.uniforms.uRotation.value = stateRef.current.rotation;
        materialRef.current.uniforms.uAlpha.value = stateRef.current.alpha;
      }
    }
  });

  if (!geometry) return null;

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

function TextParticleCanvasHook() {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const targetZ = Math.max(4.5, Math.min(6.5, 2.01 / (0.8284 * Math.max(0.35, aspect))));
    camera.position.set(0, 0, targetZ);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();

    window.__TEXT_PARTICLES_RENDER__ = () => {
      if (window.__TEXT_PARTICLES_UPDATE__) {
        window.__TEXT_PARTICLES_UPDATE__();
      }
      gl.render(scene, camera);
    };
    return () => {
      delete window.__TEXT_PARTICLES_RENDER__;
    };
  }, [gl, scene, camera, size.width, size.height]);
  return null;
}

export function ParticleTextIntro({ onTextDisappeared, onWaitCompleted }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    fetch(`/text_particles.bin?v=${Date.now()}`)
      .then(res => res.arrayBuffer())
      .then(buffer => {
        if (!isMounted) return;
        const count = new Uint32Array(buffer, 4, 1)[0];
        let offset = 8;

        const posTarget = new Float32Array(buffer, offset, count * 3);
        offset += count * 3 * 4;

        const posInitial = new Float32Array(buffer, offset, count * 3);
        offset += count * 3 * 4;

        const posDisperse = new Float32Array(buffer, offset, count * 3);
        offset += count * 3 * 4;

        const colorTs = new Float32Array(buffer, offset, count);
        offset += count * 4;

        const sizes = new Float32Array(buffer, offset, count);
        offset += count * 4;

        const randomSeeds = new Float32Array(buffer, offset, count);

        setData({
          count,
          posTarget,
          posInitial,
          posDisperse,
          colorTs,
          sizes,
          randomSeeds,
        });
      })
      .catch(err => console.error('Error loading text particles:', err));

    return () => { isMounted = false; };
  }, []);

  return (
    <div
      id="particle-text-intro"
      className="fixed inset-0 z-50 bg-[#000000] w-screen h-screen select-none overflow-hidden"
    >
      <Canvas
        camera={{ position: [0, 0, 5.2], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: false,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full"
      >
        <color attach="background" args={['#000000']} />
        <TextParticleCanvasHook />
        {data && (
          <TextParticleMesh
            data={data}
            onTextDisappeared={onTextDisappeared}
            onWaitCompleted={onWaitCompleted}
          />
        )}
      </Canvas>
    </div>
  );
}
