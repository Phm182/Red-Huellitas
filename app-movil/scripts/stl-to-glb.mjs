/**
 * STL (impresión 3D) → GLB jugable: merge verts + simplify + color.
 */
import fs from 'fs';
import path from 'path';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { Document, NodeIO } from '@gltf-transform/core';
import { MeshoptSimplifier } from 'meshoptimizer';

const stlPath = process.argv[2];
const outPath = process.argv[3];
const colorHex = process.argv[4] || '#5BA3E0';
const targetTris = Number(process.argv[5] || 14000);

if (!stlPath || !outPath) {
  console.error('Usage: node stl-to-glb.mjs <in.stl> <out.glb> [color] [targetTris]');
  process.exit(1);
}

await MeshoptSimplifier.ready;

console.log('loading STL…');
const buf = fs.readFileSync(stlPath);
let geometry = new STLLoader().parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
geometry.deleteAttribute('normal');
geometry = mergeVertices(geometry, 1e-4);
geometry.computeVertexNormals();
geometry.center();
geometry.rotateX(-Math.PI / 2);
geometry.computeBoundingBox();
geometry.translate(0, -geometry.boundingBox.min.y, 0);

if (!geometry.index) {
  const idx = new Uint32Array(geometry.attributes.position.count);
  for (let i = 0; i < idx.length; i++) idx[i] = i;
  geometry.setIndex(new THREE.BufferAttribute(idx, 1));
}

const srcIndex = new Uint32Array(geometry.index.array);
const positions = new Float32Array(geometry.attributes.position.array);
const triCount = (srcIndex.length / 3) | 0;
console.log('merged tris', triCount, 'verts', positions.length / 3);

const targetIndexCount = Math.max(300, Math.min(srcIndex.length, targetTris * 3));
const [dstIndex] = MeshoptSimplifier.simplify(
  srcIndex,
  positions,
  3,
  targetIndexCount,
  0.01
);
const dstCount = dstIndex.length;
console.log('simplified indexCount', dstCount, 'tris', (dstCount / 3) | 0);
if (dstCount < 300) {
  throw new Error('simplify collapsed mesh — abort');
}

// Compact unused vertices
const used = new Map();
const newIndex = new Uint32Array(dstCount);
let next = 0;
for (let i = 0; i < dstCount; i++) {
  const old = dstIndex[i];
  let id = used.get(old);
  if (id == null) {
    id = next++;
    used.set(old, id);
  }
  newIndex[i] = id;
}
const newPos = new Float32Array(next * 3);
for (const [old, id] of used) {
  newPos[id * 3] = positions[old * 3];
  newPos[id * 3 + 1] = positions[old * 3 + 1];
  newPos[id * 3 + 2] = positions[old * 3 + 2];
}

// Normals
const tmp = new THREE.BufferGeometry();
tmp.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
tmp.setIndex(new THREE.BufferAttribute(newIndex, 1));
tmp.computeVertexNormals();
const newNrm = new Float32Array(tmp.getAttribute('normal').array);

const color = new THREE.Color(colorHex);
const doc = new Document();
const buffer = doc.createBuffer();
const material = doc
  .createMaterial('CatBlue')
  .setBaseColorFactor([color.r, color.g, color.b, 1])
  .setMetallicFactor(0.08)
  .setRoughnessFactor(0.5)
  .setDoubleSided(true);

const prim = doc
  .createPrimitive()
  .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(newPos).setBuffer(buffer))
  .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(newNrm).setBuffer(buffer))
  .setIndices(doc.createAccessor().setType('SCALAR').setArray(newIndex).setBuffer(buffer))
  .setMaterial(material);

const mesh = doc.createMesh('SittingCat').addPrimitive(prim);
doc.createScene('Scene').addChild(doc.createNode('SittingCat').setMesh(mesh));

const io = new NodeIO();
const glb = await io.writeBinary(doc);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, Buffer.from(glb));
console.log('wrote', outPath, 'MB', (glb.byteLength / 1024 / 1024).toFixed(2), 'verts', next);
