import React, { useRef, useEffect, useState, useMemo } from 'react';
import gsap from 'gsap';
import { MasterRoseExperience } from '../scene/MasterRoseExperience';
import { soundtrack } from '../audio/soundtrackManager';

const WAITING_WORDS = ["Because", "the", "beautiful", "things", "take", "time."];

export function ExtendedEnding({
  isMobile = false,
  isPortrait = false,
  onReplay,
}) {
  const containerRef = useRef(null);
  const scrollTrackRef = useRef(null);
  const finaleTimelineRef = useRef(null);
  const hasTriggeredFinaleRef = useRef(false);

  // Scroll Progress State: 0.0 to 1.0 based on real vertical document scroll
  const [scrollProgress, setScrollProgress] = useState(0);

  // Finale State: controlled by continuous automatic GSAP timeline once triggered
  const [finalePhase, setFinalePhase] = useState('IDLE'); // 'IDLE' | 'WAITING' | 'DISSOLVING' | 'COUNTDOWN' | 'ROSE_FORMING' | 'ROSE_SETTLED'
  const [waitTextOpacity, setWaitTextOpacity] = useState(0);
  const [sentenceWordIndex, setSentenceWordIndex] = useState(0);
  const [sentenceOpacity, setSentenceOpacity] = useState(0);
  const [isDissolving, setIsDissolving] = useState(false);
  const [dissolveBlur, setDissolveBlur] = useState(0);
  const [countdownNum, setCountdownNum] = useState(null);
  const [countdownScale, setCountdownScale] = useState(0.9);
  const [countdownOpacity, setCountdownOpacity] = useState(0);
  const [isPinned, setIsPinned] = useState(false);
  const [roseFormationProgress, setRoseFormationProgress] = useState(0);
  const [roseCanvasOpacity, setRoseCanvasOpacity] = useState(0);

  // Dissolution stardust particles generated once
  const stardustSparks = useMemo(() => {
    const sparks = [];
    for (let i = 0; i < 45; i++) {
      sparks.push({
        id: i,
        x: (Math.random() - 0.5) * 420,
        y: (Math.random() - 0.5) * 120,
        dx: (Math.random() - 0.5) * 160,
        dy: -40 - Math.random() * 80,
        size: 1.5 + Math.random() * 2.5,
        opacity: 0.5 + Math.random() * 0.5,
      });
    }
    return sparks;
  }, []);

  // Master scroll listener tracking physical parchment letter
  useEffect(() => {
    const track = scrollTrackRef.current;
    if (!track) return;

    const handleScroll = () => {
      // If pinned, lock scroll
      if (isPinned) return;

      const scrollTop = track.scrollTop;
      const maxScroll = track.scrollHeight - track.clientHeight;
      if (maxScroll <= 0) return;
      const progress = Math.min(1.0, Math.max(0.0, scrollTop / maxScroll));
      setScrollProgress(progress);

      // Trigger automatic finale sequence once user scrolls past "One more scroll..." (progress >= 0.48)
      if (progress >= 0.46 && !hasTriggeredFinaleRef.current) {
        startAutomaticFinale();
      }
    };

    track.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      track.removeEventListener('scroll', handleScroll);
    };
  }, [isPinned]);

  // Master Function: Starts the Automatic Pinned Sequence
  // WAITING MESSAGE -> MESSAGE DISSOLVES -> PINNED COUNTDOWN (3, 2, 1, 0) -> UNPIN -> ROSE FORMATION
  const startAutomaticFinale = () => {
    if (hasTriggeredFinaleRef.current) return;
    hasTriggeredFinaleRef.current = true;

    // Pin viewport to prevent any accidental user scroll jitter
    setIsPinned(true);
    setFinalePhase('WAITING');

    // Audio hush during intimate waiting message
    soundtrack.setReadingVolume(0.24, 1.5);

    const tl = gsap.timeline({
      onComplete: () => {
        setFinalePhase('ROSE_SETTLED');
      },
    });
    finaleTimelineRef.current = tl;

    // STEP 1 — WAITING MESSAGE
    // 0.0s - 0.9s: "Wait..." fades in
    const animObj = {
      waitOp: 0,
      sentenceOp: 0,
      wordIdx: 0,
      dissolveBlur: 0,
      dissolveProgress: 0,
      cdNum: null,
      cdScale: 0.9,
      cdOp: 0,
      roseFormation: 0,
      roseCanvasOp: 0,
    };

    // "Wait..." appears first
    tl.to(animObj, {
      waitOp: 1.0,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => setWaitTextOpacity(animObj.waitOp),
    }, 0.0);

    // Hold "Wait..." briefly
    // 1.4s - 3.4s: Reveal second sentence word-by-word
    tl.to(animObj, {
      sentenceOp: 1.0,
      duration: 0.5,
      ease: 'power1.out',
      onUpdate: () => setSentenceOpacity(animObj.sentenceOp),
    }, 1.4);

    tl.to(animObj, {
      wordIdx: WAITING_WORDS.length,
      duration: 2.0,
      ease: 'none',
      onUpdate: () => setSentenceWordIndex(Math.floor(animObj.wordIdx)),
    }, 1.4);

    // Reading hold: 3.4s - 5.0s (1.6 seconds of peaceful appreciation)
    tl.to({}, { duration: 1.6 }, 3.4);

    // STEP 2 — MESSAGE DISSOLVES
    // 5.0s - 6.2s: Gradually dissolve both lines into tiny blush-pink particles & blur away
    tl.add(() => {
      setFinalePhase('DISSOLVING');
      setIsDissolving(true);
    }, 5.0);

    tl.to(animObj, {
      waitOp: 0,
      sentenceOp: 0,
      dissolveBlur: 10,
      dissolveProgress: 1.0,
      duration: 1.2,
      ease: 'power2.in',
      onUpdate: () => {
        setWaitTextOpacity(animObj.waitOp);
        setSentenceOpacity(animObj.sentenceOp);
        setDissolveBlur(animObj.dissolveBlur);
      },
    }, 5.0);

    // Hold black screen very briefly (6.2s - 6.7s)
    tl.add(() => {
      setIsDissolving(false);
      setFinalePhase('COUNTDOWN');
    }, 6.2);
    tl.to({}, { duration: 0.5 }, 6.2);

    // STEP 3 & 4 — AUTOMATIC PINNED COUNTDOWN (3, 2, 1, 0)
    // 6.7s - 7.9s: Number 3
    tl.add(() => setCountdownNum(3), 6.7);
    tl.fromTo(animObj,
      { cdScale: 0.86, cdOp: 0 },
      {
        cdScale: 1.02,
        cdOp: 1.0,
        duration: 0.7,
        ease: 'power2.out',
        onUpdate: () => {
          setCountdownScale(animObj.cdScale);
          setCountdownOpacity(animObj.cdOp);
        },
      },
      6.7
    );
    tl.to(animObj, {
      cdOp: 0,
      cdScale: 1.06,
      duration: 0.45,
      ease: 'power2.in',
      onUpdate: () => {
        setCountdownScale(animObj.cdScale);
        setCountdownOpacity(animObj.cdOp);
      },
    }, 7.45);

    // 7.9s - 9.1s: Number 2
    tl.add(() => setCountdownNum(2), 7.9);
    tl.fromTo(animObj,
      { cdScale: 0.86, cdOp: 0 },
      {
        cdScale: 1.02,
        cdOp: 1.0,
        duration: 0.7,
        ease: 'power2.out',
        onUpdate: () => {
          setCountdownScale(animObj.cdScale);
          setCountdownOpacity(animObj.cdOp);
        },
      },
      7.9
    );
    tl.to(animObj, {
      cdOp: 0,
      cdScale: 1.06,
      duration: 0.45,
      ease: 'power2.in',
      onUpdate: () => {
        setCountdownScale(animObj.cdScale);
        setCountdownOpacity(animObj.cdOp);
      },
    }, 8.65);

    // 9.1s - 10.3s: Number 1
    tl.add(() => setCountdownNum(1), 9.1);
    tl.fromTo(animObj,
      { cdScale: 0.86, cdOp: 0 },
      {
        cdScale: 1.02,
        cdOp: 1.0,
        duration: 0.7,
        ease: 'power2.out',
        onUpdate: () => {
          setCountdownScale(animObj.cdScale);
          setCountdownOpacity(animObj.cdOp);
        },
      },
      9.1
    );
    tl.to(animObj, {
      cdOp: 0,
      cdScale: 1.06,
      duration: 0.45,
      ease: 'power2.in',
      onUpdate: () => {
        setCountdownScale(animObj.cdScale);
        setCountdownOpacity(animObj.cdOp);
      },
    }, 9.85);

    // 10.3s - 11.5s: Number 0
    tl.add(() => setCountdownNum(0), 10.3);
    tl.fromTo(animObj,
      { cdScale: 0.86, cdOp: 0 },
      {
        cdScale: 1.02,
        cdOp: 1.0,
        duration: 0.7,
        ease: 'power2.out',
        onUpdate: () => {
          setCountdownScale(animObj.cdScale);
          setCountdownOpacity(animObj.cdOp);
        },
      },
      10.3
    );
    tl.to(animObj, {
      cdOp: 0,
      cdScale: 1.06,
      duration: 0.45,
      ease: 'power2.in',
      onUpdate: () => {
        setCountdownScale(animObj.cdScale);
        setCountdownOpacity(animObj.cdOp);
      },
    }, 11.05);

    // STEP 5 — UNPIN AND AUTOMATICALLY START THE ROSE IMMEDIATELY
    tl.add(() => {
      setCountdownNum(null);
      setIsPinned(false); // Unpin section
      setFinalePhase('ROSE_FORMING');
      // Climax music swell for the rose
      soundtrack.setClimaxVolume(0.60, 2.5);
    }, 11.5);

    // Rose canvas layer fades in
    tl.to(animObj, {
      roseCanvasOp: 1.0,
      duration: 0.4,
      ease: 'power1.out',
      onUpdate: () => setRoseCanvasOpacity(animObj.roseCanvasOp),
    }, 11.5);

    // Rose formation: 0.0 -> 1.0 automatically over 4.2 seconds
    // Particles rise from below viewport, assemble stem, leaves, outer petals, curled bud
    tl.to(animObj, {
      roseFormation: 1.0,
      duration: 4.2,
      ease: 'power2.out',
      onUpdate: () => setRoseFormationProgress(animObj.roseFormation),
    }, 11.6);
  };

  // Expose state and timeline controls for verification and replay
  useEffect(() => {
    window.__CURRENT_SCROLL_PROGRESS__ = scrollProgress;
    window.__FINALE_PHASE__ = finalePhase;
    window.__COUNTDOWN_NUMBER__ = countdownNum;
    window.__ROSE_FORMATION__ = roseFormationProgress;
    window.__ROSE_CANVAS_OPACITY__ = roseCanvasOpacity;
    window.__FINALE_TIMELINE__ = finaleTimelineRef.current;
    window.__START_AUTOMATIC_FINALE__ = startAutomaticFinale;
  });

  useEffect(() => {
    window.__EXTENDED_ENDING_SCROLL_TO__ = (target) => {
      const track = scrollTrackRef.current;
      if (!track) return;
      const maxScroll = track.scrollHeight - track.clientHeight;
      track.scrollTop = target * maxScroll;
      setScrollProgress(target);
      if (target >= 0.46 && !hasTriggeredFinaleRef.current) {
        startAutomaticFinale();
      }
    };
    return () => {
      delete window.__EXTENDED_ENDING_SCROLL_TO__;
    };
  }, []);

  // Initial invitation fade (0.0 -> 0.08)
  const initialInviteOpacity = Math.max(0, 1.0 - scrollProgress / 0.08);

  // "One more scroll..." prompt visibility (0.42 -> 0.46, fades when finale triggers)
  let oneMoreScrollOpacity = 0;
  if (scrollProgress >= 0.42 && scrollProgress < 0.46) {
    oneMoreScrollOpacity = Math.min(1.0, (scrollProgress - 0.42) / 0.035);
  } else if (finalePhase !== 'IDLE') {
    oneMoreScrollOpacity = 0;
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 w-screen h-screen bg-[#000000] select-none overflow-hidden z-40 m-0 p-0"
    >
      {/* ========================================================================= */}
      {/* 3D WEBGL MASTER PARTICLE ROSE LAYER                                       */}
      {/* Exact recreation of reference rose, pure black background                 */}
      {/* ========================================================================= */}
      <div
        className="fixed inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-300"
        style={{ opacity: roseCanvasOpacity }}
      >
        <MasterRoseExperience
          formationProgress={roseFormationProgress}
          isMobile={isMobile}
          isPortrait={isPortrait}
        />
      </div>

      {/* ========================================================================= */}
      {/* PINNED OVERLAY FOR AUTOMATIC FINALE (COUNTDOWN & WAITING MESSAGE)        */}
      {/* Pure black background, centered cinematic blush-pink typography           */}
      {/* ========================================================================= */}

      {/* 1. WAITING MESSAGE OVERLAY */}
      {(waitTextOpacity > 0.01 || sentenceOpacity > 0.01 || isDissolving) && (
        <div className="fixed inset-0 flex flex-col items-center justify-center pointer-events-none z-30 select-none px-6 text-center">
          {/* Stardust dissolution particles */}
          {isDissolving && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {stardustSparks.map((s) => (
                <span
                  key={s.id}
                  className="absolute left-1/2 top-1/2 rounded-full bg-[#f498b0] animate-pulse"
                  style={{
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                    transform: `translate(${s.x + s.dx * 0.5}px, ${s.y + s.dy * 0.5}px)`,
                    opacity: s.opacity,
                    boxShadow: '0 0 10px rgba(244, 152, 176, 0.8)',
                    transition: 'all 1.2s cubic-bezier(0.1, 0.8, 0.2, 1)',
                  }}
                />
              ))}
            </div>
          )}

          {/* "Wait..." */}
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-serif italic text-[#f498b0] mb-6 transition-all"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              opacity: waitTextOpacity,
              filter: `blur(${dissolveBlur}px)`,
              textShadow: '0 0 24px rgba(244, 152, 176, 0.45)',
              letterSpacing: '0.04em',
            }}
          >
            Wait...
          </h2>

          {/* "Because the beautiful things take time." Word-by-word reveal */}
          <div
            className="flex flex-wrap items-center justify-center gap-x-2 text-2xl sm:text-3xl md:text-4xl font-serif italic text-[#f498b0] max-w-2xl transition-all"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              opacity: sentenceOpacity,
              filter: `blur(${dissolveBlur}px)`,
              textShadow: '0 0 24px rgba(244, 152, 176, 0.40)',
              letterSpacing: '0.03em',
            }}
          >
            {WAITING_WORDS.map((word, idx) => {
              const isWordVisible = idx < sentenceWordIndex;
              return (
                <span
                  key={idx}
                  className="transition-all duration-300 transform inline-block"
                  style={{
                    opacity: isWordVisible ? 1 : 0,
                    transform: isWordVisible ? 'translateY(0)' : 'translateY(8px)',
                    filter: isWordVisible ? 'blur(0px)' : 'blur(4px)',
                  }}
                >
                  {word}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. AUTOMATIC COUNTDOWN OVERLAY (3, 2, 1, 0) */}
      {countdownNum !== null && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-30 select-none">
          <span
            className="text-7xl sm:text-8xl md:text-9xl font-serif italic text-[#f498b0] transition-all"
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              opacity: countdownOpacity,
              transform: `scale(${countdownScale})`,
              textShadow: '0 0 40px rgba(244, 152, 176, 0.60)',
            }}
          >
            {countdownNum}
          </span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MASTER NATIVE SCROLL CONTAINER                                            */}
      {/* ========================================================================= */}
      <div
        ref={scrollTrackRef}
        className={`fixed inset-0 w-full h-full overflow-y-auto overflow-x-hidden z-20 ${
          isPinned ? 'pointer-events-none' : 'pointer-events-auto'
        }`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* SECTION 1: Initial Screen — Pure Black with "Scroll to reveal" (100vh) */}
        <section className="w-full h-screen min-h-screen flex flex-col items-center justify-center relative select-none">
          <div
            className="flex flex-col items-center justify-center text-center transition-opacity duration-300 pointer-events-none"
            style={{
              opacity: initialInviteOpacity,
              color: '#f498b0',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              letterSpacing: '0.08em',
              textShadow: '0 0 20px rgba(244, 152, 176, 0.40)',
            }}
          >
            <span className="text-2xl sm:text-3xl md:text-4xl animate-pulse">
              Scroll to reveal
            </span>
            <span className="text-sm mt-3 text-[#f498b0]/60 tracking-widest uppercase">
              ↓
            </span>
          </div>
        </section>

        {/* SECTION 2: Physical Handwritten Love Letter in genuine document flow */}
        {/* Entire sheet physically travels upward across viewport from below */}
        <section className="w-full flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 py-8 sm:py-16 md:py-24 relative select-none">
          <div
            className="relative w-full max-w-md sm:max-w-lg md:max-w-xl transition-all duration-300 rounded-md"
            style={{
              boxShadow:
                '0 25px 70px rgba(0, 0, 0, 0.95), 0 0 40px rgba(210, 180, 140, 0.18)',
            }}
          >
            <img
              src="/love_letter.jpg"
              alt="Handwritten Love Letter"
              className="w-full h-auto block select-none pointer-events-none rounded-md"
              loading="eager"
            />
          </div>
        </section>

        {/* SECTION 3: "One more scroll..." Section */}
        <section className="w-full min-h-[90vh] flex flex-col items-center justify-center relative select-none">
          <div
            className="flex flex-col items-center justify-center text-center transition-opacity duration-300 pointer-events-none"
            style={{
              opacity: oneMoreScrollOpacity,
              color: '#f498b0',
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontStyle: 'italic',
              letterSpacing: '0.06em',
              textShadow: '0 0 20px rgba(244, 152, 176, 0.40)',
            }}
          >
            <span className="text-2xl sm:text-3xl md:text-4xl animate-pulse">
              One more scroll...
            </span>
            <span className="text-xs mt-3 text-[#f498b0]/60 tracking-widest uppercase">
              ↓
            </span>
          </div>
        </section>

        {/* SECTION 4: Extended padding section */}
        <section className="w-full h-[120vh] relative pointer-events-none" />
      </div>
    </div>
  );
}
