import fs from 'fs';
global.self = global;
global.window = global;
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const buf = fs.readFileSync('public/rose.glb');
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);

const loader = new GLTFLoader();
loader.parse(arrayBuffer, '', (gltf) => {
  console.log('Rose GLTF loaded successfully!');
  let meshCount = 0;
  let totalVerts = 0;
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      meshCount++;
      const pos = child.geometry.attributes.position;
      totalVerts += pos.count;
      child.geometry.computeBoundingBox();
      console.log(`Mesh ${meshCount} (${child.name}):`, {
        verts: pos.count,
        bbox: child.geometry.boundingBox
      });
    }
  });
  console.log('Total Rose Meshes:', meshCount, 'Total Vertices:', totalVerts);
}, (err) => {
  console.error('GLTF parse error:', err);
});
