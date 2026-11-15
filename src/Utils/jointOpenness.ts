/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { JointControlState } from '../Constants/robotTypes.ts';
import { clampServoRad, jointRadToServoRad, servoRadToJointRad, type ActuatorMapping } from './actuatorJointMapping.ts';

function jointRange(joint: JointControlState, mapping: ActuatorMapping): [number, number] {
    const a = servoRadToJointRad(joint.minValue, mapping);
    const b = servoRadToJointRad(joint.maxValue, mapping);
    return [Math.min(a, b), Math.max(a, b)];
}

export function jointOpenness(joint: JointControlState, mapping: ActuatorMapping): number {
    const [lo, hi] = jointRange(joint, mapping);
    if (hi - lo < 1e-9) return 0;
    const fraction = (servoRadToJointRad(joint.currentValue, mapping) - lo) / (hi - lo);
    return Math.min(Math.max(fraction, 0), 1);
}

export function atOpenness(joint: JointControlState, openness: number, mapping: ActuatorMapping): JointControlState {
    const [lo, hi] = jointRange(joint, mapping);
    const servo = clampServoRad(jointRadToServoRad(lo + openness * (hi - lo), mapping), joint.minValue, joint.maxValue);
    return { ...joint, currentValue: servo, targetValue: servo };
}
