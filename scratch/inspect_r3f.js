import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9394;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_test_agy_9394',
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

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1500));

    // Force transition to proposal
    await send('Runtime.evaluate', {
      expression: `
        if (window.__TEXT_PARTICLES_TL__) {
          window.__TEXT_PARTICLES_TL__.seek(6.3);
        }
      `
    });
    await new Promise(r => setTimeout(r, 1000));

    // Inspect R3F state
    const info = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const canvas = window.__LOVE_STORY_CANVAS__;
          const container = document.getElementById('proposal-landscape-container');
          return JSON.stringify({
            containerClientW: container?.clientWidth,
            containerClientH: container?.clientHeight,
            canvasClientW: canvas?.clientWidth,
            canvasClientH: canvas?.clientHeight,
            canvasWidth: canvas?.width,
            canvasHeight: canvas?.height,
            cameraAspect: window.__LOVE_STORY_TL__ ? 'tl_exists' : 'no_tl',
          });
        })()
      `,
      returnByValue: true
    });
    console.log('R3F DOM Info:', info.result.value);

    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1200);
