/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import * as THREE from 'three';
import { meshObject } from '../server/meshObject.ts';
import { meshToGlb } from '../server/meshToGlb.ts';
import { parseMeshGlb } from '../src/Services/meshes/loadMeshGlb.ts';

const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'mesh-glb-'));

function firstMaterial(object: THREE.Object3D): THREE.Material {
    let found: THREE.Material | undefined;
    object.traverse((child) => {
        if (!found && child instanceof THREE.Mesh) found = Array.isArray(child.material) ? child.material[0] : child.material;
    });
    assert.ok(found, 'object has a mesh material');
    return found;
}

async function sameAfterGlb(file: string) {
    const original = await meshObject(file);
    const restored = await parseMeshGlb(await meshToGlb(file));
    const a = new THREE.Box3().setFromObject(original);
    const b = new THREE.Box3().setFromObject(restored);
    assert.ok(a.min.distanceTo(b.min) < 1e-5 && a.max.distanceTo(b.max) < 1e-5, 'bounding box survives GLB');
    const [ma, mb] = [firstMaterial(original) as THREE.MeshPhongMaterial, firstMaterial(restored) as THREE.MeshPhongMaterial];
    assert.equal(mb.type, ma.type, 'material type survives GLB');
    assert.equal(mb.color.getHex(), ma.color.getHex(), 'material color survives GLB');
    return mb;
}

async function stlSurvivesGlb() {
    const file = path.join(tmp, 't.stl');
    await fs.writeFile(file, 'solid t\nfacet normal 0 0 1\nouter loop\nvertex 0 0 0\nvertex 2 0 0\nvertex 0 3 1\nendloop\nendfacet\nendsolid t\n');
    const material = await sameAfterGlb(file);
    assert.equal(material.type, 'MeshPhongMaterial', 'STL keeps the grey phong material rather than glTF standard');
}

async function objWithMtlSurvivesGlb() {
    await fs.writeFile(path.join(tmp, 't.mtl'), 'newmtl red\nKd 1 0 0\nmap_Kd tex.png\n');
    const file = path.join(tmp, 't.obj');
    await fs.writeFile(file, 'mtllib t.mtl\nv 0 0 0\nv 1 0 0\nv 0 2 0\nusemtl red\nf 1 2 3\nl 1 2\n');
    const material = await sameAfterGlb(file);
    assert.equal(material.color.getHex(), 0xff0000, 'OBJ keeps its MTL diffuse color');
}

try {
    await stlSurvivesGlb();
    await objWithMtlSurvivesGlb();
    console.log('mesh glb parity: 2 checks passed');
} finally {
    await fs.rm(tmp, { recursive: true, force: true });
}
