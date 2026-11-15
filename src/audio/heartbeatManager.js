/**
 * Heartbeat Audio Manager
 * Provides realistic, soft acoustic double-beat ("lub-dub... lub-dub...")
 * Intimately synchronized with the proposal offering moment.
 */
class HeartbeatManager {
  constructor() {
    this.audio = null;
    this.hasTriggered = false;
    this.volume = 0.28; // Soft, intimate volume under the main soundtrack
  }

  getAudio() {
    if (!this.audio && typeof window !== 'undefined') {
      const audio = new Audio('/heartbeat.mp3');
      audio.preload = 'auto';
      audio.loop = false;
      audio.volume = this.volume;
      audio.playsInline = true;
      audio.setAttribute('playsinline', 'true');
      audio.setAttribute('webkit-playsinline', 'true');
      this.audio = audio;
    }
    return this.audio;
  }

  play() {
    if (this.hasTriggered) return;
    this.hasTriggered = true;

    const audio = this.getAudio();
    if (!audio) return;

    try {
      audio.currentTime = 0;
      audio.volume = this.volume;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch((err) => {
          console.warn('Heartbeat playback deferred by browser policy:', err);
        });
      }
    } catch (err) {
      console.warn('Heartbeat play error:', err);
    }
  }

  reset() {
    this.hasTriggered = false;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  stop() {
    this.reset();
  }
}

export const heartbeat = new HeartbeatManager();
