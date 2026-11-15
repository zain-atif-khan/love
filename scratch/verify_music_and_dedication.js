import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9435;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9435',
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

    console.log('=== TEST 1: DESKTOP PROPOSAL -> DISSOLUTION -> DEDICATION ===');
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for LoveStory experience
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // Inspect soundtrack audio element
    const audioState = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const s = window.__SOUNDTRACK__;
          const a = window.__SOUNDTRACK_AUDIO__;
          return {
            hasSoundtrack: !!s,
            hasAudio: !!a,
            src: a ? a.src : null,
            initialVolume: a ? a.volume : null,
            loop: a ? a.loop : null,
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Audio State on Proposal Mount:', audioState.result.value);

    // Fast-forward to Dissolution scene (t = 27.0s)
    console.log('Fast-forwarding to Dissolution (t = 27.0s)...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(27.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));

    // Complete proposal timeline to trigger dissolution finish + 2s black hold -> Dedication
    console.log('Completing Proposal Timeline to transition to Final Dedication...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.progress(1.0);
      `
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
    console.log('Romantic Dedication Mounted:', dedicationMounted);

    // Pause Dedication timeline for frame-accurate validation
    await send('Runtime.evaluate', {
      expression: 'if (window.__DEDICATION_TL__) window.__DEDICATION_TL__.pause();'
    });

    // Capture Stanza 1 revealed (Line 1 & Line 2, at t = 2.5s)
    await send('Runtime.evaluate', {
      expression: 'window.__DEDICATION_TL__.seek(2.5);'
    });
    await new Promise(r => setTimeout(r, 300));
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_desktop_line1_2.png'), Buffer.from(ss1.data, 'base64'));
    console.log('Saved dedication_desktop_line1_2.png');

    // Capture Full Dedication Message revealed (t = 8.5s)
    await send('Runtime.evaluate', {
      expression: 'window.__DEDICATION_TL__.seek(8.5);'
    });
    await new Promise(r => setTimeout(r, 400));
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_desktop_complete.png'), Buffer.from(ss2.data, 'base64'));
    console.log('Saved dedication_desktop_complete.png');

    // Inspect Dedication Text in DOM
    const textValidation = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const paras = Array.from(document.querySelectorAll('p')).map(p => p.innerText.trim());
          const bodyBg = getComputedStyle(document.body).backgroundColor;
          const mainBg = getComputedStyle(document.querySelector('main')).backgroundColor;
          const textColor = getComputedStyle(document.querySelector('p')).color;
          const fontFamily = getComputedStyle(document.querySelector('p')).fontFamily;
          return {
            lines: paras,
            bodyBg,
            mainBg,
            textColor,
            fontFamily,
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Dedication DOM Inspection:', textValidation.result.value);

    // === TEST 2: MOBILE PORTRAIT DEDICATION ===
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
      expression: 'if (window.__DEDICATION_TL__) window.__DEDICATION_TL__.seek(8.5);'
    });
    await new Promise(r => setTimeout(r, 400));
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_mobile_portrait.png'), Buffer.from(ss3.data, 'base64'));
    console.log('Saved dedication_mobile_portrait.png');

    // === TEST 3: MOBILE LANDSCAPE DEDICATION ===
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
      expression: 'if (window.__DEDICATION_TL__) window.__DEDICATION_TL__.seek(8.5);'
    });
    await new Promise(r => setTimeout(r, 400));
    const ss4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'dedication_mobile_landscape.png'), Buffer.from(ss4.data, 'base64'));
    console.log('Saved dedication_mobile_landscape.png');

    ws.close();
    chromeProc.kill();
    console.log('=== ALL MUSIC & DEDICATION TESTS COMPLETED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}, 1200);
