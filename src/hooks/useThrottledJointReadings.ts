/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { useEffect, useState } from 'react';

type JointReadings = ReadonlyMap<string, number>;
type Subscribe<T> = (callback: (readings: T) => void) => () => void;

const NO_READINGS: JointReadings = new Map();

export const sameReadings = (a: JointReadings, b: JointReadings) =>
    a.size === b.size && [...a].every(([name, value]) => b.get(name) === value);

export function useThrottledReadings<T>(
    subscribe: Subscribe<T>,
    isConnected: boolean,
    empty: T,
    hz = 10,
    same: (a: T, b: T) => boolean = Object.is,
): T {
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
            const next = latest;
            latest = null;
            setReadings((shown) => (same(shown, next) ? shown : next));
        }, 1000 / hz);
        return () => {
            clearInterval(interval);
            unsubscribe();
        };
    }, [subscribe, isConnected, empty, hz, same]);

    return readings;
}

export const useThrottledJointReadings = (
    subscribe: Subscribe<JointReadings>,
    isConnected: boolean,
    hz = 10,
    same: (a: JointReadings, b: JointReadings) => boolean = Object.is,
) => useThrottledReadings(subscribe, isConnected, NO_READINGS, hz, same);

export const useChangedJointReadings = (subscribe: Subscribe<JointReadings>, isConnected: boolean, hz = 10) =>
    useThrottledReadings(subscribe, isConnected, NO_READINGS, hz, sameReadings);
