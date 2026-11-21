/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { after, before, test } from 'node:test';
import * as THREE from 'three';
import { boxTriangles, tempDir, writeFixtures } from './meshFixtures.ts';

const { meshObject } = await import('../tools/meshes/meshObject.ts');
const { provideDomForLoaders } = await import('../tools/meshes/nodeDom.ts');
const { meshToGlbs } = await import('../tools/meshes/meshToGlb.ts');
const { parseMeshGlb } = await import('../src/Services/meshes/parseMeshGlb.ts');

type Phong = THREE.MeshPhongMaterial;

function asFloats(source: THREE.BufferGeometry): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry().setIndex(source.index);
    for (const name of ['position', 'normal']) {
        const a = source.getAttribute(name);
        if (!a) continue;
        const values = Float32Array.from({ length: a.count * 3 }, (_, i) => [a.getX, a.getY, a.getZ][i % 3].call(a, Math.floor(i / 3)));
        geometry.setAttribute(name, new THREE.BufferAttribute(values, 3));
    }
    return geometry;
}

function geometries(object: THREE.Object3D): THREE.BufferGeometry[] {
    const found: THREE.BufferGeometry[] = [];
    object.updateMatrixWorld(true);
    object.traverse((c) => { if (c instanceof THREE.Mesh) found.push(asFloats(c.geometry).applyMatrix4(c.matrixWorld)); });
    return found;
}

function firstMaterial(object: THREE.Object3D): Phong {
    let found: THREE.Material | undefined;
    object.traverse((c) => { if (!found && c instanceof THREE.Mesh) found = [c.material].flat()[0]; });
    assert.ok(found);
    return found as Phong;
}

function triangleCount(object: THREE.Object3D): number {
    return geometries(object).reduce((sum, g) => sum + (g.index ?? g.getAttribute('position')).count / 3, 0);
}

function faceNormals(object: THREE.Object3D): string[] {
    return geometries(object).flatMap((g) => {
        const flat = g.index ? g.toNonIndexed() : g.clone();
        flat.computeVertexNormals();
        const n = flat.getAttribute('normal');
        return Array.from({ length: n.count / 3 }, (_, i) => {
            const v = new THREE.Vector3().fromBufferAttribute(n, i * 3);
            return v.toArray().map((x) => (Math.round(x * 100) / 100 + 0).toFixed(2)).join(',');
        });
    }).sort();
}

function vertexNormalsMatchFaces(object: THREE.Object3D): boolean {
    return geometries(object).every((g) => {
        if (!g.getAttribute('normal')) return false;
        const flat = g.index ? g.toNonIndexed() : g;
        const p = flat.getAttribute('position'), n = flat.getAttribute('normal');
        const [a, b, c, face, vn] = [0, 0, 0, 0, 0].map(() => new THREE.Vector3());
        for (let i = 0; i < p.count; i += 3) {
            a.fromBufferAttribute(p, i); b.fromBufferAttribute(p, i + 1); c.fromBufferAttribute(p, i + 2);
            face.subVectors(c, b).cross(a.sub(b)).normalize();
            for (let j = 0; j < 3; j++) if (vn.fromBufferAttribute(n, i + j).dot(face) < 0.999) return false;
        }
        return true;
    });
}

let dir: string;
let files: Record<'dae' | 'stl' | 'obj', string>;
function placedByUrdfLoader<T extends THREE.Object3D>(object: T): T {
    object.position.set(0, 0, 0);
    object.quaternion.identity();
    object.updateMatrixWorld(true);
    return object;
}

before(async () => { await provideDomForLoaders(); dir = await tempDir(); files = await writeFixtures(dir, boxTriangles()); });
after(() => fs.rm(dir, { recursive: true, force: true }));

for (const kind of ['dae', 'stl', 'obj'] as const) {
    test(`a ${kind} mesh looks the same after a full-quality GLB round trip`, async () => {
        const original = placedByUrdfLoader(await meshObject(files[kind]));
        const glb = (await meshToGlbs(files[kind])).get('full')!;
        const restored = placedByUrdfLoader(await parseMeshGlb(glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength) as ArrayBuffer));

        assert.equal(restored instanceof THREE.Mesh, original instanceof THREE.Mesh, 'a single-mesh part stays a mesh so the URDF colour applies');

        assert.equal(triangleCount(restored), triangleCount(original));
        const [a, b] = [original, restored].map((o) => new THREE.Box3().setFromObject(o));
        const tolerance = a.getSize(new THREE.Vector3()).length() * 1e-4;
        assert.ok(a.min.distanceTo(b.min) < tolerance && a.max.distanceTo(b.max) < tolerance, 'bounding box');
        assert.ok(vertexNormalsMatchFaces(restored), 'restored normals are flat');
        assert.deepEqual(faceNormals(restored), faceNormals(original));

        const [ma, mb] = [firstMaterial(original), firstMaterial(restored)];
        assert.equal(mb.type, ma.type);
        assert.equal(mb.color.getHex(), ma.color.getHex());
        assert.equal(mb.shininess, ma.shininess);
    });
}
