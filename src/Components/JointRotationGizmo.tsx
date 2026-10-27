/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import type { URDFJoint } from 'urdf-loader';
import type { JointControlState } from '../Constants/robotTypes';
import { DEFAULT_ACTUATOR_MAPPING, jointRadToServoRad, clampServoRad } from '../Utils/actuatorJointMapping';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';
import type { ThemeColors3D } from '../hooks/useThemeColors3D';
import {
    CLICK_DRAG_THRESHOLD_PX,
    getJointAngle,
    getLinkBoundingBox,
    isURDFLink,
    jointAngleError,
    urdfNameOf,
    wrapAngle,
    TARGET_REACHED_TOLERANCE_RAD,
} from '../Utils/robotModel.utils';

const RENDER_ORDER = 1000;
const FADE_IN_S = 0.12;

function overlayMaterial(opacity: number) {
    return new THREE.MeshBasicMaterial({
        opacity,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
    });
}

function computeZeroBasis(joint: URDFJoint): THREE.Quaternion {
    const axis = joint.axis.clone().normalize();

    let ref: THREE.Vector3 | null = null;
    for (const child of joint.children) {
        if (!isURDFLink(child)) continue;
        joint.updateWorldMatrix(true, true);
        const worldCenter = getLinkBoundingBox(child).getCenter(new THREE.Vector3());
        const local = joint.worldToLocal(worldCenter);
        local.addScaledVector(axis, -local.dot(axis));
        if (local.lengthSq() > 1e-8) {
            ref = local.applyAxisAngle(axis, getJointAngle(joint)).normalize();
        }
        break;
    }
    if (!ref) {
        const seed = Math.abs(axis.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
        ref = seed.addScaledVector(axis, -seed.dot(axis)).normalize();
    }
    const v = new THREE.Vector3().crossVectors(axis, ref).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(ref, v, axis));
}

function ringPlaneOf(group: THREE.Object3D, out: THREE.Plane): THREE.Plane {
    const worldAxis = new THREE.Vector3(0, 0, 1).applyQuaternion(group.getWorldQuaternion(new THREE.Quaternion()));
    return out.setFromNormalAndCoplanarPoint(worldAxis, group.getWorldPosition(new THREE.Vector3()));
}

export interface JointRotationGizmoProps {
    joint: URDFJoint | null;
    isControlOn: boolean;
    joints?: JointControlState[];
    onJointValueChange?: (name: string, value: number) => void;
    onValuePreview?: (name: string, value: number | null) => void;
    onTargetChange?: (name: string, targetRad: number, dragging: boolean, commandValue?: number) => void;
    /** A drag on `name` was aborted without committing (joint switched, control disabled). */
    onTargetCancel?: (name: string) => void;
    getPendingTarget?: (name: string) => number | undefined;
    onDraggingChange?: (isDragging: boolean) => void;
    onHoverChange?: (isHovered: boolean) => void;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    colors: ThemeColors3D;
}

export const JointRotationGizmo: React.FC<JointRotationGizmoProps> = ({
    joint,
    isControlOn,
    joints,
    onJointValueChange,
    onValuePreview,
    onTargetChange,
    onTargetCancel,
    getPendingTarget,
    onDraggingChange,
    onHoverChange,
    controlsRef,
    colors,
}) => {
    const { gl } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const isDraggingRef = useRef<boolean>(false);
    const isHoveredRef = useRef<boolean>(false);
    const pointerInsideRef = useRef<boolean>(false);
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);

    const jointName = joint ? urdfNameOf(joint) : '';

    const radius = useMemo(() => {
        if (!joint) return 0.16;
        let maxDim = 0.2;
        for (const child of joint.children) {
            if (isURDFLink(child)) {
                const box = getLinkBoundingBox(child);
                const size = box.getSize(new THREE.Vector3());
                const d = Math.max(size.x, size.y, size.z);
                if (d > 0.02) maxDim = Math.max(maxDim, d);
            }
        }
        return THREE.MathUtils.clamp(maxDim * 0.42, 0.11, 0.32);
    }, [joint]);

    const zeroBasis = useMemo(() => (joint ? computeZeroBasis(joint) : new THREE.Quaternion()), [joint]);

    const limits = useMemo(() => {
        if (!joint || joint.jointType !== 'revolute') return null;
        const { lower, upper } = joint.limit;
        if (!(upper > lower) || upper - lower >= Math.PI * 2) return null;
        return { lower, upper };
    }, [joint]);

    const toSliderValue = useCallback((rad: number): number => {
        const mapping = JointStateHandler.getInstance().getJointMeta(jointName)?.mapping ?? DEFAULT_ACTUATOR_MAPPING;
        const servoRad = jointRadToServoRad(rad, mapping);
        const jointState = joints?.find(j => j.name === jointName);
        return jointState ? clampServoRad(servoRad, jointState.minValue, jointState.maxValue) : servoRad;
    }, [joints, jointName]);

    const mats = useMemo(() => ({
        ring: overlayMaterial(0.55),
        knob: overlayMaterial(1),
        target: overlayMaterial(0.9),
    }), []);

    useEffect(() => () => Object.values(mats).forEach(m => m.dispose()), [mats]);

    const geos = useMemo(() => ({
        ring: new THREE.TorusGeometry(radius, radius * 0.008, 6, 128),
        hitbox: new THREE.TorusGeometry(radius, radius * 0.38, 16, 48),
        knob: new THREE.CircleGeometry(radius * 0.035, 24),
        target: new THREE.RingGeometry(radius * 0.024, radius * 0.035, 24),
    }), [radius]);

    useEffect(() => () => Object.values(geos).forEach(g => g.dispose()), [geos]);

    useEffect(() => {
        const controls = controlsRef.current;
        return () => {
            if (controls) {
                controls.enabled = true;
            }
            onDraggingChange?.(false);
        };
    }, [controlsRef, onDraggingChange]);

    const setHovered = useCallback((hovered: boolean) => {
        if (isHoveredRef.current === hovered) return;
        isHoveredRef.current = hovered;
        setIsHovered(hovered);
        onHoverChange?.(hovered);
    }, [onHoverChange]);

    const ownsCursorRef = useRef(false);
    useEffect(() => {
        if (isDragging) {
            gl.domElement.style.cursor = 'grabbing';
            ownsCursorRef.current = true;
        } else if (isHovered) {
            gl.domElement.style.cursor = 'grab';
            ownsCursorRef.current = true;
        } else if (ownsCursorRef.current) {
            gl.domElement.style.cursor = 'auto';
            ownsCursorRef.current = false;
        }
    }, [isDragging, isHovered, gl]);

    const startTargetRadRef = useRef<number>(0);
    const currentTargetRadRef = useRef<number>(0);
    const accumulatedAngleRef = useRef<number>(0);
    const prevPointerAngleRef = useRef<number>(0);
    const pointerAngleRef = useRef<number>(0);
    const rotationPlaneRef = useRef<THREE.Plane>(new THREE.Plane());
    const lastEmittedValueRef = useRef<{ name: string; value: number } | null>(null);
    // Joint the current drag started on: `joint` can change mid-drag, and every
    // emission of that drag must stay attributed to the same ghost entry.
    const dragJointNameRef = useRef<string>('');
    // A press on the ring only becomes a drag past CLICK_DRAG_THRESHOLD_PX, so
    // plain clicks reach the parts behind the ring.
    const pressRef = useRef<{ x: number; y: number; grabAngle: number; jointName: string } | null>(null);

    const cancelPress = useCallback(() => {
        if (!pressRef.current) return;
        pressRef.current = null;
        if (controlsRef.current) {
            controlsRef.current.enabled = true;
        }
    }, [controlsRef]);

    const clearEmittedValue = useCallback(() => {
        const emitted = lastEmittedValueRef.current;
        lastEmittedValueRef.current = null;
        if (emitted) onValuePreview?.(emitted.name, null);
    }, [onValuePreview]);

    useEffect(() => clearEmittedValue, [clearEmittedValue]);

    const localAngleOf = (worldPoint: THREE.Vector3): number | null => {
        const group = groupRef.current;
        if (!group) return null;
        const local = group.worldToLocal(worldPoint.clone());
        if (local.x * local.x + local.y * local.y < 1e-10) return null;
        return Math.atan2(local.y, local.x);
    };

    const finishDrag = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);

        if (controlsRef.current) {
            controlsRef.current.enabled = true;
        }

        onTargetChange?.(dragJointNameRef.current, currentTargetRadRef.current, false, lastEmittedValueRef.current?.value);
        if (lastEmittedValueRef.current) {
            const { name, value } = lastEmittedValueRef.current;
            onJointValueChange?.(name, value);
        }
        clearEmittedValue();

        onDraggingChange?.(false);
        if (!pointerInsideRef.current) setHovered(false);
    }, [controlsRef, onTargetChange, onJointValueChange, clearEmittedValue, onDraggingChange, setHovered]);

    useEffect(() => {
        if (pressRef.current && (!joint || !isControlOn || pressRef.current.jointName !== jointName)) {
            cancelPress();
        }
        const switchedJoint = isDraggingRef.current && dragJointNameRef.current !== jointName;
        if (joint && isControlOn && !switchedJoint) return;
        if (isDraggingRef.current) {
            isDraggingRef.current = false;
            clearEmittedValue();
            setIsDragging(false);
            if (controlsRef.current) {
                controlsRef.current.enabled = true;
            }
            onTargetCancel?.(dragJointNameRef.current);
            onDraggingChange?.(false);
        }
        if (joint && isControlOn) return;
        pointerInsideRef.current = false;
        setHovered(false);
    }, [joint, jointName, isControlOn, controlsRef, clearEmittedValue, onTargetCancel, onDraggingChange, setHovered, cancelPress]);

    useEffect(() => {
        const handleGlobalPointerUp = () => {
            if (isDraggingRef.current) {
                finishDrag();
            } else {
                cancelPress();
            }
        };
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
        return () => {
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
        };
    }, [finishDrag, cancelPress]);

    const beginDrag = (grabAngle: number) => {
        if (!joint) return;
        isDraggingRef.current = true;
        setIsDragging(true);
        onDraggingChange?.(true);

        const start = getPendingTarget?.(jointName) ?? getJointAngle(joint);
        startTargetRadRef.current = start;
        currentTargetRadRef.current = start;
        accumulatedAngleRef.current = 0;
        prevPointerAngleRef.current = grabAngle;
        pointerAngleRef.current = grabAngle;
        lastEmittedValueRef.current = null;
        dragJointNameRef.current = jointName;
        onTargetChange?.(jointName, start, true);
    };

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        const group = groupRef.current;
        if (!joint || !isControlOn || e.button !== 0 || !group) return;
        e.stopPropagation();

        ringPlaneOf(group, rotationPlaneRef.current);
        const grabPoint = rotationPlaneRef.current.projectPoint(e.point, new THREE.Vector3());
        const grabAngle = localAngleOf(grabPoint);
        if (grabAngle === null) return;

        if (controlsRef.current) {
            controlsRef.current.enabled = false;
        }
        pressRef.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY, grabAngle, jointName };

        try {
            (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
        } catch {
            // ignore
        }
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (!joint) return;

        const press = pressRef.current;
        if (press && !isDraggingRef.current) {
            e.stopPropagation();
            const moved = Math.hypot(e.nativeEvent.clientX - press.x, e.nativeEvent.clientY - press.y);
            if (moved <= CLICK_DRAG_THRESHOLD_PX) return;
            pressRef.current = null;
            beginDrag(press.grabAngle);
        }

        if (!isDraggingRef.current) {
            const group = groupRef.current;
            if (!group) return;
            const plane = ringPlaneOf(group, new THREE.Plane());
            const angle = localAngleOf(plane.projectPoint(e.point, new THREE.Vector3()));
            if (angle !== null) pointerAngleRef.current = angle;
            return;
        }
        e.stopPropagation();

        const hitPoint = new THREE.Vector3();
        if (!e.ray.intersectPlane(rotationPlaneRef.current, hitPoint)) return;
        const angle = localAngleOf(hitPoint);
        if (angle === null) return;

        accumulatedAngleRef.current += wrapAngle(angle - prevPointerAngleRef.current);
        prevPointerAngleRef.current = angle;
        pointerAngleRef.current = angle;

        let targetRad = startTargetRadRef.current + accumulatedAngleRef.current;
        if (limits) {
            targetRad = THREE.MathUtils.clamp(targetRad, limits.lower, limits.upper);
        }
        currentTargetRadRef.current = targetRad;
        const name = dragJointNameRef.current;
        onTargetChange?.(name, targetRad, true);
        const value = toSliderValue(targetRad);
        lastEmittedValueRef.current = { name, value };
        onValuePreview?.(name, value);
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        try {
            (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
        } catch {
            // ignore
        }
        if (isDraggingRef.current) {
            finishDrag();
        } else {
            cancelPress();
        }
    };

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        pointerInsideRef.current = true;
        setHovered(true);
    };

    const handlePointerOut = () => {
        pointerInsideRef.current = false;
        if (!isDraggingRef.current) {
            setHovered(false);
        }
    };

    const fadeRef = useRef(0);
    useEffect(() => {
        fadeRef.current = 0;
    }, [joint]);

    const knobRef = useRef<THREE.Mesh>(null);
    const targetRef = useRef<THREE.Group>(null);
    const badgeAnchorRef = useRef<THREE.Group>(null);
    const badgeValueRef = useRef<HTMLSpanElement>(null);

    const tmp = useMemo(() => ({
        parentQuat: new THREE.Quaternion(),
        pos: new THREE.Vector3(),
    }), []);

    useFrame((_state, delta) => {
        const group = groupRef.current;
        if (!joint || !group) return;
        const dragging = isDraggingRef.current;
        const hovered = isHoveredRef.current;

        if (!dragging && joint.parent) {
            joint.updateWorldMatrix(true, false);
            joint.getWorldPosition(tmp.pos);
            const origQuaternion = (joint as URDFJoint & { origQuaternion?: THREE.Quaternion | null }).origQuaternion;
            joint.parent.getWorldQuaternion(tmp.parentQuat)
                .multiply(origQuaternion ?? joint.quaternion)
                .multiply(zeroBasis);
            group.position.copy(tmp.pos);
            group.quaternion.copy(tmp.parentQuat);
        }
        badgeAnchorRef.current?.position.copy(group.position).add(tmp.pos.set(0, radius * 1.3, 0));

        fadeRef.current = Math.min(1, fadeRef.current + delta / FADE_IN_S);
        const fade = fadeRef.current;
        mats.ring.color.set(dragging ? colors.active : colors.accent);
        mats.knob.color.set(colors.active);
        mats.target.color.set(colors.accent);
        mats.ring.opacity = (dragging ? 1 : hovered ? 0.9 : 0.55) * fade;
        mats.knob.opacity = fade;
        mats.target.opacity = 0.9 * fade;

        if (knobRef.current) {
            knobRef.current.visible = hovered || dragging;
            knobRef.current.position.set(Math.cos(pointerAngleRef.current) * radius, Math.sin(pointerAngleRef.current) * radius, 0);
        }

        const actual = getJointAngle(joint);
        const pending = dragging ? undefined : getPendingTarget?.(jointName);
        if (targetRef.current) {
            const show = pending !== undefined
                && Math.abs(jointAngleError(joint, actual, pending)) >= TARGET_REACHED_TOLERANCE_RAD;
            targetRef.current.visible = show;
            if (pending !== undefined) targetRef.current.rotation.z = pending;
        }

        if (badgeValueRef.current) {
            const shown = toSliderValue(dragging ? currentTargetRadRef.current : (pending ?? actual));
            const text = `${THREE.MathUtils.radToDeg(shown).toFixed(1)}°`;
            if (badgeValueRef.current.textContent !== text) badgeValueRef.current.textContent = text;
        }
    });

    if (!isControlOn || !joint) return null;

    return (
        <>
            <group ref={groupRef}>
                <mesh geometry={geos.ring} material={mats.ring} renderOrder={RENDER_ORDER} />

                <group ref={targetRef} visible={false}>
                    <mesh position={[radius, 0, 0]} geometry={geos.target} material={mats.target} renderOrder={RENDER_ORDER + 1} />
                </group>

                <mesh ref={knobRef} geometry={geos.knob} material={mats.knob} renderOrder={RENDER_ORDER + 2} visible={false} />

                <mesh
                    geometry={geos.hitbox}
                    userData={{ isGizmoHit: true }}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    onPointerOver={handlePointerOver}
                    onPointerOut={handlePointerOut}
                >
                    <meshBasicMaterial transparent opacity={0} depthTest={false} depthWrite={false} colorWrite={false} />
                </mesh>
            </group>

            <group ref={badgeAnchorRef}>
                {(isHovered || isDragging) && (
                    <Html center style={{ pointerEvents: 'none', userSelect: 'none' }} zIndexRange={[20, 0]}>
                        <span
                            ref={badgeValueRef}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: 11,
                                color: isDragging ? colors.active : colors.accent,
                                textShadow: '0 0 3px rgba(0, 0, 0, 0.9)',
                                whiteSpace: 'nowrap',
                            }}
                        />
                    </Html>
                )}
            </group>
        </>
    );
};
