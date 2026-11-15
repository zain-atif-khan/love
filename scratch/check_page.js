import { spawn } from 'child_process';
import http from 'http';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9362',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9362/json/list', res => {
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

    await send('Console.enable');
    await send('Runtime.enable');
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.method === 'Console.messageAdded') console.log('Console:', m.params.message.text);
      if (m.method === 'Runtime.exceptionThrown') console.log('Exception:', m.params.exceptionDetails);
    });

    console.log('Navigating...');
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 2000));

    const html = await send('Runtime.evaluate', { expression: 'document.body.innerHTML' });
    console.log('HTML length:', html.result.value.length);
    console.log('HTML snippet:', html.result.value.slice(0, 300));

    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
