import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const PORT = 9404;

const chromeProc = spawn(CHROME_PATH, [
  `--remote-debugging-port=${PORT}`,
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--user-data-dir=C:\\Users\\SIRI\\AppData\\Local\\Temp\\chrome_debug_9404',
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

    // Test page loading the actual love story binary in vanilla Three.js
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000; overflow: hidden; width: 100vw; height: 100vh; }
          #wrap {
            position: fixed;
            top: 50%;
            left: 50%;
            width: 852px;
            height: 393px;
            transform: translate(-50%, -50%) rotate(-90deg);
            background: #000;
          }
          canvas {
            display: block;
            width: 852px;
            height: 393px;
          }
        </style>
        <script type="importmap">
          {
            "imports": {
              "three": "/node_modules/three/build/three.module.js"
            }
          }
        </script>
      </head>
      <body>
        <div id="wrap">
          <canvas id="c" width="1704" height="786"></canvas>
        </div>
        <script type="module">
          import * as THREE from 'three';
          import { loveStoryVertexShader, loveStoryFragmentShader } from '/src/scene/loveStoryShaders.js';

          const canvas = document.getElementById('c');
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
          renderer.setSize(852, 393, false);
          renderer.setPixelRatio(2);

          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0x000000);

          const camera = new THREE.PerspectiveCamera(45, 852 / 393, 0.1, 100);
          camera.position.set(0.04, 1.10, 3.18);
          camera.lookAt(0.04, 1.10, 0);

          // Load data
          const res = await fetch('/love_story.bin');
          const buffer = await res.arrayBuffer();
          const count = new Uint32Array(buffer, 4, 1)[0];
          let byteOffset = 8;
          const posInitial = new Float32Array(buffer, byteOffset, count * 3); byteOffset += count * 3 * 4;
          const posRest = new Float32Array(buffer, byteOffset, count * 3); byteOffset += count * 3 * 4;
          const posTouch = new Float32Array(buffer, byteOffset, count * 3); byteOffset += count * 3 * 4;
          const partTypes = new Float32Array(buffer, byteOffset, count); byteOffset += count * 4;
          const revealOrders = new Float32Array(buffer, byteOffset, count); byteOffset += count * 4;
          const sizes = new Float32Array(buffer, byteOffset, count); byteOffset += count * 4;
          const colorTs = new Float32Array(buffer, byteOffset, count); byteOffset += count * 4;
          const randomSeeds = new Float32Array(buffer, byteOffset, count);

          const geo = new THREE.BufferGeometry();
          geo.setAttribute('position', new THREE.BufferAttribute(posInitial, 3));
          geo.setAttribute('aPositionInitial', new THREE.BufferAttribute(posInitial, 3));
          geo.setAttribute('aPositionRest', new THREE.BufferAttribute(posRest, 3));
          geo.setAttribute('aPositionTouch', new THREE.BufferAttribute(posTouch, 3));
          geo.setAttribute('aPartType', new THREE.BufferAttribute(partTypes, 1));
          geo.setAttribute('aRevealOrder', new THREE.BufferAttribute(revealOrders, 1));
          geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
          geo.setAttribute('aColorT', new THREE.BufferAttribute(colorTs, 1));
          geo.setAttribute('aRandom', new THREE.BufferAttribute(randomSeeds, 1));

          const mat = new THREE.ShaderMaterial({
            vertexShader: loveStoryVertexShader,
            fragmentShader: loveStoryFragmentShader,
            uniforms: {
              uTime: { value: 0 },
              uRevealProgress: { value: 0.96 },
              uOfferProgress: { value: 0 },
              uManOfferProgress: { value: 0 },
              uWomanReachProgress: { value: 0 },
              uDissolveProgress: { value: 0 },
              uFreeze: { value: 0 },
              uAlpha: { value: 1.0 },
              uPixelRatio: { value: 2 },
            },
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          });

          const points = new THREE.Points(geo, mat);
          scene.add(points);

          renderer.render(scene, camera);
          window.__TEST_RENDERED__ = true;
        </script>
      </body>
      </html>
    `;

    // Navigate to local test
    await send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 600));

    // Inject the test html into body
    await send('Runtime.evaluate', {
      expression: `
        document.body.innerHTML = \`
          <div style="position: fixed; top: 50%; left: 50%; width: 852px; height: 393px; transform: translate(-50%, -50%) rotate(-90deg); background: #000;">
            <canvas id="c-test" style="width: 852px; height: 393px; display: block;"></canvas>
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
          const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, preserveDrawingBuffer: true });
          renderer.setSize(852, 393, false);
          renderer.setPixelRatio(2);

          const scene = new THREE.Scene();
          scene.background = new THREE.Color(0x000000);

          const camera = new THREE.PerspectiveCamera(45, 852 / 393, 0.1, 100);
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
              uManOfferProgress: { value: 0 },
              uWomanReachProgress: { value: 0 },
              uDissolveProgress: { value: 0 },
              uFreeze: { value: 0 },
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
    fs.writeFileSync(path.join(ARTIFACTS_DIR, 'test_pure_three_rotated.png'), Buffer.from(ss.data, 'base64'));
    console.log('Saved test_pure_three_rotated.png');

    ws.close();
    chromeProc.kill();
  } catch (e) {
    console.error(e);
    chromeProc.kill();
  }
}, 1000);
