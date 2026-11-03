/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JointControlState } from '../Constants/robotTypes';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';
import { DEFAULT_ACTUATOR_MAPPING, servoRadToJointRad } from './actuatorJointMapping';
import type { JointMove } from '../hooks/useJointMove';
import type { JointPositions } from './jointStateMessage';

function toJointRad(name: string, servoRad: number): number {
    const mapping = JointStateHandler.getInstance().getJointMeta(name)?.mapping ?? DEFAULT_ACTUATOR_MAPPING;
    return servoRadToJointRad(servoRad, mapping);
}

export function targetPoseOf(
    joints: JointControlState[],
    move: JointMove | null,
): JointPositions | null {
    if (!move) return null;
    return Object.fromEntries(joints.map(joint => [
        joint.name,
        toJointRad(joint.name, joint.name === move.name ? move.value : joint.currentValue),
    ]));
}
