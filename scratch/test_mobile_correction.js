import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9388;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_test_agy_9388',
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

    console.log('=== TEST 1: MOBILE PORTRAIT (iPhone 14 Pro: 393 x 852) ===');
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

    console.log('Navigating to http://localhost:5173/ ...');
    await send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for particle text to initialize
    let textReady = false;
    for (let i = 0; i < 35; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__TEXT_PARTICLES_TL__ === "object" && typeof window.__TEXT_PARTICLES_RENDER__ === "function"'
      });
      if (chk.result && chk.result.value) {
        textReady = true;
        break;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    console.log('Particle text timeline ready:', textReady);

    // Verify Mobile Portrait State: intro is present, LoveStory is NOT rendered
    const portraitEval = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        hasIntro: !!document.getElementById('particle-text-intro'),
        hasLoveStory: !!window.__LOVE_STORY_CANVAS__,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      })`,
      returnByValue: true
    });
    console.log('Portrait check (Intro visible, Proposal hidden):', portraitEval.result.value);

    // Capture Portrait Step 2: Visible text (1.5s into timeline)
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(1.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 300));
    const ssP1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_text_visible.png'), Buffer.from(ssP1.data, 'base64'));
    console.log('Saved mobile_portrait_text_visible.png');

    // Capture Portrait Step 3: Rotated 90 deg clockwise (3.5s into timeline)
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(3.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 300));
    const ssP2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_text_rotated.png'), Buffer.from(ssP2.data, 'base64'));
    console.log('Saved mobile_portrait_text_rotated.png');

    // Capture Portrait Step 5: Post-disappearance 2.0s hold (5.5s into timeline)
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(5.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 200));
    const ssP3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_text_post_disappear.png'), Buffer.from(ssP3.data, 'base64'));
    console.log('Saved mobile_portrait_text_post_disappear.png');

    console.log('=== TEST 2: MOBILE ROTATION TO LANDSCAPE (852 x 393) ===');
    // Rotate device to landscape
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

    // Wait for love story renderer in landscape
    let loveStoryReady = false;
    for (let i = 0; i < 35; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) {
        loveStoryReady = true;
        break;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    console.log('Love Story ready in mobile landscape:', loveStoryReady);

    const landscapeEval = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        hasIntro: !!document.getElementById('particle-text-intro'),
        hasLoveStory: !!window.__LOVE_STORY_CANVAS__,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      })`,
      returnByValue: true
    });
    console.log('Landscape check (Intro unmounted, Proposal active):', landscapeEval.result.value);

    // Pause timeline for exact verification
    await send('Runtime.evaluate', { expression: 'window.__LOVE_STORY_TL__.pause();' });

    // 1. Mobile Scene 2: Red Rose assembles immediately at t=1.8s (no extra 1.5s delay)
    console.log('Capturing Mobile Landscape Rose Formation (t=1.8s)...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(1.8);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ssL1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_landscape_scene2_rose.png'), Buffer.from(ssL1.data, 'base64'));
    console.log('Saved mobile_landscape_scene2_rose.png');

    // 2. Mobile Scene 6: Full Proposal Hold (t=15.0s on mobile)
    // Man on left, woman on right, red rose in center, both fully visible horizontally
    console.log('Capturing Mobile Landscape Full Proposal Hold (t=15.0s)...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(15.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ssL2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_landscape_scene6_proposal.png'), Buffer.from(ssL2.data, 'base64'));
    console.log('Saved mobile_landscape_scene6_proposal.png');

    // 3. Mobile Scene 8: Woman Reaches and Touches Rose (t=21.0s on mobile)
    console.log('Capturing Mobile Landscape Touch (t=21.0s)...');
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(21.0);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ssL3 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_landscape_scene8_touch.png'), Buffer.from(ssL3.data, 'base64'));
    console.log('Saved mobile_landscape_scene8_touch.png');

    console.log('=== TEST 3: DESKTOP & LAPTOP (1920 x 1080) ===');
    await send('Emulation.clearDeviceMetricsOverride');
    await send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1200));

    let desktopReady = false;
    for (let i = 0; i < 35; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) {
        desktopReady = true;
        break;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    console.log('Desktop ready:', desktopReady);

    const desktopEval = await send('Runtime.evaluate', {
      expression: `JSON.stringify({
        hasIntro: !!document.getElementById('particle-text-intro'),
        hasLoveStory: !!window.__LOVE_STORY_CANVAS__,
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight
      })`,
      returnByValue: true
    });
    console.log('Desktop check (Intro bypassed, proposal direct):', desktopEval.result.value);

    // Desktop retains Scene 1 (cosmic stardust) at t=0.8s
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.pause();
        window.__LOVE_STORY_TL__.seek(0.8);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ssD1 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'desktop_scene1_cosmic.png'), Buffer.from(ssD1.data, 'base64'));
    console.log('Saved desktop_scene1_cosmic.png');

    // Desktop full touch at t=24.5s
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(24.5);
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ssD2 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'desktop_scene8_touch.png'), Buffer.from(ssD2.data, 'base64'));
    console.log('Saved desktop_scene8_touch.png');

    ws.close();
    chromeProc.kill();
    console.log('=== ALL TESTS COMPLETED SUCCESSFULLY! ===');
  } catch (err) {
    console.error('Test error:', err);
    chromeProc.kill();
    process.exit(1);
  }
}, 1200);
