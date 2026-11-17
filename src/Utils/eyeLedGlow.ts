/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';

export function eyeLedGlowMaterial(): THREE.MeshBasicMaterial {
    return new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false });
}

export const isEyeLed = (mesh: THREE.Object3D): boolean => mesh.userData.eyeLed === true;
