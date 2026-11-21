/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

const FLAT_NORMAL_DOT = 0.999;
const MAX_SLIVER_SHARE = 0.1;

export function hasFlatNormals(geometry: THREE.BufferGeometry): boolean {
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    if (!position || !normal || geometry.index) return false;
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
    const face = new THREE.Vector3(), vertex = new THREE.Vector3();
    let notFlat = 0;
    for (let i = 0; i + 2 < position.count; i += 3) {
        a.fromBufferAttribute(position, i);
        b.fromBufferAttribute(position, i + 1);
        c.fromBufferAttribute(position, i + 2);
        face.subVectors(c, b).cross(a.sub(b));
        if (face.lengthSq() === 0) continue;
        face.normalize();
        for (let j = i; j < i + 3; j++) {
            if (vertex.fromBufferAttribute(normal, j).normalize().dot(face) < FLAT_NORMAL_DOT) notFlat++;
        }
    }
    return notFlat <= position.count * MAX_SLIVER_SHARE;
}

export function keepOnlyDrawnAttributes(object: THREE.Object3D): void {
    object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        const geometry: THREE.BufferGeometry = child.geometry;
        const materials: THREE.Material[] = [child.material].flat();
        if (!materials.some((m) => 'map' in m && m.map)) geometry.deleteAttribute('uv');
        if (!materials.some((m) => m.vertexColors)) geometry.deleteAttribute('color');
        if (hasFlatNormals(geometry)) geometry.deleteAttribute('normal');
    });
}
