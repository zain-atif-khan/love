import React, { useState, useEffect } from 'react';
import { soundtrack } from '../audio/soundtrackManager';

export function SoundUnlockPrompt({ isMobile = false, isPortrait = false }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    const unsubscribe = soundtrack.subscribe((state) => {
      setBlocked(state.isAutoplayBlocked && !state.isPlaying);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!blocked) return;
    const unlockOnGesture = () => {
      soundtrack.play();
    };
    window.addEventListener('click', unlockOnGesture, { capture: true, once: true });
    window.addEventListener('touchstart', unlockOnGesture, { capture: true, once: true, passive: true });
    return () => {
      window.removeEventListener('click', unlockOnGesture, { capture: true });
      window.removeEventListener('touchstart', unlockOnGesture, { capture: true });
    };
  }, [blocked]);

  if (!blocked) return null;

  const handleUnlock = () => {
    soundtrack.play();
  };

  // On mobile portrait, rotate 90 deg clockwise to match sideways phone line of sight
  const shouldRotate = isMobile && isPortrait;

  return (
    <>
      {/* Discreet minimal pill floating at bottom-center (or rotated sideways in portrait) */}
      <div
        onClick={handleUnlock}
        onTouchStart={handleUnlock}
        className={`fixed z-50 pointer-events-auto cursor-pointer ${
          shouldRotate
            ? 'top-1/2 right-6 -translate-y-1/2 rotate-90 origin-center'
            : 'bottom-6 left-1/2 -translate-x-1/2'
        }`}
        style={{ touchAction: 'manipulation' }}
      >
        <div
          className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/85 backdrop-blur-md border border-[#f498b0]/40 text-[#f498b0] shadow-[0_0_20px_rgba(244,152,176,0.35)] transition-all duration-300 transform active:scale-95"
        >
          <svg
            className="w-3.5 h-3.5 fill-current animate-pulse"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 0L6.5 7.5H3v9h3.5l5 4.27V3.23zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
          </svg>
          <span
            style={{
              fontFamily: '"Cormorant Garamond", Georgia, serif',
              fontStyle: 'italic',
              fontSize: '0.95rem',
              letterSpacing: '0.04em',
            }}
          >
            Tap anywhere for sound
          </span>
        </div>
      </div>
    </>
  );
}
