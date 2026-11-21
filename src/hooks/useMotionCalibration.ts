/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CALIBRATION_S, heldStill, meanAcceleration } from '../Utils/phoneMotion';
import type { Vec3 } from '../Utils/phoneMotion';

export type CalibrationPhase = 'idle' | 'waitingForTable' | 'measuring';

export interface MotionCalibration {
    phase: CalibrationPhase;
    progress: number;
    wasMoved: boolean;
    start: () => void;
    measure: () => void;
    cancel: () => void;
}

export function useMotionCalibration(onCalibrated: (bias: Vec3) => void): MotionCalibration {
    const [phase, setPhase] = useState<CalibrationPhase>('idle');
    const [progress, setProgress] = useState(0);
    const [wasMoved, setWasMoved] = useState(false);
    const onCalibratedRef = useRef(onCalibrated);

    useEffect(() => {
        onCalibratedRef.current = onCalibrated;
    });

    const start = useCallback(() => setPhase('waitingForTable'), []);

    const measure = useCallback(() => {
        setProgress(0);
        setWasMoved(false);
        setPhase('measuring');
    }, []);

    const cancel = useCallback(() => setPhase('idle'), []);

    useEffect(() => {
        if (phase !== 'measuring') return;
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
            setPhase('idle');
            onCalibratedRef.current(meanAcceleration(samples));
        };

        window.addEventListener('devicemotion', onMotion);
        return () => window.removeEventListener('devicemotion', onMotion);
    }, [phase]);

    return { phase, progress, wasMoved, start, measure, cancel };
}
