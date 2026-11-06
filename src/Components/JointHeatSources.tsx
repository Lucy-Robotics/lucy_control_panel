/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { temperatureHeat } from '../Utils/motorOverheat.utils';

export const JointHeatSources: React.FC<{
    robot: URDFRobot;
    temperatures: ReadonlyMap<string, number>;
    heatSources: THREE.Vector4[];
}> = ({ robot, temperatures, heatSources }) => {
    const jointPosition = useMemo(() => new THREE.Vector3(), []);

    useFrame(() => {
        let source = 0;
        temperatures.forEach((celsius, name) => {
            const joint = robot.joints[name];
            if (!joint || source >= heatSources.length) return;
            joint.getWorldPosition(jointPosition);
            heatSources[source++].set(jointPosition.x, jointPosition.y, jointPosition.z, temperatureHeat(celsius));
        });
        for (; source < heatSources.length; source++) heatSources[source].w = 0;
    });

    return null;
};
