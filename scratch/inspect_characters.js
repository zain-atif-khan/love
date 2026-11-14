import fs from 'fs';
global.self = global;
global.window = global;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

function inspect(file) {
  const buf = fs.readFileSync(file);
  const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const loader = new GLTFLoader();
  loader.parse(arrayBuffer, '', (gltf) => {
    console.log(`\n=== Inspecting ${file} ===`);
    console.log('Animations:', gltf.animations.map(a => `${a.name} (${a.duration}s)`));
    let meshes = [];
    let bones = [];
    gltf.scene.traverse((child) => {
      if (child.isMesh || child.isSkinnedMesh) {
        meshes.push({
          name: child.name,
          type: child.type,
          verts: child.geometry.attributes.position.count
        });
      }
      if (child.isBone) {
        bones.push(child.name);
      }
    });
    console.log('Meshes:', meshes);
    console.log('Bone count:', bones.length, 'Sample bones:', bones.slice(0, 10));
  });
}

inspect('public/Michelle.glb');
inspect('public/Xbot.glb');
