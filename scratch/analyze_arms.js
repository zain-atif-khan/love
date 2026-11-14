import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9352',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9352/json/list', res => {
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

            // Woman arm bounds: from shoulder ~ (610..640, 180..220) to hand ~ (500..540, 215..240)
            const womanArmPixels = [];
            for (let y = 180; y <= 255; y++) {
              for (let x = 495; x <= 620; x++) {
                const idx = (y * w + x) * 4;
                const bri = (d[idx] + d[idx+1] + d[idx+2]) / 3;
                if (bri > 25) {
                  // exclude the rose red
                  const r = d[idx], g = d[idx+1], b = d[idx+2];
                  if (!(r > 90 && r > 1.4*g && r > 1.4*b)) {
                    womanArmPixels.push({ x, y, bri });
                  }
                }
              }
            }

            // Man arm bounds: from shoulder ~ (320..360, 260..300) to wrist ~ (450..475, 290..330)
            const manArmPixels = [];
            for (let y = 260; y <= 380; y++) {
              for (let x = 330; x <= 470; x++) {
                const idx = (y * w + x) * 4;
                const bri = (d[idx] + d[idx+1] + d[idx+2]) / 3;
                if (bri > 25) {
                  manArmPixels.push({ x, y, bri });
                }
              }
            }

            resolve({
              womanArmCount: womanArmPixels.length,
              womanArmMinX: Math.min(...womanArmPixels.map(p=>p.x)),
              womanArmMaxX: Math.max(...womanArmPixels.map(p=>p.x)),
              womanArmMinY: Math.min(...womanArmPixels.map(p=>p.y)),
              womanArmMaxY: Math.max(...womanArmPixels.map(p=>p.y)),
              manArmCount: manArmPixels.length,
              manArmMinX: Math.min(...manArmPixels.map(p=>p.x)),
              manArmMaxX: Math.max(...manArmPixels.map(p=>p.x)),
              manArmMinY: Math.min(...manArmPixels.map(p=>p.y)),
              manArmMaxY: Math.max(...manArmPixels.map(p=>p.y))
            });
          };
          img.src = 'data:image/jpeg;base64,${b64}';
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    console.log('Arm Pinpoint Result:', JSON.stringify(res.result.value, null, 2));
    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
