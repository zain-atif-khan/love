import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\SIRI\\.gemini\\antigravity\\brain\\a582f0be-f267-4a2a-aa47-d180b23252be';
const REF_IMAGE_PATH = 'C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/.user_uploaded/media_1794758824639_8e1331f2.jpg';
const OUTPUT_BIN_PATH = 'C:/Users/SIRI/OneDrive/Documents/flower/public/master_rose.bin';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('Generating master rose particles from reference image...');
  const userDataDir = path.join(ARTIFACT_DIR, 'scratch', 'chrome_profile_gen_' + Date.now());
  const chromeProc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=9239',
    `--user-data-dir=${userDataDir}`,
    '--disable-web-security',
    'about:blank'
  ]);

  let webSocketDebuggerUrl = null;
  for (let i = 0; i < 20; i++) {
    await sleep(500);
    try {
      const res = await fetch('http://127.0.0.1:9239/json/list');
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

  const b64 = fs.readFileSync(REF_IMAGE_PATH).toString('base64');

  const result = await sendCommand('Runtime.evaluate', {
    expression: `new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const cvs = document.createElement('canvas');
        cvs.width = w;
        cvs.height = h;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h).data;

        // Centers
        const centerX = 502; // flower + stem symmetry axis
        const flowerCenterY = 248; // center of curled rose bloom
        const scaleFactor = 230; // 3D world units normalization

        const particles = [];

        // Grid-based sampling with density weighted by luminance
        // Step size 1 or 2 with probabilistic sub-sampling for natural distribution
        for (let y = 0; y < h; y += 1) {
          for (let x = 0; x < w; x += 1) {
            const idx = (y * w + x) * 4;
            const r = imgData[idx];
            const g = imgData[idx + 1];
            const b = imgData[idx + 2];
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;

            // Background filter
            if (lum < 16 && r < 28 && g < 28) continue;

            // Distinguish red flower vs green stem/leaves/calyx
            const isRed = (r > g * 1.15 && r > b * 1.15 && r > 32);
            const isGreen = (g > r * 0.82 && g > b * 1.02 && g > 25);

            if (!isRed && !isGreen) continue;

            // Density sampling based on brightness so edges and highlights pop
            const prob = Math.min(1.0, 0.35 + (lum / 255.0) * 0.65);
            if (Math.random() > prob) continue;

            // World coordinates
            // Normalized X: -1.2 to 1.2
            const normX = (x - centerX) / scaleFactor;
            // Inverted Y centered around middle of whole rose (y ~ 340)
            const normY = -(y - 340) / scaleFactor;

            // 3D Depth (Z) calculation
            let normZ = 0;
            let isFlower = 0;
            let drawOrder = 0;

            if (isRed) {
              isFlower = 1.0;
              // Spherical / dome depth for the bloom
              const dx = (x - centerX) / scaleFactor;
              const dy = (y - flowerCenterY) / scaleFactor;
              const distFromFlowerCenter = Math.sqrt(dx * dx + dy * dy);
              const maxFlowerR = 1.18;
              
              if (distFromFlowerCenter < maxFlowerR) {
                // Curved cup/dome depth
                const dome = Math.sqrt(Math.max(0, maxFlowerR * maxFlowerR - distFromFlowerCenter * distFromFlowerCenter));
                // Petal ripple based on brightness
                const ripple = (lum / 255.0) * 0.12;
                normZ = (dome * 0.28 - 0.12) + (Math.random() - 0.5) * 0.05 + ripple;
              } else {
                normZ = (Math.random() - 0.5) * 0.08;
              }

              // Draw order for flower: outer petals assemble first, inner bud completes
              // Flower Y goes from ~18 (top, y ~ 1.4) to ~420 (bottom, y ~ -0.35)
              // We want progressive assembly from base of petals up into outer, then inner spiral
              const innerDist = Math.sqrt(dx * dx + dy * dy);
              drawOrder = 0.45 + (1.0 - Math.min(1.0, innerDist / 1.0)) * 0.45 + (Math.random() - 0.5) * 0.1;
              drawOrder = Math.max(0.40, Math.min(1.0, drawOrder));

            } else {
              isFlower = 0.0;
              // Stem & leaves depth
              const isStem = Math.abs(x - centerX) < 32;
              if (isStem) {
                // Cylindrical stem depth
                const stemX = (x - centerX) / 32.0;
                normZ = Math.sqrt(Math.max(0, 1.0 - stemX * stemX)) * 0.06 + (Math.random() - 0.5) * 0.03;
                // Stem draw order: bottom to top (y from 679 up to 400)
                const stemProgress = (680 - y) / 280.0;
                drawOrder = 0.02 + Math.max(0, Math.min(0.28, stemProgress * 0.26)) + (Math.random() - 0.5) * 0.03;
              } else {
                // Leaves: slight forward/backward tilt and curved contour
                const isLeftLeaf = x < centerX;
                const leafSpread = Math.abs(x - centerX) / scaleFactor;
                normZ = (isLeftLeaf ? 0.04 : -0.02) + Math.sin(leafSpread * 3.14) * 0.09 + (Math.random() - 0.5) * 0.04;
                // Leaf draw order: emerges as stem rises (0.22 -> 0.44)
                drawOrder = 0.20 + Math.min(0.25, (leafSpread / 1.1) * 0.25) + (Math.random() - 0.5) * 0.04;
              }
            }

            // Colors: exact match from master reference
            let cr = r / 255.0;
            let cg = g / 255.0;
            let cb = b / 255.0;

            if (isRed) {
              // Enhance deep crimson velvet and bright ruby radiance
              // Boost red saturation, prevent any pastel pink or yellow
              cr = Math.min(1.0, cr * 1.15 + 0.05);
              cg = Math.min(cr * 0.25, cg * 0.7);
              cb = Math.min(cr * 0.35, cb * 0.75);
            } else {
              // Enhance vivid emerald botanical green
              cg = Math.min(1.0, cg * 1.2 + 0.05);
              cr = Math.min(cg * 0.65, cr * 0.8);
              cb = Math.min(cg * 0.35, cb * 0.6);
            }

            // Size: 0.8 to 2.4 depending on luminance
            const pSize = 0.85 + (lum / 255.0) * 1.55;
            const seed = Math.random();

            // Initial starting position below the viewport
            // Staggered Y from -3.5 to -6.2
            const initX = normX * 0.55 + (Math.random() - 0.5) * 0.8;
            const initY = -3.2 - Math.random() * 2.8;
            const initZ = (Math.random() - 0.5) * 1.2;

            particles.push({
              target: [normX, normY, normZ],
              initial: [initX, initY, initZ],
              color: [cr, cg, cb],
              drawOrder,
              size: pSize,
              random: seed,
              isFlower
            });
          }
        }

        resolve({
          count: particles.length,
          particles
        });
      };
      img.src = 'data:image/jpeg;base64,${b64}';
    })`,
    awaitPromise: true,
    returnByValue: true
  });

  const { count, particles } = result.result.value;
  console.log(`Extracted ${count} particles from master rose reference!`);

  // Pack into binary buffer
  // Format:
  // count (uint32)
  // posInitial: Float32Array (count * 3)
  // posTarget: Float32Array (count * 3)
  // colorRGB: Float32Array (count * 3)
  // drawOrders: Float32Array (count)
  // sizes: Float32Array (count)
  // randomSeeds: Float32Array (count)
  // isFlower: Float32Array (count)

  const headerBytes = 4;
  const floatBytesPerParticle = (3 + 3 + 3 + 1 + 1 + 1 + 1) * 4; // 13 floats * 4 = 52 bytes
  const totalBufferSize = headerBytes + count * floatBytesPerParticle;
  const buffer = Buffer.alloc(totalBufferSize);

  buffer.writeUInt32LE(count, 0);
  let offset = 4;

  // posInitial
  for (let i = 0; i < count; i++) {
    buffer.writeFloatLE(particles[i].initial[0], offset);
    buffer.writeFloatLE(particles[i].initial[1], offset + 4);
    buffer.writeFloatLE(particles[i].initial[2], offset + 8);
    offset += 12;
  }

  // posTarget
  for (let i = 0; i < count; i++) {
    buffer.writeFloatLE(particles[i].target[0], offset);
    buffer.writeFloatLE(particles[i].target[1], offset + 4);
    buffer.writeFloatLE(particles[i].target[2], offset + 8);
    offset += 12;
  }

  // colorRGB
  for (let i = 0; i < count; i++) {
    buffer.writeFloatLE(particles[i].color[0], offset);
    buffer.writeFloatLE(particles[i].color[1], offset + 4);
    buffer.writeFloatLE(particles[i].color[2], offset + 8);
    offset += 12;
  }

  // drawOrders
  for (let i = 0; i < count; i++) {
    buffer.writeFloatLE(particles[i].drawOrder, offset);
    offset += 4;
  }

  // sizes
  for (let i = 0; i < count; i++) {
    buffer.writeFloatLE(particles[i].size, offset);
    offset += 4;
  }

  // randomSeeds
  for (let i = 0; i < count; i++) {
    buffer.writeFloatLE(particles[i].random, offset);
    offset += 4;
  }

  // isFlower
  for (let i = 0; i < count; i++) {
    buffer.writeFloatLE(particles[i].isFlower, offset);
    offset += 4;
  }

  fs.writeFileSync(OUTPUT_BIN_PATH, buffer);
  console.log(`Saved master rose binary to ${OUTPUT_BIN_PATH} (${(totalBufferSize / 1024 / 1024).toFixed(2)} MB)`);

  ws.close();
  chromeProc.kill();
}

run().catch(console.error);
