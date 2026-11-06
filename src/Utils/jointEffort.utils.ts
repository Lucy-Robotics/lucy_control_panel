/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { interfaceValuesByJoint, type DynamicJointState } from './dynamicJointState.utils.ts';

const IDLE_ARC_RATIO = 0.02;
const MIN_TINT_RATIO = 0.05;

export function effortRatio(load: number): number {
    return Math.min(Math.abs(load), 1);
}

export function effortArcRad(load: number): number {
    return Math.max(effortRatio(load), IDLE_ARC_RATIO) * 2 * Math.PI;
}

export function effortSweepSign(load: number): 1 | -1 {
    return load < 0 ? -1 : 1;
}

export function effortColor(load: number): string {
    return `hsl(${Math.round(120 * (1 - effortRatio(load)))}, 90%, 50%)`;
}

export function effortTints(loads: ReadonlyMap<string, number>): Map<string, string> {
    const tints = new Map<string, string>();
    loads.forEach((load, joint) => {
        if (effortRatio(load) >= MIN_TINT_RATIO) tints.set(joint, effortColor(load));
    });
    return tints;
}

export function loadsByJoint(state: DynamicJointState): Map<string, number> {
    return interfaceValuesByJoint(state, 'load');
}
