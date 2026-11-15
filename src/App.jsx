import React, { useState, useEffect } from 'react';
import { LoveStoryExperience } from './scene/LoveStoryExperience';
import { ParticleTextIntro } from './components/ParticleTextIntro';
import { loadLoveStoryData } from './scene/loadLoveStory';

/**
 * Accurately detects whether current device is a mobile device (phone or tablet).
 * Touch laptops with standard large desktop viewports are treated as desktop.
 */
function checkIsMobile() {
  if (typeof window === 'undefined') return false;
  const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const isSmallScreen = Math.min(window.innerWidth, window.innerHeight) <= 850;
  return (hasTouch && isSmallScreen) || isMobileUA;
}

/**
 * Checks whether current viewport is in portrait orientation.
 */
function checkIsPortrait() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < window.innerHeight;
}

export default function App() {
  const [isMobile, setIsMobile] = useState(() => checkIsMobile());
  const [isPortrait, setIsPortrait] = useState(() => checkIsPortrait());

  // Stages: 'INTRO' (mobile only) -> 'PROPOSAL'
  const [stage, setStage] = useState(() => checkIsMobile() ? 'INTRO' : 'PROPOSAL');

  // Preload proposal artwork binary in memory immediately on startup
  useEffect(() => {
    loadLoveStoryData().catch(() => {});
  }, []);

  // Listen for orientation changes and viewport resizing
  useEffect(() => {
    const handleResize = () => {
      const mobile = checkIsMobile();
      const portrait = checkIsPortrait();
      setIsMobile(mobile);
      setIsPortrait(portrait);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    const t1 = setTimeout(handleResize, 150);
    const t2 = setTimeout(handleResize, 350);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Safety guard: ensure the transition to PROPOSAL happens without leaving a black screen
  useEffect(() => {
    if (isMobile && stage === 'INTRO') {
      const fallbackTimer = setTimeout(() => {
        setStage('PROPOSAL');
      }, 6800);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isMobile, stage]);

  // Fired when the 2-second delay completes after particle text disappearance
  const handleWaitCompleted = () => {
    setStage('PROPOSAL');
  };

  // DESKTOP & LAPTOP:
  // Bypass intro entirely. Retain exact original timing, layout, and composition untouched.
  if (!isMobile) {
    return (
      <main className="fixed inset-0 w-screen h-screen bg-[#000000] overflow-hidden select-none m-0 p-0">
        <LoveStoryExperience isMobile={false} isPortrait={false} autoPlay={true} />
      </main>
    );
  }

  // MOBILE INTRO:
  // Render the red particle text intro in portrait orientation
  if (stage === 'INTRO') {
    return (
      <main className="fixed inset-0 w-screen h-screen bg-[#000000] overflow-hidden select-none m-0 p-0">
        <ParticleTextIntro onWaitCompleted={handleWaitCompleted} />
      </main>
    );
  }

  // MOBILE PROPOSAL:
  // Occupies 100% of the mobile viewport (fixed inset-0 w-screen h-screen bg-[#000000]).
  // Zero CSS transforms, zero letterboxing margins, zero side panels, pure black #000000.
  // Rotated 90 degrees clockwise in WebGL when in portrait to match the intro text animation.
  // Rendered horizontally when in native landscape.
  return (
    <main className="fixed inset-0 w-screen h-screen bg-[#000000] overflow-hidden select-none m-0 p-0">
      <LoveStoryExperience isMobile={true} isPortrait={isPortrait} autoPlay={true} />
    </main>
  );
}
