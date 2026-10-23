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

interface RobotMaterialState {
    originals: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
    displays: Map<THREE.Mesh, THREE.Material[]>;
}

const robotMaterialStates = new WeakMap<URDFRobot, RobotMaterialState>();

function getMaterialState(robot: URDFRobot): RobotMaterialState {
    let state = robotMaterialStates.get(robot);
    if (!state) {
        state = { originals: new Map(), displays: new Map() };
        robotMaterialStates.set(robot, state);
    }
    return state;
}

const ANGLE_SMOOTHING_RATE = 12;
const ANGLE_SNAP_EPSILON = 1e-4;
const SELECTED_EMISSIVE_INTENSITY = 0.8;
const NO_EMISSIVE = new THREE.Color(0x000000);

type PartStyle = 'normal' | 'selected' | 'unselected';

function hasEmissive(m: THREE.Material): m is THREE.MeshStandardMaterial | THREE.MeshPhongMaterial {
    return m instanceof THREE.MeshStandardMaterial || m instanceof THREE.MeshPhongMaterial;
}

function applyStyle(
    display: THREE.Material,
    orig: THREE.Material,
    style: PartStyle,
    wireframe: boolean,
    focus: THREE.Color,
    unselectedOpacity: number,
) {
    if ('wireframe' in display) {
        (display as THREE.MeshStandardMaterial).wireframe = wireframe;
    }

    if (hasEmissive(display) && hasEmissive(orig)) {
        if (style === 'selected') {
            display.emissive.copy(focus);
        } else if (style === 'unselected') {
            display.emissive.copy(NO_EMISSIVE);
        } else {
            display.emissive.copy(orig.emissive);
        }
        if (display instanceof THREE.MeshStandardMaterial && orig instanceof THREE.MeshStandardMaterial) {
            display.emissiveIntensity = style === 'selected' ? SELECTED_EMISSIVE_INTENSITY
                : style === 'unselected' ? 0
                : orig.emissiveIntensity;
        }
    }

    const opacity = style === 'unselected' ? unselectedOpacity : orig.opacity;
    const transparent = style === 'unselected' ? unselectedOpacity < 1 : orig.transparent;
    if (display.transparent !== transparent) {
        display.transparent = transparent;
        display.needsUpdate = true;
    }
    display.opacity = opacity;
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
    const displayedAnglesRef = useRef<Map<string, number>>(new Map());

    useEffect(() => {
        for (const joint of Object.values(robot.joints)) {
            joint.ignoreLimits = true;
        }

        // Display clones live as long as the robot: restore every mesh and
        // free them only when the robot changes or the view unmounts.
        return () => {
            const state = robotMaterialStates.get(robot);
            if (!state) return;
            state.originals.forEach((orig, mesh) => { mesh.material = orig; });
            state.displays.forEach(mats => mats.forEach(m => m.dispose()));
            robotMaterialStates.delete(robot);
        };
    }, [robot]);

    useEffect(() => {
        const { originals, displays } = getMaterialState(robot);
        const focus = new THREE.Color(focusColor);
        const isAnySelected = selectedPartName !== null;

        robot.traverse(child => {
            const mesh = child as THREE.Mesh;
            if (!mesh.isMesh) return;

            if (!originals.has(mesh)) {
                originals.set(mesh, mesh.material);
            }
            const origMat = originals.get(mesh)!;

            if (!isAnySelected && !wireframe) {
                mesh.material = origMat;
                return;
            }

            const link = isAnySelected ? findParentLink(mesh, robot) : null;
            const isSelected = link !== null && (
                urdfNameOf(link) === selectedPartName
                || resolveActuatedLinkName(link, robot, actuatedJointNames) === selectedPartName
            );
            const style: PartStyle = isSelected ? 'selected' : isAnySelected ? 'unselected' : 'normal';

            let slots = displays.get(mesh);
            if (!slots) {
                slots = [];
                displays.set(mesh, slots);
            }
            const restyle = (m: THREE.Material, slot: number): THREE.Material => {
                const display = slots[slot] ??= m.clone();
                applyStyle(display, m, style, wireframe, focus, unselectedOpacity);
                return display;
            };
            mesh.material = Array.isArray(origMat)
                ? origMat.map(restyle)
                : restyle(origMat, 0);
        });
    }, [robot, wireframe, selectedPartName, actuatedJointNames, focusColor, unselectedOpacity]);

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
