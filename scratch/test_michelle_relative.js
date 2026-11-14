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
  const michelle = await loadGLTF('public/Michelle.glb');
  const bones = {};
  michelle.scene.traverse(c => { if (c.isBone) bones[c.name] = c; });

  const rHand = new THREE.Vector3();
  const rIndex = new THREE.Vector3();
  const lHand = new THREE.Vector3();
  const head = new THREE.Vector3();

  function dump(label) {
    michelle.scene.updateMatrixWorld(true);
    bones['mixamorigRightHand'].getWorldPosition(rHand);
    bones['mixamorigRightHandIndex3'].getWorldPosition(rIndex);
    bones['mixamorigLeftHand'].getWorldPosition(lHand);
    bones['mixamorigHead'].getWorldPosition(head);
    console.log(label, {
      head: head.toArray().map(v => v.toFixed(3)),
      rHand: rHand.toArray().map(v => v.toFixed(3)),
      rIndex: rIndex.toArray().map(v => v.toFixed(3)),
      lHand: lHand.toArray().map(v => v.toFixed(3)),
    });
  }

  console.log('--- Initial Michelle T-Pose ---');
  dump('Initial:');

  // Pose 1 (Rest):
  // Drop both arms naturally along her dress
  bones['mixamorigRightArm'].rotateZ(-1.25);
  bones['mixamorigRightArm'].rotateX(0.15);
  bones['mixamorigLeftArm'].rotateZ(1.25);
  bones['mixamorigLeftArm'].rotateX(0.15);

  // Soft romantic tilt of head looking down toward kneeling partner
  bones['mixamorigNeck'].rotateX(0.15);
  bones['mixamorigHead'].rotateX(0.18);
  bones['mixamorigHead'].rotateY(-0.10);

  dump('Pose 1 (Rest):');

  // Pose 2 (Reach toward rose):
  // Bring right arm up and extend forward
  bones['mixamorigRightArm'].rotateZ(1.0); // lift up
  bones['mixamorigRightArm'].rotateX(0.95); // reach forward
  bones['mixamorigRightArm'].rotateY(-0.30);
  bones['mixamorigRightForeArm'].rotateX(0.40); // slight flex
  bones['mixamorigRightHand'].rotateZ(-0.25); // gentle wrist extension

  dump('Pose 2 (Reach):');
})();
