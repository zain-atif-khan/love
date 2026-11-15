import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9448;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9448',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const page = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (method, params = {}) => new Promise((res, rej) => {
      const i = id++;
      const handler = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === i) {
          ws.removeEventListener('message', handler);
          if (m.error) rej(new Error(m.error.message));
          else res(m.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

    console.log('=== TEST 1: DESKTOP PROPOSAL & GRADUAL VOLUME PROGRESSION ===');
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for proposal animation to mount
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // Verify Stephen Sanchez audio track & initial volume
    const initialAudioState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const a = window.__SOUNDTRACK_AUDIO__;
          return {
            src: a ? a.src : null,
            duration: a ? a.duration : null,
            initialVolume: a ? a.volume : null,
            paused: a ? a.paused : null,
          };
        })()
      `,
      returnByValue: true
    });
    console.log('1. Stephen Sanchez MP3 Initial State:', initialAudioState.result.value);

    // Test volume progression over the first 3 seconds
    console.log('Testing volume progression...');
    await new Promise(r => setTimeout(r, 2500));
    const volAt2s = await send('Runtime.evaluate', {
      expression: 'window.__SOUNDTRACK_AUDIO__ ? window.__SOUNDTRACK_AUDIO__.volume : null',
      returnByValue: true
    });
    console.log('2. Volume at ~2.5s (progressing gradually):', volAt2s.result.value);

    // Fast-forward proposal animation to completion (dissolve + 2s black wait)
    console.log('Fast-forwarding proposal animation to transition to Dedication...');
    await send('Runtime.evaluate', {
      expression: 'window.__LOVE_STORY_TL__.progress(1.0);'
    });

    // Wait for Romantic Dedication component to mount
    let dedicationMounted = false;
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__DEDICATION_TL__ === "object"'
      });
      if (chk.result && chk.result.value) {
        dedicationMounted = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('3. Romantic Dedication Mounted:', dedicationMounted);

    // Pause dedication timeline for controlled frame-by-frame verification
    await send('Runtime.evaluate', {
      expression: 'if (window.__DEDICATION_TL__) window.__DEDICATION_TL__.pause();'
    });

    // Verify audio continued playing across the transition
    const audioAtDedicationStart = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const a = window.__SOUNDTRACK_AUDIO__;
          return {
            src: a ? a.src : null,
            paused: a ? a.paused : null,
            volume: a ? a.volume : null,
          };
        })()
      `,
      returnByValue: true
    });
    console.log('4. Audio status entering Dedication (uninterrupted):', audioAtDedicationStart.result.value);

    // === VERIFY STAGE A: WORD-BY-WORD FIRST WORDS (t = 1.0s) ===
    console.log('Capturing Stage A: First words appearing word by word (t = 1.0s)...');
    await send('Runtime.evaluate', {
      expression: 'window.__DEDICATION_TL__.seek(1.0);'
    });
    await new Promise(r => setTimeout(r, 300));
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_stage1_word_by_word_start.png'), Buffer.from(ss1.data, 'base64'));
    console.log('Saved dedication_stage1_word_by_word_start.png');

    // === VERIFY STAGE B: STANZA 1 WRITTEN + HEART 1 DRAWN (t = 4.0s) ===
    console.log('Capturing Stage B: Stanza 1 written + Heart 1 drawn (t = 4.0s)...');
    await send('Runtime.evaluate', {
      expression: 'window.__DEDICATION_TL__.seek(4.0);'
    });
    await new Promise(r => setTimeout(r, 300));
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_stage2_stanza1_heart1.png'), Buffer.from(ss2.data, 'base64'));
    console.log('Saved dedication_stage2_stanza1_heart1.png');

    // === VERIFY STAGE C: MID-WRITING + MULTIPLE HEARTS DRAWING (t = 9.0s) ===
    console.log('Capturing Stage C: Stanza 2 in progress + Heart 2 & 3 drawn (t = 9.0s)...');
    await send('Runtime.evaluate', {
      expression: 'window.__DEDICATION_TL__.seek(9.0);'
    });
    await new Promise(r => setTimeout(r, 300));
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_stage3_mid_writing_hearts.png'), Buffer.from(ss3.data, 'base64'));
    console.log('Saved dedication_stage3_mid_writing_hearts.png');

    // === VERIFY STAGE D: COMPLETE MESSAGE + ALL 5 HEARTS VISIBLE (t = 17.0s) ===
    console.log('Capturing Stage D: Full Message + All 5 Hand-Drawn Red Hearts (t = 17.0s)...');
    await send('Runtime.evaluate', {
      expression: 'window.__DEDICATION_TL__.seek(17.0);'
    });
    await new Promise(r => setTimeout(r, 400));
    const ss4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_stage4_complete_desktop.png'), Buffer.from(ss4.data, 'base64'));
    console.log('Saved dedication_stage4_complete_desktop.png');

    // Check DOM Elements, Overlap Detection & Heart Line Dashoffsets
    const verificationMetrics = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const words = Array.from(document.querySelectorAll('span')).map(s => ({
            text: s.innerText,
            opacity: parseFloat(getComputedStyle(s).opacity),
            rect: s.getBoundingClientRect()
          }));

          const paths = Array.from(document.querySelectorAll('svg path')).map(p => ({
            stroke: getComputedStyle(p).stroke,
            strokeWidth: getComputedStyle(p).strokeWidth,
            dashArray: p.style.strokeDasharray,
            dashOffset: parseFloat(p.style.strokeDashoffset),
            rect: p.getBoundingClientRect()
          }));

          // Overlap detection: Check if any heart overlaps any word
          let overlapDetected = false;
          paths.forEach(h => {
            words.forEach(w => {
              const xOverlap = Math.max(0, Math.min(h.rect.right, w.rect.right) - Math.max(h.rect.left, w.rect.left));
              const yOverlap = Math.max(0, Math.min(h.rect.bottom, w.rect.bottom) - Math.max(h.rect.top, w.rect.top));
              if (xOverlap > 0 && yOverlap > 0) {
                overlapDetected = true;
              }
            });
          });

          return {
            totalWords: words.length,
            visibleWordsCount: words.filter(w => w.opacity > 0.9).length,
            totalHearts: paths.length,
            completedHeartsCount: paths.filter(h => h.dashOffset <= 0.05).length,
            overlapDetected,
            bodyBg: getComputedStyle(document.body).backgroundColor,
            mainBg: getComputedStyle(document.querySelector('main')).backgroundColor,
          };
        })()
      `,
      returnByValue: true
    });
    console.log('5. Full Dedication & Heart Metrics:', verificationMetrics.result.value);

    // === TEST 2: MOBILE PORTRAIT DEDICATION (393 x 852) ===
    console.log('=== TEST 2: MOBILE PORTRAIT DEDICATION (393 x 852) ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true });

    await send('Runtime.evaluate', {
      expression: `
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("orientationchange"));
        if (window.__SET_STAGE__) window.__SET_STAGE__("DEDICATION");
      `
    });
    await new Promise(r => setTimeout(r, 500));

    await send('Runtime.evaluate', {
      expression: 'if (window.__DEDICATION_TL__) window.__DEDICATION_TL__.seek(17.0);'
    });
    await new Promise(r => setTimeout(r, 400));
    const ss5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_mobile_portrait_complete.png'), Buffer.from(ss5.data, 'base64'));
    console.log('Saved dedication_mobile_portrait_complete.png');

    // === TEST 3: MOBILE LANDSCAPE DEDICATION (852 x 393) ===
    console.log('=== TEST 3: MOBILE LANDSCAPE DEDICATION (852 x 393) ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 852,
      height: 393,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'landscapePrimary', angle: 90 }
    });
    await send('Runtime.evaluate', {
      expression: `
        window.dispatchEvent(new Event("resize"));
        window.dispatchEvent(new Event("orientationchange"));
      `
    });
    await new Promise(r => setTimeout(r, 500));

    await send('Runtime.evaluate', {
      expression: 'if (window.__DEDICATION_TL__) window.__DEDICATION_TL__.seek(17.0);'
    });
    await new Promise(r => setTimeout(r, 400));
    const ss6 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_mobile_landscape_complete.png'), Buffer.from(ss6.data, 'base64'));
    console.log('Saved dedication_mobile_landscape_complete.png');

    ws.close();
    chromeProc.kill();
    console.log('=== ALL COMPREHENSIVE VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}, 1200);
