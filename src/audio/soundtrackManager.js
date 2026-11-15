import gsap from 'gsap';
import { AUDIO_CONFIG } from '../config/audioConfig';

class SoundtrackManager {
  constructor() {
    this.audio = null;
    this.isPlaying = false;
    this.fadeTween = null;
    this.hasUnlocked = false;
    this.pendingPlay = false;
  }

  getAudio() {
    if (!this.audio && typeof window !== 'undefined') {
      this.audio = new Audio(AUDIO_CONFIG.soundtrackSrc);
      this.audio.preload = 'auto';
      this.audio.loop = true;
      this.audio.volume = AUDIO_CONFIG.masterVolume;

      // Setup browser autoplay policy unlocker
      const unlockAudio = () => {
        this.hasUnlocked = true;
        if (this.pendingPlay && this.audio) {
          this.audio.play().catch(() => {});
          this.pendingPlay = false;
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
      };

      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });
      window.addEventListener('click', unlockAudio, { passive: true });
      window.addEventListener('keydown', unlockAudio, { passive: true });

      // Expose for testing and verification
      window.__SOUNDTRACK__ = this;
      window.__SOUNDTRACK_AUDIO__ = this.audio;
    }
    return this.audio;
  }

  play() {
    const audio = this.getAudio();
    if (!audio) return;

    if (this.fadeTween) {
      this.fadeTween.kill();
      this.fadeTween = null;
    }

    audio.volume = AUDIO_CONFIG.masterVolume;
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.pendingPlay = false;
        })
        .catch(() => {
          // Autoplay blocked by browser policy; wait for first user gesture
          this.pendingPlay = true;
          this.isPlaying = false;
        });
    }
  }

  fadeOut(duration = AUDIO_CONFIG.fadeDuration) {
    const audio = this.getAudio();
    if (!audio || !this.isPlaying) return;

    if (this.fadeTween) {
      this.fadeTween.kill();
    }

    const volumeObj = { vol: audio.volume };
    this.fadeTween = gsap.to(volumeObj, {
      vol: 0,
      duration: duration,
      ease: 'power1.out',
      onUpdate: () => {
        if (this.audio) {
          this.audio.volume = Math.max(0, volumeObj.vol);
        }
      },
      onComplete: () => {
        if (this.audio) {
          this.audio.pause();
          this.audio.currentTime = 0;
          this.isPlaying = false;
          this.pendingPlay = false;
        }
      },
    });
  }

  stop() {
    if (this.fadeTween) {
      this.fadeTween.kill();
      this.fadeTween = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio.volume = AUDIO_CONFIG.masterVolume;
    }
    this.isPlaying = false;
    this.pendingPlay = false;
  }
}

export const soundtrack = new SoundtrackManager();
