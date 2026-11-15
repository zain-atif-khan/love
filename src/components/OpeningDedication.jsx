import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';

const DEDICATION_WORDS = [
  "For",
  "the",
  "one",
  "who",
  "makes",
  "every",
  "moment",
  "beautiful.",
];

export function OpeningDedication({
  isMobile = false,
  isPortrait = false,
  onComplete,
}) {
  const containerRef = useRef(null);
  const wordsRef = useRef([]);
  const canvasRef = useRef(null);
  const [isDissolving, setIsDissolving] = useState(false);

  useEffect(() => {
    // 1. Enforce initial hidden state on all words
    const wordEls = wordsRef.current.filter(Boolean);
    gsap.set(wordEls, { autoAlpha: 0, y: 5, filter: 'blur(3px)' });

    const tl = gsap.timeline();

    // 2. Sequential Word-by-Word Reveal (natural handwriting cadence)
    const wordInterval = 0.34;
    wordEls.forEach((el, idx) => {
      tl.to(
        el,
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 0.36,
          ease: 'power1.out',
        },
        idx * wordInterval
      );
    });

    const totalWordsTime = (wordEls.length - 1) * wordInterval + 0.36; // ~2.74s
    const holdDuration = 2.0; // 2.0s comfortable reading hold
    const dissolveStartTime = totalWordsTime + holdDuration; // ~4.74s

    // 3. Trigger Particle Dissolution
    tl.call(() => {
      setIsDissolving(true);
    }, null, dissolveStartTime);

    // 4. Dissolve duration (~2.5s) + black stillness (0.8s) -> call onComplete
    const completeTime = dissolveStartTime + 3.3;
    tl.call(() => {
      if (onComplete) onComplete();
    }, null, completeTime);

    window.__OPENING_DEDICATION_TL__ = tl;

    return () => {
      tl.kill();
      delete window.__OPENING_DEDICATION_TL__;
    };
  }, [onComplete]);

  // Handle Canvas Particle Dissolution
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

    // Render offscreen text to sample particle coordinates
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    const fontSize = isMobile ? (isPortrait ? 26 : 30) : 42;
    offCtx.font = `italic 400 ${fontSize}px "Cormorant Garamond", Georgia, serif`;
    offCtx.fillStyle = '#f498b0';
    offCtx.textAlign = 'center';
    offCtx.textBaseline = 'middle';

    // Center coordinates
    const cx = width / 2;
    const cy = height / 2;
    offCtx.fillText("For the one who makes every moment beautiful.", cx, cy);

    const imgData = offCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sample particles from letter shapes (step 3 for density)
    const particles = [];
    const step = isMobile ? 3 : 2;
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const index = (y * width + x) * 4;
        const alpha = data[index + 3];
        if (alpha > 110) {
          particles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 0.6,
            vy: -0.2 - Math.random() * 0.7, // gentle upward drift
            size: 0.9 + Math.random() * 1.3,
            alpha: 1.0,
            fadeSpeed: 0.008 + Math.random() * 0.012,
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
        p.x += p.vx + Math.sin(p.turbulence) * 0.5;
        p.y += p.vy + Math.cos(p.turbulence) * 0.2;
        p.alpha = Math.max(0, p.alpha - p.fadeSpeed);

        ctx.fillStyle = `rgba(244, 152, 176, ${p.alpha * 0.95})`;
        ctx.shadowColor = 'rgba(244, 152, 176, 0.45)';
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

  const shouldRotate = isMobile && isPortrait;

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#000000] flex items-center justify-center select-none overflow-hidden z-40 m-0 p-0">
      {/* Particle Canvas for Letter Dissolution */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full pointer-events-none z-30"
      />

      {/* HTML Text container (hidden when dissolving) */}
      <div
        ref={containerRef}
        className={`relative z-20 flex flex-wrap items-center justify-center text-center px-6 transition-opacity duration-300 ${
          isDissolving ? 'opacity-0' : 'opacity-100'
        } ${shouldRotate ? 'rotate-90 origin-center max-w-[85vh]' : 'max-w-4xl'}`}
        style={{
          color: '#f498b0',
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
          letterSpacing: '0.04em',
          textShadow: '0 0 28px rgba(244, 152, 176, 0.35)',
        }}
      >
        <p className="text-xl sm:text-2xl md:text-4xl lg:text-5xl leading-relaxed md:leading-loose font-normal">
          {DEDICATION_WORDS.map((word, idx) => (
            <span
              key={`open-word-${idx}`}
              ref={(el) => (wordsRef.current[idx] = el)}
              className="inline-block mr-[0.28em] last:mr-0 opacity-0 invisible"
              style={{
                opacity: 0,
                visibility: 'hidden',
                transform: 'translateY(5px)',
                filter: 'blur(3px)',
              }}
            >
              {word}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
