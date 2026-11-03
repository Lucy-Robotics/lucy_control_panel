/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';

type PermissionGatedMotion = typeof DeviceMotionEvent & { requestPermission?: () => Promise<PermissionState> };

const motionEvent = (): PermissionGatedMotion | undefined =>
    typeof DeviceMotionEvent === 'undefined' ? undefined : DeviceMotionEvent;

const needsMotionPermission = () => typeof motionEvent()?.requestPermission === 'function';

export async function grantMotionPermission(): Promise<boolean> {
    const motion = motionEvent();
    if (!motion?.requestPermission) return true;
    try {
        return (await motion.requestPermission()) === 'granted';
    } catch {
        return false;
    }
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
