/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

export const LINK_TOLERANCE_M = 0.005;

const position = [new THREE.Vector3(), new THREE.Vector3()];
const rotation = [new THREE.Quaternion(), new THREE.Quaternion()];
const scale = new THREE.Vector3();

export function linkDiverges(a: THREE.Matrix4, b: THREE.Matrix4, toleranceRad: number): boolean {
    a.decompose(position[0], rotation[0], scale);
    b.decompose(position[1], rotation[1], scale);
    return position[0].distanceTo(position[1]) > LINK_TOLERANCE_M || rotation[0].angleTo(rotation[1]) > toleranceRad;
}
