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

// Evaluates skinned vertices directly into world space
function bakeSkinnedPositions(skinnedMesh) {
  const geo = skinnedMesh.geometry;
  const pos = geo.attributes.position;
  const skinIndex = geo.attributes.skinIndex;
  const skinWeight = geo.attributes.skinWeight;
  const skeleton = skinnedMesh.skeleton;

  skeleton.update();
  const boneMatrices = skeleton.boneMatrices;
  const baked = new Float32Array(pos.count * 3);

  const v = new THREE.Vector3();
  const temp = new THREE.Vector3();
  const boneMat = new THREE.Matrix4();

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const result = new THREE.Vector3(0, 0, 0);

    for (let j = 0; j < 4; j++) {
      const weight = skinWeight.getComponent(i, j);
      if (weight > 0) {
        const bIdx = skinIndex.getComponent(i, j);
        boneMat.fromArray(boneMatrices, bIdx * 16);
        temp.copy(v).applyMatrix4(boneMat).multiplyScalar(weight);
        result.add(temp);
      }
    }

    // result is already in correct world space
    baked[i * 3]     = result.x;
    baked[i * 3 + 1] = result.y;
    baked[i * 3 + 2] = result.z;
  }
  return baked;
}

// Uniform Surface Sampler for Three.js geometry with barycentric tracking
class SurfaceSampler {
  constructor(mesh) {
    this.geometry = mesh.geometry;
    this.index = this.geometry.index;
    this.pos = this.geometry.attributes.position;

    const triangleCount = this.index ? this.index.count / 3 : this.pos.count / 3;
    this.triangleCount = triangleCount;

    const a = new THREE.Vector3();
    const b = new THREE.Vector3();
    const c = new THREE.Vector3();
    const ab = new THREE.Vector3();
    const ac = new THREE.Vector3();
    const cross = new THREE.Vector3();

    this.distribution = new Float32Array(triangleCount);
    let totalArea = 0;

    for (let i = 0; i < triangleCount; i++) {
      let i0 = i * 3, i1 = i * 3 + 1, i2 = i * 3 + 2;
      if (this.index) {
        i0 = this.index.getX(i0);
        i1 = this.index.getX(i1);
        i2 = this.index.getX(i2);
      }
      a.fromBufferAttribute(this.pos, i0);
      b.fromBufferAttribute(this.pos, i1);
      c.fromBufferAttribute(this.pos, i2);

      ab.subVectors(b, a);
      ac.subVectors(c, a);
      cross.crossVectors(ab, ac);
      const area = cross.length() * 0.5;

      totalArea += area;
      this.distribution[i] = totalArea;
    }
    this.totalArea = totalArea;
  }

  sampleFaceIndex() {
    const r = Math.random() * this.totalArea;
    let low = 0, high = this.triangleCount - 1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (mid === 0 || (this.distribution[mid - 1] <= r && this.distribution[mid] > r)) {
        return mid;
      } else if (r < this.distribution[mid]) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return Math.min(low, this.triangleCount - 1);
  }

  sample(n) {
    const samples = [];
    for (let k = 0; k < n; k++) {
      const faceIdx = this.sampleFaceIndex();
      let i0 = faceIdx * 3, i1 = faceIdx * 3 + 1, i2 = faceIdx * 3 + 2;
      if (this.index) {
        i0 = this.index.getX(i0);
        i1 = this.index.getX(i1);
        i2 = this.index.getX(i2);
      }
      let u = Math.random();
      let v = Math.random();
      if (u + v > 1) {
        u = 1 - u;
        v = 1 - v;
      }
      const w = 1 - u - v;
      samples.push({ i0, i1, i2, u, v, w });
    }
    return samples;
  }
}

(async () => {
  console.log('Loading 3D Models (ReadyPlayerMe, Michelle, Rose)...');
  const [rpm, michelle, rose] = await Promise.all([
    loadGLTF('public/readyplayer.me.glb'),
    loadGLTF('public/Michelle.glb'),
    loadGLTF('public/rose.glb')
  ]);
  console.log('Models loaded.');

  const rpmBones = {};
  rpm.scene.traverse(c => { if (c.isBone) rpmBones[c.name] = c; });

  const mBones = {};
  michelle.scene.traverse(c => { if (c.isBone) mBones[c.name] = c; });

  // Place characters in scene
  // RPM at X = -0.38
  rpm.scene.position.set(-0.38, 0, 0);
  rpm.scene.rotation.y = 1.35;

  // Michelle at X = +0.38
  michelle.scene.position.set(0.38, 0, 0);
  michelle.scene.rotation.y = -1.35;

  // Setup Base Kneeling Body for RPM
  rpmBones['Hips'].position.y -= 0.44;
  rpmBones['Hips'].position.z -= 0.05;

  rpmBones['RightUpLeg'].rotateX(0.15);
  rpmBones['RightLeg'].rotateX(-1.55);
  rpmBones['RightFoot'].rotateX(0.90);

  rpmBones['LeftUpLeg'].rotateX(-1.45);
  rpmBones['LeftLeg'].rotateX(1.45);
  rpmBones['LeftFoot'].rotateX(-0.10);

  rpmBones['Spine'].rotateX(0.16);
  rpmBones['Spine1'].rotateX(0.10);
  rpmBones['Neck'].rotateX(-0.15);
  rpmBones['Head'].rotateX(-0.10);

  rpmBones['LeftArm'].rotateZ(-0.95);
  rpmBones['LeftArm'].rotateX(0.40);
  rpmBones['LeftForeArm'].rotateX(0.40);

  // Curl Right Hand Fingers around stem
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

  // --- POSE 1 (REST) ---
  rpmBones['RightArm'].rotation.set(0.998, -0.019, 0.144);
  rpmBones['RightArm'].rotateZ(-0.45);
  rpmBones['RightArm'].rotateX(0.70);
  rpmBones['RightArm'].rotateY(-0.45);
  rpmBones['RightForeArm'].rotation.set(0, 0, 0);
  rpmBones['RightForeArm'].rotateX(0.60);

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

  // Bake all meshes for Pose 1
  const rpmBakedP1 = {};
  rpm.scene.traverse(c => {
    if (c.isSkinnedMesh) rpmBakedP1[c.name] = bakeSkinnedPositions(c);
  });
  let michelleMesh = null;
  michelle.scene.traverse(c => { if (c.name === 'Ch03') michelleMesh = c; });
  const michelleBakedP1 = bakeSkinnedPositions(michelleMesh);

  const rHandP1 = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHandP1);

  // --- POSE 2 (OFFER & REACH) ---
  rpmBones['RightArm'].rotation.set(0.998, -0.019, 0.144);
  rpmBones['RightArm'].rotateZ(-0.95);
  rpmBones['RightArm'].rotateX(0.35);
  rpmBones['RightArm'].rotateY(-0.25);
  rpmBones['RightForeArm'].rotation.set(0, 0, 0);
  rpmBones['RightForeArm'].rotateX(0.25);

  mBones['mixamorigRightArm'].rotation.set(0, 0, 0);
  mBones['mixamorigRightArm'].rotateZ(-1.20);
  mBones['mixamorigRightArm'].rotateY(0.0);
  mBones['mixamorigRightArm'].rotateX(0.77);
  mBones['mixamorigRightForeArm'].rotation.set(0, 0, 0);
  mBones['mixamorigRightForeArm'].rotateX(0.10);

  rpm.scene.updateMatrixWorld(true);
  michelle.scene.updateMatrixWorld(true);

  // Bake all meshes for Pose 2
  const rpmBakedP2 = {};
  rpm.scene.traverse(c => {
    if (c.isSkinnedMesh) rpmBakedP2[c.name] = bakeSkinnedPositions(c);
  });
  const michelleBakedP2 = bakeSkinnedPositions(michelleMesh);

  const rHandP2 = new THREE.Vector3();
  rpmBones['RightHand'].getWorldPosition(rHandP2);
  const mTipP2 = new THREE.Vector3();
  mBones['mixamorigRightHandIndex4'].getWorldPosition(mTipP2);

  console.log('Pose 1 Hand:', rHandP1);
  console.log('Pose 2 Hand:', rHandP2);
  console.log('Pose 2 Fingertip:', mTipP2);

  // Rose Alignment:
  // In rose.glb: stem base is at Z = 0, blossom is at Z = -1.74.
  // Direction from stem base to blossom top in rose.glb is (0, 0, -1).
  const roseScale = mTipP2.distanceTo(rHandP2) / 1.74;
  console.log('Rose Scale computed:', roseScale);

  function getRoseTransform(basePos, targetBlossomPos) {
    const dir = new THREE.Vector3().subVectors(targetBlossomPos, basePos).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    const m = new THREE.Matrix4().compose(basePos, q, new THREE.Vector3(roseScale, roseScale, roseScale));
    return m;
  }

  const roseMatP1 = getRoseTransform(
    rHandP1,
    rHandP1.clone().add(new THREE.Vector3(0.05, 0.22, 0.02))
  );
  const roseMatP2 = getRoseTransform(rHandP2, mTipP2);

  const particles = [];

  // 1. ROSE BLOSSOM (partType = 0) & STEM/LEAVES (partType = 1)
  let roseBlossomMesh = null;
  let roseStemMesh = null;
  rose.scene.traverse(c => {
    if (c.name === 'Rosediss') roseBlossomMesh = c;
    if (c.name === 'Rosediss001') roseStemMesh = c;
  });

  const roseSampler = new SurfaceSampler(roseBlossomMesh);
  const roseSamples = roseSampler.sample(24000);

  const vA = new THREE.Vector3();
  const vB = new THREE.Vector3();
  const vC = new THREE.Vector3();
  const pLocal = new THREE.Vector3();

  for (let s of roseSamples) {
    vA.fromBufferAttribute(roseBlossomMesh.geometry.attributes.position, s.i0);
    vB.fromBufferAttribute(roseBlossomMesh.geometry.attributes.position, s.i1);
    vC.fromBufferAttribute(roseBlossomMesh.geometry.attributes.position, s.i2);

    pLocal.set(0, 0, 0)
      .addScaledVector(vA, s.u)
      .addScaledVector(vB, s.v)
      .addScaledVector(vC, s.w);

    const posRest = pLocal.clone().applyMatrix4(roseMatP1);
    const posTouch = pLocal.clone().applyMatrix4(roseMatP2);

    const isBlossom = pLocal.z < -1.15;
    const partType = isBlossom ? 0 : 1;

    const posInit = posRest.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.4
    ));

    let revealOrder = 0;
    if (isBlossom) {
      const r = Math.sqrt(pLocal.x * pLocal.x + pLocal.y * pLocal.y);
      revealOrder = (r / 0.5) * 0.07;
    } else {
      const t = (pLocal.z + 1.15) / 1.15;
      revealOrder = 0.07 + t * 0.06;
    }

    particles.push({
      posInitial: posInit,
      posRest,
      posTouch,
      partType,
      revealOrder: Math.min(Math.max(revealOrder, 0.0), 0.14),
      size: isBlossom ? (1.3 + Math.random() * 0.8) : (1.1 + Math.random() * 0.6),
      colorT: Math.random(),
      randomSeed: Math.random(),
    });
  }

  // Sample Calyx
  if (roseStemMesh) {
    const calyxSampler = new SurfaceSampler(roseStemMesh);
    const calyxSamples = calyxSampler.sample(3000);
    for (let s of calyxSamples) {
      vA.fromBufferAttribute(roseStemMesh.geometry.attributes.position, s.i0);
      vB.fromBufferAttribute(roseStemMesh.geometry.attributes.position, s.i1);
      vC.fromBufferAttribute(roseStemMesh.geometry.attributes.position, s.i2);
      pLocal.set(0, 0, 0)
        .addScaledVector(vA, s.u)
        .addScaledVector(vB, s.v)
        .addScaledVector(vC, s.w);

      const posRest = pLocal.clone().applyMatrix4(roseMatP1);
      const posTouch = pLocal.clone().applyMatrix4(roseMatP2);
      const posInit = posRest.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3,
        (Math.random() - 0.5) * 0.3
      ));

      particles.push({
        posInitial: posInit,
        posRest,
        posTouch,
        partType: 1,
        revealOrder: 0.08 + Math.random() * 0.04,
        size: 1.1 + Math.random() * 0.5,
        colorT: Math.random(),
        randomSeed: Math.random(),
      });
    }
  }

  console.log(`Sampled ${particles.length} Rose particles.`);

  // 2. MALE CHARACTER (RPM): Right Hand (partType = 2) & Kneeling Body (partType = 3)
  let bodyMesh = null;
  rpm.scene.traverse(c => { if (c.name === 'Wolf3D_Body') bodyMesh = c; });

  const rHandBoneIndices = new Set();
  bodyMesh.skeleton.bones.forEach((b, idx) => {
    if (b.name.includes('RightHand')) rHandBoneIndices.add(idx);
  });

  const skinIndexAttr = bodyMesh.geometry.attributes.skinIndex;
  const skinWeightAttr = bodyMesh.geometry.attributes.skinWeight;

  function isRHandVertex(vIdx) {
    for (let j = 0; j < 4; j++) {
      if (skinWeightAttr.getComponent(vIdx, j) > 0.15 && rHandBoneIndices.has(skinIndexAttr.getComponent(vIdx, j))) {
        return true;
      }
    }
    return false;
  }

  const rpmMeshes = [
    { name: 'Wolf3D_Body', count: 18000 },
    { name: 'Wolf3D_Head', count: 9000 },
    { name: 'Wolf3D_Headwear', count: 7000 },
    { name: 'Wolf3D_Outfit_Top', count: 16000 },
    { name: 'Wolf3D_Outfit_Bottom', count: 12000 },
    { name: 'Wolf3D_Outfit_Footwear', count: 4000 }
  ];

  for (let mInfo of rpmMeshes) {
    let m = null;
    rpm.scene.traverse(c => { if (c.name === mInfo.name) m = c; });
    if (!m) continue;

    const sampler = new SurfaceSampler(m);
    const samples = sampler.sample(mInfo.count);
    const p1 = rpmBakedP1[mInfo.name];
    const p2 = rpmBakedP2[mInfo.name];

    for (let s of samples) {
      const vA1 = new THREE.Vector3(p1[s.i0 * 3], p1[s.i0 * 3 + 1], p1[s.i0 * 3 + 2]);
      const vB1 = new THREE.Vector3(p1[s.i1 * 3], p1[s.i1 * 3 + 1], p1[s.i1 * 3 + 2]);
      const vC1 = new THREE.Vector3(p1[s.i2 * 3], p1[s.i2 * 3 + 1], p1[s.i2 * 3 + 2]);

      const posRest = new THREE.Vector3(0, 0, 0)
        .addScaledVector(vA1, s.u)
        .addScaledVector(vB1, s.v)
        .addScaledVector(vC1, s.w);

      const vA2 = new THREE.Vector3(p2[s.i0 * 3], p2[s.i0 * 3 + 1], p2[s.i0 * 3 + 2]);
      const vB2 = new THREE.Vector3(p2[s.i1 * 3], p2[s.i1 * 3 + 1], p2[s.i1 * 3 + 2]);
      const vC2 = new THREE.Vector3(p2[s.i2 * 3], p2[s.i2 * 3 + 1], p2[s.i2 * 3 + 2]);

      const posTouch = new THREE.Vector3(0, 0, 0)
        .addScaledVector(vA2, s.u)
        .addScaledVector(vB2, s.v)
        .addScaledVector(vC2, s.w);

      let isHand = false;
      if (mInfo.name === 'Wolf3D_Body') {
        isHand = isRHandVertex(s.i0) || isRHandVertex(s.i1) || isRHandVertex(s.i2);
      }

      let partType = isHand ? 2 : 3;
      let revealOrder = 0;

      if (isHand) {
        revealOrder = 0.16 + Math.random() * 0.08;
      } else {
        const hNorm = Math.min(Math.max(posRest.y / 1.45, 0.0), 1.0);
        revealOrder = 0.26 + hNorm * 0.22;
      }

      const posInit = posRest.clone().add(new THREE.Vector3(
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8,
        (Math.random() - 0.5) * 0.8
      ));

      particles.push({
        posInitial: posInit,
        posRest,
        posTouch,
        partType,
        revealOrder,
        size: isHand ? (1.2 + Math.random() * 0.6) : (1.1 + Math.random() * 0.6),
        colorT: Math.random(),
        randomSeed: Math.random(),
      });
    }
  }

  console.log(`Total particles after Male: ${particles.length}`);

  // 3. FEMALE CHARACTER (Michelle): Standing Woman (partType = 4)
  const michelleSampler = new SurfaceSampler(michelleMesh);
  const michelleSamples = michelleSampler.sample(48000);

  const mP1 = michelleBakedP1;
  const mP2 = michelleBakedP2;

  for (let s of michelleSamples) {
    const vA1 = new THREE.Vector3(mP1[s.i0 * 3], mP1[s.i0 * 3 + 1], mP1[s.i0 * 3 + 2]);
    const vB1 = new THREE.Vector3(mP1[s.i1 * 3], mP1[s.i1 * 3 + 1], mP1[s.i1 * 3 + 2]);
    const vC1 = new THREE.Vector3(mP1[s.i2 * 3], mP1[s.i2 * 3 + 1], mP1[s.i2 * 3 + 2]);

    const posRest = new THREE.Vector3(0, 0, 0)
      .addScaledVector(vA1, s.u)
      .addScaledVector(vB1, s.v)
      .addScaledVector(vC1, s.w);

    const vA2 = new THREE.Vector3(mP2[s.i0 * 3], mP2[s.i0 * 3 + 1], mP2[s.i0 * 3 + 2]);
    const vB2 = new THREE.Vector3(mP2[s.i1 * 3], mP2[s.i1 * 3 + 1], mP2[s.i1 * 3 + 2]);
    const vC2 = new THREE.Vector3(mP2[s.i2 * 3], mP2[s.i2 * 3 + 1], mP2[s.i2 * 3 + 2]);

    const posTouch = new THREE.Vector3(0, 0, 0)
      .addScaledVector(vA2, s.u)
      .addScaledVector(vB2, s.v)
      .addScaledVector(vC2, s.w);

    const hNorm = Math.min(Math.max(posRest.y / 1.66, 0.0), 1.0);
    const revealOrder = 0.52 + hNorm * 0.26;

    const posInit = posRest.clone().add(new THREE.Vector3(
      (Math.random() - 0.5) * 0.9,
      (Math.random() - 0.5) * 0.9,
      (Math.random() - 0.5) * 0.9
    ));

    particles.push({
      posInitial: posInit,
      posRest,
      posTouch,
      partType: 4,
      revealOrder,
      size: 1.1 + Math.random() * 0.6,
      colorT: Math.random(),
      randomSeed: Math.random(),
    });
  }

  console.log(`Total particles after Female: ${particles.length}`);

  // 4. AMBIENT STARDUST (partType = 5)
  for (let i = 0; i < 3000; i++) {
    const x = (Math.random() - 0.5) * 2.2;
    const y = Math.random() * 1.6;
    const z = (Math.random() - 0.5) * 1.5;
    const pos = new THREE.Vector3(x, y, z);
    particles.push({
      posInitial: pos,
      posRest: pos,
      posTouch: pos,
      partType: 5,
      revealOrder: Math.random() * 0.4,
      size: 0.8 + Math.random() * 0.6,
      colorT: Math.random(),
      randomSeed: Math.random(),
    });
  }

  const count = particles.length;
  console.log(`TOTAL MASTER PARTICLES: ${count}`);

  const posInitBuf = new Float32Array(count * 3);
  const posRestBuf = new Float32Array(count * 3);
  const posTouchBuf = new Float32Array(count * 3);
  const partTypesBuf = new Float32Array(count);
  const revealOrdersBuf = new Float32Array(count);
  const sizesBuf = new Float32Array(count);
  const colorTsBuf = new Float32Array(count);
  const randomSeedsBuf = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    const p = particles[i];
    posInitBuf[i * 3]     = p.posInitial.x;
    posInitBuf[i * 3 + 1] = p.posInitial.y;
    posInitBuf[i * 3 + 2] = p.posInitial.z;

    posRestBuf[i * 3]     = p.posRest.x;
    posRestBuf[i * 3 + 1] = p.posRest.y;
    posRestBuf[i * 3 + 2] = p.posRest.z;

    posTouchBuf[i * 3]     = p.posTouch.x;
    posTouchBuf[i * 3 + 1] = p.posTouch.y;
    posTouchBuf[i * 3 + 2] = p.posTouch.z;

    partTypesBuf[i]    = p.partType;
    revealOrdersBuf[i] = p.revealOrder;
    sizesBuf[i]        = p.size;
    colorTsBuf[i]      = p.colorT;
    randomSeedsBuf[i]  = p.randomSeed;
  }

  const headerBuf = Buffer.alloc(8);
  headerBuf.write('LOVE', 0, 4, 'ascii');
  headerBuf.writeUInt32LE(count, 4);

  const outBuffer = Buffer.concat([
    headerBuf,
    Buffer.from(posInitBuf.buffer),
    Buffer.from(posRestBuf.buffer),
    Buffer.from(posTouchBuf.buffer),
    Buffer.from(partTypesBuf.buffer),
    Buffer.from(revealOrdersBuf.buffer),
    Buffer.from(sizesBuf.buffer),
    Buffer.from(colorTsBuf.buffer),
    Buffer.from(randomSeedsBuf.buffer),
  ]);

  fs.writeFileSync('public/love_story.bin', outBuffer);
  console.log(`Wrote ${outBuffer.length} bytes to public/love_story.bin successfully!`);
})();
