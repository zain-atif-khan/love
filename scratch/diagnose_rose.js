import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_diag_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9223',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,800',
    '--disable-web-security',
    '--enable-webgl',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--no-sandbox',
    'http://localhost:5173/'
  ]);

  let webSocketDebuggerUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://127.0.0.1:9223/json/list');
      const data = await res.json();
      if (data && data.length > 0) {
        const page = data.find(d => d.type === 'page');
        if (page && page.webSocketDebuggerUrl) {
          webSocketDebuggerUrl = page.webSocketDebuggerUrl;
          break;
        }
      }
    } catch (e) {}
  }

  const ws = new WebSocket(webSocketDebuggerUrl);
  let messageId = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.method === 'Console.messageAdded') {
      console.log('BROWSER CONSOLE:', msg.params.message.text);
    }
    if (msg.method === 'Runtime.consoleAPICalled') {
      console.log('BROWSER API CONSOLE:', msg.params.args.map(a => a.value || a.description).join(' '));
    }
    if (msg.id && callbacks.has(msg.id)) {
      const cb = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) cb.reject(msg.error);
      else cb.resolve(msg.result);
    }
  };

  await new Promise(resolve => ws.onopen = resolve);

  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = messageId++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await sendCommand('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      throw new Error(JSON.stringify(res.exceptionDetails));
    }
    return res.result?.value;
  }

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');
  await sendCommand('Console.enable');

  console.log('Waiting for application ready...');
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const ready = await evaluate(`(() => {
      return typeof window.__SET_STAGE__ === 'function';
    })()`);
    if (ready) {
      console.log('Application ready!');
      break;
    }
  }

  // Set stage to EXTENDED_ENDING
  await evaluate(`(() => {
    window.__SET_STAGE__('EXTENDED_ENDING');
    return true;
  })()`);

  await sleep(1000);

  // Scroll to 0.66 (Rising particle rose forming from below)
  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.66);
    }
    return true;
  })()`);

  await sleep(1200);

  const res5 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'extended_5_final_rose_forming.png'), Buffer.from(res5.data, 'base64'));
  console.log('Saved extended_5_final_rose_forming.png');

  // Scroll to 0.77 (All question words and rose fully formed!)
  const scrollRes = await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.77);
      return {
        hasScrollFn: true,
      };
    }
    return { hasScrollFn: false, keys: Object.keys(window).filter(k => k.startsWith('__')) };
  })()`);
  console.log('Scroll call result:', scrollRes);

  await sleep(1200);

  // Inspect the canvas and state
  const diag = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hasWill: text.includes('Will'),
      hasDots: text.includes('...................................?'),
      scrollProgress: window.__CURRENT_SCROLL_PROGRESS__,
      canvasOpacity: window.__CURRENT_CANVAS_OPACITY__,
      roseFormation: window.__CURRENT_ROSE_FORMATION__,
      roseUniforms: window.__FINAL_ROSE_MATERIAL__?.uniforms ? {
        uFormation: window.__FINAL_ROSE_MATERIAL__.uniforms.uFormation.value,
        uUniverse: window.__FINAL_ROSE_MATERIAL__.uniforms.uUniverse.value,
        uAlpha: window.__FINAL_ROSE_MATERIAL__.uniforms.uAlpha.value,
      } : null,
    };
  })()`);

  console.log('Full question check at 0.77:', JSON.stringify(diag, null, 2));

  // Take screenshot at 0.77
  const res6 = await sendCommand('Page.captureScreenshot', { format: 'png' });
  const buffer6 = Buffer.from(res6.data, 'base64');
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'extended_6_final_question_proposal.png'), buffer6);
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'diag_rose_77_full.png'), buffer6);
  console.log('Saved extended_6_final_question_proposal.png');

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
