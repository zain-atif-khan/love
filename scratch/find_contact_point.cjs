const fs = require('fs');
const buf = fs.readFileSync('public/love_story.bin');
const count = buf.readUInt32LE(4);

let offset = 8 + count * 3 * 4 + count * 3 * 4; // skip posInitial and posRest
const posTouch = new Float32Array(buf.buffer, buf.byteOffset + offset, count * 3);
offset += count * 3 * 4;
const partTypes = new Float32Array(buf.buffer, buf.byteOffset + offset, count);

// Find contact point: the point of partType 4.5 closest to partType 0.0
let bestPt0 = null;
let bestPt45 = null;
let minDist = Infinity;

const pt0List = [];
const pt45List = [];

for (let i = 0; i < count; i++) {
  const pt = partTypes[i];
  const p = [posTouch[i * 3 + 0], posTouch[i * 3 + 1], posTouch[i * 3 + 2]];
  if (pt === 0.0) pt0List.push(p);
  else if (Math.abs(pt - 4.5) < 0.1) pt45List.push(p);
}

console.log(`Found ${pt0List.length} rose particles, ${pt45List.length} woman reach particles`);

for (const p0 of pt0List) {
  for (const p45 of pt45List) {
    const d = Math.hypot(p0[0] - p45[0], p0[1] - p45[1], p0[2] - p45[2]);
    if (d < minDist) {
      minDist = d;
      bestPt0 = p0;
      bestPt45 = p45;
    }
  }
}

console.log(`Min distance between rose and fingertip: ${minDist.toFixed(4)}`);
console.log(`Rose contact point: [${bestPt0.map(v => v.toFixed(4)).join(', ')}]`);
console.log(`Fingertip contact point: [${bestPt45.map(v => v.toFixed(4)).join(', ')}]`);
const contactPt = [
  (bestPt0[0] + bestPt45[0]) / 2,
  (bestPt0[1] + bestPt45[1]) / 2,
  (bestPt0[2] + bestPt45[2]) / 2,
];
console.log(`EXACT 3D CONTACT POINT: [${contactPt.map(v => v.toFixed(4)).join(', ')}]`);
