/*
 * Copyright 2025-2026 Lucy Robotics Team
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import type { ControllerJointConfig, JointLimitRad } from '../Constants/rosConfig';
import type { UrdfJointLimitRad } from '../hooks/useUrdfJointLimits';
import { DEFAULT_ACTUATOR_MAPPING, servoRadToJointRad } from './actuatorJointMapping.ts';

/** Settings flag: off = sliders in servo angles (bench), on = URDF joint angles (production). */
export const PRODUCTION_MODE_KEY = 'productionModeEnabled';
export const PRODUCTION_MODE_EVENT = 'productionModeChanged';

export const isProductionModeEnabled = () =>
    localStorage.getItem(PRODUCTION_MODE_KEY) === 'true';

function jointSpaceLimit(lim: JointLimitRad, urdf: UrdfJointLimitRad | undefined): JointLimitRad {
    // Servo travel seen as joint angles; an inverted servo swaps its ends.
    const a = servoRadToJointRad(lim.minRad, lim.mapping);
    const b = servoRadToJointRad(lim.maxRad, lim.mapping);
    let minRad = Math.min(a, b);
    let maxRad = Math.max(a, b);
    if (urdf && Math.max(minRad, urdf.lowerRad) < Math.min(maxRad, urdf.upperRad)) {
        minRad = Math.max(minRad, urdf.lowerRad);
        maxRad = Math.min(maxRad, urdf.upperRad);
    }
    const rest = servoRadToJointRad(lim.defaultRad, lim.mapping);
    return {
        minRad,
        maxRad,
        defaultRad: Math.min(maxRad, Math.max(minRad, rest)),
        mapping: DEFAULT_ACTUATOR_MAPPING,
    };
}

/**
 * Production mode: every joint's limits become joint angles (URDF range within the servo
 * travel) with an identity mapping, so sliders, commands, feedback and the gizmo all work in
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
