import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';

export function RomanticDedication({ isMobile = false, isPortrait = false }) {
  const containerRef = useRef(null);
  const line1Ref = useRef(null);
  const line2Ref = useRef(null);
  const line3Ref = useRef(null);
  const line4Ref = useRef(null);

  useEffect(() => {
    const lines = [line1Ref.current, line2Ref.current, line3Ref.current, line4Ref.current];
    if (lines.some(l => !l)) return;

    // Set initial state for delicate, cinematic fade-in
    gsap.set(lines, {
      opacity: 0,
      y: 10,
      filter: 'blur(4px)',
    });

    const tl = gsap.timeline();

    // Line 1: "Some moments last a second," (0.0s - 1.5s)
    tl.to(line1Ref.current, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.5,
      ease: 'power2.out',
    }, 0.0);

    // Line 2: "but stay in our hearts forever." (2.0s - 3.5s)
    tl.to(line2Ref.current, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.5,
      ease: 'power2.out',
    }, 2.0);

    // Stanza pause (deliberate emotional silence)

    // Line 3: "And if I could choose one moment to live again," (4.2s - 5.8s)
    tl.to(line3Ref.current, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.6,
      ease: 'power2.out',
    }, 4.2);

    // Line 4: "I'd choose the moment I found you." (6.2s - 8.0s)
    tl.to(line4Ref.current, {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      duration: 1.8,
      ease: 'power2.out',
    }, 6.2);

    // Complete dedication visible in pure stillness with subtle romantic breathing presence
    tl.to(containerRef.current, {
      opacity: 0.94,
      duration: 4.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    }, 8.0);

    window.__DEDICATION_TL__ = tl;

    return () => {
      tl.kill();
      delete window.__DEDICATION_TL__;
    };
  }, []);

  const isSidewaysMode = isMobile && isPortrait;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#000000] flex items-center justify-center select-none overflow-hidden z-50 m-0 p-0">
      <div
        ref={containerRef}
        className={`flex flex-col items-center justify-center text-center transition-all duration-500 ${
          isSidewaysMode
            ? 'rotate-90 origin-center w-[92vh] max-h-[85vw] px-2'
            : 'w-full max-w-4xl px-6 md:px-12'
        }`}
        style={{
          color: '#f498b0',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          textShadow: '0 0 28px rgba(244, 152, 176, 0.32)',
        }}
      >
        {/* Stanza 1 */}
        <div className="mb-7 md:mb-11">
          <p
            ref={line1Ref}
            className="whitespace-nowrap text-lg sm:text-xl md:text-3xl lg:text-4xl leading-relaxed md:leading-loose font-normal mb-2 md:mb-4"
            style={{
              fontSize: isSidewaysMode ? 'clamp(1.05rem, 2.9vh, 1.8rem)' : undefined,
            }}
          >
            Some moments last a second,
          </p>
          <p
            ref={line2Ref}
            className="whitespace-nowrap text-lg sm:text-xl md:text-3xl lg:text-4xl leading-relaxed md:leading-loose font-normal"
            style={{
              fontSize: isSidewaysMode ? 'clamp(1.05rem, 2.9vh, 1.8rem)' : undefined,
            }}
          >
            but stay in our hearts forever.
          </p>
        </div>

        {/* Stanza 2 */}
        <div>
          <p
            ref={line3Ref}
            className="whitespace-nowrap text-lg sm:text-xl md:text-3xl lg:text-4xl leading-relaxed md:leading-loose font-normal mb-2 md:mb-4"
            style={{
              fontSize: isSidewaysMode ? 'clamp(1.05rem, 2.9vh, 1.8rem)' : undefined,
            }}
          >
            And if I could choose one moment to live again,
          </p>
          <p
            ref={line4Ref}
            className="whitespace-nowrap text-lg sm:text-xl md:text-3xl lg:text-4xl leading-relaxed md:leading-loose font-medium text-[#ff9db6]"
            style={{
              fontSize: isSidewaysMode ? 'clamp(1.1rem, 3.1vh, 1.95rem)' : undefined,
              textShadow: '0 0 38px rgba(255, 157, 182, 0.50)',
            }}
          >
            I&apos;d choose the moment I found you.
          </p>
        </div>
      </div>
    </div>
  );
}
