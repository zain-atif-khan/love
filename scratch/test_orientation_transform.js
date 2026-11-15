import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9390;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_test_agy_9390',
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

    // Create a test HTML page with an element indicating Left (Man), Right (Woman), Top, Bottom
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
          
          /* Option A: rotate(90deg) */
          .box-90 {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vh;
            height: 100vw;
            transform-origin: 0 0;
            transform: rotate(90deg) translateY(-100%);
            background: #111;
            border: 4px solid red;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            font-size: 24px;
            font-family: sans-serif;
            padding: 20px;
          }

          /* Option B: rotate(-90deg) or other */
          .box-neg90 {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vh;
            height: 100vw;
            transform-origin: 0 0;
            transform: translateY(100vh) rotate(-90deg);
            background: #111;
            border: 4px solid blue;
            display: flex;
            justify-content: space-between;
            align-items: center;
            color: white;
            font-size: 24px;
            font-family: sans-serif;
            padding: 20px;
          }
        </style>
      </head>
      <body>
        <div id="box" class="box-90">
          <div>LEFT: KNEELING MAN</div>
          <div>CENTER: RED ROSE</div>
          <div>RIGHT: STANDING WOMAN</div>
        </div>
      </body>
      </html>
    `;

    await send('Page.navigate', { url: `data:text/html;base64,${Buffer.from(html).toString('base64')}` });
    await new Promise(r => setTimeout(r, 500));

    const ssA = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_transform_optionA.png'), Buffer.from(ssA.data, 'base64'));
    console.log('Saved test_transform_optionA.png');

    // Switch to option B
    await send('Runtime.evaluate', {
      expression: `
        document.getElementById('box').className = 'box-neg90';
      `
    });
    await new Promise(r => setTimeout(r, 300));
    const ssB = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_transform_optionB.png'), Buffer.from(ssB.data, 'base64'));
    console.log('Saved test_transform_optionB.png');

    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
