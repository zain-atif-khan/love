import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  '--remote-debugging-port=9366',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=393,852',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9366/json/list', res => {
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

    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 600));

    // Rotate to landscape
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
        if (window.__LOVE_STORY_TL__) {
          window.__LOVE_STORY_TL__.seek(3.5);
          if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
        }
      `
    });

    // Wait 900ms for complete fade-out and unmount
    await new Promise(r => setTimeout(r, 900));

    const ss = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join(ARTIFACTS_DIR, 'mobile_landscape_unmounted.png');
    fs.writeFileSync(p, Buffer.from(ss.data, 'base64'));
    console.log('Saved mobile_landscape_unmounted.png');

    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
