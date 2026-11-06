/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type * as THREE from 'three';

// shortcut: matches the STS3215 mesh only, extend it when another robot reports temperature
const MOTOR_MESH_FILE = /sts3215/i;

type UrdfChild = THREE.Object3D & { isURDFVisual?: boolean; urdfNode?: Pick<Element, 'querySelector'> | null };

function isMotorVisual(child: UrdfChild): boolean {
    const file = child.urdfNode?.querySelector('mesh')?.getAttribute('filename') ?? '';
    return Boolean(child.isURDFVisual) && MOTOR_MESH_FILE.test(file);
}

export function motorMeshesOf(joint: THREE.Object3D): Set<THREE.Object3D> {
    const meshes = new Set<THREE.Object3D>();
    joint.parent?.children.filter(isMotorVisual).forEach((visual) => {
        visual.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) meshes.add(child);
        });
    });
    return meshes;
}
