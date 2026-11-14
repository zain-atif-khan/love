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

  rpm.scene.position.set(-0.35, 0, 0);
  rpm.scene.rotation.y = 1.35; // ~77 deg

  michelle.scene.position.set(0.35, 0, 0);
  michelle.scene.rotation.y = -1.35; // ~-77 deg

  // Kneeling RPM
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

  // We want to find arm rotation parameters for RPM and Michelle in Pose 2 (Offer & Touch)
  // Let's test a grid of arm rotations
  let bestDist = 999;
  let bestParams = null;

  const rHand = new THREE.Vector3();
  const mTip = new THREE.Vector3();

  // The rose extends from RPM RightHand by vector:
  // length ~0.20m up and towards Michelle
  for (let rpmZ = -0.95; rpmZ <= -0.65; rpmZ += 0.05) {
    for (let rpmX = 0.15; rpmX <= 0.45; rpmX += 0.05) {
      for (let rpmY = -0.30; rpmY <= 0.0; rpmY += 0.05) {
        rpmBones['RightArm'].rotation.set(0.998, -0.019, 0.144);
        rpmBones['RightArm'].rotateZ(rpmZ);
        rpmBones['RightArm'].rotateX(rpmX);
        rpmBones['RightArm'].rotateY(rpmY);
        rpm.scene.updateMatrixWorld(true);
        rpmBones['RightHand'].getWorldPosition(rHand);

        // Rose blossom position: ~0.18m along offering direction
        const roseBlossom = rHand.clone().add(new THREE.Vector3(0.12, 0.12, -0.08));

        for (let mZ = -1.25; mZ <= -0.85; mZ += 0.05) {
          for (let mX = 0.10; mX <= 0.40; mX += 0.05) {
            for (let mY = -0.50; mY <= -0.15; mY += 0.05) {
              mBones['mixamorigRightArm'].rotation.set(0, 0, 0);
              mBones['mixamorigRightArm'].rotateZ(mZ);
              mBones['mixamorigRightArm'].rotateX(mX);
              mBones['mixamorigRightArm'].rotateY(mY);
              michelle.scene.updateMatrixWorld(true);
              mBones['mixamorigRightHandIndex4'].getWorldPosition(mTip);

              const d = mTip.distanceTo(roseBlossom);
              if (d < bestDist) {
                bestDist = d;
                bestParams = { rpmZ, rpmX, rpmY, mZ, mX, mY, rHand: rHand.clone(), roseBlossom, mTip: mTip.clone() };
              }
            }
          }
        }
      }
    }
  }

  console.log('Best Distance to Rose Blossom:', bestDist.toFixed(4));
  console.log('Best Params:', bestParams);
})();
