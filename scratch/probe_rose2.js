import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_probe3_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9247',
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
      const res = await fetch('http://127.0.0.1:9247/json/list');
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

  await evaluate(`(() => window.__SET_STAGE__('EXTENDED_ENDING'))()`);
  await sleep(1000);

  // Scroll to 0.95
  await evaluate(`(() => window.__EXTENDED_ENDING_SCROLL_TO__(0.95))()`);
  await sleep(1500);

  const renderDiag = await evaluate(`(() => {
    const r3f = window.__MASTER_ROSE_R3F__;
    if (!r3f) return { error: 'No r3f' };
    const { gl, scene, camera } = r3f;

    // Force render
    gl.render(scene, camera);

    const canvas = gl.domElement;
    const ctx = gl.getContext();
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    ctx.readPixels(0, 0, canvas.width, canvas.height, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);

    let nonBlack = 0;
    let redCount = 0;
    let greenCount = 0;
    let maxR = 0, maxG = 0, maxB = 0;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i+1];
      const b = pixels[i+2];
      if (r > maxR) maxR = r;
      if (g > maxG) maxG = g;
      if (b > maxB) maxB = b;
      if (r > 10 || g > 10 || b > 10) {
        nonBlack++;
        if (r > g * 1.15) redCount++;
        else if (g > r * 0.85) greenCount++;
      }
    }

    const dataUrl = canvas.toDataURL();

    return {
      width: canvas.width,
      height: canvas.height,
      nonBlack,
      redCount,
      greenCount,
      maxR, maxG, maxB,
      dataUrlLength: dataUrl.length,
    };
  })()`);

  console.log('RENDER DIAGNOSTIC:', JSON.stringify(renderDiag, null, 2));

  // Save the canvas dataURL to an artifact image
  const dataUrl = await evaluate(`(() => {
    const r3f = window.__MASTER_ROSE_R3F__;
    if (!r3f) return null;
    r3f.gl.render(r3f.scene, r3f.camera);
    return r3f.gl.domElement.toDataURL();
  })()`);

  if (dataUrl) {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'scratch_master_rose_canvas.png'), Buffer.from(base64, 'base64'));
    console.log('Saved scratch_master_rose_canvas.png');
  }

  const pageRes = await sendCommand('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'scratch_full_page_rose.png'), Buffer.from(pageRes.data, 'base64'));
  console.log('Saved scratch_full_page_rose.png');

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
