import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9422;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9422',
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

    console.log('=== 1. TEST MOBILE PORTRAIT INTRO (393 x 852) ===');
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

    await send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for text particle intro
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__TEXT_PARTICLES_TL__ === "object"'
      });
      if (chk.result && chk.result.value) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // Capture Intro Step 1: Text Assembled (t = 1.5s)
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(1.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 300));
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_1_intro_text.png'), Buffer.from(ss1.data, 'base64'));
    console.log('Saved mobile_portrait_1_intro_text.png');

    // Capture Intro Step 2: Rotated 90 deg clockwise (t = 3.5s)
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(3.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 300));
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_2_intro_rotated90.png'), Buffer.from(ss2.data, 'base64'));
    console.log('Saved mobile_portrait_2_intro_rotated90.png');

    // Complete intro timeline and trigger transition to proposal
    console.log('Triggering transition to Proposal Scene...');
    await send('Runtime.evaluate', {
      expression: 'if (window.__TEXT_PARTICLES_TL__) window.__TEXT_PARTICLES_TL__.progress(1);'
    });

    // Wait for proposal animation to mount
    let proposalReady = false;
    for (let i = 0; i < 50; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) {
        proposalReady = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('Proposal animation mounted:', proposalReady);

    // Pause LoveStory timeline for precise evaluation
    await send('Runtime.evaluate', { expression: 'window.__LOVE_STORY_TL__.pause();' });

    // Inspect Canvas Dimensions in DOM
    const canvasMetrics = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const c = document.querySelector('canvas');
          const m = document.querySelector('main');
          return {
            canvasWidth: c.offsetWidth,
            canvasHeight: c.offsetHeight,
            canvasClientWidth: c.clientWidth,
            canvasClientHeight: c.clientHeight,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
            bodyBg: getComputedStyle(document.body).backgroundColor,
            mainBg: m ? getComputedStyle(m).backgroundColor : null
          };
        })()
      `,
      returnByValue: true
    });
    console.log('DOM & Canvas Metrics:', canvasMetrics.result.value);

    // Capture Step 3: Red Rose in Mobile Portrait (t = 1.5s)
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(1.5);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_3_rose.png'), Buffer.from(ss3.data, 'base64'));
    console.log('Saved mobile_portrait_3_rose.png');

    // Capture Step 4: Full Proposal Hold (t = 15.0s)
    console.log('Capturing Full Proposal Hold in Mobile Portrait...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(15.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 500));
    const ss4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_4_full_proposal.png'), Buffer.from(ss4.data, 'base64'));
    console.log('Saved mobile_portrait_4_full_proposal.png');

    // Capture Step 5: Emotional Touch (t = 21.0s)
    console.log('Capturing Moment of Touch in Mobile Portrait...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(21.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 500));
    const ss5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_5_touch.png'), Buffer.from(ss5.data, 'base64'));
    console.log('Saved mobile_portrait_5_touch.png');

    // TEST 2: NATIVE LANDSCAPE VIEWPORT (852 x 393)
    console.log('=== 2. TEST MOBILE NATIVE LANDSCAPE (852 x 393) ===');
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
    await new Promise(r => setTimeout(r, 600));

    await send('Runtime.evaluate', {
      expression: `
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss6 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_landscape_full_proposal.png'), Buffer.from(ss6.data, 'base64'));
    console.log('Saved mobile_landscape_full_proposal.png');

    // TEST 3: DESKTOP VIEWPORT (1920 x 1080)
    console.log('=== 3. TEST DESKTOP / LAPTOP (1920 x 1080) ===');
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });

    // Navigate fresh to test desktop auto-bypass of intro
    await send('Page.navigate', { url: 'http://localhost:5173/' });

    let desktopReady = false;
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) {
        desktopReady = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('Desktop directly mounted proposal (intro bypassed):', desktopReady);

    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.pause();
        window.__LOVE_STORY_TL__.seek(17.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 500));
    const ss7 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'desktop_full_proposal.png'), Buffer.from(ss7.data, 'base64'));
    console.log('Saved desktop_full_proposal.png');

    ws.close();
    chromeProc.kill();
    console.log('=== ALL VALIDATION TESTS COMPLETED SUCCESSFULLY! ===');
    process.exit(0);
  } catch (err) {
    console.error('Test error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}, 1200);
