/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { interfaceValuesByJoint, type DynamicJointState } from './dynamicJointState.utils.ts';

export function temperaturesByJoint(state: DynamicJointState): Map<string, number> {
    const measured = [...interfaceValuesByJoint(state, 'temperature')].filter(([, celsius]) => celsius > 0);
    return new Map(measured);
}

export function formatTemperature(celsius: number): string {
    return `${Math.round(celsius)} °C`;
}
