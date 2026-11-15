import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  '--remote-debugging-port=9361',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--window-size=393,852',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9361/json/list', res => {
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

    console.log('Emulating mobile portrait viewport (393x852)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });

    console.log('Navigating to http://localhost:5173/ ...');
    await send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for page to load and overlay to be present
    let found = false;
    for (let i = 0; i < 25; i++) {
      const res = await send('Runtime.evaluate', {
        expression: '!!document.getElementById("portrait-intro-overlay")'
      });
      if (res.result && res.result.value) {
        found = true;
        break;
      }
      await new Promise(r => setTimeout(r, 400));
    }
    console.log('Overlay present:', found);

    // Measure metrics
    const metrics = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const overlay = document.getElementById('portrait-intro-overlay');
          const textBlock = overlay ? overlay.firstElementChild : null;
          if (!textBlock) return { error: 'No text block found' };
          const rect = textBlock.getBoundingClientRect();
          const screenW = window.innerWidth;
          const ratio = (rect.width / screenW * 100).toFixed(1);
          return {
            screenWidth: screenW,
            screenHeight: window.innerHeight,
            textWidth: rect.width.toFixed(1),
            textHeight: rect.height.toFixed(1),
            widthPercentage: ratio + '%',
            text: textBlock.innerText.replace(/\\n/g, ' ')
          };
        })()
      `,
      returnByValue: true
    });
    console.log('Mobile Portrait Metrics:', metrics.result.value);

    // Initial screenshot at 0 degrees
    const ss1 = await send('Page.captureScreenshot', { format: 'png' });
    const p1 = path.join(ARTIFACTS_DIR, 'mobile_portrait_initial_0deg.png');
    fs.writeFileSync(p1, Buffer.from(ss1.data, 'base64'));
    console.log(`Saved ${p1}`);

    // Wait for the rotation animation to reach 90 degrees clockwise (~1.8s into the 3.6s cycle)
    console.log('Waiting for rotation animation to 90 degrees clockwise...');
    await new Promise(r => setTimeout(r, 1800));

    const ss2 = await send('Page.captureScreenshot', { format: 'png' });
    const p2 = path.join(ARTIFACTS_DIR, 'mobile_portrait_rotated_90deg.png');
    fs.writeFileSync(p2, Buffer.from(ss2.data, 'base64'));
    console.log(`Saved ${p2}`);

    // Rotate device to Landscape (852x393)
    console.log('Rotating device to Landscape (852x393)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 852,
      height: 393,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'landscapePrimary', angle: 90 }
    });

    await send('Runtime.evaluate', {
      expression: 'window.dispatchEvent(new Event("resize")); window.dispatchEvent(new Event("orientationchange"));'
    });

    // Wait for fade out and Three.js particle animation to render
    await new Promise(r => setTimeout(r, 1500));

    const ss3 = await send('Page.captureScreenshot', { format: 'png' });
    const p3 = path.join(ARTIFACTS_DIR, 'mobile_landscape_transition.png');
    fs.writeFileSync(p3, Buffer.from(ss3.data, 'base64'));
    console.log(`Saved ${p3}`);

    ws.close();
    chromeProc.kill();
    console.log('Mobile portrait tests completed successfully.');
  } catch (err) {
    console.error('Error during mobile portrait test:', err);
    chromeProc.kill();
  }
}, 1500);
