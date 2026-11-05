/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

const MIN_CUTOFF_HZ = 1;
const SPEED_COEFFICIENT = 1;
const SPEED_CUTOFF_HZ = 1;

export type OneEuroFilter = (value: number, timestampMs: number) => number;

const smoothingFactor = (cutoffHz: number, dtS: number) => 1 / (1 + 1 / (2 * Math.PI * cutoffHz * dtS));

const blend = (from: number, to: number, factor: number) => from + factor * (to - from);

export function oneEuroFilter(): OneEuroFilter {
    let last: { value: number; speed: number; timestampMs: number } | null = null;

    return (value, timestampMs) => {
        if (!last) {
            last = { value, speed: 0, timestampMs };
            return value;
        }

        const dtS = (timestampMs - last.timestampMs) / 1000;
        if (dtS <= 0) return last.value;

        const speed = blend(last.speed, (value - last.value) / dtS, smoothingFactor(SPEED_CUTOFF_HZ, dtS));
        const cutoffHz = MIN_CUTOFF_HZ + SPEED_COEFFICIENT * Math.abs(speed);
        const filtered = blend(last.value, value, smoothingFactor(cutoffHz, dtS));

        last = { value: filtered, speed, timestampMs };
        return filtered;
    };
}
