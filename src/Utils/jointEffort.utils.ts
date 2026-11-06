/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { interfaceValuesByJoint, type DynamicJointState } from './dynamicJointState.utils.ts';

const MIN_VISIBLE_LOAD = 0.05;
const FULL_HEAT_LOAD = 0.5;
const HEAT_STOPS = [
    { heat: 0, rgb: [255, 255, 255] },
    { heat: 0.4, rgb: [255, 230, 0] },
    { heat: 0.7, rgb: [255, 128, 0] },
    { heat: 1, rgb: [220, 0, 0] },
];

export function effortRatio(load: number): number {
    return Math.min(Math.abs(load), 1);
}

export function isEffortVisible(load: number): boolean {
    return effortRatio(load) >= MIN_VISIBLE_LOAD;
}

export function effortArcRad(load: number): number {
    return effortRatio(load) * 2 * Math.PI;
}

export function effortSweepSign(load: number): 1 | -1 {
    return load < 0 ? -1 : 1;
}

export function effortHeat(load: number): number {
    return Math.min(effortRatio(load) / FULL_HEAT_LOAD, 1);
}

export function effortColor(load: number): string {
    const heat = effortHeat(load);
    const upper = HEAT_STOPS.findIndex((stop) => heat <= stop.heat);
    const to = HEAT_STOPS[upper];
    const from = HEAT_STOPS[Math.max(upper - 1, 0)];
    const blend = to === from ? 0 : (heat - from.heat) / (to.heat - from.heat);
    const [red, green, blue] = from.rgb.map((channel, i) => Math.round(channel + (to.rgb[i] - channel) * blend));
    return `rgb(${red}, ${green}, ${blue})`;
}

export function loadsByJoint(state: DynamicJointState): Map<string, number> {
    return interfaceValuesByJoint(state, 'load');
}
