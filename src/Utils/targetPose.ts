/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JointControlState } from '../Constants/robotTypes';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';
import { DEFAULT_ACTUATOR_MAPPING, servoRadToJointRad } from './actuatorJointMapping';
import { TARGET_REACHED_TOLERANCE_RAD } from './robotModel.utils';
import type { JointMove } from '../hooks/useJointMove';
import type { JointPositions } from './jointStateMessage';

export function toJointRad(name: string, servoRad: number): number {
    const mapping = JointStateHandler.getInstance().getJointMeta(name)?.mapping ?? DEFAULT_ACTUATOR_MAPPING;
    return servoRadToJointRad(servoRad, mapping);
}

export function targetPoseOf(joints: JointControlState[], move: JointMove | null): JointPositions {
    return Object.fromEntries(joints.map(joint => [
        joint.name,
        toJointRad(joint.name, joint.name === move?.name ? move.value : joint.currentValue),
    ]));
}

export function actualPoseOf(joints: JointControlState[]): JointPositions {
    return Object.fromEntries(joints.flatMap(joint => (
        joint.actualValue === undefined ? [] : [[joint.name, toJointRad(joint.name, joint.actualValue)]]
    )));
}

export function isPoseReached(target: JointPositions, actual: JointPositions): boolean {
    return Object.entries(actual).every(([name, rad]) => (
        Math.abs((target[name] ?? rad) - rad) < TARGET_REACHED_TOLERANCE_RAD
    ));
}
