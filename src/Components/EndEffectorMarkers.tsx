/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React from 'react';
import { createPortal } from '@react-three/fiber';
import type { URDFRobot } from 'urdf-loader';
import type { ThemeColors3D } from '../hooks/useThemeColors3D';
import type { Vec3 } from '../Utils/phoneMotion';
import type { Quat } from '../Utils/phoneOrientation';

const END_EFFECTOR_LINK = 'end_effector';
const MARKER_RADIUS_M = 0.008;
const TRIHEDRON_SIZE_M = 0.06;
const noRaycast = () => {};

const Marker: React.FC<{ color: string; opacity: number; position?: Vec3 }> = ({ color, opacity, position }) => (
    <mesh position={position} raycast={noRaycast} renderOrder={20}>
        <sphereGeometry args={[MARKER_RADIUS_M, 20, 20]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} />
    </mesh>
);

const PhoneTrihedron: React.FC<{ position: Vec3; orientation: Quat }> = ({ position, orientation }) => (
    <group position={position} quaternion={orientation}>
        <axesHelper
            args={[TRIHEDRON_SIZE_M]}
            raycast={noRaycast}
            renderOrder={21}
            onUpdate={(axes) => Object.assign(axes.material, { depthTest: false, depthWrite: false })}
        />
    </group>
);

export const EndEffectorMarkers: React.FC<{
    robot: URDFRobot;
    target: Vec3 | null;
    phoneOrientation: Quat | null;
    colors: ThemeColors3D;
}> = ({ robot, target, phoneOrientation, colors }) => {
    const link = robot.links[END_EFFECTOR_LINK];
    if (!link) return null;
    return (
        <>
            {createPortal(<Marker color={colors.accent} opacity={0.95} />, link)}
            {target && createPortal(<Marker color={colors.warning} opacity={0.4} position={target} />, robot)}
            {target && phoneOrientation && createPortal(<PhoneTrihedron position={target} orientation={phoneOrientation} />, robot)}
        </>
    );
};
