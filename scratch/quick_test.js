import { spawn } from 'child_process';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function test() {
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9230',
    '--disable-web-security',
    '--enable-webgl',
    'http://localhost:5173/'
  ]);
  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9230/json/list');
  const [page] = await res.json();
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(r => ws.onopen = r);
  let id = 1;
  const send = (method, params = {}) => new Promise(resolve => {
    const i = id++;
    const handler = (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id === i) { ws.removeEventListener('message', handler); resolve(m.result); }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });

  await new Promise(r => setTimeout(r, 2000));
  await send('Runtime.evaluate', { expression: 'window.__SET_STAGE__("EXTENDED_ENDING")' });
  await new Promise(r => setTimeout(r, 1000));
  await send('Runtime.evaluate', { expression: 'window.__EXTENDED_ENDING_SCROLL_TO__(0.83)' });
  await new Promise(r => setTimeout(r, 1500));
  
  const evalRes = await send('Runtime.evaluate', {
    expression: 'JSON.stringify({ scroll: window.__CURRENT_SCROLL_PROGRESS__, roseFormation: window.__CURRENT_ROSE_FORMATION__, roseProps: window.__FINAL_ROSE_PROPS__, matUniforms: { uFormation: window.__FINAL_ROSE_MATERIAL__?.uniforms?.uFormation?.value } })',
    returnByValue: true
  });
  console.log('RESULT:', evalRes.result.value);
  ws.close();
  chromeProc.kill();
}
test().catch(console.error);
