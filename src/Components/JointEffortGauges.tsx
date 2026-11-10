/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFJoint, URDFRobot } from 'urdf-loader';
import { effortHeat } from '../Utils/jointEffort.utils';
import { effortArcRad, effortColor, effortSweepSign, isEffortVisible } from '../Utils/effortArrow.utils';
import { jointRingRadius, jointZeroBasis, placeAtJoint } from '../Utils/jointFrame.utils';

const GAUGE_TO_GIZMO_RADIUS = 0.4;
const TUBE_TO_GAUGE_RADIUS = 0.06;
const HEAD_TO_GAUGE_RADIUS = 0.18;
const HEAD_LENGTH_TO_GAUGE_RADIUS = 0.5;
const HEAD_ARC_RAD = HEAD_LENGTH_TO_GAUGE_RADIUS;
const MIN_SHAFT_ARC_RAD = 1e-3;
const RENDER_ORDER = 999;
const ARROW_OPACITY = 0.5;
const LOAD_SMOOTHING_RATE = 12;
const MIN_LOAD_STEP = 0.001;
const ignoreRaycast = () => null;

const JointEffortGauge: React.FC<{
    joint: URDFJoint;
    load: number;
    heatSource: THREE.Vector4;
    showArrow: boolean;
}> = ({ joint, load, heatSource, showArrow }) => {
    const groupRef = useRef<THREE.Group>(null);
    const shaftRef = useRef<THREE.Mesh>(null);
    const headRef = useRef<THREE.Mesh>(null);
    const capRef = useRef<THREE.Mesh>(null);
    const shownLoadRef = useRef<number | null>(null);
    const radius = useMemo(() => jointRingRadius(joint) * GAUGE_TO_GIZMO_RADIUS, [joint]);
    const zeroBasis = useMemo(() => jointZeroBasis(joint), [joint]);
    const jointPosition = useMemo(() => new THREE.Vector3(), []);
    const material = useMemo(() => new THREE.MeshBasicMaterial({
        side: THREE.FrontSide,
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
    const capGeometry = useMemo(() => new THREE.SphereGeometry(radius * TUBE_TO_GAUGE_RADIUS, 12, 8), [radius]);

    useEffect(() => () => {
        material.dispose();
        headGeometry.dispose();
        capGeometry.dispose();
    }, [material, headGeometry, capGeometry]);

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
        group.visible = showArrow && isEffortVisible(next);
        if (previous !== null && Math.abs(next - previous) < MIN_LOAD_STEP) return;

        shownLoadRef.current = next;
        const shaftArc = Math.max(effortArcRad(next) - HEAD_ARC_RAD, MIN_SHAFT_ARC_RAD);
        const headCenter = shaftArc + HEAD_ARC_RAD / 2;
        shaft.geometry.dispose();
        shaft.geometry = new THREE.TorusGeometry(radius, radius * TUBE_TO_GAUGE_RADIUS, 8, 64, shaftArc);
        shaft.scale.y = effortSweepSign(next);
        head.position.set(Math.cos(headCenter) * radius, Math.sin(headCenter) * radius, 0);
        head.rotation.z = headCenter;
        capRef.current?.position.set(radius, 0, 0);
        material.color.set(effortColor(next));
    });

    return (
        <group ref={groupRef}>
            <mesh ref={shaftRef} material={material} raycast={ignoreRaycast} renderOrder={RENDER_ORDER}>
                <mesh ref={headRef} geometry={headGeometry} material={material} raycast={ignoreRaycast} renderOrder={RENDER_ORDER} />
                <mesh ref={capRef} geometry={capGeometry} material={material} raycast={ignoreRaycast} renderOrder={RENDER_ORDER} />
            </mesh>
        </group>
    );
};

export const JointEffortGauges: React.FC<{
    robot: URDFRobot;
    efforts: ReadonlyMap<string, number>;
    heatSources: THREE.Vector4[];
    showArrows: boolean;
}> = ({ robot, efforts, heatSources, showArrows }) => {
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
                <JointEffortGauge key={name} joint={robot.joints[name]} load={load} heatSource={heatSources[index]} showArrow={showArrows} />
            ))}
        </>
    );
};
