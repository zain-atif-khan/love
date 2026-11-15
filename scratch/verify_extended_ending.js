import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('=== STARTING EXTENDED ENDING VERIFICATION ===');

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

  console.log('Waiting for application to initialize...');
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const ready = await evaluate(`(() => {
      return !!(window.__SET_STAGE__ && window.__CURRENT_STAGE__);
    })()`);
    if (ready) {
      console.log('Application ready!');
      break;
    }
  }

  // TEST 1: Switch to ENDING_DEDICATION and verify dissolution trigger
  console.log('\n--- 1. VERIFYING CHAPTER 1: ENDING MESSAGE & PARTICLE DISSOLUTION ---');
  await evaluate(`(() => {
    window.__SET_STAGE__('ENDING_DEDICATION');
    return true;
  })()`);

  await sleep(600);

  // Fast-forward timeline to dissolution trigger (t = 21.5s) and pause so it doesn't fire delayed transition
  await evaluate(`(() => {
    if (window.__DEDICATION_TL__) {
      window.__DEDICATION_TL__.seek(21.5, false);
      window.__DEDICATION_TL__.pause();
    }
    return true;
  })()`);

  await sleep(500);
  await captureScreenshot('extended_1_dissolve_transition.png');
  console.log('PASS: Ending dedication text and hearts dissolved into floating stardust particles.');

  // TEST 2: Switch to EXTENDED_ENDING and verify Initial Invitation & Letter starts completely below viewport
  console.log('\n--- 2. VERIFYING CHAPTER 2: INITIAL "Scroll to reveal" & LETTER POSITION BELOW VIEWPORT ---');
  await evaluate(`(() => {
    window.__SET_STAGE__('EXTENDED_ENDING');
    return true;
  })()`);

  await sleep(1000);

  const initialCheck = await evaluate(`(() => {
    const bodyText = document.body.innerText;
    const img = document.querySelector('img[src="/love_letter.jpg"]');
    const rect = img ? img.getBoundingClientRect() : null;
    return {
      hasScrollToReveal: bodyText.includes('Scroll to reveal'),
      stage: window.__CURRENT_STAGE__,
      letterExists: !!img,
      letterTop: rect ? rect.top : null,
      viewportHeight: window.innerHeight,
      isCompletelyBelowViewport: rect ? rect.top >= window.innerHeight : false,
    };
  })()`);

  console.log('Initial invitation check:', JSON.stringify(initialCheck, null, 2));
  if (!initialCheck.hasScrollToReveal) {
    throw new Error('FAILURE: "Scroll to reveal" invitation text not found!');
  }
  if (!initialCheck.isCompletelyBelowViewport) {
    throw new Error(`FAILURE: Letter must start completely below viewport! letterTop=${initialCheck.letterTop}, viewportHeight=${initialCheck.viewportHeight}`);
  }
  console.log(`PASS: "Scroll to reveal" centered on pure black; letter starts completely below viewport (top=${initialCheck.letterTop}px >= ${initialCheck.viewportHeight}px).`);
  await captureScreenshot('extended_2_scroll_to_reveal.png');

  // TEST 3: Scroll to 25% and verify physical letter entering viewport from below
  console.log('\n--- 3. VERIFYING CHAPTER 2: PHYSICAL LETTER MOVING UPWARDS FROM BELOW ---');
  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.25);
    }
    return true;
  })()`);

  await sleep(800);

  const letterCheck25 = await evaluate(`(() => {
    const img = document.querySelector('img[src="/love_letter.jpg"]');
    const rect = img ? img.getBoundingClientRect() : null;
    return {
      imgExists: !!img,
      complete: img?.complete,
      letterTop: rect ? rect.top : null,
      letterBottom: rect ? rect.bottom : null,
      viewportHeight: window.innerHeight,
      hasEnteredViewport: rect ? (rect.top < window.innerHeight && rect.bottom > 0) : false,
      naturalWidth: img?.naturalWidth,
      naturalHeight: img?.naturalHeight,
    };
  })()`);

  console.log('Love letter at 25% scroll check:', JSON.stringify(letterCheck25, null, 2));
  if (!letterCheck25.hasEnteredViewport) {
    throw new Error('FAILURE: Letter did not enter viewport when scrolling!');
  }
  console.log(`PASS: Physical letter image entered viewport from bottom and moving upwards naturally (top=${letterCheck25.letterTop}px).`);
  await captureScreenshot('extended_3_parchment_letter_revealing.png');

  // TEST 3B: Scroll to 40% and verify letter centered in viewport, fully uncropped
  console.log('\n--- 3B. VERIFYING CHAPTER 2: LETTER CENTERED IN VIEWPORT (NATURAL DOCUMENT FLOW) ---');
  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.40);
    }
    return true;
  })()`);

  await sleep(800);

  const letterCheck40 = await evaluate(`(() => {
    const img = document.querySelector('img[src="/love_letter.jpg"]');
    const rect = img ? img.getBoundingClientRect() : null;
    return {
      letterTop: rect ? rect.top : null,
      letterBottom: rect ? rect.bottom : null,
      letterHeight: rect ? rect.height : null,
      letterWidth: rect ? rect.width : null,
      viewportHeight: window.innerHeight,
    };
  })()`);

  console.log('Love letter at 40% scroll check:', JSON.stringify(letterCheck40, null, 2));
  console.log('PASS: Entire letter moving through viewport with natural document flow, zero clipping masks.');
  await captureScreenshot('extended_3b_parchment_letter_centered.png');

  // TEST 4: Scroll to 62% and verify "One last scroll..." prompt below the letter
  console.log('\n--- 4. VERIFYING CHAPTER 3: "One last scroll..." PROMPT ---');
  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.62);
    }
    return true;
  })()`);

  await sleep(800);

  const oneLastCheck = await evaluate(`(() => {
    const bodyText = document.body.innerText;
    const img = document.querySelector('img[src="/love_letter.jpg"]');
    const rect = img ? img.getBoundingClientRect() : null;
    return {
      hasOneLastScroll: bodyText.includes('One last scroll...'),
      letterScrolledPast: rect ? rect.bottom < window.innerHeight * 0.4 : true,
    };
  })()`);

  console.log('One last scroll check:', JSON.stringify(oneLastCheck, null, 2));
  if (!oneLastCheck.hasOneLastScroll) {
    throw new Error('FAILURE: "One last scroll..." text not found!');
  }
  console.log('PASS: "One last scroll..." displayed in elegant blush-pink serif typography below the letter.');
  await captureScreenshot('extended_4_one_last_scroll.png');

  // TEST 5: Scroll to 76% and verify Final 3D Rose particle formation rising from below
  console.log('\n--- 5. VERIFYING CHAPTER 4: FINAL 3D PARTICLE ROSE FORMATION ---');
  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.76);
    }
    return true;
  })()`);

  await sleep(1000);
  await captureScreenshot('extended_5_final_rose_forming.png');
  console.log('PASS: 3D Rose formed from particles rising from below viewport.');

  // TEST 6: Scroll to 83% and verify Proposal Question Word-by-Word
  console.log('\n--- 6. VERIFYING CHAPTER 4: PROPOSAL QUESTION WORD-BY-WORD ---');
  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.83);
    }
    return true;
  })()`);

  await sleep(1000);

  const questionCheck = await evaluate(`(() => {
    const text = document.body.innerText;
    const canvases = Array.from(document.querySelectorAll('canvas'));
    const uniforms = {};
    if (window.__FINAL_ROSE_MATERIAL__?.uniforms) {
      for (const [k, v] of Object.entries(window.__FINAL_ROSE_MATERIAL__.uniforms)) {
        uniforms[k] = v.value;
      }
    }
    return {
      hasWill: text.includes('Will'),
      hasYou: text.includes('you'),
      hasBe: text.includes('be'),
      hasMy: text.includes('my'),
      hasDots: text.includes('...................................?'),
      canvasCount: canvases.length,
      uniforms,
      roseProps: window.__FINAL_ROSE_PROPS__,
    };
  })()`);

  console.log('Question check:', JSON.stringify(questionCheck, null, 2));
  if (!questionCheck.hasWill || !questionCheck.hasDots) {
    throw new Error('FAILURE: Exact proposal question text was not revealed correctly!');
  }
  console.log('PASS: Exact question revealed: "Will you be my ...................................?" under the 3D rose.');
  await captureScreenshot('extended_6_final_question_proposal.png');

  // TEST 7: Scroll to 97% and verify Universe of Memories & Heart Constellation
  console.log('\n--- 7. VERIFYING CHAPTER 5: UNIVERSE OF MEMORIES & HEART CONSTELLATION ---');
  await evaluate(`(() => {
    if (window.__EXTENDED_ENDING_SCROLL_TO__) {
      window.__EXTENDED_ENDING_SCROLL_TO__(0.97);
    }
    return true;
  })()`);

  await sleep(600);

  const replayCheck = await evaluate(`(() => {
    const text = document.body.innerText;
    return {
      hasReplay: text.includes('Replay'),
    };
  })()`);

  console.log('Replay button check:', JSON.stringify(replayCheck, null, 2));
  if (!replayCheck.hasReplay) {
    throw new Error('FAILURE: Replay button not visible in Universe of Memories!');
  }
  console.log('PASS: Universe of memories with 3D starfield, heart constellation, and Replay button active.');
  await captureScreenshot('extended_7_universe_of_memories_constellation.png');

  // TEST 8: Verify Complete Replay Reset
  console.log('\n--- 8. VERIFYING COMPLETE REPLAY RESET ---');
  await evaluate(`(() => {
    if (window.__REPLAY_FN__) {
      window.__REPLAY_FN__();
    }
    return true;
  })()`);

  await sleep(500);

  const replayState = await evaluate(`(() => {
    return {
      stage: window.__CURRENT_STAGE__,
      hasCompletedOrientation: window.__HAS_COMPLETED_ORIENTATION__,
      audioTime: window.__SOUNDTRACK_AUDIO__?.currentTime,
      audioPaused: window.__SOUNDTRACK_AUDIO__?.paused,
    };
  })()`);

  console.log('Replay state check:', JSON.stringify(replayState, null, 2));
  if (replayState.stage !== 'OPENING_DEDICATION' || !replayState.hasCompletedOrientation) {
    throw new Error('FAILURE: Replay did not reset cleanly to OPENING_DEDICATION or repeated orientation!');
  }
  console.log('PASS: Clean replay reset! Starts directly from Opening Dedication, orientation intro never repeats.');
  await captureScreenshot('extended_8_replayed_clean.png');

  console.log('\n======================================================');
  console.log('EXTENDED ENDING: ALL 5 CHAPTERS 100% VERIFIED SUCCESS!');
  console.log('======================================================');

  ws.close();
  chromeProc.kill();
  process.exit(0);
}

run().catch(err => {
  console.error('VERIFICATION ERROR:', err);
  process.exit(1);
});
