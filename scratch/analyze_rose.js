import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9351',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9351/json/list', res => {
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
            const d = ctx.getImageData(0, 0, w, h).data;

            const rose = [];
            const stem = [];
            const hand = [];
            for (let y = 200; y <= 350; y++) {
              for (let x = 440; x <= 530; x++) {
                const idx = (y * w + x) * 4;
                const r = d[idx], g = d[idx+1], b = d[idx+2];
                const bri = (r + g + b) / 3;
                if (bri < 15) continue;

                // Red blossom: strong red ratio
                if (r > 80 && r > 1.35 * g && r > 1.35 * b && y < 275) {
                  rose.push({ x, y, r, g, b });
                } else if (y >= 260 && y <= 315 && (r > 1.25 * g || (x >= 465 && x <= 488))) {
                  stem.push({ x, y, r, g, b });
                } else if (y > 280 && x >= 450 && x <= 495) {
                  hand.push({ x, y, r, g, b });
                }
              }
            }

            resolve({
              roseCount: rose.length,
              stemCount: stem.length,
              handCount: hand.length,
              roseBox: {
                minX: Math.min(...rose.map(p => p.x)),
                maxX: Math.max(...rose.map(p => p.x)),
                minY: Math.min(...rose.map(p => p.y)),
                maxY: Math.max(...rose.map(p => p.y))
              },
              sampleRose: rose.slice(0, 3)
            });
          };
          img.src = 'data:image/jpeg;base64,${b64}';
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Rose Analysis Result:', JSON.stringify(res.result.value, null, 2));
    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
