/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { TARGET_REACHED_TOLERANCE_RAD, isURDFVisual } from './robotModel.utils';
import { linkDiverges } from './linkDivergence';

const ghostRoot = new THREE.Matrix4();
const robotRoot = new THREE.Matrix4();
const ghostLink = new THREE.Matrix4();
const robotLink = new THREE.Matrix4();

export function showDivergentLinks(ghost: URDFRobot, robot: URDFRobot): void {
    ghost.updateMatrixWorld(true);
    ghostRoot.copy(ghost.matrixWorld).invert();
    robotRoot.copy(robot.matrixWorld).invert();
    for (const [name, link] of Object.entries(ghost.links)) {
        const real = robot.links[name];
        const shown = !real || linkDiverges(
            ghostLink.multiplyMatrices(ghostRoot, link.matrixWorld),
            robotLink.multiplyMatrices(robotRoot, real.matrixWorld),
            TARGET_REACHED_TOLERANCE_RAD,
        );
        for (const child of link.children) {
            if (isURDFVisual(child)) child.visible = shown;
        }
    }
}
