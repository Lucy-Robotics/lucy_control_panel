/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

const DURATION_S = 0.45;
const POLE_NUDGE = 1e-3;

export interface ViewRequest {
    id: number;
    direction: THREE.Vector3;
}

interface Tween {
    from: THREE.Vector3;
    full: THREE.Quaternion;
    distance: number;
    t: number;
}

export interface CameraViewTweenProps {
    request: ViewRequest | null;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
}

export const CameraViewTween: React.FC<CameraViewTweenProps> = ({ request, controlsRef }) => {
    const camera = useThree(s => s.camera);
    const controls = useThree(s => s.controls);
    const tweenRef = useRef<Tween | null>(null);
    const handledIdRef = useRef<number | null>(null);
    const step = useMemo(() => new THREE.Quaternion(), []);

    useEffect(() => {
        const orbit = controlsRef.current;
        if (!request || !orbit || handledIdRef.current === request.id) return;
        handledIdRef.current = request.id;
        const offset = camera.position.clone().sub(orbit.target);
        const distance = offset.length();
        if (distance < 1e-6) return;

        const to = request.direction.clone().normalize();
        if (Math.abs(to.y) > 1 - 1e-6) to.set(POLE_NUDGE, Math.sign(to.y), 0).normalize();
        const from = offset.divideScalar(distance);
        tweenRef.current = { from, full: new THREE.Quaternion().setFromUnitVectors(from, to), distance, t: 0 };
    }, [request, camera, controlsRef]);

    useEffect(() => {
        const orbit = controlsRef.current;
        if (!orbit) return;
        const cancel = () => { tweenRef.current = null; };
        orbit.addEventListener('start', cancel);
        return () => orbit.removeEventListener('start', cancel);
    }, [controls, controlsRef]);

    useFrame((_state, delta) => {
        const tween = tweenRef.current;
        const orbit = controlsRef.current;
        if (!tween || !orbit) return;

        tween.t = Math.min(1, tween.t + delta / DURATION_S);
        const ease = 1 - Math.pow(1 - tween.t, 3);
        step.identity().slerp(tween.full, ease);
        camera.position.copy(tween.from).applyQuaternion(step).multiplyScalar(tween.distance).add(orbit.target);
        orbit.update();

        if (tween.t >= 1) tweenRef.current = null;
    });

    return null;
};
