import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { soundtrack } from '../audio/soundtrackManager';
import { AUDIO_CONFIG } from '../config/audioConfig';

// 3 Organic Hand-Drawn Heart Doodle Vector Paths (approx 32x32)
const HEART_PATH_A = "M 16,8.5 C 16,3.8 11.2,0.8 6.2,2.2 C 1.2,3.8 -0.2,9.8 2.8,14.8 C 5.8,19.8 13.2,25.8 16,28.5 C 18.8,25.8 26.2,19.8 29.2,14.8 C 32.2,9.8 30.8,3.8 25.8,2.2 C 20.8,0.8 16,3.8 16,8.5 Z";
const HEART_PATH_B = "M 15.5,8 C 15.5,3.5 10.5,0.5 5.8,2 C 0.8,3.5 -0.5,9.5 2.5,14.5 C 5.5,19.5 12.8,25.5 15.5,28.2 C 18.2,25.5 25.5,19.5 28.5,14.5 C 31.5,9.5 30.2,3.5 25.2,2 C 20.5,0.5 15.5,3.5 15.5,8 Z";
const HEART_PATH_C = "M 16,9 C 16,4.2 11.5,1.2 6.5,2.5 C 1.5,3.8 0.2,9.8 3.5,14.8 C 6.8,19.8 13.5,25.8 16,28.5 C 18.5,25.8 25.2,19.8 28.5,14.8 C 31.8,9.8 30.5,3.8 25.5,2.5 C 20.5,1.2 16,4.2 16,9 Z";

// Stanzas and Words for the Word-by-Word Writing Sequence
const POEM_STANZAS = [
  // Stanza 1
  [
    ["Some", "moments", "last", "a", "second,"],
    ["but", "stay", "in", "our", "hearts", "forever."],
  ],
  // Stanza 2
  [
    ["And", "if", "I", "could", "choose", "one", "moment", "to", "live", "again,"],
    ["I'd", "choose", "the", "moment", "I", "found", "you."],
  ],
];

export function RomanticDedication({ isMobile = false, isPortrait = false }) {
  const containerRef = useRef(null);

  // Word Refs Map: 's0-l0-w0' -> element
  const wordsRef = useRef({});

  // Heart Path Refs: heart0 -> path element
  const heartPathRefs = useRef([]);

  useEffect(() => {
    // 1. Prepare word elements for progressive handwritten appearance
    const wordEls = Object.values(wordsRef.current);
    gsap.set(wordEls, { opacity: 0, y: 4, filter: 'blur(2px)' });

    // 2. Prepare hand-drawn SVG heart paths
    heartPathRefs.current.forEach((pathEl) => {
      if (pathEl) {
        const length = pathEl.getTotalLength ? pathEl.getTotalLength() : 85;
        pathEl.style.strokeDasharray = `${length}`;
        pathEl.style.strokeDashoffset = `${length}`;
        gsap.set(pathEl, { opacity: 1 });
      }
    });

    const tl = gsap.timeline();

    // -------------------------------------------------------------
    // Word-by-Word Reveal Sequence with Natural Human Rhythm
    // -------------------------------------------------------------
    // Schedule word reveal timestamps (in seconds)
    const wordTimings = [
      // Stanza 1, Line 1: "Some moments last a second,"
      { id: 's0-l0-w0', t: 0.00 }, // Some
      { id: 's0-l0-w1', t: 0.42 }, // moments
      { id: 's0-l0-w2', t: 0.86 }, // last
      { id: 's0-l0-w3', t: 1.18 }, // a
      { id: 's0-l0-w4', t: 1.55 }, // second,

      // Stanza 1, Line 2: "but stay in our hearts forever."
      { id: 's0-l1-w0', t: 2.35 }, // but
      { id: 's0-l1-w1', t: 2.75 }, // stay
      { id: 's0-l1-w2', t: 3.12 }, // in
      { id: 's0-l1-w3', t: 3.48 }, // our
      { id: 's0-l1-w4', t: 3.90 }, // hearts
      { id: 's0-l1-w5', t: 4.40 }, // forever.

      // Stanza Break Pause (emotional silence ~1.3s)

      // Stanza 2, Line 1: "And if I could choose one moment to live again,"
      { id: 's1-l0-w0', t: 5.70 }, // And
      { id: 's1-l0-w1', t: 6.08 }, // if
      { id: 's1-l0-w2', t: 6.38 }, // I
      { id: 's1-l0-w3', t: 6.80 }, // could
      { id: 's1-l0-w4', t: 7.25 }, // choose
      { id: 's1-l0-w5', t: 7.70 }, // one
      { id: 's1-l0-w6', t: 8.12 }, // moment
      { id: 's1-l0-w7', t: 8.52 }, // to
      { id: 's1-l0-w8', t: 8.92 }, // live
      { id: 's1-l0-w9', t: 9.38 }, // again,

      // Stanza 2, Line 2: "I'd choose the moment I found you."
      { id: 's1-l1-w0', t: 10.30 }, // I'd
      { id: 's1-l1-w1', t: 10.75 }, // choose
      { id: 's1-l1-w2', t: 11.20 }, // the
      { id: 's1-l1-w3', t: 11.65 }, // moment
      { id: 's1-l1-w4', t: 12.10 }, // I
      { id: 's1-l1-w5', t: 12.55 }, // found
      { id: 's1-l1-w6', t: 13.15 }, // you.
    ];

    // Animate each word individually into place
    wordTimings.forEach(({ id, t }) => {
      const el = wordsRef.current[id];
      if (el) {
        tl.to(
          el,
          {
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.24,
            ease: 'power1.out',
          },
          t
        );
      }
    });

    // -------------------------------------------------------------
    // Hand-Drawn Red Line Hearts (Simultaneous with Writing)
    // Each heart is visibly drawn progressively with a fine red line (2.2s - 2.5s)
    // -------------------------------------------------------------
    const heartConfigs = [
      // Heart 1: Upper-Left (begins shortly after first words appear)
      { index: 0, start: 1.20, duration: 2.3 },
      // Heart 2: Upper-Right (starts as Stanza 1 completes)
      { index: 1, start: 4.40, duration: 2.3 },
      // Heart 3: Mid-Left (starts as Stanza 2 begins)
      { index: 2, start: 7.60, duration: 2.4 },
      // Heart 4: Mid-Right (draws while final line is being written)
      { index: 3, start: 10.80, duration: 2.3 },
      // Heart 5: Lower-Right (final delicate flourish)
      { index: 4, start: 13.80, duration: 2.4 },
    ];

    heartConfigs.forEach(({ index, start, duration }) => {
      const pathEl = heartPathRefs.current[index];
      if (pathEl) {
        tl.to(
          pathEl,
          {
            strokeDashoffset: 0,
            duration: duration,
            ease: 'power1.inOut',
          },
          start
        );
      }
    });

    // -------------------------------------------------------------
    // Stillness Hold & Final Audio Fade
    // -------------------------------------------------------------
    // Keep complete dedication visible for ~7.5 seconds in quiet stillness
    // End of animations is ~16.2s -> hold until ~24.0s
    const endingCompleteTime = 24.0;

    // Gently fade the soundtrack to silence only after the ending has finished
    tl.call(() => {
      soundtrack.fadeAfterEnding(AUDIO_CONFIG.finalFadeDuration);
    }, null, endingCompleteTime);

    // Subtle gentle breathing pulse on final composition
    tl.to(
      containerRef.current,
      {
        opacity: 0.95,
        duration: 4.0,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      },
      endingCompleteTime
    );

    window.__DEDICATION_TL__ = tl;

    return () => {
      tl.kill();
      delete window.__DEDICATION_TL__;
    };
  }, []);

  const isSidewaysMode = isMobile && isPortrait;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#000000] flex items-center justify-center select-none overflow-hidden z-50 m-0 p-0">
      {/* Dedication Card Wrapper */}
      <div
        ref={containerRef}
        className={`relative flex flex-col items-center justify-center text-center transition-all duration-500 ${
          isSidewaysMode
            ? 'rotate-90 origin-center w-[92vh] max-h-[85vw] px-4 py-6'
            : 'w-full max-w-4xl px-8 md:px-14 py-12'
        }`}
        style={{
          color: '#f498b0',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          textShadow: '0 0 28px rgba(244, 152, 176, 0.32)',
        }}
      >
        {/* ========================================================= */}
        {/* 5 HAND-DRAWN RED LINE HEARTS IN SURROUNDING EMPTY SPACES   */}
        {/* Never overlapping text, visibly drawn one by one           */}
        {/* ========================================================= */}

        {/* Heart 1: Upper-Left */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: isSidewaysMode ? '-22px' : '-18px',
            left: isSidewaysMode ? '16px' : '28px',
            transform: 'rotate(-14deg) scale(0.95)',
          }}
        >
          <svg viewBox="0 0 32 32" width="30" height="30" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[0] = el)}
              d={HEART_PATH_A}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 3px rgba(212, 4, 26, 0.45))',
              }}
            />
          </svg>
        </div>

        {/* Heart 2: Upper-Right */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: isSidewaysMode ? '-20px' : '-14px',
            right: isSidewaysMode ? '18px' : '32px',
            transform: 'rotate(16deg) scale(1.05)',
          }}
        >
          <svg viewBox="0 0 32 32" width="32" height="32" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[1] = el)}
              d={HEART_PATH_B}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 3px rgba(212, 4, 26, 0.45))',
              }}
            />
          </svg>
        </div>

        {/* Heart 3: Mid-Left Margin */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: '46%',
            left: isSidewaysMode ? '-16px' : '10px',
            transform: 'rotate(-8deg) scale(0.85)',
          }}
        >
          <svg viewBox="0 0 32 32" width="28" height="28" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[2] = el)}
              d={HEART_PATH_C}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 3px rgba(212, 4, 26, 0.45))',
              }}
            />
          </svg>
        </div>

        {/* Heart 4: Mid-Right Margin */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: '56%',
            right: isSidewaysMode ? '-14px' : '14px',
            transform: 'rotate(12deg) scale(0.95)',
          }}
        >
          <svg viewBox="0 0 32 32" width="30" height="30" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[3] = el)}
              d={HEART_PATH_A}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 3px rgba(212, 4, 26, 0.45))',
              }}
            />
          </svg>
        </div>

        {/* Heart 5: Lower Margin */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            bottom: isSidewaysMode ? '-35px' : '-22px',
            left: isSidewaysMode ? '80px' : 'auto',
            right: isSidewaysMode ? 'auto' : '64px',
            transform: 'rotate(-6deg) scale(1.0)',
          }}
        >
          <svg viewBox="0 0 32 32" width="32" height="32" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[4] = el)}
              d={HEART_PATH_B}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                filter: 'drop-shadow(0 0 3px rgba(212, 4, 26, 0.45))',
              }}
            />
          </svg>
        </div>

        {/* ========================================================= */}
        {/* WORD-BY-WORD ROMANTIC DEDICATION MESSAGE                   */}
        {/* ========================================================= */}

        {/* Stanza 1 */}
        <div className="mb-7 md:mb-11 relative z-10">
          {POEM_STANZAS[0].map((lineWords, lineIdx) => (
            <p
              key={`s0-l${lineIdx}`}
              className="whitespace-nowrap text-lg sm:text-xl md:text-3xl lg:text-4xl leading-relaxed md:leading-loose font-normal mb-2 md:mb-4"
              style={{
                fontSize: isSidewaysMode ? 'clamp(1.05rem, 2.9vh, 1.8rem)' : undefined,
              }}
            >
              {lineWords.map((word, wordIdx) => {
                const id = `s0-l${lineIdx}-w${wordIdx}`;
                return (
                  <span
                    key={id}
                    ref={(el) => (wordsRef.current[id] = el)}
                    className="inline-block mr-[0.28em] last:mr-0"
                  >
                    {word}
                  </span>
                );
              })}
            </p>
          ))}
        </div>

        {/* Stanza 2 */}
        <div className="relative z-10">
          {POEM_STANZAS[1].map((lineWords, lineIdx) => {
            const isFinalLine = lineIdx === 1;
            return (
              <p
                key={`s1-l${lineIdx}`}
                className={`whitespace-nowrap text-lg sm:text-xl md:text-3xl lg:text-4xl leading-relaxed md:leading-loose ${
                  isFinalLine
                    ? 'font-medium text-[#ff9db6]'
                    : 'font-normal mb-2 md:mb-4'
                }`}
                style={{
                  fontSize: isSidewaysMode ? 'clamp(1.1rem, 3.1vh, 1.95rem)' : undefined,
                  textShadow: isFinalLine
                    ? '0 0 38px rgba(255, 157, 182, 0.50)'
                    : undefined,
                }}
              >
                {lineWords.map((word, wordIdx) => {
                  const id = `s1-l${lineIdx}-w${wordIdx}`;
                  return (
                    <span
                      key={id}
                      ref={(el) => (wordsRef.current[id] = el)}
                      className="inline-block mr-[0.28em] last:mr-0"
                    >
                      {word}
                    </span>
                  );
                })}
              </p>
            );
          })}
        </div>
      </div>
    </div>
  );
}
