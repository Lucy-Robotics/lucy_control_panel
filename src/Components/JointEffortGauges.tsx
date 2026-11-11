/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFJoint, URDFRobot } from 'urdf-loader';
import { effortHeat } from '../Utils/jointEffort.utils';

const LOAD_SMOOTHING_RATE = 12;

const JointEffortGauge: React.FC<{
    joint: URDFJoint;
    load: number;
    heatSource: THREE.Vector4;
}> = ({ joint, load, heatSource }) => {
    const shownLoadRef = useRef<number | null>(null);
    const jointPosition = useMemo(() => new THREE.Vector3(), []);

    useFrame((_state, delta) => {
        const previous = shownLoadRef.current;
        const next = previous === null ? load : previous + (load - previous) * (1 - Math.exp(-delta * LOAD_SMOOTHING_RATE));
        shownLoadRef.current = next;
        joint.getWorldPosition(jointPosition);
        heatSource.set(jointPosition.x, jointPosition.y, jointPosition.z, effortHeat(next));
    });

    return null;
};

export const JointEffortGauges: React.FC<{
    robot: URDFRobot;
    efforts: ReadonlyMap<string, number>;
    heatSources: THREE.Vector4[];
}> = ({ robot, efforts, heatSources }) => {
    const gauges = [...efforts]
        .filter(([name]) => robot.joints[name])
        .slice(0, heatSources.length);

    useEffect(() => {
        heatSources.slice(gauges.length).forEach((source) => { source.w = 0; });
    }, [heatSources, gauges.length]);
    useEffect(() => () => heatSources.forEach((source) => { source.w = 0; }), [heatSources]);

    return (
        <>
            {gauges.map(([name, load], index) => (
                <JointEffortGauge key={name} joint={robot.joints[name]} load={load} heatSource={heatSources[index]} />
            ))}
        </>
    );
};
