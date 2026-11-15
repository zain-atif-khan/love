import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { loadParticlesData } from '../data/loadParticles';
import { finalRoseVertexShader, finalRoseFragmentShader } from './finalProposalShaders';
import { HeartConstellation } from './HeartConstellation';

function R3FStateHook() {
  const state = useThree();
  useEffect(() => {
    window.__R3F_STATE__ = state;
  });
  return null;
}

function FinalRosePoints({
  formationProgress = 0,
  universeProgress = 0,
  isMobile = false,
  isPortrait = false,
}) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadParticlesData()
      .then((loaded) => {
        if (mounted) setData(loaded);
      })
      .catch((err) => console.error('Error loading rose particles:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const geometry = useMemo(() => {
    if (!data) return null;
    const count = data.count;

    // Generate initial particle positions strictly below the screen
    const posInitial = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      posInitial[i * 3 + 0] = (Math.random() - 0.5) * 3.2;
      posInitial[i * 3 + 1] = -3.5 - Math.random() * 2.2; // starting below bottom of viewport
      posInitial[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.posTarget, 3));
    geo.setAttribute('aPositionInitial', new THREE.BufferAttribute(posInitial, 3));
    geo.setAttribute('aPositionTarget', new THREE.BufferAttribute(data.posTarget, 3));
    geo.setAttribute('aDrawOrder', new THREE.BufferAttribute(data.drawOrders, 1));
    geo.setAttribute('aColorT', new THREE.BufferAttribute(data.colorTs, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(data.randomSeeds, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    return geo;
  }, [data]);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: finalRoseVertexShader,
      fragmentShader: finalRoseFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uFormation: { value: formationProgress },
        uUniverse: { value: universeProgress },
        uAlpha: { value: 1.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    materialRef.current = mat;
    return mat;
  }, []);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uFormation.value = formationProgress;
      materialRef.current.uniforms.uUniverse.value = universeProgress;
    }
  }, [formationProgress, universeProgress]);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uFormation.value = formationProgress;
      materialRef.current.uniforms.uUniverse.value = universeProgress;
    }
  });

  useEffect(() => {
    window.__FINAL_ROSE_DATA__ = data;
    window.__FINAL_ROSE_MATERIAL__ = materialRef.current;
    window.__FINAL_ROSE_POINTS__ = pointsRef.current;
    window.__FINAL_ROSE_PROPS__ = { formationProgress, universeProgress, isMobile, isPortrait };
  });

  if (!geometry) return null;

  // Scale and position the rose comfortably above the center
  const scale = isMobile ? (isPortrait ? 0.52 : 0.58) : 0.65;
  const posY = isMobile ? (isPortrait ? 0.25 : 0.20) : 0.22;

  return (
    <group position={[0, posY, 0]} scale={scale}>
      <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export function FinalProposalExperience({
  formationProgress = 0,
  universeProgress = 0,
  constellationProgress = 0,
  isMobile = false,
  isPortrait = false,
}) {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-20">
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full"
      >
        <color attach="background" args={['#000000']} />
        <R3FStateHook />

        {/* 1. Rising Particle Rose & Stardust Dissolution */}
        <FinalRosePoints
          formationProgress={formationProgress}
          universeProgress={universeProgress}
          isMobile={isMobile}
          isPortrait={isPortrait}
        />

        {/* 2. Delicate Heart Constellation & Celestial Starfield */}
        <HeartConstellation
          progress={constellationProgress}
          opacity={universeProgress}
        />
      </Canvas>
    </div>
  );
}
