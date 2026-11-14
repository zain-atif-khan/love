export async function loadParticlesData() {
  const response = await fetch('/particles.bin');
  if (!response.ok) {
    throw new Error(`Failed to load particles binary: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  
  const count = new Uint32Array(arrayBuffer, 0, 1)[0];
  let byteOffset = 4;
  
  const posInitial = new Float32Array(arrayBuffer, byteOffset, count * 3);
  byteOffset += count * 3 * 4;
  
  const posCloud = new Float32Array(arrayBuffer, byteOffset, count * 3);
  byteOffset += count * 3 * 4;
  
  const posTarget = new Float32Array(arrayBuffer, byteOffset, count * 3);
  byteOffset += count * 3 * 4;
  
  const drawOrders = new Float32Array(arrayBuffer, byteOffset, count);
  byteOffset += count * 4;
  
  const randomSeeds = new Float32Array(arrayBuffer, byteOffset, count);
  byteOffset += count * 4;
  
  const colorTs = new Float32Array(arrayBuffer, byteOffset, count);
  byteOffset += count * 4;
  
  const sizes = new Float32Array(arrayBuffer, byteOffset, count);
  
  return {
    count,
    posInitial,
    posCloud,
    posTarget,
    drawOrders,
    randomSeeds,
    colorTs,
    sizes
  };
}
