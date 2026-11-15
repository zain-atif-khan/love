import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9406;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9406',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${PORT}/json/list`, res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });

    const page = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 1;
    const send = (method, params = {}) => new Promise((res, rej) => {
      const i = id++;
      const handler = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === i) {
          ws.removeEventListener('message', handler);
          if (m.error) rej(new Error(m.error.message));
          else res(m.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

    await send('Emulation.setDeviceMetricsOverride', {
      width: 393,
      height: 852,
      deviceScaleFactor: 2,
      mobile: true,
      screenOrientation: { type: 'portraitPrimary', angle: 0 }
    });

    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 600));

    // Inject horizontal landscape viewport in portrait
    await send('Runtime.evaluate', {
      expression: `
        document.body.innerHTML = \`
          <div style="width: 100vw; height: 100vh; background: #000; display: flex; align-items: center; justify-content: center;">
            <div id="landscape-view" style="width: 100vw; height: calc(100vw * 393 / 852); max-height: 100vh; background: #000; position: relative;">
              <canvas id="c-test" style="width: 100%; height: 100%; display: block;"></canvas>
            </div>
          </div>
        \`;
      `
    });

    await send('Runtime.evaluate', {
      expression: `
        (async () => {
          const THREE = await import('three');
          const { loveStoryVertexShader, loveStoryFragmentShader } = await import('/src/scene/loveStoryShaders.js');
          const { loadLoveStoryData } = await import('/src/scene/loadLoveStory.js');

          const canvas = document.getElementById('c-test');
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
          renderer.setSize(w, h, false);
          renderer.setPixelRatio(2);

          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0x000000);

          const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
          camera.position.set(0.04, 1.10, 3.18);
          camera.lookAt(0.04, 1.10, 0);

          const data = await loadLoveStoryData();
          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(data.posInitial, 3));
          geo.setAttribute('aPositionInitial', new THREE.BufferAttribute(data.posInitial, 3));
          geo.setAttribute('aPositionRest', new THREE.BufferAttribute(data.posRest, 3));
          geo.setAttribute('aPositionTouch', new THREE.BufferAttribute(data.posTouch, 3));
          geo.setAttribute('aPartType', new THREE.BufferAttribute(data.partTypes, 1));
          geo.setAttribute('aRevealOrder', new THREE.BufferAttribute(data.revealOrders, 1));
          geo.setAttribute('aSize', new THREE.BufferAttribute(data.sizes, 1));
          geo.setAttribute('aColorT', new THREE.BufferAttribute(data.colorTs, 1));
          geo.setAttribute('aRandom', new THREE.BufferAttribute(data.randomSeeds, 1));

          const mat = new THREE.ShaderMaterial({
            vertexShader: loveStoryVertexShader,
            fragmentShader: loveStoryFragmentShader,
            uniforms: {
              uTime: { value: 0 },
              uRevealProgress: { value: 0.96 },
              uOfferProgress: { value: 0 },
              uManOfferProgress: { value: 1.0 },
              uWomanReachProgress: { value: 1.0 },
              uDissolveProgress: { value: 0 },
              uFreeze: { value: 1.0 },
              uAlpha: { value: 1.0 },
              uPixelRatio: { value: 2 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });

          scene.add(new THREE.Points(geo, mat));
          renderer.render(scene, camera);
        })()
      `,
      awaitPromise: true
    });

    await new Promise(r => setTimeout(r, 600));

    const ss = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_letterbox_landscape_touch.png'), Buffer.from(ss.data, 'base64'));
    console.log('Saved test_letterbox_landscape_touch.png');

    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
