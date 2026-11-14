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
  // RPM at X = -0.42, facing +X and slightly +Z
  rpm.scene.position.set(-0.42, 0, 0);
  rpm.scene.rotation.y = 1.30; // ~74.5 deg

  // Michelle at X = +0.42, facing -X and slightly +Z
  michelle.scene.position.set(0.42, 0, 0);
  michelle.scene.rotation.y = -1.30; // ~-74.5 deg

  // 1. Pose RPM Kneeling
  rpmBones['Hips'].position.y -= 0.44;
  rpmBones['Hips'].position.z -= 0.05;

  rpmBones['RightUpLeg'].rotateX(0.15);
  rpmBones['RightLeg'].rotateX(-1.55);
  rpmBones['RightFoot'].rotateX(0.90);

  rpmBones['LeftUpLeg'].rotateX(-1.45);
  rpmBones['LeftLeg'].rotateX(1.45);
  rpmBones['LeftFoot'].rotateX(-0.10);

  rpmBones['Spine'].rotateX(0.12);
  rpmBones['Spine1'].rotateX(0.08);
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

  // Right arm in Pose 1 (Rest): holding rose in front of chest
  rpmBones['RightArm'].rotateZ(0.95);
  rpmBones['RightArm'].rotateX(0.70);
  rpmBones['RightArm'].rotateY(-0.35);
  rpmBones['RightForeArm'].rotateX(0.85);

  // Michelle in Pose 1 (Rest):
  mBones['mixamorigRightArm'].rotateX(1.30);
  mBones['mixamorigLeftArm'].rotateX(1.30);
  mBones['mixamorigNeck'].rotateX(0.15);
  mBones['mixamorigHead'].rotateX(0.18);

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  const rHandPos1 = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHandPos1);
  console.log('Pose 1 RPM Right Hand World Pos:', rHandPos1);

  // Now Pose 2 (Offer & Touch)
  // Save Pose 1 rotations for RPM RightArm / Forearm
  const rpmArmRot1 = rpmBones['RightArm'].rotation.clone();
  const rpmForeArmRot1 = rpmBones['RightForeArm'].rotation.clone();

  // Michelle Arm rotations Pose 1
  const mArmRot1 = mBones['mixamorigRightArm'].rotation.clone();
  const mForeArmRot1 = mBones['mixamorigRightForeArm'].rotation.clone();

  // Now set Pose 2:
  // RPM Right arm lifts and reaches forward towards Michelle (+X)
  rpmBones['RightArm'].rotateX(-0.55);
  rpmBones['RightArm'].rotateZ(-0.45);
  rpmBones['RightForeArm'].rotateX(-0.35);

  // Michelle Right arm lifts and reaches forward towards RPM (-X)
  mBones['mixamorigRightArm'].rotateX(-1.05); // lift up
  mBones['mixamorigRightArm'].rotateZ(0.55);  // angle towards center
  mBones['mixamorigRightForeArm'].rotateX(0.40);

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  const rHandPos2 = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHandPos2);

  const mFingertip2 = new THREE.Vector3();
  mBones['mixamorigRightHandIndex4'].getWorldPosition(mFingertip2);

  console.log('\nPose 2 RPM Right Hand World Pos:', rHandPos2);
  console.log('Pose 2 Michelle Index Fingertip World Pos:', mFingertip2);
  console.log('Distance between Hand and Fingertip:', rHandPos2.distanceTo(mFingertip2));
})();
