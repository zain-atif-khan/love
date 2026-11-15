import React, { useState, useEffect } from 'react';

/**
 * MobilePortraitIntro Component
 * 
 * Displays an elegant, very large typography instruction:
 * "TURN YOUR PHONE SIDEWAYS"
 * 
 * Strict specifications:
 * - Text reads exactly: "TURN YOUR PHONE SIDEWAYS"
 * - ALL CAPITAL LETTERS.
 * - VERY LARGE typography (clamp scaling filling ~75-85% screen width).
 * - Bold, elegant font.
 * - Horizontally centred on screen initially.
 * - Soft blush-pink colour (#facce6) with subtle luminous glow.
 * - Pure black background (#000000).
 * - Smoothly rotates 90 degrees clockwise to visually demonstrate sideways phone orientation.
 * - No small text, icons, illustrations, phone mockups, or buttons.
 * - Appears ONLY on mobile portrait orientation.
 * - Smoothly fades out and unmounts upon rotating to landscape, starting the full-screen particle animation.
 */
export function MobilePortraitIntro() {
  const [isPortrait, setIsPortrait] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < window.innerHeight;
  });
  const [visible, setVisible] = useState(isPortrait);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    const handleOrientation = () => {
      const portrait = window.innerWidth < window.innerHeight;
      setIsPortrait(portrait);

      if (!portrait) {
        // Rotated to landscape:
        if (window.__LOVE_STORY_TL__) {
          if (!hasStarted) {
            window.__LOVE_STORY_TL__.restart();
            setHasStarted(true);
          } else {
            window.__LOVE_STORY_TL__.play();
          }
        }
      } else {
        // In portrait: pause animation
        if (window.__LOVE_STORY_TL__) {
          window.__LOVE_STORY_TL__.pause();
        }
      }
    };

    handleOrientation();
    window.addEventListener('resize', handleOrientation);
    window.addEventListener('orientationchange', handleOrientation);

    const timer = setInterval(() => {
      if (window.__LOVE_STORY_TL__) {
        const portrait = window.innerWidth < window.innerHeight;
        if (portrait) {
          window.__LOVE_STORY_TL__.pause();
        } else if (!hasStarted) {
          window.__LOVE_STORY_TL__.play();
          setHasStarted(true);
        }
        clearInterval(timer);
      }
    }, 200);

    return () => {
      clearInterval(timer);
      window.removeEventListener('resize', handleOrientation);
      window.removeEventListener('orientationchange', handleOrientation);
    };
  }, [hasStarted]);

  useEffect(() => {
    if (!isPortrait) {
      const timeout = setTimeout(() => {
        setVisible(false);
      }, 700);
      return () => clearTimeout(timeout);
    } else {
      setVisible(true);
    }
  }, [isPortrait]);

  if (!visible && !isPortrait) return null;

  return (
    <div
      id="portrait-intro-overlay"
      className={`fixed inset-0 z-50 bg-[#000000] flex items-center justify-center select-none transition-opacity duration-700 ease-out ${
        isPortrait ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!isPortrait}
    >
      <div
        className="animate-rotate-sideways flex flex-col items-center justify-center text-center font-display-intro font-black text-[#facce6] drop-shadow-[0_0_35px_rgba(250,204,230,0.38)]"
        style={{
          width: '82vw',
          maxWidth: '440px',
        }}
      >
        <span className="w-full text-center text-[clamp(2.3rem,9.6vw,4.4rem)] font-extrabold tracking-wider leading-[1.14] block">
          TURN YOUR
        </span>
        <span className="w-full text-center text-[clamp(2.5rem,10.6vw,4.8rem)] font-extrabold tracking-[0.24em] leading-[1.14] block">
          PHONE
        </span>
        <span className="w-full text-center text-[clamp(2.3rem,9.6vw,4.4rem)] font-extrabold tracking-wider leading-[1.14] block">
          SIDEWAYS
        </span>
      </div>
    </div>
  );
}
