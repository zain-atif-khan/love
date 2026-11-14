import fs from 'fs';

const buf = fs.readFileSync('public/love_story.bin');
const count = buf.readUInt32LE(4);
console.log('Count:', count);

let offset = 8;
const readF32 = (n) => {
  const arr = new Float32Array(buf.buffer, buf.byteOffset + offset, n);
  offset += n * 4;
  return arr;
};

const posInitial = readF32(count * 3);
const posRest = readF32(count * 3);
const posTouch = readF32(count * 3);
const partTypes = readF32(count);
const revealOrders = readF32(count);
const sizes = readF32(count);
const colorTs = readF32(count);
const randomSeeds = readF32(count);

function stats(name, arr, stride = 1) {
  let min = [Infinity, Infinity, Infinity];
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < arr.length; i += stride) {
    for (let s = 0; s < stride; s++) {
      const v = arr[i + s];
      if (v < min[s]) min[s] = v;
      if (v > max[s]) max[s] = v;
    }
  }
  console.log(name, { min: min.slice(0, stride), max: max.slice(0, stride) });
}

stats('posRest', posRest, 3);
stats('partTypes', partTypes, 1);
stats('revealOrders', revealOrders, 1);
stats('sizes', sizes, 1);

// Count particles per partType
const counts = {};
for (let i = 0; i < count; i++) {
  const pt = partTypes[i];
  counts[pt] = (counts[pt] || 0) + 1;
}
console.log('Counts per partType:', counts);

// Check sample particles from partType 3 (Man) and partType 4 (Girl)
for (let i = 0; i < count; i++) {
  if (partTypes[i] === 3) {
    console.log('Sample Man Particle:', {
      rest: [posRest[i*3], posRest[i*3+1], posRest[i*3+2]],
      order: revealOrders[i],
      size: sizes[i]
    });
    break;
  }
}

for (let i = 0; i < count; i++) {
  if (partTypes[i] === 4) {
    console.log('Sample Girl Particle:', {
      rest: [posRest[i*3], posRest[i*3+1], posRest[i*3+2]],
      order: revealOrders[i],
      size: sizes[i]
    });
    break;
  }
}
