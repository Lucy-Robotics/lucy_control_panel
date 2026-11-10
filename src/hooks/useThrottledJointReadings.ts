/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';

type JointReadings = ReadonlyMap<string, number>;
type Subscribe<T> = (callback: (readings: T) => void) => () => void;

const NO_READINGS: JointReadings = new Map();

export function useThrottledReadings<T>(subscribe: Subscribe<T>, isConnected: boolean, empty: T, hz = 10): T {
    const [readings, setReadings] = useState<T>(empty);

    useEffect(() => {
        if (!isConnected) {
            setReadings(empty);
            return;
        }
        let latest: T | null = null;
        const unsubscribe = subscribe((next) => { latest = next; });
        const interval = setInterval(() => {
            if (latest === null) return;
            setReadings(latest);
            latest = null;
        }, 1000 / hz);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [subscribe, isConnected, empty, hz]);

    return readings;
}

export const useThrottledJointReadings = (subscribe: Subscribe<JointReadings>, isConnected: boolean, hz = 10) =>
    useThrottledReadings(subscribe, isConnected, NO_READINGS, hz);
