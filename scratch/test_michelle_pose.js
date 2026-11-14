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

function bakeMesh(skinnedMesh, worldMatrix) {
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
  const meshMat = worldMatrix || skinnedMesh.matrixWorld;

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

    result.applyMatrix4(meshMat);
    baked[i * 3] = result.x;
    baked[i * 3 + 1] = result.y;
    baked[i * 3 + 2] = result.z;
  }

  const outGeo = geo.clone();
  outGeo.setAttribute('position', new THREE.BufferAttribute(baked, 3));
  outGeo.computeVertexNormals();
  return new THREE.Mesh(outGeo, new THREE.MeshBasicMaterial());
}

(async () => {
  const [rpm, michelle] = await Promise.all([
    loadGLTF('public/readyplayer.me.glb'),
    loadGLTF('public/Michelle.glb')
  ]);

  // Test bake Michelle
  const mBones = {};
  michelle.scene.traverse(c => { if (c.isBone) mBones[c.name] = c; });

  // Put Michelle's arms in natural standing pose
  if (mBones['mixamorigRightArm']) {
    mBones['mixamorigRightArm'].rotation.z = -1.1; // lower arm to side
  }
  if (mBones['mixamorigLeftArm']) {
    mBones['mixamorigLeftArm'].rotation.z = 1.1; // lower arm to side
  }

  michelle.scene.updateMatrixWorld(true);

  let michelleMesh = null;
  michelle.scene.traverse(c => { if (c.name === 'Ch03') michelleMesh = c; });

  const bakedM = bakeMesh(michelleMesh);
  bakedM.geometry.computeBoundingBox();
  console.log('Baked Michelle BBox:', bakedM.geometry.boundingBox);
})();
