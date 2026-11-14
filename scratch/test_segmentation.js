import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9349',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9349/json/list', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }));
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
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

    const b64 = fs.readFileSync('C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/.user_uploaded/media_1794685300246_ae3bf91a.jpg').toString('base64');
    const res = await send('Runtime.evaluate', {
      expression: `
        new Promise(resolve => {
          const img = new Image();
          img.onload = () => {
            const w = img.width;
            const h = img.height;
            const cvs = document.createElement('canvas');
            cvs.width = w; cvs.height = h;
            const ctx = cvs.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, w, h).data;

            const counts = { roseBlossom: 0, roseStem: 0, manHand: 0, manArm: 0, manBody: 0, womanArm: 0, womanBody: 0, ambient: 0 };

            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];
                const bri = (r + g + b) / 3;

                if (bri < 15) continue;

                // Rose Blossom: red bloom between x 460..515, y 215..265
                const isRoseRed = (r > 100 && r > 1.5 * g && r > 1.5 * b);
                if (x >= 455 && x <= 515 && y >= 215 && y <= 265 && isRoseRed) {
                  counts.roseBlossom++;
                } else if (x >= 445 && x <= 505 && y >= 260 && y <= 315 && (isRoseRed || (x >= 465 && x <= 485 && y >= 265 && y <= 310))) {
                  counts.roseStem++;
                } else if (x >= 450 && x <= 495 && y >= 285 && y <= 335) {
                  counts.manHand++;
                } else if (x >= 340 && x < 460 && y >= 265 && y <= 375 && (y - 0.7 * x > 10 || x > 380)) {
                  counts.manArm++;
                } else if (x < 480) {
                  counts.manBody++;
                } else if (x >= 495 && x <= 645 && y >= 185 && y <= 255 && (x < 560 || y < 240)) {
                  counts.womanArm++;
                } else if (x >= 480) {
                  counts.womanBody++;
                } else {
                  counts.ambient++;
                }
              }
            }

            resolve(counts);
          };
          img.src = 'data:image/jpeg;base64,${b64}';
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Segment Counts:', res.result.value);
    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
