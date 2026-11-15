import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';

const PORT = 9398;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9398',
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
    await send('Emulation.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1'
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1200));

    // Force transition to proposal
    await send('Runtime.evaluate', {
      expression: 'if (window.__TEXT_PARTICLES_TL__) window.__TEXT_PARTICLES_TL__.progress(1);'
    });
    await new Promise(r => setTimeout(r, 1000));

    // Check LoveStory uniforms and state
    const debugInfo = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const u = window.__LOVE_STORY_UNIFORMS__;
          const s = window.__LOVE_STORY_STATE__;
          const tl = window.__LOVE_STORY_TL__;
          return JSON.stringify({
            tlTotalDuration: tl?.totalDuration(),
            tlTime: tl?.time(),
            state: s,
            uniforms: {
              reveal: u?.uRevealProgress?.value,
              offer: u?.uOfferProgress?.value,
              alpha: u?.uAlpha?.value,
            }
          });
        })()
      `,
      returnByValue: true
    });
    console.log('DEBUG INFO at mount:', debugInfo.result.value);

    // Now seek to 15.0s and inspect again
    await send('Runtime.evaluate', {
      expression: `
        window.__LOVE_STORY_TL__.seek(15.0);
        if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
      `
    });

    const debugInfo15 = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const u = window.__LOVE_STORY_UNIFORMS__;
          const s = window.__LOVE_STORY_STATE__;
          const tl = window.__LOVE_STORY_TL__;
          return JSON.stringify({
            tlTotalDuration: tl?.totalDuration(),
            tlTime: tl?.time(),
            state: s,
            uniforms: {
              reveal: u?.uRevealProgress?.value,
              offer: u?.uOfferProgress?.value,
              alpha: u?.uAlpha?.value,
            }
          });
        })()
      `,
      returnByValue: true
    });
    console.log('DEBUG INFO at 15.0s:', debugInfo15.result.value);

    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
