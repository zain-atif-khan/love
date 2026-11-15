import React, { useEffect, useRef, useState } from 'react';
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

export function RomanticDedication({
  isMobile = false,
  isPortrait = false,
  onDedicationComplete,
}) {
  const containerRef = useRef(null);
  const wordsRef = useRef({});
  const heartPathRefs = useRef([]);
  const canvasRef = useRef(null);
  const [isDissolving, setIsDissolving] = useState(false);

  useEffect(() => {
    // 1. Prepare word elements: strictly enforce hidden state from frame 0
    const wordEls = Object.values(wordsRef.current);
    gsap.set(wordEls, { autoAlpha: 0, y: 4, filter: 'blur(2px)' });

    // 2. Prepare hand-drawn SVG heart paths with length-based offsets
    heartPathRefs.current.forEach((pathEl) => {
      if (pathEl) {
        const length = pathEl.getTotalLength ? pathEl.getTotalLength() : 85;
        pathEl.style.strokeDasharray = `${length}`;
        pathEl.style.strokeDashoffset = `${length}`;
        gsap.set(pathEl, { opacity: 1 });
      }
    });

    const tl = gsap.timeline();

    // Word-by-Word Reveal Sequence with Natural Human Rhythm
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

      // Stanza 2, Line 1: "And if I could choose one moment to live again,"
      { id: 's1-l0-w0', t: 5.65 }, // And
      { id: 's1-l0-w1', t: 6.02 }, // if
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

    wordTimings.forEach(({ id, t }) => {
      const el = wordsRef.current[id];
      if (el) {
        tl.to(
          el,
          {
            autoAlpha: 1,
            y: 0,
            filter: 'blur(0px)',
            duration: 0.24,
            ease: 'power1.out',
          },
          t
        );
      }
    });

    // Hand-Drawn Red Line Hearts
    const heartConfigs = [
      { index: 0, start: 1.20, duration: 2.3 },
      { index: 1, start: 4.40, duration: 2.3 },
      { index: 2, start: 7.60, duration: 2.4 },
      { index: 3, start: 10.80, duration: 2.3 },
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
    // Stillness Reading Hold -> Particle Dissolution Transition
    // -------------------------------------------------------------
    // Keep complete dedication visible for comfortable reading hold (~7.0s after words finish)
    const holdEndTime = 20.5;

    // Start particle dissolution at holdEndTime
    tl.call(() => {
      setIsDissolving(true);
      // Seamlessly transition music to gentle reading volume for the Love Letter
      soundtrack.setReadingVolume(0.35, 2.5);
    }, null, holdEndTime);

    // After particle dissolution (~2.8s) + black screen stillness (1.5s), transition to Extended Ending
    const transitionTime = holdEndTime + 4.3;
    tl.call(() => {
      if (onDedicationComplete) {
        onDedicationComplete();
      }
    }, null, transitionTime);

    window.__DEDICATION_TL__ = tl;

    return () => {
      tl.kill();
      delete window.__DEDICATION_TL__;
    };
  }, [onDedicationComplete]);

  // Particle Dissolution Engine: converts text and doodle hearts into thousands of upward drifting blush-pink particles
  useEffect(() => {
    if (!isDissolving) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = window.innerWidth;
    const height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Create offscreen canvas to sample exact text layout
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const isSideways = isMobile && isPortrait;
    const baseFontSize = isMobile ? (isPortrait ? 20 : 22) : 30;

    offCtx.save();
    if (isSideways) {
      offCtx.translate(width / 2, height / 2);
      offCtx.rotate(Math.PI / 2);
      offCtx.translate(-width / 2, -height / 2);
    }

    offCtx.font = `italic 400 ${baseFontSize}px "Cormorant Garamond", Georgia, serif`;
    offCtx.fillStyle = '#f498b0';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    const cx = width / 2;
    const cy = height / 2;
    const lineSpacing = baseFontSize * 1.55;

    offCtx.fillText("Some moments last a second,", cx, cy - lineSpacing * 1.9);
    offCtx.fillText("but stay in our hearts forever.", cx, cy - lineSpacing * 0.9);
    offCtx.fillText("And if I could choose one moment to live again,", cx, cy + lineSpacing * 0.5);
    offCtx.fillText("I'd choose the moment I found you.", cx, cy + lineSpacing * 1.5);

    offCtx.restore();

    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const particles = [];
    const step = isMobile ? 3 : 2;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 90) {
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -0.25 - Math.random() * 0.65, // gentle upward romantic drift
            size: 0.85 + Math.random() * 1.25,
            alpha: 1.0,
            fadeSpeed: 0.009 + Math.random() * 0.012,
            turbulence: Math.random() * 6.28,
          });
        }
      }
    }

    let animId;
    let startTime = performance.now();

    const render = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      let aliveCount = 0;
      particles.forEach((p) => {
        if (p.alpha <= 0.01) return;
        aliveCount++;

        p.turbulence += 0.04;
        p.x += p.vx + Math.sin(p.turbulence) * 0.4;
        p.y += p.vy + Math.cos(p.turbulence) * 0.18;
        p.alpha = Math.max(0, p.alpha - p.fadeSpeed);

        ctx.fillStyle = `rgba(244, 152, 176, ${p.alpha * 0.95})`;
        ctx.shadowColor = 'rgba(244, 152, 176, 0.40)';
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (aliveCount > 0 && elapsed < 3.2) {
        animId = requestAnimationFrame(render);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isDissolving, isMobile, isPortrait]);

  const isSidewaysMode = isMobile && isPortrait;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#000000] flex items-center justify-center select-none overflow-hidden z-50 m-0 p-0">
      {/* Particle Canvas for Text Dissolution into Stardust */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-50"
      />

      {/* Dedication Card Wrapper (dissolves to opacity 0 when particle animation begins) */}
      <div
        ref={containerRef}
        className={`relative flex flex-col items-center justify-center text-center transition-opacity duration-700 ${
          isDissolving ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } ${
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
        {/* Heart 1: Upper-Left */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: isSidewaysMode ? '-22px' : '-18px',
            left: isSidewaysMode ? '16px' : '28px',
            transform: 'scale(1.05) rotate(-14deg)',
          }}
        >
          <svg width="34" height="34" viewBox="0 0 32 32" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[0] = el)}
              d={HEART_PATH_A}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(212,4,26,0.65)]"
            />
          </svg>
        </div>

        {/* Heart 2: Upper-Right */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: isSidewaysMode ? '-18px' : '-12px',
            right: isSidewaysMode ? '22px' : '36px',
            transform: 'scale(0.92) rotate(16deg)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[1] = el)}
              d={HEART_PATH_B}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(212,4,26,0.65)]"
            />
          </svg>
        </div>

        {/* Stanza 1 */}
        <div className="mb-6 md:mb-8 flex flex-col items-center">
          {POEM_STANZAS[0].map((lineWords, lineIdx) => (
            <div
              key={`s0-l${lineIdx}`}
              className="flex flex-wrap justify-center gap-x-[0.28em] my-1 leading-relaxed text-2xl sm:text-3xl md:text-4xl"
            >
              {lineWords.map((word, wordIdx) => {
                const wordId = `s0-l0-w${wordIdx + (lineIdx === 1 ? 5 : 0)}`;
                return (
                  <span
                    key={wordId}
                    ref={(el) => (wordsRef.current[wordId] = el)}
                    className="inline-block transition-transform opacity-0 invisible"
                    style={{ opacity: 0, visibility: 'hidden' }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        {/* Heart 3: Mid-Left */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: '46%',
            left: isSidewaysMode ? '-12px' : '-14px',
            transform: 'translateY(-50%) scale(0.88) rotate(-10deg)',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 32 32" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[2] = el)}
              d={HEART_PATH_C}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(212,4,26,0.65)]"
            />
          </svg>
        </div>

        {/* Heart 4: Mid-Right */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            top: '52%',
            right: isSidewaysMode ? '-10px' : '-12px',
            transform: 'translateY(-50%) scale(0.95) rotate(12deg)',
          }}
        >
          <svg width="32" height="32" viewBox="0 0 32 32" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[3] = el)}
              d={HEART_PATH_A}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(212,4,26,0.65)]"
            />
          </svg>
        </div>

        {/* Stanza 2 */}
        <div className="flex flex-col items-center">
          {POEM_STANZAS[1].map((lineWords, lineIdx) => (
            <div
              key={`s1-l${lineIdx}`}
              className="flex flex-wrap justify-center gap-x-[0.28em] my-1 leading-relaxed text-2xl sm:text-3xl md:text-4xl"
            >
              {lineWords.map((word, wordIdx) => {
                const wordId = `s1-l${lineIdx}-w${wordIdx}`;
                return (
                  <span
                    key={wordId}
                    ref={(el) => (wordsRef.current[wordId] = el)}
                    className="inline-block transition-transform opacity-0 invisible"
                    style={{ opacity: 0, visibility: 'hidden' }}
                  >
                    {word}
                  </span>
                );
              })}
            </div>
          ))}
        </div>

        {/* Heart 5: Lower-Right */}
        <div
          className="absolute pointer-events-none select-none"
          style={{
            bottom: isSidewaysMode ? '-22px' : '-18px',
            right: isSidewaysMode ? '24px' : '42px',
            transform: 'scale(1.08) rotate(18deg)',
          }}
        >
          <svg width="36" height="36" viewBox="0 0 32 32" className="overflow-visible">
            <path
              ref={(el) => (heartPathRefs.current[4] = el)}
              d={HEART_PATH_B}
              fill="none"
              stroke="#d4041a"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(212,4,26,0.65)]"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
