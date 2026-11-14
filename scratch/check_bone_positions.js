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

  function getBonePos(scene, name) {
    let b = null;
    scene.traverse(c => { if (c.name === name) b = c; });
    if (!b) return null;
    const v = new THREE.Vector3();
    b.getWorldPosition(v);
    return v;
  }

  console.log('RPM Bone World Positions:');
  console.log('Hips:', getBonePos(rpm.scene, 'Hips'));
  console.log('Head:', getBonePos(rpm.scene, 'Head'));
  console.log('LeftFoot:', getBonePos(rpm.scene, 'LeftFoot'));
  console.log('RightFoot:', getBonePos(rpm.scene, 'RightFoot'));
  console.log('RightHand:', getBonePos(rpm.scene, 'RightHand'));
  console.log('LeftHand:', getBonePos(rpm.scene, 'LeftHand'));

  console.log('\nMichelle Bone World Positions:');
  console.log('Hips:', getBonePos(michelle.scene, 'mixamorigHips'));
  console.log('Head:', getBonePos(michelle.scene, 'mixamorigHead'));
  console.log('LeftFoot:', getBonePos(michelle.scene, 'mixamorigLeftFoot'));
  console.log('RightFoot:', getBonePos(michelle.scene, 'mixamorigRightFoot'));
  console.log('RightHand:', getBonePos(michelle.scene, 'mixamorigRightHand'));
  console.log('LeftHand:', getBonePos(michelle.scene, 'mixamorigLeftHand'));
})();
