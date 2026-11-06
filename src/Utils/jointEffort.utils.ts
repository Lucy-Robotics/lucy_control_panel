/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { interfaceValuesByJoint, type DynamicJointState } from './dynamicJointState.utils.ts';

const IDLE_ARC_RATIO = 0.02;
const FULL_HEAT_LOAD = 0.5;

export function effortRatio(load: number): number {
    return Math.min(Math.abs(load), 1);
}

export function effortArcRad(load: number): number {
    return Math.max(effortRatio(load), IDLE_ARC_RATIO) * 2 * Math.PI;
}

export function effortSweepSign(load: number): 1 | -1 {
    return load < 0 ? -1 : 1;
}

export function effortHeat(load: number): number {
    return Math.min(effortRatio(load) / FULL_HEAT_LOAD, 1);
}

export function effortColor(load: number): string {
    const heat = effortHeat(load);
    return `hsl(${Math.round(25 * (1 - heat))}, 100%, ${Math.round(100 - 50 * heat)}%)`;
}

export function loadsByJoint(state: DynamicJointState): Map<string, number> {
    return interfaceValuesByJoint(state, 'load');
}
