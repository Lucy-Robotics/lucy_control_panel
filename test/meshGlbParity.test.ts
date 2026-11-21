/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import * as THREE from 'three';

const { parseMeshGlb } = await import('../src/Services/meshes/parseMeshGlb.ts');

// Fixtures come from https://github.com/Lucy-Robotics/mesh_tools test fixtures (20x10x30 box at [50,-40,25]).
const expected = {
    dae: { single: false, color: 0x00ff00, shininess: 40 },
    stl: { single: true, color: 0xb0b0b0, shininess: 30 },
    obj: { single: false, color: 0xff0000, shininess: 80 },
} as const;

for (const [kind, want] of Object.entries(expected)) {
    test(`the ${kind} fixture GLB is read back as a flat-shaded box with its original material`, async () => {
        const file = await fs.readFile(new URL(`./fixtures/meshes/part.${kind}.full.glb`, import.meta.url));
        const object = await parseMeshGlb(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer);

        // A single-mesh source must come back as a bare Mesh so the URDF colour applies.
        assert.equal(object instanceof THREE.Mesh, want.single);
        const meshes: THREE.Mesh[] = [];
        object.traverse((c) => { if (c instanceof THREE.Mesh) meshes.push(c); });
        assert.equal(meshes.length, 1);
        const [mesh] = meshes;

        const position = mesh.geometry.getAttribute('position');
        assert.equal((mesh.geometry.index ?? position).count / 3, 12);
        const box = new THREE.Box3().setFromObject(object);
        assert.ok(box.min.distanceTo(new THREE.Vector3(50, -40, 25)) < 1e-3, `min ${box.min.toArray()}`);
        assert.ok(box.max.distanceTo(new THREE.Vector3(70, -30, 55)) < 1e-3, `max ${box.max.toArray()}`);

        const flat = mesh.geometry.toNonIndexed();
        const normal = mesh.geometry.getAttribute('normal');
        assert.ok(normal, 'normals restored');
        const flatNormal = flat.getAttribute('normal');
        const [a, b, c, face, vn] = [0, 0, 0, 0, 0].map(() => new THREE.Vector3());
        const world = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld).toNonIndexed();
        const p = world.getAttribute('position');
        for (let i = 0; i < p.count; i += 3) {
            a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
            face.subVectors(c, b).cross(a.sub(b)).normalize();
            for (let j = 0; j < 3; j++) assert.ok(vn.fromBufferAttribute(flatNormal, i + j).dot(face) > 0.999, `vertex ${i + j} normal is not its face normal`);
        }

        const material = mesh.material as THREE.MeshPhongMaterial;
        assert.equal(material.type, 'MeshPhongMaterial');
        assert.equal(material.color.getHex(), want.color);
        assert.equal(material.shininess, want.shininess);
    });
}
