import React, { useState, useEffect, useRef } from 'react';

export function ReplayButton({ isMobile = false, isPortrait = false, onReplay }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    // On desktop: reveal on mouse move, fade on inactivity
    if (!isMobile) {
      const handleMouseMove = () => {
        setIsVisible(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          if (!isHovered) {
            setIsVisible(false);
          }
        }, 3200);
      };

      window.addEventListener('mousemove', handleMouseMove);
      // Initial subtle reveal after 1.5s
      const initialTimer = setTimeout(() => {
        setIsVisible(true);
      }, 1500);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        if (timerRef.current) clearTimeout(timerRef.current);
        clearTimeout(initialTimer);
      };
    } else {
      // On mobile: initially hidden, reveals on first tap
      const handleTouch = () => {
        if (!isVisible) {
          setIsVisible(true);
        }
      };

      window.addEventListener('touchstart', handleTouch, { passive: true });
      // Also reveal after 2.0s so the user doesn't wonder what to do
      const mobileTimer = setTimeout(() => {
        setIsVisible(true);
      }, 2000);

      return () => {
        window.removeEventListener('touchstart', handleTouch);
        clearTimeout(mobileTimer);
      };
    }
  }, [isMobile, isHovered, isVisible]);

  const handleAction = (e) => {
    e.stopPropagation();
    if (onReplay) {
      onReplay();
    }
  };

  const shouldRotate = isMobile && isPortrait;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center pointer-events-none select-none transition-opacity duration-700 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <button
        onClick={handleAction}
        onTouchEnd={handleAction}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`pointer-events-auto cursor-pointer bg-transparent border-none outline-none p-4 transition-all duration-300 transform active:scale-95 ${
          shouldRotate ? 'rotate-90 origin-center' : ''
        }`}
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          fontSize: isMobile ? '1.45rem' : '1.75rem',
          letterSpacing: '0.12em',
          color: '#f498b0',
          textShadow: isHovered
            ? '0 0 24px rgba(244, 152, 176, 0.8), 0 0 45px rgba(255, 157, 182, 0.45)'
            : '0 0 16px rgba(244, 152, 176, 0.45)',
        }}
      >
        Replay
      </button>
    </div>
  );
}
