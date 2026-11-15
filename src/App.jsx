import React, { useState, useEffect } from 'react';
import { LoveStoryExperience } from './scene/LoveStoryExperience';
import { ParticleTextIntro } from './components/ParticleTextIntro';
import { RomanticDedication } from './components/RomanticDedication';
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

  // Stages: 'INTRO' (mobile only) -> 'PROPOSAL' -> 'DEDICATION'
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

  // Fired when proposal animation, dissolution, and 2s black hold complete
  const handleProposalComplete = () => {
    setStage('DEDICATION');
  };

  // Expose state and switcher for verification and testing
  useEffect(() => {
    window.__SET_STAGE__ = setStage;
    window.__CURRENT_STAGE__ = stage;
    return () => {
      delete window.__SET_STAGE__;
      delete window.__CURRENT_STAGE__;
    };
  }, [stage]);

  // Master Cinematic Viewport: 100% full screen, pure #000000, zero borders
  return (
    <main className="fixed inset-0 w-screen h-screen bg-[#000000] overflow-hidden select-none m-0 p-0">
      {isMobile && stage === 'INTRO' && (
        <ParticleTextIntro onWaitCompleted={handleWaitCompleted} />
      )}

      {stage === 'PROPOSAL' && (
        <LoveStoryExperience
          isMobile={isMobile}
          isPortrait={isPortrait}
          autoPlay={true}
          onProposalComplete={handleProposalComplete}
        />
      )}

      {stage === 'DEDICATION' && (
        <RomanticDedication isMobile={isMobile} isPortrait={isPortrait} />
      )}
    </main>
  );
}
