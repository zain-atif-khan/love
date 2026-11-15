import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';
const REF_IMAGE_PATH = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/.user_uploaded/media_1794758824639_8e1331f2.jpg';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_rose_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9238',
    `--user-data-dir=${userDataDir}`,
    '--disable-web-security',
    'about:blank'
  ]);

  let webSocketDebuggerUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://127.0.0.1:9238/json/list');
      const data = await res.json();
      if (data && data.length > 0) {
        const page = data.find(d => d.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          webSocketDebuggerUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (e) {}
  }

  const ws = new WebSocket(webSocketDebuggerUrl);
  let messageId = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const b64 = fs.readFileSync(REF_IMAGE_PATH).toString('base64');

  const analysis = await sendCommand('Runtime.evaluate', {
    expression: `new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;

        let totalPixels = w * h;
        let redCount = 0;
        let greenCount = 0;
        let bgCount = 0;

        let minRedX = w, maxRedX = 0, minRedY = h, maxRedY = 0;
        let minGreenX = w, maxGreenX = 0, minGreenY = h, maxGreenY = 0;

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            if (lum < 20 && r < 35 && g < 35) {
              bgCount++;
              continue;
            }

            // Distinguish red flower vs green stem/leaves
            if (r > g * 1.2 && r > b * 1.2 && r > 40) {
              redCount++;
              if (x < minRedX) minRedX = x;
              if (x > maxRedX) maxRedX = x;
              if (y < minRedY) minRedY = y;
              if (y > maxRedY) maxRedY = y;
            } else if (g > r * 0.85 && g > b * 1.05 && g > 30) {
              greenCount++;
              if (x < minGreenX) minGreenX = x;
              if (x > maxGreenX) maxGreenX = x;
              if (y < minGreenY) minGreenY = y;
              if (y > maxGreenY) maxGreenY = y;
            }
          }
        }

        resolve({
          width: w,
          height: h,
          totalPixels,
          redCount,
          greenCount,
          bgCount,
          redBounds: { minX: minRedX, maxX: maxRedX, minY: minRedY, maxY: maxRedY },
          greenBounds: { minX: minGreenX, maxX: maxGreenX, minY: minGreenY, maxY: maxGreenY }
        });
      };
      img.src = 'data:image/jpeg;base64,${b64}';
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  console.log('Image Analysis:', JSON.stringify(analysis.result.value, null, 2));

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
