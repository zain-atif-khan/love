import { spawn } from 'child_process';
import http from 'http';

const p = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const proc = spawn(p, ['--remote-debugging-port=9446', '--headless=new', '--disable-gpu', '--no-sandbox', 'http://localhost:5173/']);

setTimeout(() => {
  http.get('http://127.0.0.1:9446/json/list', (res) => {
    let d = ''; res.on('data', c => d += c);
    res.on('end', async () => {
      const list = JSON.parse(d);
      const ws = new WebSocket(list[0].webSocketDebuggerUrl);
      ws.onopen = () => {
        ws.send(JSON.stringify({ id: 1, method: 'Runtime.enable' }));
        ws.send(JSON.stringify({ id: 2, method: 'Runtime.evaluate', params: {
          expression: `(() => {
            const uniforms = window.__LOVE_STORY_UNIFORMS__;
            window.__LOVE_STORY_TL__.pause();
            window.__LOVE_STORY_TL__.seek(17.5);
            if (window.__LOVE_STORY_RENDER__) window.__LOVE_STORY_RENDER__();
            
            return JSON.stringify({
              reveal: uniforms.uRevealProgress.value,
              offer: uniforms.uOfferProgress.value,
              freeze: uniforms.uFreeze.value,
              dissolve: uniforms.uDissolveProgress.value,
              alpha: uniforms.uAlpha.value
            });
          })()`,
          returnByValue: true
        }}));
      };
      ws.onmessage = (m) => {
        const msg = JSON.parse(m.data);
        if (msg.id === 2) {
          console.log('Uniform values:', JSON.parse(msg.result.result.value));
          ws.close();
          proc.kill();
          process.exit(0);
        }
      };
    });
  });
}, 2500);
