/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { useFrame } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';
import type { JointPositions } from '../Utils/jointStateMessage';
import { showDivergentLinks } from '../Utils/ghostLinks';

export const RobotGhost: React.FC<{ ghost: URDFRobot; robot: URDFRobot; pose: JointPositions | null }> = ({
    ghost,
    robot,
    pose,
}) => {
    useFrame(() => {
        if (!pose) return;
        for (const [name, joint] of Object.entries(ghost.joints)) {
            const real = robot.joints[name];
            if (real) joint.setJointValue(...real.jointValue);
        }
        // Applied last so a target also moves the joints mimicking it.
        for (const [name, value] of Object.entries(pose)) {
            ghost.joints[name]?.setJointValue(value);
        }
        showDivergentLinks(ghost, robot);
    });

    return (
        <group rotation={[-Math.PI / 2, 0, 0]} visible={pose !== null}>
            <primitive object={ghost} />
        </group>
    );
};
