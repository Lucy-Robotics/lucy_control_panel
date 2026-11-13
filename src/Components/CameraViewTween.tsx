/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { computeCameraFraming, safeViewDirection } from '../Utils/camera.utils';

const DURATION_S = 0.45;

export interface ViewRequest {
    id: number;
    direction: THREE.Vector3;
    instant?: boolean;
}

interface Tween {
    fromDir: THREE.Vector3;
    rotation: THREE.Quaternion;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    fromDistance: number;
    toDistance: number;
    fromZoom: number;
    toZoom: number | null;
    t: number;
    instant: boolean;
}

export interface CameraViewTweenProps {
    request: ViewRequest | null;
    controlsRef: React.RefObject<OrbitControlsImpl | null>;
    getFramingBox?: () => THREE.Box3 | null;
}

export const CameraViewTween: React.FC<CameraViewTweenProps> = ({ request, controlsRef, getFramingBox }) => {
    const get = useThree(s => s.get);
    const controls = useThree(s => s.controls);
    const size = useThree(s => s.size);
    const tweenRef = useRef<Tween | null>(null);
    const handledIdRef = useRef<number | null>(null);
    const step = useMemo(() => new THREE.Quaternion(), []);

    useEffect(() => {
        const orbit = controlsRef.current;
        if (!request || !orbit || handledIdRef.current === request.id) return;
        handledIdRef.current = request.id;
        const camera = get().camera;
        const offset = camera.position.clone().sub(orbit.target);
        const fromDistance = offset.length();
        if (fromDistance < 1e-6) return;

        const box = getFramingBox?.();
        const framing = box ? computeCameraFraming(box, request.direction, camera, size) : null;
        const fromDir = offset.divideScalar(fromDistance);
        const isOrtho = camera instanceof THREE.OrthographicCamera;
        tweenRef.current = {
            fromDir,
            rotation: new THREE.Quaternion().setFromUnitVectors(fromDir, safeViewDirection(request.direction)),
            fromTarget: orbit.target.clone(),
            toTarget: framing ? framing.target : orbit.target.clone(),
            fromDistance,
            toDistance: framing ? framing.distance : fromDistance,
            fromZoom: isOrtho ? camera.zoom : 1,
            toZoom: isOrtho ? framing?.zoom ?? null : null,
            t: 0,
            instant: request.instant ?? false,
        };
        // Resizing or a new framing source must not replay an already handled request
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [request, get, controlsRef]);

    useEffect(() => {
        const orbit = controlsRef.current;
        if (!orbit) return;
        const cancel = () => { tweenRef.current = null; };
        orbit.addEventListener('start', cancel);
        return () => orbit.removeEventListener('start', cancel);
    }, [controls, controlsRef]);

    useFrame(({ camera }, delta) => {
        const tween = tweenRef.current;
        const orbit = controlsRef.current;
        if (!tween || !orbit) return;

        tween.t = tween.instant ? 1 : Math.min(1, tween.t + delta / DURATION_S);
        const ease = 1 - Math.pow(1 - tween.t, 3);
        step.identity().slerp(tween.rotation, ease);
        orbit.target.lerpVectors(tween.fromTarget, tween.toTarget, ease);
        const distance = THREE.MathUtils.lerp(tween.fromDistance, tween.toDistance, ease);
        camera.position.copy(tween.fromDir).applyQuaternion(step).multiplyScalar(distance).add(orbit.target);
        if (tween.toZoom !== null && camera instanceof THREE.OrthographicCamera) {
            camera.zoom = THREE.MathUtils.lerp(tween.fromZoom, tween.toZoom, ease);
            camera.updateProjectionMatrix();
        }
        orbit.update();

        if (tween.t >= 1) tweenRef.current = null;
    });

    return null;
};
