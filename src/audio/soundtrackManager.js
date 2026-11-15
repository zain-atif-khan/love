import gsap from 'gsap';
import { AUDIO_CONFIG } from '../config/audioConfig';

class SoundtrackManager {
  constructor() {
    this.audio = null;
    this.audioContext = null;
    this.gainNode = null;
    this.sourceNode = null;
    this.isPlaying = false;
    this.isAutoplayBlocked = false;
    this.shouldBePlaying = false;
    this.hasUnlocked = false;
    this.currentVolume = 0.05;
    this.volumeTween = null;
    this.fadeTween = null;
    this.subscribers = new Set();

    // Attach global user interaction listeners from startup
    if (typeof window !== 'undefined') {
      const handleUserGesture = () => {
        this.unlock();
      };
      window.addEventListener('pointerdown', handleUserGesture, { capture: true, passive: true });
      window.addEventListener('touchstart', handleUserGesture, { capture: true, passive: true });
      window.addEventListener('click', handleUserGesture, { capture: true, passive: true });
      window.addEventListener('keydown', handleUserGesture, { capture: true, passive: true });
    }
  }

  /**
   * Subscribe to state changes (e.g., autoplay blocked status)
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    callback({
      isPlaying: this.isPlaying,
      isAutoplayBlocked: this.isAutoplayBlocked,
      volume: this.currentVolume,
    });
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach((cb) => {
      try {
        cb({
          isPlaying: this.isPlaying,
          isAutoplayBlocked: this.isAutoplayBlocked,
          volume: this.currentVolume,
        });
      } catch (err) {
        console.error('Soundtrack subscriber error:', err);
      }
    });
  }

  /**
   * Lazy-initializes the persistent HTML5 Audio element with mobile-friendly attributes
   */
  getAudio() {
    if (!this.audio && typeof window !== 'undefined') {
      const audio = new Audio();
      audio.src = AUDIO_CONFIG.soundtrackSrc;
      audio.preload = 'auto';
      audio.loop = false; // The full song is 2m 56s, plays naturally
      audio.crossOrigin = 'anonymous';
      
      // Critical attributes for iOS Safari & Android mobile playback
      audio.playsInline = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      
      // Initial volume strictly 5% (0.05)
      audio.volume = 0.05;
      this.currentVolume = 0.05;
      this.audio = audio;

      // Handle natural end or unexpected pauses
      audio.addEventListener('ended', () => {
        this.isPlaying = false;
        this.notifySubscribers();
      });

      // Expose globally for diagnostics and verification
      window.__SOUNDTRACK__ = this;
      window.__SOUNDTRACK_AUDIO__ = this.audio;
    }
    return this.audio;
  }

  /**
   * Pre-warms / unlocks audio on first user touch/click anywhere on page
   */
  unlock() {
    this.hasUnlocked = true;
    const audio = this.getAudio();

    // If Web Audio is active, resume the AudioContext
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    // If main proposal animation is running and sound was blocked, start it immediately
    if (this.shouldBePlaying && (!this.isPlaying || (audio && audio.paused))) {
      this.play();
    }
  }

  /**
   * Sets the volume uniformly across standard HTMLAudio and Web Audio gain node
   */
  setVolume(vol) {
    const clamped = Math.max(0, Math.min(1, vol));
    this.currentVolume = clamped;

    if (this.gainNode && this.audioContext) {
      try {
        if (this.audio) this.audio.volume = 1.0;
        this.gainNode.gain.setValueAtTime(clamped, this.audioContext.currentTime);
      } catch (e) {
        if (this.audio) this.audio.volume = clamped;
      }
    } else if (this.audio) {
      try {
        this.audio.volume = clamped;
      } catch (e) {}
    }
    this.notifySubscribers();
  }

  /**
   * Starts playing Stephen Sanchez — Until I Found You
   * with the exact gradual volume progression requested.
   */
  play() {
    this.shouldBePlaying = true;
    const audio = this.getAudio();
    if (!audio) return;

    // If already playing smoothly, do NOT restart or reset currentTime!
    if (this.isPlaying && !audio.paused) {
      return;
    }

    if (this.fadeTween) {
      this.fadeTween.kill();
      this.fadeTween = null;
    }

    // Always start playback at strictly 5% volume (never 20%)
    this.setVolume(0.05);

    // Resume AudioContext if suspended
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(() => {});
    }

    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.isAutoplayBlocked = false;
          this.notifySubscribers();
          this.startVolumeProgression();
        })
        .catch((err) => {
          // Autoplay blocked by mobile browser; user tap required to unlock
          console.warn('Autoplay restricted by browser policy:', err);
          this.isPlaying = false;
          this.isAutoplayBlocked = true;
          this.notifySubscribers();
        });
    }
  }

  /**
   * Exact Volume Progression Table:
   * Time   | Volume
   * 0 sec  | 5%   (0.05)
   * 1 sec  | 10%  (0.10)
   * 2 sec  | 15%  (0.15)
   * 3 sec  | 20%  (0.20)
   * 4 sec  | 25%  (0.25)
   * 5 sec  | 30%  (0.30)
   * 6 sec  | 35%  (0.35)
   * 7 sec  | 40%  (0.40)
   * 8 sec  | 45%  (0.45)
   * 9 sec  | 50%  (0.50)
   * 10 sec | 55%  (0.55)
   * 11 sec | 60%  (0.60)
   * 12 sec | 65%  (0.65)
   * 13 sec | 70%  (0.70)
   * 14 sec | 75%  (0.75)
   * 15 sec | 80%  (0.80)
   * Continuing gradually until reaching 100% (1.00) at 19s.
   * Uses continuous smooth linear interpolation (no sudden jumps).
   */
  startVolumeProgression() {
    if (this.volumeTween) {
      this.volumeTween.kill();
      this.volumeTween = null;
    }

    // Explicitly enforce 5% volume at t=0
    this.setVolume(0.05);

    const volState = { vol: 0.05 };
    // Continuous smooth linear ramp from 0.05 to 1.00 over 19 seconds:
    // (1.00 - 0.05) / 19 = 0.05 per second, matching every single row of the specification
    this.volumeTween = gsap.to(volState, {
      vol: AUDIO_CONFIG.masterVolume, // 1.0 (100%)
      duration: 19.0,
      ease: 'none',
      onUpdate: () => {
        this.setVolume(volState.vol);
      },
    });
  }

  /**
   * Gently fade out only after the entire final romantic ending has completed.
   */
  fadeAfterEnding(duration = AUDIO_CONFIG.finalFadeDuration) {
    const audio = this.getAudio();
    if (!audio || !this.isPlaying) return;

    if (this.volumeTween) {
      this.volumeTween.kill();
      this.volumeTween = null;
    }
    if (this.fadeTween) {
      this.fadeTween.kill();
      this.fadeTween = null;
    }

    const volState = { vol: this.currentVolume };
    this.fadeTween = gsap.to(volState, {
      vol: 0,
      duration: duration,
      ease: 'power1.out',
      onUpdate: () => {
        this.setVolume(volState.vol);
      },
      onComplete: () => {
        if (this.audio) {
          this.audio.pause();
          this.isPlaying = false;
          this.notifySubscribers();
        }
      },
    });
  }

  stop() {
    if (this.volumeTween) this.volumeTween.kill();
    if (this.fadeTween) this.fadeTween.kill();
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    this.isPlaying = false;
    this.shouldBePlaying = false;
    this.notifySubscribers();
  }
}

export const soundtrack = new SoundtrackManager();
