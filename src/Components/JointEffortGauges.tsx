/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFJoint, URDFRobot } from 'urdf-loader';
import { effortArcRad, effortColor, effortHeat, effortSweepSign, isEffortVisible } from '../Utils/jointEffort.utils';
import { jointRingRadius, jointZeroBasis, placeAtJoint } from '../Utils/jointFrame.utils';

const GAUGE_TO_GIZMO_RADIUS = 0.4;
const TUBE_TO_GAUGE_RADIUS = 0.06;
const HEAD_TO_GAUGE_RADIUS = 0.18;
const HEAD_LENGTH_TO_GAUGE_RADIUS = 0.5;
const RENDER_ORDER = 999;
const ARROW_OPACITY = 0.5;
const LOAD_SMOOTHING_RATE = 12;
const MIN_LOAD_STEP = 0.001;
const ignoreRaycast = () => null;

const JointEffortGauge: React.FC<{ joint: URDFJoint; load: number; heatSource: THREE.Vector4 }> = ({ joint, load, heatSource }) => {
    const groupRef = useRef<THREE.Group>(null);
    const shaftRef = useRef<THREE.Mesh>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const shownLoadRef = useRef<number | null>(null);
    const radius = useMemo(() => jointRingRadius(joint) * GAUGE_TO_GIZMO_RADIUS, [joint]);
    const zeroBasis = useMemo(() => jointZeroBasis(joint), [joint]);
    const jointPosition = useMemo(() => new THREE.Vector3(), []);
    const material = useMemo(() => new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: ARROW_OPACITY,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
    }), []);
    const headGeometry = useMemo(
        () => new THREE.ConeGeometry(radius * HEAD_TO_GAUGE_RADIUS, radius * HEAD_LENGTH_TO_GAUGE_RADIUS, 16),
        [radius],
    );

    useEffect(() => () => {
        material.dispose();
        headGeometry.dispose();
    }, [material, headGeometry]);

    useFrame((_state, delta) => {
        const group = groupRef.current;
        const shaft = shaftRef.current;
        const head = headRef.current;
        if (!group || !shaft || !head) return;
        placeAtJoint(group, joint, zeroBasis);

        const previous = shownLoadRef.current;
        const next = previous === null ? load : previous + (load - previous) * (1 - Math.exp(-delta * LOAD_SMOOTHING_RATE));
        joint.getWorldPosition(jointPosition);
        heatSource.set(jointPosition.x, jointPosition.y, jointPosition.z, effortHeat(next));
        group.visible = isEffortVisible(next);
        if (previous !== null && Math.abs(next - previous) < MIN_LOAD_STEP) return;

        shownLoadRef.current = next;
        const arc = effortArcRad(next);
        shaft.geometry.dispose();
        shaft.geometry = new THREE.TorusGeometry(radius, radius * TUBE_TO_GAUGE_RADIUS, 8, 64, arc);
        shaft.scale.y = effortSweepSign(next);
        head.position.set(Math.cos(arc) * radius, Math.sin(arc) * radius, 0);
        head.rotation.z = arc;
        material.color.set(effortColor(next));
    });

    return (
        <group ref={groupRef}>
            <mesh ref={shaftRef} material={material} raycast={ignoreRaycast} renderOrder={RENDER_ORDER}>
                <mesh ref={headRef} geometry={headGeometry} material={material} raycast={ignoreRaycast} renderOrder={RENDER_ORDER} />
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
