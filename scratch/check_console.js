import { spawn } from 'child_process';
import http from 'http';

const p = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(p, ['--remote-debugging-port=9444', '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:5173/']);

setTimeout(() => {
  http.get('http://127.0.0.1:9444/json/list', (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', async () => {
      const list = JSON.parse(d);
      const ws = new WebSocket(list[0].webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Console.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 3, method: 'Runtime.evaluate', params: {
          expression: `
            JSON.stringify({
              tl: Boolean(window.__LOVE_STORY_TL__),
              state: window.__LOVE_STORY_STATE__,
              dataLoaded: Boolean(window.__LOVE_STORY_UNIFORMS__)
            })
          `,
          returnByValue: true
        }}));
      };
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.id === 3) {
          console.log('Eval result:', msg.result);
        }
        if (msg.method === 'Runtime.consoleAPICalled') {
          console.log('Console API:', msg.params.type, msg.params.args.map(a => a.value || a.description));
        }
        if (msg.method === 'Console.messageAdded') {
          console.log('Console Msg:', msg.params.message.level, msg.params.message.text);
        }
      };
      setTimeout(() => {
        ws.close();
        proc.kill();
        process.exit(0);
      }, 3000);
    });
  });
}, 2000);
