/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import type { PartNameOf } from './robotParts';

const ignoreRaycast = () => null;

export interface HoverGlow {
    follow: () => void;
    detach: () => void;
}

export function attachHoverGlow(
    scene: THREE.Object3D,
    robot: URDFRobot,
    partName: string,
    partNameOf: PartNameOf,
    material: THREE.Material,
): HoverGlow {
    const hovered: THREE.Mesh[] = [];
    robot.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && partNameOf(mesh) === partName) hovered.push(mesh);
    });
    const glows = hovered.map((mesh) => {
        const shell = new THREE.Mesh(mesh.geometry, material);
        shell.raycast = ignoreRaycast;
        shell.matrixAutoUpdate = false;
        scene.add(shell);
        return { mesh, shell };
    });
    return {
        follow: () => glows.forEach(({ mesh, shell }) => {
            mesh.updateWorldMatrix(true, false);
            shell.matrix.copy(mesh.matrixWorld);
            shell.matrixWorldNeedsUpdate = true;
        }),
        detach: () => glows.forEach(({ shell }) => shell.removeFromParent()),
    };
}
