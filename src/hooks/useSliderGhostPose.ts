/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useContext, useMemo } from 'react';
import type { JointControlState } from '../Constants/robotTypes';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';
import { DEFAULT_ACTUATOR_MAPPING, servoRadToJointRad } from '../Utils/actuatorJointMapping';
import { JointMoveContext, useJointMove } from './useJointMove';
import type { JointPositions } from './usePhoneTeleop';

function toJointRad(name: string, servoRad: number): number {
    const mapping = JointStateHandler.getInstance().getJointMeta(name)?.mapping ?? DEFAULT_ACTUATOR_MAPPING;
    return servoRadToJointRad(servoRad, mapping);
}

export function useSliderGhostPose(joints?: JointControlState[]): JointPositions | null {
    const drag = useJointMove(useContext(JointMoveContext));
    return useMemo(() => {
        if (!drag || !joints) return null;
        return Object.fromEntries(joints.map(joint => [
            joint.name,
            toJointRad(joint.name, joint.name === drag.name ? drag.value : joint.currentValue),
        ]));
    }, [drag, joints]);
}
