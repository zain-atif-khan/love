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

function getBonePos(scene, name) {
  let b = null;
  scene.traverse(c => { if (c.name === name) b = c; });
  if (!b) return null;
  const v = new THREE.Vector3();
  b.getWorldPosition(v);
  return v;
}

(async () => {
  const [rpm, michelle] = await Promise.all([
    loadGLTF('public/readyplayer.me.glb'),
    loadGLTF('public/Michelle.glb')
  ]);

  const rpmBones = {};
  rpm.scene.traverse(c => { if (c.isBone) rpmBones[c.name] = c; });

  const mBones = {};
  michelle.scene.traverse(c => { if (c.isBone) mBones[c.name] = c; });

  // Place characters in scene
  // RPM on left, facing +X and slightly +Z
  rpm.scene.position.set(-0.45, 0, 0);
  rpm.scene.rotation.y = 1.35; // ~77 deg

  // Michelle on right, facing -X and slightly +Z
  michelle.scene.position.set(0.45, 0, 0);
  michelle.scene.rotation.y = -1.35; // ~-77 deg

  // Pose RPM: Kneeling proposal pose
  if (rpmBones['Hips']) {
    rpmBones['Hips'].position.y -= 0.44;
    rpmBones['Hips'].position.z -= 0.12;
  }
  // Right leg kneeling
  if (rpmBones['RightUpLeg']) {
    rpmBones['RightUpLeg'].rotation.x = 0.15;
    rpmBones['RightUpLeg'].rotation.z = -0.08;
  }
  if (rpmBones['RightLeg']) {
    rpmBones['RightLeg'].rotation.x = -1.65;
  }
  if (rpmBones['RightFoot']) {
    rpmBones['RightFoot'].rotation.x = 0.95;
  }

  // Left leg bent forward
  if (rpmBones['LeftUpLeg']) {
    rpmBones['LeftUpLeg'].rotation.x = -1.48;
    rpmBones['LeftUpLeg'].rotation.z = 0.12;
  }
  if (rpmBones['LeftLeg']) {
    rpmBones['LeftLeg'].rotation.x = 1.55;
  }
  if (rpmBones['LeftFoot']) {
    rpmBones['LeftFoot'].rotation.x = -0.08;
  }

  // Spine & neck
  if (rpmBones['Spine']) rpmBones['Spine'].rotation.x = -0.12;
  if (rpmBones['Spine1']) rpmBones['Spine1'].rotation.x = -0.10;
  if (rpmBones['Neck']) rpmBones['Neck'].rotation.x = 0.20;
  if (rpmBones['Head']) rpmBones['Head'].rotation.x = 0.15;

  // Left arm resting on knee
  if (rpmBones['LeftArm']) {
    rpmBones['LeftArm'].rotation.x = -0.65;
    rpmBones['LeftArm'].rotation.z = 0.35;
  }
  if (rpmBones['LeftForeArm']) {
    rpmBones['LeftForeArm'].rotation.x = -0.45;
  }

  // Pose 1 (Rest): Right arm holding rose in front of chest
  if (rpmBones['RightArm']) {
    rpmBones['RightArm'].rotation.x = -0.85;
    rpmBones['RightArm'].rotation.z = -0.35;
    rpmBones['RightArm'].rotation.y = 0.20;
  }
  if (rpmBones['RightForeArm']) {
    rpmBones['RightForeArm'].rotation.x = -0.65;
    rpmBones['RightForeArm'].rotation.z = 0.30;
  }

  // Curl fingers around stem
  for (let f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
    for (let j = 1; j <= 3; j++) {
      const b = rpmBones[`RightHand${f}${j}`];
      if (b) {
        if (f === 'Thumb') {
          b.rotation.x = 0.35;
          b.rotation.y = -0.25;
        } else {
          b.rotation.z = -0.55;
        }
      }
    }
  }

  // Pose Michelle: Pose 1 (Rest)
  // Left arm relaxed at side
  if (mBones['mixamorigLeftArm']) {
    mBones['mixamorigLeftArm'].rotation.z = 1.15;
    mBones['mixamorigLeftArm'].rotation.x = 0.10;
  }
  // Right arm relaxed at side
  if (mBones['mixamorigRightArm']) {
    mBones['mixamorigRightArm'].rotation.z = -1.15;
    mBones['mixamorigRightArm'].rotation.x = 0.10;
  }
  // Head gentle tilt
  if (mBones['mixamorigHead']) {
    mBones['mixamorigHead'].rotation.x = 0.25;
    mBones['mixamorigHead'].rotation.y = -0.15;
  }

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  console.log('--- POSE 1 (REST) ---');
  console.log('RPM RightHand:', getBonePos(rpm.scene, 'RightHand'));
  console.log('RPM Head:', getBonePos(rpm.scene, 'Head'));
  console.log('RPM Right Knee:', getBonePos(rpm.scene, 'RightLeg'));
  console.log('RPM Left Knee:', getBonePos(rpm.scene, 'LeftLeg'));
  console.log('Michelle Head:', getBonePos(michelle.scene, 'mixamorigHead'));
  console.log('Michelle RightHand:', getBonePos(michelle.scene, 'mixamorigRightHand'));
  console.log('Michelle RightIndex:', getBonePos(michelle.scene, 'mixamorigRightHandIndex3'));

  // Now Test Pose 2 (Offer & Touch)
  // RPM Right arm extends forward
  rpmBones['RightArm'].rotation.x = -1.35;
  rpmBones['RightArm'].rotation.y = 0.40;
  rpmBones['RightArm'].rotation.z = -0.15;
  rpmBones['RightForeArm'].rotation.x = -0.30;
  rpmBones['RightForeArm'].rotation.z = 0.20;

  // Michelle Right arm extends forward towards the rose
  mBones['mixamorigRightArm'].rotation.z = -0.35;
  mBones['mixamorigRightArm'].rotation.x = -1.10;
  mBones['mixamorigRightArm'].rotation.y = -0.30;
  mBones['mixamorigRightForeArm'].rotation.x = -0.40;
  mBones['mixamorigRightForeArm'].rotation.z = -0.15;
  if (mBones['mixamorigRightHand']) {
    mBones['mixamorigRightHand'].rotation.x = -0.20;
    mBones['mixamorigRightHand'].rotation.z = 0.15;
  }

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  console.log('\n--- POSE 2 (OFFER & TOUCH) ---');
  console.log('RPM RightHand (Offer):', getBonePos(rpm.scene, 'RightHand'));
  console.log('Michelle RightHand (Reach):', getBonePos(michelle.scene, 'mixamorigRightHand'));
  console.log('Michelle RightIndex3 (Fingertip):', getBonePos(michelle.scene, 'mixamorigRightHandIndex3'));
  console.log('Michelle RightIndex4 (Fingertip end):', getBonePos(michelle.scene, 'mixamorigRightHandIndex4'));
})();
