/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFJoint, URDFRobot } from 'urdf-loader';
import { useThrottledJointReadings } from '../hooks/useThrottledJointReadings';
import { subscribeToJointEfforts } from '../Services/ros/handlers/JointEffort.handler';
import { effortArcRad, effortColor, effortSweepSign } from '../Utils/jointEffort.utils';
import { jointRingRadius, jointZeroBasis, placeAtJoint } from '../Utils/jointFrame.utils';

const GAUGE_TO_GIZMO_RADIUS = 0.7;
const TUBE_TO_GAUGE_RADIUS = 0.04;
const RENDER_ORDER = 999;
const ignoreRaycast = () => null;

const JointEffortGauge: React.FC<{ joint: URDFJoint; effort: number }> = ({ joint, effort }) => {
    const groupRef = useRef<THREE.Group>(null);
    const radius = useMemo(() => jointRingRadius(joint) * GAUGE_TO_GIZMO_RADIUS, [joint]);
    const zeroBasis = useMemo(() => jointZeroBasis(joint), [joint]);

    useFrame(() => {
        if (groupRef.current) placeAtJoint(groupRef.current, joint, zeroBasis);
    });

    return (
        <group ref={groupRef}>
            <mesh raycast={ignoreRaycast} renderOrder={RENDER_ORDER} scale={[1, effortSweepSign(effort), 1]}>
                <torusGeometry args={[radius, radius * TUBE_TO_GAUGE_RADIUS, 8, 64, effortArcRad(effort)]} />
                <meshBasicMaterial
                    color={effortColor(effort)}
                    side={THREE.DoubleSide}
                    transparent
                    depthTest={false}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>
        </group>
    );
};

export const JointEffortGauges: React.FC<{ robot: URDFRobot; isConnected: boolean }> = ({ robot, isConnected }) => {
    const efforts = useThrottledJointReadings(subscribeToJointEfforts, isConnected);

    return (
        <>
            {[...efforts].map(([name, effort]) => {
                const joint = robot.joints[name];
                return joint ? <JointEffortGauge key={name} joint={joint} effort={effort} /> : null;
            })}
        </>
    );
};
