import React, { useState, useEffect, useCallback } from 'react';
import { LoveStoryExperience } from './scene/LoveStoryExperience';
import { ParticleTextIntro } from './components/ParticleTextIntro';
import { OpeningDedication } from './components/OpeningDedication';
import { RomanticDedication } from './components/RomanticDedication';
import { ExtendedEnding } from './components/ExtendedEnding';
import { ReplayButton } from './components/ReplayButton';
import { SoundUnlockPrompt } from './components/SoundUnlockPrompt';
import { loadLoveStoryData } from './scene/loadLoveStory';
import { loadParticlesData } from './data/loadParticles';
import { loadMasterRoseData } from './data/loadMasterRose';
import { soundtrack } from './audio/soundtrackManager';
import { heartbeat } from './audio/heartbeatManager';

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

  // Session-level persistent flag: Orientation intro must ONLY appear ONCE
  const [hasCompletedOrientation, setHasCompletedOrientation] = useState(() => {
    // If opening directly on desktop or mobile landscape, mark completed immediately
    return !checkIsMobile() || !checkIsPortrait();
  });

  // Stages:
  // 'ORIENTATION_INTRO' (mobile portrait first visit only)
  // 'OPENING_DEDICATION' (opening dedication before rose forms)
  // 'PROPOSAL' (rose, characters, heartbeat, offering, fingertip contact wave, dissolution)
  // 'ENDING_DEDICATION' (word-by-word love letter with hand-drawn hearts)
  // 'REPLAY' (discreet minimal floating replay text)
  const [stage, setStage] = useState(() => {
    const mobile = checkIsMobile();
    const portrait = checkIsPortrait();
    if (mobile && portrait) {
      return 'ORIENTATION_INTRO';
    }
    return 'OPENING_DEDICATION';
  });

  // Preload proposal artwork and rose particles binary in memory immediately on startup
  useEffect(() => {
    loadLoveStoryData().catch(() => {});
    loadParticlesData().catch(() => {});
    loadMasterRoseData().catch(() => {});
  }, []);

  // Listen for orientation changes and viewport resizing
  useEffect(() => {
    const handleResize = () => {
      const mobile = checkIsMobile();
      const portrait = checkIsPortrait();
      setIsMobile(mobile);
      setIsPortrait(portrait);

      // Part 6.1: If on mobile during orientation intro and user rotates into landscape,
      // mark orientation as completed and start the opening dedication!
      if (mobile && !portrait && stage === 'ORIENTATION_INTRO') {
        setHasCompletedOrientation(true);
        setStage('OPENING_DEDICATION');
      }
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
  }, [stage]);

  // Safety guard: ensure the transition from ORIENTATION_INTRO happens without leaving a black screen
  useEffect(() => {
    if (isMobile && stage === 'ORIENTATION_INTRO') {
      const fallbackTimer = setTimeout(() => {
        setHasCompletedOrientation(true);
        setStage('OPENING_DEDICATION');
      }, 6800);
      return () => clearTimeout(fallbackTimer);
    }
  }, [isMobile, stage]);

  // Fired when the 2-second delay completes after orientation particle text disappearance
  const handleOrientationWaitCompleted = () => {
    setHasCompletedOrientation(true);
    setStage('OPENING_DEDICATION');
  };

  // Fired when the opening dedication has completed its word reveal and particle dissolution
  const handleOpeningDedicationComplete = () => {
    setStage('PROPOSAL');
  };

  // Fired when proposal animation, dissolution, and 2s black hold complete
  const handleProposalComplete = () => {
    setStage('ENDING_DEDICATION');
  };

  // Fired when ending dedication, reading hold, and particle dissolution complete
  const handleEndingDedicationComplete = () => {
    setStage('EXTENDED_ENDING');
  };

  // Centralized Replay Activation: restarts from Opening Dedication, NEVER re-shows orientation
  const handleReplay = useCallback(() => {
    // 1. Reset all audio engines cleanly
    soundtrack.stop();
    heartbeat.reset();

    // 2. Restart sequence directly from Opening Dedication
    setStage('OPENING_DEDICATION');
  }, []);

  // Expose state and switcher for verification and testing
  useEffect(() => {
    window.__SET_STAGE__ = setStage;
    window.__CURRENT_STAGE__ = stage;
    window.__HAS_COMPLETED_ORIENTATION__ = hasCompletedOrientation;
    window.__REPLAY_FN__ = handleReplay;
    return () => {
      delete window.__SET_STAGE__;
      delete window.__CURRENT_STAGE__;
      delete window.__HAS_COMPLETED_ORIENTATION__;
      delete window.__REPLAY_FN__;
    };
  }, [stage, hasCompletedOrientation, handleReplay]);

  // Master Cinematic Viewport: 100% full screen, pure #000000, zero borders
  return (
    <main className="fixed inset-0 w-screen h-screen bg-[#000000] overflow-hidden select-none m-0 p-0">
      {/* 1. Mobile Portrait Orientation Introduction (shown ONCE only on first visit) */}
      {isMobile && !hasCompletedOrientation && stage === 'ORIENTATION_INTRO' && (
        <ParticleTextIntro onWaitCompleted={handleOrientationWaitCompleted} />
      )}

      {/* 2. Opening Dedication: "For the one who makes every moment beautiful." */}
      {stage === 'OPENING_DEDICATION' && (
        <OpeningDedication
          isMobile={isMobile}
          isPortrait={isPortrait}
          onComplete={handleOpeningDedicationComplete}
        />
      )}

      {/* 3. Main Proposal Experience with Heartbeat & Contact Wave */}
      {stage === 'PROPOSAL' && (
        <LoveStoryExperience
          isMobile={isMobile}
          isPortrait={isPortrait}
          autoPlay={true}
          onProposalComplete={handleProposalComplete}
        />
      )}

      {/* 4. Ending Love Message with Hand-Drawn Red Line Hearts */}
      {stage === 'ENDING_DEDICATION' && (
        <RomanticDedication
          isMobile={isMobile}
          isPortrait={isPortrait}
          onDedicationComplete={handleEndingDedicationComplete}
        />
      )}

      {/* 5. Extended Ending: Love Letter, Final Rose Proposal & Universe of Memories */}
      {stage === 'EXTENDED_ENDING' && (
        <ExtendedEnding
          isMobile={isMobile}
          isPortrait={isPortrait}
          onReplay={handleReplay}
        />
      )}

      {/* 5. Minimal Discreet Replay Option */}
      {stage === 'REPLAY' && (
        <ReplayButton
          isMobile={isMobile}
          isPortrait={isPortrait}
          onReplay={handleReplay}
        />
      )}

      {/* Unobtrusive Audio Unlock Prompt (shown ONLY if browser blocks autoplay) */}
      <SoundUnlockPrompt isMobile={isMobile} isPortrait={isPortrait} />
    </main>
  );
}
