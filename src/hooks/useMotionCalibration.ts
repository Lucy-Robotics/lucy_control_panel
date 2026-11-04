/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CALIBRATION_S, heldStill, meanAcceleration } from '../Utils/phoneMotion';
import type { Vec3 } from '../Utils/phoneMotion';

export interface MotionCalibration {
    isCalibrating: boolean;
    progress: number;
    wasMoved: boolean;
    start: () => void;
    cancel: () => void;
}

export function useMotionCalibration(onCalibrated: (bias: Vec3) => void): MotionCalibration {
    const [isCalibrating, setIsCalibrating] = useState(false);
    const [progress, setProgress] = useState(0);
    const [wasMoved, setWasMoved] = useState(false);
    const onCalibratedRef = useRef(onCalibrated);

    useEffect(() => {
        onCalibratedRef.current = onCalibrated;
    });

    const start = useCallback(() => {
        setProgress(0);
        setWasMoved(false);
        setIsCalibrating(true);
    }, []);

    const cancel = useCallback(() => setIsCalibrating(false), []);

    useEffect(() => {
        if (!isCalibrating) return;
        let samples: Vec3[] = [];
        let startedMs: number | null = null;

        const onMotion = (event: DeviceMotionEvent) => {
            const a = event.acceleration;
            if (a?.x == null) return;
            startedMs ??= event.timeStamp;
            samples.push([a.x, a.y ?? 0, a.z ?? 0]);
            if (!heldStill(samples)) {
                samples = [];
                startedMs = event.timeStamp;
                setWasMoved(true);
            }
            const elapsedS = (event.timeStamp - startedMs) / 1000;
            setProgress(Math.min(1, elapsedS / CALIBRATION_S));
            if (elapsedS < CALIBRATION_S) return;
            setIsCalibrating(false);
            onCalibratedRef.current(meanAcceleration(samples));
        };

        window.addEventListener('devicemotion', onMotion);
        return () => window.removeEventListener('devicemotion', onMotion);
    }, [isCalibrating]);

    return { isCalibrating, progress, wasMoved, start, cancel };
}
