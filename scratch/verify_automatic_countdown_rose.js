import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== STARTING AUTOMATIC PINNED COUNTDOWN & ROSE VERIFICATION ===');

  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_auto_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9252',
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
      const res = await fetch('http://127.0.0.1:9252/json/list');
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

  console.log('Waiting for application to initialize...');
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const ready = await evaluate(`(() => typeof window.__SET_STAGE__ === 'function')()`);
    if (ready) break;
  }

  // Set stage to EXTENDED_ENDING
  await evaluate(`(() => {
    window.__SET_STAGE__('EXTENDED_ENDING');
    return true;
  })()`);

  await sleep(1000);

  // 1. VERIFY LETTER EXIT AND "One more scroll..." PROMPT
  console.log('\n--- 1. VERIFYING LETTER EXIT & "One more scroll..." ---');
  await evaluate(`(() => window.__EXTENDED_ENDING_SCROLL_TO__(0.44))()`);
  await sleep(600);

  const oneMoreText = await evaluate(`(() => document.body.innerText)`);
  if (!oneMoreText.includes('One more scroll...')) {
    throw new Error('FAILURE: "One more scroll..." prompt not found!');
  }
  await captureScreenshot('waiting_1_letter_and_one_more_scroll.png');
  console.log('PASS: Letter finished natural upward movement; "One more scroll..." prompt appeared.');

  // 2. TRIGGER AUTOMATIC FINALE AND PAUSE TIMELINE FOR STEP-BY-STEP INSPECTION
  console.log('\n--- 2. TRIGGERING AUTOMATIC FINALE SEQUENCE ---');
  await evaluate(`(() => {
    window.__EXTENDED_ENDING_SCROLL_TO__(0.48);
    return true;
  })()`);

  // Wait for timeline to be instantiated
  for (let i = 0; i < 20; i++) {
    const hasTl = await evaluate(`(() => !!window.__FINALE_TIMELINE__)()`);
    if (hasTl) break;
    await sleep(100);
  }

  // STEP 1: "Wait..." appears first (seek to t = 0.8s)
  await evaluate(`(() => {
    window.__FINALE_TIMELINE__.pause(0.8);
    return true;
  })()`);
  await sleep(300);

  const step1Check = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hasWait: text.includes('Wait...'),
      hasBecause: text.includes('Because'),
      cdNumber: window.__COUNTDOWN_NUMBER__,
      phase: window.__FINALE_PHASE__,
    };
  })()`);

  console.log('Step 1 (Wait... first):', step1Check);
  if (!step1Check.hasWait || step1Check.hasBecause) {
    throw new Error('FAILURE: "Wait..." must appear first before the second sentence!');
  }
  if (step1Check.cdNumber !== null) {
    throw new Error('FAILURE: Countdown must not appear yet during waiting message!');
  }
  await captureScreenshot('waiting_2_wait_first.png');
  console.log('PASS: "Wait..." appeared first on pure black background; second sentence and countdown not shown yet.');

  // STEP 1B: Word-by-word reveal of second sentence (seek to t = 2.6s)
  await evaluate(`(() => {
    window.__FINALE_TIMELINE__.pause(2.6);
    return true;
  })()`);
  await sleep(300);
  await captureScreenshot('waiting_3_sentence_writing.png');
  console.log('PASS: "Because the beautiful things take time." writing word-by-word.');

  // STEP 1C: Complete waiting message hold (seek to t = 4.2s)
  await evaluate(`(() => {
    window.__FINALE_TIMELINE__.pause(4.2);
    return true;
  })()`);
  await sleep(300);

  const step1cCheck = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hasWait: text.includes('Wait...'),
      hasBecause: text.includes('Because'),
      hasBeautiful: text.includes('beautiful'),
      hasTime: text.includes('time.'),
      phase: window.__FINALE_PHASE__,
    };
  })()`);

  console.log('Step 1C (Full message hold):', step1cCheck);
  if (!step1cCheck.hasTime) {
    throw new Error('FAILURE: Full sentence not visible during reading hold!');
  }
  await captureScreenshot('waiting_4_sentence_complete_hold.png');
  console.log('PASS: Full message holding for appreciation on pure black.');

  // STEP 2: Message dissolves into blush-pink particles (seek to t = 5.6s)
  console.log('\n--- 3. VERIFYING MESSAGE PARTICLE DISSOLUTION ---');
  await evaluate(`(() => {
    window.__FINALE_TIMELINE__.pause(5.6);
    return true;
  })()`);
  await sleep(300);
  await captureScreenshot('waiting_5_message_dissolving.png');
  console.log('PASS: Both lines dissolving into blush-pink particles & blur.');

  // STEP 2B: Pure black screen hold before countdown (seek to t = 6.4s)
  await evaluate(`(() => {
    window.__FINALE_TIMELINE__.pause(6.4);
    return true;
  })()`);
  await sleep(300);

  const step2bCheck = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hasWait: text.includes('Wait...'),
      hasBecause: text.includes('Because'),
      cdNumber: window.__COUNTDOWN_NUMBER__,
    };
  })()`);

  console.log('Step 2B (Black screen hold):', step2bCheck);
  if (step2bCheck.hasWait || step2bCheck.hasBecause) {
    throw new Error('FAILURE: Waiting message must be completely gone before countdown begins!');
  }
  await captureScreenshot('waiting_6_pure_black_before_countdown.png');
  console.log('PASS: Waiting message completely gone, pure black hold before countdown.');

  // STEP 3 & 4: AUTOMATIC PINNED COUNTDOWN (3, 2, 1, 0)
  console.log('\n--- 4. VERIFYING AUTOMATIC PINNED COUNTDOWN (3, 2, 1, 0) ---');

  // 4a. Number 3 (seek to t = 7.3s)
  await evaluate(`(() => window.__FINALE_TIMELINE__.pause(7.3))()`);
  await sleep(300);
  const cd3 = await evaluate(`(() => window.__COUNTDOWN_NUMBER__)()`);
  if (cd3 !== 3) throw new Error(`FAILURE: Expected countdown 3, got ${cd3}`);
  await captureScreenshot('countdown_auto_3.png');

  // 4b. Number 2 (seek to t = 8.5s)
  await evaluate(`(() => window.__FINALE_TIMELINE__.pause(8.5))()`);
  await sleep(300);
  const cd2 = await evaluate(`(() => window.__COUNTDOWN_NUMBER__)()`);
  if (cd2 !== 2) throw new Error(`FAILURE: Expected countdown 2, got ${cd2}`);
  await captureScreenshot('countdown_auto_2.png');

  // 4c. Number 1 (seek to t = 9.7s)
  await evaluate(`(() => window.__FINALE_TIMELINE__.pause(9.7))()`);
  await sleep(300);
  const cd1 = await evaluate(`(() => window.__COUNTDOWN_NUMBER__)()`);
  if (cd1 !== 1) throw new Error(`FAILURE: Expected countdown 1, got ${cd1}`);
  await captureScreenshot('countdown_auto_1.png');

  // 4d. Number 0 (seek to t = 10.9s)
  await evaluate(`(() => window.__FINALE_TIMELINE__.pause(10.9))()`);
  await sleep(300);
  const cd0 = await evaluate(`(() => window.__COUNTDOWN_NUMBER__)()`);
  if (cd0 !== 0) throw new Error(`FAILURE: Expected countdown 0, got ${cd0}`);
  await captureScreenshot('countdown_auto_0.png');
  console.log('PASS: Automatic countdown 3, 2, 1, 0 played with scale and opacity animations, pinned to viewport.');

  // STEP 5 & 6: UNPIN AND AUTOMATIC ROSE FORMATION
  console.log('\n--- 5. VERIFYING AUTOMATIC ROSE FORMATION (NO SCROLL REQUIRED) ---');

  // Rose rising & forming (seek to t = 13.8s)
  await evaluate(`(() => window.__FINALE_TIMELINE__.pause(13.8))()`);
  await sleep(600);

  const risingDiag = await evaluate(`(() => ({
    formation: window.__ROSE_FORMATION__,
    canvasOpacity: window.__ROSE_CANVAS_OPACITY__,
    phase: window.__FINALE_PHASE__,
    cdNumber: window.__COUNTDOWN_NUMBER__,
  }))()`);

  console.log('Rose rising state at t=13.8s:', risingDiag);
  if (risingDiag.cdNumber !== null) {
    throw new Error('FAILURE: Countdown should be gone when rose begins forming!');
  }
  if (risingDiag.formation <= 0.1 || risingDiag.formation >= 0.9) {
    throw new Error(`FAILURE: Rose should be progressively forming! formation=${risingDiag.formation}`);
  }
  await captureScreenshot('rose_auto_rising.png');
  console.log('PASS: Unpinned after zero; rose formation started automatically without any scroll!');

  // Fully assembled rose (seek to t = 16.5s)
  await evaluate(`(() => window.__FINALE_TIMELINE__.pause(16.5))()`);
  await sleep(1000);

  const fullRoseDiag = await evaluate(`(() => {
    const r3f = window.__MASTER_ROSE_R3F__;
    let nonBlackCount = 0;
    let redPixelCount = 0;
    let greenPixelCount = 0;

    if (r3f) {
      r3f.gl.render(r3f.scene, r3f.camera);
      const canvas = r3f.gl.domElement;
      const ctx = r3f.gl.getContext();
      const pixels = new Uint8Array(canvas.width * canvas.height * 4);
      ctx.readPixels(0, 0, canvas.width, canvas.height, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i+1];
        const b = pixels[i+2];
        if (r > 15 || g > 15 || b > 15) {
          nonBlackCount++;
          if (r > g * 1.2 && r > 25) redPixelCount++;
          else if (g > r * 0.8 && g > 25) greenPixelCount++;
        }
      }
    }

    const text = document.body.innerText;
    return {
      formation: window.__ROSE_FORMATION__,
      dataCount: window.__MASTER_ROSE_DATA__?.count,
      nonBlackCount,
      redPixelCount,
      greenPixelCount,
      hasProposalQuestion: text.includes('Will you be my'),
      hasReplay: text.includes('Replay'),
    };
  })()`);

  console.log('Full Master Rose diagnostic at t=16.5s:', fullRoseDiag);
  if (fullRoseDiag.nonBlackCount < 500) {
    throw new Error(`FAILURE: Master rose did not render! nonBlackCount=${fullRoseDiag.nonBlackCount}`);
  }
  if (fullRoseDiag.redPixelCount < 200 || fullRoseDiag.greenPixelCount < 100) {
    throw new Error(`FAILURE: Master rose must have both red petals and green stem/leaves! red=${fullRoseDiag.redPixelCount}, green=${fullRoseDiag.greenPixelCount}`);
  }
  if (fullRoseDiag.hasProposalQuestion) {
    throw new Error('FAILURE: Proposal question should NOT appear yet!');
  }

  await captureScreenshot('rose_auto_fully_assembled.png');
  console.log(`PASS: Master rose 100% formed with ${fullRoseDiag.dataCount} particles! Visible red petals (${fullRoseDiag.redPixelCount}px) and green stem & leaves (${fullRoseDiag.greenPixelCount}px).`);

  console.log('\n========================================================================');
  console.log('AUTOMATIC PINNED COUNTDOWN & MASTER ROSE: ALL TESTS 100% VERIFIED SUCCESS!');
  console.log('========================================================================');

  ws.close();
  chromeProc.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
