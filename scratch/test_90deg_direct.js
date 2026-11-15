import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  '--remote-debugging-port=9365',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=393,852',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9365/json/list', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }));
    const page = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
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

    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });

    for (let i = 0; i < 20; i++) {
      const res = await send('Runtime.evaluate', {
        expression: '!!document.getElementById("portrait-intro-overlay")'
      });
      if (res.result && res.result.value) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // Set 90 deg using setProperty with important
    const chk = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const el = document.getElementById("portrait-intro-overlay").firstElementChild;
          el.style.setProperty('animation', 'none', 'important');
          el.style.setProperty('transform', 'rotate(90deg)', 'important');
          return {
            inline: el.style.transform,
            computed: window.getComputedStyle(el).transform
          };
        })()
      `,
      returnByValue: true
    });
    console.log('chk:', chk.result.value);

    await new Promise(r => setTimeout(r, 300));
    const ss90 = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'mobile_portrait_exact_90deg.png'), Buffer.from(ss90.data, 'base64'));
    console.log('Saved mobile_portrait_exact_90deg.png');

    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
