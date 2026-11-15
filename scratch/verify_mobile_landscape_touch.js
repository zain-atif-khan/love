import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  '--remote-debugging-port=9368',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=852,393',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9368/json/list', res => {
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
      width: 852,
      height: 393,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'landscapePrimary', angle: 90 }
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });

    let ready = false;
    for (let i = 0; i < 30; i++) {
      const res = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && !!window.__LOVE_STORY_STATE__'
      });
      if (res.result && res.result.value) {
        ready = true;
        break;
      }
      await new Promise(r => setTimeout(r, 400));
    }
    console.log('Ready:', ready);

    await new Promise(r => setTimeout(r, 1000));

    // Pause timeline and set touch state
    await send('Runtime.evaluate', {
      expression: `
        if (window.__LOVE_STORY_TL__) window.__LOVE_STORY_TL__.pause();
        Object.assign(window.__LOVE_STORY_STATE__, { reveal: 0.96, manOffer: 1.0, womanReach: 1.0, freeze: 1.0, dissolve: 0.0, alpha: 1.0 });
        if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });

    await new Promise(r => setTimeout(r, 800));

    const ss = await send('Page.captureScreenshot', { format: 'png' });
    const p = path.join(ARTIFACTS_DIR, 'mobile_landscape_touch_render.png');
    fs.writeFileSync(p, Buffer.from(ss.data, 'base64'));
    console.log('Saved mobile_landscape_touch_render.png');

    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
