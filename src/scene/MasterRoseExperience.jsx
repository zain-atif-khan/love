import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { loadMasterRoseData } from '../data/loadMasterRose';
import { masterRoseVertexShader, masterRoseFragmentShader } from './masterRoseShaders';

function R3FRoseHook({ onStateReady }) {
  const state = useThree();
  useEffect(() => {
    window.__MASTER_ROSE_R3F__ = state;
    if (onStateReady) onStateReady(state);
  }, [state, onStateReady]);
  return null;
}

function MasterRosePoints({
  formationProgress = 0,
  isMobile = false,
  isPortrait = false,
}) {
  const pointsRef = useRef();
  const materialRef = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;
    loadMasterRoseData()
      .then((loaded) => {
        if (mounted) setData(loaded);
      })
      .catch((err) => console.error('Error loading master rose particles:', err));
    return () => {
      mounted = false;
    };
  }, []);

  const geometry = useMemo(() => {
    if (!data) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.posTarget, 3));
    geo.setAttribute('aPositionInitial', new THREE.BufferAttribute(data.posInitial, 3));
    geo.setAttribute('aPositionTarget', new THREE.BufferAttribute(data.posTarget, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(data.colorRGB, 3));
    geo.setAttribute('aDrawOrder', new THREE.BufferAttribute(data.drawOrders, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(data.randomSeeds, 1));
    geo.setAttribute('aIsFlower', new THREE.BufferAttribute(data.isFlower, 1));
    geo.computeBoundingSphere();
    return geo;
  }, [data]);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial({
      vertexShader: masterRoseVertexShader,
      fragmentShader: masterRoseFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uFormation: { value: formationProgress },
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

  // Sync uniform immediately on prop change
  useEffect(() => {
    if (material) {
      material.uniforms.uFormation.value = formationProgress;
    }
    if (pointsRef.current?.material?.uniforms?.uFormation) {
      pointsRef.current.material.uniforms.uFormation.value = formationProgress;
    }
  }, [formationProgress, material]);

  // Frame tick
  useFrame(({ clock }) => {
    const activeMat = pointsRef.current?.material || material;
    if (activeMat?.uniforms) {
      activeMat.uniforms.uTime.value = clock.getElapsedTime();
      activeMat.uniforms.uFormation.value = formationProgress;
    }
  });

  useEffect(() => {
    window.__MASTER_ROSE_DATA__ = data;
    window.__MASTER_ROSE_MATERIAL__ = materialRef.current;
    window.__MASTER_ROSE_POINTS__ = pointsRef.current;
    window.__MASTER_ROSE_FORMATION__ = formationProgress;
  });

  if (!geometry) return null;

  // Responsive scale ensuring complete bloom, stem and leaves stay inside viewport
  const scale = isMobile ? (isPortrait ? 0.72 : 0.78) : 0.90;

  return (
    <group position={[0, 0, 0]} scale={scale}>
      <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />
    </group>
  );
}

export function MasterRoseExperience({
  formationProgress = 0,
  isMobile = false,
  isPortrait = false,
}) {
  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-10 [&_*]:pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 45 }}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full pointer-events-none"
        style={{ pointerEvents: 'none' }}
        events={() => ({ enabled: false })}
      >
        <color attach="background" args={['#000000']} />
        <R3FRoseHook />
        <MasterRosePoints
          formationProgress={formationProgress}
          isMobile={isMobile}
          isPortrait={isPortrait}
        />
      </Canvas>
    </div>
  );
}
