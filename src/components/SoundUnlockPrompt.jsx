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

  if (!blocked) return null;

  const handleUnlock = () => {
    soundtrack.play();
  };

  // On mobile portrait, rotate 90 deg clockwise to match sideways phone line of sight
  const shouldRotate = isMobile && isPortrait;

  return (
    <div
      onClick={handleUnlock}
      onTouchStart={handleUnlock}
      className="fixed inset-0 z-50 flex items-center justify-center cursor-pointer select-none bg-black/20"
      style={{ touchAction: 'manipulation' }}
    >
      <div
        className={`flex items-center gap-3 px-5 py-2.5 rounded-full bg-black/80 backdrop-blur-md border border-[#f498b0]/50 text-[#f498b0] shadow-[0_0_25px_rgba(244,152,176,0.35)] transition-all duration-300 transform active:scale-95 ${
          shouldRotate ? 'rotate-90 origin-center' : ''
        }`}
      >
        <svg
          className="w-4 h-4 fill-current animate-pulse"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path d="M14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77zm-2.5 0L6.5 7.5H3v9h3.5l5 4.27V3.23zM16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
        <span
          style={{
            fontFamily: '"Cormorant Garamond", Georgia, serif',
            fontStyle: 'italic',
            fontSize: '1.05rem',
            letterSpacing: '0.04em',
          }}
        >
          Tap anywhere for sound
        </span>
      </div>
    </div>
  );
}
