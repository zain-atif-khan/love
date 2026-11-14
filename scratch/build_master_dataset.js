import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const chromeProc = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--remote-debugging-port=9356',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'about:blank'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9356/json/list', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }));
    const ws = new WebSocket(list[0].webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    let id = 1;
    const send = (method, params = {}) => new Promise(res => {
      const i = id++;
      const handler = (ev) => {
        const m = JSON.parse(ev.data);
        if (m.id === i) { ws.removeEventListener('message', handler); res(m.result); }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: i, method, params }));
    });

    const b64 = fs.readFileSync('C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/.user_uploaded/media_1794685300246_ae3bf91a.jpg').toString('base64');
    
    console.log('Sending extraction script to Chrome...');
    const res = await send('Runtime.evaluate', {
      expression: `
        new Promise(resolve => {
          const img = new Image();
          img.onload = () => {
            const w = img.width;   // 1024
            const h = img.height;  // 682
            const cvs = document.createElement('canvas');
            cvs.width = w; cvs.height = h;
            const ctx = cvs.getContext('2d');
            ctx.drawImage(img, 0, 0);
            const imgData = ctx.getImageData(0, 0, w, h).data;

            const scale = 260.0;
            const originX = 512.0;
            const originY = 633.0;

            const particles = [];

            let seed = 12345;
            function rand() {
              seed = (seed * 16807) % 2147483647;
              return (seed - 1) / 2147483646;
            }

            for (let y = 0; y < h; y++) {
              for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const r = imgData[idx];
                const g = imgData[idx + 1];
                const b = imgData[idx + 2];
                const bri = (r + g + b) / 3;

                // Noise cutoff
                if (bri < 14) continue;

                // Calibrated sampling for crystal clarity and stardust definition
                let numSamples = 1;
                if (bri > 160) numSamples = 2;
                else if (bri < 28 && rand() > 0.55) continue;

                for (let s = 0; s < numSamples; s++) {
                  const jx = (s === 0) ? 0 : (rand() - 0.5) * 0.75;
                  const jy = (s === 0) ? 0 : (rand() - 0.5) * 0.75;
                  const px = x + jx;
                  const py = y + jy;

                  const worldX = (px - originX) / scale;
                  const worldY = (originY - py) / scale;

                  let partType = 5.0; // Default ambient
                  let z = (rand() - 0.5) * 0.15;
                  let revealOrder = 0.5;

                  const isRoseRed = (r > 70 && (r > 1.35 * g || r > 1.35 * b));

                  // Priority 1: Woman's Reaching Right Arm & Hand (Fingertip touches rose at px ~ 504..520, py ~ 218..240)
                  if (px >= 504 && px <= 635 && py >= 195 && py <= 260 && (px < 565 || py < 242)) {
                    partType = 4.5;
                    z = (rand() - 0.5) * 0.08;
                    // Materialize smoothly from shoulder toward reaching hand
                    revealOrder = 0.65 + 0.14 * ((635.0 - px) / 131.0);
                  }
                  // Priority 2: Rose Blossom (crimson bloom) strictly px <= 503 so woman finger never bleeds into rose
                  else if (px >= 458 && px <= 503 && py >= 215 && py <= 272 && isRoseRed) {
                    partType = 0.0;
                    const rRose = Math.hypot((px - 485) / scale, (py - 240) / scale);
                    const zSpan = Math.sqrt(Math.max(0.0001, 0.08 * 0.08 - rRose * rRose));
                    z = (rand() - 0.5) * 2.0 * zSpan;
                    revealOrder = 0.02 + 0.12 * Math.min(1.0, rRose / 0.075);
                  }
                  // Priority 3: Rose Stem & Calyx
                  else if (px >= 450 && px <= 500 && py >= 265 && py <= 325 && (isRoseRed || (px >= 465 && px <= 488))) {
                    partType = 1.0;
                    z = (rand() - 0.5) * 0.04;
                    revealOrder = 0.12 + 0.08 * ((py - 265) / 60.0);
                  }
                  // Priority 4: Man's Hand wrapping the stem
                  else if (px >= 445 && px <= 495 && py >= 282 && py <= 335) {
                    partType = 2.0;
                    z = (rand() - 0.5) * 0.08;
                    revealOrder = 0.20 + 0.12 * ((py - 282) / 53.0);
                  }
                  // Priority 5: Man's Right Arm (extending arm from shoulder to wrist)
                  else if (px >= 325 && px <= 470 && py >= 255 && py <= 380 && (py - 0.65 * px > 15 || px > 375)) {
                    partType = 3.5;
                    z = (rand() - 0.5) * 0.12;
                    revealOrder = 0.34 + 0.12 * ((px - 325) / 145.0);
                  }
                  // Priority 6: Kneeling Man Body (head, hair, suit, legs, feet)
                  else if (px < 485) {
                    partType = 3.0;
                    z = (rand() - 0.5) * 0.18;
                    revealOrder = 0.36 + 0.22 * ((py - 170) / 460.0);
                  }
                  // Priority 7: Standing Woman Body & Flowing Ballgown
                  else if (px >= 485) {
                    partType = 4.0;
                    if (py > 275) {
                      const skirtLeft = 520.0 + (py - 275) * (500.0 - 520.0) / 358.0;
                      const skirtRight = 680.0 + (py - 275) * (930.0 - 680.0) / 358.0;
                      const skirtMid = (skirtLeft + skirtRight) * 0.5;
                      const skirtRadius = (skirtRight - skirtLeft) * 0.5 / scale;
                      const dxNorm = Math.abs((px - skirtMid) / ((skirtRight - skirtLeft) * 0.5));
                      const maxZ = skirtRadius * Math.sqrt(Math.max(0.01, 1.0 - Math.min(1.0, dxNorm * dxNorm)));
                      z = (rand() > 0.5 ? 1 : -1) * (0.35 + 0.65 * rand()) * maxZ;
                    } else {
                      z = (rand() - 0.5) * 0.14;
                    }
                    revealOrder = 0.60 + 0.28 * ((py - 65) / 568.0);
                  }

                  const colorT = Math.min(1.0, Math.max(0.0, bri / 255.0));
                  const baseSize = (partType === 0.0) ? 2.5 : ((bri > 150) ? 2.0 : 1.6);
                  const size = baseSize * (0.8 + 0.4 * rand());

                  particles.push({
                    touchX: worldX,
                    touchY: worldY,
                    touchZ: z,
                    partType,
                    revealOrder: Math.min(0.95, Math.max(0.01, revealOrder)),
                    size,
                    colorT,
                    randSeed: rand(),
                    rawX: px,
                    rawY: py
                  });
                }
              }
            }

            resolve(particles);
          };
          img.src = 'data:image/jpeg;base64,${b64}';
        })
      `,
      awaitPromise: true,
      returnByValue: true
    });

    const particles = res.result.value;
    console.log(`Extracted ${particles.length} calibrated particles from master reference.`);

    // Pivots for realistic human skeletal rotation
    const mPivX = (335 - 512) / 260.0;
    const mPivY = (633 - 280) / 260.0;

    const wPivX = (625 - 512) / 260.0;
    const wPivY = (633 - 205) / 260.0;

    const count = particles.length;
    const posInitial = new Float32Array(count * 3);
    const posRest = new Float32Array(count * 3);
    const posTouch = new Float32Array(count * 3);
    const partTypes = new Float32Array(count);
    const revealOrders = new Float32Array(count);
    const sizes = new Float32Array(count);
    const colorTs = new Float32Array(count);
    const randomSeeds = new Float32Array(count);

    let seed = 999;
    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }

    for (let i = 0; i < count; i++) {
      const p = particles[i];
      const tx = p.touchX;
      const ty = p.touchY;
      const tz = p.touchZ;

      // 1. posTouch: Exact Ground-Truth Reference
      posTouch[i * 3 + 0] = tx;
      posTouch[i * 3 + 1] = ty;
      posTouch[i * 3 + 2] = tz;

      // 2. posRest: Un-offered Resting Pose
      let rx = tx;
      let ry = ty;
      let rz = tz;

      if (p.partType === 0.0 || p.partType === 1.0 || p.partType === 2.0) {
        // Rose blossom, stem, man hand: held gently in front of chest
        rx = tx - 0.28;
        ry = ty - 0.26;
        rz = tz + 0.04;
      } else if (p.partType === 3.5) {
        // Man right arm: blends from shoulder (fixed) to hand (offset)
        const armDist = Math.hypot(tx - mPivX, ty - mPivY);
        const armT = Math.min(1.0, Math.max(0.0, armDist / 0.55));
        rx = tx - 0.28 * armT;
        ry = ty - 0.26 * armT;
        rz = tz + 0.04 * armT;
      } else if (p.partType === 4.5) {
        // Woman reaching arm & hand: smoothly rotates downward to rest along her side/gown
        const dx = tx - wPivX;
        const dy = ty - wPivY;
        const armDist = Math.hypot(dx, dy);
        const armT = Math.min(1.0, Math.max(0.0, armDist / 0.52));
        
        // Rotate arm by ~50 degrees downward around shoulder
        const rot = 0.88 * armT; // in radians
        const cosR = Math.cos(rot);
        const sinR = Math.sin(rot);
        const rdx = dx * cosR - dy * sinR;
        const rdy = dx * sinR + dy * cosR;

        rx = wPivX + rdx;
        ry = wPivY + rdy;
        rz = tz + 0.04 * armT;
      }

      posRest[i * 3 + 0] = rx;
      posRest[i * 3 + 1] = ry;
      posRest[i * 3 + 2] = rz;

      // 3. posInitial: Cosmic stardust cloud
      const angle = rand() * Math.PI * 2;
      const radius = 1.2 + rand() * 2.8;
      posInitial[i * 3 + 0] = rx + Math.cos(angle) * radius;
      posInitial[i * 3 + 1] = ry + (rand() - 0.4) * 3.2;
      posInitial[i * 3 + 2] = rz + Math.sin(angle) * radius * 0.8;

      partTypes[i] = p.partType;
      revealOrders[i] = p.revealOrder;
      sizes[i] = p.size;
      colorTs[i] = p.colorT;
      randomSeeds[i] = p.randSeed;
    }

    const totalBytes = 8 + count * 4 * (3 + 3 + 3 + 1 + 1 + 1 + 1 + 1);
    const buffer = Buffer.alloc(totalBytes);
    buffer.write('LOVE', 0, 4, 'ascii');
    buffer.writeUInt32LE(count, 4);

    let offset = 8;
    function copyFloatArray(arr) {
      Buffer.from(arr.buffer).copy(buffer, offset);
      offset += arr.byteLength;
    }

    copyFloatArray(posInitial);
    copyFloatArray(posRest);
    copyFloatArray(posTouch);
    copyFloatArray(partTypes);
    copyFloatArray(revealOrders);
    copyFloatArray(sizes);
    copyFloatArray(colorTs);
    copyFloatArray(randomSeeds);

    const outPath = path.resolve('public/love_story.bin');
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved ${count} particles (${(totalBytes / 1024 / 1024).toFixed(2)} MB) to ${outPath}`);

    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
