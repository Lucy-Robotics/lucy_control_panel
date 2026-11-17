/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

export interface CubePick {
    key: string;
    direction: THREE.Vector3;
}

export function pickCubePiece(local: THREE.Vector3, chamfer: number): CubePick {
    const inner = 1 - chamfer;
    const coords = local.toArray();
    const rims = [0, 1, 2].filter(axis => Math.abs(coords[axis]) > inner);
    const signs = rims.map(axis => (coords[axis] > 0 ? 1 : -1));
    const direction = new THREE.Vector3();
    rims.forEach((axis, n) => direction.setComponent(axis, signs[n]));
    direction.normalize();
    if (rims.length === 1) return { key: `face-${rims[0]}${signs[0]}`, direction };
    if (rims.length === 2) return { key: `edge-${rims[0]}${signs[0]}-${rims[1]}${signs[1]}`, direction };
    return { key: `corner-${signs.join('')}`, direction };
}
