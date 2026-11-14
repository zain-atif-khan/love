import { spawn } from 'child_process';
import http from 'http';

const p = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(p, ['--remote-debugging-port=9445', '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:5173/']);

setTimeout(() => {
  http.get('http://127.0.0.1:9445/json/list', (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', async () => {
      const list = JSON.parse(d);
      const ws = new WebSocket(list[0].webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: {
          expression: `(() => {
            const tl = window.__LOVE_STORY_TL__;
            const res = [];
            for (const t of [1.5, 4.0, 7.0, 11.0, 14.0, 17.0, 19.5, 22.0]) {
              tl.pause();
              tl.seek(t);
              res.push({
                t,
                reveal: window.__LOVE_STORY_STATE__.reveal,
                offer: window.__LOVE_STORY_STATE__.offer,
                freeze: window.__LOVE_STORY_STATE__.freeze,
                dissolve: window.__LOVE_STORY_STATE__.dissolve,
                alpha: window.__LOVE_STORY_STATE__.alpha
              });
            }
            return JSON.stringify(res);
          })()`,
          returnByValue: true
        }}));
      };
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.id === 2) {
          console.log('Seek results:', JSON.parse(msg.result.result.value));
          ws.close();
          proc.kill();
          process.exit(0);
        }
      };
    });
  });
}, 2500);
