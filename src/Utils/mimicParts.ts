/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type * as THREE from 'three';
import type { URDFJoint, URDFRobot } from 'urdf-loader';
import { isURDFJoint } from './robotModel.utils';

function drivingJointOf(object: THREE.Object3D, robot: URDFRobot): URDFJoint | null {
    for (let node = object.parent; node && node !== robot; node = node.parent) {
        if (isURDFJoint(node) && node.jointType !== 'fixed') return node;
    }
    return null;
}

export function mimicsPart(robot: URDFRobot, partName: string): (object: THREE.Object3D) => boolean {
    const link = robot.links[partName];
    const mimics: ReadonlySet<URDFJoint> = new Set(link ? drivingJointOf(link, robot)?.mimicJoints : undefined);
    return (object) => {
        const joint = drivingJointOf(object, robot);
        return joint !== null && mimics.has(joint);
    };
}
