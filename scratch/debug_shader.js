import { spawn } from 'child_process';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_err_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9248',
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
      const res = await fetch('http://127.0.0.1:9248/json/list');
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
      console.log('BROWSER API:', msg.params.args.map(a => a.value || a.description).join(' '));
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

  await evaluate(`(() => window.__SET_STAGE__('EXTENDED_ENDING'))()`);
  await sleep(1000);

  // Scroll to 0.95
  await evaluate(`(() => window.__EXTENDED_ENDING_SCROLL_TO__(0.95))()`);
  await sleep(1500);

  const debug = await evaluate(`(() => {
    const r3f = window.__MASTER_ROSE_R3F__;
    if (!r3f) return { error: 'No r3f' };
    const { gl, scene, camera } = r3f;
    const ctx = gl.getContext();
    const err = ctx.getError();

    // Check properties of points
    const pts = window.__MASTER_ROSE_POINTS__;
    const directMat = window.__MASTER_ROSE_MATERIAL__;

    const allPoints = [];
    scene.traverse(o => {
      if (o.isPoints) {
        allPoints.push({
          uuid: o.uuid,
          matUuid: o.material?.uuid,
          matFormation: o.material?.uniforms?.uFormation?.value,
          parent: o.parent?.type,
        });
      }
    });

    // Force a render
    gl.render(scene, camera);

    return {
      glError: err,
      allPoints,
      isSameMaterial: pts ? pts.material === directMat : false,
      ptsMatUuid: pts?.material?.uuid,
      directMatUuid: directMat?.uuid,
      ptsMatFormation: pts?.material?.uniforms?.uFormation?.value,
      directMatFormation: directMat?.uniforms?.uFormation?.value,
    };
  })()`);

  console.log('DEBUG:', JSON.stringify(debug, null, 2));

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
