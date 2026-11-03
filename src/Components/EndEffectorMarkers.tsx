/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { createPortal } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';
import type { ThemeColors3D } from '../hooks/useThemeColors3D';

const END_EFFECTOR_LINK = 'end_effector';
const MARKER_RADIUS_M = 0.008;
const noRaycast = () => {};

const Marker: React.FC<{ color: string; opacity: number }> = ({ color, opacity }) => (
    <mesh raycast={noRaycast} renderOrder={20}>
        <sphereGeometry args={[MARKER_RADIUS_M, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} />
    </mesh>
);

export const EndEffectorMarkers: React.FC<{ robot: URDFRobot; ghost: URDFRobot | null; colors: ThemeColors3D }> = ({
    robot,
    ghost,
    colors,
}) => {
    const link = robot.links[END_EFFECTOR_LINK];
    const ghostLink = ghost?.links[END_EFFECTOR_LINK];
    if (!link) return null;
    return (
        <>
            {createPortal(<Marker color={colors.accent} opacity={0.95} />, link)}
            {ghostLink && createPortal(<Marker color={colors.warning} opacity={0.95} />, ghostLink)}
        </>
    );
};
