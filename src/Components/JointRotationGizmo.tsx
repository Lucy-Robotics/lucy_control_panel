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
import { DEFAULT_ACTUATOR_MAPPING, jointRadToActuatorDeg, clampActuatorDeg } from '../Utils/actuatorJointMapping';
import { JointStateHandler } from '../Services/ros/handlers/JointState.handler';
import { getLinkBoundingBox, isURDFLink } from '../Utils/robotModel.utils';

export interface JointRotationGizmoProps {
    joint: URDFJoint | null;
    isControlOn: boolean;
    joints?: JointControlState[];
    onJointValueChange?: (name: string, value: number) => void;
    onJointCommit?: (name: string, targetRad: number) => void;
    onDraggingChange?: (isDragging: boolean) => void;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

export const JointRotationGizmo: React.FC<JointRotationGizmoProps> = ({
    joint,
    isControlOn,
    joints,
    onJointValueChange,
    onJointCommit,
    onDraggingChange,
    controlsRef,
}) => {
    const { gl, camera } = useThree();
    const groupRef = useRef<THREE.Group>(null);
    const isDraggingRef = useRef<boolean>(false);
    const [isHovered, setIsHovered] = useState<boolean>(false);
    const [isDragging, setIsDragging] = useState<boolean>(false);
    const [displayDegrees, setDisplayDegrees] = useState<number>(0);

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

    useEffect(() => {
        if (!joint || isDraggingRef.current) return;
        const currentRad = joint.angle ?? joint.jointValue?.[0] ?? 0;
        const jointName = joint.urdfName || joint.name;
        const meta = JointStateHandler.getInstance().getJointMeta(jointName);
        const mapping = meta?.mapping ?? DEFAULT_ACTUATOR_MAPPING;
        const jointState = joints?.find(j => j.name === jointName);
        if (jointState?.valueInActuatorDegrees) {
            setDisplayDegrees(clampActuatorDeg(jointRadToActuatorDeg(currentRad, mapping), jointState.minValue, jointState.maxValue));
        } else {
            setDisplayDegrees(jointRadToActuatorDeg(currentRad, mapping));
        }
    }, [joint, joints]);

    useEffect(() => {
        const controls = controlsRef.current;
        return () => {
            if (controls) {
                controls.enabled = true;
            }
            onDraggingChange?.(false);
        };
    }, [controlsRef, onDraggingChange]);

    useEffect(() => {
        if (isDragging) {
            gl.domElement.style.cursor = 'grabbing';
        } else if (isHovered) {
            gl.domElement.style.cursor = 'grab';
        } else {
            gl.domElement.style.cursor = 'auto';
        }
    }, [isDragging, isHovered, gl]);

    useFrame(() => {
        if (!joint || !groupRef.current || isDraggingRef.current) return;

        joint.updateWorldMatrix(true, false);
        const jointWorldPos = joint.getWorldPosition(new THREE.Vector3());
        const worldAxis = joint.axis.clone().transformDirection(joint.matrixWorld).normalize();

        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), worldAxis);
        groupRef.current.position.copy(jointWorldPos);
        groupRef.current.quaternion.copy(quat);
    });

    const startJointAngleRadRef = useRef<number>(0);
    const accumulatedAngleRef = useRef<number>(0);
    const jointCenterRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const jointAxisRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const prevVectorRef = useRef<THREE.Vector3>(new THREE.Vector3());
    const rotationPlaneRef = useRef<THREE.Plane>(new THREE.Plane());

    const lastEmittedValueRef = useRef<{ name: string; value: number; targetRad: number } | null>(null);

    const finishDrag = useCallback(() => {
        if (!isDraggingRef.current) return;
        isDraggingRef.current = false;
        setIsDragging(false);

        if (controlsRef.current) {
            controlsRef.current.enabled = true;
        }

        if (lastEmittedValueRef.current) {
            const { name, value, targetRad } = lastEmittedValueRef.current;
            onJointCommit?.(name, targetRad);
            onJointValueChange?.(name, value);
            window.dispatchEvent(new CustomEvent('robotJointValueChange', {
                detail: { name, value },
            }));
            lastEmittedValueRef.current = null;
        }

        onDraggingChange?.(false);
    }, [controlsRef, onJointValueChange, onJointCommit, onDraggingChange]);

    useEffect(() => {
        const handleGlobalPointerUp = () => {
            if (isDraggingRef.current) {
                finishDrag();
            }
        };
        window.addEventListener('pointerup', handleGlobalPointerUp);
        window.addEventListener('pointercancel', handleGlobalPointerUp);
        return () => {
            window.removeEventListener('pointerup', handleGlobalPointerUp);
            window.removeEventListener('pointercancel', handleGlobalPointerUp);
        };
    }, [finishDrag]);

    const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
        if (!joint || !isControlOn || e.button !== 0) return;
        e.stopPropagation();

        isDraggingRef.current = true;
        setIsDragging(true);
        onDraggingChange?.(true);

        if (controlsRef.current) {
            controlsRef.current.enabled = false;
        }

        startJointAngleRadRef.current = joint.angle ?? joint.jointValue?.[0] ?? 0;
        accumulatedAngleRef.current = 0;

        joint.updateWorldMatrix(true, false);
        const jointPos = joint.getWorldPosition(new THREE.Vector3());
        const worldAxis = joint.axis.clone().transformDirection(joint.matrixWorld).normalize();

        jointCenterRef.current.copy(jointPos);
        jointAxisRef.current.copy(worldAxis);

        rotationPlaneRef.current.setFromNormalAndCoplanarPoint(worldAxis, jointPos);

        const hitPoint = new THREE.Vector3();
        if (e.ray.intersectPlane(rotationPlaneRef.current, hitPoint)) {
            prevVectorRef.current.copy(hitPoint.sub(jointPos)).normalize();
        } else {
            const camDir = camera.getWorldDirection(new THREE.Vector3()).negate();
            rotationPlaneRef.current.setFromNormalAndCoplanarPoint(camDir, jointPos);
            if (e.ray.intersectPlane(rotationPlaneRef.current, hitPoint)) {
                prevVectorRef.current.copy(hitPoint.sub(jointPos)).normalize();
            }
        }

        try {
            (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
        } catch {
            // ignore
        }
    };

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (!isDraggingRef.current || !joint) return;
        e.stopPropagation();

        const hitPoint = new THREE.Vector3();
        if (!e.ray.intersectPlane(rotationPlaneRef.current, hitPoint)) return;

        const currentVector = hitPoint.sub(jointCenterRef.current).normalize();
        const prevVector = prevVectorRef.current;

        const cross = new THREE.Vector3().crossVectors(prevVector, currentVector);
        const dot = THREE.MathUtils.clamp(prevVector.dot(currentVector), -1, 1);
        const deltaAngle = Math.atan2(cross.dot(jointAxisRef.current), dot);

        if (Math.abs(deltaAngle) < Math.PI / 1.5) {
            accumulatedAngleRef.current += deltaAngle;
            prevVectorRef.current.copy(currentVector);
        }

        const targetAngleRad = startJointAngleRadRef.current + accumulatedAngleRef.current;

        let clampedRad = targetAngleRad;
        if (joint.jointType === 'revolute' && joint.limit) {
            clampedRad = THREE.MathUtils.clamp(targetAngleRad, joint.limit.lower, joint.limit.upper);
        }

        joint.setJointValue(clampedRad);

        const jointName = joint.urdfName || joint.name;
        const jointState = joints?.find(j => j.name === jointName);
        const meta = JointStateHandler.getInstance().getJointMeta(jointName);
        const mapping = meta?.mapping ?? DEFAULT_ACTUATOR_MAPPING;

        let finalValue: number;
        if (jointState?.valueInActuatorDegrees) {
            const deg = jointRadToActuatorDeg(clampedRad, mapping);
            finalValue = clampActuatorDeg(deg, jointState.minValue, jointState.maxValue);
        } else if (jointState) {
            finalValue = THREE.MathUtils.clamp(clampedRad, jointState.minValue, jointState.maxValue);
        } else {
            finalValue = jointRadToActuatorDeg(clampedRad, mapping);
        }

        setDisplayDegrees(finalValue);
        lastEmittedValueRef.current = { name: jointName, value: finalValue, targetRad: clampedRad };
    };

    const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        try {
            (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);
        } catch {
            // ignore
        }
        finishDrag();
    };

    const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setIsHovered(true);
    };

    const handlePointerOut = () => {
        if (!isDraggingRef.current) {
            setIsHovered(false);
        }
    };

    if (!isControlOn || !joint) return null;

    const ringColor = isDragging ? '#FFFFFF' : isHovered ? '#70FFFF' : '#00E5FF';
    const emissiveIntensity = isDragging ? 2.0 : isHovered ? 1.4 : 0.8;

    return (
        <group ref={groupRef}>
            {/* Main Visual Rotation Ring in local XY plane */}
            <mesh>
                <torusGeometry args={[radius, radius * 0.04, 24, 64]} />
                <meshStandardMaterial
                    color={ringColor}
                    emissive={ringColor}
                    emissiveIntensity={emissiveIntensity}
                    roughness={0.2}
                    metalness={0.8}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Generous invisible hitbox for effortless clicking and hovering */}
            <mesh
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <torusGeometry args={[radius, radius * 0.38, 16, 48]} />
                <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>

            {/* Floating Live Angle Badge on hover / drag */}
            {(isHovered || isDragging) && (
                <Html center position={[0, radius * 1.35, 0]} style={{ pointerEvents: 'none', userSelect: 'none' }}>
                    <div
                        style={{
                            padding: '3px 8px',
                            borderRadius: 3,
                            fontFamily: 'monospace',
                            fontSize: 10,
                            fontWeight: 'bold',
                            color: '#00E5FF',
                            background: 'rgba(12, 16, 22, 0.92)',
                            border: '1px solid #00E5FF',
                            boxShadow: '0 0 12px rgba(0, 229, 255, 0.6)',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                        }}
                    >
                        <span>{joint.urdfName || joint.name}</span>
                        <span style={{ color: '#FFFFFF', fontWeight: 'bold' }}>{displayDegrees.toFixed(1)}°</span>
                    </div>
                </Html>
            )}
        </group>
    );
};

