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

  // Scene setup:
  // RPM at X = -0.38, Y = 0, Z = 0, rotated Y = 1.35
  rpm.scene.position.set(-0.38, 0, 0);
  rpm.scene.rotation.y = 1.35;

  // Michelle at X = +0.38, Y = 0, Z = 0, rotated Y = -1.35
  michelle.scene.position.set(0.38, 0, 0);
  michelle.scene.rotation.y = -1.35;

  // Setup Kneeling Base Pose for RPM:
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

  // --- POSE 1: REST ---
  // RPM right arm holding rose in front of chest
  rpmBones['RightArm'].rotation.set(0.998, -0.019, 0.144);
  rpmBones['RightArm'].rotateZ(-0.45);
  rpmBones['RightArm'].rotateX(0.70);
  rpmBones['RightArm'].rotateY(-0.45);
  rpmBones['RightForeArm'].rotation.set(0, 0, 0);
  rpmBones['RightForeArm'].rotateX(0.60);

  // Michelle Rest pose: arms at sides, head tilted
  mBones['mixamorigRightArm'].rotation.set(0, 0, 0);
  mBones['mixamorigRightArm'].rotateX(1.30);
  mBones['mixamorigLeftArm'].rotation.set(0, 0, 0);
  mBones['mixamorigLeftArm'].rotateX(1.30);
  mBones['mixamorigNeck'].rotation.set(0, 0, 0);
  mBones['mixamorigNeck'].rotateX(0.15);
  mBones['mixamorigHead'].rotation.set(0, 0, 0);
  mBones['mixamorigHead'].rotateX(0.18);

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  const rHand1 = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHand1);
  console.log('POSE 1 RPM Right Hand:', rHand1);

  // --- POSE 2: OFFER & REACH ---
  // RPM extends arm forward and presents rose
  rpmBones['RightArm'].rotation.set(0.998, -0.019, 0.144);
  rpmBones['RightArm'].rotateZ(-0.65);
  rpmBones['RightArm'].rotateX(0.72);
  rpmBones['RightArm'].rotateY(-0.48);
  rpmBones['RightForeArm'].rotation.set(0, 0, 0);
  rpmBones['RightForeArm'].rotateX(0.35);

  // Michelle reaches right arm forward to touch rose
  mBones['mixamorigRightArm'].rotation.set(0, 0, 0);
  mBones['mixamorigRightArm'].rotateZ(-1.20);
  mBones['mixamorigRightArm'].rotateY(0.0);
  mBones['mixamorigRightArm'].rotateX(0.77);
  mBones['mixamorigRightForeArm'].rotation.set(0, 0, 0);
  mBones['mixamorigRightForeArm'].rotateX(0.10);

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  const rHand2 = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHand2);
  const mTip2 = new THREE.Vector3();
  mBones['mixamorigRightHandIndex4'].getWorldPosition(mTip2);

  console.log('POSE 2 RPM Right Hand:', rHand2);
  console.log('POSE 2 Michelle Fingertip:', mTip2);
  console.log('Offset vector:', new THREE.Vector3().subVectors(mTip2, rHand2));
})();
