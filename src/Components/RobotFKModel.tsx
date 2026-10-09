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
import { UI_ACCENT_GREEN_HEX } from '../Constants/uiTheme';
import { findParentLink } from '../Utils/robotModel.utils';

// Pristine DAE/mesh materials, captured per robot instance and kept at module
// level so they survive remounts (the robot itself is module-cached in
// useRobotModel). Capture happens before any override is applied, so a green
// material can never be mistaken for the original — this is what makes the
// GRN ↔ DAE switch reliable.
const robotOriginalMaterials = new WeakMap<
    URDFRobot,
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
>();

function setMaterialEmissive(material: THREE.Material, color: THREE.Color, intensity: number) {
    if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.copy(color);
        material.emissiveIntensity = intensity;
    } else if (material instanceof THREE.MeshPhongMaterial) {
        material.emissive.copy(color);
    }
}

export interface RobotFKModelProps {
    robot: URDFRobot;
    /** URDF joint name → current angle (rad). */
    jointAngles: Map<string, number>;
    opacity?: number;
    wireframe?: boolean;
    /** When true, restores the original DAE/mesh materials instead of the green override. */
    useOriginalTexture?: boolean;
    /** Currently selected/highlighted link name. */
    selectedPartName?: string | null;
    unselectedOpacity?: number;
    onPartDoubleClick?: (partName: string) => void;
    isSyncPaused?: boolean;
    activeGizmoJointName?: string | null;
    heldJointsRef?: React.RefObject<Map<string, { targetRad: number; timestamp: number }>>;
}

export const RobotFKModel: React.FC<RobotFKModelProps> = ({
    robot,
    jointAngles,
    opacity = 0.85,
    wireframe = false,
    useOriginalTexture = true,
    selectedPartName = null,
    unselectedOpacity = 0.25,
    onPartDoubleClick,
    isSyncPaused = false,
    activeGizmoJointName = null,
    heldJointsRef,
}) => {
    const { gl } = useThree();
    const temporaryMaterialsRef = useRef<THREE.Material[]>([]);
    const selectedMaterialsRef = useRef<THREE.Material[]>([]);

    useEffect(() => {
        let originals = robotOriginalMaterials.get(robot);
        if (!originals) {
            originals = new Map();
            robotOriginalMaterials.set(robot, originals);
        }

        temporaryMaterialsRef.current.forEach(m => m.dispose());
        temporaryMaterialsRef.current = [];
        selectedMaterialsRef.current = [];

        const highlightColor = new THREE.Color('#00E5FF');
        const zeroColor = new THREE.Color(0x000000);

        robot.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            // Capture pristine original material before any override
            if (!originals!.has(mesh)) {
                originals!.set(mesh, mesh.material);
            }

            // Ignore URDF joint limits — real ROS angles may exceed them.
            for (const joint of Object.values(robot.joints)) {
                joint.ignoreLimits = true;
            }

            const origMat = originals!.get(mesh)!;
            const parentLink = findParentLink(mesh, robot);
            const linkName = parentLink?.urdfName || parentLink?.name;
            const isSelected = Boolean(selectedPartName && linkName === selectedPartName);
            const isAnySelected = Boolean(selectedPartName);

            if (useOriginalTexture) {
                if (!isAnySelected) {
                    mesh.material = origMat;
                } else if (isSelected) {
                    const cloneMat = (m: THREE.Material): THREE.Material => {
                        const copy = m.clone();
                        temporaryMaterialsRef.current.push(copy);
                        selectedMaterialsRef.current.push(copy);
                        setMaterialEmissive(copy, highlightColor, 0.8);
                        copy.transparent = false;
                        copy.opacity = 1;
                        return copy;
                    };
                    if (Array.isArray(origMat)) {
                        mesh.material = origMat.map(cloneMat);
                    } else {
                        mesh.material = cloneMat(origMat);
                    }
                } else {
                    const dimMat = (m: THREE.Material): THREE.Material => {
                        const copy = m.clone();
                        temporaryMaterialsRef.current.push(copy);
                        copy.transparent = unselectedOpacity < 1;
                        copy.opacity = unselectedOpacity;
                        setMaterialEmissive(copy, zeroColor, 0);
                        return copy;
                    };
                    if (Array.isArray(origMat)) {
                        mesh.material = origMat.map(dimMat);
                    } else {
                        mesh.material = dimMat(origMat);
                    }
                }
            } else {
                if (isSelected) {
                    const highlightMat = new THREE.MeshStandardMaterial({
                        color: '#00E5FF',
                        emissive: '#005577',
                        emissiveIntensity: 0.7,
                        transparent: false,
                        opacity: 1,
                        wireframe,
                        roughness: 0.2,
                        metalness: 0.8,
                        side: THREE.DoubleSide,
                    });
                    temporaryMaterialsRef.current.push(highlightMat);
                    selectedMaterialsRef.current.push(highlightMat);
                    mesh.material = highlightMat;
                } else {
                    const effectiveOpacity = isAnySelected ? unselectedOpacity : opacity;
                    const greenMat = new THREE.MeshStandardMaterial({
                        color: UI_ACCENT_GREEN_HEX,
                        transparent: effectiveOpacity < 1,
                        opacity: effectiveOpacity,
                        wireframe,
                        roughness: 0.3,
                        metalness: 0.7,
                        side: THREE.DoubleSide,
                    });
                    temporaryMaterialsRef.current.push(greenMat);
                    mesh.material = greenMat;
                }
            }
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
            selectedMaterialsRef.current = [];
        };
    }, [robot, opacity, wireframe, useOriginalTexture, selectedPartName, unselectedOpacity]);

    useFrame((state) => {
        if (jointAngles.size > 0) {
            const values: Record<string, number> = {};
            const now = Date.now();
            const held = heldJointsRef?.current;

            jointAngles.forEach((serverAngle, name) => {
                if (isSyncPaused && activeGizmoJointName === name) {
                    return;
                }

                if (held && held.has(name)) {
                    const info = held.get(name)!;
                    const diff = Math.abs(serverAngle - info.targetRad);
                    const elapsed = now - info.timestamp;

                    // If motor caught up to within ~2 deg (0.035 rad) or after 3s timeout:
                    if (diff < 0.035 || elapsed > 3000) {
                        held.delete(name);
                        values[name] = serverAngle;
                    } else {
                        // Hold target angle firmly to prevent rollback!
                        values[name] = info.targetRad;
                    }
                } else {
                    values[name] = serverAngle;
                }
            });

            if (Object.keys(values).length > 0) {
                robot.setJointValues(values);
            }
        }

        if (selectedPartName && selectedMaterialsRef.current.length > 0) {
            const pulse = 0.65 + 0.35 * Math.sin(state.clock.elapsedTime * 4.5);
            for (const mat of selectedMaterialsRef.current) {
                if (mat instanceof THREE.MeshStandardMaterial) {
                    mat.emissiveIntensity = pulse;
                }
            }
        }
    });

    const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const hitMesh = e.object;
        const link = findParentLink(hitMesh, robot);
        const name = link?.urdfName || link?.name;
        if (name && onPartDoubleClick) {
            onPartDoubleClick(name);
        }
    };

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        gl.domElement.style.cursor = 'pointer';
    };

    const handlePointerOut = () => {
        gl.domElement.style.cursor = 'auto';
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
