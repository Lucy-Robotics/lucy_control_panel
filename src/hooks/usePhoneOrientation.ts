/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';
import type * as THREE from 'three';
import { deviceQuaternion, orientationInBase, type Quat } from '../Utils/phoneOrientation';

const UPDATE_PERIOD_MS = 50;

export function usePhoneOrientation(isOn: boolean): Quat | null {
    const [orientation, setOrientation] = useState<Quat | null>(null);

    useEffect(() => {
        if (!isOn) return;
        let rest: THREE.Quaternion | null = null;
        let lastUpdateMs = -Infinity;

        const onOrientation = (event: DeviceOrientationEvent) => {
            if (event.alpha == null || event.beta == null || event.gamma == null) return;
            const current = deviceQuaternion(event.alpha, event.beta, event.gamma);
            rest ??= current;
            if (event.timeStamp - lastUpdateMs < UPDATE_PERIOD_MS) return;
            lastUpdateMs = event.timeStamp;
            setOrientation(orientationInBase(rest, current));
        };

        window.addEventListener('deviceorientation', onOrientation);
        return () => {
            window.removeEventListener('deviceorientation', onOrientation);
            setOrientation(null);
        };
    }, [isOn]);

    return orientation;
}
