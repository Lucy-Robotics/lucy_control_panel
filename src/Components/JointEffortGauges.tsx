/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFJoint, URDFRobot } from 'urdf-loader';
import { effortArcRad, effortColor, effortHeat, effortSweepSign } from '../Utils/jointEffort.utils';
import { jointRingRadius, jointZeroBasis, placeAtJoint } from '../Utils/jointFrame.utils';

const GAUGE_TO_GIZMO_RADIUS = 0.7;
const TUBE_TO_GAUGE_RADIUS = 0.04;
const RENDER_ORDER = 999;
const LOAD_SMOOTHING_RATE = 5;
const MIN_LOAD_STEP = 0.001;
const ignoreRaycast = () => null;

const JointEffortGauge: React.FC<{ joint: URDFJoint; load: number; heatSource: THREE.Vector4 }> = ({ joint, load, heatSource }) => {
    const groupRef = useRef<THREE.Group>(null);
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<THREE.MeshBasicMaterial>(null);
    const shownLoadRef = useRef<number | null>(null);
    const radius = useMemo(() => jointRingRadius(joint) * GAUGE_TO_GIZMO_RADIUS, [joint]);
    const zeroBasis = useMemo(() => jointZeroBasis(joint), [joint]);
    const jointPosition = useMemo(() => new THREE.Vector3(), []);

    useFrame((_state, delta) => {
        const group = groupRef.current;
        const mesh = meshRef.current;
        if (!group || !mesh || !materialRef.current) return;
        placeAtJoint(group, joint, zeroBasis);

        const previous = shownLoadRef.current;
        const next = previous === null ? load : previous + (load - previous) * (1 - Math.exp(-delta * LOAD_SMOOTHING_RATE));
        joint.getWorldPosition(jointPosition);
        heatSource.set(jointPosition.x, jointPosition.y, jointPosition.z, effortHeat(next));
        if (previous !== null && Math.abs(next - previous) < MIN_LOAD_STEP) return;

        shownLoadRef.current = next;
        mesh.geometry.dispose();
        mesh.geometry = new THREE.TorusGeometry(radius, radius * TUBE_TO_GAUGE_RADIUS, 8, 64, effortArcRad(next));
        mesh.scale.y = effortSweepSign(next);
        materialRef.current.color.set(effortColor(next));
    });

    return (
        <group ref={groupRef}>
            <mesh ref={meshRef} raycast={ignoreRaycast} renderOrder={RENDER_ORDER}>
                <meshBasicMaterial
                    ref={materialRef}
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

export const JointEffortGauges: React.FC<{
    robot: URDFRobot;
    efforts: ReadonlyMap<string, number>;
    heatSources: THREE.Vector4[];
}> = ({ robot, efforts, heatSources }) => {
    useEffect(() => () => heatSources.forEach((source) => { source.w = 0; }), [heatSources]);

    return (
        <>
            {[...efforts].slice(0, heatSources.length).map(([name, load], index) => {
                const joint = robot.joints[name];
                return joint ? <JointEffortGauge key={name} joint={joint} load={load} heatSource={heatSources[index]} /> : null;
            })}
        </>
    );
};
