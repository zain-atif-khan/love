import fs from 'fs';
import * as THREE from 'three';

const buf = fs.readFileSync('public/love_story.bin');
console.log('File size:', buf.length);

const magic = buf.toString('ascii', 0, 4);
const count = buf.readUInt32LE(4);
console.log('Magic:', magic, 'Particle Count:', count);

let offset = 8;
const posInit = new Float32Array(buf.buffer, buf.byteOffset + offset, count * 3);
offset += count * 3 * 4;
const posRest = new Float32Array(buf.buffer, buf.byteOffset + offset, count * 3);
offset += count * 3 * 4;
const posTouch = new Float32Array(buf.buffer, buf.byteOffset + offset, count * 3);
offset += count * 3 * 4;
const partTypes = new Float32Array(buf.buffer, buf.byteOffset + offset, count);
offset += count * 4;
const revealOrders = new Float32Array(buf.buffer, buf.byteOffset + offset, count);
offset += count * 4;
const sizes = new Float32Array(buf.buffer, buf.byteOffset + offset, count);
offset += count * 4;
const colorTs = new Float32Array(buf.buffer, buf.byteOffset + offset, count);
offset += count * 4;
const randomSeeds = new Float32Array(buf.buffer, buf.byteOffset + offset, count);

// Check counts per part type and bounding boxes
const partNames = ['Rose Blossom', 'Rose Stem/Leaves', 'Male Right Hand', 'Kneeling Male Body', 'Standing Woman', 'Ambient'];
for (let p = 0; p <= 5; p++) {
  let pCount = 0;
  const bRest = new THREE.Box3();
  const bTouch = new THREE.Box3();
  const v = new THREE.Vector3();
  let minReveal = 999, maxReveal = -999;

  for (let i = 0; i < count; i++) {
    if (Math.round(partTypes[i]) === p) {
      pCount++;
      v.set(posRest[i * 3], posRest[i * 3 + 1], posRest[i * 3 + 2]);
      bRest.expandByPoint(v);

      v.set(posTouch[i * 3], posTouch[i * 3 + 1], posTouch[i * 3 + 2]);
      bTouch.expandByPoint(v);

      const r = revealOrders[i];
      if (r < minReveal) minReveal = r;
      if (r > maxReveal) maxReveal = r;
    }
  }

  console.log(`\nPart ${p} (${partNames[p]}): count = ${pCount}`);
  console.log(`  Reveal Range: [${minReveal.toFixed(3)}, ${maxReveal.toFixed(3)}]`);
  console.log('  Rest BBox:', {
    min: bRest.min.toArray().map(x => x.toFixed(2)),
    max: bRest.max.toArray().map(x => x.toFixed(2))
  });
  console.log('  Touch BBox:', {
    min: bTouch.min.toArray().map(x => x.toFixed(2)),
    max: bTouch.max.toArray().map(x => x.toFixed(2))
  });
}
