/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JointControlState } from '../Constants/robotTypes';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler.ts';
import { DEFAULT_ACTUATOR_MAPPING, servoRadToJointRad, type ActuatorMapping } from './actuatorJointMapping.ts';
import { TARGET_REACHED_TOLERANCE_RAD } from './robotModel.utils.ts';
import type { JointMove } from '../hooks/useJointMove';
import type { JointPositions } from './jointStateMessage';

type MappingOf = (name: string) => ActuatorMapping;

const handlerMapping: MappingOf = name =>
    JointStateHandler.getInstance().getJointMeta(name)?.mapping ?? DEFAULT_ACTUATOR_MAPPING;

export function targetPoseOf(joints: JointControlState[], move: JointMove | null, mappingOf = handlerMapping): JointPositions {
    return Object.fromEntries(joints.map(joint => [
        joint.name,
        servoRadToJointRad(joint.name === move?.name ? move.value : joint.currentValue, mappingOf(joint.name)),
    ]));
}

export function actualPoseOf(joints: JointControlState[], mappingOf = handlerMapping): JointPositions {
    return Object.fromEntries(joints.flatMap(joint => (
        joint.actualValue === undefined ? [] : [[joint.name, servoRadToJointRad(joint.actualValue, mappingOf(joint.name))]]
    )));
}

export function isPoseReached(target: JointPositions, actual: JointPositions): boolean {
    return Object.entries(actual).every(([name, rad]) => (
        Math.abs((target[name] ?? rad) - rad) < TARGET_REACHED_TOLERANCE_RAD
    ));
}
