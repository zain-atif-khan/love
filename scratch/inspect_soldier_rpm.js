import fs from 'fs';
global.self = global;
global.window = global;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function inspect(file) {
  const buf = fs.readFileSync(file);
  const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  new GLTFLoader().parse(ab, '', (gltf) => {
    console.log(`\n=== ${file} ===`);
    console.log('Animations:', gltf.animations.map(a => `${a.name} (${a.duration}s)`));
    let meshes = [];
    let bones = [];
    gltf.scene.traverse((c) => {
      if (c.isMesh || c.isSkinnedMesh) {
        meshes.push({ name: c.name, verts: c.geometry.attributes.position.count });
      }
      if (c.isBone) bones.push(c.name);
    });
    console.log('Meshes:', meshes);
    console.log('Bone count:', bones.length, 'Bones:', bones.slice(0, 10));
  });
}

inspect('public/Soldier.glb');
inspect('public/readyplayer.me.glb');
