/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { interfaceValuesByJoint, type DynamicJointState } from './dynamicJointState.utils.ts';

export const FULL_HEAT_LOAD = 0.4;
const LOW_LOAD_BOOST = 9;

export function effortRatio(load: number): number {
    return Math.min(Math.abs(load), 1);
}

export function effortHeat(load: number): number {
    const linear = Math.min(effortRatio(load) / FULL_HEAT_LOAD, 1);
    return Math.log10(1 + LOW_LOAD_BOOST * linear);
}

export function loadsByJoint(state: DynamicJointState): Map<string, number> {
    return interfaceValuesByJoint(state, 'load');
}
