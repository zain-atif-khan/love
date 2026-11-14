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
  const rpm = await loadGLTF('public/readyplayer.me.glb');
  const bones = {};
  rpm.scene.traverse(c => { if (c.isBone) bones[c.name] = c; });

  const rHand = new THREE.Vector3();
  const lHand = new THREE.Vector3();
  const rFoot = new THREE.Vector3();
  const lFoot = new THREE.Vector3();
  const rKnee = new THREE.Vector3();
  const lKnee = new THREE.Vector3();
  const hips = new THREE.Vector3();
  const head = new THREE.Vector3();

  function dump() {
    rpm.scene.updateMatrixWorld(true);
    bones['RightHand'].getWorldPosition(rHand);
    bones['LeftHand'].getWorldPosition(lHand);
    bones['RightFoot'].getWorldPosition(rFoot);
    bones['LeftFoot'].getWorldPosition(lFoot);
    bones['RightLeg'].getWorldPosition(rKnee);
    bones['LeftLeg'].getWorldPosition(lKnee);
    bones['Hips'].getWorldPosition(hips);
    bones['Head'].getWorldPosition(head);
    console.log({
      hips: hips.toArray().map(v => v.toFixed(3)),
      head: head.toArray().map(v => v.toFixed(3)),
      rKnee: rKnee.toArray().map(v => v.toFixed(3)),
      rFoot: rFoot.toArray().map(v => v.toFixed(3)),
      lKnee: lKnee.toArray().map(v => v.toFixed(3)),
      lFoot: lFoot.toArray().map(v => v.toFixed(3)),
      rHand: rHand.toArray().map(v => v.toFixed(3)),
      lHand: lHand.toArray().map(v => v.toFixed(3)),
    });
  }

  // 1. Lower hips
  bones['Hips'].position.y -= 0.44;
  bones['Hips'].position.z -= 0.05;

  // 2. Right leg (kneeling, knee on ground, foot back)
  bones['RightUpLeg'].rotateX(0.15);
  bones['RightLeg'].rotateX(-1.55);
  bones['RightFoot'].rotateX(0.9);

  // 3. Left leg (thigh forward horizontal, shin down, foot flat on floor)
  bones['LeftUpLeg'].rotateX(-1.45);
  bones['LeftLeg'].rotateX(1.45);
  bones['LeftFoot'].rotateX(-0.1);

  // 4. Romantic lean forward in spine
  bones['Spine'].rotateX(0.12);
  bones['Spine1'].rotateX(0.08);
  bones['Spine2'].rotateX(0.06);
  bones['Neck'].rotateX(-0.15); // lift chin
  bones['Head'].rotateX(-0.10); // look up towards partner

  // 5. Left arm resting on left knee
  bones['LeftArm'].rotateZ(-0.95);
  bones['LeftArm'].rotateX(0.40);
  bones['LeftForeArm'].rotateX(0.40);

  // 6. Right arm holding rose in front of chest
  bones['RightArm'].rotateZ(0.95);
  bones['RightArm'].rotateX(0.70);
  bones['RightArm'].rotateY(-0.35);
  bones['RightForeArm'].rotateX(0.85);

  dump();
})();
