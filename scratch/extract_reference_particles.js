import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9348',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9348/json/list', res => {
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

            // Extract all particles above threshold
            const particles = [];
            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];
                const bri = (r + g + b) / 3;

                // Noise threshold
                if (bri < 15) continue;

                // Probability sampling based on brightness to capture contours and gradient
                // If brightness is high, keep with high probability
                const prob = Math.min(1.0, (bri / 255) * 1.5 + 0.15);
                if (Math.random() > prob) continue;

                particles.push({ x, y, r, g, b, bri });
              }
            }

            resolve({ totalExtracted: particles.length, sample: particles.slice(0, 5) });
          };
          img.src = 'data:image/jpeg;base64,${b64}';
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Particle Extraction Sample:', res.result.value);
    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
