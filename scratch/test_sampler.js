import fs from 'fs';
global.self = global;
global.window = global;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js';

function loadGLTF(path) {
  return new Promise((resolve, reject) => {
    const buf = fs.readFileSync(path);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    new GLTFLoader().parse(ab, '', resolve, reject);
  });
}

function bakeMesh(skinnedMesh) {
  const geo = skinnedMesh.geometry.clone();
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

    result.applyMatrix4(skinnedMesh.matrixWorld);
    baked[i * 3] = result.x;
    baked[i * 3 + 1] = result.y;
    baked[i * 3 + 2] = result.z;
  }

  geo.setAttribute('position', new THREE.BufferAttribute(baked, 3));
  geo.computeVertexNormals();
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
}

(async () => {
  const rpm = await loadGLTF('public/readyplayer.me.glb');
  let headMesh = null;
  rpm.scene.traverse(c => {
    if (c.name === 'Wolf3D_Head') headMesh = c;
  });

  const baked = bakeMesh(headMesh);
  const sampler = new MeshSurfaceSampler(baked).build();
  const sampleP = new THREE.Vector3();
  const sampleN = new THREE.Vector3();
  sampler.sample(sampleP, sampleN);
  console.log('Sampled head surface point:', sampleP, 'normal:', sampleN);
})();
