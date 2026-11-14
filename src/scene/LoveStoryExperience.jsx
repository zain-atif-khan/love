import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { loadLoveStoryData } from './loadLoveStory';
import { loveStoryVertexShader, loveStoryFragmentShader } from './loveStoryShaders';

function LoveStoryRendererHook() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    camera.position.set(0.04, 1.10, 3.18);
    camera.lookAt(0.04, 1.10, 0.0);
    camera.updateProjectionMatrix();

    window.__LOVE_STORY_RENDER__ = () => {
      if (window.__LOVE_STORY_UPDATE_UNIFORMS__) {
        window.__LOVE_STORY_UPDATE_UNIFORMS__();
      }
      gl.render(scene, camera);
    };
    window.__LOVE_STORY_CANVAS__ = gl.domElement;
    return () => {
      delete window.__LOVE_STORY_RENDER__;
      delete window.__LOVE_STORY_CANVAS__;
    };
  }, [gl, scene, camera]);
  return null;
}

function LoveStoryPoints() {
  const pointsRef = useRef();
  const materialRef = useRef();
  const [data, setData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    loadLoveStoryData()
      .then((loaded) => {
        if (isMounted) setData(loaded);
      })
      .catch((err) => console.error('Error loading love story data:', err));
    return () => { isMounted = false; };
  }, []);

  const geometry = useMemo(() => {
    if (!data) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(data.posInitial, 3));
    geo.setAttribute('aPositionInitial', new THREE.BufferAttribute(data.posInitial, 3));
    geo.setAttribute('aPositionRest', new THREE.BufferAttribute(data.posRest, 3));
    geo.setAttribute('aPositionTouch', new THREE.BufferAttribute(data.posTouch, 3));
    geo.setAttribute('aPartType', new THREE.BufferAttribute(data.partTypes, 1));
    geo.setAttribute('aRevealOrder', new THREE.BufferAttribute(data.revealOrders, 1));
    geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
    geo.setAttribute('aColorT', new THREE.BufferAttribute(data.colorTs, 1));
    geo.setAttribute('aRandom', new THREE.BufferAttribute(data.randomSeeds, 1));
    return geo;
  }, [data]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: loveStoryVertexShader,
      fragmentShader: loveStoryFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRevealProgress: { value: 0 },
        uOfferProgress: { value: 0 },
        uManOfferProgress: { value: 0 },
        uWomanReachProgress: { value: 0 },
        uDissolveProgress: { value: 0 },
        uFreeze: { value: 0 },
        uAlpha: { value: 1.0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  // Master Cinematic Animation Timeline using robust sequential keyframes
  useEffect(() => {
    if (!geometry || !material) return;
    materialRef.current = material;
    const uniforms = material.uniforms;

    // Reset initial state
    const animState = {
      reveal: 0,
      offer: 0,
      manOffer: 0,
      womanReach: 0,
      dissolve: 0,
      freeze: 0,
      alpha: 1.0,
    };

    const updateAllUniforms = () => {
      uniforms.uRevealProgress.value = animState.reveal;
      uniforms.uOfferProgress.value = animState.offer;
      uniforms.uManOfferProgress.value = animState.manOffer;
      uniforms.uWomanReachProgress.value = animState.womanReach;
      uniforms.uFreeze.value = animState.freeze;
      uniforms.uDissolveProgress.value = animState.dissolve;
      uniforms.uAlpha.value = animState.alpha;
    };
    updateAllUniforms();

    const tl = gsap.timeline({
      repeat: -1,
      repeatDelay: 1.5,
      onUpdate: updateAllUniforms,
    });

    // Expose for verification and timeline inspection
    window.__LOVE_STORY_TL__ = tl;
    window.__LOVE_STORY_STATE__ = animState;
    window.__LOVE_STORY_UNIFORMS__ = uniforms;
    window.__LOVE_STORY_UPDATE_UNIFORMS__ = updateAllUniforms;

    // Build the master animation through keyframes
    tl.to(animState, {
      keyframes: [
        // SCENE 1: Black screen with faint drifting cosmic stardust (0.0s - 1.5s)
        { reveal: 0.0, duration: 1.5 },
        // SCENE 2: The Red Rose Physically Assembles in Center (1.5s - 4.5s)
        { reveal: 0.18, duration: 3.0, ease: 'power2.out' },
        // Pause to admire the glowing red rose (4.5s - 5.1s)
        { duration: 0.6 },
        // SCENE 3: The Hand Forms Wrapping Around Stem (5.1s - 7.3s)
        { reveal: 0.33, duration: 2.2, ease: 'power2.inOut' },
        // Pause (7.3s - 7.8s)
        { duration: 0.5 },
        // SCENE 4: The Kneeling Person Materializes on One Knee (7.8s - 11.6s)
        { reveal: 0.59, duration: 3.8, ease: 'power2.inOut' },
        // Pause (11.6s - 12.2s)
        { duration: 0.6 },
        // SCENE 5: The Standing Girl Materializes with Cascading Gown (12.2s - 16.2s)
        { reveal: 0.96, duration: 4.0, ease: 'power2.inOut' },
        // SCENE 6: Hold Complete Proposal Composition (16.2s - 18.2s)
        { duration: 2.0 },
        // SCENE 7: Man Slowly Raises & Extends Rose Arm Forward (18.2s - 21.2s)
        { manOffer: 1.0, duration: 3.0, ease: 'power1.inOut' },
        // SCENE 8: Woman Gracefully Raises & Extends Reaching Arm to Rose (21.2s - 23.7s)
        { womanReach: 1.0, duration: 2.5, ease: 'power1.inOut' },
        // SCENE 9: Moment of Contact — Pure Stillness Freeze (23.7s - 25.75s)
        { freeze: 1.0, duration: 0.05 },
        { duration: 2.0 }, // 2 full seconds of frozen emotional awe
        // SCENE 10: Complete Dissolution into Swirling Stardust Vortex (25.75s - 31.0s)
        { freeze: 0.0, duration: 0.05 },
        { dissolve: 1.0, duration: 3.2, ease: 'power2.in' },
        { alpha: 0.0, duration: 1.2, ease: 'power2.in' },
        { duration: 2.0 } // Hold on pure black
      ]
    });

    return () => {
      tl.kill();
      delete window.__LOVE_STORY_TL__;
      delete window.__LOVE_STORY_STATE__;
      delete window.__LOVE_STORY_UNIFORMS__;
      delete window.__LOVE_STORY_UPDATE_UNIFORMS__;
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    if (materialRef.current && window.__LOVE_STORY_STATE__) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
      materialRef.current.uniforms.uRevealProgress.value = window.__LOVE_STORY_STATE__.reveal;
      materialRef.current.uniforms.uOfferProgress.value = window.__LOVE_STORY_STATE__.offer;
      materialRef.current.uniforms.uManOfferProgress.value = window.__LOVE_STORY_STATE__.manOffer;
      materialRef.current.uniforms.uWomanReachProgress.value = window.__LOVE_STORY_STATE__.womanReach;
      materialRef.current.uniforms.uFreeze.value = window.__LOVE_STORY_STATE__.freeze;
      materialRef.current.uniforms.uDissolveProgress.value = window.__LOVE_STORY_STATE__.dissolve;
      materialRef.current.uniforms.uAlpha.value = window.__LOVE_STORY_STATE__.alpha;
    }
  });

  if (!geometry) return null;

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
}

export function LoveStoryExperience() {
  return (
    <div className="w-screen h-screen bg-[#000000] overflow-hidden select-none relative">
      <Canvas
        camera={{ position: [0.04, 1.10, 3.18], fov: 45 }}
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
        <LoveStoryRendererHook />
        <LoveStoryPoints />
      </Canvas>
    </div>
  );
}
