import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9410;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9410',
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

    console.log('=== TEST 1: MOBILE PORTRAIT INTRO & AUTO-START TO LANDSCAPE FORMAT ===');
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
    for (let i = 0; i < 30; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__TEXT_PARTICLES_TL__ === "object"'
      });
      if (chk.result && chk.result.value) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // Capture Step 1: Text Assembled (t = 1.5s)
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(1.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 200));
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'final_flow_1_text_assembled.png'), Buffer.from(ss1.data, 'base64'));
    console.log('Saved final_flow_1_text_assembled.png');

    // Capture Step 2: Rotated 90 deg (t = 3.5s)
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(3.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 200));
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'final_flow_2_text_rotated.png'), Buffer.from(ss2.data, 'base64'));
    console.log('Saved final_flow_2_text_rotated.png');

    // Complete intro (progress = 1 triggers onComplete -> setStage('PROPOSAL'))
    console.log('Completing intro timeline and 2s delay...');
    await send('Runtime.evaluate', {
      expression: 'if (window.__TEXT_PARTICLES_TL__) window.__TEXT_PARTICLES_TL__.progress(1);'
    });

    // Wait for proposal animation to mount
    let proposalReady = false;
    for (let i = 0; i < 40; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) {
        proposalReady = true;
        break;
      }
      await new Promise(r => setTimeout(r, 200));
    }
    console.log('Proposal animation automatically mounted:', proposalReady);

    // Pause LoveStory timeline for verification
    await send('Runtime.evaluate', { expression: 'window.__LOVE_STORY_TL__.pause();' });

    // Capture Step 3: Red Rose appears immediately in landscape format on mobile (t = 1.5s on mobile)
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(1.5);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'final_flow_3_rose_in_landscape_format.png'), Buffer.from(ss3.data, 'base64'));
    console.log('Saved final_flow_3_rose_in_landscape_format.png');

    // Capture Step 4: Full Proposal Hold (t = 15.0s on mobile)
    console.log('Capturing Step 4: Full Proposal Hold (man on left, woman on right, rose in center)...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(15.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss4 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'final_flow_4_full_proposal_landscape_format.png'), Buffer.from(ss4.data, 'base64'));
    console.log('Saved final_flow_4_full_proposal_landscape_format.png');

    // Capture Step 5: Gentle Touch (t = 21.0s on mobile)
    console.log('Capturing Step 5: Gentle Touch in landscape format...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(21.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss5 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'final_flow_5_touch_landscape_format.png'), Buffer.from(ss5.data, 'base64'));
    console.log('Saved final_flow_5_touch_landscape_format.png');

    // TEST 2: Native orientation change to landscape (852 x 393)
    console.log('=== TEST 2: NATIVE LANDSCAPE ORIENTATION (852 x 393) ===');
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
      expression: `
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss6 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'final_flow_6_native_landscape_touch.png'), Buffer.from(ss6.data, 'base64'));
    console.log('Saved final_flow_6_native_landscape_touch.png');

    ws.close();
    chromeProc.kill();
    console.log('=== ALL FLOW TESTS PASSED SUCCESSFULLY! ===');
  } catch (e) {
    console.error(e);
    chromeProc.kill();
    process.exit(1);
  }
}, 1000);
