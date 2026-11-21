/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as THREE from 'three';

const { hasFlatNormals, keepOnlyDrawnAttributes } = await import('../tools/meshes/drawnAttributes.ts');

const flatBox = () => new THREE.BoxGeometry(1, 1, 1, 4, 4, 4).toNonIndexed();

function withTiltedTriangles(geometry: THREE.BufferGeometry, triangles: number): THREE.BufferGeometry {
    const normal = geometry.getAttribute('normal');
    for (let i = 0; i < triangles * 3; i++) normal.setXYZ(i, 0.6, 0.6, 0.52);
    return geometry;
}

function drawn(geometry: THREE.BufferGeometry, material: THREE.Material) {
    const mesh = new THREE.Mesh(geometry, material);
    keepOnlyDrawnAttributes(mesh);
    return geometry;
}

test('a flat-shaded mesh loses its normals', () => {
    assert.equal(drawn(flatBox(), new THREE.MeshPhongMaterial()).getAttribute('normal'), undefined);
});

test('a smooth mesh keeps its normals', () => {
    const sphere = new THREE.SphereGeometry(1, 16, 12).toNonIndexed();
    assert.ok(drawn(sphere, new THREE.MeshPhongMaterial()).getAttribute('normal'));
    assert.ok(drawn(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshPhongMaterial()).getAttribute('normal'));
});

test('a flat mesh with a few odd triangles still counts as flat', () => {
    const box = flatBox();
    const odd = Math.floor(box.getAttribute('position').count / 3 * 0.05);
    assert.ok(odd > 0);
    assert.ok(hasFlatNormals(withTiltedTriangles(box, odd)));
});

test('a mesh with many disagreeing normals does not count as flat', () => {
    const box = flatBox();
    assert.equal(hasFlatNormals(withTiltedTriangles(box, Math.floor(box.getAttribute('position').count / 3 * 0.4))), false);
});

test('uv and color are dropped unless a material uses them', () => {
    const geometry = () => {
        const g = new THREE.SphereGeometry(1, 8, 6);
        g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 3), 3));
        return g;
    };
    const plain = drawn(geometry(), new THREE.MeshPhongMaterial());
    assert.equal(plain.getAttribute('uv'), undefined);
    assert.equal(plain.getAttribute('color'), undefined);
    const used = drawn(geometry(), new THREE.MeshPhongMaterial({ map: new THREE.Texture(), vertexColors: true }));
    assert.ok(used.getAttribute('uv'));
    assert.ok(used.getAttribute('color'));
});
