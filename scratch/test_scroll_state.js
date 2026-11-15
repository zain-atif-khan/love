import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_sc_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9231',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,800',
    '--disable-web-security',
    '--enable-webgl',
    'http://localhost:5173/'
  ]);

  let webSocketDebuggerUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://127.0.0.1:9231/json/list');
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

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const ready = await evaluate(`(() => typeof window.__SET_STAGE__ === 'function')()`);
    if (ready) break;
  }

  await evaluate(`(() => {
    window.__SET_STAGE__('EXTENDED_ENDING');
    return true;
  })()`);

  await sleep(1000);

  // Check state BEFORE scroll
  const stateBefore = await evaluate(`(() => ({
    scrollProgress: window.__CURRENT_SCROLL_PROGRESS__,
    roseFormation: window.__CURRENT_ROSE_FORMATION__,
    roseProps: window.__FINAL_ROSE_PROPS__,
    hasScrollFn: typeof window.__EXTENDED_ENDING_SCROLL_TO__ === 'function',
  }))()`);
  console.log('State BEFORE scroll:', stateBefore);

  // Call scroll to 0.83
  const scrollCall = await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.83);
      return { success: true };
    }
    return { success: false };
  })()`);
  console.log('Scroll call:', scrollCall);

  await sleep(1500);

  // Check state AFTER scroll
  const stateAfter = await evaluate(`(() => ({
    scrollProgress: window.__CURRENT_SCROLL_PROGRESS__,
    roseFormation: window.__CURRENT_ROSE_FORMATION__,
    roseProps: window.__FINAL_ROSE_PROPS__,
    matUniforms: window.__FINAL_ROSE_MATERIAL__ ? {
      uFormation: window.__FINAL_ROSE_MATERIAL__.uniforms.uFormation.value,
      uUniverse: window.__FINAL_ROSE_MATERIAL__.uniforms.uUniverse.value,
      uAlpha: window.__FINAL_ROSE_MATERIAL__.uniforms.uAlpha.value,
      uTime: window.__FINAL_ROSE_MATERIAL__.uniforms.uTime.value,
    } : null,
  }))()`);
  console.log('State AFTER scroll:', stateAfter);

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
