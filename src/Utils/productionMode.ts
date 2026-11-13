/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ControllerJointConfig, JointLimitRad } from '../Constants/rosConfig';
import type { UrdfJointLimitRad } from '../hooks/useUrdfJointLimits';
import { DEFAULT_ACTUATOR_MAPPING, servoRadToJointRad } from './actuatorJointMapping.ts';

/** Settings flag: on (default) = URDF joint angles (production), off = servo angles (bench). */
export const PRODUCTION_MODE_SETTING = 'productionModeEnabled';
export const PRODUCTION_MODE_EVENT = 'productionModeChanged';

export const isProductionModeEnabled = () =>
    localStorage.getItem(PRODUCTION_MODE_SETTING) !== 'false';

/**
 * True when no hardware or simulator is behind ros2_control: the generator emits
 * `publish_actuators=false` on LucySystemHardware only for `use_mock_hardware`.
 */
export function isMockHardware(urdfXml: string): boolean {
    return /<param\s+name="publish_actuators"\s*>\s*false\s*</.test(urdfXml);
}

function jointSpaceLimit(lim: JointLimitRad, urdf: UrdfJointLimitRad | undefined): JointLimitRad {
    // Servo travel seen as joint angles (an inverted servo swaps its ends), cut to the URDF range.
    const a = servoRadToJointRad(lim.minRad, lim.mapping);
    const b = servoRadToJointRad(lim.maxRad, lim.mapping);
    const lower = Math.max(urdf?.lowerRad ?? -Infinity, Math.min(a, b));
    const upper = Math.min(urdf?.upperRad ?? Infinity, Math.max(a, b));
    const [minRad, maxRad] = lower < upper ? [lower, upper] : [Math.min(a, b), Math.max(a, b)];
    const rest = servoRadToJointRad(lim.defaultRad, lim.mapping);
    return {
        minRad,
        maxRad,
        defaultRad: Math.min(maxRad, Math.max(minRad, rest)),
        mapping: DEFAULT_ACTUATOR_MAPPING,
    };
}

/**
 * Production mode: every joint's limits become joint angles (the reachable URDF range) with an identity
 * mapping, so sliders, commands, feedback and the gizmo all work in
 * URDF angles. The hardware interface still applies offset / direction / scale and clamps to
 * the servo travel, so INVERTED servos move the same way as the others.
 */
export function toJointSpace(
    configs: ControllerJointConfig[],
    urdfLimits: Map<string, UrdfJointLimitRad>,
): ControllerJointConfig[] {
    return configs.map((c) => {
        if (!c.jointLimits) return c;
        const jointLimits = Object.fromEntries(
            Object.entries(c.jointLimits).map(([name, lim]) => [name, jointSpaceLimit(lim, urdfLimits.get(name))]),
        );
        return { ...c, jointLimits };
    });
}
