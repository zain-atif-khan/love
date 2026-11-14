import React, { useRef } from 'react';
import { CodeEditor } from './components/CodeEditor';
import { ParticleScene } from './components/ParticleScene';
import { TypographyOverlay } from './components/TypographyOverlay';

export default function App() {
  const textOverlayRef = useRef(null);

  return (
    <main className="flex h-screen w-screen bg-[#08050F] overflow-hidden select-none">
      {/* LEFT PANEL: ~25% width authentic dark code editor */}
      <aside className="w-[26%] min-w-[280px] max-w-[420px] h-full hidden md:block shrink-0 z-10">
        <CodeEditor />
      </aside>

      {/* RIGHT PANEL: ~75% width Three.js WebGL generative artwork */}
      <section className="flex-1 h-full relative overflow-hidden bg-[#08050F]">
        {/* Typographic Serif Quote Overlay */}
        <TypographyOverlay ref={textOverlayRef} />

        {/* Real-time GPU Particle Art Experience */}
        <ParticleScene textOverlayRef={textOverlayRef} />
      </section>
    </main>
  );
}
