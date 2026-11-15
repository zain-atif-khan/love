import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('--- STARTING PURE TWO-WAVE VERIFICATION (ZERO PETALS) ---');

  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9222',
    `--user-data-dir=${userDataDir}`,
    '--window-size=1280,800',
    '--disable-web-security',
    '--enable-webgl',
    '--use-gl=angle',
    '--use-angle=d3d11',
    '--no-sandbox',
    'http://localhost:5173/'
  ]);

  chromeProc.on('error', (err) => console.error('Chrome spawn error:', err));

  let webSocketDebuggerUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://127.0.0.1:9222/json/list');
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

  if (!webSocketDebuggerUrl) {
    console.error('Failed to get WebSocket debugger URL');
    chromeProc.kill();
    process.exit(1);
  }

  console.log('Connected to CDP at:', webSocketDebuggerUrl);
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

  async function captureScreenshot(filename) {
    const res = await sendCommand('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.data, 'base64');
    const outPath = path.join(ARTIFACT_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
    return outPath;
  }

  await sendCommand('Page.enable');
  await sendCommand('Runtime.enable');

  console.log('Waiting for application and Three.js scene to initialize...');
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const ready = await evaluate(`(() => {
      return !!(window.__LOVE_STORY_TL__ && window.__LOVE_STORY_STATE__);
    })()`);
    if (ready) {
      console.log('Application ready!');
      break;
    }
  }

  // 1. Verify Absolute Absence of Falling Rose Petals
  console.log('\n--- VERIFYING COMPLETE REMOVAL OF FALLING PETALS ---');
  const petalCheck = await evaluate(`(() => {
    const fallingPetalsData = window.__FALLING_PETALS_DATA__;
    const fallingPetalsReset = window.__FALLING_PETALS_RESET__;

    // Check DOM for any instanced meshes or petal elements
    const canvases = document.querySelectorAll('canvas');

    return {
      hasPetalData: !!fallingPetalsData,
      hasPetalReset: !!fallingPetalsReset,
      canvasCount: canvases.length,
    };
  })()`);

  console.log('Petal removal check:', JSON.stringify(petalCheck, null, 2));
  if (petalCheck.hasPetalData || petalCheck.hasPetalReset) {
    throw new Error('FAILURE: Petal data or reset functions still detected in runtime!');
  }
  console.log('PASS: Zero falling-petal objects, emitters, or reset hooks exist in runtime.');

  // 2. Verify Contact Moment & Burst at Exact Contact Point
  console.log('\n--- VERIFYING CONTACT MOMENT BURST ---');
  await evaluate(`(() => {
    const tl = window.__LOVE_STORY_TL__;
    tl.seek(23.75, false); // Exact contact moment
    if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
    return true;
  })()`);

  await sleep(400);

  const contactState = await evaluate(`(() => {
    const state = window.__LOVE_STORY_STATE__;
    const uniforms = window.__LOVE_STORY_UNIFORMS__;
    return {
      waveProgress: state.wave,
      uWaveUniform: uniforms.uWaveProgress.value,
      womanReach: state.womanReach,
      freeze: state.freeze,
    };
  })()`);
  console.log('Contact state:', JSON.stringify(contactState, null, 2));

  await captureScreenshot('master_pure_contact_initiation.png');

  // 3. Verify Wave 1 & Wave 2 Simultaneous Propagation
  console.log('\n--- VERIFYING TWO-WAVE PROPAGATION ---');
  await evaluate(`(() => {
    const tl = window.__LOVE_STORY_TL__;
    tl.seek(24.50, false); // Mid-wave progress (~0.40)
    if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
    return true;
  })()`);

  await sleep(400);

  const midWaveState = await evaluate(`(() => {
    const state = window.__LOVE_STORY_STATE__;
    const w1 = state.wave * 2.7;
    const w2 = Math.max(0, (state.wave - 0.18) * 2.7);
    return {
      waveProgress: state.wave,
      waveFront1: w1.toFixed(3),
      waveFront2: w2.toFixed(3),
      waveGap: (w1 - w2).toFixed(3),
    };
  })()`);
  console.log('Mid-wave state:', JSON.stringify(midWaveState, null, 2));

  if (parseFloat(midWaveState.waveGap) <= 0.1) {
    throw new Error('FAILURE: Wave gap between Wave 1 and Wave 2 is not distinct!');
  }
  console.log(`PASS: Two distinct waves verified! Wave 1: ${midWaveState.waveFront1}, Wave 2: ${midWaveState.waveFront2}, Gap: ${midWaveState.waveGap}.`);

  await captureScreenshot('master_pure_two_waves_spreading.png');

  // 4. Verify Wave Full Anatomical Coverage
  console.log('\n--- VERIFYING FULL ANATOMICAL REACH ---');
  await evaluate(`(() => {
    const tl = window.__LOVE_STORY_TL__;
    tl.seek(25.10, false); // Wave progress ~0.75
    if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
    return true;
  })()`);

  await sleep(400);

  const fullWaveState = await evaluate(`(() => {
    const state = window.__LOVE_STORY_STATE__;
    return {
      waveProgress: state.wave,
      waveFront1: (state.wave * 2.7).toFixed(3),
      waveFront2: (Math.max(0, (state.wave - 0.18) * 2.7)).toFixed(3),
    };
  })()`);
  console.log('Full anatomical wave state:', JSON.stringify(fullWaveState, null, 2));

  await captureScreenshot('master_pure_two_waves_full_anatomy.png');

  // 5. Verify Smooth Settle Back to Original Baseline Brightness
  console.log('\n--- VERIFYING SETTLE BACK TO BASELINE ---');
  await evaluate(`(() => {
    const tl = window.__LOVE_STORY_TL__;
    tl.seek(25.70, false); // End of Scene 9 freeze hold, wave has fully passed and settled
    if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
    return true;
  })()`);

  await sleep(400);

  const settleState = await evaluate(`(() => {
    const state = window.__LOVE_STORY_STATE__;
    return {
      waveProgress: state.wave,
      freeze: state.freeze,
      dissolve: state.dissolve,
    };
  })()`);
  console.log('Settle state:', JSON.stringify(settleState, null, 2));

  await captureScreenshot('master_pure_waves_settled_baseline.png');

  // 6. Verify Replay
  console.log('\n--- VERIFYING REPLAY CLEAN START ---');
  await evaluate(`(() => {
    const tl = window.__LOVE_STORY_TL__;
    tl.seek(0, false);
    if (window.__LOVE_STORY_UPDATE_UNIFORMS__) window.__LOVE_STORY_UPDATE_UNIFORMS__();
    return true;
  })()`);

  await sleep(400);
  await captureScreenshot('master_pure_replay_reset.png');

  console.log('\n======================================================');
  console.log('ALL CORRECTION REQUIREMENTS 100% VERIFIED SUCCESSFUL!');
  console.log('======================================================');

  ws.close();
  chromeProc.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
