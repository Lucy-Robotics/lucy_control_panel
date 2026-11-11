/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';

export interface RobotMaterialState {
    originals: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
    displays: Map<THREE.Mesh, THREE.Material[]>;
}

export const robotMaterialStates = new WeakMap<URDFRobot, RobotMaterialState>();

export function getMaterialState(robot: URDFRobot): RobotMaterialState {
    let state = robotMaterialStates.get(robot);
    if (!state) {
        state = { originals: new Map(), displays: new Map() };
        robotMaterialStates.set(robot, state);
    }
    return state;
}

export function originalMaterialOf(robot: URDFRobot, mesh: THREE.Mesh): THREE.Material {
    const material = getMaterialState(robot).originals.get(mesh) ?? mesh.material;
    return Array.isArray(material) ? material[0] : material;
}
