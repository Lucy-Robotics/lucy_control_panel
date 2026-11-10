/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';

type JointReadings = Map<string, number>;
type SubscribeToReadings = (callback: (readings: JointReadings) => void) => () => void;

export function useThrottledJointReadings(subscribe: SubscribeToReadings, isConnected: boolean, hz = 10): JointReadings {
    const [readings, setReadings] = useState<JointReadings>(new Map());

    useEffect(() => {
        if (!isConnected) {
            setReadings(new Map());
            return;
        }
        let latest: JointReadings | null = null;
        const unsubscribe = subscribe((next) => { latest = next; });
        const interval = setInterval(() => {
            if (!latest) return;
            setReadings(latest);
            latest = null;
        }, 1000 / hz);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [subscribe, isConnected, hz]);

    return readings;
}
