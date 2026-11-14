import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const outDir = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/scratch/love_story_v4';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function findChrome() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const chromePath = findChrome();
const port = 9336;
const userDataDir = path.resolve('scratch/chrome-profile-v4d');

const chromeProc = spawn(chromePath, [
  `--remote-debugging-port=${port}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  `--user-data-dir=${userDataDir}`,
  'about:blank'
]);

function getJSON(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function waitForWS() {
  for (let i = 0; i < 40; i++) {
    try {
      const list = await getJSON(`http://127.0.0.1:${port}/json/list`);
      if (list && list.length > 0 && list[0].webSocketDebuggerUrl) {
        return list[0].webSocketDebuggerUrl;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('CDP target not ready');
}

(async () => {
  try {
    const wsUrl = await waitForWS();
    const ws = new WebSocket(wsUrl);

    let id = 1;
    const callbacks = new Map();

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks.has(msg.id)) {
        const { resolve, reject } = callbacks.get(msg.id);
        callbacks.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };

    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        callbacks.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise(r => ws.onopen = r);

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('Navigating to http://localhost:5173/');
    await send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for page load and Three.js initialization
    await new Promise(r => setTimeout(r, 3000));

    // Wait for love story data to load
    for (let i = 0; i < 30; i++) {
      const res = await send('Runtime.evaluate', {
        expression: 'Boolean(window.__LOVE_STORY_TL__ && window.__LOVE_STORY_UPDATE_UNIFORMS__)',
        returnByValue: true
      });
      if (res.result && res.result.value) {
        console.log('Love Story Timeline & Uniform Updater ready!');
        break;
      }
      await new Promise(r => setTimeout(r, 300));
    }

    // Capture each of the 7 scenes
    const scenes = [
      { name: 'scene1_rose_v4.png', time: 2.5, desc: 'Scene 1: Rose Appears' },
      { name: 'scene2_hand_v4.png', time: 4.8, desc: 'Scene 2: Hand Forms Wrapping Stem' },
      { name: 'scene3_kneeling_man_v4.png', time: 8.5, desc: 'Scene 3: Kneeling Person Appears' },
      { name: 'scene4_standing_girl_v4.png', time: 12.2, desc: 'Scene 4: Standing Girl Forms' },
      { name: 'scene5_offer_touch_v4.png', time: 15.5, desc: 'Scene 5: Rose Offered & Arm Reaching' },
      { name: 'scene6_freeze_v4.png', time: 18.0, desc: 'Scene 6: The Moment Stops / Freeze' },
      { name: 'scene7_dissolve_v4.png', time: 21.0, desc: 'Scene 7: Dissolution into Stardust' },
      { name: 'scene7_black_v4.png', time: 24.5, desc: 'Scene 7: Final Pure Black Screen' },
    ];

    for (const sc of scenes) {
      // Seek timeline and force WebGL render
      const evalState = await send('Runtime.evaluate', {
        expression: `
          window.__LOVE_STORY_TL__.pause();
          window.__LOVE_STORY_TL__.seek(${sc.time}, false);
          if (window.__LOVE_STORY_UPDATE_UNIFORMS__) {
            window.__LOVE_STORY_UPDATE_UNIFORMS__();
          }
          if (window.__LOVE_STORY_RENDER__) {
            window.__LOVE_STORY_RENDER__();
          }
          JSON.stringify({
            t: ${sc.time},
            reveal: window.__LOVE_STORY_UNIFORMS__.uRevealProgress.value,
            offer: window.__LOVE_STORY_UNIFORMS__.uOfferProgress.value,
            freeze: window.__LOVE_STORY_UNIFORMS__.uFreeze.value,
            dissolve: window.__LOVE_STORY_UNIFORMS__.uDissolveProgress.value,
            alpha: window.__LOVE_STORY_UNIFORMS__.uAlpha.value
          })
        `,
        returnByValue: true
      });

      console.log(`Uniforms at ${sc.name}:`, evalState.result.value);

      // Small pause to ensure buffer presentation
      await new Promise(r => setTimeout(r, 300));

      const evalRes = await send('Runtime.evaluate', {
        expression: `
          (() => {
            const canvas = window.__LOVE_STORY_CANVAS__ || document.querySelector('canvas');
            if (!canvas) return null;
            return canvas.toDataURL('image/png').split(',')[1];
          })()
        `,
        returnByValue: true
      });

      let imgBuffer;
      if (evalRes.result && evalRes.result.value) {
        imgBuffer = Buffer.from(evalRes.result.value, 'base64');
      } else {
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        imgBuffer = Buffer.from(screenshot.data, 'base64');
      }

      const savePath = path.join(outDir, sc.name);
      fs.writeFileSync(savePath, imgBuffer);
      console.log(`Saved: ${sc.name} (${sc.desc})`);
    }

    ws.close();
    chromeProc.kill();
    console.log('All scenes captured successfully with WebGL rendering!');
  } catch (err) {
    console.error('Capture error:', err);
    chromeProc.kill();
  }
})();
