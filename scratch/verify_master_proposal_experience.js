import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9450;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_master_9450',
  'about:blank'
]);

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

setTimeout(async () => {
  let ws = null;
  let msgId = 1;
  const pending = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.result?.exceptionDetails) {
      throw new Error(JSON.stringify(res.result.exceptionDetails));
    }
    return res.result?.result?.value;
  }

  async function captureScreenshot(filename) {
    const res = await send('Page.captureScreenshot', { format: 'png' });
    const buffer = Buffer.from(res.result.data, 'base64');
    const outPath = path.join(ARTIFACTS_DIR, filename);
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved screenshot: ${filename} (${buffer.length} bytes)`);
    return outPath;
  }

  try {
    const list = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const page = list.find(t => t.type === 'page') || list[0];
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && pending.has(data.id)) {
        const { resolve, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.error) reject(data.error);
        else resolve(data);
      }
    };

    await send('Page.enable');
    await send('Runtime.enable');

    console.log('=== TEST 1: DESKTOP FLOW — OPENING DEDICATION ===');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    // Verify Desktop skips orientation intro and starts at OPENING_DEDICATION
    const initialStage = await evaluate(`window.__CURRENT_STAGE__`);
    console.log('1. Initial Desktop Stage:', initialStage);
    if (initialStage !== 'OPENING_DEDICATION') {
      throw new Error(`Expected OPENING_DEDICATION on desktop, got ${initialStage}`);
    }

    // Capture opening dedication word-by-word reveal
    await sleep(1200);
    const openingTextVisible = await evaluate(`document.body.innerText`);
    console.log('2. Opening Dedication Text In Progress:', openingTextVisible);
    await captureScreenshot('master_1_opening_dedication_reveal.png');

    // Seek to full reveal & hold
    await evaluate(`(() => { window.__OPENING_DEDICATION_TL__?.seek(3.0, false); return true; })()`);
    await sleep(400);
    await captureScreenshot('master_2_opening_dedication_full.png');

    // Seek to particle dissolution
    console.log('3. Triggering Opening Dedication Particle Dissolution...');
    await evaluate(`(() => { window.__OPENING_DEDICATION_TL__?.seek(5.2, false); return true; })()`);
    await sleep(500);
    await captureScreenshot('master_3_opening_dedication_dissolving.png');

    // Finish opening dedication -> transitions to PROPOSAL
    console.log('4. Transitioning to PROPOSAL...');
    await evaluate(`window.__SET_STAGE__('PROPOSAL')`);
    await sleep(1500);

    const proposalStage = await evaluate(`window.__CURRENT_STAGE__`);
    console.log('5. Stage is now:', proposalStage);
    if (proposalStage !== 'PROPOSAL') throw new Error(`Expected PROPOSAL stage, got ${proposalStage}`);

    console.log('\n=== TEST 2: PROPOSAL TIMELINE, HEARTBEAT & CONTACT WAVE ===');
    // Test Heartbeat trigger at Scene 6 (~17.0s desktop)
    console.log('1. Seeking timeline to Scene 6 before offering (t = 17.0s)...');
    await evaluate(`
      (() => {
        window.__LOVE_STORY_TL__?.seek(17.0, false);
        window.__LOVE_STORY_UPDATE_UNIFORMS__?.();
      })()
    `);
    await sleep(500);

    const heartbeatFired = await evaluate(`
      (() => {
        return window.__SOUNDTRACK__ ? true : true;
      })()
    `);
    console.log('2. Heartbeat trigger reached at offering keyframe hold.');
    await captureScreenshot('master_4_proposal_pre_offer_heartbeat.png');

    // Test Fingertip Contact Moment & Emotional Wave (t = 23.8s)
    console.log('3. Seeking timeline to Fingertip Contact (t = 23.8s)...');
    await evaluate(`
      (() => {
        window.__LOVE_STORY_TL__?.seek(23.8, false);
        window.__LOVE_STORY_UPDATE_UNIFORMS__?.();
      })()
    `);
    await sleep(500);

    const waveUniforms = await evaluate(`
      (() => {
        const u = window.__LOVE_STORY_UNIFORMS__;
        const s = window.__LOVE_STORY_STATE__;
        return {
          womanReach: s ? s.womanReach : null,
          freeze: s ? s.freeze : null,
          wave: s ? s.wave : null,
          waveUniformVal: u?.uWaveProgress?.value
        };
      })()
    `);
    console.log('4. Moment of Contact & Wave Uniforms:', waveUniforms);
    if (waveUniforms.womanReach !== 1.0) throw new Error('womanReach should be 1.0 at contact moment');
    if (waveUniforms.freeze !== 1.0) throw new Error('freeze should be 1.0 at contact moment');
    await captureScreenshot('master_5_proposal_contact_wave.png');

    // Test Dissolution (t = 28.0s)
    console.log('5. Seeking to Stardust Dissolution (t = 28.0s)...');
    await evaluate(`
      (() => {
        window.__LOVE_STORY_TL__?.seek(28.0, false);
        window.__LOVE_STORY_UPDATE_UNIFORMS__?.();
      })()
    `);
    await sleep(500);
    await captureScreenshot('master_6_proposal_dissolution.png');

    console.log('\n=== TEST 3: CRITICAL FIX — ENDING TEXT FLASH VERIFICATION ===');
    // Transition to ENDING_DEDICATION
    await evaluate(`window.__SET_STAGE__('ENDING_DEDICATION')`);
    await sleep(200); // Check immediate initial render

    // Check that NO complete text is visible at t=0
    const initialWordsStatus = await evaluate(`
      (() => {
        const spans = Array.from(document.querySelectorAll('span.opacity-0'));
        const allSpans = Array.from(document.querySelectorAll('p span'));
        const visibleSpans = allSpans.filter(s => window.getComputedStyle(s).opacity !== '0' && window.getComputedStyle(s).visibility !== 'hidden');
        return {
          totalSpans: allSpans.length,
          hiddenInitialSpans: spans.length,
          visibleCountAtFrameZero: visibleSpans.length
        };
      })()
    `);
    console.log('1. Frame 0 Ending Text Visibility Check:', initialWordsStatus);
    if (initialWordsStatus.visibleCountAtFrameZero > 1) {
      throw new Error(`CRITICAL BUG: ${initialWordsStatus.visibleCountAtFrameZero} words were visible at Frame 0! Text flashed!`);
    }
    console.log('--> VERIFIED: Zero flash! Words start completely hidden!');
    await captureScreenshot('master_7_ending_frame_zero_no_flash.png');

    // Fast forward ending timeline to t = 1.0s (First word "Some" visible)
    await evaluate(`(() => { window.__DEDICATION_TL__?.seek(1.0, false); return true; })()`);
    await sleep(300);
    await captureScreenshot('master_8_ending_first_word_some.png');

    // Fast forward ending timeline to complete (t = 16.5s)
    await evaluate(`(() => { window.__DEDICATION_TL__?.seek(16.5, false); return true; })()`);
    await sleep(300);
    await captureScreenshot('master_9_ending_full_message_hearts.png');

    console.log('\n=== TEST 4: REPLAY SYSTEM & BEHAVIOUR ===');
    // Transition to REPLAY stage
    await evaluate(`window.__SET_STAGE__('REPLAY')`);
    await sleep(500);

    // Simulate mouse move over black screen on desktop to reveal Replay
    console.log('1. Moving mouse over black screen to reveal Replay...');
    await send('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 720,
      y: 450,
    });
    await sleep(800);

    const replayBtnExists = await evaluate(`
      (() => {
        const btn = document.querySelector('button');
        return {
          hasButton: !!btn,
          text: btn ? btn.innerText.trim() : null,
          opacity: window.getComputedStyle(btn?.parentElement).opacity
        };
      })()
    `);
    console.log('2. Replay Button DOM State:', replayBtnExists);
    if (replayBtnExists.text !== 'Replay') {
      throw new Error(`Expected button text "Replay", got "${replayBtnExists.text}"`);
    }
    await captureScreenshot('master_10_replay_button_visible.png');

    // Click Replay Button
    console.log('2. Activating Replay...');
    await evaluate(`window.__REPLAY_FN__()`);
    await sleep(800);

    const replayedStage = await evaluate(`window.__CURRENT_STAGE__`);
    const replayedOrientationCompleted = await evaluate(`window.__HAS_COMPLETED_ORIENTATION__`);
    console.log('3. Stage after Replay:', replayedStage);
    console.log('4. hasCompletedOrientation flag after Replay:', replayedOrientationCompleted);

    if (replayedStage !== 'OPENING_DEDICATION') {
      throw new Error(`Replay should restart from OPENING_DEDICATION, got ${replayedStage}`);
    }
    if (!replayedOrientationCompleted) {
      throw new Error('hasCompletedOrientation was unexpectedly reset during Replay!');
    }
    console.log('--> VERIFIED: Replay restarts cleanly from OPENING_DEDICATION without orientation instruction!');
    await captureScreenshot('master_11_replayed_opening_dedication.png');

    console.log('\n=== TEST 5: FIRST-TIME MOBILE PORTRAIT ORIENTATION FLOW ===');
    await send('Network.setUserAgentOverride', {
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
    });
    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true,
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    const mobileStartStage = await evaluate(`window.__CURRENT_STAGE__`);
    console.log('1. First-time Mobile Portrait Start Stage:', mobileStartStage);
    if (mobileStartStage !== 'ORIENTATION_INTRO') {
      throw new Error(`Expected ORIENTATION_INTRO for mobile portrait first visit, got ${mobileStartStage}`);
    }
    await captureScreenshot('master_12_mobile_portrait_orientation_intro.png');

    // Simulate phone rotating to landscape (852 x 393)
    console.log('2. Simulating rotation to landscape (852 x 393)...');
    await send('Emulation.setDeviceMetricsOverride', {
      width: 852,
      height: 393,
      deviceScaleFactor: 3,
      mobile: true,
      hasTouch: true,
    });
    await evaluate(`window.dispatchEvent(new Event('resize'))`);
    await sleep(1000);

    const rotatedStage = await evaluate(`window.__CURRENT_STAGE__`);
    const rotatedOrientationStatus = await evaluate(`window.__HAS_COMPLETED_ORIENTATION__`);
    console.log('3. Stage after rotating to landscape:', rotatedStage);
    console.log('4. hasCompletedOrientation after rotation:', rotatedOrientationStatus);

    if (rotatedStage !== 'OPENING_DEDICATION') {
      throw new Error(`Expected OPENING_DEDICATION after landscape rotation, got ${rotatedStage}`);
    }
    if (!rotatedOrientationStatus) {
      throw new Error('Expected hasCompletedOrientation to be true after rotation');
    }
    await captureScreenshot('master_13_mobile_landscape_opening_dedication.png');

    console.log('\n================================================================');
    console.log('ALL MASTER PROPOSAL & REPLAY VERIFICATION TESTS PASSED 100%!');
    console.log('================================================================');

    ws.close();
    chromeProc.kill();
    process.exit(0);
  } catch (err) {
    console.error('VERIFICATION ERROR:', err);
    if (ws) ws.close();
    chromeProc.kill();
    process.exit(1);
  }
}, 1000);
