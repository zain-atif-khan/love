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

  // Pose RPM (Male) into Kneeling Proposal Posture
  const rpmBones = {};
  rpm.scene.traverse(c => { if (c.isBone) rpmBones[c.name] = c; });

  // Lower hips
  if (rpmBones['Hips']) {
    rpmBones['Hips'].position.y -= 0.44;
    rpmBones['Hips'].position.z -= 0.12;
  }

  // Kneeling right leg (knee on ground)
  if (rpmBones['RightUpLeg']) {
    rpmBones['RightUpLeg'].rotation.x = 0.15;
    rpmBones['RightUpLeg'].rotation.z = -0.08;
  }
  if (rpmBones['RightLeg']) {
    rpmBones['RightLeg'].rotation.x = -1.65; // shin along ground
  }
  if (rpmBones['RightFoot']) {
    rpmBones['RightFoot'].rotation.x = 0.95; // foot flexed on toes
  }

  // Upright bent left leg (knee up at 90 deg)
  if (rpmBones['LeftUpLeg']) {
    rpmBones['LeftUpLeg'].rotation.x = -1.48; // thigh forward
    rpmBones['LeftUpLeg'].rotation.z = 0.12;
  }
  if (rpmBones['LeftLeg']) {
    rpmBones['LeftLeg'].rotation.x = 1.55; // shin down
  }
  if (rpmBones['LeftFoot']) {
    rpmBones['LeftFoot'].rotation.x = -0.08; // flat on ground
  }

  // Spine & Head: romantic lean
  if (rpmBones['Spine']) rpmBones['Spine'].rotation.x = -0.10;
  if (rpmBones['Spine1']) rpmBones['Spine1'].rotation.x = -0.08;
  if (rpmBones['Spine2']) rpmBones['Spine2'].rotation.x = -0.08;
  if (rpmBones['Neck']) rpmBones['Neck'].rotation.x = 0.18;
  if (rpmBones['Head']) rpmBones['Head'].rotation.x = 0.15;

  // Left arm resting on left knee
  if (rpmBones['LeftArm']) {
    rpmBones['LeftArm'].rotation.x = -0.65;
    rpmBones['LeftArm'].rotation.z = 0.35;
  }
  if (rpmBones['LeftForeArm']) {
    rpmBones['LeftForeArm'].rotation.x = -0.45;
  }

  // Right arm holding rose forward
  if (rpmBones['RightArm']) {
    rpmBones['RightArm'].rotation.x = -0.85;
    rpmBones['RightArm'].rotation.z = -0.35;
  }
  if (rpmBones['RightForeArm']) {
    rpmBones['RightForeArm'].rotation.x = -0.60;
  }

  // Curl fingers around stem
  for (let f of ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky']) {
    for (let j = 1; j <= 3; j++) {
      const b = rpmBones[`RightHand${f}${j}`];
      if (b) b.rotation.z = -0.45;
    }
  }

  rpm.scene.updateMatrixWorld(true);

  // Check right hand world position
  const rHandPos = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHandPos);
  console.log('Posed Right Hand Position:', rHandPos);

  // Check left knee position
  const lKneePos = new THREE.Vector3();
  rpmBones['LeftLeg'].getWorldPosition(lKneePos);
  console.log('Posed Left Knee Position:', lKneePos);

  // Check right knee position (should be near floor y ~ 0.05)
  const rKneePos = new THREE.Vector3();
  rpmBones['RightLeg'].getWorldPosition(rKneePos);
  console.log('Posed Right Knee Position:', rKneePos);
})();
