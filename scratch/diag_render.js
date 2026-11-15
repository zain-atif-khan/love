import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_diag3_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9226',
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
      const res = await fetch('http://127.0.0.1:9226/json/list');
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

  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.83);
    }
    return true;
  })()`);

  await sleep(1500);

  const testInfo = await evaluate(`(() => {
    const pts = window.__FINAL_ROSE_POINTS__;
    if (!pts) return { error: 'No points' };

    // Inspect points attributes and bounding sphere
    pts.geometry.computeBoundingBox();
    pts.geometry.computeBoundingSphere();

    return {
      boundingBox: pts.geometry.boundingBox,
      boundingSphere: pts.geometry.boundingSphere,
      materialUniforms: {
        uFormation: pts.material.uniforms.uFormation.value,
        uUniverse: pts.material.uniforms.uUniverse.value,
        uAlpha: pts.material.uniforms.uAlpha.value,
        uTime: pts.material.uniforms.uTime.value,
      },
      pointsPosition: pts.position,
      parentPosition: pts.parent.position,
      parentScale: pts.parent.scale,
      visible: pts.visible,
    };
  })()`);

  console.log('Test Info:', JSON.stringify(testInfo, null, 2));

  // Now replace material with a simple Basic material or debug ShaderMaterial
  const debugRender = await evaluate(`(() => {
    const pts = window.__FINAL_ROSE_POINTS__;
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    // Count non-black before
    let pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let countBefore = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 10 || pixels[i+1] > 10 || pixels[i+2] > 10) countBefore++;
    }

    return { countBefore };
  })()`);

  console.log('Debug render before:', debugRender);

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
