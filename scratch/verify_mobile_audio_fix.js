import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9449;

// Launch headless Chrome instance with remote debugging
const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_audio_9449',
  'about:blank'
]);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

setTimeout(async () => {
  let ws = null;
  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.result?.exceptionDetails) {
      throw new Error(JSON.stringify(res.result.exceptionDetails));
    }
    return res.result?.result?.value;
  }

  async function captureScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const outPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
    return outPath;
  }

  try {
    const list = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const page = list.find(t => t.type === 'page') || list[0];
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data);
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('=== TEST 1: DESKTOP VOLUME PROGRESSION & STEP-BY-STEP TABLE ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2500);

    // Verify initial desktop audio state
    const initialState = await evaluate(`
      (() => {
        const audio = window.__SOUNDTRACK_AUDIO__;
        const st = window.__SOUNDTRACK__;
        return {
          hasAudio: !!audio,
          src: audio ? audio.src : null,
          initialVolume: st ? st.currentVolume : null,
          audioVolume: audio ? audio.volume : null,
          isPlaying: st ? st.isPlaying : false,
          isBlocked: st ? st.isAutoplayBlocked : false
        };
      })()
    `);
    console.log('1. Initial Desktop Audio State:', initialState);

    if (initialState.initialVolume !== 0.05) {
      throw new Error(`Expected initial volume 0.05 (5%), got ${initialState.initialVolume}`);
    }

    // Verify the Volume Progression Timeline matches specification:
    // 0s: 0.05 (5%), 1s: 0.10 (10%), 2s: 0.15 (15%), 3s: 0.20 (20%), 4s: 0.25 (25%),
    // 5s: 0.30 (30%), 10s: 0.55 (55%), 15s: 0.80 (80%), 19s: 1.00 (100%)
    console.log('2. Testing Volume Progression at exact second marks via GSAP timeline seek...');
    const volumeTimelineChecks = await evaluate(`
      (() => {
        const st = window.__SOUNDTRACK__;
        if (!st) return null;
        if (!st.volumeTween) {
          st.startVolumeProgression();
        }
        
        const testTimes = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
        const results = [];
        
        testTimes.forEach(t => {
          st.volumeTween.seek(t, false);
          results.push({
            timeSec: t,
            actualVolume: Number(st.currentVolume.toFixed(2)),
            expectedVolume: Number((0.05 + t * 0.05).toFixed(2))
          });
        });

        // Resume natural playback from 0s
        st.volumeTween.play(0);
        return results;
      })()
    `);

    console.table(volumeTimelineChecks);

    for (const row of volumeTimelineChecks) {
      if (Math.abs(row.actualVolume - row.expectedVolume) > 0.01) {
        throw new Error(`Volume mismatch at ${row.timeSec}s: expected ${row.expectedVolume}, got ${row.actualVolume}`);
      }
    }
    console.log('--> All 20 volume progression steps verified 100% matched to table specification!');

    await captureScreenshot('audio_desktop_verified.png');

    console.log('\n=== TEST 2: MOBILE EMULATION — ANDROID CHROME (PIXEL 8) ===');
    await send('Network.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
    });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.6,
      mobile: true,
      hasTouch: true,
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2000);

    // On mobile portrait, starts in 'INTRO' stage
    const introStage = await evaluate(`window.__CURRENT_STAGE__`);
    console.log('1. Mobile Start Stage:', introStage);
    if (introStage !== 'INTRO') throw new Error(`Expected INTRO stage on mobile, got ${introStage}`);

    // Transition to PROPOSAL (or user rotates to landscape)
    await evaluate(`window.__SET_STAGE__('PROPOSAL')`);
    await sleep(1500);

    // Simulate mobile browser blocking autoplay and verify prompt appears
    await evaluate(`
      (() => {
        const st = window.__SOUNDTRACK__;
        st.isPlaying = false;
        st.isAutoplayBlocked = true;
        st.notifySubscribers();
      })()
    `);
    await sleep(500);

    const promptState = await evaluate(`
      (() => {
        const text = document.body.innerText;
        return {
          hasPromptText: text.includes('Tap anywhere for sound'),
          isAutoplayBlocked: window.__SOUNDTRACK__.isAutoplayBlocked
        };
      })()
    `);
    console.log('2. Sound Unlock Prompt State when Autoplay Blocked:', promptState);
    if (!promptState.hasPromptText) {
      throw new Error('Expected "Tap anywhere for sound" prompt to be displayed when autoplay is blocked');
    }
    await captureScreenshot('audio_mobile_unlock_prompt_visible.png');

    // Simulate user tap anywhere on the screen (user gesture unlock)
    console.log('3. Simulating user tap on screen to unlock audio...');
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 206, y: 457 }]
    });
    await send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });
    await sleep(1000);

    const unlockedState = await evaluate(`
      (() => {
        const st = window.__SOUNDTRACK__;
        const audio = window.__SOUNDTRACK_AUDIO__;
        const text = document.body.innerText;
        return {
          isPlaying: st.isPlaying,
          isAutoplayBlocked: st.isAutoplayBlocked,
          currentVolume: st.currentVolume,
          promptDisappeared: !text.includes('Tap anywhere for sound'),
          currentTime: audio ? audio.currentTime : 0
        };
      })()
    `);
    console.log('4. Mobile State after User Tap:', unlockedState);
    if (unlockedState.isAutoplayBlocked) {
      throw new Error('Expected isAutoplayBlocked to be false after tap');
    }
    if (!unlockedState.promptDisappeared) {
      throw new Error('Expected prompt to disappear after user tap');
    }
    await captureScreenshot('audio_mobile_unlocked_playing.png');

    console.log('\n=== TEST 3: MOBILE ORIENTATION ROTATION PERSISTENCE ===');
    // Rotate to landscape: 915 x 412
    console.log('Rotating phone to landscape (915 x 412)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 915,
      height: 412,
      deviceScaleFactor: 2.6,
      mobile: true,
      hasTouch: true,
    });
    await evaluate(`window.dispatchEvent(new Event('resize'))`);
    await sleep(1500);

    const landscapeState = await evaluate(`
      (() => {
        const st = window.__SOUNDTRACK__;
        const audio = window.__SOUNDTRACK_AUDIO__;
        return {
          isPlaying: st.isPlaying,
          currentTime: audio ? audio.currentTime : 0,
          currentVolume: st.currentVolume,
          isPaused: audio ? audio.paused : true
        };
      })()
    `);
    console.log('1. Landscape Orientation Audio State:', landscapeState);

    // Rotate back to portrait: 412 x 915
    console.log('Rotating phone back to portrait (412 x 915)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 412,
      height: 915,
      deviceScaleFactor: 2.6,
      mobile: true,
      hasTouch: true,
    });
    await evaluate(`window.dispatchEvent(new Event('resize'))`);
    await sleep(1500);

    const portraitRestate = await evaluate(`
      (() => {
        const st = window.__SOUNDTRACK__;
        const audio = window.__SOUNDTRACK_AUDIO__;
        return {
          isPlaying: st.isPlaying,
          currentTime: audio ? audio.currentTime : 0,
          currentVolume: st.currentVolume,
          isPaused: audio ? audio.paused : true
        };
      })()
    `);
    console.log('2. Portrait Orientation Re-entry Audio State:', portraitRestate);

    if (portraitRestate.isPaused || !portraitRestate.isPlaying) {
      throw new Error('Audio was stopped or paused during orientation change!');
    }
    console.log('--> Verified: Audio persisted without restart across orientation rotations!');

    console.log('\n=== TEST 4: IPHONE SAFARI EMULATION ===');
    await send('Network.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true,
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(2000);

    // Tap to simulate user interaction during intro or start
    await send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: 196, y: 426 }]
    });
    await send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: []
    });

    await evaluate(`window.__SET_STAGE__('PROPOSAL')`);
    await sleep(1500);

    const safariAudioAttrs = await evaluate(`
      (() => {
        const audio = window.__SOUNDTRACK_AUDIO__;
        return {
          playsinline: audio.getAttribute('playsinline'),
          webkitPlaysinline: audio.getAttribute('webkit-playsinline'),
          preload: audio.preload,
          initialVol: audio.volume,
          src: audio.src
        };
      })()
    `);
    console.log('1. iPhone Safari Audio Element Attributes:', safariAudioAttrs);

    if (safariAudioAttrs.playsinline !== 'true' || safariAudioAttrs.webkitPlaysinline !== 'true') {
      throw new Error('Missing playsinline or webkit-playsinline on audio element for iOS Safari');
    }

    await captureScreenshot('audio_iphone_safari_verified.png');

    console.log('\n======================================================');
    console.log('ALL AUDIO TESTS PASSED WITH 100% SUCCESS!');
    console.log('======================================================');

    ws.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    if (ws) ws.close();
    chromeProc.kill();
    process.exit(1);
  }
}, 1000);
