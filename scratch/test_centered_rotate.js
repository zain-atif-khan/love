import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9396;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_test_agy_9396',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const page = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (method, params = {}) => new Promise((res, rej) => {
      const i = id++;
      const handler = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === i) {
          ws.removeEventListener('message', handler);
          if (m.error) rej(new Error(m.error.message));
          else res(m.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });

    // Test HTML with rotate(90deg) vs rotate(-90deg) centered
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
          .centered-rot90 {
            position: fixed;
            top: 50%;
            left: 50%;
            width: 100vh;
            height: 100vw;
            transform: translate(-50%, -50%) rotate(90deg);
            background: #111;
            border: 4px solid #0f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            font-size: 20px;
            font-family: sans-serif;
            padding: 20px;
          }
          .centered-rot-neg90 {
            position: fixed;
            top: 50%;
            left: 50%;
            width: 100vh;
            height: 100vw;
            transform: translate(-50%, -50%) rotate(-90deg);
            background: #111;
            border: 4px solid #0ff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            font-size: 20px;
            font-family: sans-serif;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div id="box" class="centered-rot90">
          <div>[LEFT: MAN]</div>
          <div>[CENTER: ROSE]</div>
          <div>[RIGHT: WOMAN]</div>
        </div>
      </body>
      </html>
    `;

    await send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(html).toString('base64')}` });
    await new Promise(r => setTimeout(r, 400));

    const ssA = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_centered_rot90.png'), Buffer.from(ssA.data, 'base64'));

    await send('Runtime.evaluate', { expression: `document.getElementById('box').className = 'centered-rot-neg90';` });
    await new Promise(r => setTimeout(r, 300));
    const ssB = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_centered_rot_neg90.png'), Buffer.from(ssB.data, 'base64'));

    ws.close();
    chromeProc.kill();
    console.log('Saved screenshots.');
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
