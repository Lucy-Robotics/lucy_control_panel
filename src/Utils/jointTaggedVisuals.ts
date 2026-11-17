/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { isActuatorJoint, isURDFLink, isURDFVisual, urdfNameOf, type ActuatedJointNames } from './robotModel.utils';

const JOINT_TAG = 'joint';

export function jointTaggedPart(
    object: THREE.Object3D,
    robot: URDFRobot,
    actuatedJointNames?: ActuatedJointNames,
): string | null {
    for (let node: THREE.Object3D | null = object; node && node !== robot; node = node.parent) {
        if (!isURDFVisual(node)) continue;
        const joint = robot.joints[node.urdfNode?.getAttribute(JOINT_TAG) ?? ''];
        const movedLink = joint && isActuatorJoint(joint, actuatedJointNames) ? joint.children.find(isURDFLink) : undefined;
        return movedLink ? urdfNameOf(movedLink) : null;
    }
    return null;
}
