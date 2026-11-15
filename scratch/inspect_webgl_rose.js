import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_diag2_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9225',
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
      const res = await fetch('http://127.0.0.1:9225/json/list');
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

  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const ready = await evaluate(`(() => typeof window.__SET_STAGE__ === 'function')()`);
    if (ready) break;
  }

  // Switch to EXTENDED_ENDING and scroll to 0.83
  await evaluate(`(() => {
    window.__SET_STAGE__('EXTENDED_ENDING');
    return true;
  })()`);

  await sleep(1000);

  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.83);
    }
    return true;
  })()`);

  await sleep(1500);

  // Check WebGL and Three.js details
  const details = await evaluate(`(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas ? canvas.getContext('webgl2') || canvas.getContext('webgl') : null;
    const pts = window.__FINAL_ROSE_POINTS__;
    const mat = window.__FINAL_ROSE_MATERIAL__;
    
    // Check if points has geometry and attributes
    const geo = pts ? pts.geometry : null;
    const attrs = {};
    if (geo) {
      for (const [k, v] of Object.entries(geo.attributes)) {
        attrs[k] = {
          count: v.count,
          itemSize: v.itemSize,
          sample: [v.getX(0), v.getY(0), v.getZ ? v.getZ(0) : null]
        };
      }
    }

    // Check camera
    const camera = pts ? pts.parent?.parent?.children?.find(c => c.isCamera) : null;

    return {
      glError: gl ? gl.getError() : null,
      attrs,
      ptsVisible: pts?.visible,
      ptsInScene: !!pts?.parent,
      cameraFound: !!camera,
    };
  })()`);

  console.log('Details:', JSON.stringify(details, null, 2));

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
