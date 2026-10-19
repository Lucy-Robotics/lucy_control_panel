/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Robot render component backed by urdf-loader.
 *
 * urdf-loader handles URDF parsing, FK, Collada/STL loading, and visual
 * origins natively — we just render the resulting Three.js scene graph via
 * React Three Fiber's <primitive> and update joint angles every frame.
 * (Mesh bytes themselves are fetched via MeshHandler in useRobotModel.)
 *
 * Coordinate system:
 *   URDF / ROS uses Z-up. Three.js uses Y-up.
 *   urdf-loader does NOT auto-convert, so we wrap the robot in a group
 *   rotated Rx(-π/2) — exactly what robot_viewer does with its world object.
 */

import React, { useEffect, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFRobot } from 'urdf-loader';
import { findParentLink, findLinkWithJoint } from '../Utils/robotModel.utils';

// Pristine DAE/mesh materials, captured per robot instance and kept at module
// level so they survive remounts (the robot itself is module-cached in
// useRobotModel). Capture happens before any override is applied, so a
// wireframe/highlight clone can never be mistaken for the original.
const robotOriginalMaterials = new WeakMap<
    URDFRobot,
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
>();

// Exponential smoothing rate (1/s) applied to displayed joint angles, so the
// 10 Hz /joint_states drain renders as continuous motion instead of steps.
const ANGLE_SMOOTHING_RATE = 12;
const ANGLE_SNAP_EPSILON = 1e-4;

function setMaterialEmissive(material: THREE.Material, color: THREE.Color, intensity: number) {
    if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.copy(color);
        material.emissiveIntensity = intensity;
    } else if (material instanceof THREE.MeshPhongMaterial) {
        material.emissive.copy(color);
    }
}

interface ApplyMaterialParams {
    mesh: THREE.Mesh;
    origMat: THREE.Material | THREE.Material[];
    isSelected: boolean;
    isAnySelected: boolean;
    unselectedOpacity: number;
    wireframe: boolean;
    highlightColor: THREE.Color;
    zeroColor: THREE.Color;
    tempMaterials: THREE.Material[];
}

function applyMeshMaterial({
    mesh,
    origMat,
    isSelected,
    isAnySelected,
    unselectedOpacity,
    wireframe,
    highlightColor,
    zeroColor,
    tempMaterials,
}: ApplyMaterialParams): void {
    if (!isAnySelected && !wireframe) {
        mesh.material = origMat;
        return;
    }

    const transformMat = (m: THREE.Material): THREE.Material => {
        const copy = m.clone();
        tempMaterials.push(copy);
        if ('wireframe' in copy) {
            (copy as THREE.MeshStandardMaterial).wireframe = wireframe;
        }
        if (!isAnySelected) return copy;
        if (isSelected) {
            setMaterialEmissive(copy, highlightColor, 0.8);
            copy.transparent = false;
            copy.opacity = 1;
        } else {
            copy.transparent = unselectedOpacity < 1;
            copy.opacity = unselectedOpacity;
            setMaterialEmissive(copy, zeroColor, 0);
        }
        return copy;
    };

    mesh.material = Array.isArray(origMat) ? origMat.map(transformMat) : transformMat(origMat);
}

export interface RobotFKModelProps {
    robot: URDFRobot;
    /** URDF joint name → current angle (rad). */
    jointAngles: Map<string, number>;
    wireframe?: boolean;
    /** Currently selected/highlighted link name. */
    selectedPartName?: string | null;
    unselectedOpacity?: number;
    onPartDoubleClick?: (partName: string) => void;
    /** Hovered part (resolved to its actuated link), or null when the pointer leaves the robot. */
    onPartHover?: (partName: string | null) => void;
    actuatedJointNames?: Set<string>;
}

export const RobotFKModel: React.FC<RobotFKModelProps> = ({
    robot,
    jointAngles,
    wireframe = false,
    selectedPartName = null,
    unselectedOpacity = 0.25,
    onPartDoubleClick,
    onPartHover,
    actuatedJointNames,
}) => {
    const { gl } = useThree();
    const temporaryMaterialsRef = useRef<THREE.Material[]>([]);
    const displayedAnglesRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        let originals = robotOriginalMaterials.get(robot);
        if (!originals) {
            originals = new Map();
            robotOriginalMaterials.set(robot, originals);
        }

        temporaryMaterialsRef.current.forEach(m => m.dispose());
        temporaryMaterialsRef.current = [];

        const highlightColor = new THREE.Color('#00E5FF');
        const zeroColor = new THREE.Color(0x000000);

        for (const joint of Object.values(robot.joints)) {
            joint.ignoreLimits = true;
        }

        robot.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            // Capture pristine original material before any override
            if (!originals!.has(mesh)) {
                originals!.set(mesh, mesh.material);
            }

            const origMat = originals!.get(mesh)!;
            const parentLink = findParentLink(mesh, robot);
            const linkName = parentLink?.urdfName || parentLink?.name;
            const resolvedLink = parentLink ? findLinkWithJoint(parentLink, robot, actuatedJointNames) : null;
            const resolvedName = resolvedLink?.urdfName || resolvedLink?.name || linkName;
            const isSelected = Boolean(selectedPartName && (linkName === selectedPartName || resolvedName === selectedPartName));
            const isAnySelected = Boolean(selectedPartName);

            applyMeshMaterial({
                mesh,
                origMat,
                isSelected,
                isAnySelected,
                unselectedOpacity,
                wireframe,
                highlightColor,
                zeroColor,
                tempMaterials: temporaryMaterialsRef.current,
            });
        });

        return () => {
            robot.traverse(child => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                const orig = originals!.get(mesh);
                if (orig) mesh.material = orig;
            });
            temporaryMaterialsRef.current.forEach(m => m.dispose());
            temporaryMaterialsRef.current = [];
            };
    }, [robot, wireframe, selectedPartName, unselectedOpacity, actuatedJointNames]);

    useFrame((_state, delta) => {
        // The solid model always shows the real robot state; in-flight gizmo
        // targets are rendered separately as ghosts (see JointGhost).
        if (jointAngles.size > 0) {
            const displayed = displayedAnglesRef.current;
            const alpha = 1 - Math.exp(-delta * ANGLE_SMOOTHING_RATE);
            const values: Record<string, number> = {};

            jointAngles.forEach((serverAngle, name) => {
                const prev = displayed.get(name);
                let next = serverAngle;
                if (prev !== undefined && Math.abs(serverAngle - prev) > ANGLE_SNAP_EPSILON) {
                    next = prev + (serverAngle - prev) * alpha;
                }
                if (next !== prev) {
                    displayed.set(name, next);
                    values[name] = next;
                }
            });

            if (Object.keys(values).length > 0) {
                robot.setJointValues(values);
            }
        }
    });

    const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        (e.nativeEvent as unknown as { _lucyPartClick?: boolean })._lucyPartClick = true;
        const hitMesh = e.object;
        const link = findParentLink(hitMesh, robot);
        if (!link) return;
        const targetLink = findLinkWithJoint(link, robot, actuatedJointNames);
        const name = targetLink?.urdfName || targetLink?.name;
        if (name && onPartDoubleClick) {
            onPartDoubleClick(name);
        }
    };

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        // Let the joint gizmo (drawn on top, without depth test) win the hover
        // even when its hitbox sits behind a robot mesh.
        if (e.intersections.some(i => i.object.userData?.isGizmoHit)) return;
        e.stopPropagation();
        gl.domElement.style.cursor = 'pointer';
        if (!onPartHover) return;
        const link = findParentLink(e.object, robot);
        if (!link) return;
        const targetLink = findLinkWithJoint(link, robot, actuatedJointNames);
        const name = targetLink?.urdfName || targetLink?.name;
        if (name) onPartHover(name);
    };

    const handlePointerOut = () => {
        gl.domElement.style.cursor = 'auto';
        onPartHover?.(null);
    };

    // urdf-loader emits geometry in URDF/ROS Z-up space.
    // Rx(-π/2) converts to Three.js Y-up — matching robot_viewer's world rotation.
    return (
        <group rotation={[-Math.PI / 2, 0, 0]}>
            <primitive
                object={robot}
                onDoubleClick={handleDoubleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            />
        </group>
    );
};
