import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9347',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  const list = await new Promise(r => http.get('http://127.0.0.1:9347/json/list', res => {
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
          let countBri10 = 0, countBri20 = 0, countBri35 = 0;
          for (let i = 0; i < d.length; i += 4) {
            const b = (d[i] + d[i+1] + d[i+2]) / 3;
            if (b > 10) countBri10++;
            if (b > 20) countBri20++;
            if (b > 35) countBri35++;
          }
          resolve({ totalPixels: img.width * img.height, countBri10, countBri20, countBri35 });
        };
        img.src = 'data:image/jpeg;base64,${b64}';
      })
    `,
    awaitPromise: true,
    returnByValue: true
  });
  console.log('Pixel counts:', res.result.value);
  ws.close();
  chromeProc.kill();
}, 1000);
