export async function loadLoveStoryData() {
  const response = await fetch(`/love_story.bin?v=${Date.now()}`);
  if (!response.ok) {
    throw new Error(`Failed to load love story binary: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();

  // Header: 4 bytes ASCII 'LOVE', 4 bytes uint32 particle count
  const count = new Uint32Array(arrayBuffer, 4, 1)[0];
  let byteOffset = 8;

  const posInitial = new Float32Array(arrayBuffer, byteOffset, count * 3);
  byteOffset += count * 3 * 4;

  const posRest = new Float32Array(arrayBuffer, byteOffset, count * 3);
  byteOffset += count * 3 * 4;

  const posTouch = new Float32Array(arrayBuffer, byteOffset, count * 3);
  byteOffset += count * 3 * 4;

  const partTypes = new Float32Array(arrayBuffer, byteOffset, count);
  byteOffset += count * 4;

  const revealOrders = new Float32Array(arrayBuffer, byteOffset, count);
  byteOffset += count * 4;

  const sizes = new Float32Array(arrayBuffer, byteOffset, count);
  byteOffset += count * 4;

  const colorTs = new Float32Array(arrayBuffer, byteOffset, count);
  byteOffset += count * 4;

  const randomSeeds = new Float32Array(arrayBuffer, byteOffset, count);

  console.log(`Loaded ${count} love story particles from binary asset.`);

  return {
    count,
    posInitial,
    posRest,
    posTouch,
    partTypes,
    revealOrders,
    sizes,
    colorTs,
    randomSeeds,
  };
}
