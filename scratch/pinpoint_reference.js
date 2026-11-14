import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9345',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  const list = await new Promise(r => http.get('http://127.0.0.1:9345/json/list', res => {
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
          const cvs = document.createElement('canvas');
          cvs.width = img.width; cvs.height = img.height;
          const ctx = cvs.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, img.width, img.height).data;

          let rx = 0, ry = 0, count = 0;
          let minX = 999, maxX = 0, minY = 999, maxY = 0;
          for (let y = 180; y <= 320; y++) {
            for (let x = 400; x <= 550; x++) {
              const idx = (y * img.width + x) * 4;
              const r = d[idx], g = d[idx+1], b = d[idx+2];
              if (r > 130 && r > 2.0 * g && r > 2.0 * b) {
                rx += x; ry += y; count++;
                minX = Math.min(minX, x); maxX = Math.max(maxX, x);
                minY = Math.min(minY, y); maxY = Math.max(maxY, y);
              }
            }
          }

          // Also find top of man head and top of woman head
          let manHeadY = 999, manHeadX = 0;
          let womanHeadY = 999, womanHeadX = 0;
          for (let y = 50; y <= 300; y++) {
            for (let x = 200; x <= 400; x++) {
              const idx = (y * img.width + x) * 4;
              const bri = (d[idx] + d[idx+1] + d[idx+2]) / 3;
              if (bri > 80 && y < manHeadY) { manHeadY = y; manHeadX = x; }
            }
            for (let x = 550; x <= 750; x++) {
              const idx = (y * img.width + x) * 4;
              const bri = (d[idx] + d[idx+1] + d[idx+2]) / 3;
              if (bri > 80 && y < womanHeadY) { womanHeadY = y; womanHeadX = x; }
            }
          }

          resolve({
            rose: { count, cx: (rx/count).toFixed(1), cy: (ry/count).toFixed(1), minX, maxX, minY, maxY },
            manHead: { x: manHeadX, y: manHeadY },
            womanHead: { x: womanHeadX, y: womanHeadY }
          });
        };
        img.src = 'data:image/jpeg;base64,${b64}';
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Features in reference:', res.result.value);
  ws.close();
  chromeProc.kill();
}, 1000);
