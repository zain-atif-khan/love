import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const stages = [
  { name: 'stage1_cosmic', state: { reveal: 0.0, manOffer: 0, womanReach: 0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage2_rose', state: { reveal: 0.18, manOffer: 0, womanReach: 0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage3_hand', state: { reveal: 0.33, manOffer: 0, womanReach: 0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage4_man', state: { reveal: 0.59, manOffer: 0, womanReach: 0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage5_girl', state: { reveal: 0.96, manOffer: 0, womanReach: 0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage6_hold', state: { reveal: 0.96, manOffer: 0, womanReach: 0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage7_offer', state: { reveal: 0.96, manOffer: 1.0, womanReach: 0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage8_touch', state: { reveal: 0.96, manOffer: 1.0, womanReach: 1.0, freeze: 0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage9_freeze', state: { reveal: 0.96, manOffer: 1.0, womanReach: 1.0, freeze: 1.0, dissolve: 0, alpha: 1.0 } },
  { name: 'stage10_dissolve', state: { reveal: 0.96, manOffer: 1.0, womanReach: 1.0, freeze: 0, dissolve: 0.65, alpha: 0.6 } },
  { name: 'stage11_black', state: { reveal: 0.96, manOffer: 1.0, womanReach: 1.0, freeze: 0, dissolve: 1.0, alpha: 0.0 } },
];

const chromeProc = spawn(CHROME_PATH, [
  '--remote-debugging-port=9355',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=1024,682',
  'http://localhost:5173/'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9355/json/list', res => {
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

    console.log('Connected to Chrome CDP. Waiting for Three.js render hook...');
    // Wait until window.__LOVE_STORY_RENDER__ exists
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt++) {
      const chk = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_RENDER__ === "function" && typeof window.__LOVE_STORY_TL__ === "object"'
      });
      if (chk.result && chk.result.value) {
        ready = true;
        break;
      }
      await new Promise(r => setTimeout(r, 400));
    }

    if (!ready) {
      throw new Error('Timeout waiting for LoveStory renderer hook.');
    }

    console.log('Renderer ready! Pausing timeline...');
    await send('Runtime.evaluate', { expression: 'window.__LOVE_STORY_TL__.pause();' });

    for (const stage of stages) {
      console.log(`Setting stage ${stage.name}...`, stage.state);
      await send('Runtime.evaluate', {
        expression: `
          Object.assign(window.__LOVE_STORY_STATE__, ${JSON.stringify(stage.state)});
          if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
          if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
        `
      });

      // Small delay to ensure render complete
      await new Promise(r => setTimeout(r, 300));

      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      const imgBuffer = Buffer.from(screenshot.data, 'base64');
      const outPath = path.join(ARTIFACTS_DIR, `${stage.name}.png`);
      fs.writeFileSync(outPath, imgBuffer);
      console.log(`Saved ${outPath} (${(imgBuffer.length / 1024).toFixed(1)} KB)`);
    }

    console.log('All 10 stages captured successfully!');
    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error('Error during capture:', err);
    chromeProc.kill();
  }
}, 2000);
