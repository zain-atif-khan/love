import { spawn } from 'child_process';

async function run() {
  const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9254',
    '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_test_scroll_clean',
    'http://localhost:5173/'
  ]);

  await new Promise(r => setTimeout(r, 2000));
  const res = await fetch('http://127.0.0.1:9254/json/list');
  const list = await res.json();
  const page = list.find(d => d.type === 'page');
  const wsUrl = page.webSocketDebuggerUrl;

  const ws = new WebSocket(wsUrl);
  let messageId = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await send('Runtime.evaluate', {
    expression: 'window.__SET_STAGE__("EXTENDED_ENDING")'
  });
  await new Promise(r => setTimeout(r, 800));

  // Small scroll 1
  await send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: 640,
    y: 400,
    deltaX: 0,
    deltaY: 150
  });
  await new Promise(r => setTimeout(r, 300));

  const scroll1 = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const el = document.querySelector('div[class*="overflow-y-scroll"]');
      return {
        scrollTop: el?.scrollTop,
        progress: window.__CURRENT_SCROLL_PROGRESS__,
        finalePhase: window.__FINALE_PHASE__
      };
    })()`
  });
  console.log('Scroll 1 (small delta 150):', scroll1.result?.value);

  // Small scroll 2
  await send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: 640,
    y: 400,
    deltaX: 0,
    deltaY: 200
  });
  await new Promise(r => setTimeout(r, 300));

  const scroll2 = await send('Runtime.evaluate', {
    returnByValue: true,
    expression: `(() => {
      const el = document.querySelector('div[class*="overflow-y-scroll"]');
      return {
        scrollTop: el?.scrollTop,
        progress: window.__CURRENT_SCROLL_PROGRESS__,
        finalePhase: window.__FINALE_PHASE__
      };
    })()`
  });
  console.log('Scroll 2 (cumulative delta 350):', scroll2.result?.value);

  proc.kill();
  process.exit(0);
}

run().catch(console.error);
