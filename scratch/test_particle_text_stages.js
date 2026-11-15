import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  '--remote-debugging-port=9375',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=393,852',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9375/json/list', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }));
    const page = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (method, params = {}) => new Promise(res => {
      const i = id++;
      const handler = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === i) { ws.removeEventListener('message', handler); res(m.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

    console.log('Emulating mobile portrait (393x852) with touch...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true });

    console.log('Navigating to http://localhost:5173/ ...');
    await send('Page.navigate', { url: 'http://localhost:5173/' });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__TEXT_PARTICLES_TL__ === "object" && typeof window.__TEXT_PARTICLES_RENDER__ === "function"'
      });
      if (chk.result && chk.result.value) {
        ready = true;
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    }
    console.log('Text particle timeline ready:', ready);

    // Pause timeline for frame-perfect captures
    await send('Runtime.evaluate', { expression: 'window.__TEXT_PARTICLES_TL__.pause();' });

    // Stage 1: Stationary hold (1.5s into timeline: gather = 1.0, rotation = 0.0, disperse = 0.0)
    console.log('Capturing Stage 1: Assembled Particle Text (Stationary Hold at 0 deg)...');
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(1.5);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    const p1 = path.join(ARTIFACTS_DIR, 'particle_text_stage1_assembled.png');
    fs.writeFileSync(p1, Buffer.from(ss1.data, 'base64'));
    console.log(`Saved ${p1}`);

    // Stage 2: Clockwise 90-degree rotated composition (3.8s: rotation = PI/2)
    console.log('Capturing Stage 2: 90-degree Clockwise Rotated Composition...');
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(3.8);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    const p2 = path.join(ARTIFACTS_DIR, 'particle_text_stage2_rotated90.png');
    fs.writeFileSync(p2, Buffer.from(ss2.data, 'base64'));
    console.log(`Saved ${p2}`);

    // Stage 3: Dispersal into blackness (4.1s: disperse in progress)
    console.log('Capturing Stage 3: Gentle Dispersal into Blackness...');
    await send('Runtime.evaluate', {
      expression: `
        window.__TEXT_PARTICLES_TL__.seek(4.1);
        if (window.__TEXT_PARTICLES_RENDER__) window.__TEXT_PARTICLES_RENDER__();
      `
    });
    await new Promise(r => setTimeout(r, 400));
    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    const p3 = path.join(ARTIFACTS_DIR, 'particle_text_stage3_disperse.png');
    fs.writeFileSync(p3, Buffer.from(ss3.data, 'base64'));
    console.log(`Saved ${p3}`);

    // Stage 4: When phone rotates to landscape, main animation begins
    console.log('Rotating device to landscape (852x393)...');
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

    // Wait for main love story renderer to start
    for (let i = 0; i < 25; i++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function"'
      });
      if (chk.result && chk.result.value) break;
      await new Promise(r => setTimeout(r, 300));
    }

    // Seek main animation to 4.5s (rose fully assembled in center)
    await send('Runtime.evaluate', {
      expression: `
        if (window.__LOVE_STORY_TL__) {
          window.__LOVE_STORY_TL__.pause();
          window.__LOVE_STORY_TL__.seek(4.5);
          if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
        }
      `
    });
    await new Promise(r => setTimeout(r, 500));

    const ss4 = await send('Page.captureScreenshot', { format: 'png' });
    const p4 = path.join(ARTIFACTS_DIR, 'particle_text_stage4_landscape_start.png');
    fs.writeFileSync(p4, Buffer.from(ss4.data, 'base64'));
    console.log(`Saved ${p4}`);

    ws.close();
    chromeProc.kill();
    console.log('All particle text stages captured successfully!');
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
