/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type * as THREE from 'three';

const MOTOR_MESH_FILE = /sts3215/i;
const MOTOR_VISUAL_NAME = 'motor';

type UrdfNode = Pick<Element, 'querySelector'> & Partial<Pick<Element, 'getAttribute'>>;
type UrdfChild = THREE.Object3D & { isURDFVisual?: boolean; urdfNode?: UrdfNode | null };

export function isMotorVisual(child: UrdfChild): boolean {
    const file = child.urdfNode?.querySelector('mesh')?.getAttribute('filename') ?? '';
    const named = child.urdfNode?.getAttribute?.('name') === MOTOR_VISUAL_NAME;
    return Boolean(child.isURDFVisual) && (named || MOTOR_MESH_FILE.test(file));
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
