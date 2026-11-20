/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { interfaceValuesByJoint, type DynamicJointState } from './dynamicJointState.utils.ts';

const TEMPERATURE_WINDOW_MS = 3000;

export function temperaturesByJoint(state: DynamicJointState): Map<string, number> {
    const measured = [...interfaceValuesByJoint(state, 'temperature')].filter(([, celsius]) => celsius > 0);
    return new Map(measured);
}

export function createTemperatureMedian(windowMs = TEMPERATURE_WINDOW_MS) {
    const samples = new Map<string, { atMs: number; celsius: number }[]>();
    const firstSeenMs = new Map<string, number>();

    return (readings: ReadonlyMap<string, number>, nowMs: number): Map<string, number> => {
        const medians = new Map<string, number>();
        readings.forEach((celsius, joint) => {
            if (!firstSeenMs.has(joint)) firstSeenMs.set(joint, nowMs);
            const recent = (samples.get(joint) ?? []).filter((sample) => nowMs - sample.atMs < windowMs);
            recent.push({ atMs: nowMs, celsius });
            samples.set(joint, recent);
            if (nowMs - firstSeenMs.get(joint)! >= windowMs) {
                const sorted = recent.map((sample) => sample.celsius).sort((a, b) => a - b);
                medians.set(joint, sorted[Math.floor(sorted.length / 2)]);
            }
        });
        return medians;
    };
}

export function formatTemperature(celsius: number): string {
    return `${Math.round(celsius)} °C`;
}
