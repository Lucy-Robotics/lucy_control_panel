/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';

type PermissionGated = { requestPermission?: () => Promise<PermissionState> };

const motionEvent = (): PermissionGated | undefined =>
    typeof DeviceMotionEvent === 'undefined' ? undefined : (DeviceMotionEvent as PermissionGated);

const orientationEvent = (): PermissionGated | undefined =>
    typeof DeviceOrientationEvent === 'undefined' ? undefined : (DeviceOrientationEvent as PermissionGated);

const needsMotionPermission = () => typeof motionEvent()?.requestPermission === 'function';

async function grant(sensor: PermissionGated | undefined): Promise<boolean> {
    if (!sensor?.requestPermission) return true;
    try {
        return (await sensor.requestPermission()) === 'granted';
    } catch {
        return false;
    }
}

export async function grantMotionPermission(): Promise<boolean> {
    if (!(await grant(motionEvent()))) return false;
    await grant(orientationEvent());
    return true;
}

export function useDeviceMotionAvailable(): boolean {
    const [available, setAvailable] = useState(needsMotionPermission);

    useEffect(() => {
        if (available) return;
        const onMotion = (event: DeviceMotionEvent) => {
            if (event.acceleration?.x != null) setAvailable(true);
        };
        window.addEventListener('devicemotion', onMotion);
        return () => window.removeEventListener('devicemotion', onMotion);
    }, [available]);

    return available;
}
