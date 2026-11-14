import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

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
const port = 9342;
const userDataDir = path.resolve('scratch/chrome-profile-ref');

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

    // Read reference image as base64
    const imgBuf = fs.readFileSync('C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/.user_uploaded/media_1794685300246_ae3bf91a.jpg');
    const base64Data = imgBuf.toString('base64');

    const result = await send('Runtime.evaluate', {
      expression: `
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            const w = img.width;
            const h = img.height;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const data = ctx.getImageData(0, 0, w, h).data;

            // 1. Find Red Rose pixels (R > 100, R > 1.8*G, R > 1.8*B)
            let roseMinX = w, roseMaxX = 0, roseMinY = h, roseMaxY = 0;
            let roseCount = 0;
            let roseSumX = 0, roseSumY = 0;

            // 2. Man pixels (X < 500, brightness > 30)
            let manMinX = w, manMaxX = 0, manMinY = h, manMaxY = 0;
            let manCount = 0;

            // 3. Woman pixels (X > 500, brightness > 30)
            let womanMinX = w, womanMaxX = 0, womanMinY = h, womanMaxY = 0;
            let womanCount = 0;

            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const r = data[idx];
                const g = data[idx + 1];
                const b = data[idx + 2];
                const brightness = (r + g + b) / 3;

                if (r > 90 && r > 1.8 * g && r > 1.8 * b) {
                  roseMinX = Math.min(roseMinX, x);
                  roseMaxX = Math.max(roseMaxX, x);
                  roseMinY = Math.min(roseMinY, y);
                  roseMaxY = Math.max(roseMaxY, y);
                  roseSumX += x;
                  roseSumY += y;
                  roseCount++;
                }

                if (brightness > 35) {
                  if (x < 480) {
                    manMinX = Math.min(manMinX, x);
                    manMaxX = Math.max(manMaxX, x);
                    manMinY = Math.min(manMinY, y);
                    manMaxY = Math.max(manMaxY, y);
                    manCount++;
                  } else if (x > 500) {
                    womanMinX = Math.min(womanMinX, x);
                    womanMaxX = Math.max(womanMaxX, x);
                    womanMinY = Math.min(womanMinY, y);
                    womanMaxY = Math.max(womanMaxY, y);
                    womanCount++;
                  }
                }
              }
            }

            const roseCenter = { x: (roseSumX / roseCount).toFixed(1), y: (roseSumY / roseCount).toFixed(1) };
            resolve(JSON.stringify({
              width: w,
              height: h,
              rose: { minX: roseMinX, maxX: roseMaxX, minY: roseMinY, maxY: roseMaxY, center: roseCenter, count: roseCount },
              man: { minX: manMinX, maxX: manMaxX, minY: manMinY, maxY: manMaxY, count: manCount },
              woman: { minX: womanMinX, maxX: womanMaxX, minY: womanMinY, maxY: womanMaxY, count: womanCount }
            }));
          };
          img.src = 'data:image/jpeg;base64,${base64Data}';
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Reference Image Metrics:');
    console.log(JSON.parse(result.result.value));

    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
})();
