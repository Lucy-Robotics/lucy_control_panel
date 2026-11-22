/*
 * Copyright 2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { CameraViewTween, type ViewRequest } from '../../../Components/CameraViewTween.tsx';
import { RobotFKModel } from '../../../Components/RobotFKModel.tsx';
import { useThemeColors3D } from '../../../hooks/useThemeColors3D.ts';
import { CAMERA_FOV, getRobotBoundingBox } from '../../../Utils/camera.utils.ts';
import { demoAngle } from './calibrationModel.ts';

/**
 * The wizard's own view angle: 45° off the arm's rest-pose reach axis (+Z, after the
 * URDF Z-up -> three.js Y-up conversion `RobotFKModel` applies), from the arm's left,
 * so the gripper reads as pointing right. Kept separate from `camera.utils`'s
 * `DEFAULT_VIEW_DIRECTION` (tuned for the humanoid viewer's front-on torso), which looks
 * at the SO-ARM101 nearly down its reach axis and frames it as a thin sliver.
 */
const WIZARD_VIEW_DIRECTION = new THREE.Vector3(-1, 0.6, 1).normalize();

export interface CalibrationRobotPreviewProps {
    robot: URDFRobot | null;
    /** Meshes still arriving: framing now would fit an empty skeleton. */
    loading?: boolean;
    /** Joint to sweep through its range as a demonstration. */
    demoJoint?: string | null;
}

const DEMO_FRAME_MS = 40;

/**
 * The URDF's default pose: every movable joint at zero. With Lucy's `offset = π` mapping that is
 * also the servos' mid tick, so it is the pose the mid-pose step captures. Setting it explicitly
 * matters because the model is shared with the 3D view, which leaves it in the last streamed pose.
 */
export function urdfDefaultPose(robot: URDFRobot | null): Map<string, number> {
    const pose = new Map<string, number>();
    for (const [name, joint] of Object.entries(robot?.joints ?? {})) {
        if (joint.jointType !== 'fixed') pose.set(name, 0);
    }
    return pose;
}

export function childLinkName(robot: URDFRobot, joint: string): string | null {
    const urdfJoint = robot.joints?.[joint];
    const child = urdfJoint?.children?.find((c) => (c as { isURDFLink?: boolean }).isURDFLink);
    return child?.name ?? null;
}

export const CalibrationRobotPreview: React.FC<CalibrationRobotPreviewProps> = ({
    robot,
    loading = false,
    demoJoint = null,
}) => {
    const colors = useThemeColors3D();
    const [demoValue, setDemoValue] = useState(0);
    const controlsRef = useRef<OrbitControlsImpl | null>(null);
    const [viewRequest, setViewRequest] = useState<ViewRequest | null>(null);

    useEffect(() => {
        if (!robot || !demoJoint) return undefined;
        const limit = robot.joints?.[demoJoint]?.limit;
        const lower = Number(limit?.lower ?? -1);
        const upper = Number(limit?.upper ?? 1);
        const start = performance.now();
        const timer = window.setInterval(() => {
            setDemoValue(demoAngle((performance.now() - start) / 1000, lower, upper));
        }, DEMO_FRAME_MS);
        return () => window.clearInterval(timer);
    }, [robot, demoJoint]);

    // Frame once per loaded model, the way the 3D view does; after that the camera is the user's.
    useEffect(() => {
        if (!robot || loading) return;
        setViewRequest((prev) => ({
            id: (prev?.id ?? 0) + 1,
            direction: WIZARD_VIEW_DIRECTION.clone(),
            instant: true,
        }));
    }, [robot, loading]);

    const getFramingBox = useCallback(() => (robot ? getRobotBoundingBox(robot) : null), [robot]);

    const defaultPose = useMemo(() => urdfDefaultPose(robot), [robot]);

    const jointAngles = useMemo(() => {
        const angles = new Map<string, number>(defaultPose);
        if (demoJoint) angles.set(demoJoint, demoValue);
        return angles;
    }, [defaultPose, demoJoint, demoValue]);

    const selected = robot && demoJoint ? childLinkName(robot, demoJoint) : null;

    return (
        <div
            data-testid="calibration-preview"
            style={{
                width: '100%',
                height: '100%',
                minHeight: 340,
                borderRadius: 8,
                overflow: 'hidden',
                border: '1px solid var(--color-secondary)',
            }}
        >
            <Canvas
                style={{ width: '100%', height: '100%', background: 'var(--color-main)' }}
                camera={{ position: [0.5, 0.45, 0.5], near: 0.01, far: 50, fov: CAMERA_FOV }}
            >
                <ambientLight intensity={0.7} />
                <directionalLight position={[3, 4, 2]} intensity={1} />
                <pointLight position={[-3, -2, -2]} intensity={0.4} color={colors.accent} />
                {robot && (
                    <RobotFKModel
                        robot={robot}
                        jointAngles={jointAngles}
                        selectedPartName={selected}
                        unselectedOpacity={selected ? 0.55 : 1}
                        focusColor={colors.accent}
                    />
                )}
                <OrbitControls ref={controlsRef} makeDefault />
                <CameraViewTween
                    request={viewRequest}
                    controlsRef={controlsRef}
                    getFramingBox={getFramingBox}
                />
            </Canvas>
        </div>
    );
};
