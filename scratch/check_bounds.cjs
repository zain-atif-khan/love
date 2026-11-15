const fs = require('fs');
const buf = fs.readFileSync('public/love_story.bin');
const count = buf.readUInt32LE(4);
console.log('Particle count:', count);
let offset = 8 + count * 3 * 4 + count * 3 * 4; // skip posInitial and posRest
const posTouch = new Float32Array(buf.buffer, buf.byteOffset + offset, count * 3);
offset += count * 3 * 4;
const partTypes = new Float32Array(buf.buffer, buf.byteOffset + offset, count);

const bounds = {};
for (let i = 0; i < count; i++) {
  const pt = partTypes[i].toFixed(1);
  if (!bounds[pt]) {
    bounds[pt] = {
      min: [Infinity, Infinity, Infinity],
      max: [-Infinity, -Infinity, -Infinity],
      sum: [0, 0, 0],
      count: 0
    };
  }
  const x = posTouch[i * 3 + 0];
  const y = posTouch[i * 3 + 1];
  const z = posTouch[i * 3 + 2];
  const b = bounds[pt];
  b.min[0] = Math.min(b.min[0], x);
  b.min[1] = Math.min(b.min[1], y);
  b.min[2] = Math.min(b.min[2], z);
  b.max[0] = Math.max(b.max[0], x);
  b.max[1] = Math.max(b.max[1], y);
  b.max[2] = Math.max(b.max[2], z);
  b.sum[0] += x;
  b.sum[1] += y;
  b.sum[2] += z;
  b.count++;
}

for (const k in bounds) {
  const b = bounds[k];
  console.log(`PartType ${k} (count: ${b.count}):`);
  console.log(`  center: [${(b.sum[0]/b.count).toFixed(3)}, ${(b.sum[1]/b.count).toFixed(3)}, ${(b.sum[2]/b.count).toFixed(3)}]`);
  console.log(`  min: [${b.min[0].toFixed(3)}, ${b.min[1].toFixed(3)}, ${b.min[2].toFixed(3)}]`);
  console.log(`  max: [${b.max[0].toFixed(3)}, ${b.max[1].toFixed(3)}, ${b.max[2].toFixed(3)}]`);
}
