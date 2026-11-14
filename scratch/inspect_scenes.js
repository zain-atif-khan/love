import fs from 'fs';
global.self = global;
global.window = global;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Let's inspect the bounding box, geometry, and materials of Michelle and Rose
function loadGLTF(path) {
  return new Promise((resolve, reject) => {
    const buf = fs.readFileSync(path);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    new GLTFLoader().parse(ab, '', resolve, reject);
  });
}

(async () => {
  const [rose, michelle, xbot] = await Promise.all([
    loadGLTF('public/rose.glb'),
    loadGLTF('public/Michelle.glb'),
    loadGLTF('public/Xbot.glb')
  ]);

  console.log('Rose scene children:', rose.scene.children.map(c => c.name));
  console.log('Michelle scene children:', michelle.scene.children.map(c => c.name));
  console.log('Xbot scene children:', xbot.scene.children.map(c => c.name));
})();
