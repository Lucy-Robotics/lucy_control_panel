/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { URDFJoint } from 'urdf-loader';
import { getJointAngle, isURDFJoint, jointAngleError, urdfNameOf, TARGET_REACHED_TOLERANCE_RAD } from '../Utils/robotModel.utils';
import type { ThemeColors3D } from '../hooks/useThemeColors3D';

export interface GhostTarget {
    targetRad: number;
    dragging: boolean;
    commandValue?: number;
    cancelled?: boolean;
}

export type GhostTargetMap = Map<string, GhostTarget>;

const GHOST_OPACITY = 0.38;

const PROGRESS_EPSILON_RAD = 0.005;
const STALL_WINDOW_MS = 1500;
const MAX_TRACKING_MS = 20000;
const REACHED_FADE_MS = 250;
const CANCELLED_FADE_MS = 150;
const STALL_FLASH_MS = 600;
const STALL_FADE_MS = 300;

type Phase = 'tracking' | 'reached' | 'stalled' | 'cancelled' | 'done';

export interface JointGhostProps {
    joint: URDFJoint;
    targetsRef: React.RefObject<GhostTargetMap>;
    colors: ThemeColors3D;
    onDone: (jointName: string) => void;
}

export const JointGhost: React.FC<JointGhostProps> = ({ joint, targetsRef, colors, onDone }) => {
    const jointName = urdfNameOf(joint);

    const { root, ghostJoint, pairs, material } = useMemo(() => {
        const mat = new THREE.MeshStandardMaterial({
            emissiveIntensity: 0.55,
            transparent: true,
            opacity: GHOST_OPACITY,
            depthWrite: false,
            roughness: 0.4,
            metalness: 0.2,
            side: THREE.DoubleSide,
        });

        const clone = joint.clone(true) as URDFJoint;
        const ghostJoints: URDFJoint[] = [];
        clone.traverse(obj => {
            if (isURDFJoint(obj)) {
                obj.mimicJoints = [];
                obj.ignoreLimits = true;
                ghostJoints.push(obj);
            }
            const mesh = obj as THREE.Mesh;
            if (mesh.isMesh) {
                mesh.material = mat;
                mesh.castShadow = false;
                mesh.receiveShadow = false;
                mesh.renderOrder = 10;
                mesh.raycast = () => {};
            }
        });

        const realJoints: URDFJoint[] = [];
        joint.traverse(obj => {
            if (isURDFJoint(obj)) realJoints.push(obj);
        });

        const jointPairs: Array<[URDFJoint, URDFJoint]> = [];
        for (let i = 1; i < ghostJoints.length && i < realJoints.length; i++) {
            jointPairs.push([ghostJoints[i], realJoints[i]]);
        }

        const group = new THREE.Group();
        group.matrixAutoUpdate = false;
        group.add(clone);

        return { root: group, ghostJoint: clone, pairs: jointPairs, material: mat };
    }, [joint]);

    useEffect(() => () => material.dispose(), [material]);

    const onDoneRef = useRef(onDone);
    useEffect(() => {
        onDoneRef.current = onDone;
    }, [onDone]);

    const phaseRef = useRef<Phase>('tracking');
    const phaseStartRef = useRef(0);
    const trackingStartRef = useRef(0);
    const bestErrorRef = useRef(Infinity);
    const lastProgressTimeRef = useRef(0);
    const wasDraggingRef = useRef(true);
    const lastEntryRef = useRef<GhostTarget | undefined>(undefined);
    const baseColor = useMemo(() => new THREE.Color(colors.accent), [colors.accent]);
    const stallColor = useMemo(() => new THREE.Color(colors.warning), [colors.warning]);

    const enterPhase = (phase: Phase, now: number) => {
        phaseRef.current = phase;
        phaseStartRef.current = now;
    };

    useFrame(() => {
        const entry = targetsRef.current?.get(jointName);
        const parent = joint.parent;
        // A new target can land after this ghost finished but before React
        // unmounted it (same key re-added in one batch): re-arm instead of
        // staying hidden on a live entry.
        if (entry && entry !== lastEntryRef.current) {
            lastEntryRef.current = entry;
            if (phaseRef.current !== 'tracking') {
                phaseRef.current = 'tracking';
                wasDraggingRef.current = true;
                material.opacity = GHOST_OPACITY;
            }
        }
        if (entry?.dragging) phaseRef.current = 'tracking';
        if (!entry || !parent || phaseRef.current === 'done') {
            root.visible = false;
            return;
        }
        root.visible = true;

        parent.updateWorldMatrix(true, false);
        root.matrix.copy(parent.matrixWorld);
        root.matrixWorldNeedsUpdate = true;

        ghostJoint.setJointValue(entry.targetRad);
        for (const [ghost, real] of pairs) {
            ghost.setJointValue(...real.jointValue);
        }

        const now = performance.now();
        const actual = getJointAngle(joint);

        if (entry.dragging) {
            phaseRef.current = 'tracking';
            wasDraggingRef.current = true;
            material.opacity = GHOST_OPACITY;
            material.color.copy(baseColor);
            material.emissive.copy(baseColor);
            return;
        }

        if (wasDraggingRef.current) {
            wasDraggingRef.current = false;
            trackingStartRef.current = now;
            lastProgressTimeRef.current = now;
            bestErrorRef.current = Infinity;
        }

        if (entry.cancelled && phaseRef.current !== 'cancelled') {
            enterPhase('cancelled', now);
        }

        if (phaseRef.current === 'tracking') {
            const error = Math.abs(jointAngleError(joint, actual, entry.targetRad));
            if (error < TARGET_REACHED_TOLERANCE_RAD) {
                enterPhase('reached', now);
            } else {
                if (error < bestErrorRef.current - PROGRESS_EPSILON_RAD) {
                    bestErrorRef.current = error;
                    lastProgressTimeRef.current = now;
                }
                if (now - lastProgressTimeRef.current > STALL_WINDOW_MS || now - trackingStartRef.current > MAX_TRACKING_MS) {
                    enterPhase('stalled', now);
                }
            }
            if (phaseRef.current === 'tracking') {
                material.color.copy(baseColor);
                material.emissive.copy(baseColor);
                return;
            }
        }

        const phase = phaseRef.current;
        const elapsed = now - phaseStartRef.current;
        let finished = false;
        if (phase === 'reached' || phase === 'cancelled') {
            const t = Math.min(1, elapsed / (phase === 'reached' ? REACHED_FADE_MS : CANCELLED_FADE_MS));
            material.opacity = GHOST_OPACITY * (1 - t);
            finished = t >= 1;
        } else if (phase === 'stalled') {
            const flash = Math.min(1, elapsed / 150);
            material.color.copy(baseColor).lerp(stallColor, flash);
            material.emissive.copy(material.color);
            const fadeT = Math.max(0, (elapsed - STALL_FLASH_MS) / STALL_FADE_MS);
            const pulse = elapsed < STALL_FLASH_MS ? 0.75 + 0.25 * Math.sin(elapsed / 60) : 1;
            material.opacity = GHOST_OPACITY * 1.3 * pulse * (1 - Math.min(1, fadeT));
            finished = fadeT >= 1;
        }

        if (finished) {
            phaseRef.current = 'done';
            root.visible = false;
            onDoneRef.current(jointName);
        }
    });

    return <primitive object={root} />;
};
