import React, { useRef, useImperativeHandle, forwardRef } from 'react';

export const TypographyOverlay = forwardRef(function TypographyOverlay(props, ref) {
  const fullText = "Too Many Thoughts, Not Enough Vases.";
  const textSpanRef = useRef(null);
  const cursorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    setProgress(progress) {
      if (textSpanRef.current) {
        const p = Math.max(0, Math.min(1, progress));
        const count = Math.floor(p * fullText.length);
        textSpanRef.current.textContent = fullText.slice(0, count);
        
        if (cursorRef.current) {
          if (count > 0 && count < fullText.length) {
            cursorRef.current.style.opacity = '1';
          } else {
            cursorRef.current.style.opacity = '0';
          }
        }
      }
    },
    reset() {
      if (textSpanRef.current) {
        textSpanRef.current.textContent = '';
      }
      if (cursorRef.current) {
        cursorRef.current.style.opacity = '0';
      }
    }
  }));

  return (
    <div className="absolute top-[6%] left-0 right-0 z-20 pointer-events-none select-none text-center w-full">
      <h1 
        className="font-serif-quote text-[22px] md:text-[25px] lg:text-[27px] tracking-[0.035em] font-normal text-[#f6e7ee] drop-shadow-[0_0_14px_rgba(255,165,205,0.4)]"
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontStyle: 'italic',
        }}
      >
        <span ref={textSpanRef}></span>
        <span 
          ref={cursorRef} 
          className="inline-block w-[1.5px] h-[0.9em] bg-[#ffa5cd] ml-1 align-baseline transition-opacity duration-150"
          style={{ opacity: 0 }}
        />
      </h1>
    </div>
  );
});
