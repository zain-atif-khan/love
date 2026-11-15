import { spawn } from 'child_process';
import http from 'http';

const PORT = 9400;
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9400',
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

    await send('Runtime.enable');
    await send('Log.enable');

    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Runtime.consoleAPICalled') {
        console.log('CONSOLE:', m.params.type, m.params.args.map(a => a.value || a.description).join(' '));
      }
      if (m.method === 'Runtime.exceptionThrown') {
        console.log('EXCEPTION:', m.params.exceptionDetails.text, m.params.exceptionDetails.exception?.description);
      }
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Switching to PROPOSAL...');
    await send('Runtime.evaluate', {
      expression: 'if (window.__TEXT_PARTICLES_TL__) window.__TEXT_PARTICLES_TL__.progress(1);'
    });

    for (let i = 0; i < 20; i++) {
      const res = await send('Runtime.evaluate', {
        expression: 'typeof window.__LOVE_STORY_TL__'
      });
      console.log(`Check ${i}:`, res.result.value);
      if (res.result.value === 'object') break;
      await new Promise(r => setTimeout(r, 300));
    }

    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
