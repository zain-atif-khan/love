import fs from 'fs';
global.self = global;
global.window = global;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function loadGLTF(path) {
  return new Promise((resolve, reject) => {
    const buf = fs.readFileSync(path);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    new GLTFLoader().parse(ab, '', resolve, reject);
  });
}

(async () => {
  const [rpm, michelle, rose] = await Promise.all([
    loadGLTF('public/readyplayer.me.glb'),
    loadGLTF('public/Michelle.glb'),
    loadGLTF('public/rose.glb')
  ]);

  // Check Michelle's meshes and bounding boxes
  michelle.scene.traverse(c => {
    if (c.isMesh) {
      c.geometry.computeBoundingBox();
      console.log('Michelle mesh:', c.name, c.geometry.boundingBox);
    }
  });

  // Check Rose's meshes and bounding boxes
  rose.scene.traverse(c => {
    if (c.isMesh) {
      c.geometry.computeBoundingBox();
      console.log('Rose mesh:', c.name, c.geometry.boundingBox);
    }
  });
})();
