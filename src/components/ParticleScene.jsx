import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { loadParticlesData } from '../data/loadParticles';
import { particleVertexShader, particleFragmentShader } from './shaders/particleShaders';

function ParticlePoints({ textOverlayRef }) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const [data, setData] = useState(null);

  // Load particle data
  useEffect(() => {
    let isMounted = true;
    loadParticlesData()
      .then((loaded) => {
        if (isMounted) setData(loaded);
      })
      .catch((err) => console.error('Error loading particles:', err));
    return () => { isMounted = false; };
  }, []);

  // Create BufferGeometry
  const geometry = useMemo(() => {
    if (!data) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.posInitial, 3));
    geo.setAttribute('aPositionInitial', new THREE.BufferAttribute(data.posInitial, 3));
    geo.setAttribute('aPositionCloud', new THREE.BufferAttribute(data.posCloud, 3));
    geo.setAttribute('aPositionTarget', new THREE.BufferAttribute(data.posTarget, 3));
    geo.setAttribute('aDrawOrder', new THREE.BufferAttribute(data.drawOrders, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(data.randomSeeds, 1));
    geo.setAttribute('aColorT', new THREE.BufferAttribute(data.colorTs, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    return geo;
  }, [data]);

  // Create Shader Material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uStage: { value: 0 },
        uDrawProgress: { value: 0 },
        uNoiseIntensity: { value: 0.25 },
        uAlpha: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uColor1: { value: new THREE.Color('#FFA5CD') }, // Top rose pink
        uColor2: { value: new THREE.Color('#FFBEE1') }, // Blush pink
        uColor3: { value: new THREE.Color('#CDA5FF') }, // Lavender purple
        uColor4: { value: new THREE.Color('#91D2FF') }, // Cyan periwinkle
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Master GSAP Timeline matching reference video (12.0s duration)
  useEffect(() => {
    if (!geometry || !material) return;

    materialRef.current = material;
    const uniforms = material.uniforms;

    // Reset initial values
    uniforms.uStage.value = 0;
    uniforms.uDrawProgress.value = 0;
    uniforms.uAlpha.value = 0;
    uniforms.uNoiseIntensity.value = 0.25;

    const animState = {
      alpha: 0,
      stage: 0,
      drawProgress: 0,
      noise: 0.25,
      textProgress: 0,
    };

    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 2.0,
      onRepeat: () => {
        if (textOverlayRef?.current) {
          textOverlayRef.current.reset();
        }
      },
    });

    // 0.0s - 1.0s: Stage 1 (Initial Ambient Dust Spark)
    tl.to(animState, {
      alpha: 1.0,
      noise: 0.35,
      duration: 1.0,
      ease: 'power2.out',
      onUpdate: () => {
        uniforms.uAlpha.value = animState.alpha;
        uniforms.uNoiseIntensity.value = animState.noise;
      },
    }, 0);

    // 1.0s - 2.8s: Stage 2 (Swirling Organic Inward Gathering to Cloud)
    tl.to(animState, {
      stage: 1.0,
      noise: 0.45,
      duration: 1.8,
      ease: 'power2.inOut',
      onUpdate: () => {
        uniforms.uStage.value = animState.stage;
        uniforms.uNoiseIntensity.value = animState.noise;
      },
    }, 1.0);

    // 2.8s - 9.0s: Stage 3, 4, 5 (Top-down crystallization of roses, face, neck, stem)
    tl.to(animState, {
      stage: 2.0,
      drawProgress: 1.0,
      noise: 0.1,
      duration: 6.2,
      ease: 'power1.inOut',
      onUpdate: () => {
        uniforms.uStage.value = animState.stage;
        uniforms.uDrawProgress.value = animState.drawProgress;
        uniforms.uNoiseIntensity.value = animState.noise;
      },
    }, 2.8);

    // 6.8s - 8.9s: Stage 6 (Typographic typewriter reveal)
    tl.to(animState, {
      textProgress: 1.0,
      duration: 2.1,
      ease: 'none',
      onUpdate: () => {
        if (textOverlayRef?.current) {
          textOverlayRef.current.setProgress(animState.textProgress);
        }
      },
    }, 6.8);

    // 8.9s - 12.8s: Stage 7 (Complete artwork breathing in place)
    tl.to(animState, {
      noise: 0.08,
      duration: 3.9,
      ease: 'power1.out',
      onUpdate: () => {
        uniforms.uNoiseIntensity.value = animState.noise;
      },
    }, 8.9);

    // 12.8s - 13.8s: Gentle fade before seamless repeat
    tl.to(animState, {
      alpha: 0.0,
      duration: 1.0,
      ease: 'power2.in',
      onUpdate: () => {
        uniforms.uAlpha.value = animState.alpha;
      },
    }, 12.8);

    return () => {
      tl.kill();
    };
  }, [geometry, material, textOverlayRef]);

  // Frame tick for time
  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  if (!geometry) return null;

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

export function ParticleScene({ textOverlayRef }) {
  return (
    <div className="w-full h-full relative bg-[#08050F] overflow-hidden">
      <Canvas
        camera={{ position: [0, 0, 4.3], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full"
      >
        <ParticlePoints textOverlayRef={textOverlayRef} />
      </Canvas>
    </div>
  );
}
