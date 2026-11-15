import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { loadLoveStoryData } from './loadLoveStory';
import { loveStoryVertexShader, loveStoryFragmentShader } from './loveStoryShaders';
import { soundtrack } from '../audio/soundtrackManager';
import { AUDIO_CONFIG } from '../config/audioConfig';

function LoveStoryRendererHook({ isMobile = false, isPortrait = false }) {
  const { gl, scene, camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    let targetZ = 3.18;
    let centerX = 0.04;
    let centerY = 1.10;

    if (!isMobile) {
      // Desktop / Laptop: retain original framing untouched
      if (aspect < 1.6) {
        targetZ = Math.max(3.18, 4.0 / (0.8284 * aspect));
      }
    } else if (isPortrait) {
      // Mobile Portrait: artwork is rotated 90 deg clockwise around (0.065, 1.10)
      // Rotated width along X is 2.20, rotated height along Y is 3.03
      // Proportional contain-style scaling guarantees full scene visibility
      centerX = 0.065;
      centerY = 1.10;
      targetZ = Math.max(4.20, 3.20 / aspect);
    } else {
      // Mobile Native Landscape (innerWidth >= innerHeight)
      centerX = 0.065;
      centerY = 1.10;
      targetZ = Math.max(3.18, 4.25 / (0.8284 * aspect));
    }

    camera.position.set(centerX, centerY, targetZ);
    camera.lookAt(centerX, centerY, 0.0);
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
  }, [gl, scene, camera, size.width, size.height, isMobile, isPortrait]);
  return null;
}

function LoveStoryPoints({ autoPlay = true, isMobile = false, isPortrait = false, onProposalComplete }) {
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

  // Start background music when main proposal animation begins
  useEffect(() => {
    if (autoPlay) {
      soundtrack.play();
    }
  }, [autoPlay]);

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
      onUpdate: updateAllUniforms,
      onComplete: () => {
        if (onProposalComplete) {
          onProposalComplete();
        }
      },
    });

    // Expose for verification and timeline inspection
    window.__LOVE_STORY_TL__ = tl;
    window.__LOVE_STORY_STATE__ = animState;
    window.__LOVE_STORY_UNIFORMS__ = uniforms;
    window.__LOVE_STORY_UPDATE_UNIFORMS__ = updateAllUniforms;

    // Build the master animation through keyframes
    // On mobile: skips the initial 1.5s blank screen because the user already waited
    // exactly 2 seconds after the instruction disappeared; starts immediately!
    // On desktop: retains the original 1.5s cosmic intro untouched.
    const keyframes = isMobile ? [
      // SCENE 2: The Red Rose Physically Assembles in Center (0.0s - 3.0s on mobile)
      { reveal: 0.18, duration: 3.0, ease: 'power2.out' },
      // Pause to admire the glowing red rose (3.0s - 3.6s)
      { duration: 0.6 },
      // SCENE 3: The Hand Forms Wrapping Around Stem (3.6s - 5.8s)
      { reveal: 0.33, duration: 2.2, ease: 'power2.inOut' },
      // Pause (5.8s - 6.3s)
      { duration: 0.5 },
      // SCENE 4: The Kneeling Person Materializes on One Knee (6.3s - 10.1s)
      { reveal: 0.59, duration: 3.8, ease: 'power2.inOut' },
      // Pause (10.1s - 10.7s)
      { duration: 0.6 },
      // SCENE 5: The Standing Girl Materializes with Cascading Gown (10.7s - 14.7s)
      { reveal: 0.96, duration: 4.0, ease: 'power2.inOut' },
      // SCENE 6: Hold Complete Proposal Composition (14.7s - 16.7s)
      { duration: 2.0 },
      // SCENE 7: Man Slowly Raises & Extends Rose Arm Forward (16.7s - 19.7s)
      { manOffer: 1.0, duration: 3.0, ease: 'power1.inOut' },
      // SCENE 8: Woman Gracefully Raises & Extends Reaching Arm to Rose (19.7s - 22.2s)
      { womanReach: 1.0, duration: 2.5, ease: 'power1.inOut' },
      // SCENE 9: Moment of Contact — Pure Stillness Freeze (22.2s - 24.25s)
      { freeze: 1.0, duration: 0.05 },
      { duration: 2.0 }, // 2 full seconds of frozen emotional awe
      // SCENE 10: Complete Dissolution into Swirling Stardust Vortex (24.25s - 29.5s)
      { freeze: 0.0, duration: 0.05 },
      { dissolve: 1.0, duration: 3.2, ease: 'power2.in' },
      { alpha: 0.0, duration: 1.2, ease: 'power2.in' },
      { duration: 2.0 } // Hold on pure black
    ] : [
      // DESKTOP: Original keyframes untouched
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
    ];

    tl.to(animState, { keyframes });

    if (autoPlay === false) {
      tl.pause(0);
    }

    return () => {
      tl.kill();
      delete window.__LOVE_STORY_TL__;
      delete window.__LOVE_STORY_STATE__;
      delete window.__LOVE_STORY_UNIFORMS__;
      delete window.__LOVE_STORY_UPDATE_UNIFORMS__;
    };
  }, [geometry, material, autoPlay, isMobile]);

  useEffect(() => {
    if (window.__LOVE_STORY_TL__) {
      if (autoPlay) {
        window.__LOVE_STORY_TL__.play();
      } else {
        window.__LOVE_STORY_TL__.pause(0);
      }
    }
  }, [autoPlay]);

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

  const shouldRotateClockwise = isMobile && isPortrait;

  return (
    <group
      position={[0.065, 1.10, 0]}
      rotation={[0, 0, shouldRotateClockwise ? -Math.PI / 2 : 0]}
    >
      <group position={[-0.065, -1.10, 0]}>
        <points ref={pointsRef} geometry={geometry} material={material} />
      </group>
    </group>
  );
}

export function LoveStoryExperience({
  autoPlay = true,
  isMobile = false,
  isPortrait = false,
  onProposalComplete,
}) {
  return (
    <div className="w-full h-full bg-[#000000] overflow-hidden select-none relative">
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
        <LoveStoryRendererHook isMobile={isMobile} isPortrait={isPortrait} />
        <LoveStoryPoints
          autoPlay={autoPlay}
          isMobile={isMobile}
          isPortrait={isPortrait}
          onProposalComplete={onProposalComplete}
        />
      </Canvas>
    </div>
  );
}
