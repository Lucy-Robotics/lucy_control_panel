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
import {
    findParentLink,
    resolveActuatedLinkName,
    urdfNameOf,
    wrapAngle,
    type ActuatedJointNames,
} from '../Utils/robotModel.utils';

const robotOriginalMaterials = new WeakMap<
    URDFRobot,
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
>();

const ANGLE_SMOOTHING_RATE = 12;
const ANGLE_SNAP_EPSILON = 1e-4;
const SELECTED_EMISSIVE_INTENSITY = 0.8;
const NO_EMISSIVE = new THREE.Color(0x000000);

function setMaterialEmissive(material: THREE.Material, color: THREE.Color, intensity: number) {
    if (material instanceof THREE.MeshStandardMaterial) {
        material.emissive.copy(color);
        material.emissiveIntensity = intensity;
    } else if (material instanceof THREE.MeshPhongMaterial) {
        material.emissive.copy(color);
    }
}

function setMaterialOpacity(material: THREE.Material, opacity: number) {
    const transparent = opacity < 1;
    if (material.transparent !== transparent) {
        material.transparent = transparent;
        material.needsUpdate = true;
    }
    material.opacity = opacity;
}

export interface RobotFKModelProps {
    robot: URDFRobot;
    jointAngles: Map<string, number>;
    wireframe?: boolean;
    selectedPartName?: string | null;
    unselectedOpacity?: number;
    focusColor: string;
    onPartDoubleClick?: (partName: string) => void;
    onPartHover?: (partName: string | null) => void;
    actuatedJointNames?: ActuatedJointNames;
}

export const RobotFKModel: React.FC<RobotFKModelProps> = ({
    robot,
    jointAngles,
    wireframe = false,
    selectedPartName = null,
    unselectedOpacity = 0.25,
    focusColor,
    onPartDoubleClick,
    onPartHover,
    actuatedJointNames,
}) => {
    const { gl } = useThree();
    const unselectedMaterialsRef = useRef<THREE.Material[]>([]);
    const displayedAnglesRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        let originals = robotOriginalMaterials.get(robot);
        if (!originals) {
            originals = new Map();
            robotOriginalMaterials.set(robot, originals);
        }

        for (const joint of Object.values(robot.joints)) {
            joint.ignoreLimits = true;
        }

        const focus = new THREE.Color(focusColor);
        const isAnySelected = selectedPartName !== null;
        const temporaryMaterials: THREE.Material[] = [];
        const unselectedMaterials: THREE.Material[] = [];

        robot.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            if (!originals!.has(mesh)) {
                originals!.set(mesh, mesh.material);
            }
            const origMat = originals!.get(mesh)!;

            if (!isAnySelected && !wireframe) {
                mesh.material = origMat;
                return;
            }

            const link = isAnySelected ? findParentLink(mesh, robot) : null;
            const isSelected = link !== null && (
                urdfNameOf(link) === selectedPartName
                || resolveActuatedLinkName(link, robot, actuatedJointNames) === selectedPartName
            );

            const transform = (m: THREE.Material): THREE.Material => {
                const copy = m.clone();
                temporaryMaterials.push(copy);
                if ('wireframe' in copy) {
                    (copy as THREE.MeshStandardMaterial).wireframe = wireframe;
                }
                if (isSelected) {
                    setMaterialEmissive(copy, focus, SELECTED_EMISSIVE_INTENSITY);
                    setMaterialOpacity(copy, 1);
                } else if (isAnySelected) {
                    setMaterialEmissive(copy, NO_EMISSIVE, 0);
                    unselectedMaterials.push(copy);
                }
                return copy;
            };
            mesh.material = Array.isArray(origMat) ? origMat.map(transform) : transform(origMat);
        });
        unselectedMaterialsRef.current = unselectedMaterials;

        return () => {
            robot.traverse(child => {
                const mesh = child as THREE.Mesh;
                if (!mesh.isMesh) return;
                const orig = originals!.get(mesh);
                if (orig) mesh.material = orig;
            });
            temporaryMaterials.forEach(m => m.dispose());
            unselectedMaterialsRef.current = [];
        };
    }, [robot, wireframe, selectedPartName, actuatedJointNames, focusColor]);

    useEffect(() => {
        unselectedMaterialsRef.current.forEach(m => setMaterialOpacity(m, unselectedOpacity));
    }, [unselectedOpacity, robot, wireframe, selectedPartName, actuatedJointNames, focusColor]);

    useFrame((_state, delta) => {
        if (jointAngles.size === 0) return;
        const displayed = displayedAnglesRef.current;
        const alpha = 1 - Math.exp(-delta * ANGLE_SMOOTHING_RATE);
        const values: Record<string, number> = {};

        jointAngles.forEach((serverAngle, name) => {
            const prev = displayed.get(name);
            let next = serverAngle;
            if (prev !== undefined) {
                // Continuous joints take the short way around a ±π wrap
                const diff = robot.joints[name]?.jointType === 'continuous'
                    ? wrapAngle(serverAngle - prev)
                    : serverAngle - prev;
                if (Math.abs(diff) > ANGLE_SNAP_EPSILON) {
                    next = prev + diff * alpha;
                }
            }
            if (next !== prev) {
                displayed.set(name, next);
                values[name] = next;
            }
        });

        if (Object.keys(values).length > 0) {
            robot.setJointValues(values);
        }
    });

    const partNameOf = (object: THREE.Object3D): string | null => {
        const link = findParentLink(object, robot);
        return link ? resolveActuatedLinkName(link, robot, actuatedJointNames) : null;
    };

    const handleDoubleClick = (e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        const name = partNameOf(e.object);
        if (name) onPartDoubleClick?.(name);
    };

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        if (e.intersections.some(i => i.object.userData?.isGizmoHit)) return;
        e.stopPropagation();
        gl.domElement.style.cursor = 'pointer';
        if (!onPartHover) return;
        const name = partNameOf(e.object);
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
