import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const chromeProc = spawn(CHROME_PATH, [
  '--remote-debugging-port=9372',
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  'http://localhost:5173/'
]);

setTimeout(async () => {
  try {
    const list = await new Promise(r => http.get('http://127.0.0.1:9372/json/list', res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => r(JSON.parse(d)));
    }));
    const page = list.find(t => t.type === 'page') || list[0];
    const ws = new WebSocket(page.webSocketDebuggerUrl);
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

    console.log('Waiting for document.fonts.ready...');
    await send('Runtime.evaluate', {
      expression: 'document.fonts.ready',
      awaitPromise: true
    });

    console.log('Generating refined text particles...');
    const result = await send('Runtime.evaluate', {
      expression: `
        (() => {
          const W = 1200;
          const H = 1400;
          const cvs = document.createElement('canvas');
          cvs.width = W; cvs.height = H;
          const ctx = cvs.getContext('2d');

          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, W, H);

          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // Calibrated balanced three lines:
          // Line 1: TURN YOUR
          // Line 2: PHONE
          // Line 3: SIDEWAYS
          const lines = [
            { text: 'TURN YOUR', y: 530, font: '900 114px Cinzel, Montserrat, "Segoe UI", sans-serif', letterSpacing: '10px' },
            { text: 'PHONE', y: 700, font: '900 142px Cinzel, Montserrat, "Segoe UI", sans-serif', letterSpacing: '38px' },
            { text: 'SIDEWAYS', y: 870, font: '900 116px Cinzel, Montserrat, "Segoe UI", sans-serif', letterSpacing: '12px' }
          ];

          for (const line of lines) {
            ctx.font = line.font;
            ctx.letterSpacing = line.letterSpacing;
            ctx.fillText(line.text, W / 2, line.y);
          }

          const imgData = ctx.getImageData(0, 0, W, H).data;
          const rawPoints = [];

          let seed = 42;
          function rand() {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
          }

          let minX = W, maxX = 0, minY = H, maxY = 0;

          // Step 3 for high-density, sharp glowing particles
          const step = 3;
          for (let y = 350; y <= 1050; y += step) {
            for (let x = 100; x <= 1100; x += step) {
              const idx = (y * W + x) * 4;
              const alpha = imgData[idx] / 255.0;
              if (alpha < 0.20) continue;

              const count = (alpha > 0.82) ? 2 : 1;
              for (let s = 0; s < count; s++) {
                const jx = (s === 0) ? 0 : (rand() - 0.5) * step * 0.9;
                const jy = (s === 0) ? 0 : (rand() - 0.5) * step * 0.9;
                const px = x + jx;
                const py = y + jy;

                rawPoints.push({ x: px, y: py, alpha, seed: rand() });
                minX = Math.min(minX, px);
                maxX = Math.max(maxX, px);
                minY = Math.min(minY, py);
                maxY = Math.max(maxY, py);
              }
            }
          }

          const cx = (minX + maxX) / 2;
          const cy = (minY + maxY) / 2;
          const width = maxX - minX;
          const height = maxY - minY;

          // Scale so text width in 3D is ~1.85 units (filling 80% of portrait screen width)
          const scale = width / 1.85;

          const particles = rawPoints.map(p => {
            const tx = (p.x - cx) / scale;
            const ty = (cy - p.y) / scale; // Flip Y for 3D world space
            const tz = (p.seed - 0.5) * 0.04;

            // 0.0 - 0.8s: Cosmic scatter gather (particles gather into letters)
            const angle = p.seed * Math.PI * 2;
            const dist = 1.3 + rand() * 2.4;
            const ix = tx + Math.cos(angle) * dist;
            const iy = ty + Math.sin(angle) * dist + (rand() - 0.5) * 1.6;
            const iz = tz + (rand() - 0.5) * 1.5;

            // 3.8 - 4.3s: Disperse vector (gently disperse and disappear into blackness)
            const dAngle = rand() * Math.PI * 2;
            const dx = Math.cos(dAngle) * (1.2 + rand() * 2.2);
            const dy = Math.sin(dAngle) * (1.2 + rand() * 2.2) + 0.6; // gentle upward drift
            const dz = (rand() - 0.5) * 1.8;

            // Particle size: 1.8 to 3.0
            const size = (p.alpha > 0.8) ? (2.2 + rand() * 1.0) : (1.6 + rand() * 0.8);

            return {
              tx, ty, tz,
              ix, iy, iz,
              dx, dy, dz,
              colorT: p.alpha * (0.6 + 0.4 * rand()),
              size,
              random: rand()
            };
          });

          const dataUrl = cvs.toDataURL('image/png');

          return {
            count: particles.length,
            box: { minX, maxX, minY, maxY, width, height, cx, cy },
            dataUrl,
            particles
          };
        })()
      `,
      returnByValue: true
    });

    const val = result.result.value;
    console.log(`Generated ${val.count} text particles. Bounding box:`, val.box);

    const b64 = val.dataUrl.replace(/^data:image\/png;base64,/, '');
    fs.writeFileSync('C:/Users/SIRI/.gemini/antigravity/brain/a582f0be-f267-4a2a-aa47-d180b23252be/text_raster_preview.png', Buffer.from(b64, 'base64'));
    console.log('Saved text_raster_preview.png');

    const count = val.count;
    const posTarget = new Float32Array(count * 3);
    const posInitial = new Float32Array(count * 3);
    const posDisperse = new Float32Array(count * 3);
    const colorTs = new Float32Array(count);
    const sizes = new Float32Array(count);
    const randomSeeds = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = val.particles[i];
      posTarget[i * 3 + 0] = p.tx;
      posTarget[i * 3 + 1] = p.ty;
      posTarget[i * 3 + 2] = p.tz;

      posInitial[i * 3 + 0] = p.ix;
      posInitial[i * 3 + 1] = p.iy;
      posInitial[i * 3 + 2] = p.iz;

      posDisperse[i * 3 + 0] = p.dx;
      posDisperse[i * 3 + 1] = p.dy;
      posDisperse[i * 3 + 2] = p.dz;

      colorTs[i] = p.colorT;
      sizes[i] = p.size;
      randomSeeds[i] = p.random;
    }

    const totalBytes = 8 + count * 4 * (3 + 3 + 3 + 1 + 1 + 1);
    const buffer = Buffer.alloc(totalBytes);
    buffer.write('TEXT', 0, 4, 'ascii');
    buffer.writeUInt32LE(count, 4);

    let offset = 8;
    function copyFloatArray(arr) {
      Buffer.from(arr.buffer).copy(buffer, offset);
      offset += arr.byteLength;
    }

    copyFloatArray(posTarget);
    copyFloatArray(posInitial);
    copyFloatArray(posDisperse);
    copyFloatArray(colorTs);
    copyFloatArray(sizes);
    copyFloatArray(randomSeeds);

    const outPath = path.resolve('public/text_particles.bin');
    fs.writeFileSync(outPath, buffer);
    console.log(`Saved ${count} text particles (${(totalBytes / 1024).toFixed(1)} KB) to ${outPath}`);

    ws.close();
    chromeProc.kill();
  } catch (err) {
    console.error(err);
    chromeProc.kill();
  }
}, 1000);
