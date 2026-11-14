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
  const [rpm, michelle] = await Promise.all([
    loadGLTF('public/readyplayer.me.glb'),
    loadGLTF('public/Michelle.glb')
  ]);

  const rpmBones = [];
  rpm.scene.traverse(c => { if (c.isBone) rpmBones.push(c.name); });
  console.log('RPM bones count:', rpmBones.length);

  const mBones = [];
  michelle.scene.traverse(c => { if (c.isBone) mBones.push(c.name); });
  console.log('Michelle bones count:', mBones.length);
  console.log('Sample Michelle right arm bones:', mBones.filter(n => n.includes('Right')));
})();
