import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9358',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1024,682',
  'http://localhost:5173/'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9358/json/list', res => {
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

    for (let i = 0; i < 25; i++) {
      const chk = await send('Runtime.evaluate', { expression: 'typeof window.__LOVE_STORY_RENDER__ === "function"' });
      if (chk.result && chk.result.value) break;
      await new Promise(r => setTimeout(r, 400));
    }

    await send('Runtime.evaluate', { expression: 'window.__LOVE_STORY_TL__.pause();' });
    await send('Runtime.evaluate', {
      expression: `
        Object.assign(window.__LOVE_STORY_STATE__, { reveal: 0.96, manOffer: 1.0, womanReach: 1.0, freeze: 0.0, dissolve: 0.32, alpha: 0.95 });
        if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
        if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
      `
    });

    await new Promise(r => setTimeout(r, 400));
    const ss = await send('Page.captureScreenshot', { format: 'png' });
    const outPath = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/stage10_vortex.png';
    fs.writeFileSync(outPath, Buffer.from(ss.data, 'base64'));
    console.log('Saved stage10_vortex.png');
    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1500);
