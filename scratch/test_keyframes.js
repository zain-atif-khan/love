import gsap from 'gsap';

const animState = {
  reveal: 0,
  offer: 0,
  freeze: 0,
  dissolve: 0,
  alpha: 1.0
};

const tl = gsap.timeline();
tl.to(animState, {
  keyframes: [
    { reveal: 0.18, duration: 2.8, ease: 'power2.out' }, // Scene 1
    { duration: 0.6 },                                   // Pause
    { reveal: 0.31, duration: 1.8, ease: 'power2.inOut' },// Scene 2: Hand
    { duration: 0.4 },                                   // Pause
    { reveal: 0.58, duration: 3.4, ease: 'power2.inOut' },// Scene 3: Man
    { duration: 0.4 },                                   // Pause
    { reveal: 0.88, duration: 3.4, ease: 'power2.inOut' },// Scene 4: Girl
    { duration: 0.8 },                                   // Pause
    { offer: 1.0, duration: 3.5, ease: 'power1.inOut' }, // Scene 5: Offer
    { freeze: 1.0, duration: 0.05 },                     // Scene 6: Freeze
    { duration: 2.0 },                                   // Hold freeze
    { freeze: 0.0, duration: 0.05 },                     // Unfreeze
    { dissolve: 1.0, duration: 3.2, ease: 'power2.in' }, // Scene 7: Dissolve
    { alpha: 0.0, duration: 1.2, ease: 'power2.in' },    // Blackout
    { duration: 2.0 }                                    // Hold black
  ]
});

console.log('Total Duration:', tl.duration());

for (const t of [2.0, 4.5, 8.0, 12.0, 15.5, 18.0, 20.5, 23.0]) {
  tl.seek(t);
  console.log(`t=${t.toFixed(1)}:`, { ...animState });
}
