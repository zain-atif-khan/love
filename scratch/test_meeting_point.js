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

  const rpmBones = {};
  rpm.scene.traverse(c => { if (c.isBone) rpmBones[c.name] = c; });

  const mBones = {};
  michelle.scene.traverse(c => { if (c.isBone) mBones[c.name] = c; });

  // Place characters in scene
  // RPM at X = -0.36
  rpm.scene.position.set(-0.36, 0, 0);
  rpm.scene.rotation.y = 1.25;

  // Michelle at X = +0.36
  michelle.scene.position.set(0.36, 0, 0);
  michelle.scene.rotation.y = -1.25;

  // 1. Pose RPM Kneeling
  rpmBones['Hips'].position.y -= 0.44;
  rpmBones['Hips'].position.z -= 0.05;

  rpmBones['RightUpLeg'].rotateX(0.15);
  rpmBones['RightLeg'].rotateX(-1.55);
  rpmBones['RightFoot'].rotateX(0.90);

  rpmBones['LeftUpLeg'].rotateX(-1.45);
  rpmBones['LeftLeg'].rotateX(1.45);
  rpmBones['LeftFoot'].rotateX(-0.10);

  rpmBones['Spine'].rotateX(0.14);
  rpmBones['Spine1'].rotateX(0.10);
  rpmBones['Neck'].rotateX(-0.15);
  rpmBones['Head'].rotateX(-0.10);

  rpmBones['LeftArm'].rotateZ(-0.95);
  rpmBones['LeftArm'].rotateX(0.40);
  rpmBones['LeftForeArm'].rotateX(0.40);

  // Curl right hand fingers
  for (let f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
    for (let j = 1; j <= 3; j++) {
      const b = rpmBones[`RightHand${f}${j}`];
      if (b) {
        if (f === 'Thumb') {
          b.rotateY(-0.35);
          b.rotateZ(-0.25);
        } else {
          b.rotateZ(-0.65);
        }
      }
    }
  }

  // --- POSE 2: OFFER & REACH ---
  // RPM Right arm lifts higher and reaches forward towards Michelle
  rpmBones['RightArm'].rotateZ(-0.95);
  rpmBones['RightArm'].rotateX(0.20);
  rpmBones['RightArm'].rotateY(-0.15);
  rpmBones['RightForeArm'].rotateX(0.55);

  // Michelle Reach pose: right arm extends forward and slightly down towards the rose
  mBones['mixamorigRightArm'].rotateZ(-1.08);
  mBones['mixamorigRightArm'].rotateY(-0.35);
  mBones['mixamorigRightArm'].rotateX(0.40); // reach slightly lower
  mBones['mixamorigRightForeArm'].rotateX(0.15);

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  const rHand2 = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHand2);

  const mFingertip2 = new THREE.Vector3();
  mBones['mixamorigRightHandIndex4'].getWorldPosition(mFingertip2);

  console.log('RPM Right Hand (Holding stem):', rHand2);
  console.log('Michelle Fingertip (Index tip):', mFingertip2);
  const diff = new THREE.Vector3().subVectors(mFingertip2, rHand2);
  console.log('Vector from Hand to Fingertip:', diff);
  console.log('Distance between Hand and Fingertip:', diff.length());
})();
