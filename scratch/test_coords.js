import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_coords_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9228',
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
      const res = await fetch('http://127.0.0.1:9228/json/list');
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

  // Wait for __EXTENDED_ENDING_SCROLL_TO__
  for (let i = 0; i < 20; i++) {
    const hasFn = await evaluate(`(() => typeof window.__EXTENDED_ENDING_SCROLL_TO__ === 'function')()`);
    if (hasFn) break;
    await sleep(200);
  }

  await evaluate(`(() => {
    window.__EXTENDED_ENDING_SCROLL_TO__(0.83);
    return true;
  })()`);

  await sleep(2000);

  const diag = await evaluate(`(() => {
    const r3f = window.__R3F_STATE__;
    if (!r3f) return { error: 'No R3F state' };

    const { camera, gl, scene } = r3f;
    const pts = window.__FINAL_ROSE_POINTS__;
    
    // Project target positions of first 5 particles
    const data = window.__FINAL_ROSE_DATA__;
    const posTarget = data.posTarget;
    const sampleCoords = [];
    
    // Vector helper
    const THREE = pts.parent.parent.constructor.prototype ? window.__R3F_STATE__.camera.constructor : null;
    
    return {
      hasCamera: !!camera,
      cameraPos: [camera.position.x, camera.position.y, camera.position.z],
      cameraFov: camera.fov,
      renderInfo: {
        calls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
        points: gl.info.render.points,
        lines: gl.info.render.lines,
        frame: gl.info.render.frame,
      },
      sceneChildrenCount: scene.children.length,
      sceneChildrenTypes: scene.children.map(c => c.type),
      pointsMaterialType: pts?.material?.type,
      pointsCount: pts?.geometry?.attributes?.position?.count,
      uFormation: pts?.material?.uniforms?.uFormation?.value,
      uUniverse: pts?.material?.uniforms?.uUniverse?.value,
      uAlpha: pts?.material?.uniforms?.uAlpha?.value,
    };
  })()`);

  console.log('R3F Diagnostics:', JSON.stringify(diag, null, 2));

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
