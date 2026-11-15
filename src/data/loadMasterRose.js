let cachedMasterRosePromise = null;

export function loadMasterRoseData() {
  if (cachedMasterRosePromise) {
    return cachedMasterRosePromise;
  }

  cachedMasterRosePromise = (async () => {
    const response = await fetch('/master_rose.bin');
    if (!response.ok) {
      throw new Error(`Failed to load master rose binary: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();

    const count = new Uint32Array(arrayBuffer, 0, 1)[0];
    let byteOffset = 4;

    const posInitial = new Float32Array(arrayBuffer, byteOffset, count * 3);
    byteOffset += count * 3 * 4;

    const posTarget = new Float32Array(arrayBuffer, byteOffset, count * 3);
    byteOffset += count * 3 * 4;

    const colorRGB = new Float32Array(arrayBuffer, byteOffset, count * 3);
    byteOffset += count * 3 * 4;

    const drawOrders = new Float32Array(arrayBuffer, byteOffset, count);
    byteOffset += count * 4;

    const sizes = new Float32Array(arrayBuffer, byteOffset, count);
    byteOffset += count * 4;

    const randomSeeds = new Float32Array(arrayBuffer, byteOffset, count);
    byteOffset += count * 4;

    const isFlower = new Float32Array(arrayBuffer, byteOffset, count);

    console.log(`Loaded ${count} master reference rose particles.`);

    return {
      count,
      posInitial,
      posTarget,
      colorRGB,
      drawOrders,
      sizes,
      randomSeeds,
      isFlower
    };
  })();

  return cachedMasterRosePromise;
}
