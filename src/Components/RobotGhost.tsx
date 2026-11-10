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
            const value = pose[name];
            if (value !== undefined) {
                joint.setJointValue(value);
            } else if (robot.joints[name]) {
                joint.setJointValue(...robot.joints[name].jointValue);
            }
        }
        showDivergentLinks(ghost, robot);
    });

    return (
        <group rotation={[-Math.PI / 2, 0, 0]} visible={pose !== null}>
            <primitive object={ghost} />
        </group>
    );
};
