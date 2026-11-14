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

  // List all bones in readyplayer.me.glb
  const rpmBones = {};
  rpm.scene.traverse((c) => {
    if (c.isBone) rpmBones[c.name] = c;
  });
  console.log('RPM Bones:', Object.keys(rpmBones));

  // List all bones in Michelle.glb
  const michelleBones = {};
  michelle.scene.traverse((c) => {
    if (c.isBone) michelleBones[c.name] = c;
  });
  console.log('Michelle Bones:', Object.keys(michelleBones));
})();
